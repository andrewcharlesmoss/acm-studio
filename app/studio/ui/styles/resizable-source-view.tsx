"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import "./resizable-source-view.css";

const minHeight = 180;
const maxHeight = 1200;
const clamp = (height: number) => Math.max(minHeight, Math.min(maxHeight, Math.round(height)));
export function sourceHeightFromKey(key: string, height: number, shift = false) {
  const step = shift ? 80 : 20;
  return key === "ArrowDown" ? clamp(height + step) : key === "ArrowUp" ? clamp(height - step) : key === "Home" ? minHeight : key === "End" ? maxHeight : null;
}

/** Temporary view geometry shared by both source formats and both style editors. */
export function ResizableSourceView({ children, className = "", style, ...events }: HTMLAttributes<HTMLDivElement>) {
  const root = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<number | null>(null);
  const [measured, setMeasured] = useState(384);
  const gesture = useRef<{ drag: ResizeDrag<number>; previous: number | null } | null>(null);
  useLayoutEffect(() => {
    const document = root.current?.querySelector<HTMLElement>(".sg-guide-document");
    if (!document) return;
    const measure = () => setMeasured(Math.round(document.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document);
    return () => observer.disconnect();
  }, []);
  function finish() { gesture.current = null; }
  return <div {...events} ref={root} className={`sg-guide-views resizable-source-view ${className}`} style={{ ...style, ...(requested === null ? {} : { "--source-view-height": `${requested}px` }) } as CSSProperties}>
    {children}
    {/* A focusable separator implements the ARIA window-splitter pattern. */}
    {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
    <button type="button" role="separator" aria-orientation="horizontal" aria-label="Resize source view height"
      aria-valuemin={minHeight} aria-valuemax={maxHeight} aria-valuenow={requested ?? measured} aria-valuetext={`${requested ?? measured} pixels`}
      title="Drag to change source view height. Up shrinks; Down expands. Shift uses larger steps. Home sets minimum; End sets maximum. Enter or double-click restores the starting height. Escape cancels a drag."
      className="source-view-height-handle"
      onPointerDown={event => {
        if (event.button !== 0 || gesture.current) return;
        event.preventDefault(); event.currentTarget.focus();
        gesture.current = { drag: beginResizeDrag(requested ?? measured, { x: 0, y: event.clientY }, false), previous: requested };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (gesture.current) setRequested(updateResizeDrag(gesture.current.drag, { x: 0, y: event.clientY }, false, (basis, _dx, dy) => clamp(basis + dy)));
      }}
      onPointerUp={finish} onLostPointerCapture={finish}
      onPointerCancel={() => { if (gesture.current) setRequested(gesture.current.previous); finish(); }}
      onDoubleClick={() => setRequested(null)}
      onKeyDown={event => {
        if (event.key === "Escape" && gesture.current) { event.preventDefault(); setRequested(gesture.current.previous); finish(); return; }
        if (event.key === "Enter") { event.preventDefault(); setRequested(null); return; }
        const next = sourceHeightFromKey(event.key, requested ?? measured, event.shiftKey);
        if (next !== null) { event.preventDefault(); setRequested(next); }
      }} />
  </div>;
}
