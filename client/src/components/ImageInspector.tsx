/** Audit Ledger style: local image facts are presented as an evidence ledger, never as an opaque privacy verdict or an image editor. */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, FileImage, ImageIcon, LockKeyhole, MapPin, RotateCcw, ScanLine, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditTrail } from "@/components/AuditTrail";
import { LocalSeal } from "@/components/LocalVisuals";
import { ImageCleanActions } from "@/components/ImageCleanActions";
import { BatchImageProcessor } from "@/components/BatchImageProcessor";
import { ImageInspection, ImageInspectionError, inspectImageFile, MAX_IMAGE_BYTES, supportedImageType } from "@/lib/image";

type ImageStage = "idle" | "reading" | "complete" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function orientationLabel(value?: number): string {
  if (!value) return "Not recorded";
  const labels: Record<number, string> = { 1: "Normal", 3: "Rotated 180°", 6: "Rotated 90° clockwise", 8: "Rotated 90° counter-clockwise" };
  return labels[value] ?? `EXIF orientation ${value}`;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return <div className="image-metadata-row"><span>{label}</span><strong title={value}>{value}</strong></div>;
}

export function ImageInspector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<ImageStage>("idle");
  const [inspection, setInspection] = useState<ImageInspection | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!error) return;
    const alert = errorRef.current;
    if (!alert) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const top = window.scrollY + alert.getBoundingClientRect().top - Math.max(24, (window.innerHeight - alert.offsetHeight) / 2);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" });
    alert.focus({ preventScroll: true });
  }, [error]);

  const reset = () => {
    setStage("idle");
    setInspection(null);
    setSourceFile(null);
    setError(null);
    setIsDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const inspect = async (file?: File) => {
    if (!file) return;
    if (!supportedImageType(file)) {
      setError("This file type is not supported here. Choose a JPEG, PNG, WebP, or GIF image.");
      setStage("error");
      return;
    }
    setStage("reading");
    setError(null);
    setInspection(null);
    setSourceFile(null);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const result = await inspectImageFile(file);
      setInspection(result);
      setSourceFile(file);
      setStage("complete");
    } catch (caught) {
      setError(caught instanceof ImageInspectionError ? caught.message : "The browser could not inspect this image locally. Try another intact supported image.");
      setStage("error");
    }
  };

  return (
    <section className="image-workspace" id="image-tool" aria-labelledby="image-tool-title">
      <div className="image-workspace__masthead">
        <div>
          <span className="eyebrow"><span>IMAGE INSPECTOR / 01</span> Local inspection record</span>
          <h1 id="image-tool-title">Image facts, before sharing.</h1>
          <p>Add → inspect → review → decide. Read local file facts and available EXIF without moving the image from this browser tab.</p>
        </div>
        <LocalSeal className="image-local-seal" detail="Image stays in this tab" />
      </div>

      <div className="inspection-frame image-inspection-frame">
        <AuditTrail mode="image" phase={inspection ? "ready" : stage === "reading" ? "reading" : stage === "error" ? "error" : "idle"} />
        <div className="inspection-frame__content">
          {!inspection && stage !== "complete" && (
              <div className="image-drop-layout">
              <div className={`image-dropzone ${isDragging ? "image-dropzone--dragging" : ""} ${stage === "reading" ? "image-dropzone--busy" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); void inspect(event.dataTransfer.files?.[0]); }}>
                <div className="image-dropzone__ledger-marks" aria-hidden="true"><i /><i /><i /></div>
                <span className="image-dropzone__index"><b>RECORD / 01</b> ADD · IMAGE FILE</span>
                {stage === "reading" ? <div className="image-processing" aria-live="polite"><ScanLine aria-hidden="true" /><strong>Reading locally</strong><p>Checking image dimensions and available metadata. Nothing is uploaded.</p></div> : <><div className="image-dropzone__icon"><ImageIcon aria-hidden="true" /></div><h2>Drop an image here</h2><p>or choose a local <code>.jpg</code>, <code>.png</code>, <code>.webp</code>, or <code>.gif</code></p><p className="image-dropzone__helper"><strong>New here?</strong> Choose a photo you are about to send. You will see what local metadata is available before you decide.</p><Button className="action-button" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" /> Choose image</Button><input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void inspect(event.target.files?.[0])} className="sr-only" aria-label="Choose an image for local inspection" /></>}
                <div className="image-dropzone__foot"><LockKeyhole aria-hidden="true" /><span>Hard limit: {MAX_IMAGE_BYTES / 1024 / 1024} MB for predictable local inspection.</span></div>
              </div>
              <aside className="image-side-note"><span>INSPECT / 02 — LOCAL EVIDENCE</span><ol><li><ImageIcon aria-hidden="true" /><span>File type, byte size, dimensions, aspect ratio, and megapixels.</span></li><li><Camera aria-hidden="true" /><span>Available orientation, make, model, and capture-time EXIF tags.</span></li><li><MapPin aria-hidden="true" /><span>A location-metadata signal, never raw coordinates.</span></li></ol><p>Missing EXIF is normal and is not a warning by itself.</p></aside>
              <BatchImageProcessor />
            </div>
          )}

          {error && <div className="image-error" ref={errorRef} tabIndex={-1} role="alert"><AlertTriangle aria-hidden="true" /><div><span className="eyebrow"><span>STOP</span> Inspection did not start</span><h2>{error}</h2><p>The image was not uploaded, stored, or sent anywhere. Choose another local image to continue.</p></div><Button variant="outline" onClick={reset}><RotateCcw aria-hidden="true" /> Reset</Button></div>}

          {inspection && (
            <div className="image-result" aria-live="polite">
              <header className="image-result__header"><div className="image-result__title"><FileImage aria-hidden="true" /><div><span>LOCAL IMAGE INSPECTION COMPLETE</span><h2 title={inspection.fileName}>{inspection.fileName}</h2><p>{inspection.format.toUpperCase()} · {inspection.mimeType} · {formatBytes(inspection.fileSize)}</p></div></div><Button variant="ghost" className="quiet-button" onClick={reset}><RotateCcw aria-hidden="true" /> Inspect another</Button></header>
              <div className="image-stats"><div><span>PIXELS</span><strong>{inspection.width} × {inspection.height}</strong><small>{inspection.megapixels} megapixels</small></div><div><span>FRAME</span><strong>{inspection.aspectRatio}</strong><small>aspect ratio</small></div><div><span>METADATA</span><strong>{inspection.metadataState === "available" ? "Found" : inspection.metadataState === "none" ? "None" : "Unreadable"}</strong><small>EXIF availability</small></div><div><span>LOCATION</span><strong>{inspection.exif.hasLocationMetadata ? "Present" : "Not found"}</strong><small>metadata signal only</small></div></div>
              <div className="image-ledger-grid"><section><span className="eyebrow"><span>REVIEW / 03</span> File and frame</span><div className="image-ledger"><MetadataRow label="File format" value={inspection.format.toUpperCase()} /><MetadataRow label="MIME type" value={inspection.mimeType} /><MetadataRow label="File size" value={formatBytes(inspection.fileSize)} /><MetadataRow label="Dimensions" value={`${inspection.width} × ${inspection.height} px`} /><MetadataRow label="Aspect ratio" value={inspection.aspectRatio} /></div></section><section><span className="eyebrow"><span>REVIEW / 03</span> Available EXIF</span>{inspection.metadataState === "available" ? <div className="image-ledger"><MetadataRow label="Orientation" value={orientationLabel(inspection.exif.orientation)} /><MetadataRow label="Camera make" value={inspection.exif.make ?? "Not recorded"} /><MetadataRow label="Camera model" value={inspection.exif.model ?? "Not recorded"} /><MetadataRow label="Capture time" value={inspection.exif.capturedAt ?? "Not recorded"} /><MetadataRow label="Location metadata" value={inspection.exif.hasLocationMetadata ? "Present — review before sharing" : "Not found"} /></div> : <div className="image-empty-metadata"><ShieldCheck aria-hidden="true" /><div><strong>{inspection.metadataState === "none" ? "No readable EXIF was found." : "EXIF could not be read safely."}</strong><p>{inspection.metadataNotice ?? "The file facts above are still available. This does not prove that the image has no sensitive content."}</p></div></div>}</section></div>
              <ImageCleanActions sourceFile={sourceFile} inspection={inspection} />
              <div className="image-boundary"><LockKeyhole aria-hidden="true" /><div><strong>No image data left this tab.</strong><p>This report shows local signals only. It does not remove metadata, prove privacy, or determine whether an image is safe to share.</p></div></div>
            </div>
          )}
        </div>
      </div>
      <section className="image-flow-ledger" aria-labelledby="image-flow-title"><div><span className="eyebrow"><span>PATH / 05</span> Local decision record</span><h2 id="image-flow-title">A short path before an image travels.</h2><p>The browser reads the selected image, shows available local signals, then leaves the sharing decision and any clean-copy download under your control.</p></div><ol><li><span>01</span><strong>Add locally</strong><p>Choose an image from this device. No upload path opens.</p></li><li><span>02</span><strong>Review evidence</strong><p>Check file facts and available metadata before sharing.</p></li><li><span>03</span><strong>Decide explicitly</strong><p>Keep the original or make a local clean copy when offered.</p></li></ol></section>
    </section>
  );
}
