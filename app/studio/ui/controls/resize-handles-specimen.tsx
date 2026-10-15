"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { resizeSpecimenLayout } from "./resize-specimen-layout";
import { PageResizeSpecimen } from "./page-resize-specimen";
import { CanvasHandle } from "../../controls/canvas-handle";
import { HistoryActions } from "../../controls/history-actions";
import { ToggleSetting } from "../../controls/toggle-setting";
import { DesignObjectArtwork } from "../../design-artwork";
import type { DesignAsset, DesignObject } from "../../design-model";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../../resize-drag";
import { resizeRotatedObject, resizeFromKey, resizeCursor, shouldKeepResizeRatio, type ResizeHandle } from "../../design-transform";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";

const positions: Array<[ResizeHandle, string]> = [["nw", "top left"], ["n", "top middle"], ["ne", "top right"], ["e", "right middle"], ["se", "bottom right"], ["s", "bottom middle"], ["sw", "bottom left"], ["w", "left middle"]];
const sampleImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#c9e6ff"/><circle cx="120" cy="24" r="12" fill="#ffcf5c"/><path d="M0 90V70L50 25L100 80L130 50L160 75V90Z" fill="#4c9972"/></svg>');
const assets: DesignAsset[] = [{ id: "resize-example", name: "Example landscape", type: "image/svg+xml", dataUrl: sampleImage, width: 160, height: 90 }];
function initialObject(type: "rectangle" | "image", rotation = 0): DesignObject {
  const base = { id: "resize-example", x: -80, y: -45, width: 160, height: 90, rotation, opacity: 1 };
  return type === "image" ? { ...base, type, assetId: "resize-example" } : { ...base, type, shape: "hexagon", fill: "#e0e7ff", stroke: "#3858e9", strokeWidth: 1 };
}
type Gesture = { resize: ResizeDrag<DesignObject>; original: DesignObject; latest: DesignObject; start: { x: number; y: number }; handle: ResizeHandle; pointerId: number; centred: boolean };

/** Sample state only; handles, artwork, geometry, cursors, and keyboard policy are production components. */
export function ResizeHandlesSpecimen() {
  const [target, setTarget] = useState<"rectangle" | "image" | "page">("rectangle");
  return <div role="group" aria-label="Resize handles example">
    <div className="ui-rotation-tools"><label>Target <select aria-label="Resize example target" value={target} onChange={event => setTarget(event.target.value as typeof target)}><option value="rectangle">Shape</option><option value="image">Image</option><option value="page">Page</option></select></label></div>
    {target === "page" ? <PageResizeSpecimen /> : <ObjectResizeHandlesSpecimen key={target} type={target} />}
  </div>;
}

