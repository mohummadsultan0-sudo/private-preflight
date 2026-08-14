/** Deterministic verification for the browser-only image metadata parser. */
import { describe, expect, it } from "vitest";
import { canCreateCleanCopy, cleanCopyFileName, extractExif, parseTiffExif, supportedImageType } from "./image";

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
    expect(canCreateCleanCopy("gif", "available")).toBe(false);
    expect(cleanCopyFileName("holiday.photo.JPG")).toBe("holiday.photo-clean.png");
  });
});
