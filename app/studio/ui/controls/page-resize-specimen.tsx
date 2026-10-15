"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { HistoryActions } from "../../controls/history-actions";
import { PageResizeHandles } from "../../controls/page-resize-handles";
import { ToggleSetting } from "../../controls/toggle-setting";
import { DesignPageFrame } from "../../design-page-frame";
import { resizeCursor, type ResizeHandle } from "../../design-transform";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import { resizePage, resizePageFromKey } from "../../page-resize";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";

type PageSize = { width: number; height: number };
type Gesture = { resize: ResizeDrag<PageSize>; original: PageSize; latest: PageSize; handle: ResizeHandle; pointerId: number; startX: number; startY: number; scaleX: number; scaleY: number; label: string | null };
const initialPage: PageSize = { width: 320, height: 180 };

/** Fixtures and history stay in memory; page geometry, handles, and layout are production components. */
export function PageResizeSpecimen() {
  const [history, setHistory] = useState({ values: [initialPage], index: 0 });
  const [draft, setDraft] = useState<PageSize | null>(null);
  const [active, setActive] = useState<Gesture | null>(null);
  const [zoom, setZoom] = useState(100);
  const [readOnly, setReadOnly] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const page = draft ?? history.values[history.index];

  function commit(next: PageSize) {
    setHistory(current => {
      const previous = current.values[current.index];
      if (previous.width === next.width && previous.height === next.height) return current;
      return { values: [...current.values.slice(0, current.index + 1), next], index: current.index + 1 };
    });
  }
  function finish(cancel = false, pointerId?: number, restoreFocus = true) {
    const current = gesture.current;
    if (!current || (pointerId !== undefined && current.pointerId !== pointerId)) return;
    gesture.current = null;
    if (svg.current?.hasPointerCapture(current.pointerId)) svg.current.releasePointerCapture(current.pointerId);
    if (!cancel && !readOnly) commit(current.latest);
    setDraft(null); setActive(null);
    if (restoreFocus && current.label) queueMicrotask(() => {
      const handle = Array.from(svg.current?.querySelectorAll<SVGCircleElement>("[aria-label]") ?? []).find(element => element.getAttribute("aria-label") === current.label);
      handle?.focus();
    });
  }
  function begin(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) {
    if (readOnly || gesture.current || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const rect = svg.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const next: Gesture = { resize: beginResizeDrag(page, { x: 0, y: 0 }, !event.shiftKey), original: page, latest: page, handle, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, scaleX: rect.width / page.width, scaleY: rect.height / page.height, label: event.currentTarget.getAttribute("aria-label") };
    gesture.current = next; setActive(next); setDraft(page);
    svg.current?.setPointerCapture(event.pointerId); svg.current?.focus();
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || readOnly) return;
    current.latest = updateResizeDrag(current.resize, { x: (event.clientX - current.startX) / current.scaleX, y: (event.clientY - current.startY) / current.scaleY }, !event.shiftKey, (basis, dx, dy, keepRatio) => resizePage(basis, current.handle, dx, dy, keepRatio));
    setDraft(current.latest);
  }
  function restore(offset: number) {
    if (readOnly || gesture.current) return;
    setHistory(current => ({ ...current, index: Math.max(0, Math.min(current.values.length - 1, current.index + offset)) }));
  }
  function shortcut(event: KeyboardEvent) {
    if (event.key === "Escape" && gesture.current) { event.preventDefault(); event.stopPropagation(); finish(true); return; }
    if (isNativeEditingTarget(event.target)) return;
    const action = workspaceHistoryShortcut(event, navigator.platform);
    if (action) { event.preventDefault(); event.stopPropagation(); restore(action === "undo" ? -1 : 1); }
  }
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Scoped history and Escape delegate from specimen controls.
  return <div role="group" aria-label="Page resize example" onKeyDown={shortcut}>
    <div className="ui-rotation-tools">
      <label>Zoom <select aria-label="Resize example zoom" value={zoom} disabled={active !== null} onChange={event => setZoom(Number(event.target.value))}><option value={50}>50%</option><option value={100}>100%</option><option value={200}>200%</option></select></label>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={value => { finish(true, undefined, false); setReadOnly(value); }} />
      <HistoryActions presentation="labelled" canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} disabled={readOnly || active !== null} onUndo={() => restore(-1)} onRedo={() => restore(1)} />
    </div>
    <div className="ui-page-resize-stage">
      <DesignPageFrame page={page} zoom={zoom} resize={active ? { ...active.original, handle: active.handle } : null}>
        <svg ref={svg} className="ui-page-resize-svg" viewBox={`0 0 ${page.width} ${page.height}`} role="group" tabIndex={-1} aria-label="Temporary page resize canvas" style={{ cursor: active ? resizeCursor(active.handle, 0) : undefined }} onPointerMove={move} onPointerUp={event => finish(false, event.pointerId)} onPointerCancel={event => finish(true, event.pointerId)} onLostPointerCapture={event => finish(true, event.pointerId)}>
          <rect width={page.width} height={page.height} fill="var(--acm-color-surface, #fff)" />
          <text x="20" y="32" fill="currentColor" fontSize="16">Example page</text>
          <PageResizeHandles page={page} controlScale={100 / zoom} activeHandle={active?.handle} disabled={readOnly} onPointerDown={begin} onKeyDown={(event, handle) => {
            if (readOnly || gesture.current) return;
            const next = resizePageFromKey(page, handle, event.key, event.shiftKey);
            if (next) { event.preventDefault(); event.stopPropagation(); commit(next); }
          }} />
        </svg>
      </DesignPageFrame>
    </div>
    <p role="status">Page size: {page.width} × {page.height} · Ratio: {(page.width / page.height).toFixed(3)} · History position {history.index} of {history.values.length - 1}.</p>
    <p>Drag a page edge or corner. The opposite edge stays anchored during the drag; the page recentres on release. Hold Shift to stretch. Arrow keys resize by 1; Shift+Arrow resizes freely by 10. Escape cancels a drag. Undo/Redo and their standard shortcuts affect only this example.</p>
  </div>;
}
