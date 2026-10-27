import { IMAGE_RESOLUTION_KEYS, validImageDigest, type ImageRenditions, type ImageResolutionKey } from "../content/image-resolution";
import { base64ToBlob, blobToBase64 } from "./media-serialization";
import { validateImageRenditions, RENDITION_ASSET_BYTE_LIMIT, RENDITION_BUNDLE_LIMIT } from "./image-rendition-validation";
import { RENDITION_VARIANT_BYTE_LIMIT } from "./image-rendition-generation";

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
  const captured = await validateImageRenditions(input);
  const needed = captured.bundles.flatMap(bundle => bundle.variants).reduce((sum, variant) => sum + 4 * Math.ceil(variant.size / 3), 0);
  if (needed > encodedBudget) throw new Error("Image sizes exceed the export limit.");
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

/** Bound encoded data before allocating Blobs, then verify bytes and decoded pixels. */
export async function deserializeImageRenditions(input: unknown): Promise<ImageRenditions> {
  if (!record(input) || !keys(input, "bundles,version") || input.version !== 1 || !Array.isArray(input.bundles) || input.bundles.length > RENDITION_BUNDLE_LIMIT) throw new Error("Invalid backed-up image sizes.");
  let total = 0;
  const bundles: ImageRenditions["bundles"] = [];
  for (const bundle of input.bundles) {
    if (!record(bundle) || !keys(bundle, "height,sourceDigest,variants,width") || !validImageDigest(bundle.sourceDigest) || !positiveInteger(bundle.width) || !positiveInteger(bundle.height) || !Array.isArray(bundle.variants) || bundle.variants.length < 1 || bundle.variants.length > IMAGE_RESOLUTION_KEYS.length) throw new Error("Invalid backed-up image size bundle.");
    const variants: ImageRenditions["bundles"][number]["variants"] = [];
    for (const variant of bundle.variants) {
      if (!record(variant) || !keys(variant, "dataBase64,digest,height,key,size,type,width") || !IMAGE_RESOLUTION_KEYS.includes(variant.key as ImageResolutionKey) || !positiveInteger(variant.width) || !positiveInteger(variant.height) || variant.type !== "image/png" || !validImageDigest(variant.digest) || !positiveInteger(variant.size) || variant.size > RENDITION_VARIANT_BYTE_LIMIT || typeof variant.dataBase64 !== "string" || variant.dataBase64.length > 4 * Math.ceil(RENDITION_VARIANT_BYTE_LIMIT / 3) || variant.dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(variant.dataBase64) || encodedByteLength(variant.dataBase64) !== variant.size) throw new Error("Invalid backed-up image size.");
      total += variant.size;
      if (total > RENDITION_ASSET_BYTE_LIMIT) throw new Error("Backed-up image sizes exceed the storage limit.");
      variants.push({ key: variant.key as ImageResolutionKey, width: variant.width, height: variant.height, type: "image/png", size: variant.size, digest: variant.digest, blob: base64ToBlob(variant.dataBase64, "image/png") });
    }
    bundles.push({ sourceDigest: bundle.sourceDigest, width: bundle.width, height: bundle.height, variants });
  }
  return validateImageRenditions({ version: 1, bundles });
}
