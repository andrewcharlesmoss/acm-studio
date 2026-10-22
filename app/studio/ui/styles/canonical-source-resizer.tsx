"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import "./canonical-source-resizer.css";

export function sourceWidthFromKey(key: string, width: number, min: number, max: number, shift = false) {
  const step = shift ? 40 : 10;
  const value = key === "ArrowLeft" ? width + step : key === "ArrowRight" ? width - step : key === "Home" ? min : key === "End" ? max : null;
  return value === null ? null : Math.max(min, Math.min(max, value));
}

/** Source-column geometry only; source views, editing and history stay mounted. */
export function CanonicalSourceResizer({ remainingWidth }: { remainingWidth: number }) {
  const handle = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ width: 320, available: 0 });
  const [requested, setRequested] = useState<number | null>(null);
  const gesture = useRef<{ drag: ResizeDrag<number>; previous: number | null } | null>(null);
  const min = 320;
  const max = Math.max(min, size.available - remainingWidth);
  const width = Math.max(min, Math.min(max, requested ?? size.width));
  useLayoutEffect(() => {
    const pane = handle.current?.parentElement;
    const layout = pane?.closest<HTMLElement>("[data-canonical-source-layout]");
    if (!pane || !layout) return;
    const measure = () => setSize({ width: pane.getBoundingClientRect().width, available: layout.clientWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane); observer.observe(layout);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const layout = handle.current?.closest<HTMLElement>("[data-canonical-source-layout]");
    if (!layout) return;
    if (requested === null) layout.style.removeProperty("--canonical-source-width");
    else layout.style.setProperty("--canonical-source-width", `${width}px`);
    return () => { layout.style.removeProperty("--canonical-source-width"); };
  }, [requested, width]);
  function finish() { gesture.current = null; }
  // A focusable, value-bearing separator implements the ARIA window-splitter pattern.
  // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role
  return <button ref={handle} type="button" role="separator" aria-orientation="vertical" aria-label="Resize Canonical Source"
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(width)} aria-valuetext={`${Math.round(width)} pixels`}
    title="Drag to resize. Left widens; Right narrows. Shift uses larger steps. Home sets minimum; End sets maximum. Enter or double-click restores the starting width. Escape cancels a drag."
    className="canonical-source-resizer"
    onPointerDown={event => {
      if (event.button !== 0 || gesture.current) return;
      event.preventDefault(); event.currentTarget.focus();
      gesture.current = { drag: beginResizeDrag(width, { x: event.clientX, y: 0 }, false), previous: requested };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (!gesture.current) return;
      setRequested(updateResizeDrag(gesture.current.drag, { x: event.clientX, y: 0 }, false,
        (basis, dx) => Math.max(min, Math.min(max, Math.round(basis - dx)))));
    }}
    onPointerUp={finish} onLostPointerCapture={finish}
    onPointerCancel={() => { if (gesture.current) setRequested(gesture.current.previous); finish(); }}
    onDoubleClick={() => setRequested(null)}
    onKeyDown={event => {
      if (event.key === "Escape" && gesture.current) { event.preventDefault(); setRequested(gesture.current.previous); finish(); return; }
      if (event.key === "Enter") { event.preventDefault(); setRequested(null); return; }
      const next = sourceWidthFromKey(event.key, width, min, max, event.shiftKey);
      if (next !== null) { event.preventDefault(); setRequested(next); }
    }} />;
}
