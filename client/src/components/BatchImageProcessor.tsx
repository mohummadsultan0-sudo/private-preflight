/** Audit Ledger style: a bounded local batch queue makes every image, evidence field, output choice, and recovery state traceable before a bundle is created. */
import { useRef, useState } from "react";
import JSZip from "jszip";
import { AlertTriangle, Check, FileArchive, FileSpreadsheet, Images, LoaderCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, CleanCopyFormat, createExifFreeImage, DEFAULT_JPEG_QUALITY, downloadLocalBlob, ImageInspection, inspectImageFile, MAX_IMAGE_BYTES, supportedImageType } from "@/lib/image";
import { createCombinedBatchCsv, createMetadataCsv, createMetadataJson, DEFAULT_CSV_FIELDS, ReportOptions, SAFE_CSV_FIELDS, SafeCsvField } from "@/lib/metadataReport";

const MAX_BATCH_FILES = 8;
const MAX_BATCH_BYTES = 40 * 1024 * 1024;
const MIN_JPEG_QUALITY = 40;
const MAX_JPEG_QUALITY = 95;

type BatchStatus = "reading" | "ready" | "rejected";
type BundleStage = "queued" | "cleaning" | "reports" | "complete" | "failed";
type BatchItem = {
  id: string;
  file: File;
  status: BatchStatus;
  inspection?: ImageInspection;
  error?: string;
  outputFormat?: CleanCopyFormat;
  jpegQuality?: number;
  bundleStage?: BundleStage;
  bundleError?: string;
};
type BundleProgress = { current: number; total: number; currentName: string };
type BatchReportEntry = { itemId: string; inspection: ImageInspection; options: ReportOptions };

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeItemId = (index: number) => `image-${String(index + 1).padStart(2, "0")}`;
const isCleanEligible = (item: BatchItem) => item.status === "ready" && Boolean(item.inspection) && canCreateCleanCopy(item.inspection!.format, item.inspection!.metadataState);
const reportOptionsFor = (item: BatchItem): ReportOptions => ({ cleanFormat: item.outputFormat ?? "jpeg", jpegQuality: item.jpegQuality ?? DEFAULT_JPEG_QUALITY, estimatedBytes: null, cleanCopyOffered: true });

