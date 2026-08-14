/** Audit Ledger style: a bounded local batch queue makes every image and recovery state traceable before a bundle is created. */
import { useRef, useState } from "react";
import JSZip from "jszip";
import { AlertTriangle, Archive, Check, FileArchive, Images, LoaderCircle, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, cleanCopyFileName, CleanCopyFormat, createExifFreeImage, DEFAULT_JPEG_QUALITY, downloadLocalBlob, ImageInspection, inspectImageFile, MAX_IMAGE_BYTES, supportedImageType } from "@/lib/image";
import { createMetadataCsv, createMetadataJson, DEFAULT_CSV_FIELDS, ReportOptions } from "@/lib/metadataReport";

const MAX_BATCH_FILES = 8;
const MAX_BATCH_BYTES = 40 * 1024 * 1024;
type BatchStatus = "reading" | "ready" | "rejected";
type BatchItem = { id: string; file: File; status: BatchStatus; inspection?: ImageInspection; error?: string };

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeItemId = (index: number) => `image-${String(index + 1).padStart(2, "0")}`;

export function BatchImageProcessor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isBundling, setIsBundling] = useState(false);
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
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "ready", inspection } : item));
      } catch (caught) {
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "rejected", error: caught instanceof Error ? caught.message : "This image could not be read locally." } : item));
      }
    }
  };

  const eligible = items.filter((item) => item.status === "ready" && item.inspection && canCreateCleanCopy(item.inspection.format, item.inspection.metadataState));
  const reset = () => { setItems([]); setBundleNote(null); setBundleError(null); if (inputRef.current) inputRef.current.value = ""; };
  const buildBundle = async () => {
    if (!eligible.length) { setBundleError("Add at least one supported image with readable metadata before creating a bundle."); return; }
    setIsBundling(true); setBundleError(null); setBundleNote(null);
    try {
      const zip = new JSZip();
      for (let index = 0; index < eligible.length; index += 1) {
        const item = eligible[index];
        const inspection = item.inspection!;
        const format: CleanCopyFormat = "jpeg";
        const options: ReportOptions = { cleanFormat: format, jpegQuality: DEFAULT_JPEG_QUALITY, estimatedBytes: null, cleanCopyOffered: true };
        const clean = await createExifFreeImage(item.file, format, DEFAULT_JPEG_QUALITY);
        const id = safeItemId(index);
        zip.file(`clean/${id}-clean.jpg`, clean);
        zip.file(`reports/${id}-metadata.json`, createMetadataJson(inspection, options));
        zip.file(`reports/${id}-metadata.csv`, `\uFEFF${createMetadataCsv(inspection, options, DEFAULT_CSV_FIELDS)}`);
      }
      zip.file("README.txt", "Private Preflight local batch bundle. Originals and raw metadata are not included. Each clean image is a browser-generated JPEG with metadata removal, plus privacy-safe JSON and CSV signal reports.");
      const bundle = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadLocalBlob(bundle, "private-preflight-image-bundle.zip");
      setBundleNote(`Local ZIP bundle downloaded with ${eligible.length} clean image${eligible.length === 1 ? "" : "s"} and paired reports.`);
    } catch (caught) { setBundleError(caught instanceof Error ? caught.message : "The browser could not create the local ZIP bundle. Try a smaller batch."); }
    finally { setIsBundling(false); }
  };

  return <section className="batch-processor" aria-labelledby="batch-title"><div className="batch-processor__heading"><div><span className="eyebrow"><span>BATCH / 01</span> Local queue</span><h2 id="batch-title">Clean several images in one local bundle.</h2><p>Up to 8 images and 40 MB total. Each image stays in this tab; rejected entries never block the rest of the queue.</p></div><Button variant="outline" onClick={() => setOpen((value) => !value)}><Images aria-hidden="true" /> {open ? "Close batch" : "Process a batch"}</Button></div>{open && <><div className="batch-processor__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}><strong>Add up to {MAX_BATCH_FILES} local images</strong><span>JPEG, PNG, WebP, or GIF · 15 MB each · 40 MB combined</span><Button className="action-button" onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" /> Choose images</Button><input ref={inputRef} className="sr-only" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void addFiles(event.target.files ?? [])} aria-label="Choose images for local batch processing" /></div>{items.length > 0 && <><ul className="batch-processor__list" aria-label="Local batch queue">{items.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong title={item.file.name}>{item.file.name}</strong><small>{formatBytes(item.file.size)} · {item.status === "reading" ? "Reading locally" : item.status === "ready" ? item.inspection?.metadataState === "none" ? "Inspection complete — no readable metadata to remove" : "Ready for a clean copy" : item.error}</small></div>{item.status === "reading" ? <LoaderCircle className="spin" aria-label="Reading locally" /> : item.status === "ready" ? <Check aria-label="Inspected locally" /> : <AlertTriangle aria-label="Not eligible" />}</li>)}</ul><div className="batch-processor__actions"><div><strong>{eligible.length} eligible clean {eligible.length === 1 ? "copy" : "copies"}</strong><p>Each eligible item becomes a clean JPEG plus a privacy-safe JSON and CSV report. Original names are not used inside the ZIP.</p>{bundleNote && <p className="batch-processor__success"><Check aria-hidden="true" /> {bundleNote}</p>}{bundleError && <p className="batch-processor__error"><AlertTriangle aria-hidden="true" /> {bundleError}</p>}</div><div><Button className="action-button" disabled={isBundling || !eligible.length} onClick={() => void buildBundle()}>{isBundling ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileArchive aria-hidden="true" />} {isBundling ? "Creating local ZIP…" : "Download clean ZIP"}</Button><Button variant="ghost" onClick={reset}><RotateCcw aria-hidden="true" /> Clear queue</Button></div></div></>}</>}</section>;
}
