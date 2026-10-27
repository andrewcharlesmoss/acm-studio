import { childContentBlocks } from "../content/block-tree";
import { imageRenditionResourceKey, validImageResolution, type ImageRenditions } from "../content/image-resolution";
import type { ContentBlock } from "../content/model";
import { captureImageRenditions } from "./image-rendition-validation";

type Asset = { id: string; imageRenditions?: unknown };
type Resource = { id: string; blob: Blob };
type Selection = { id: string; mediaId: string; sourceDigest: string; renditionDigest: string; key: string };

/** The stable key avoids replacing object URLs when unrelated text changes. */
export function imageRenditionSelections(blocks: ContentBlock[]): Selection[] {
  const pins = new Map<string, Selection>();
  const visit = (items: ContentBlock[]) => {
    for (const block of items) {
      if (block.type === "image" && block.mediaId && block.imageResolution && validImageResolution(block.imageResolution)) {
        const id = imageRenditionResourceKey(block.mediaId, block.imageResolution);
        pins.set(id, { id, mediaId: block.mediaId, ...block.imageResolution });
      }
      visit(childContentBlocks(block));
    }
  };
  visit(blocks);
  return [...pins.values()].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0);
}

/** Only exact, currently referenced sizes receive temporary object URLs. */
export function referencedImageRenditions(selections: readonly Selection[], assets: readonly Asset[]): Resource[] {
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const captured = new Map<string, ReturnType<typeof captureImageRenditions> | null>();
  const result: Resource[] = [];
  for (const pin of selections) {
    const asset = byId.get(pin.mediaId);
    if (!asset?.imageRenditions) continue;
    if (!captured.has(asset.id)) {
      try { captured.set(asset.id, captureImageRenditions(asset.imageRenditions)); }
      catch { captured.set(asset.id, null); }
    }
    const checked = captured.get(asset.id);
    const bundleIndex = checked?.bundles.findIndex(item => item.sourceDigest === pin.sourceDigest) ?? -1;
    const variantIndex = bundleIndex < 0 ? -1 : checked!.bundles[bundleIndex].variants.findIndex(item => item.key === pin.key && item.digest === pin.renditionDigest);
    if (variantIndex >= 0) {
      // IndexedDB returns a private structured clone. Retain its immutable Blob
      // identity after checking the same metadata, so unchanged sizes keep URLs.
      const original = asset.imageRenditions as ImageRenditions;
      result.push({ id: pin.id, blob: original.bundles[bundleIndex].variants[variantIndex].blob });
    }
  }
  return result;
}
