"use client";

import { SelectControl } from "../../controls/native-fields";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RotationHandle } from "../../controls/rotation-handle";
import { formatRotationAngle, rotationFromKey, rotationCursorCss, rotationFromPointer, rotationPointerAngle, type RotationBox, type RotationPoint } from "../../controls/rotation-geometry";
import { ToggleSetting } from "../../controls/toggle-setting";
import { HistoryActions } from "../../controls/history-actions";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";

type Gesture = { original: RotationBox; startAngle: number; pointerId: number };

/** Temporary adapter; production rendering and rotation calculations are shared with Design. */
export function RotationHandleSpecimen() {
  const [history, setHistory] = useState({ values: [30], index: 0 });
  const [draft, setDraft] = useState<number | null>(null);
  const [cursor, setCursor] = useState<RotationPoint | null>(null);
  const [zoom, setZoom] = useState(100);
  const [readOnly, setReadOnly] = useState(false);
  const [viewportScale, setViewportScale] = useState(1);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const returnFocus = useRef(false);
  const rotation = draft ?? history.values[history.index];
  const object: RotationBox = { x: -50, y: -32, width: 100, height: 64, rotation };
  const scale = zoom / 100;

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportScale(element.getBoundingClientRect().width / 320 || 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (returnFocus.current && draft === null) {
      returnFocus.current = false;
      if (!readOnly) svg.current?.querySelector<SVGCircleElement>(".studio-rotation-handle")?.focus();
    }
  }, [draft, readOnly]);

  function commit(value: number) {
    setHistory(current => current.values[current.index] === value ? current : { values: [...current.values.slice(0, current.index + 1), value], index: current.index + 1 });
  }
  function finish(cancel = false, pointerId?: number) {
    const active = gesture.current;
    if (!active || (pointerId !== undefined && pointerId !== active.pointerId)) return;
    gesture.current = null;
    if (svg.current?.hasPointerCapture(active.pointerId)) svg.current.releasePointerCapture(active.pointerId);
    if (!cancel && !readOnly && draft !== null) commit(draft);
    returnFocus.current = true;
    setDraft(null); setCursor(null);
  }
  function point(event: PointerEvent<SVGElement>): RotationPoint | null {
    const matrix = world.current?.getScreenCTM();
    if (!matrix || !svg.current) return null;
    const p = svg.current.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  }
  function begin(event: PointerEvent<SVGCircleElement>) {
    if (readOnly || gesture.current || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
    const p = point(event);
    if (!p) return;
    gesture.current = { original: object, startAngle: rotationPointerAngle(object, p), pointerId: event.pointerId };
    svg.current?.setPointerCapture(event.pointerId);
    svg.current?.focus();
    setDraft(rotation); setCursor(p);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId || readOnly) return;
    const p = point(event);
    if (p) { setDraft(rotationFromPointer(active.original, active.startAngle, p)); setCursor(p); }
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
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Delegates shortcuts from focusable specimen controls.
  return <div className="ui-rotation-specimen" role="group" aria-label="Rotation handle example" onKeyDown={shortcut}>
    <div className="ui-rotation-tools">
      <label>Zoom <SelectControl aria-label="Rotation example zoom" value={zoom} disabled={draft !== null} onChange={event => setZoom(Number(event.target.value))}><option value={50}>50%</option><option value={100}>100%</option><option value={200}>200%</option></SelectControl></label>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={value => { finish(true); setReadOnly(value); }} />
      <span className="ui-rotation-history"><HistoryActions presentation="labelled" onUndo={() => restore(-1)} onRedo={() => restore(1)} canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} disabled={readOnly || draft !== null} /></span>
    </div>
    <svg ref={svg} className={`ui-rotation-stage${draft !== null ? " is-rotating" : ""}`} viewBox="0 0 320 340" style={{ cursor: draft !== null ? rotationCursorCss(rotation) : undefined }} role="group" tabIndex={-1} aria-label="Temporary rotation canvas" onPointerMove={move} onPointerUp={event => finish(false, event.pointerId)} onPointerCancel={event => finish(true, event.pointerId)} onLostPointerCapture={event => finish(true, event.pointerId)}>
      <g ref={world} transform={`translate(160 150) scale(${scale})`}>
        <g transform={`translate(${object.x} ${object.y}) rotate(${rotation} 50 32)`}>
          <rect className="ui-rotation-object" width={100} height={64} rx={4} />
          <RotationHandle object={object} controlScale={1 / (scale * viewportScale)} rotating={draft !== null} cursor={cursor} disabled={readOnly} onPointerDown={begin} onKeyDown={event => {
            const next = rotationFromKey(rotation, event.key, event.shiftKey);
            if (next !== null && !readOnly) { event.preventDefault(); event.stopPropagation(); commit(next); }
          }} />
        </g>
      </g>
    </svg>
    <p role="status">Rotation: {formatRotationAngle(rotation)} · History position {history.index} of {history.values.length - 1}.</p>
    <p>Drag the circular handle. Left/Right rotates by 5°; Shift+Left/Right uses 15°. Escape cancels a drag. Undo/Redo and their standard shortcuts apply while this example has focus.</p>
  </div>;
}
