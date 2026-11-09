"use client";

import { useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type KeyboardEvent } from "react";
import type { ContentBlock } from "../../content/model";
import { blockLayoutItemStyle, updateBlockLayoutItemStyle } from "../../content/layout";
import { gridSpanFromDelta, gridSpanFromKey, type GridItemSizing } from "../../content/grid-child-sizing";
import { gridTrackGeometry, type GridTrackAxis } from "./grid-track-geometry";
import "./grid-child-resize-handles.css";

type GridParent = { type: string; layout?: string; allowSizingOnChildren?: boolean };
type ResizeAxis = GridTrackAxis;
type ResizeGesture = { axis: ResizeAxis; pointerId: number; start: number; startSpan: number; stride: number; maximum: number; latest: number; moved: boolean };

function gridTracks(grid: HTMLElement | null, axis: ResizeAxis) {
  if (!grid) return { count: 1, stride: 0 };
  const computed = getComputedStyle(grid);
  return gridTrackGeometry(axis === "column" ? computed.gridTemplateColumns : computed.gridTemplateRows, axis === "column" ? computed.columnGap : computed.rowGap);
}

export function GridEditableChild({ parent, child, selected, hovered = false, writable, style, insertionPosition, blockAlign, onChange, children }: {
  parent: GridParent;
  child: ContentBlock;
  selected: boolean;
  hovered?: boolean;
  writable: boolean;
  style?: CSSProperties;
  insertionPosition?: boolean;
  blockAlign?: string;
  onChange: (block: ContentBlock, requireSourceMatch?: boolean) => void;
  children: ReactNode;
}) {
  const instructionsId = useId();
  const savedSizing = blockLayoutItemStyle(child)?.gridItemSizing;
  const [previewSizing, setPreviewSizing] = useState<GridItemSizing | null>(null);
  const previewRef = useRef<GridItemSizing | null>(null);
  const gestureRef = useRef<ResizeGesture | null>(null);
  const suppressClickRef = useRef(false);

  function setPreview(next: GridItemSizing | null) {
    previewRef.current = next;
    setPreviewSizing(next);
  }

  function commit(axis: ResizeAxis, span: number) {
    const key = axis === "column" ? "columnSpan" : "rowSpan";
    const sizing = { ...savedSizing, ...previewRef.current, [key]: span };
    onChange(updateBlockLayoutItemStyle(child, current => ({ ...current, gridItemSizing: sizing })));
    setPreview(null);
  }

  function value(axis: ResizeAxis) {
    const sizing = previewRef.current ?? savedSizing;
    return (axis === "column" ? sizing?.columnSpan : sizing?.rowSpan) ?? 1;
  }

  function begin(axis: ResizeAxis, event: PointerEvent<HTMLButtonElement>) {
    if (!writable) return;
    event.preventDefault();
    event.stopPropagation();
    const wrapper = event.currentTarget.closest<HTMLElement>(".studio-nested-block");
    const tracks = gridTracks(wrapper?.parentElement ?? null, axis);
    const maximum = 16;
    const startSpan = value(axis);
    gestureRef.current = { axis, pointerId: event.pointerId, start: axis === "column" ? event.clientX : event.clientY, startSpan, stride: tracks.stride, maximum, latest: startSpan, moved: false };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(axis: ResizeAxis, event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.axis !== axis) return;
    const position = axis === "column" ? event.clientX : event.clientY;
    const delta = position - gesture.start;
    if (Math.abs(delta) >= 2) gesture.moved = true;
    const next = gridSpanFromDelta(gesture.startSpan, delta, gesture.stride, gesture.maximum);
    if (next !== value(axis)) {
      gesture.latest = next;
      setPreview({ ...savedSizing, ...previewRef.current, [axis === "column" ? "columnSpan" : "rowSpan"]: next });
    }
  }

  function end(axis: ResizeAxis, event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.axis !== axis) return;
    gestureRef.current = null;
    if (cancelled) {
      setPreview(null);
      return;
    }
    if (gesture.moved && gesture.latest !== gesture.startSpan) {
      suppressClickRef.current = true;
      commit(axis, gesture.latest);
    }
  }

  function onKeyDown(axis: ResizeAxis, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && gestureRef.current) {
      gestureRef.current = null;
      setPreview(null);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const maximum = 16;
    const next = gridSpanFromKey(value(axis), event.key, axis, maximum);
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    commit(axis, next);
  }

  function onClick(axis: ResizeAxis) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const maximum = 16;
    commit(axis, Math.min(maximum, value(axis) + 1));
  }

  const applied = previewSizing ?? savedSizing;
  const column = applied?.columnSpan ?? 1;
  const row = applied?.rowSpan ?? 1;
  const gridItem = parent.type === "group" && parent.layout === "grid";
  const showHandles = selected && writable && gridItem;

  return <div className={`studio-nested-block${showHandles ? " grid-editable-child" : ""}`} style={{ ...style, ...(gridItem ? { gridColumn: `span ${column}`, gridRow: `span ${row}` } : {}) }} data-studio-insertion-position={insertionPosition ? "true" : undefined} data-block-align={blockAlign} data-studio-nested-block-id={child.id} data-studio-selected={selected} data-studio-hovered={hovered} tabIndex={-1}>
    {children}
    {showHandles ? <>
      <span className="visually-hidden" id={instructionsId}>Drag to resize the span. Use arrow keys to change it, or press Enter or Space to increase it by one track.</span>
      <button className="grid-child-resize-handle grid-child-resize-handle--column" type="button" aria-label="Resize Grid column span" aria-describedby={instructionsId} title="Resize columns" onPointerDown={event => begin("column", event)} onPointerMove={event => move("column", event)} onPointerUp={event => end("column", event)} onPointerCancel={event => end("column", event, true)} onLostPointerCapture={event => end("column", event, true)} onKeyDown={event => onKeyDown("column", event)} onClick={() => onClick("column")} />
      <button className="grid-child-resize-handle grid-child-resize-handle--row" type="button" aria-label="Resize Grid row span" aria-describedby={instructionsId} title="Resize rows" onPointerDown={event => begin("row", event)} onPointerMove={event => move("row", event)} onPointerUp={event => end("row", event)} onPointerCancel={event => end("row", event, true)} onLostPointerCapture={event => end("row", event, true)} onKeyDown={event => onKeyDown("row", event)} onClick={() => onClick("row")} />
    </> : null}
  </div>;
}
