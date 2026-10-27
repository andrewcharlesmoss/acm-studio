import type { ContentBlock } from "../content/model";

type ImageBlock = Extract<ContentBlock, { type: "image" }>;

/** The source is captured when the picker opens; unrelated edits may continue. */
export type ImageReplacementTarget = { id: string; src: string; mediaId?: string };
export type ImageReplacementAsset = { id: string; name: string; altText?: string; caption?: string };

export function imageReplacementTarget(block: ContentBlock | null | undefined): ImageReplacementTarget | null {
  return block?.type === "image" ? { id: block.id, src: block.src, mediaId: block.mediaId } : null;
}

/** Return null for a stale target; an unchanged block represents a no-op. */
export function replaceImageMedia(block: ContentBlock | null | undefined, target: ImageReplacementTarget, asset: ImageReplacementAsset, altText?: string): ImageBlock | null {
  if (block?.type !== "image" || block.id !== target.id || block.src !== target.src || block.mediaId !== target.mediaId) return null;
  const alt = altText === undefined ? asset.altText || asset.name.replace(/\.[^.]+$/, "") : altText.trim();
  const caption = asset.caption?.trim() ? asset.caption : undefined;
  const next: ImageBlock = { ...block, src: "", mediaId: asset.id, alt,
    ...(caption === undefined ? {} : { caption, captionRuns: undefined }) };
  if (block.mediaId !== asset.id || block.src !== "") delete next.imageResolution;
  return JSON.stringify(next) === JSON.stringify(block) ? block : next;
}
