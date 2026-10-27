import type { ImageRenditions } from "../content/image-resolution";
import { captureImageRenditions } from "./image-rendition-validation";
import { captureSerializedImageRenditions, deserializeImageRenditions, serializeImageRenditions, type SerializedImageRenditions } from "./image-rendition-serialization";

/** The caller reserves original files and envelope metadata before supplying the remaining budget. */
export async function serializeRenditionCollection(input: ReadonlyArray<ImageRenditions | undefined>, encodedBudget: number): Promise<Array<SerializedImageRenditions | undefined>> {
  if (!Number.isSafeInteger(encodedBudget) || encodedBudget < 0) throw new Error("Invalid image export limit.");
  const captured: Array<ImageRenditions | undefined> = [];
  let needed = 0;
  for (const value of input) {
    const item = value === undefined ? undefined : captureImageRenditions(value);
    for (const bundle of item?.bundles ?? []) for (const variant of bundle.variants) {
      needed += 4 * Math.ceil(variant.size / 3);
      if (needed > encodedBudget) throw new Error("Image sizes exceed the export limit.");
    }
    captured.push(item);
  }
  const output: Array<SerializedImageRenditions | undefined> = [];
  // Decode/encode one asset at a time to bound transient pixel allocations.
  for (const value of captured) output.push(value ? await serializeImageRenditions(value, encodedBudget) : undefined);
  return output;
}

/** The caller reserves original files; sizes are bounded before any binary allocation or decode. */
export async function deserializeRenditionCollection(input: ReadonlyArray<unknown | undefined>, decodedBudget: number): Promise<Array<ImageRenditions | undefined>> {
  if (!Number.isSafeInteger(decodedBudget) || decodedBudget < 0) throw new Error("Invalid image import limit.");
  const captured: Array<SerializedImageRenditions | undefined> = [];
  let needed = 0;
  for (const value of input) {
    const item = value === undefined ? undefined : captureSerializedImageRenditions(value);
    for (const bundle of item?.bundles ?? []) for (const variant of bundle.variants) {
      needed += variant.size;
      if (needed > decodedBudget) throw new Error("Backed-up image sizes exceed the import limit.");
    }
    captured.push(item);
  }
  const output: Array<ImageRenditions | undefined> = [];
  for (const value of captured) output.push(value ? await deserializeImageRenditions(value) : undefined);
  return output;
}
