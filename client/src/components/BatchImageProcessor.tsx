/** Audit Ledger style: a bounded local batch queue makes every image, evidence field, output choice, and recovery state traceable before a bundle is created. */
import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import JSZip from "jszip";
import { AlertTriangle, Check, ChevronDown, ChevronUp, FileArchive, FileSpreadsheet, GripVertical, Images, LoaderCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, cleanCopyFileExtension, CleanCopyFormat, createExifFreeImage, DEFAULT_JPEG_QUALITY, downloadLocalBlob, ImageInspection, inspectImageFile, MAX_IMAGE_BYTES, outputDimensionsForResize, supportedImageType } from "@/lib/image";
import { createCombinedBatchCsv, createMetadataCsv, createMetadataJson, DEFAULT_CSV_FIELDS, ReportOptions, SAFE_CSV_FIELDS, SafeCsvField } from "@/lib/metadataReport";
import { createZipOutputPlan, moveQueueItem, moveQueueItemBefore } from "@/lib/batchQueue";
import { clearSessionBatchQueue, restoreSessionBatchQueue, saveSessionBatchQueue, SessionBatchItem } from "@/lib/batchSessionVault";

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
  resizeMaxLongEdge?: number | null;
  bundleStage?: BundleStage;
  bundleError?: string;
};
type BundleProgress = { current: number; total: number; currentName: string };
type BatchReportEntry = { itemId: string; inspection: ImageInspection; options: ReportOptions };

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeItemId = (index: number) => `image-${String(index + 1).padStart(2, "0")}`;
const isCleanEligible = (item: BatchItem) => item.status === "ready" && Boolean(item.inspection) && canCreateCleanCopy(item.inspection!.format, item.inspection!.metadataState, item.inspection!.ancillaryMetadata);
const reportOptionsFor = (item: BatchItem): ReportOptions => ({ cleanFormat: item.outputFormat ?? "jpeg", jpegQuality: item.jpegQuality ?? DEFAULT_JPEG_QUALITY, resizeOptions: item.resizeMaxLongEdge ? { maxWidth: item.resizeMaxLongEdge, maxHeight: item.resizeMaxLongEdge } : null, estimatedBytes: null, cleanCopyOffered: true, anonymizeOutputName: true });
const toSessionItem = (item: BatchItem): SessionBatchItem | null => {
  if (item.status === "reading") return null;
  return { ...item, status: item.status, bundleStage: item.status === "ready" ? "queued" : item.bundleStage === "failed" ? "failed" : undefined };
};