export function BatchImageProcessor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isBundling, setIsBundling] = useState(false);
  const [archiveStage, setArchiveStage] = useState<"idle" | "cleaning" | "finalizing" | "complete" | "error">("idle");
  const [bundleProgress, setBundleProgress] = useState<BundleProgress | null>(null);
  const [selectedCombinedFields, setSelectedCombinedFields] = useState<SafeCsvField[]>(DEFAULT_CSV_FIELDS);
  const [bundleNote, setBundleNote] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);

  const addFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    setOpen(true);
    setBundleNote(null);
    setBundleError(null);
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
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "ready", inspection, outputFormat: "jpeg", jpegQuality: DEFAULT_JPEG_QUALITY, bundleStage: "queued" } : item));
      } catch (caught) {
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "rejected", error: caught instanceof Error ? caught.message : "This image could not be read locally." } : item));
      }
    }
  };

  const eligible = items.filter(isCleanEligible);
  const combinedEntries: BatchReportEntry[] = eligible.map((item, index) => ({ itemId: safeItemId(index), inspection: item.inspection!, options: reportOptionsFor(item) }));
  const completedCount = eligible.filter((item) => item.bundleStage === "complete").length;
  const progressValue = archiveStage === "complete" ? 100 : archiveStage === "finalizing" ? 95 : eligible.length ? Math.round((completedCount / eligible.length) * 85) : 0;

  const reset = () => {
    setItems([]);
    setBundleNote(null);
    setBundleError(null);
    setArchiveStage("idle");
    setBundleProgress(null);
    setSelectedCombinedFields(DEFAULT_CSV_FIELDS);
    if (inputRef.current) inputRef.current.value = "";
  };
  const setOutputFormat = (id: string, outputFormat: CleanCopyFormat) => setItems((current) => current.map((item) => item.id === id ? { ...item, outputFormat } : item));
  const setJpegQuality = (id: string, jpegQuality: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, jpegQuality } : item));
  const removeItem = (id: string) => {
    if (isBundling) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setBundleNote(null);
    setBundleError(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const toggleCombinedField = (field: SafeCsvField) => setSelectedCombinedFields((current) => current.includes(field) ? current.length === 1 ? current : current.filter((value) => value !== field) : [...current, field]);
  const downloadCombinedCsv = () => {
    if (!combinedEntries.length) {
      setBundleError("Add at least one eligible image before downloading a combined CSV report.");
      return;
    }
    downloadLocalBlob(new Blob(["\uFEFF", createCombinedBatchCsv(combinedEntries, selectedCombinedFields)], { type: "text/csv;charset=utf-8" }), "private-preflight-batch-metadata-report.csv");
    setBundleNote(`Local combined CSV report downloaded with ${combinedEntries.length} item${combinedEntries.length === 1 ? "" : "s"} and ${selectedCombinedFields.length} selected field${selectedCombinedFields.length === 1 ? "" : "s"}.`);
  };

  const buildBundle = async () => {
    if (!eligible.length) {
      setBundleError("Add at least one supported image with readable metadata before creating a bundle.");
      return;
    }
    setIsBundling(true);
    setArchiveStage("cleaning");
    setBundleProgress({ current: 0, total: eligible.length, currentName: "Preparing local queue" });
    setBundleError(null);
    setBundleNote(null);
    setItems((current) => current.map((item) => eligible.some((entry) => entry.id === item.id) ? { ...item, bundleStage: "queued", bundleError: undefined } : item));
    try {
      const zip = new JSZip();
      const completedEntries: BatchReportEntry[] = [];
      for (let index = 0; index < eligible.length; index += 1) {
        const item = eligible[index];
        const inspection = item.inspection!;
        const options = reportOptionsFor(item);
        const format = options.cleanFormat;
        setBundleProgress({ current: index + 1, total: eligible.length, currentName: item.file.name });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, bundleStage: "cleaning" } : entry));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        try {
          const clean = await createExifFreeImage(item.file, format, options.jpegQuality);
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
      zip.file("reports/batch-metadata.csv", `\uFEFF${createCombinedBatchCsv(completedEntries, selectedCombinedFields)}`);
      zip.file("README.txt", "Private Preflight local batch bundle. Originals and raw metadata are not included. Each clean image uses its selected browser-generated JPEG or PNG format, with paired JSON and CSV signal reports.");
      setArchiveStage("finalizing");
      setBundleProgress({ current: completedEntries.length, total: eligible.length, currentName: "Writing local archive" });
      const bundle = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadLocalBlob(bundle, "private-preflight-image-bundle.zip");
      setArchiveStage("complete");
      setBundleNote(`Local ZIP bundle downloaded with ${completedEntries.length} clean image${completedEntries.length === 1 ? "" : "s"}, paired reports, and one filtered combined CSV.`);
    } catch (caught) {
      setArchiveStage("error");
      setBundleError(caught instanceof Error ? caught.message : "The browser could not create the local ZIP bundle. Try a smaller batch.");
    } finally {
      setIsBundling(false);
    }
  };

  return <section className="batch-processor" aria-labelledby="batch-title">
    <div className="batch-processor__heading">
      <div>
        <span className="eyebrow"><span>ADD / BATCH</span> Local queue</span>
        <h2 id="batch-title">Review several images before sharing.</h2>
        <p>Up to 8 images and 40 MB total. Review local facts, choose an output, then decide whether to create an evidence bundle.</p>
      </div>
      <Button variant="outline" disabled={isBundling} onClick={() => setOpen((value) => !value)}><Images aria-hidden="true" /> {open ? "Close batch" : "Process a batch"}</Button>
    </div>
    {open && <>
      <div className="batch-processor__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!isBundling) void addFiles(event.dataTransfer.files); }}>
        <strong>Add up to {MAX_BATCH_FILES} local images</strong>
        <span>JPEG, PNG, WebP, or GIF · 15 MB each · 40 MB combined</span>
        <Button className="action-button" disabled={isBundling} onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" /> Choose images</Button>
        <input ref={inputRef} className="sr-only" type="file" multiple disabled={isBundling} accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void addFiles(event.target.files ?? [])} aria-label="Choose images for local batch processing" />
      </div>
      {items.length > 0 && <>
        <ul className="batch-processor__list" aria-label="Local batch queue">
          {items.map((item, index) => {
            const canClean = isCleanEligible(item);
            const format = item.outputFormat ?? "jpeg";
            const jpegQuality = item.jpegQuality ?? DEFAULT_JPEG_QUALITY;
            const progressText = item.bundleStage === "cleaning" ? "Cleaning pixels locally" : item.bundleStage === "reports" ? "Writing privacy-safe reports" : item.bundleStage === "complete" ? "Included in ZIP" : item.bundleStage === "failed" ? item.bundleError : undefined;
            return <li key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div className="batch-item-main">
                <strong title={item.file.name}>{item.file.name}</strong>
                <small>{formatBytes(item.file.size)} · {progressText ?? (item.status === "reading" ? "Reading locally" : item.status === "ready" ? canClean ? "Ready for a clean copy" : "Inspection complete — no readable metadata to remove" : item.error)}</small>
                {canClean && <>
                  <div className="batch-format-picker" role="group" aria-label={`Clean output format for item ${index + 1}`}>
                    <button type="button" disabled={isBundling} className={format === "jpeg" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "jpeg")}>JPEG</button>
                    <button type="button" disabled={isBundling} className={format === "png" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "png")}>PNG</button>
                  </div>
                  {format === "jpeg" && <label className="batch-quality-control"><span>JPEG quality <strong>{jpegQuality}</strong></span><input type="range" min={MIN_JPEG_QUALITY} max={MAX_JPEG_QUALITY} value={jpegQuality} disabled={isBundling} onChange={(event) => setJpegQuality(item.id, Number(event.target.value))} aria-label={`JPEG quality for item ${index + 1}`} /></label>}
                </>}
              </div>
              <div className="batch-item-actions">
                <button type="button" className="batch-item-remove" disabled={isBundling} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name} from local batch`} title="Remove from local batch"><Trash2 aria-hidden="true" /></button>
                {item.status === "reading" || item.bundleStage === "cleaning" || item.bundleStage === "reports" ? <LoaderCircle className="spin" aria-label="Working locally" /> : item.bundleStage === "failed" || item.status === "rejected" ? <AlertTriangle aria-label="Not eligible" /> : <Check aria-label={item.bundleStage === "complete" ? "Included in ZIP" : "Inspected locally"} />}
              </div>
            </li>;
          })}
        </ul>
        <details className="batch-csv-field-picker">
          <summary>REVIEW / 03 · Choose combined CSV fields · {selectedCombinedFields.length} selected</summary>
          <p>These safe signals apply to the standalone combined CSV and the copy inside the local ZIP. Names, pixels, and raw metadata stay excluded.</p>
          <div>{SAFE_CSV_FIELDS.map((field) => <label key={field}><input type="checkbox" checked={selectedCombinedFields.includes(field)} onChange={() => toggleCombinedField(field)} disabled={isBundling || (selectedCombinedFields.length === 1 && selectedCombinedFields.includes(field))} /> <span>{field.replaceAll("_", " ")}</span></label>)}</div>
        </details>
        {isBundling && <div className="batch-progress" role="status" aria-live="polite">
          <div><strong>{archiveStage === "finalizing" ? "Finalizing local ZIP" : `${bundleProgress?.currentName ?? "Preparing local queue"} — image ${bundleProgress?.current ?? 0} of ${bundleProgress?.total ?? eligible.length}`}</strong><span>{progressValue}%</span></div>
          <div className="batch-progress__track" aria-hidden="true"><i style={{ width: `${progressValue}%` }} /></div>
        </div>}
        <div className="batch-processor__actions">
          <div>
            <strong>{eligible.length} eligible clean {eligible.length === 1 ? "copy" : "copies"}</strong>
            <p>DECIDE / 04 · Choose JPEG or PNG and, for JPEG, a per-image compression quality. The ZIP includes matched JSON/CSV reports plus one filtered combined batch CSV; original names are not used.</p>
            {bundleNote && <p className="batch-processor__success"><Check aria-hidden="true" /> {bundleNote}</p>}
            {bundleError && <p className="batch-processor__error"><AlertTriangle aria-hidden="true" /> {bundleError}</p>}
          </div>
          <div>
            <Button variant="outline" disabled={isBundling || !eligible.length} onClick={downloadCombinedCsv}><FileSpreadsheet aria-hidden="true" /> Download combined CSV</Button>
            <Button className="action-button" disabled={isBundling || !eligible.length} onClick={() => void buildBundle()}>{isBundling ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileArchive aria-hidden="true" />} {isBundling ? "Creating local ZIP…" : "Download clean ZIP"}</Button>
            <Button variant="ghost" onClick={reset} disabled={isBundling}><RotateCcw aria-hidden="true" /> Clear queue</Button>
          </div>
        </div>
      </>}
    </>}
  </section>;
}
