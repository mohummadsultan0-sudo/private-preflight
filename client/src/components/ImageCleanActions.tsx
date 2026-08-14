/** Audit Ledger style: clean-copy choices compare visible metadata evidence and keep every privacy action local and reversible. */
import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, Eraser, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, CleanCopyFormat, cleanCopyFileName, createExifFreeImage, downloadLocalBlob, ImageInspection } from "@/lib/image";

type CleanStage = "idle" | "working" | "complete" | "error";
type CopyStage = "idle" | "complete" | "error";

function orientationLabel(value?: number): string {
  if (!value) return "Not recorded";
  const labels: Record<number, string> = { 1: "Normal", 3: "Rotated 180°", 6: "Rotated 90° clockwise", 8: "Rotated 90° counter-clockwise" };
  return labels[value] ?? `EXIF orientation ${value}`;
}

function metadataValue(value?: string): string {
  return value || "Not recorded";
}

function copyFallback(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the broadly supported, user-initiated copy route.
  }
  if (!copyFallback(text)) throw new Error("Clipboard access was unavailable. Select the on-screen summary and copy it manually.");
}

export function ImageCleanActions({ sourceFile, inspection }: { sourceFile: File | null; inspection: ImageInspection }) {
  const [cleanFormat, setCleanFormat] = useState<CleanCopyFormat>("jpeg");
  const [cleanStage, setCleanStage] = useState<CleanStage>("idle");
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [copyStage, setCopyStage] = useState<CopyStage>("idle");
  const [copyError, setCopyError] = useState<string | null>(null);
  const canDownloadCleanCopy = Boolean(sourceFile && canCreateCleanCopy(inspection.format, inspection.metadataState));
  const privacySummary = [
    "Private Preflight image privacy summary",
    "Inspection ran locally in this browser tab.",
    `EXIF metadata: ${inspection.metadataState === "available" ? "detected" : inspection.metadataState === "unreadable" ? "present but unreadable" : "not detected"}.`,
    `Location metadata: ${inspection.exif.hasLocationMetadata ? "detected" : "not detected"}.`,
    canDownloadCleanCopy ? `A clean ${cleanFormat.toUpperCase()} can be created locally to remove detected EXIF metadata.` : "No clean copy is offered because this image has no supported EXIF metadata to remove.",
    "The original image is not changed or uploaded. This summary excludes the filename, image bytes, camera values, and coordinates.",
  ].join("\n");

  const chooseFormat = (format: CleanCopyFormat) => {
    setCleanFormat(format);
    setCleanStage("idle");
    setCleanError(null);
  };

  const downloadCleanCopy = async () => {
    if (!sourceFile) return;
    setCleanStage("working");
    setCleanError(null);
    try {
      const cleanImage = await createExifFreeImage(sourceFile, cleanFormat);
      downloadLocalBlob(cleanImage, cleanCopyFileName(sourceFile.name, cleanFormat));
      setCleanStage("complete");
    } catch (caught) {
      setCleanError(caught instanceof Error ? caught.message : "The browser could not create a clean copy locally. Your original image was not changed.");
      setCleanStage("error");
    }
  };

  const copyPrivacySummary = async () => {
    setCopyStage("idle");
    setCopyError(null);
    try {
      await copyToClipboard(privacySummary);
      setCopyStage("complete");
    } catch (caught) {
      setCopyError(caught instanceof Error ? caught.message : "Clipboard access was unavailable. Select the on-screen summary and copy it manually.");
      setCopyStage("error");
    }
  };

  return <>
    {canDownloadCleanCopy && <><section className="metadata-comparison" aria-labelledby="comparison-title"><div className="metadata-comparison__heading"><span className="eyebrow"><span>COMPARE / 04</span> Metadata ledger</span><h3 id="comparison-title">See what the clean copy removes.</h3></div><div className="metadata-comparison__table"><div className="metadata-comparison__header"><span>Field</span><span>Original</span><span>Clean {cleanFormat.toUpperCase()}</span></div><div><span>EXIF block</span><strong>{inspection.metadataState === "available" ? "Found" : "Present, unreadable"}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Orientation</span><strong>{orientationLabel(inspection.exif.orientation)}</strong><strong className="metadata-removed">Normalized</strong></div><div><span>Camera make</span><strong>{metadataValue(inspection.exif.make)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Camera model</span><strong>{metadataValue(inspection.exif.model)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Capture time</span><strong>{metadataValue(inspection.exif.capturedAt)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Location signal</span><strong>{inspection.exif.hasLocationMetadata ? "Present" : "Not recorded"}</strong><strong className="metadata-removed">{inspection.exif.hasLocationMetadata ? "Removed" : "Not recorded"}</strong></div></div></section><section className="image-clean-copy" aria-live="polite"><div><span className="eyebrow"><span>DECIDE / 05</span> Local re-encode</span><h3>Remove EXIF and download a clean copy.</h3><p>Choose a compact JPEG or a lossless PNG. Both are created locally from visible pixels; the original image is not changed.</p><div className="clean-format-picker" role="group" aria-label="Clean-copy format"><button type="button" aria-pressed={cleanFormat === "jpeg"} className={cleanFormat === "jpeg" ? "is-selected" : ""} onClick={() => chooseFormat("jpeg")}>JPEG <small>Smaller · quality 90</small></button><button type="button" aria-pressed={cleanFormat === "png"} className={cleanFormat === "png" ? "is-selected" : ""} onClick={() => chooseFormat("png")}>PNG <small>Lossless · preserves transparency</small></button></div>{cleanStage === "complete" && <p className="image-clean-copy__success"><ShieldCheck aria-hidden="true" /> Clean {cleanFormat.toUpperCase()} downloaded locally. Review that new file before sharing.</p>}{cleanError && <p className="image-clean-copy__error"><AlertTriangle aria-hidden="true" /> {cleanError}</p>}</div><Button className="action-button" onClick={() => void downloadCleanCopy()} disabled={cleanStage === "working"}><Eraser aria-hidden="true" /> {cleanStage === "working" ? `Creating clean ${cleanFormat.toUpperCase()}` : `Download clean ${cleanFormat.toUpperCase()}`}<Download aria-hidden="true" /></Button></section></>}
    <section className="image-privacy-summary" aria-labelledby="privacy-summary-title"><div><span className="eyebrow"><span>SHARE / 06</span> Privacy summary</span><h3 id="privacy-summary-title">A concise local handling note.</h3><p>{privacySummary.split("\n").slice(1).join(" ")}</p>{copyStage === "complete" && <p className="image-privacy-summary__success"><Check aria-hidden="true" /> Privacy summary copied to clipboard.</p>}{copyError && <p className="image-privacy-summary__error"><AlertTriangle aria-hidden="true" /> {copyError}</p>}</div><Button variant="outline" onClick={() => void copyPrivacySummary()}><Copy aria-hidden="true" /> Copy privacy summary</Button></section>
  </>;
}
