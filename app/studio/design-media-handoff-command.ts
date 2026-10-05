import type { MediaAsset } from "./media-store";
import type { StudioWorkspace } from "./editor-model";
import type { CommitWorkspace } from "./use-studio-document-commands";

/** Loaded handoffs target one explicit document and use its normal history. */
export function insertDesignMedia({ workspace, writable, commit, onSelectBlock, onInspectorTab, onClearDocumentField }: {
  workspace: StudioWorkspace; writable: boolean; commit: CommitWorkspace;
  onSelectBlock?: (id: string | null) => void; onInspectorTab?: (tab: "block" | "document") => void; onClearDocumentField?: () => void;
}, documentId: string, asset: MediaAsset, target: "block" | "cover", altText: string) {
  if (!writable || workspace.activeDocumentId !== documentId || !workspace.documents.some(document => document.id === documentId) || !asset.type.startsWith("image/")) return false;
  const alt = altText.trim() || asset.altText || asset.name.replace(/\.[^.]+$/, "");
  const image = { id: `image-${crypto.randomUUID()}`, type: "image" as const, src: "", mediaId: asset.id, alt, caption: asset.caption };
  const accepted = commit(current => {
    if (current.activeDocumentId !== documentId) return current;
    return { ...current, documents: current.documents.map(document => document.id !== documentId ? document : {
      ...document,
      ...(target === "cover" ? { coverImage: { src: "", mediaId: asset.id, alt } } : { blocks: [...document.blocks, image] }),
      updatedAt: new Date().toISOString(),
    }) };
  }) !== false;
  if (accepted) { onClearDocumentField?.(); onSelectBlock?.(target === "cover" ? null : image.id); onInspectorTab?.(target === "cover" ? "document" : "block"); }
  return accepted;
}

/** Recheck cancellation and current context after the asynchronous asset load. */
export async function loadAndInsertDesignMedia({ documentId, mediaId, target, altText, loadAsset, isCurrent, insert }: {
  documentId: string; mediaId: string; target: "block" | "cover"; altText: string;
  loadAsset: (id: string) => Promise<MediaAsset | undefined>;
  isCurrent: () => boolean;
  insert: (documentId: string, asset: MediaAsset, target: "block" | "cover", altText: string) => boolean;
}) {
  const asset = await loadAsset(mediaId);
  if (!isCurrent()) return "cancelled";
  if (!asset || !asset.type.startsWith("image/")) return "unavailable";
  return insert(documentId, asset, target, altText) ? "accepted" : "unavailable";
}
