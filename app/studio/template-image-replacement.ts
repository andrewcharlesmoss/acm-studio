import { copyTemplateData, visitTemplateNodes, type TemplateNode, type TemplateStore } from "./template-model";
import { replaceImageMedia, type ImageReplacementAsset, type ImageReplacementTarget } from "./image-replacement";

export type TemplateImageTarget = { setId: string; targetId: string; image: ImageReplacementTarget };

export function templateImageTarget(nodes: TemplateNode[], id: string): ImageReplacementTarget | null {
  let found: ImageReplacementTarget | null = null;
  visitTemplateNodes(nodes, node => { if (node.id === id && node.type === "image") found = { id: node.id, src: node.src, mediaId: node.mediaId }; });
  return found;
}

/** Rebase replacement onto the current template store, preserving other edits. */
export function replaceTemplateImage(store: TemplateStore, owner: TemplateImageTarget, asset: ImageReplacementAsset, altText?: string): { status: "stale" | "unchanged" | "changed"; store: TemplateStore } {
  const set = store.sets.find(item => item.id === owner.setId);
  const entry = set && [...set.templates, ...set.parts].find(item => item.id === owner.targetId);
  if (!entry) return { status: "stale", store };
  let current: Extract<TemplateNode, { type: "image" }> | undefined;
  visitTemplateNodes(entry.nodes, node => { if (node.id === owner.image.id && node.type === "image") current = node; });
  const replacement = replaceImageMedia(current, owner.image, asset, altText);
  if (!replacement) return { status: "stale", store };
  if (replacement === current) return { status: "unchanged", store };
  const next = copyTemplateData(store);
  const nextSet = next.sets.find(item => item.id === owner.setId)!;
  const nextEntry = [...nextSet.templates, ...nextSet.parts].find(item => item.id === owner.targetId)!;
  visitTemplateNodes(nextEntry.nodes, node => { if (node.id === owner.image.id && node.type === "image") Object.assign(node, replacement); });
  return { status: "changed", store: next };
}

/** Validate again inside the synchronous owning commit, including no-ops. */
export function commitTemplateImageReplacement(
  commit: (update: (store: TemplateStore) => TemplateStore, options?: { skipUnchanged?: boolean }) => boolean,
  owner: TemplateImageTarget,
  asset: ImageReplacementAsset,
  altText?: string,
  signal?: AbortSignal,
): boolean {
  let checked = false;
  const accepted = commit(store => {
    if (signal?.aborted) return store;
    const next = replaceTemplateImage(store, owner, asset, altText);
    if (next.status === "stale") return store;
    checked = true;
    return next.store;
  }, { skipUnchanged: true });
  return accepted && checked;
}
