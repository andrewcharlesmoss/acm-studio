export const DESIGN_IMPORT_MAX_BYTES = 8_000_000;
export const DESIGN_IMAGE_MAX_BYTES = 4_000_000;
export const DESIGN_IMAGE_MAX_DIMENSION = 8_192;
export const DESIGN_IMAGE_MAX_PIXELS = 16_777_216;
export const DESIGN_IMPORT_MAX_PIXELS = 33_554_432;
export const DESIGN_IMPORT_MAX_PAGES = 100;
export const DESIGN_IMPORT_MAX_ASSETS = 100;
export const DESIGN_IMPORT_MAX_OBJECTS = 5_000;

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** @returns {never} */
function fail() {
  throw new Error("This design contains an image or collection that exceeds Studio's import limits.");
}

function dimensionsFromBytes(bytes, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png" && bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "image/gif" && bytes.length >= 10 && bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (type === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      }
      offset += length;
    }
    return null;
  }
  if (type === "image/webp" && bytes.length >= 25 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    const chunk = String.fromCharCode(...bytes.subarray(12, 16));
    if (chunk === "VP8X" && bytes.length >= 30) return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[21], b2 = bytes[22], b3 = bytes[23], b4 = bytes[24];
      return { width: 1 + b1 + ((b2 & 0x3f) << 8), height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) };
    }
  }
  return null;
}

export function inspectDesignImageBytes(value, type) {
  if (!imageTypes.has(type) || !(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > DESIGN_IMAGE_MAX_BYTES) fail();
  const dimensions = dimensionsFromBytes(value, type);
  if (!dimensions || !Number.isSafeInteger(dimensions.width) || !Number.isSafeInteger(dimensions.height) || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > DESIGN_IMAGE_MAX_DIMENSION || dimensions.height > DESIGN_IMAGE_MAX_DIMENSION || dimensions.width * dimensions.height > DESIGN_IMAGE_MAX_PIXELS) fail();
  return dimensions;
}

export async function inspectDesignImageBlob(blob, fallbackType = "image/png") {
  if (!blob || !Number.isSafeInteger(blob.size) || blob.size < 1 || blob.size > DESIGN_IMAGE_MAX_BYTES) fail();
  const type = blob.type || fallbackType;
  return inspectDesignImageBytes(new Uint8Array(await blob.arrayBuffer()), type);
}

export function validateDesignImportResources(value) {
  if (!value || typeof value !== "object") return;
  const { pages, assets } = value;
  if (!Array.isArray(pages) || pages.length > DESIGN_IMPORT_MAX_PAGES || !Array.isArray(assets) || assets.length > DESIGN_IMPORT_MAX_ASSETS) fail();
  let objectCount = 0;
  for (const page of pages) {
    if (!page || typeof page !== "object" || !Array.isArray(page.objects)) fail();
    objectCount += page.objects.length;
    if (objectCount > DESIGN_IMPORT_MAX_OBJECTS) fail();
  }
  let totalImageBytes = 0;
  let totalPixels = 0;
  for (const asset of assets) {
    if (!asset || typeof asset !== "object" || typeof asset.type !== "string" || typeof asset.dataUrl !== "string") fail();
    const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(asset.dataUrl);
    if (!match || match[1] !== asset.type) fail();
    const encoded = match[2].replace(/\s/g, "");
    const bytes = encoded.length / 4 * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
    totalImageBytes += bytes;
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > DESIGN_IMAGE_MAX_BYTES || totalImageBytes > DESIGN_IMPORT_MAX_BYTES) fail();
    let decoded;
    try { decoded = Uint8Array.from(atob(encoded), character => character.charCodeAt(0)); } catch { fail(); }
    const dimensions = inspectDesignImageBytes(decoded, asset.type);
    if (asset.width !== dimensions.width || asset.height !== dimensions.height) fail();
    totalPixels += dimensions.width * dimensions.height;
    if (totalPixels > DESIGN_IMPORT_MAX_PIXELS) fail();
  }
}

export function validateDesignImportFileSize(size) {
  if (!Number.isSafeInteger(size) || size < 1 || size > DESIGN_IMPORT_MAX_BYTES) {
    throw new Error("Design files must be 8 MB or smaller.");
  }
}
