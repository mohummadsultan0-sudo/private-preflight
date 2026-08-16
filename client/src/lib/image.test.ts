/** Deterministic verification for the browser-only image metadata parser. */
import { describe, expect, it } from "vitest";
import { canCreateCleanCopy, clampJpegQuality, CLEAN_JPEG_QUALITY, cleanCopyFileExtension, cleanCopyFileName, extractExif, JPEG_QUALITY_MAX, JPEG_QUALITY_MIN, needsOrientationCorrection, orientationCorrectedDimensions, outputDimensionsForResize, parseTiffExif, readAncillaryMetadata, supportedImageType } from "./image";

function withExifTiff(): Uint8Array {
  const bytes = new Uint8Array(50);
  bytes.set([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00], 0);
  bytes.set([0x02, 0x00], 8);
  bytes.set([0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00], 10);
  bytes.set([0x0f, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00], 22);
  bytes.set([0x00, 0x00, 0x00, 0x00], 34);
  bytes.set([0x43, 0x61, 0x6e, 0x6f, 0x6e, 0x00], 38);
  return bytes;
}

function jpegWithAncillarySegments(): Uint8Array {
  const xmp = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe2, 0x00, 0x0e, 0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00,
    0xff, 0xfe, 0x00, 0x04, 0x6e, 0x6f,
    0xff, 0xe1, 0x00, xmp.length + 2, ...xmp,
    0xff, 0xd9,
  ]);
}

describe("local image metadata", () => {
  it("recognizes supported mime types and extensions", () => {
    expect(supportedImageType({ name: "photo.JPG", type: "" } as File)).toBe("jpeg");
    expect(supportedImageType({ name: "art.png", type: "image/png" } as File)).toBe("png");
    expect(supportedImageType({ name: "document.pdf", type: "application/pdf" } as File)).toBeNull();
  });

  it("reads safe EXIF fields from a TIFF payload", () => {
    expect(parseTiffExif(withExifTiff())).toMatchObject({ orientation: 6, make: "Canon", hasLocationMetadata: false });
  });

  it("reports the absence of EXIF rather than treating it as an error", () => {
    const result = extractExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), "jpeg");
    expect(result.state).toBe("none");
    expect(result.exif.hasLocationMetadata).toBe(false);
  });

  it("only offers a clean copy when a non-GIF image has metadata to remove", () => {
    expect(canCreateCleanCopy("jpeg", "available")).toBe(true);
    expect(canCreateCleanCopy("webp", "unreadable")).toBe(true);
    expect(canCreateCleanCopy("png", "none")).toBe(false);
    expect(canCreateCleanCopy("jpeg", "none", { hasIccProfile: true, hasTextComments: false, hasXmp: false })).toBe(true);
    expect(canCreateCleanCopy("png", "none", { hasIccProfile: false, hasTextComments: true, hasXmp: false })).toBe(true);
    expect(canCreateCleanCopy("gif", "available")).toBe(false);
    expect(canCreateCleanCopy("gif", "none", { hasIccProfile: true, hasTextComments: true, hasXmp: true })).toBe(false);
    expect(cleanCopyFileName("holiday.photo.JPG")).toBe("holiday.photo-clean.png");
    expect(cleanCopyFileName("holiday.photo.JPG", "jpeg")).toBe("holiday.photo-clean.jpg");
    expect(cleanCopyFileName("holiday.photo.JPG", "webp")).toBe("holiday.photo-clean.webp");
    expect(cleanCopyFileName("holiday.photo.JPG", "jpeg", true)).toBe("private-preflight-image-clean.jpg");
    expect(cleanCopyFileName("holiday.photo.JPG", "webp", true)).toBe("private-preflight-image-clean.webp");
    expect(cleanCopyFileExtension("webp")).toBe("webp");
    expect(CLEAN_JPEG_QUALITY).toBe(0.9);
  });

  it("bounds JPEG quality and detects ancillary ICC and comment segments", () => {
    expect(clampJpegQuality(1)).toBe(JPEG_QUALITY_MIN);
    expect(clampJpegQuality(100)).toBe(JPEG_QUALITY_MAX);
    expect(clampJpegQuality(82.6)).toBe(83);
    expect(readAncillaryMetadata(jpegWithAncillarySegments(), "jpeg")).toEqual({ hasIccProfile: true, hasTextComments: true, hasXmp: true });
  });

  it("preserves aspect ratio and never upscales when calculating a local resize", () => {
    expect(outputDimensionsForResize(4000, 3000, { maxWidth: 2000, maxHeight: 2000 })).toEqual({ width: 2000, height: 1500, resized: true });
    expect(outputDimensionsForResize(3000, 4000, { maxWidth: 1280, maxHeight: 1280 })).toEqual({ width: 960, height: 1280, resized: true });
    expect(outputDimensionsForResize(800, 600, { maxWidth: 1280, maxHeight: 1280 })).toEqual({ width: 800, height: 600, resized: false });
    expect(outputDimensionsForResize(800, 600, { maxWidth: 640, maxHeight: 640, exact: true })).toEqual({ width: 640, height: 640, resized: true });
    expect(outputDimensionsForResize(800, 600, null)).toEqual({ width: 800, height: 600, resized: false });
  });

  it("identifies and normalizes EXIF orientations that change visible pixels", () => {
    expect(needsOrientationCorrection(1)).toBe(false);
    expect(needsOrientationCorrection(6)).toBe(true);
    expect(orientationCorrectedDimensions(4000, 3000, 6)).toEqual({ width: 3000, height: 4000 });
    expect(orientationCorrectedDimensions(4000, 3000, 3)).toEqual({ width: 4000, height: 3000 });
  });
});
