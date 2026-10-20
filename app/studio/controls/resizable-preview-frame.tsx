"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../resize-drag";
import { clampPreviewWidth, dragPreviewWidth, previewFrameBounds, previewFrameHeight, previewWidthFromKey } from "./preview-frame-size";
import "./resizable-preview-frame.css";

/** Preview geometry only; content and style history remain with their existing owners. */
export function ResizablePreviewFrame({ children, style, className = "", preferredWidth }: { children: ReactNode; style?: CSSProperties; className?: string; preferredWidth?: number | null }) {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [requested, setRequested] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const gesture = useRef<{ drag: ResizeDrag<number>; requested: number | null; target: HTMLButtonElement; pointerId: number; moved: boolean } | null>(null);
  const recentPointerMoves = useRef<[boolean, boolean]>([false, false]);
  const bounds = previewFrameBounds(available.width);
  const width = clampPreviewWidth(requested ?? bounds.max, bounds);
  const height = previewFrameHeight(width, bounds.max, available.height);
  function cancel() {
    const active = gesture.current;
    gesture.current = null;
    if (active) {
      setRequested(active.requested);
      if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
    }
    setResizing(false);
  }
  function finishInterruptedDrag() {
    const active = gesture.current;
    gesture.current = null;
    if (active) {
      recentPointerMoves.current = [recentPointerMoves.current[1], active.moved];
      // Capture can end before pointerup when leaving an embedded browser.
      // Keep the last displayed size rather than undoing the completed movement.
      if (active.moved || active.drag.latest !== active.drag.basis) setRequested(active.drag.latest);
    }
    setResizing(false);
  }
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setAvailable({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => { if (preferredWidth !== undefined) setRequested(preferredWidth); }, [preferredWidth]);
  return <div ref={stage} className={`studio-preview-stage ${className}`} data-resizing={resizing || undefined}>
    <div className="studio-preview-frame" style={{ width: available.width ? width : "calc(100% - 48px)", height: available.height ? height : "100%" }}>
      <div id={id} className="studio-preview-frame-content" style={style}>{children}</div>
      {/* A focusable, value-bearing separator follows the ARIA window-splitter pattern. */}
      {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
      <button type="button" role="separator" aria-orientation="vertical" aria-label="Resize preview"
        aria-controls={id} aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={width}
        aria-valuetext={`${width} pixels`} aria-describedby={`${id}-help`} className="studio-preview-resize-handle"
        onDoubleClick={() => {
          // Captured drags can also produce click/double-click events on the handle.
          if (!recentPointerMoves.current.some(Boolean)) setRequested(null);
        }}
        onPointerDown={event => {
          if (event.button !== 0 || gesture.current) return;
          event.preventDefault();
          event.currentTarget.focus();
          gesture.current = { drag: beginResizeDrag(width, { x: event.clientX, y: 0 }, false), requested, target: event.currentTarget, pointerId: event.pointerId, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          setResizing(true);
        }}
        onPointerMove={event => {
          if (!gesture.current || gesture.current.pointerId !== event.pointerId) return;
          if (Math.abs(event.clientX - gesture.current.drag.origin.x) > 3) gesture.current.moved = true;
          if (event.clientX === gesture.current.drag.origin.x && gesture.current.drag.latest === gesture.current.drag.basis) return;
          setRequested(updateResizeDrag(gesture.current.drag, { x: event.clientX, y: 0 }, false,
            (basis, delta) => dragPreviewWidth(basis, delta, bounds)));
        }}
        onPointerUp={event => {
          if (!gesture.current || gesture.current.pointerId !== event.pointerId) return;
          const moved = gesture.current.moved || Math.abs(event.clientX - gesture.current.drag.origin.x) > 3;
          recentPointerMoves.current = [recentPointerMoves.current[1], moved];
          if (event.clientX !== gesture.current.drag.origin.x || gesture.current.drag.latest !== gesture.current.drag.basis) {
            setRequested(updateResizeDrag(gesture.current.drag, { x: event.clientX, y: 0 }, false,
              (basis, delta) => dragPreviewWidth(basis, delta, bounds)));
          }
          gesture.current = null;
          setResizing(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={event => { if (gesture.current?.pointerId === event.pointerId) cancel(); }}
        onLostPointerCapture={event => { if (gesture.current?.pointerId === event.pointerId) finishInterruptedDrag(); }} onBlur={cancel}
        onKeyDown={event => {
          if (event.key === "Escape" && gesture.current) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
          const next = previewWidthFromKey(width, event.key, event.shiftKey, bounds);
          if (next === null) return;
          event.preventDefault();
          setRequested(event.key === "End" || event.key === "Enter" ? null : next);
        }} />
      <span id={`${id}-help`} hidden>Drag to resize. Left expands; Right narrows. Hold Shift for larger steps. Home sets the minimum; End, Enter or double-click fits the available space. Escape cancels a drag.</span>
    </div>
  </div>;
}
