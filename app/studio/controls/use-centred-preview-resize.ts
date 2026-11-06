"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../resize-drag";
import { dragPreviewWidth, previewWidthFromKey } from "./preview-frame-size";

type Edge = "left" | "right";
type Bounds = { min: number; max: number };

/** Shared pointer, cancellation, capture-loss and keyboard lifecycle for centred previews. */
export function useCentredPreviewResize<T>({ width, bounds, snapshot, restore, onChange, onReset, scale, endResets = false, stopPropagation = false }: { width: number; bounds: Bounds; snapshot: () => T; restore: (value: T) => void; onChange: (value: number) => void; onReset: () => void; scale: (target: HTMLButtonElement) => number; endResets?: boolean; stopPropagation?: boolean }) {
  const gesture = useRef<{ edge: Edge; drag: ResizeDrag<number>; original: T; target: HTMLButtonElement; pointerId: number; moved: boolean; scale: number } | null>(null);
  const recent = useRef<[boolean, boolean]>([false, false]);
  const [active, setActive] = useState<Edge | null>(null);
  function cancel() {
    const current = gesture.current;
    gesture.current = null;
    if (current) { restore(current.original); if (current.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId); }
    setActive(null);
  }
  function handlers(edge: Edge) {
    const resized = (current: NonNullable<typeof gesture.current>, x: number) => updateResizeDrag(current.drag, { x, y: 0 }, false, (basis, delta) => dragPreviewWidth(basis, (edge === "left" ? delta : -delta) / current.scale, bounds));
    return {
      onDoubleClick() { if (!recent.current.some(Boolean)) onReset(); },
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0 || gesture.current) return;
        event.preventDefault(); if (stopPropagation) event.stopPropagation(); event.currentTarget.focus();
        const measured = scale(event.currentTarget);
        gesture.current = { edge, drag: beginResizeDrag(width, { x: event.clientX, y: 0 }, false), original: snapshot(), target: event.currentTarget, pointerId: event.pointerId, moved: false, scale: Number.isFinite(measured) && measured > 0 ? measured : 1 };
        event.currentTarget.setPointerCapture(event.pointerId); setActive(edge);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
        if (stopPropagation) event.stopPropagation();
        if (Math.abs(event.clientX - current.drag.origin.x) > 3) current.moved = true;
        if (event.clientX === current.drag.origin.x && current.drag.latest === current.drag.basis) return;
        onChange(resized(current, event.clientX));
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
        if (stopPropagation) event.stopPropagation();
        const moved = current.moved || Math.abs(event.clientX - current.drag.origin.x) > 3;
        recent.current = [recent.current[1], moved];
        if (event.clientX !== current.drag.origin.x || current.drag.latest !== current.drag.basis) onChange(resized(current, event.clientX));
        gesture.current = null; setActive(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel(event: PointerEvent<HTMLButtonElement>) { if (gesture.current?.pointerId === event.pointerId) cancel(); },
      onLostPointerCapture(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
        gesture.current = null; setActive(null);
        if (current.moved || current.drag.latest !== current.drag.basis) { recent.current = [recent.current[1], current.moved]; onChange(current.drag.latest); }
      },
      onBlur(_event: FocusEvent<HTMLButtonElement>) { cancel(); },
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape" && gesture.current) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
        const key = edge === "right" && event.key === "ArrowLeft" ? "ArrowRight" : edge === "right" && event.key === "ArrowRight" ? "ArrowLeft" : event.key;
        const next = previewWidthFromKey(width, key, event.shiftKey, bounds); if (next === null) return;
        event.preventDefault(); if (stopPropagation) event.stopPropagation();
        if (event.key === "Enter" || endResets && event.key === "End") onReset(); else onChange(next);
      },
    };
  }
  return { active, handlers };
}
