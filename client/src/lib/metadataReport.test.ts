import { describe, expect, it } from "vitest";
import { createCombinedBatchCsv, createMetadataCsv, createMetadataJson } from "./metadataReport";
import { ImageInspection } from "./image";

const inspection: ImageInspection = {
  fileName: "should-not-export.jpg", fileSize: 2048, mimeType: "image/jpeg", format: "jpeg", width: 40, height: 20, megapixels: 0, aspectRatio: "2:1", metadataState: "available",
  exif: { make: "Canon", model: "ModelX", capturedAt: "2026:08:14 12:00:00", hasLocationMetadata: true }, ancillaryMetadata: { hasIccProfile: true, hasTextComments: true, hasXmp: true },
};
const options = { cleanFormat: "jpeg" as const, jpegQuality: 90, estimatedBytes: 500, cleanCopyOffered: true };

describe("local metadata reports", () => {
  it("limits CSV rows to explicitly selected safe fields", () => {
    const csv = createMetadataCsv(inspection, options, ["format", "mime_type", "exif"]);
    expect(csv.split("\r\n")).toEqual(["section,field,value,clean_copy_effect", "source,format,jpeg,not-applicable", "source,mime_type,image/jpeg,not-applicable", "metadata,exif,detected,removed-in-clean-copy"]);
    expect(csv).not.toContain("should-not-export");
    expect(csv).not.toContain("Canon");
  });

  it("keeps JSON evidence privacy-safe", () => {
    const report = createMetadataJson(inspection, options);
    expect(report).toContain('"uploaded": false');
    expect(report).toContain('"iccProfile": "detected"');
    expect(report).not.toContain("should-not-export");
    expect(report).not.toContain("Canon");
    expect(report).not.toContain("2026:08:14");
  });

  it("creates a field-filtered combined CSV with ordinal IDs and no private source values", () => {
    const csv = createCombinedBatchCsv([
      { itemId: "image-01", inspection, options },
      { itemId: "image-02", inspection: { ...inspection, format: "png", mimeType: "image/png" }, options: { ...options, cleanFormat: "png" } },
    ], ["format", "selected_format"]);
    expect(csv.split("\r\n")).toEqual([
      "item_id,section,field,value,clean_copy_effect",
      "image-01,source,format,jpeg,not-applicable",
      "image-01,clean_copy,selected_format,jpeg,not-applicable",
      "image-02,source,format,png,not-applicable",
      "image-02,clean_copy,selected_format,png,not-applicable",
    ]);
    expect(csv).not.toContain("should-not-export");
    expect(csv).not.toContain("Canon");
    expect(csv).not.toContain("2026:08:14");
  });

  it("reports JPEG quality per batch item and marks PNG quality as not applicable", () => {
    const csv = createCombinedBatchCsv([
      { itemId: "image-01", inspection, options: { ...options, jpegQuality: 61 } },
      { itemId: "image-02", inspection: { ...inspection, format: "png", mimeType: "image/png" }, options: { ...options, cleanFormat: "png", jpegQuality: 78 } },
    ], ["selected_format", "jpeg_quality"]);
    expect(csv.split("\r\n")).toEqual([
      "item_id,section,field,value,clean_copy_effect",
      "image-01,clean_copy,selected_format,jpeg,not-applicable",
      "image-01,clean_copy,jpeg_quality,61,not-applicable",
      "image-02,clean_copy,selected_format,png,not-applicable",
      "image-02,clean_copy,jpeg_quality,not-applicable,not-applicable",
    ]);
  });

  it("records privacy-safe output dimensions for a locally resized copy", () => {
    const csv = createMetadataCsv(inspection, { ...options, resizeOptions: { maxWidth: 20, maxHeight: 20 } }, ["output_dimensions"]);
    expect(csv.split("\r\n")).toEqual(["section,field,value,clean_copy_effect", "clean_copy,output_dimensions,20x10,resized-locally"]);
    const report = createMetadataJson(inspection, { ...options, resizeOptions: { maxWidth: 20, maxHeight: 20 } });
    expect(report).toContain('"outputDimensions": {');
    expect(report).toContain('"width": 20');
    expect(report).not.toContain("should-not-export");
  });

  it("records WebP quality without treating it as JPEG quality", () => {
    const csv = createMetadataCsv(inspection, { ...options, cleanFormat: "webp", webpQuality: 72 }, ["selected_format", "jpeg_quality", "webp_quality"]);
    expect(csv.split("\r\n")).toEqual(["section,field,value,clean_copy_effect", "clean_copy,selected_format,webp,not-applicable", "clean_copy,jpeg_quality,not-applicable,not-applicable", "clean_copy,webp_quality,72,not-applicable"]);
    expect(createMetadataJson(inspection, { ...options, cleanFormat: "webp", webpQuality: 72 })).toContain('"webpQuality": 72');
  });

  it("records anonymous output naming and orientation normalization without exporting the source name", () => {
    const orientedInspection = { ...inspection, exif: { ...inspection.exif, orientation: 6 } };
    const csv = createMetadataCsv(orientedInspection, { ...options, anonymizeOutputName: true }, ["output_name", "orientation_correction"]);
    expect(csv.split("\r\n")).toEqual(["section,field,value,clean_copy_effect", "clean_copy,output_name,anonymous,source-name-not-exported", "clean_copy,orientation_correction,normalized-locally,source-orientation-not-exported"]);
    const report = createMetadataJson(orientedInspection, { ...options, anonymizeOutputName: true });
    expect(report).toContain('"outputName": "anonymous"');
    expect(report).toContain('"orientationCorrection": "normalized-locally"');
    expect(report).not.toContain("should-not-export");
  });
});
