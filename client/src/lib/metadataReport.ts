/** Audit Ledger style: export only stable, privacy-safe signals — never source content, names, raw metadata, or coordinates. */
import { CleanCopyFormat, ImageInspection, needsOrientationCorrection, outputDimensionsForResize, ResizeOptions } from "@/lib/image";

export const SAFE_CSV_FIELDS = ["format", "mime_type", "dimensions", "megapixels", "file_size_category", "exif", "location_signal", "icc_profile", "text_comments", "xmp_packet", "offered", "selected_format", "jpeg_quality", "webp_quality", "output_dimensions", "output_name", "orientation_correction", "estimated_size_category", "report_excludes"] as const;
export type SafeCsvField = (typeof SAFE_CSV_FIELDS)[number];
export const DEFAULT_CSV_FIELDS: SafeCsvField[] = [...SAFE_CSV_FIELDS];

export type ReportOptions = { cleanFormat: CleanCopyFormat; jpegQuality: number; webpQuality?: number; resizeOptions?: ResizeOptions | null; estimatedBytes: number | null; cleanCopyOffered: boolean; anonymizeOutputName?: boolean };

export const sizeCategory = (bytes: number | null) => bytes === null ? "not-estimated" : bytes < 1_024 ? "under-1KB" : bytes < 100_000 ? "under-100KB" : bytes < 1_000_000 ? "under-1MB" : "1MB-or-more";
const formulaSafe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
const csvCell = (value: string) => { const safe = formulaSafe(value); return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; };

export function metadataReportRows(inspection: ImageInspection, options: ReportOptions): string[][] {
  const detected = (value: boolean) => value ? "detected" : "not-detected";
  const removed = (value: boolean) => value && options.cleanCopyOffered ? "removed-in-clean-copy" : value ? "not-offered" : "not-applicable";
  const outputDimensions = outputDimensionsForResize(inspection.width, inspection.height, options.resizeOptions);
  return [
    ["source", "format", inspection.format, "not-applicable"], ["source", "mime_type", inspection.mimeType, "not-applicable"], ["source", "dimensions", `${inspection.width}x${inspection.height}`, "not-applicable"], ["source", "megapixels", String(inspection.megapixels), "not-applicable"], ["source", "file_size_category", sizeCategory(inspection.fileSize), "not-applicable"],
    ["metadata", "exif", inspection.metadataState === "available" ? "detected" : inspection.metadataState === "unreadable" ? "present-unreadable" : "not-detected", options.cleanCopyOffered ? "removed-in-clean-copy" : "not-offered"], ["metadata", "location_signal", detected(inspection.exif.hasLocationMetadata), removed(inspection.exif.hasLocationMetadata)], ["metadata", "icc_profile", detected(inspection.ancillaryMetadata.hasIccProfile), removed(inspection.ancillaryMetadata.hasIccProfile)], ["metadata", "text_comments", detected(inspection.ancillaryMetadata.hasTextComments), removed(inspection.ancillaryMetadata.hasTextComments)], ["metadata", "xmp_packet", detected(inspection.ancillaryMetadata.hasXmp), removed(inspection.ancillaryMetadata.hasXmp)],
    ["clean_copy", "offered", options.cleanCopyOffered ? "yes" : "no", "not-applicable"], ["clean_copy", "selected_format", options.cleanFormat, "not-applicable"], ["clean_copy", "jpeg_quality", options.cleanFormat === "jpeg" ? String(options.jpegQuality) : "not-applicable", "not-applicable"], ["clean_copy", "webp_quality", options.cleanFormat === "webp" ? String(options.webpQuality ?? options.jpegQuality) : "not-applicable", "not-applicable"], ["clean_copy", "output_dimensions", `${outputDimensions.width}x${outputDimensions.height}`, outputDimensions.resized ? "resized-locally" : "original-dimensions"], ["clean_copy", "output_name", options.anonymizeOutputName ? "anonymous" : "derived-from-source-locally", "source-name-not-exported"], ["clean_copy", "orientation_correction", needsOrientationCorrection(inspection.exif.orientation) && options.cleanCopyOffered ? "normalized-locally" : "not-needed", "source-orientation-not-exported"], ["clean_copy", "estimated_size_category", sizeCategory(options.estimatedBytes), "not-applicable"],
    ["privacy", "report_excludes", "source-name;image-bytes;raw-exif;xmp-content;camera-values;capture-time;coordinates;user-identifiers", "not-applicable"],
  ];
}

export function createMetadataCsv(inspection: ImageInspection, options: ReportOptions, selectedFields: readonly SafeCsvField[] = DEFAULT_CSV_FIELDS) {
  const permitted = new Set(selectedFields);
  const rows = metadataReportRows(inspection, options).filter((row) => permitted.has(row[1] as SafeCsvField));
  return [["section", "field", "value", "clean_copy_effect"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function createMetadataJson(inspection: ImageInspection, options: ReportOptions) {
  const outputDimensions = outputDimensionsForResize(inspection.width, inspection.height, options.resizeOptions);
  return JSON.stringify({ schemaVersion: "1.2", processing: { location: "local browser tab", uploaded: false, originalModified: false }, source: { format: inspection.format, mimeType: inspection.mimeType, dimensions: { width: inspection.width, height: inspection.height }, megapixels: inspection.megapixels, fileSizeCategory: sizeCategory(inspection.fileSize) }, metadataSignals: { exif: inspection.metadataState === "available" ? "available" : inspection.metadataState, location: inspection.exif.hasLocationMetadata ? "detected" : "not-detected", iccProfile: inspection.ancillaryMetadata.hasIccProfile ? "detected" : "not-detected", textComments: inspection.ancillaryMetadata.hasTextComments ? "detected" : "not-detected", xmp: inspection.ancillaryMetadata.hasXmp ? "detected" : "not-detected" }, cleanCopy: { offered: options.cleanCopyOffered, selectedFormat: options.cleanFormat, jpegQuality: options.cleanFormat === "jpeg" ? options.jpegQuality : null, webpQuality: options.cleanFormat === "webp" ? options.webpQuality ?? options.jpegQuality : null, resizeOptions: options.resizeOptions ?? null, outputDimensions: { width: outputDimensions.width, height: outputDimensions.height, resized: outputDimensions.resized }, outputName: options.anonymizeOutputName ? "anonymous" : "derived-from-source-locally", orientationCorrection: needsOrientationCorrection(inspection.exif.orientation) ? "normalized-locally" : "not-needed", estimatedSizeCategory: sizeCategory(options.estimatedBytes) }, privacyBoundary: { excludes: ["source filename", "image bytes", "preview URLs", "raw EXIF values", "XMP contents", "camera make or model", "capture time", "coordinates", "user identifiers"] } }, null, 2);
}

export function createCombinedBatchCsv(entries: Array<{ itemId: string; inspection: ImageInspection; options: ReportOptions }>, selectedFields: readonly SafeCsvField[] = DEFAULT_CSV_FIELDS) {
  const permitted = new Set(selectedFields);
  const rows = entries.flatMap(({ itemId, inspection, options }) => metadataReportRows(inspection, options).filter((row) => permitted.has(row[1] as SafeCsvField)).map((row) => [itemId, ...row]));
  return [["item_id", "section", "field", "value", "clean_copy_effect"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
