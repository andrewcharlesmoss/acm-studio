import { IMAGE_RENDITION_MAXIMUMS, IMAGE_RESOLUTION_KEYS, validImageDigest, type ImageRenditions, type ImageResolutionKey } from "../content/image-resolution";
import { inspectStaticRaster } from "../content/raster-dimensions";
import { imageContentDigest, RENDITION_BUNDLE_BYTE_LIMIT, RENDITION_SOURCE_AXIS_LIMIT, RENDITION_SOURCE_PIXEL_LIMIT, RENDITION_VARIANT_BYTE_LIMIT } from "./image-rendition-generation";

export const RENDITION_BUNDLE_LIMIT = 8;
export const RENDITION_ASSET_BYTE_LIMIT = 32 * 1024 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(",") === expected;
}
function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

/** Capture and bound all metadata before reading any rendition bytes. */
export function captureImageRenditions(value: unknown): ImageRenditions {
  if (!record(value) || !keys(value, "bundles,version") || value.version !== 1 || !Array.isArray(value.bundles) || value.bundles.length > RENDITION_BUNDLE_LIMIT) throw new Error("Invalid image sizes.");
  // Check the bounded shape before cloning, then validate and return the same
  // captured data even if the caller changes its objects during async checks.
  for (const bundle of value.bundles) {
    if (!record(bundle) || !keys(bundle, "height,sourceDigest,variants,width") || !validImageDigest(bundle.sourceDigest) || !positiveInteger(bundle.width) || !positiveInteger(bundle.height) || !Array.isArray(bundle.variants) || bundle.variants.length < 1 || bundle.variants.length > IMAGE_RESOLUTION_KEYS.length) throw new Error("Invalid image size bundle.");
    for (const variant of bundle.variants) {
      if (!record(variant) || !keys(variant, "blob,digest,height,key,size,type,width") || !IMAGE_RESOLUTION_KEYS.includes(variant.key as ImageResolutionKey) || !positiveInteger(variant.width) || !positiveInteger(variant.height) || variant.type !== "image/png" || !validImageDigest(variant.digest) || !(variant.blob instanceof Blob) || variant.blob.type !== "image/png" || !positiveInteger(variant.size) || variant.size !== variant.blob.size || variant.size > RENDITION_VARIANT_BYTE_LIMIT) throw new Error("Invalid image size.");
    }
  }
  const captured = structuredClone(value) as ImageRenditions;
  let total = 0;
  const sourceDigests = new Set<string>();
  for (const bundle of captured.bundles) {
    if (!record(bundle) || !keys(bundle, "height,sourceDigest,variants,width") || !validImageDigest(bundle.sourceDigest) || sourceDigests.has(bundle.sourceDigest) || !positiveInteger(bundle.width) || !positiveInteger(bundle.height) || bundle.width > RENDITION_SOURCE_AXIS_LIMIT || bundle.height > RENDITION_SOURCE_AXIS_LIMIT || bundle.width * bundle.height > RENDITION_SOURCE_PIXEL_LIMIT || !Array.isArray(bundle.variants) || bundle.variants.length < 1 || bundle.variants.length > IMAGE_RESOLUTION_KEYS.length) throw new Error("Invalid image size bundle.");
    sourceDigests.add(bundle.sourceDigest);
    const seenKeys = new Set<ImageResolutionKey>();
    const dimensions = new Set<string>();
    let bundleBytes = 0;
    for (const variant of bundle.variants) {
      if (!record(variant) || !keys(variant, "blob,digest,height,key,size,type,width") || !IMAGE_RESOLUTION_KEYS.includes(variant.key as ImageResolutionKey) || seenKeys.has(variant.key as ImageResolutionKey) || !positiveInteger(variant.width) || !positiveInteger(variant.height) || variant.type !== "image/png" || !validImageDigest(variant.digest) || !(variant.blob instanceof Blob) || variant.blob.type !== "image/png" || !positiveInteger(variant.size) || variant.size !== variant.blob.size || variant.size > RENDITION_VARIANT_BYTE_LIMIT) throw new Error("Invalid image size.");
      const key = variant.key as ImageResolutionKey;
      const maximum = IMAGE_RENDITION_MAXIMUMS[key];
      const scale = maximum / Math.max(bundle.width, bundle.height);
      const expectedWidth = Math.max(1, Math.round(bundle.width * scale));
      const expectedHeight = Math.max(1, Math.round(bundle.height * scale));
      const dimensionKey = `${variant.width}x${variant.height}`;
      if (scale >= 1 || variant.width !== expectedWidth || variant.height !== expectedHeight || dimensions.has(dimensionKey)) throw new Error("Invalid image size dimensions.");
      seenKeys.add(key); dimensions.add(dimensionKey);
      bundleBytes += variant.size; total += variant.size;
      if (bundleBytes > RENDITION_BUNDLE_BYTE_LIMIT || total > RENDITION_ASSET_BYTE_LIMIT) throw new Error("Image sizes exceed the storage limit.");
    }
  }
  return captured;
}

/** Validate every retained rendition, including its encoded bytes, before import or storage. */
export async function validateImageRenditions(value: unknown): Promise<ImageRenditions> {
  const captured = captureImageRenditions(value);
  for (const bundle of captured.bundles) for (const variant of bundle.variants) {
    const bytes = new Uint8Array(await variant.blob.arrayBuffer());
    const actual = inspectStaticRaster(bytes, variant.blob.type);
    if (!actual || actual.width !== variant.width || actual.height !== variant.height || await imageContentDigest(variant.blob) !== variant.digest) throw new Error("Image size bytes do not match their metadata.");
    // Digests alone do not prove that a PNG is decodable. Its bounded header
    // has already been checked before the browser allocates the pixel buffer.
    const bitmap = await createImageBitmap(variant.blob);
    try {
      if (bitmap.width !== variant.width || bitmap.height !== variant.height) throw new Error("Image size pixels do not match their metadata.");
    } finally {
      bitmap.close();
    }
  }
  return captured;
}
