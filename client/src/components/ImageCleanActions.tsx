/** Audit Ledger style: all clean-copy evidence, previews, and reports remain inside the active browser tab. */
import { KeyboardEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Eraser, Eye, FileJson, Palette, RotateCcw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCreateCleanCopy, CleanCopyFormat, cleanCopyFileName, createExifFreeImage, DEFAULT_JPEG_QUALITY, ImageInspection, JPEG_QUALITY_MAX, JPEG_QUALITY_MIN } from "@/lib/image";

type CleanStage = "idle" | "working" | "complete" | "error";
type CopyStage = "idle" | "complete" | "error";
type ReportStage = "idle" | "complete" | "error";
type PreviewKind = "original" | "clean";
type JpegMode = "baseline-compatible";

const PREFERENCE_KEY = "private-preflight:image-clean-copy-preferences:v2";
const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const sizeCategory = (bytes: number | null) => bytes === null ? "not-estimated" : bytes < 1_024 ? "under-1KB" : bytes < 100_000 ? "under-100KB" : bytes < 1_000_000 ? "under-1MB" : "1MB-or-more";
const metadataValue = (value?: string) => value || "Not recorded";
const orientationLabel = (value?: number) => !value ? "Not recorded" : ({ 1: "Normal", 3: "Rotated 180°", 6: "Rotated 90° clockwise", 8: "Rotated 90° counter-clockwise" }[value] ?? `EXIF orientation ${value}`);

function readPreferences(): { quality: number; advancedOpen: boolean; jpegMode: JpegMode } {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCE_KEY) ?? "{}");
    return { quality: Number.isFinite(value.quality) ? Math.min(JPEG_QUALITY_MAX, Math.max(JPEG_QUALITY_MIN, Math.round(value.quality))) : DEFAULT_JPEG_QUALITY, advancedOpen: Boolean(value.advancedOpen), jpegMode: "baseline-compatible" };
  } catch { return { quality: DEFAULT_JPEG_QUALITY, advancedOpen: false, jpegMode: "baseline-compatible" }; }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copySummary(text: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Clipboard access was unavailable. Select the summary and copy it manually.");
}

function Magnifier({ sourceUrl, cleanUrl, quality }: { sourceUrl: string; cleanUrl: string; quality: number }) {
  const [active, setActive] = useState<PreviewKind>("clean");
  const [zoom, setZoom] = useState(3);
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const activeUrl = active === "original" ? sourceUrl : cleanUrl;
  const updatePoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({ x: Math.min(90, Math.max(10, ((event.clientX - rect.left) / rect.width) * 100)), y: Math.min(90, Math.max(10, ((event.clientY - rect.top) / rect.height) * 100)) });
  };
  const moveWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = 5;
    if (!(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as string[]).includes(event.key)) return;
    event.preventDefault();
    setPoint(({ x, y }) => ({ x: event.key === "ArrowLeft" ? Math.max(10, x - delta) : event.key === "ArrowRight" ? Math.min(90, x + delta) : x, y: event.key === "ArrowUp" ? Math.max(10, y - delta) : event.key === "ArrowDown" ? Math.min(90, y + delta) : y }));
  };
  return <section className="jpeg-magnifier" aria-labelledby="magnifier-title"><div className="jpeg-magnifier__head"><span className="eyebrow"><span>ZOOM / 05</span> Detail lens</span><h4 id="magnifier-title">Inspect compression details locally.</h4></div><div className="magnifier-picker" role="group" aria-label="Preview to magnify"><button type="button" className={active === "original" ? "is-selected" : ""} aria-pressed={active === "original"} onClick={() => setActive("original")}>Original</button><button type="button" className={active === "clean" ? "is-selected" : ""} aria-pressed={active === "clean"} onClick={() => setActive("clean")}>Clean JPEG · {quality}</button></div><div className="magnifier-stage" tabIndex={0} role="application" aria-label="Move pointer or arrow keys to inspect a magnified local preview" onPointerMove={updatePoint} onKeyDown={moveWithKeyboard}><img src={activeUrl} alt={active === "original" ? "Original image detail" : `Clean JPEG detail at quality ${quality}`} /><span className="magnifier-lens" style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundImage: `url(${activeUrl})`, backgroundPosition: `${point.x}% ${point.y}%`, backgroundSize: `${zoom * 100}%` }} aria-hidden="true" /></div><label className="magnifier-zoom"><Search aria-hidden="true" /> Lens zoom <input type="range" min="2" max="5" step="0.5" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /> <strong>{zoom}×</strong></label><p>Move the pointer or use arrow keys. This lens uses the same local preview as the selected download setting.</p></section>;
}

