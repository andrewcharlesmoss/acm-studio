import type { ContentBlock } from "../content/model";

type ReplaceableImageBlock = Extract<ContentBlock, { type: "image" | "cover" }>;

/** The source is captured when the picker opens; unrelated edits may continue. */
export type ImageReplacementTarget = { type: "image" | "cover"; id: string; src: string; mediaId?: string };
export type ImageReplacementAsset = { id: string; name: string; altText?: string; caption?: string };

export function imageReplacementTarget(block: ContentBlock | null | undefined): ImageReplacementTarget | null {
  return block?.type === "image" || block?.type === "cover" ? { type: block.type, id: block.id, src: block.src, mediaId: block.mediaId } : null;
}

/** Return null for a stale target; an unchanged block represents a no-op. */
export function replaceImageMedia(block: ContentBlock | null | undefined, target: ImageReplacementTarget, asset: ImageReplacementAsset, altText?: string): ReplaceableImageBlock | null {
  if ((block?.type !== "image" && block?.type !== "cover") || block.type !== target.type || block.id !== target.id || block.src !== target.src || block.mediaId !== target.mediaId) return null;
  const alt = altText === undefined ? asset.altText || asset.name.replace(/\.[^.]+$/, "") : altText.trim();
  const caption = asset.caption?.trim() ? asset.caption : undefined;
  const next: ReplaceableImageBlock = { ...block, src: "", mediaId: asset.id, alt,
    ...(block.type === "image" && caption !== undefined ? { caption, captionRuns: undefined } : {}) };
  if (block.mediaId !== asset.id || block.src !== "") {
    delete next.imageResolution;
    delete next.imageEdit;
  }
  return JSON.stringify(next) === JSON.stringify(block) ? block : next;
}
