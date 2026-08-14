/** Audit Ledger style: spreadsheet-ready evidence carries signals, never source content or raw identifiers. */
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanCopyFormat, ImageInspection } from "@/lib/image";

type ExportStage = "idle" | "complete" | "error";

const sizeCategory = (bytes: number | null) => bytes === null ? "not-estimated" : bytes < 1_024 ? "under-1KB" : bytes < 100_000 ? "under-100KB" : bytes < 1_000_000 ? "under-1MB" : "1MB-or-more";
const formulaSafe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
const csvCell = (value: string) => {
  const safe = formulaSafe(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "private-preflight-image-metadata-report.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function MetadataCsvReport({ inspection, cleanFormat, jpegQuality, estimatedBytes, cleanCopyOffered }: { inspection: ImageInspection; cleanFormat: CleanCopyFormat; jpegQuality: number; estimatedBytes: number | null; cleanCopyOffered: boolean }) {
  const [stage, setStage] = useState<ExportStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const csv = useMemo(() => {
    const detected = (value: boolean) => value ? "detected" : "not-detected";
    const removed = (value: boolean) => value && cleanCopyOffered ? "removed-in-clean-copy" : value ? "not-offered" : "not-applicable";
    const rows = [
      ["source", "format", inspection.format, "not-applicable"],
      ["source", "mime_type", inspection.mimeType, "not-applicable"],
      ["source", "dimensions", `${inspection.width}x${inspection.height}`, "not-applicable"],
      ["source", "megapixels", String(inspection.megapixels), "not-applicable"],
      ["source", "file_size_category", sizeCategory(inspection.fileSize), "not-applicable"],
      ["metadata", "exif", inspection.metadataState === "available" ? "detected" : inspection.metadataState === "unreadable" ? "present-unreadable" : "not-detected", cleanCopyOffered ? "removed-in-clean-copy" : "not-offered"],
      ["metadata", "location_signal", detected(inspection.exif.hasLocationMetadata), removed(inspection.exif.hasLocationMetadata)],
      ["metadata", "icc_profile", detected(inspection.ancillaryMetadata.hasIccProfile), removed(inspection.ancillaryMetadata.hasIccProfile)],
      ["metadata", "text_comments", detected(inspection.ancillaryMetadata.hasTextComments), removed(inspection.ancillaryMetadata.hasTextComments)],
      ["metadata", "xmp_packet", detected(inspection.ancillaryMetadata.hasXmp), removed(inspection.ancillaryMetadata.hasXmp)],
      ["clean_copy", "offered", cleanCopyOffered ? "yes" : "no", "not-applicable"],
      ["clean_copy", "selected_format", cleanFormat, "not-applicable"],
      ["clean_copy", "jpeg_quality", cleanFormat === "jpeg" ? String(jpegQuality) : "not-applicable", "not-applicable"],
      ["clean_copy", "estimated_size_category", sizeCategory(estimatedBytes), "not-applicable"],
      ["privacy", "report_excludes", "source-name;image-bytes;raw-exif;xmp-content;camera-values;capture-time;coordinates;user-identifiers", "not-applicable"],
    ];
    return [["section", "field", "value", "clean_copy_effect"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  }, [cleanCopyOffered, cleanFormat, estimatedBytes, inspection, jpegQuality]);
  const exportCsv = () => {
    setStage("idle");
    setError(null);
    try { downloadCsv(csv); setStage("complete"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The browser could not download the local CSV report."); setStage("error"); }
  };
  return <section className="image-csv-report" aria-labelledby="csv-report-title"><div><span className="eyebrow"><span>RECORD / 08</span> Spreadsheet evidence export</span><h3 id="csv-report-title">Download metadata signals as CSV.</h3><p>Spreadsheet-ready rows include safe file facts, presence signals, clean-copy effects, and settings. Names, pixels, raw metadata values, and coordinates are excluded.</p>{stage === "complete" && <p className="image-csv-report__success"><Check aria-hidden="true" /> Local CSV report downloaded.</p>}{error && <p className="image-csv-report__error"><AlertTriangle aria-hidden="true" /> {error}</p>}</div><Button variant="outline" onClick={exportCsv}><FileSpreadsheet aria-hidden="true" /> Download CSV report <Download aria-hidden="true" /></Button></section>;
}
