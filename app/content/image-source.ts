import { safeImageSource } from "./rich-text";
import { imageRenditionResourceKey, validImageResolution, type ImageResolution, type ImageRenditionUrls } from "./image-resolution";

type ImageReference = { src?: string; mediaId?: string };

const SAFE_MANAGED_IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif",
  "image/bmp", "image/tiff", "image/x-icon", "image/vnd.microsoft.icon",
]);

/** Only passive raster media receives an object URL for use as an image. */
export function isSafeManagedImageType(type: string): boolean {
  return typeof type === "string" && SAFE_MANAGED_IMAGE_TYPES.has(type.toLowerCase());
}

/** Avoid exposing active or unsupported media as navigable Blob documents. */
export function createManagedImageUrl(blob: Blob): string | null {
  return isSafeManagedImageType(blob.type) ? URL.createObjectURL(blob) : null;
}

/** Managed media uses its resolved URL, never an unrelated stored fallback. */
export function resolveImageSource(reference: ImageReference | null | undefined, mediaUrls: Readonly<Record<string, string>> = {}, resolvedMediaUrl?: string): string | null {
  if (!reference) return null;
  if (reference.mediaId) return safeImageSource(resolvedMediaUrl ?? mediaUrls[reference.mediaId] ?? "", { allowBlob: true });
  const source = reference.src ?? "";
  return mediaUrls[source] ? safeImageSource(mediaUrls[source], { allowBlob: true }) : safeImageSource(source);
}

/** A selected size is an exact resource; a missing size must not use the original. */
export function resolveBlockImageSource(reference: ImageReference & { imageResolution?: ImageResolution }, mediaUrls: Readonly<Record<string, string>> = {}, renditionUrls: ImageRenditionUrls = {}): string | null {
  if (reference.imageResolution !== undefined) {
    if (!reference.mediaId || !validImageResolution(reference.imageResolution)) return null;
    const key = imageRenditionResourceKey(reference.mediaId, reference.imageResolution);
    const candidate = Object.hasOwn(renditionUrls, key) ? renditionUrls[key] : undefined;
    return typeof candidate === "string" ? safeImageSource(candidate, { allowBlob: true }) : null;
  }
  return reference.mediaId ? safeImageSource(mediaUrls[reference.mediaId] ?? "", { allowBlob: true }) : safeImageSource(reference.src ?? "");
}
