"use client";

import { createContext, type RefObject } from "react";

// Each editor supplies its own canvas; inspector navigation must never reach
// another editor or a catalogue specimen with matching block IDs.
export const ListInspectorCanvasContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function focusInspectorListItem(canvas: HTMLElement | null, listId: string, itemIndex: number) {
  if (!canvas?.isConnected || !Number.isInteger(itemIndex) || itemIndex < 0) return false;
  const editor = [...canvas.querySelectorAll<HTMLElement>(".list-item-editor[data-list-context-id][data-list-item-index]")]
    .find(element => element.dataset.listContextId === listId && element.dataset.listItemIndex === String(itemIndex));
  if (!editor?.isConnected || editor.getAttribute("contenteditable") !== "true") return false;
  editor.focus();
  return true;
}
