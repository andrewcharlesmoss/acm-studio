"use client";

import { createContext } from "react";
import type { ContentBlock } from "../../content/model";
import { findContentBlock } from "../../content/block-tree";
import { safeTextLink } from "../../content/rich-text";

export type EmbedUrlEditor = { beginEdit: (opener: HTMLElement) => void; restoreFocus: () => void };
export type EmbedUrlChange = { documentId: string; blockId: string; sourceUrl: string; url: string; opener: HTMLElement | null; isCurrent: () => boolean };
export type EmbedUrlEditingOwner = {
  documentId: string;
  register: (blockId: string, sourceUrl: string, editor: EmbedUrlEditor) => () => void;
  commit: (request: EmbedUrlChange) => boolean;
  cancelPending: (documentId: string, blockId: string, sourceUrl: string) => void;
};
/** Reveal the field immediately; a smooth focus scroll can move Submit during a pointer click. */
export function focusEmbedUrlInput(input: HTMLInputElement | null) {
  input?.focus({ preventScroll: true });
  input?.scrollIntoView({ block: "nearest", behavior: "instant" });
}

export const EmbedUrlEditingContext = createContext<EmbedUrlEditingOwner | null>(null);

/** URL-only rebasing preserves concurrently edited captions, styles and metadata. */
export function updateEmbedUrl(current: ContentBlock, sourceUrl: string, url: string): ContentBlock {
  const safeUrl = safeTextLink(url);
  return current.type === "embed" && current.url === sourceUrl && safeUrl && safeUrl !== current.url
    ? { ...current, url: safeUrl } : current;
}

export type EmbedOwnerIdentity = { documentId: string; selectedBlockId: string | null; writable: boolean; previewing: boolean };
/** Advance on committed authority transitions, including loss followed by restoration. */
export function nextEmbedOwnerEpoch(epoch: number, previous: EmbedOwnerIdentity, next: EmbedOwnerIdentity): number {
  return previous.documentId !== next.documentId || previous.selectedBlockId !== next.selectedBlockId || previous.writable !== next.writable || previous.previewing !== next.previewing ? epoch + 1 : epoch;
}

type EmbedOwnerSnapshot = { interactionEpoch: number; document: { id: string; blocks: ContentBlock[] }; selectedBlockId: string | null; writable: boolean; previewing: boolean };
/** Queue a source-matched patch; only a subsequent model change confirms acceptance. */
export function requestEmbedUrlChange(request: EmbedUrlChange, owner: {
  read: () => EmbedOwnerSnapshot;
  updateBlock: (blockId: string, update: (current: ContentBlock) => ContentBlock) => void;
  onRequested: (request: EmbedUrlChange) => void;
}): boolean {
  const interactionEpoch = owner.read().interactionEpoch;
  const canApply = () => { const state = owner.read(); return state.interactionEpoch === interactionEpoch && request.isCurrent() && state.writable && !state.previewing && state.document.id === request.documentId && state.selectedBlockId === request.blockId; };
  const current = findContentBlock(owner.read().document.blocks, request.blockId);
  const url = safeTextLink(request.url);
  if (!canApply() || current?.type !== "embed" || current.url !== request.sourceUrl || !url) return false;
  if (current.url === url) return true;
  owner.onRequested({ ...request, url });
  owner.updateBlock(request.blockId, fresh => canApply() ? updateEmbedUrl(fresh, request.sourceUrl, url) : fresh);
  return true;
}

/** Field-owned controllers are scoped to their document and immutable source URL. */
export function createEmbedUrlEditorRegistry(onChange: () => void) {
  const editors = new Map<string, EmbedUrlEditor>();
  const key = (documentId: string, blockId: string, sourceUrl: string) => JSON.stringify([documentId, blockId, sourceUrl]);
  return {
    get: (documentId: string, blockId: string, sourceUrl: string) => editors.get(key(documentId, blockId, sourceUrl)),
    register(documentId: string, blockId: string, sourceUrl: string, editor: EmbedUrlEditor) {
      const identity = key(documentId, blockId, sourceUrl);
      editors.set(identity, editor); onChange();
      return () => {
        if (editors.get(identity) !== editor) return;
        editors.delete(identity); onChange();
      };
    },
  };
}
