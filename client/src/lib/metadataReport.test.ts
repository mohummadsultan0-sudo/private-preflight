import { describe, expect, it } from "vitest";
import { createMetadataCsv, createMetadataJson } from "./metadataReport";
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
});
