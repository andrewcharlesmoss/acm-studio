"use client";
import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent, type MouseEvent } from "react";
import type { LibraryMove } from "./library-reordering";
const MIME = "application/x-acm-studio-library-entry";
/** A drag belongs to one rendered list and one unchanged order snapshot. */
export function useLibraryReordering(ids: string[], writable: boolean, onMove: (move: LibraryMove) => boolean, listKey = "library") {
  const owner = useId();
  const pointer = useRef<{ pointerId: number; x: number; y: number; id: string; active: boolean; target?: { id: string; edge: "before" | "after" } } | null>(null);
  const suppressClick = useRef(false);
  const drag = useRef<{ id: string; baseline: string[] } | null>(null);
  const [indicator, setIndicator] = useState<{ id: string; edge: "before" | "after"; baseline: string } | null>(null);
  const [announcement, setAnnouncement] = useState({ listKey, message: "" });
  if (announcement.listKey !== listKey) setAnnouncement({ listKey, message: "" });
  function cancel() { if (pointer.current?.active) suppressClick.current = true; pointer.current = null; drag.current = null; setIndicator(null); }
  function valid() { return writable && drag.current && JSON.stringify(drag.current.baseline) === JSON.stringify(ids); }
  function edge(event: DragEvent<HTMLElement>) { const rect = event.currentTarget.getBoundingClientRect(); return event.clientY < rect.top + rect.height / 2 ? "before" as const : "after" as const; }
  function move(value: LibraryMove) { const accepted = onMove(value); if (accepted) setAnnouncement({ listKey, message: `Moved to position ${value.edge === "before" ? ids.filter(id => id !== value.id).indexOf(value.targetId) + 1 : ids.filter(id => id !== value.id).indexOf(value.targetId) + 2} of ${ids.length}.` }); }
  function rowProps(id: string) {
    return {
      draggable: writable && ids.length > 1,
      "data-library-entry-id": id,
      "data-library-reorder-owner": owner,
      "data-drop-edge": indicator?.id === id && writable && indicator.baseline === JSON.stringify(ids) ? indicator.edge : undefined,
      "aria-description": writable && ids.length > 1 ? "Drag to reorder, or press Alt and the Up or Down arrow." : undefined,
      onPointerDown(event: PointerEvent<HTMLElement>) {
        // Mouse pointer capture avoids relying on native HTML drag support.
        // Touch keeps its ordinary scrolling behaviour and keyboard remains available.
        if (!writable || ids.length < 2 || event.button !== 0 || event.pointerType !== "mouse") return;
        event.preventDefault(); event.currentTarget.focus();
        suppressClick.current = false;
        pointer.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, id, active: false };
        drag.current = { id, baseline: [...ids] };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = pointer.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (!valid()) { cancel(); return; }
        if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
        current.active = true;
        const target = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-library-entry-id]");
        const targetId = target?.dataset.libraryEntryId;
        if (!target || target.dataset.libraryReorderOwner !== owner || !targetId || targetId === current.id || !ids.includes(targetId)) { current.target = undefined; setIndicator(null); return; }
        const rect = target.getBoundingClientRect();
        current.target = { id: targetId, edge: event.clientY < rect.top + rect.height / 2 ? "before" : "after" };
        setIndicator({ ...current.target, baseline: JSON.stringify(ids) });
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        const current = pointer.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (current.active && current.target && valid()) move({ ...drag.current!, targetId: current.target.id, edge: current.target.edge });
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        cancel();
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onClickCapture(event: MouseEvent<HTMLElement>) { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } },
      onDragStart(event: DragEvent<HTMLElement>) { if (pointer.current) { event.preventDefault(); return; } if (!writable) { event.preventDefault(); return; } drag.current = { id, baseline: [...ids] }; event.dataTransfer.setData(MIME, owner); event.dataTransfer.effectAllowed = "move"; },
      onDragOver(event: DragEvent<HTMLElement>) { if (!valid() || drag.current?.id === id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setIndicator({ id, edge: edge(event), baseline: JSON.stringify(ids) }); },
      onDrop(event: DragEvent<HTMLElement>) { event.preventDefault(); if (valid() && event.dataTransfer.getData(MIME) === owner) move({ ...drag.current!, targetId: id, edge: edge(event) }); cancel(); },
      onDragEnd: cancel,
      onKeyDown(event: KeyboardEvent<HTMLElement>) { if (event.key === "Escape") { cancel(); return; } if (!writable || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); const direction = event.key === "ArrowUp" ? -1 : 1; const targetId = ids[ids.indexOf(id) + direction]; if (targetId) move({ id, targetId, edge: direction === -1 ? "before" : "after", baseline: [...ids] }); },
    };
  }
  return { rowProps, message: announcement.listKey === listKey ? announcement.message : "" };
}
