import { IMAGE_RENDITION_MAXIMUMS, IMAGE_RESOLUTION_KEYS, validImageDigest, type ImageRenditions, type ImageResolutionKey } from "../content/image-resolution";
import { base64ToBlob, blobToBase64 } from "./media-serialization";
import { captureImageRenditions, validateImageRenditions, RENDITION_ASSET_BYTE_LIMIT, RENDITION_BUNDLE_LIMIT } from "./image-rendition-validation";
import { RENDITION_BUNDLE_BYTE_LIMIT, RENDITION_SOURCE_AXIS_LIMIT, RENDITION_SOURCE_PIXEL_LIMIT, RENDITION_VARIANT_BYTE_LIMIT } from "./image-rendition-generation";

type EncodedVariant = { key: ImageResolutionKey; width: number; height: number; type: "image/png"; size: number; digest: string; dataBase64: string };
type EncodedBundle = { sourceDigest: string; width: number; height: number; variants: EncodedVariant[] };
export type SerializedImageRenditions = { version: 1; bundles: EncodedBundle[] };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(",") === expected;
}
function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}
function encodedByteLength(value: string): number {
  return value.length / 4 * 3 - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0);
}

/** Serialize all retained bytes; callers also enforce their envelope's total limit. */
export async function serializeImageRenditions(input: unknown, encodedBudget: number): Promise<SerializedImageRenditions> {
  if (!Number.isSafeInteger(encodedBudget) || encodedBudget < 0) throw new Error("Invalid image export limit.");
  const captured = captureImageRenditions(input);
  const needed = captured.bundles.flatMap(bundle => bundle.variants).reduce((sum, variant) => sum + 4 * Math.ceil(variant.size / 3), 0);
  if (needed > encodedBudget) throw new Error("Image sizes exceed the export limit.");
  await validateImageRenditions(captured);
  const bundles: EncodedBundle[] = [];
  for (const bundle of captured.bundles) {
    const variants: EncodedVariant[] = [];
    for (const variant of bundle.variants) {
      const { blob, ...metadata } = variant;
      variants.push({ ...metadata, dataBase64: await blobToBase64(blob) });
    }
    bundles.push({ sourceDigest: bundle.sourceDigest, width: bundle.width, height: bundle.height, variants });
  }
  return { version: 1, bundles };
}

/** Bound metadata and encoded bytes without allocating binary image data. */
export function captureSerializedImageRenditions(input: unknown): SerializedImageRenditions {
  if (!record(input) || !keys(input, "bundles,version") || input.version !== 1 || !Array.isArray(input.bundles) || input.bundles.length > RENDITION_BUNDLE_LIMIT) throw new Error("Invalid backed-up image sizes.");
  let total = 0;
  const sources = new Set<string>();
  for (const bundle of input.bundles) {
    if (!record(bundle) || !keys(bundle, "height,sourceDigest,variants,width") || !validImageDigest(bundle.sourceDigest) || sources.has(bundle.sourceDigest) || !positiveInteger(bundle.width) || !positiveInteger(bundle.height) || bundle.width > RENDITION_SOURCE_AXIS_LIMIT || bundle.height > RENDITION_SOURCE_AXIS_LIMIT || bundle.width * bundle.height > RENDITION_SOURCE_PIXEL_LIMIT || !Array.isArray(bundle.variants) || bundle.variants.length < 1 || bundle.variants.length > IMAGE_RESOLUTION_KEYS.length) throw new Error("Invalid backed-up image size bundle.");
    sources.add(bundle.sourceDigest);
    let bundleBytes = 0;
    const seen = new Set<ImageResolutionKey>();
    const dimensions = new Set<string>();
    for (const variant of bundle.variants) {
      if (!record(variant) || !keys(variant, "dataBase64,digest,height,key,size,type,width") || !IMAGE_RESOLUTION_KEYS.includes(variant.key as ImageResolutionKey) || seen.has(variant.key as ImageResolutionKey) || !positiveInteger(variant.width) || !positiveInteger(variant.height) || variant.type !== "image/png" || !validImageDigest(variant.digest) || !positiveInteger(variant.size) || variant.size > RENDITION_VARIANT_BYTE_LIMIT || typeof variant.dataBase64 !== "string" || variant.dataBase64.length > 4 * Math.ceil(RENDITION_VARIANT_BYTE_LIMIT / 3) || variant.dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(variant.dataBase64) || encodedByteLength(variant.dataBase64) !== variant.size) throw new Error("Invalid backed-up image size.");
      const key = variant.key as ImageResolutionKey;
      const scale = IMAGE_RENDITION_MAXIMUMS[key] / Math.max(bundle.width, bundle.height);
      const dimensionKey = `${variant.width}x${variant.height}`;
      if (scale >= 1 || variant.width !== Math.max(1, Math.round(bundle.width * scale)) || variant.height !== Math.max(1, Math.round(bundle.height * scale)) || dimensions.has(dimensionKey)) throw new Error("Invalid backed-up image size dimensions.");
      seen.add(key); dimensions.add(dimensionKey);
      bundleBytes += variant.size; total += variant.size;
      if (bundleBytes > RENDITION_BUNDLE_BYTE_LIMIT || total > RENDITION_ASSET_BYTE_LIMIT) throw new Error("Backed-up image sizes exceed the storage limit.");
    }
  }
  return structuredClone(input) as SerializedImageRenditions;
}

/** Bound encoded data before allocating Blobs, then verify bytes and decoded pixels. */
export async function deserializeImageRenditions(input: unknown): Promise<ImageRenditions> {
  const captured = captureSerializedImageRenditions(input);
  const bundles = captured.bundles.map(bundle => ({ ...bundle, variants: bundle.variants.map(({ dataBase64, ...variant }) => ({ ...variant, blob: base64ToBlob(dataBase64, "image/png") })) }));
  return validateImageRenditions({ version: 1, bundles });
}
