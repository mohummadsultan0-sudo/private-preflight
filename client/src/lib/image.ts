/** Audit Ledger image inspector: image bytes and EXIF are read only in the active browser tab; no image content leaves the device. */

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type SupportedImageType = "jpeg" | "png" | "webp" | "gif";
export type ImageMetadataState = "available" | "none" | "unreadable";

export interface ImageExif {
  orientation?: number;
  make?: string;
  model?: string;
  capturedAt?: string;
  hasLocationMetadata: boolean;
}

export interface ImageInspection {
  fileName: string;
  fileSize: number;
  mimeType: string;
  format: SupportedImageType;
  width: number;
  height: number;
  megapixels: number;
  aspectRatio: string;
  metadataState: ImageMetadataState;
  metadataNotice?: string;
  exif: ImageExif;
}

export class ImageInspectionError extends Error {
  constructor(
    public readonly code: "unsupported_type" | "empty_file" | "file_too_large" | "decode_failed" | "read_failed",
    message: string,
  ) {
    super(message);
    this.name = "ImageInspectionError";
  }
}

const MIME_TO_TYPE: Record<string, SupportedImageType> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXTENSION_TO_TYPE: Record<string, SupportedImageType> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  gif: "gif",
};

const EXIF_TAGS = {
  orientation: 0x0112,
  make: 0x010f,
  model: 0x0110,
  dateTime: 0x0132,
  exifIfd: 0x8769,
  gpsIfd: 0x8825,
  dateTimeOriginal: 0x9003,
} as const;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  if (start < 0 || length < 0 || start + length > bytes.length) return "";
  return String.fromCharCode(...Array.from(bytes.slice(start, start + length))).replace(/\0+$/, "").trim();
}

function readUint16(view: DataView, offset: number, littleEndian: boolean): number | undefined {
  return offset >= 0 && offset + 2 <= view.byteLength ? view.getUint16(offset, littleEndian) : undefined;
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number | undefined {
  return offset >= 0 && offset + 4 <= view.byteLength ? view.getUint32(offset, littleEndian) : undefined;
}

function tiffValue(view: DataView, bytes: Uint8Array, tiffStart: number, type: number, count: number, valueOffset: number, littleEndian: boolean): string | number | undefined {
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4 };
  const length = typeSize[type] ? typeSize[type] * count : 0;
  if (!length) return undefined;
  const dataStart = length <= 4 ? valueOffset : tiffStart + (readUint32(view, valueOffset, littleEndian) ?? -1);
  if (dataStart < 0 || dataStart + length > bytes.length) return undefined;
  if (type === 2) return ascii(bytes, dataStart, count);
  if (type === 3) return readUint16(view, dataStart, littleEndian);
  if (type === 4) return readUint32(view, dataStart, littleEndian);
  return undefined;
}

function parseIfd(view: DataView, bytes: Uint8Array, tiffStart: number, relativeOffset: number, littleEndian: boolean): Map<number, string | number> {
  const values = new Map<number, string | number>();
  const ifdStart = tiffStart + relativeOffset;
  const entryCount = readUint16(view, ifdStart, littleEndian);
  if (entryCount === undefined || entryCount > 256) return values;
  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    const tag = readUint16(view, entry, littleEndian);
    const type = readUint16(view, entry + 2, littleEndian);
    const count = readUint32(view, entry + 4, littleEndian);
    if (tag === undefined || type === undefined || count === undefined) continue;
    const value = tiffValue(view, bytes, tiffStart, type, count, entry + 8, littleEndian);
    if (value !== undefined) values.set(tag, value);
  }
  return values;
}

export function parseTiffExif(bytes: Uint8Array, tiffStart = 0): ImageExif | null {
  if (tiffStart + 8 > bytes.length) return null;
  const byteOrder = ascii(bytes, tiffStart, 2);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readUint16(view, tiffStart + 2, littleEndian) !== 42) return null;
  const ifd0Offset = readUint32(view, tiffStart + 4, littleEndian);
  if (ifd0Offset === undefined) return null;
  const ifd0 = parseIfd(view, bytes, tiffStart, ifd0Offset, littleEndian);
  const exifIfdOffset = ifd0.get(EXIF_TAGS.exifIfd);
  const exifIfd = typeof exifIfdOffset === "number" ? parseIfd(view, bytes, tiffStart, exifIfdOffset, littleEndian) : new Map<number, string | number>();
  const value = (tag: number) => ifd0.get(tag) ?? exifIfd.get(tag);
  const orientation = value(EXIF_TAGS.orientation);
  const make = value(EXIF_TAGS.make);
  const model = value(EXIF_TAGS.model);
  const capturedAt = exifIfd.get(EXIF_TAGS.dateTimeOriginal) ?? ifd0.get(EXIF_TAGS.dateTime);
  const gpsOffset = ifd0.get(EXIF_TAGS.gpsIfd);
  return {
    ...(typeof orientation === "number" ? { orientation } : {}),
    ...(typeof make === "string" && make ? { make } : {}),
    ...(typeof model === "string" && model ? { model } : {}),
    ...(typeof capturedAt === "string" && capturedAt ? { capturedAt } : {}),
    hasLocationMetadata: typeof gpsOffset === "number" && gpsOffset > 0,
  };
}

