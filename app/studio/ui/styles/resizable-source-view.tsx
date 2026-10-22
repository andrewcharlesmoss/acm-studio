"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import "./resizable-source-view.css";

const minWidth = 320;
const minHeight = 180;
const maxHeight = 1200;
type SourceSize = { width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

export function sourceSizeFromKey(key: string, size: SourceSize, availableWidth: number, shift = false): SourceSize | null {
  const step = shift ? 80 : 20;
  const minimumWidth = Math.min(minWidth, availableWidth);
  if (key === "ArrowLeft") return { ...size, width: clamp(size.width - step, minimumWidth, availableWidth) };
  if (key === "ArrowRight") return { ...size, width: clamp(size.width + step, minimumWidth, availableWidth) };
  if (key === "ArrowUp") return { ...size, height: clamp(size.height - step, minHeight, maxHeight) };
  if (key === "ArrowDown") return { ...size, height: clamp(size.height + step, minHeight, maxHeight) };
  if (key === "Home") return { width: minimumWidth, height: minHeight };
  if (key === "End") return { width: availableWidth, height: maxHeight };
  return null;
}

/** Temporary view geometry shared by both source formats and both style editors. */
export function ResizableSourceView({ children, className = "", style, ...events }: HTMLAttributes<HTMLDivElement>) {
  const root = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<SourceSize | null>(null);
  const [measured, setMeasured] = useState<SourceSize>({ width: 0, height: 384 });
  const gesture = useRef<{ drag: ResizeDrag<SourceSize>; previous: SourceSize | null } | null>(null);

  useLayoutEffect(() => {
    const container = root.current;
    const measure = () => {
      const document = container?.querySelector<HTMLElement>(".sg-guide-document:not(.is-inactive)")
        ?? container?.querySelector<HTMLElement>(".sg-guide-document");
      if (!container || !document) return;
      setMeasured({ width: Math.round(container.clientWidth), height: Math.round(document.getBoundingClientRect().height) });
    };
    measure();
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const documents = container.querySelectorAll(".sg-guide-document");
    documents.forEach(document => observer.observe(document));
    return () => observer.disconnect();
  }, []);

  const availableWidth = Math.max(0, measured.width);
  const currentSize = {
    width: Math.min(requested?.width ?? availableWidth, availableWidth),
    height: requested?.height ?? measured.height,
  };
  const minimumWidth = Math.min(minWidth, availableWidth);

  function finish() { gesture.current = null; }

  return <div {...events} ref={root} className={`sg-guide-views resizable-source-view ${className}`} style={{
    ...style,
    ...(requested === null ? {} : {
      "--source-view-width": `${requested.width}px`,
      "--source-view-height": `${requested.height}px`,
    }),
  } as CSSProperties}>
    {children}
    <button type="button" aria-label={`Resize canonical source view, ${currentSize.width} pixels wide by ${currentSize.height} pixels high`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Escape"
      title="Drag the corner to resize the source view. Left and Right change width; Up and Down change height. Shift uses larger steps. Home sets the minimum size; End sets the maximum size. Enter or double-click restores the starting size. Escape cancels a drag."
      className="source-view-resize-handle"
      onPointerDown={event => {
        if (event.button !== 0 || gesture.current) return;
        event.preventDefault();
        event.currentTarget.focus();
        const document = root.current?.querySelector<HTMLElement>(".sg-guide-document:not(.is-inactive)")
          ?? root.current?.querySelector<HTMLElement>(".sg-guide-document");
        const rect = document?.getBoundingClientRect();
        const size = rect
          ? { width: Math.round(rect.width), height: Math.round(rect.height) }
          : currentSize;
        gesture.current = { drag: beginResizeDrag(size, { x: event.clientX, y: event.clientY }, false), previous: requested };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!gesture.current) return;
        setRequested(updateResizeDrag(gesture.current.drag, { x: event.clientX, y: event.clientY }, false, (basis, dx, dy) => ({
          width: clamp(basis.width + dx, minimumWidth, availableWidth),
          height: clamp(basis.height + dy, minHeight, maxHeight),
        })));
      }}
      onPointerUp={finish} onLostPointerCapture={finish}
      onPointerCancel={() => { if (gesture.current) setRequested(gesture.current.previous); finish(); }}
      onDoubleClick={() => setRequested(null)}
      onKeyDown={event => {
        if (event.key === "Escape" && gesture.current) { event.preventDefault(); setRequested(gesture.current.previous); finish(); return; }
        if (event.key === "Enter") { event.preventDefault(); setRequested(null); return; }
        const next = sourceSizeFromKey(event.key, currentSize, availableWidth, event.shiftKey);
        if (next !== null) { event.preventDefault(); setRequested(next); }
      }} />
  </div>;
}
