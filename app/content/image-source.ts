import { safeImageSource } from "./rich-text";

type ImageReference = { src?: string; mediaId?: string };

/** Managed media uses its resolved URL, never an unrelated stored fallback. */
export function resolveImageSource(reference: ImageReference | null | undefined, mediaUrls: Readonly<Record<string, string>> = {}, resolvedMediaUrl?: string): string | null {
  if (!reference) return null;
  if (reference.mediaId) return safeImageSource(resolvedMediaUrl ?? mediaUrls[reference.mediaId] ?? "", { allowBlob: true });
  return safeImageSource(reference.src ?? "");
}
