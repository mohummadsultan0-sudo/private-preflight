/** Audit Ledger style: a bounded local batch queue makes every image and recovery state traceable before a bundle is created. */
import { useRef, useState } from "react";
import JSZip from "jszip";
import { AlertTriangle, Check, FileArchive, FileSpreadsheet, Images, LoaderCircle, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, cleanCopyFileName, CleanCopyFormat, createExifFreeImage, DEFAULT_JPEG_QUALITY, downloadLocalBlob, ImageInspection, inspectImageFile, MAX_IMAGE_BYTES, supportedImageType } from "@/lib/image";
import { createCombinedBatchCsv, createMetadataCsv, createMetadataJson, DEFAULT_CSV_FIELDS, ReportOptions } from "@/lib/metadataReport";

const MAX_BATCH_FILES = 8;
const MAX_BATCH_BYTES = 40 * 1024 * 1024;
type BatchStatus = "reading" | "ready" | "rejected";
type BundleStage = "queued" | "cleaning" | "reports" | "complete" | "failed";
type BatchItem = { id: string; file: File; status: BatchStatus; inspection?: ImageInspection; error?: string; outputFormat?: CleanCopyFormat; bundleStage?: BundleStage; bundleError?: string };
type BundleProgress = { current: number; total: number; currentName: string };

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeItemId = (index: number) => `image-${String(index + 1).padStart(2, "0")}`;