export function BatchImageProcessor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isBundling, setIsBundling] = useState(false);
  const [archiveStage, setArchiveStage] = useState<"idle" | "cleaning" | "finalizing" | "complete" | "error">("idle");
  const [bundleProgress, setBundleProgress] = useState<BundleProgress | null>(null);
  const [selectedCombinedFields, setSelectedCombinedFields] = useState<SafeCsvField[]>(DEFAULT_CSV_FIELDS);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);
  const [sessionNote, setSessionNote] = useState<string | null>(null);
  const [bundleNote, setBundleNote] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void restoreSessionBatchQueue().then((restored) => {
      if (!active || !restored.length) return;
      setItems(restored);
      setOpen(true);
      setSessionNote(`Restored ${restored.length} local queue item${restored.length === 1 ? "" : "s"} for this browser tab.`);
    }).catch(() => {
      if (active) setSessionNote("This browser could not restore the temporary local queue. You can continue in this page.");
    }).finally(() => { if (active) setIsSessionRestoring(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isSessionRestoring || isBundling) return;
    const saved = items.map(toSessionItem).filter((item): item is SessionBatchItem => item !== null);
    if (!saved.length) { void clearSessionBatchQueue().catch(() => undefined); return; }
    void saveSessionBatchQueue(saved).catch(() => setSessionNote("Temporary queue saving is unavailable in this browser. The current queue remains local in this page."));
  }, [isBundling, isSessionRestoring, items]);

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
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "ready", inspection, outputFormat: "jpeg", jpegQuality: DEFAULT_JPEG_QUALITY, resizeMaxLongEdge: null, bundleStage: "queued" } : item));
      } catch (caught) {
        setItems((current) => current.map((item) => item.id === queuedItem.id ? { ...item, status: "rejected", error: caught instanceof Error ? caught.message : "This image could not be read locally." } : item));
      }
    }
  };

  const eligible = items.filter(isCleanEligible);
  const combinedEntries: BatchReportEntry[] = eligible.map((item, index) => ({ itemId: safeItemId(index), inspection: item.inspection!, options: reportOptionsFor(item) }));
  const zipOutputByItemId = createZipOutputPlan(items, isCleanEligible, (item) => cleanCopyFileExtension(item.outputFormat ?? "jpeg"));
  const completedCount = eligible.filter((item) => item.bundleStage === "complete").length;
  const progressValue = archiveStage === "complete" ? 100 : archiveStage === "finalizing" ? 95 : eligible.length ? Math.round((completedCount / eligible.length) * 85) : 0;
  const orderingLocked = isSessionRestoring || isBundling || items.some((item) => item.status === "reading");

  const reset = () => {
    setItems([]);
    setBundleNote(null);
    setBundleError(null);
    setArchiveStage("idle");
    setBundleProgress(null);
    setSelectedCombinedFields(DEFAULT_CSV_FIELDS);
    setDraggedItemId(null);
    setDropTargetId(null);
    setQueueNotice(null);
    setSessionNote(null);
    void clearSessionBatchQueue().catch(() => undefined);
    if (inputRef.current) inputRef.current.value = "";
  };
  const setOutputFormat = (id: string, outputFormat: CleanCopyFormat) => setItems((current) => current.map((item) => item.id === id ? { ...item, outputFormat } : item));
  const setJpegQuality = (id: string, jpegQuality: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, jpegQuality } : item));
  const setResizeMaxLongEdge = (id: string, value: number | null) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    const maximum = item.inspection ? Math.max(item.inspection.width, item.inspection.height) : value ?? 1;
    return { ...item, resizeMaxLongEdge: value === null ? null : Math.min(maximum, Math.max(1, Math.round(value) || 1)) };
  }));
  const removeItem = (id: string) => {
    if (isBundling) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setBundleNote(null);
    setBundleError(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const moveItem = (id: string, nextIndex: number) => {
    if (orderingLocked) return;
    const boundedIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    if (!items.some((item) => item.id === id)) return;
    setItems((current) => moveQueueItem(current, id, boundedIndex));
    setQueueNotice(`Queue order updated: item moved to position ${boundedIndex + 1} of ${items.length}.`);
  };
  const moveItemBefore = (sourceId: string, targetId: string) => {
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const nextIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    setItems((current) => moveQueueItemBefore(current, sourceId, targetId));
    setQueueNotice(`Queue order updated: item moved to position ${nextIndex + 1} of ${items.length}.`);
  };
  const startDrag = (event: ReactDragEvent<HTMLButtonElement>, id: string) => {
    if (orderingLocked) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggedItemId(id);
    setQueueNotice("Dragging queue item. Drop before another row to change the local processing order.");
  };
  const startTouchDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType === "mouse" || orderingLocked) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggedItemId(id);
    setQueueNotice("Dragging queue item. Release over another row to change the local processing order.");
  };
  const moveTouchDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType === "mouse" || draggedItemId !== id || orderingLocked) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-queue-item-id]");
    const targetId = target?.dataset.queueItemId;
    if (targetId && targetId !== id) setDropTargetId(targetId);
  };
  const finishTouchDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType === "mouse") return;
    if (!orderingLocked && dropTargetId) moveItemBefore(id, dropTargetId);
    setDraggedItemId(null);
    setDropTargetId(null);
  };
  const dropOnItem = (event: ReactDragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    if (!orderingLocked) moveItemBefore(event.dataTransfer.getData("text/plain") || draggedItemId || "", targetId);
    setDraggedItemId(null);
    setDropTargetId(null);
  };
  const handleReorderKey = (event: ReactKeyboardEvent<HTMLButtonElement>, id: string) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const currentIndex = items.findIndex((item) => item.id === id);
    moveItem(id, currentIndex + (event.key === "ArrowUp" ? -1 : 1));
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
          const clean = await createExifFreeImage(item.file, format, options.jpegQuality, options.resizeOptions);
          const id = safeItemId(index);
          const extension = cleanCopyFileExtension(format);
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
      zip.file("README.txt", "Private Preflight local batch bundle. Originals, raw metadata, and source filenames are not included. Each clean image uses an anonymous ordinal filename, its selected browser-generated JPEG, WebP, or PNG format, local EXIF orientation normalization when required, and paired JSON and CSV signal reports.");
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
        <p>Up to 8 images and 40 MB total. Clean ZIP names are anonymous; when EXIF indicates rotation, visible pixels are normalized locally before metadata is removed.</p>
      </div>
      <Button variant="outline" disabled={isBundling || isSessionRestoring} onClick={() => setOpen((value) => !value)}><Images aria-hidden="true" /> {open ? "Close batch" : "Process a batch"}</Button>
    </div>
    {open && <>
      <div className="batch-processor__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!isBundling && !isSessionRestoring) void addFiles(event.dataTransfer.files); }}>
        <strong>Add up to {MAX_BATCH_FILES} local images</strong>
        <span>JPEG, PNG, WebP, or GIF · 15 MB each · 40 MB combined</span>
        <Button className="action-button" disabled={isBundling || isSessionRestoring} onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" /> Choose images</Button>
        <input ref={inputRef} className="sr-only" type="file" multiple disabled={isBundling || isSessionRestoring} accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void addFiles(event.target.files ?? [])} aria-label="Choose images for local batch processing" />
      </div>
      {items.length > 0 && <>
        <ul className="batch-processor__list" aria-label="Local batch queue">
          {items.map((item, index) => {
            const canClean = isCleanEligible(item);
            const format = item.outputFormat ?? "jpeg";
            const jpegQuality = item.jpegQuality ?? DEFAULT_JPEG_QUALITY;
            const resizeEnabled = Boolean(item.resizeMaxLongEdge);
            const resizeOutput = item.inspection ? outputDimensionsForResize(item.inspection.width, item.inspection.height, resizeEnabled ? { maxWidth: item.resizeMaxLongEdge!, maxHeight: item.resizeMaxLongEdge! } : null) : null;
            const zipOutputName = zipOutputByItemId.get(item.id);
            const progressText = item.bundleStage === "cleaning" ? "Cleaning pixels locally" : item.bundleStage === "reports" ? "Writing privacy-safe reports" : item.bundleStage === "complete" ? "Included in ZIP" : item.bundleStage === "failed" ? item.bundleError : undefined;
            const itemIsDragging = draggedItemId === item.id;
            const itemIsDropTarget = dropTargetId === item.id && draggedItemId !== item.id;
            return <li key={item.id} data-queue-item-id={item.id} className={`${itemIsDragging ? "is-dragging" : ""} ${itemIsDropTarget ? "is-drop-target" : ""}`} onDragOver={(event) => { if (!orderingLocked && draggedItemId !== item.id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTargetId(item.id); } }} onDragLeave={() => { if (dropTargetId === item.id) setDropTargetId(null); }} onDrop={(event) => dropOnItem(event, item.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <button type="button" className="batch-drag-handle" draggable={!orderingLocked} disabled={orderingLocked} onDragStart={(event) => startDrag(event, item.id)} onDragEnd={() => { setDraggedItemId(null); setDropTargetId(null); }} onPointerDown={(event) => startTouchDrag(event, item.id)} onPointerMove={(event) => moveTouchDrag(event, item.id)} onPointerUp={(event) => finishTouchDrag(event, item.id)} onPointerCancel={() => { setDraggedItemId(null); setDropTargetId(null); }} onKeyDown={(event) => handleReorderKey(event, item.id)} aria-label={`Reorder item ${index + 1}. Drag to move, or use Alt plus up or down arrow.`} title="Drag to reorder · Alt + ↑/↓ moves by one row"><GripVertical aria-hidden="true" /></button>
              <div className="batch-move-buttons" aria-label={`Move item ${index + 1}`}>
                <button type="button" disabled={orderingLocked || index === 0} onClick={() => moveItem(item.id, index - 1)} aria-label={`Move item ${index + 1} up`} title="Move up"><ChevronUp aria-hidden="true" /></button>
                <button type="button" disabled={orderingLocked || index === items.length - 1} onClick={() => moveItem(item.id, index + 1)} aria-label={`Move item ${index + 1} down`} title="Move down"><ChevronDown aria-hidden="true" /></button>
              </div>
              <div className="batch-item-main">
                <strong title={item.file.name}>{item.file.name}</strong>
                <small>{formatBytes(item.file.size)} · {progressText ?? (item.status === "reading" ? "Reading locally" : item.status === "ready" ? canClean ? "Ready for a clean copy" : "Inspection complete — no readable metadata to remove" : item.error)}</small>
                <span className={`batch-zip-preview ${zipOutputName ? "" : "is-unavailable"}`}><b>ZIP /</b> {zipOutputName ?? (item.status === "reading" ? "Awaiting local inspection" : "No clean ZIP output")}</span>
                {canClean && <>
                  <div className="batch-format-picker" role="group" aria-label={`Clean output format for item ${index + 1}`}>
                    <button type="button" disabled={isBundling} className={format === "jpeg" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "jpeg")}>JPEG</button>
                    <button type="button" disabled={isBundling} className={format === "png" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "png")}>PNG</button>
                    <button type="button" disabled={isBundling} className={format === "webp" ? "is-active" : ""} onClick={() => setOutputFormat(item.id, "webp")}>WebP</button>
                  </div>
                  {(format === "jpeg" || format === "webp") && <label className="batch-quality-control"><span>{format === "webp" ? "WebP" : "JPEG"} quality <strong>{jpegQuality}</strong></span><input type="range" min={MIN_JPEG_QUALITY} max={MAX_JPEG_QUALITY} value={jpegQuality} disabled={isBundling} onChange={(event) => setJpegQuality(item.id, Number(event.target.value))} aria-label={`${format === "webp" ? "WebP" : "JPEG"} quality for item ${index + 1}`} /></label>}
                  <div className="batch-resize-control"><label><input type="checkbox" checked={resizeEnabled} disabled={isBundling} onChange={(event) => setResizeMaxLongEdge(item.id, event.target.checked ? Math.min(1920, Math.max(item.inspection!.width, item.inspection!.height)) : null)} /> Resize before ZIP</label>{resizeEnabled && <><label>Max long edge <input type="number" inputMode="numeric" min={1} max={Math.max(item.inspection!.width, item.inspection!.height)} value={item.resizeMaxLongEdge ?? ""} disabled={isBundling} onChange={(event) => setResizeMaxLongEdge(item.id, Number(event.target.value))} /> px</label><small>Output: {resizeOutput?.width} × {resizeOutput?.height}px · proportions preserved</small></>}</div>
                </>}
              </div>
              <div className="batch-item-actions">
                <button type="button" className="batch-item-remove" disabled={isBundling} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name} from local batch`} title="Remove from local batch"><Trash2 aria-hidden="true" /></button>
                {item.status === "reading" || item.bundleStage === "cleaning" || item.bundleStage === "reports" ? <LoaderCircle className="spin" aria-label="Working locally" /> : item.bundleStage === "failed" || item.status === "rejected" ? <AlertTriangle aria-label="Not eligible" /> : <Check aria-label={item.bundleStage === "complete" ? "Included in ZIP" : "Inspected locally"} />}
              </div>
            </li>;
          })}
        </ul>
        <p className="batch-order-note" aria-live="polite"><GripVertical aria-hidden="true" /> {queueNotice ?? (orderingLocked ? "Queue order is locked while a file is reading or a ZIP is being created." : "Drag the handle to reorder. Alt + ↑ or ↓ moves one row.")}</p>
        {sessionNote && <p className="batch-session-note" role="status">{sessionNote}</p>}
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
            <p>DECIDE / 04 · Choose JPEG, WebP, or PNG and, for JPEG, a per-image compression quality. The ZIP includes matched JSON/CSV reports plus one filtered combined batch CSV; original names are not used.</p>
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