function findJpegExif(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let cursor = 2;
  while (cursor + 4 <= bytes.length) {
    if (bytes[cursor] !== 0xff) break;
    while (bytes[cursor] === 0xff) cursor += 1;
    const marker = bytes[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    const segmentLength = (bytes[cursor] << 8) | bytes[cursor + 1];
    if (segmentLength < 2 || cursor + segmentLength > bytes.length) break;
    const payloadStart = cursor + 2;
    if (marker === 0xe1 && ascii(bytes, payloadStart, 6) === "Exif") return bytes.slice(payloadStart + 6, cursor + segmentLength);
    cursor += segmentLength;
  }
  return null;
}

function findPngExif(bytes: Uint8Array): Uint8Array | null {
  if (ascii(bytes, 1, 3) !== "PNG") return null;
  let cursor = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (cursor + 12 <= bytes.length) {
    const length = view.getUint32(cursor, false);
    const type = ascii(bytes, cursor + 4, 4);
    const dataStart = cursor + 8;
    if (dataStart + length + 4 > bytes.length) break;
    if (type === "eXIf") return bytes.slice(dataStart, dataStart + length);
    cursor = dataStart + length + 4;
  }
  return null;
}

function findWebpExif(bytes: Uint8Array): Uint8Array | null {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 12;
  while (cursor + 8 <= bytes.length) {
    const type = ascii(bytes, cursor, 4);
    const length = view.getUint32(cursor + 4, true);
    const dataStart = cursor + 8;
    if (dataStart + length > bytes.length) break;
    if (type === "EXIF") return bytes.slice(dataStart, dataStart + length);
    cursor = dataStart + length + (length % 2);
  }
  return null;
}

export function extractExif(bytes: Uint8Array, type: SupportedImageType): { exif: ImageExif; state: ImageMetadataState; notice?: string } {
  if (type === "gif") return { exif: { hasLocationMetadata: false }, state: "none", notice: "GIF files do not carry the EXIF fields this tool reads." };
  const raw = type === "jpeg" ? findJpegExif(bytes) : type === "png" ? findPngExif(bytes) : findWebpExif(bytes);
  if (!raw) return { exif: { hasLocationMetadata: false }, state: "none", notice: "No readable EXIF block was found in this image." };
  const exif = parseTiffExif(raw);
  if (!exif) return { exif: { hasLocationMetadata: false }, state: "unreadable", notice: "EXIF metadata is present but could not be read safely." };
  return { exif, state: "available" };
}

export function supportedImageType(file: Pick<File, "name" | "type">): SupportedImageType | null {
  if (file.type && MIME_TO_TYPE[file.type]) return MIME_TO_TYPE[file.type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_TYPE[extension] ?? null;
}

function readableMimeType(file: File, type: SupportedImageType): string {
  if (file.type) return file.type;
  return type === "jpeg" ? "image/jpeg" : `image/${type}`;
}

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Fall through to the broadly supported Image element route.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageInspectionError("decode_failed", "The browser could not decode this image. Choose an intact JPEG, PNG, WebP, or GIF."));
    };
    image.src = url;
  });
}

function aspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export async function inspectImageFile(file: File): Promise<ImageInspection> {
  const type = supportedImageType(file);
  if (!type) throw new ImageInspectionError("unsupported_type", "Choose a JPEG, PNG, WebP, or GIF image for local inspection.");
  if (file.size === 0) throw new ImageInspectionError("empty_file", "This image file is empty. Choose a non-empty image.");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageInspectionError("file_too_large", `This release inspects images up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB locally. Choose a smaller image.`);
  try {
    const [buffer, dimensions] = await Promise.all([file.arrayBuffer(), readDimensions(file)]);
    const metadata = extractExif(new Uint8Array(buffer), type);
    if (!dimensions.width || !dimensions.height) throw new ImageInspectionError("decode_failed", "The browser could not read dimensions from this image.");
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: readableMimeType(file, type),
      format: type,
      width: dimensions.width,
      height: dimensions.height,
      megapixels: Number(((dimensions.width * dimensions.height) / 1_000_000).toFixed(2)),
      aspectRatio: aspectRatio(dimensions.width, dimensions.height),
      metadataState: metadata.state,
      ...(metadata.notice ? { metadataNotice: metadata.notice } : {}),
      exif: metadata.exif,
    };
  } catch (caught) {
    if (caught instanceof ImageInspectionError) throw caught;
    throw new ImageInspectionError("read_failed", "The browser could not inspect this image locally. Try another intact supported image.");
  }
}
