"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import "./resizable-source-view.css";

const minWidth = 320;
const minHeight = 180;
const maxHeight = 1200;
type SourceBox = { x: number; y: number; width: number; height: number };
type Edge = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
const edges: Edge[] = ["n", "s", "e", "w", "nw", "ne", "sw", "se"];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

function edgeLabel(edge: Edge) {
  const direction = { n: "top edge", s: "bottom edge", e: "right edge", w: "left edge", nw: "top-left corner", ne: "top-right corner", sw: "bottom-left corner", se: "bottom-right corner" }[edge];
  return `Resize canonical source view from the ${direction}`;
}

function resizeBox(edge: Edge, basis: SourceBox, dx: number, dy: number, availableWidth: number): SourceBox {
  const minimumWidth = Math.min(minWidth, availableWidth);
  const keepsRight = edge.includes("w");
  const keepsBottom = edge.includes("n");
  let width = basis.width;
  let height = basis.height;

  if (edge.includes("e")) width = clamp(basis.width + dx, minimumWidth, Math.max(minimumWidth, availableWidth - basis.x));
  if (keepsRight) width = clamp(basis.width - dx, minimumWidth, Math.max(minimumWidth, basis.x + basis.width));
  if (edge.includes("s")) height = clamp(basis.height + dy, minHeight, Math.max(minHeight, maxHeight - basis.y));
  if (keepsBottom) height = clamp(basis.height - dy, minHeight, Math.max(minHeight, basis.y + basis.height));

  return {
    x: keepsRight ? basis.x + basis.width - width : basis.x,
    y: keepsBottom ? basis.y + basis.height - height : basis.y,
    width,
    height,
  };
}

function boxFromKey(edge: Edge, box: SourceBox, key: string, availableWidth: number, shift: boolean): SourceBox | null {
  const step = shift ? 80 : 20;
  let dx = 0;
  let dy = 0;
  if (key === "ArrowLeft") dx = -step;
  else if (key === "ArrowRight") dx = step;
  else if (key === "ArrowUp") dy = -step;
  else if (key === "ArrowDown") dy = step;
  else return null;

  const horizontal = edge.includes("e") || edge.includes("w");
  const vertical = edge.includes("n") || edge.includes("s");
  if (dx !== 0 && !horizontal || dy !== 0 && !vertical) return null;
  return resizeBox(edge, box, dx, dy, availableWidth);
}

/** Temporary view geometry shared by both source formats and both style editors. */
export function ResizableSourceView({ children, className = "", style, ...events }: HTMLAttributes<HTMLDivElement>) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<SourceBox | null>(null);
  const [measured, setMeasured] = useState<SourceBox>({ x: 0, y: 0, width: 0, height: 384 });
  const gesture = useRef<{ edge: Edge; drag: ResizeDrag<SourceBox>; previous: SourceBox | null } | null>(null);

  useLayoutEffect(() => {
    const container = root.current;
    const measure = () => {
      const document = container?.querySelector<HTMLElement>(".sg-guide-document:not(.is-inactive)")
        ?? container?.querySelector<HTMLElement>(".sg-guide-document");
      if (!container || !document) return;
      setMeasured({ x: 0, y: 0, width: Math.round(container.clientWidth), height: Math.round(document.getBoundingClientRect().height) });
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
  const currentBox = requested === null
    ? measured
    : { ...requested, width: Math.min(requested.width, Math.max(0, availableWidth - requested.x)) };

  function startResize(edge: Edge, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || gesture.current || !frame.current || !root.current) return;
    event.preventDefault();
    const frameRect = frame.current.getBoundingClientRect();
    const rootRect = root.current.getBoundingClientRect();
    const box = {
      x: Math.round(frameRect.left - rootRect.left),
      y: Math.round(frameRect.top - rootRect.top),
      width: Math.round(frameRect.width),
      height: Math.round(frameRect.height),
    };
    event.currentTarget.focus();
    gesture.current = { edge, drag: beginResizeDrag(box, { x: event.clientX, y: event.clientY }, false), previous: requested };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active) return;
    setRequested(updateResizeDrag(active.drag, { x: event.clientX, y: event.clientY }, false, (basis, dx, dy) =>
      resizeBox(active.edge, basis, dx, dy, availableWidth)));
  }

  function handleKeyDown(edge: Edge, event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && gesture.current) {
      event.preventDefault();
      setRequested(gesture.current.previous);
      gesture.current = null;
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setRequested(null);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setRequested({ x: 0, y: 0, width: Math.min(minWidth, availableWidth), height: minHeight });
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setRequested({ x: 0, y: 0, width: availableWidth, height: maxHeight });
      return;
    }
    const next = boxFromKey(edge, currentBox, event.key, availableWidth, event.shiftKey);
    if (next !== null) {
      event.preventDefault();
      setRequested(next);
    }
  }

  return <div {...events} ref={root} className={`sg-guide-views resizable-source-view ${className}`} style={style}>
    <div ref={frame} className="source-view-frame" style={requested === null ? undefined : {
      "--source-view-x": `${currentBox.x}px`,
      "--source-view-y": `${currentBox.y}px`,
      "--source-view-width": `${currentBox.width}px`,
      "--source-view-height": `${currentBox.height}px`,
    } as CSSProperties}>
      {children}
      {edges.map(edge => <button key={edge} type="button" className={`source-view-resize-handle source-view-resize-handle-${edge}`}
        aria-label={`${edgeLabel(edge)}, ${currentBox.width} pixels wide by ${currentBox.height} pixels high`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Escape"
        title="Use the arrow keys to resize. Shift uses larger steps. Home sets the minimum size; End sets the maximum size. Enter restores the original size."
        onPointerDown={event => startResize(edge, event)}
        onPointerMove={moveResize}
        onPointerUp={() => { gesture.current = null; }}
        onLostPointerCapture={() => { gesture.current = null; }}
        onPointerCancel={() => {
          if (gesture.current) setRequested(gesture.current.previous);
          gesture.current = null;
        }}
        onDoubleClick={() => setRequested(null)}
        onKeyDown={event => handleKeyDown(edge, event)} />)}
    </div>
  </div>;
}
