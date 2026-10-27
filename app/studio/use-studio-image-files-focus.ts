"use client";

import { useLayoutEffect, useRef } from "react";
import { findContentBlock } from "../content/block-tree";
import type { StudioDocument } from "./editor-model";
import type { StudioSection } from "./use-studio-screen-navigation";

type ImageFilesAction = "Replace image" | "Choose from files";
/** Content Files replaces the canvas; retain a logical opener across that route. */
export function useStudioImageFilesFocus({ activeDocument, studioSection, onSelectBlock, onSelectTab }: {
  activeDocument: StudioDocument;
  studioSection: StudioSection;
  onSelectBlock: (id: string) => void;
  onSelectTab: (tab: "block") => void;
}) {
  const owner = useRef<{ documentId: string; blockId: string; trigger: HTMLElement | null; action: ImageFilesAction; returning: boolean } | null>(null);
  const previousSection = useRef(studioSection);
  const current = useRef({ activeDocument, studioSection });
  useLayoutEffect(() => { current.current = { activeDocument, studioSection }; });
  useLayoutEffect(() => {
    const previous = previousSection.current; previousSection.current = studioSection;
    const opener = owner.current;
    if (!opener || studioSection !== "content" || !opener.returning && previous !== "files") return;
    owner.current = null;
    if (activeDocument.id !== opener.documentId || findContentBlock(activeDocument.blocks, opener.blockId)?.type !== "image") return;
    onSelectBlock(opener.blockId); onSelectTab("block");
    // Wait until native Files/description dismissal and editor remount settle.
    requestAnimationFrame(() => {
      const latest = current.current;
      if (latest.studioSection !== "content" || latest.activeDocument.id !== opener.documentId || findContentBlock(latest.activeDocument.blocks, opener.blockId)?.type !== "image") return;
      const canvas = document.querySelector<HTMLElement>(`[data-studio-document-id="${CSS.escape(opener.documentId)}"]`);
      if (!canvas) return;
      if (opener.trigger?.isConnected) { opener.trigger.focus(); return; }
      const trigger = opener.action === "Replace image"
        ? canvas.querySelector<HTMLElement>('button[aria-label="Replace image"]')
        : document.querySelector<HTMLElement>(".choose-media-button");
      trigger?.focus();
    });
  }, [studioSection, activeDocument, onSelectBlock, onSelectTab]);
  return {
    capture(blockId: string, trigger: HTMLElement | undefined, action: ImageFilesAction) {
      owner.current = { documentId: activeDocument.id, blockId, trigger: trigger ?? null, action, returning: false };
    },
    returnToDocument() { if (owner.current) owner.current.returning = true; },
  };
}