export function BatchImageProcessor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isBundling, setIsBundling] = useState(false);
  const [archiveStage, setArchiveStage] = useState<"idle" | "cleaning" | "finalizing" | "complete" | "error">("idle");
  const [bundleProgress, setBundleProgress] = useState<BundleProgress | null>(null);
  const [bundleNote, setBundleNote] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);

  const addFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    setOpen(true); setBundleNote(null); setBundleError(null);
    const occupiedCount = items.length;
    const occupiedBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    const slots = Math.max(0, MAX_BATCH_FILES - occupiedCount);
    const accepted = files.slice(0, slots);
    const rejectedByLimit = files.slice(slots).map((file) => ({ id: crypto.randomUUID(), file, status: "rejected" as const, error: `Batch limit reached: choose up to ${MAX_BATCH_FILES} images.` }));
    let runningBytes = occupiedBytes;
    const queued = accepted.map((file) => {
      if (runningBytes + file.size > MAX_BATCH_BYTES) return { id: crypto.randomUUID(), file, status: "rejected" as const, error: "Combined batch limit is 40 MB. This file was not read." };
      runningBytes += file.size;
      return { id: crypto.randomUUID(), file, status: "reading" as const };
    });
    setItems((current) => [...current, ...queued, ...rejectedByLimit]);
    for (const queuedItem of queued) {
      if (queuedItem.status === "rejected") continue;
      try {
        if (!supportedImageType(queuedItem.file)) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
        if (queuedItem.file.size > MAX_IMAGE_BYTES) throw new Error("This file exceeds the 15 MB per-image local limit.");
        const inspection = await inspectImageFile(queuedItem.file);
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "ready", inspection, outputFormat: "jpeg", bundleStage: "queued" } : item));
      } catch (caught) {
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "rejected", error: caught instanceof Error ? caught.message : "This image could not be read locally." } : item));
      }
    }
  };

  const eligible = items.filter((item) => item.status === "ready" && item.inspection && canCreateCleanCopy(item.inspection.format, item.inspection.metadataState));
  const combinedEntries: Array<{ itemId: string; inspection: ImageInspection; options: ReportOptions }> = eligible.map((item, index) => ({ itemId: safeItemId(index), inspection: item.inspection!, options: { cleanFormat: item.outputFormat ?? "jpeg", jpegQuality: DEFAULT_JPEG_QUALITY, estimatedBytes: null, cleanCopyOffered: true } }));
  const completedCount = eligible.filter((item) => item.bundleStage === "complete").length;
  const progressValue = archiveStage === "complete" ? 100 : archiveStage === "finalizing" ? 95 : eligible.length ? Math.round((completedCount / eligible.length) * 85) : 0;
  const reset = () => { setItems([]); setBundleNote(null); setBundleError(null); setArchiveStage("idle"); setBundleProgress(null); if (inputRef.current) inputRef.current.value = ""; };
  const setOutputFormat = (id: string, outputFormat: CleanCopyFormat) => setItems((current) => current.map((item) => item.id === id ? { ...item, outputFormat } : item));
  const downloadCombinedCsv = () => {
    if (!combinedEntries.length) { setBundleError("Add at least one eligible image before downloading a combined CSV report."); return; }
    downloadLocalBlob(new Blob(["\uFEFF", createCombinedBatchCsv(combinedEntries)], { type: "text/csv;charset=utf-8" }), "private-preflight-batch-metadata-report.csv");
    setBundleNote(`Local combined CSV report downloaded with ${combinedEntries.length} item${combinedEntries.length === 1 ? "" : "s"}.`);
  };
  const buildBundle = async () => {
    if (!eligible.length) { setBundleError("Add at least one supported image with readable metadata before creating a bundle."); return; }
    setIsBundling(true); setArchiveStage("cleaning"); setBundleProgress({ current: 0, total: eligible.length, currentName: "Preparing local queue" }); setBundleError(null); setBundleNote(null);
    setItems((current) => current.map((item) => eligible.some((entry) => entry.id === item.id) ? { ...item, bundleStage: "queued", bundleError: undefined } : item));
    try {
      const zip = new JSZip();
      const completedEntries: Array<{ itemId: string; inspection: ImageInspection; options: ReportOptions }> = [];
      for (let index = 0; index < eligible.length; index += 1) {
        const item = eligible[index];
        const inspection = item.inspection!;
        const format: CleanCopyFormat = item.outputFormat ?? "jpeg";
        const options: ReportOptions = { cleanFormat: format, jpegQuality: DEFAULT_JPEG_QUALITY, estimatedBytes: null, cleanCopyOffered: true };
        setBundleProgress({ current: index + 1, total: eligible.length, currentName: item.file.name });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, bundleStage: "cleaning" } : entry));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        try {
          const clean = await createExifFreeImage(item.file, format, DEFAULT_JPEG_QUALITY);
          const id = safeItemId(index);
          const extension = format === "jpeg" ? "jpg" : "png";
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, bundleStage: "reports" } : entry));
          zip.file(`clean/${id}-clean.${extension}`, clean);
          zip.file(`reports/${id}-metadata.json`, createMetadataJson(inspection, options));
          zip.file(`reports/${id}-metadata.csv`, `\uFEFF${createMetadataCsv(inspection, options, DEFAULT_CSV_FIELDS)}`);
          completedEntries.push({ itemId: id, inspection, options });
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, bundleStage: "complete" } : entry));
        } catch (caught) {
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, bundleStage: "failed", bundleError: caught instanceof Error ? caught.message : "This image could not be cleaned locally." } : entry));
        }
      }
      if (!completedEntries.length) throw new Error("No eligible image could be cleaned locally, so a ZIP bundle was not created.");
      zip.file("reports/batch-metadata.csv", `\uFEFF${createCombinedBatchCsv(completedEntries)}`);
      zip.file("README.txt", "Private Preflight local batch bundle. Originals and raw metadata are not included. Each clean image uses its selected browser-generated JPEG or PNG format, with paired JSON and CSV signal reports.");
      setArchiveStage("finalizing"); setBundleProgress({ current: completedEntries.length, total: eligible.length, currentName: "Writing local archive" });
      const bundle = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadLocalBlob(bundle, "private-preflight-image-bundle.zip");
      setArchiveStage("complete");
      setBundleNote(`Local ZIP bundle downloaded with ${completedEntries.length} clean image${completedEntries.length === 1 ? "" : "s"}, paired reports, and one combined CSV.`);
    } catch (caught) { setArchiveStage("error"); setBundleError(caught instanceof Error ? caught.message : "The browser could not create the local ZIP bundle. Try a smaller batch."); }
    finally { setIsBundling(false); }
  };

  return <section className="batch-processor" aria-labelledby="batch-title"><div className="batch-processor__heading"><div><span className="eyebrow"><span>BATCH / 01</span> Local queue</span><h2 id="batch-title">Clean several images in one local bundle.</h2><p>Up to 8 images and 40 MB total. Each image stays in this tab; rejected entries never block the rest of the queue.</p></div><Button variant="outline" onClick={() => setOpen((value) => !value)}><Images aria-hidden="true" /> {open ? "Close batch" : "Process a batch"}</Button></div>{open && <><div className="batch-processor__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}><strong>Add up to {MAX_BATCH_FILES} local images</strong><span>JPEG, PNG, WebP, or GIF · 15 MB each · 40 MB combined</span><Button className="action-button" onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" /> Choose images</Button><input ref={inputRef} className="sr-only" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void addFiles(event.target.files ?? [])} aria-label="Choose images for local batch processing" /></div>{items.length > 0 && <><ul className="batch-processor__list" aria-label="Local batch queue">{items.map((item, index) => { const canClean = item.status === "ready" && item.inspection && canCreateCleanCopy(item.inspection.format, item.inspection.metadataState); const progressText = item.bundleStage === "cleaning" ? "Cleaning pixels locally" : item.bundleStage === "reports" ? "Writing privacy-safe reports" : item.bundleStage === "complete" ? "Included in ZIP" : item.bundleStage === "failed" ? item.bundleError : undefined; return <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong title={item.file.name}>{item.file.name}</strong><small>{formatBytes(item.file.size)} · {progressText ?? (item.status === "reading" ? "Reading locally" : item.status === "ready" ? canClean ? "Ready for a clean copy" : "Inspection complete — no readable metadata to remove" : item.error)}</small>{canClean && <div className="batch-format-picker" role="group" aria-label={`Clean output format for item ${index + 1}`}><button type="button" disabled={isBundling} className={item.outputFormat !== "png" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "jpeg")}>JPEG</button><button type="button" disabled={isBundling} className={item.outputFormat === "png" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "png")}>PNG</button></div>}</div>{item.status === "reading" || item.bundleStage === "cleaning" || item.bundleStage === "reports" ? <LoaderCircle className="spin" aria-label="Working locally" /> : item.bundleStage === "failed" || item.status === "rejected" ? <AlertTriangle aria-label="Not eligible" /> : <Check aria-label={item.bundleStage === "complete" ? "Included in ZIP" : "Inspected locally"} />}</li>; })}</ul>{isBundling && <div className="batch-progress" role="status" aria-live="polite"><div><strong>{archiveStage === "finalizing" ? "Finalizing local ZIP" : `${bundleProgress?.currentName ?? "Preparing local queue"} — image ${bundleProgress?.current ?? 0} of ${bundleProgress?.total ?? eligible.length}`}</strong><span>{progressValue}%</span></div><div className="batch-progress__track" aria-hidden="true"><i style={{ width: `${progressValue}%` }} /></div></div>}<div className="batch-processor__actions"><div><strong>{eligible.length} eligible clean {eligible.length === 1 ? "copy" : "copies"}</strong><p>Choose JPEG or PNG for each eligible item. The ZIP includes matched JSON/CSV reports plus one combined batch CSV; original names are not used.</p>{bundleNote && <p className="batch-processor__success"><Check aria-hidden="true" /> {bundleNote}</p>}{bundleError && <p className="batch-processor__error"><AlertTriangle aria-hidden="true" /> {bundleError}</p>}</div><div><Button variant="outline" disabled={isBundling || !eligible.length} onClick={downloadCombinedCsv}><FileSpreadsheet aria-hidden="true" /> Download combined CSV</Button><Button className="action-button" disabled={isBundling || !eligible.length} onClick={() => void buildBundle()}>{isBundling ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileArchive aria-hidden="true" />} {isBundling ? "Creating local ZIP…" : "Download clean ZIP"}</Button><Button variant="ghost" onClick={reset}><RotateCcw aria-hidden="true" /> Clear queue</Button></div></div></>}</>}</section>;
}
