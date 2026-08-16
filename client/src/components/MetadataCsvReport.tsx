/** Audit Ledger style: spreadsheet-ready evidence carries signals, never source content or raw identifiers. */
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanCopyFormat, ImageInspection, ResizeOptions } from "@/lib/image";
import { createMetadataCsv, DEFAULT_CSV_FIELDS, SAFE_CSV_FIELDS, SafeCsvField } from "@/lib/metadataReport";

type ExportStage = "idle" | "complete" | "error";

function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "private-preflight-image-metadata-report.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function MetadataCsvReport({ inspection, cleanFormat, jpegQuality, webpQuality, resizeOptions, estimatedBytes, cleanCopyOffered, anonymizeOutputName = false }: { inspection: ImageInspection; cleanFormat: CleanCopyFormat; jpegQuality: number; webpQuality?: number; resizeOptions?: ResizeOptions | null; estimatedBytes: number | null; cleanCopyOffered: boolean; anonymizeOutputName?: boolean }) {
  const [stage, setStage] = useState<ExportStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<SafeCsvField[]>(DEFAULT_CSV_FIELDS);
  const csv = useMemo(() => createMetadataCsv(inspection, { cleanFormat, jpegQuality, webpQuality, resizeOptions, estimatedBytes, cleanCopyOffered, anonymizeOutputName }, selectedFields), [anonymizeOutputName, cleanCopyOffered, cleanFormat, estimatedBytes, inspection, jpegQuality, resizeOptions, selectedFields, webpQuality]);
  const toggleField = (field: SafeCsvField) => setSelectedFields((current) => current.includes(field) ? current.filter((value) => value !== field) : [...current, field]);
  const exportCsv = () => {
    setStage("idle");
    setError(null);
    try { downloadCsv(csv); setStage("complete"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The browser could not download the local CSV report."); setStage("error"); }
  };
  return <section className="image-csv-report" aria-labelledby="csv-report-title"><div><span className="eyebrow"><span>RECORD / 08</span> Spreadsheet evidence export</span><h3 id="csv-report-title">Download metadata signals as CSV.</h3><p>Choose only the privacy-safe signal fields you need. Names, pixels, raw metadata values, and coordinates are never available for export.</p><details className="csv-field-picker"><summary>Select report fields · {selectedFields.length} chosen</summary><div>{SAFE_CSV_FIELDS.map((field) => <label key={field}><input type="checkbox" checked={selectedFields.includes(field)} onChange={() => toggleField(field)} /> <span>{field.replaceAll("_", " ")}</span></label>)}</div></details>{stage === "complete" && <p className="image-csv-report__success"><Check aria-hidden="true" /> Local CSV report downloaded.</p>}{error && <p className="image-csv-report__error"><AlertTriangle aria-hidden="true" /> {error}</p>}</div><Button variant="outline" disabled={!selectedFields.length} onClick={exportCsv}><FileSpreadsheet aria-hidden="true" /> Download CSV report <Download aria-hidden="true" /></Button></section>;
}