function ObjectResizeHandlesSpecimen({ type }: { type: "rectangle" | "image" }) {
  const [history, setHistory] = useState({ values: [initialObject(type)], index: 0 });
  const [draft, setDraft] = useState<DesignObject | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [zoom, setZoom] = useState(100);
  const [readOnly, setReadOnly] = useState(false);
  const [viewportScale, setViewportScale] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(420);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const previousLayout = useRef({ left: 0, top: 0 });
  const gesture = useRef<Gesture | null>(null);
  const object = draft ?? history.values[history.index];
  const scale = zoom / 100;
  const layout = resizeSpecimenLayout(object, zoom, viewportScale, viewportWidth);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => { setViewportWidth(element.clientWidth); setViewportScale(Math.min(1, element.clientWidth / 420) || 1); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    // Expanding to the left/top must not shift the grabbed handle on screen.
    element.scrollLeft += (previousLayout.current.left - layout.left) * viewportScale;
    element.scrollTop += (previousLayout.current.top - layout.top) * viewportScale;
    previousLayout.current = { left: layout.left, top: layout.top };
  }, [layout.left, layout.top, viewportScale]);
  function commit(next: DesignObject) {
    setHistory(current => {
      const previous = current.values[current.index];
      if (["x", "y", "width", "height", "rotation"].every(key => previous[key as keyof DesignObject] === next[key as keyof DesignObject])) return current;
      return { values: [...current.values.slice(0, current.index + 1), next], index: current.index + 1 };
    });
  }
  function point(event: PointerEvent<SVGElement>) {
    const matrix = world.current?.getScreenCTM();
    if (!matrix || !svg.current) return null;
    const p = svg.current.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  }
  function finish(cancel = false, pointerId?: number, restoreFocus = true) {
    const active = gesture.current;
    if (!active || (pointerId !== undefined && active.pointerId !== pointerId)) return;
    gesture.current = null;
    if (svg.current?.hasPointerCapture(active.pointerId)) svg.current.releasePointerCapture(active.pointerId);
    if (!cancel && !readOnly) commit(active.latest);
    setDraft(null); setActiveHandle(null);
    if (restoreFocus && !readOnly) queueMicrotask(() => svg.current?.querySelector<SVGCircleElement>(`[aria-label="Resize example from ${positions.find(([handle]) => handle === active.handle)?.[1]}"]`)?.focus({ preventScroll: true }));
  }
  function begin(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) {
    if (readOnly || gesture.current || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const start = point(event); if (!start) return;
    gesture.current = { resize: beginResizeDrag(object, start, shouldKeepResizeRatio(object, event.shiftKey)), original: object, latest: object, start, handle, pointerId: event.pointerId, centred: event.altKey };
    svg.current?.setPointerCapture(event.pointerId); svg.current?.focus(); setActiveHandle(handle); setDraft(object);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId || readOnly) return;
    const p = point(event); if (!p) return;
    active.latest = updateResizeDrag(active.resize, p, shouldKeepResizeRatio(active.original, event.shiftKey), (basis, dx, dy, keepRatio) => resizeRotatedObject(basis, active.handle, dx, dy, keepRatio, active.centred));
    setDraft(active.latest);
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
  return <div role="group" aria-label="Object resize example" onKeyDown={shortcut}>
    <div className="ui-rotation-tools">
      <label>Zoom <select aria-label="Resize example zoom" value={zoom} disabled={draft !== null} onChange={event => setZoom(Number(event.target.value))}><option value={50}>50%</option><option value={100}>100%</option><option value={200}>200%</option></select></label>
      <label>Rotation <select aria-label="Resize example rotation" value={object.rotation} disabled={draft !== null || readOnly} onChange={event => commit({ ...object, rotation: Number(event.target.value) })}><option value={0}>0°</option><option value={45}>45°</option><option value={90}>90°</option></select></label>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={value => { finish(true, undefined, false); setReadOnly(value); }} />
      <HistoryActions presentation="labelled" canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} disabled={readOnly || draft !== null} onUndo={() => restore(-1)} onRedo={() => restore(1)} />
    </div>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scroll region needs keyboard access. */}
    <div ref={viewport} className="ui-resize-viewport" role="region" aria-label="Scrollable resize example canvas" tabIndex={0} style={{ height: 420 * viewportScale }}>
    <svg ref={svg} className="ui-resize-stage" viewBox={`${layout.left} ${layout.top} ${layout.width} ${layout.height}`} style={{ width: layout.width * viewportScale, height: layout.height * viewportScale }} tabIndex={-1} role="group" aria-label="Temporary resize canvas" onPointerMove={move} onPointerUp={event => finish(false, event.pointerId)} onPointerCancel={event => finish(true, event.pointerId)} onLostPointerCapture={event => finish(true, event.pointerId)}>
      <g ref={world} transform={`translate(210 210) scale(${scale})`}>
        <g transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`}>
          <DesignObjectArtwork object={object} assets={assets} />
          {positions.map(([handle, label]) => activeHandle !== null && activeHandle !== handle ? null : <CanvasHandle key={handle} aria-label={`Resize example from ${label}`} cx={handle.includes("e") ? object.width : handle.includes("w") ? 0 : object.width / 2} cy={handle.includes("s") ? object.height : handle.includes("n") ? 0 : object.height / 2} controlScale={1 / (scale * viewportScale)} cursor={resizeCursor(handle, object.rotation)} disabled={readOnly} onPointerDown={event => begin(event, handle)} onKeyDown={event => {
            if (readOnly || gesture.current) return;
            const next = resizeFromKey(object, handle, event.key, event.shiftKey);
            if (next) { event.preventDefault(); event.stopPropagation(); commit(next); }
          }} />)}
        </g>
      </g>
    </svg>
    </div>
    <p role="status">Size: {object.width.toFixed(2)} × {object.height.toFixed(2)} · Ratio: {(object.width / object.height).toFixed(3)} · History position {history.index} of {history.values.length - 1}.</p>
    <p>Drag any handle to resize proportionally. Scroll the canvas to reach enlarged objects and handles. Hold Shift to stretch; Alt resizes from the centre. Arrow keys resize by 1; Shift+Arrow resizes freely by 10. Escape cancels a drag. Undo/Redo and their standard shortcuts apply within this example.</p>
  </div>;
}
