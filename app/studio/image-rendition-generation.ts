import { inspectStaticRaster } from "../content/raster-dimensions";
import { IMAGE_RENDITION_MAXIMUMS, IMAGE_RESOLUTION_KEYS, type ImageRendition, type ImageRenditionBundle } from "../content/image-resolution";

// Decode only bounded static raster files. Original uploads keep their existing
// limits and remain usable if rendition generation is unavailable.
export const RENDITION_SOURCE_BYTE_LIMIT = 32 * 1024 * 1024;
export const RENDITION_SOURCE_AXIS_LIMIT = 8192;
export const RENDITION_SOURCE_PIXEL_LIMIT = 16_000_000;
export const RENDITION_BUNDLE_BYTE_LIMIT = 8 * 1024 * 1024;
export const RENDITION_VARIANT_BYTE_LIMIT = 5 * 1024 * 1024;

const SIZES = IMAGE_RESOLUTION_KEYS.map(key => [key, IMAGE_RENDITION_MAXIMUMS[key]] as const);

export async function imageContentDigest(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob && blob.type === "image/png") resolve(blob);
    else reject(new Error("The image size could not be encoded."));
  }, "image/png"));
}

/** Create real image sizes without changing or persisting the original asset. */
export async function generateImageRenditions(blob: Blob): Promise<ImageRenditionBundle | null> {
  if (blob.size === 0 || blob.size > RENDITION_SOURCE_BYTE_LIMIT) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const source = inspectStaticRaster(bytes, blob.type);
  if (!source || source.width > RENDITION_SOURCE_AXIS_LIMIT || source.height > RENDITION_SOURCE_AXIS_LIMIT || source.width * source.height > RENDITION_SOURCE_PIXEL_LIMIT) return null;
  const choices = SIZES.filter(([, maximum]) => Math.max(source.width, source.height) > maximum);
  if (!choices.length) return null;

  const sourceDigest = await imageContentDigest(blob);
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const variants: ImageRendition[] = [];
  let total = 0;
  try {
    // Header and decoder must agree, including EXIF orientation. Never retain
    // an output from an ambiguous source or an unexpected browser decode.
    if (bitmap.width !== source.width || bitmap.height !== source.height) throw new Error("The image dimensions could not be verified.");
    for (const [key, maximum] of choices) {
      const scale = maximum / Math.max(source.width, source.height);
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      if (variants.some(variant => variant.width === width && variant.height === height)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The image size could not be generated.");
        context.drawImage(bitmap, 0, 0, width, height);
        const output = await canvasPng(canvas);
        total += output.size;
        if (!output.size || output.size > RENDITION_VARIANT_BYTE_LIMIT || total > RENDITION_BUNDLE_BYTE_LIMIT) throw new Error("The generated image sizes exceed the storage limit.");
        const dimensions = inspectStaticRaster(new Uint8Array(await output.arrayBuffer()), output.type);
        if (!dimensions || dimensions.width !== width || dimensions.height !== height) throw new Error("The generated image size could not be verified.");
        variants.push({ key, width, height, type: "image/png", size: output.size, digest: await imageContentDigest(output), blob: output });
      } finally {
        canvas.width = 0; canvas.height = 0;
      }
    }
    return variants.length ? { sourceDigest, width: source.width, height: source.height, variants } : null;
  } finally {
    bitmap.close();
  }
}