export function ImageCleanActions({ sourceFile, inspection }: { sourceFile: File | null; inspection: ImageInspection }) {
  const [initialPreferences] = useState(readPreferences);
  const [cleanFormat, setCleanFormat] = useState<CleanCopyFormat>("jpeg");
  const [jpegQuality, setJpegQuality] = useState(initialPreferences.quality);
  const [jpegMode] = useState<JpegMode>(initialPreferences.jpegMode);
  const [advancedOpen, setAdvancedOpen] = useState(initialPreferences.advancedOpen);
  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [cleanPreviewUrl, setCleanPreviewUrl] = useState<string | null>(null);
  const [cleanStage, setCleanStage] = useState<CleanStage>("idle");
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [copyStage, setCopyStage] = useState<CopyStage>("idle");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [reportStage, setReportStage] = useState<ReportStage>("idle");
  const [reportError, setReportError] = useState<string | null>(null);
  const canDownload = Boolean(sourceFile && canCreateCleanCopy(inspection.format, inspection.metadataState));

  useEffect(() => { try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ quality: jpegQuality, advancedOpen, jpegMode })); } catch { /* Optional local settings never block the tool. */ } }, [jpegQuality, advancedOpen, jpegMode]);
  useEffect(() => { if (!sourceFile) { setSourcePreviewUrl(null); return; } const url = URL.createObjectURL(sourceFile); setSourcePreviewUrl(url); return () => URL.revokeObjectURL(url); }, [sourceFile]);
  useEffect(() => { if (!sourceFile || !canDownload) return; let active = true; let previewUrl: string | null = null; setEstimating(true); setEstimatedBytes(null); const timer = window.setTimeout(() => { void createExifFreeImage(sourceFile, cleanFormat, jpegQuality).then((blob) => { if (!active) return; setEstimatedBytes(blob.size); if (cleanFormat === "jpeg") { previewUrl = URL.createObjectURL(blob); setCleanPreviewUrl(previewUrl); } else setCleanPreviewUrl(null); }).catch(() => { if (active) { setEstimatedBytes(null); setCleanPreviewUrl(null); } }).finally(() => { if (active) setEstimating(false); }); }, 180); return () => { active = false; window.clearTimeout(timer); if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [sourceFile, cleanFormat, jpegQuality, canDownload]);

  const privacySummary = ["Private Preflight image privacy summary", "Inspection ran locally in this browser tab.", `EXIF metadata: ${inspection.metadataState === "available" ? "detected" : "not detected"}.`, `Location metadata: ${inspection.exif.hasLocationMetadata ? "detected" : "not detected"}.`, `ICC profile: ${inspection.ancillaryMetadata.hasIccProfile ? "detected and removed in the clean output" : "not detected"}.`, `Text comments: ${inspection.ancillaryMetadata.hasTextComments ? "detected and removed in the clean output" : "not detected"}.`, `XMP metadata: ${inspection.ancillaryMetadata.hasXmp ? "detected and removed in the clean output" : "not detected"}.`, canDownload ? `Selected clean output: ${cleanFormat.toUpperCase()}${cleanFormat === "jpeg" ? ` at quality ${jpegQuality} using baseline-compatible browser output` : ""}.` : "No clean copy is offered for this image.", "The original image is not changed or uploaded. This summary excludes filename, image bytes, camera values, and coordinates."].join("\n");
  const report = useMemo(() => ({ schemaVersion: "1.0", generatedAt: new Date().toISOString(), processing: { location: "local browser tab", uploaded: false, originalModified: false }, source: { format: inspection.format, mimeType: inspection.mimeType, dimensions: { width: inspection.width, height: inspection.height }, megapixels: inspection.megapixels, fileSizeCategory: sizeCategory(inspection.fileSize) }, metadataSignals: { exif: inspection.metadataState, location: inspection.exif.hasLocationMetadata ? "detected" : "not-detected", iccProfile: inspection.ancillaryMetadata.hasIccProfile ? "detected" : "not-detected", textComments: inspection.ancillaryMetadata.hasTextComments ? "detected" : "not-detected", xmp: inspection.ancillaryMetadata.hasXmp ? "detected" : "not-detected" }, cleanCopy: { offered: canDownload, selectedFormat: cleanFormat, jpegQuality: cleanFormat === "jpeg" ? jpegQuality : null, jpegMode: cleanFormat === "jpeg" ? "baseline-compatible-browser-output" : null, estimatedSizeCategory: sizeCategory(estimatedBytes) }, privacyBoundary: { excludes: ["source filename", "image bytes", "preview URLs", "raw EXIF values", "XMP contents", "camera make or model", "capture time", "coordinates", "user identifiers"] } }), [canDownload, cleanFormat, estimatedBytes, inspection, jpegQuality]);
  const download = async () => { if (!sourceFile) return; setCleanStage("working"); setCleanError(null); try { downloadBlob(await createExifFreeImage(sourceFile, cleanFormat, jpegQuality), cleanCopyFileName(sourceFile.name, cleanFormat)); setCleanStage("complete"); } catch (error) { setCleanError(error instanceof Error ? error.message : "The browser could not create the clean copy locally."); setCleanStage("error"); } };
  const copy = async () => { setCopyStage("idle"); setCopyError(null); try { await copySummary(privacySummary); setCopyStage("complete"); } catch (error) { setCopyError(error instanceof Error ? error.message : "Clipboard access was unavailable."); setCopyStage("error"); } };
  const downloadReport = () => { setReportStage("idle"); setReportError(null); try { downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), "private-preflight-image-privacy-report.json"); setReportStage("complete"); } catch (error) { setReportError(error instanceof Error ? error.message : "The browser could not download the local JSON report."); setReportStage("error"); } };
  const resetPreferences = () => { try { localStorage.removeItem(PREFERENCE_KEY); } catch { /* Ignore unavailable storage. */ } setJpegQuality(DEFAULT_JPEG_QUALITY); setAdvancedOpen(false); };

  return <>
    {canDownload && <><section className="metadata-comparison" aria-labelledby="comparison-title"><div className="metadata-comparison__heading"><span className="eyebrow"><span>COMPARE / 04</span> Metadata ledger</span><h3 id="comparison-title">See what the clean copy removes.</h3></div><div className="metadata-comparison__table"><div className="metadata-comparison__header"><span>Field</span><span>Original</span><span>Clean {cleanFormat.toUpperCase()}</span></div><div><span>EXIF block</span><strong>{inspection.metadataState === "available" ? "Found" : "Present, unreadable"}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Orientation</span><strong>{orientationLabel(inspection.exif.orientation)}</strong><strong className="metadata-removed">Normalized</strong></div><div><span>Camera make</span><strong>{metadataValue(inspection.exif.make)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Camera model</span><strong>{metadataValue(inspection.exif.model)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Capture time</span><strong>{metadataValue(inspection.exif.capturedAt)}</strong><strong className="metadata-removed">Removed</strong></div><div><span>Location signal</span><strong>{inspection.exif.hasLocationMetadata ? "Present" : "Not recorded"}</strong><strong className="metadata-removed">{inspection.exif.hasLocationMetadata ? "Removed" : "Not recorded"}</strong></div><div><span>ICC colour profile</span><strong>{inspection.ancillaryMetadata.hasIccProfile ? "Detected" : "Not recorded"}</strong><strong className="metadata-removed">{inspection.ancillaryMetadata.hasIccProfile ? "Removed" : "Not recorded"}</strong></div><div><span>Text comments</span><strong>{inspection.ancillaryMetadata.hasTextComments ? "Detected" : "Not recorded"}</strong><strong className="metadata-removed">{inspection.ancillaryMetadata.hasTextComments ? "Removed" : "Not recorded"}</strong></div><div><span>XMP packet</span><strong>{inspection.ancillaryMetadata.hasXmp ? "Detected" : "Not recorded"}</strong><strong className="metadata-removed">{inspection.ancillaryMetadata.hasXmp ? "Removed" : "Not recorded"}</strong></div></div></section>
    <section className="image-clean-copy" aria-live="polite"><div><span className="eyebrow"><span>DECIDE / 05</span> Local re-encode</span><h3>Remove metadata and download a clean copy.</h3><p>Choose a compact JPEG or a lossless PNG. The original image is not changed.</p><div className="clean-format-picker" role="group" aria-label="Clean-copy format"><button type="button" aria-pressed={cleanFormat === "jpeg"} className={cleanFormat === "jpeg" ? "is-selected" : ""} onClick={() => { setCleanFormat("jpeg"); setCleanStage("idle"); }}>JPEG <small>Smaller · adjustable quality</small></button><button type="button" aria-pressed={cleanFormat === "png"} className={cleanFormat === "png" ? "is-selected" : ""} onClick={() => { setCleanFormat("png"); setCleanStage("idle"); }}>PNG <small>Lossless · preserves transparency</small></button></div>{cleanFormat === "jpeg" && <><label className="jpeg-quality-control"><span><SlidersHorizontal aria-hidden="true" /> JPEG quality <strong>{jpegQuality}</strong></span><input type="range" min={JPEG_QUALITY_MIN} max={JPEG_QUALITY_MAX} value={jpegQuality} onChange={(event) => { setJpegQuality(Number(event.target.value)); setCleanStage("idle"); }} /><small>Lower quality generally means a smaller file and more compression.</small></label><label className="jpeg-mode-control"><span>JPEG scan mode</span><select value={jpegMode} aria-label="JPEG output scan mode"><option value="baseline-compatible">Baseline-compatible browser output</option></select><small>Progressive JPEG is not exposed by this browser encoder, so this local build does not offer a misleading switch.</small></label>{sourcePreviewUrl && cleanPreviewUrl && <><div className="jpeg-preview" aria-label="Local JPEG quality preview"><div><span>Original</span><img src={sourcePreviewUrl} alt="Original local image preview" /></div><div><span>Clean JPEG · quality {jpegQuality}</span><img src={cleanPreviewUrl} alt={`Clean JPEG preview at quality ${jpegQuality}`} /></div><p><Eye aria-hidden="true" /> Local visual guide only. The downloaded copy uses this selected quality.</p></div><Magnifier sourceUrl={sourcePreviewUrl} cleanUrl={cleanPreviewUrl} quality={jpegQuality} /></>}</>}<details className="advanced-cleanup" open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}><summary><Palette aria-hidden="true" /> Advanced container cleanup</summary><p>Colour profiles, text comments, and XMP packets can carry extra information. A clean browser re-encode removes each when found.</p><div><span>ICC profile: <strong>{inspection.ancillaryMetadata.hasIccProfile ? "Detected — will be removed" : "Not detected"}</strong></span><span>Text comments: <strong>{inspection.ancillaryMetadata.hasTextComments ? "Detected — will be removed" : "Not detected"}</strong></span><span>XMP: <strong>{inspection.ancillaryMetadata.hasXmp ? "Detected — will be removed" : "Not detected"}</strong></span></div><button type="button" className="reset-preferences" onClick={resetPreferences}><RotateCcw aria-hidden="true" /> Reset saved settings</button></details>{estimating ? <p className="clean-estimate">Creating local estimate and preview…</p> : estimatedBytes !== null ? <p className="clean-estimate">Estimated clean {cleanFormat.toUpperCase()}: <strong>{formatBytes(estimatedBytes)}</strong>{cleanFormat === "jpeg" ? ` at quality ${jpegQuality}` : ""}.</p> : <p className="clean-estimate">Size estimate becomes available before download.</p>}{cleanStage === "complete" && <p className="image-clean-copy__success"><ShieldCheck aria-hidden="true" /> Clean {cleanFormat.toUpperCase()} downloaded locally. Review that new file before sharing.</p>}{cleanError && <p className="image-clean-copy__error"><AlertTriangle aria-hidden="true" /> {cleanError}</p>}</div><Button className="action-button" onClick={() => void download()} disabled={cleanStage === "working" || estimating}><Eraser aria-hidden="true" /> {cleanStage === "working" ? `Creating clean ${cleanFormat.toUpperCase()}` : `Download clean ${cleanFormat.toUpperCase()}`}<Download aria-hidden="true" /></Button></section></>}
    <section className="image-privacy-summary" aria-labelledby="privacy-summary-title"><div><span className="eyebrow"><span>SHARE / 06</span> Privacy summary</span><h3 id="privacy-summary-title">A concise local handling note.</h3><p>{privacySummary.split("\n").slice(1).join(" ")}</p>{copyStage === "complete" && <p className="image-privacy-summary__success"><Check aria-hidden="true" /> Privacy summary copied to clipboard.</p>}{copyError && <p className="image-privacy-summary__error"><AlertTriangle aria-hidden="true" /> {copyError}</p>}</div><Button variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" /> Copy privacy summary</Button></section>
    <section className="image-json-report" aria-labelledby="json-report-title"><div><span className="eyebrow"><span>RECORD / 07</span> Local evidence export</span><h3 id="json-report-title">Keep a privacy-safe JSON report.</h3><p>Includes metadata presence signals, clean-copy settings, and the local-only boundary. It excludes names, pixels, raw metadata values, and coordinates.</p>{reportStage === "complete" && <p className="image-json-report__success"><Check aria-hidden="true" /> Local JSON report downloaded.</p>}{reportError && <p className="image-json-report__error"><AlertTriangle aria-hidden="true" /> {reportError}</p>}</div><Button variant="outline" onClick={downloadReport}><FileJson aria-hidden="true" /> Download JSON report</Button></section>
  </>;
}
