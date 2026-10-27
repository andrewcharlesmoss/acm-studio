import { validImageDigest, type ImageRenditions } from "../content/image-resolution";
import { generateImageRenditions, imageContentDigest, RENDITION_SOURCE_BYTE_LIMIT } from "./image-rendition-generation";
import { captureImageRenditions, RENDITION_BUNDLE_LIMIT, validateImageRenditions } from "./image-rendition-validation";

/** A source snapshot belongs to the saving owner, not to the requesting tab. */
export type RenditionSource = { id: string; blob: Blob; sourceRevision?: string; imageRenditions?: ImageRenditions };
export type PreparedRenditions =
  | { status: "original-only"; assetId: string; sourceRevision?: string }
  | { status: "existing"; assetId: string; sourceRevision?: string; sourceDigest: string }
  | { status: "prepared"; assetId: string; sourceRevision?: string; sourceDigest: string; imageRenditions: ImageRenditions };

export class RenditionPreparationError extends Error {
  constructor(message: string, readonly code: "invalid" | "conflict" | "unavailable") { super(message); }
}

/** Prepare bytes without mutating storage; the owner must recheck its source and authority before committing. */
export async function prepareImageRenditions(source: RenditionSource, expectedDigest: string): Promise<PreparedRenditions> {
  if (!source || typeof source.id !== "string" || !source.id || source.id.length > 180 || !(source.blob instanceof Blob) || !validImageDigest(expectedDigest) || (source.sourceRevision !== undefined && (typeof source.sourceRevision !== "string" || !source.sourceRevision || source.sourceRevision.length > 180))) {
    throw new RenditionPreparationError("The image size request is invalid.", "invalid");
  }
  // Capture metadata before the first await. Blob bytes are immutable; the
  // source revision is checked again in the owner's committing transaction.
  const assetId = source.id;
  const sourceRevision = source.sourceRevision;
  const blob = source.blob;
  const existing = source.imageRenditions === undefined ? undefined : captureImageRenditions(source.imageRenditions);
  if (!blob.size || blob.size > RENDITION_SOURCE_BYTE_LIMIT) return { status: "original-only", assetId, sourceRevision };

  const sourceDigest = await imageContentDigest(blob);
  if (sourceDigest !== expectedDigest) throw new RenditionPreparationError("The image file changed. Choose it again before generating sizes.", "conflict");
  if (existing?.bundles.some(bundle => bundle.sourceDigest === sourceDigest)) {
    await validateImageRenditions(existing);
    return { status: "existing", assetId, sourceRevision, sourceDigest };
  }
  if ((existing?.bundles.length ?? 0) >= RENDITION_BUNDLE_LIMIT) {
    throw new RenditionPreparationError("This image has reached its saved size limit. Existing sizes were kept.", "unavailable");
  }
  const bundle = await generateImageRenditions(blob);
  if (!bundle) return { status: "original-only", assetId, sourceRevision };
  if (bundle.sourceDigest !== sourceDigest) throw new RenditionPreparationError("The image file changed while sizes were prepared.", "conflict");
  const imageRenditions = await validateImageRenditions({ version: 1, bundles: [...(existing?.bundles ?? []), bundle] });
  return { status: "prepared", assetId, sourceRevision, sourceDigest, imageRenditions };
}
