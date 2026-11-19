"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { beginCanvasMove, canvasMoveDelta, canvasMoveKeyDelta, moveCanvasPlacement, type CanvasMove } from "../canvas-move";
import { PageResizeHandles } from "../controls/page-resize-handles";
import { commitPageResizePlacement, pageResizeLayout, type PageResizePlacement } from "../design-page-frame";
import type { ResizeHandle } from "../design-transform";
import { resizePageFromKey } from "../page-resize";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "../resize-drag";
import { shouldCommitResizeGesture, type ResizeGestureEnd } from "../resize-gesture-policy";
import type { MotionAsset, MotionPreviewGeometry } from "./motion-asset";
import { resizeMotion, type MotionSize } from "./motion-resize";

type MotionPlacement = PageResizePlacement & { scaleFactor: number };

type Gesture = {
  original: MotionSize;
  originalBox: MotionSize;
  drag: ResizeDrag<MotionSize>;
  handle: ResizeHandle;
  pointerId: number;
  scale: number;
  placement: MotionPlacement;
};

type MoveGesture = {
  drag: CanvasMove;
  placement: MotionPlacement;
  previous: MotionPlacement | null;
};

export function MotionPreviewStage({ asset, path, geometry, onResize, onResizeDraft }: {
  asset: MotionAsset;
  path: string;
  geometry: MotionPreviewGeometry;
  onResize: (size: MotionSize) => void;
  onResizeDraft: (size: MotionSize | null) => void;
}) {
  const footprint = useRef<HTMLDivElement>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const moveGesture = useRef<MoveGesture | null>(null);
  const [renderWidth, setRenderWidth] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [liveResize, setLiveResize] = useState<Gesture | null>(null);
  const [placement, setPlacement] = useState<MotionPlacement | null>(null);
  const [moving, setMoving] = useState(false);

  useLayoutEffect(() => {
    const element = footprint.current;
    const stage = element?.parentElement;
    if (!element || !stage) return;
    const measure = () => {
      setRenderWidth(element.getBoundingClientRect().width);
      setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => () => onResizeDraft(null), [onResizeDraft]);

  const box = geometry.boxFor(asset);
  const activePlacement = liveResize?.placement ?? placement;
  const original = activePlacement?.basis ?? box;
  const footprintScale = renderWidth / original.width;
  const scale = footprintScale * (activePlacement?.scaleFactor ?? 1);
  const fit = { ...stageSize, margin: 10, footprint: { width: renderWidth, height: original.height * footprintScale } };
  const layout = activePlacement ? pageResizeLayout(box, scale * 100,
    liveResize ? { ...liveResize.originalBox, handle: liveResize.handle } : null,
    { placement: activePlacement, fit }).frame : undefined;
  const displayWidth = layout?.width ?? renderWidth;
  const displayHeight = layout?.height ?? displayWidth * box.height / box.width;
  // Adjacent corner and midpoint handles need room for their 16 px targets.
  const roomAcross = displayWidth >= 32, roomDown = displayHeight >= 32;
  const availableHandles: ResizeHandle[] = [];
  if (roomAcross && roomDown) availableHandles.push("nw", "ne", "se", "sw");
  if (roomAcross && geometry.span.width > 0) availableHandles.push("w", "e");
  if (roomDown && geometry.span.height > 0) availableHandles.push("n", "s");
  if (!availableHandles.length) availableHandles.push("se");

  function displayedPlacement(frameScale = scale): MotionPlacement {
    return {
      basis: { width: original.width, height: original.height },
      scaleFactor: frameScale / footprintScale,
      x: (layout?.left ?? 0) / frameScale,
      y: (layout?.top ?? 0) / frameScale,
    };
  }

  function moveSketch(origin: MotionPlacement, delta: { x: number; y: number }) {
    const next = moveCanvasPlacement(origin, delta, candidate => {
      const { frame } = pageResizeLayout(box, scale * 100, null, { placement: candidate, fit });
      return { ...candidate, x: frame.left / scale, y: frame.top / scale };
    });
    setPlacement(next);
  }

  function finishMove(artboard: HTMLDivElement, pointerId: number, reason: ResizeGestureEnd) {
    const current = moveGesture.current;
    if (!current || current.drag.pointerId !== pointerId) return;
    moveGesture.current = null;
    setMoving(false);
    if (!shouldCommitResizeGesture(reason)) setPlacement(current.previous);
    if (artboard.hasPointerCapture(pointerId)) artboard.releasePointerCapture(pointerId);
  }

  function begin(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) {
    const svg = overlay.current;
    if (event.button !== 0 || !svg || gesture.current || moveGesture.current) return;
    const scale = svg.getBoundingClientRect().width / box.width;
    if (!scale) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const original = { width: asset.width, height: asset.height };
    const origin = { x: event.clientX / scale, y: event.clientY / scale };
    const next = { original, originalBox: box, drag: beginResizeDrag(original, origin, !event.shiftKey), handle, pointerId: event.pointerId, scale,
      placement: displayedPlacement(scale) };
    gesture.current = next;
    svg.setPointerCapture(event.pointerId);
    setLiveResize(next);
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = { x: event.clientX / current.scale, y: event.clientY / current.scale };
    const size = updateResizeDrag(current.drag, point, !event.shiftKey,
      (basis, dx, dy, keepRatio) => {
        // A handle covers the drawn fraction of the export width or height.
        const widthDelta = geometry.span.width ? dx / Math.max(geometry.span.width, 0.05) : 0;
        const heightDelta = geometry.span.height ? dy / Math.max(geometry.span.height, 0.05) : 0;
        return resizeMotion(basis, current.handle, widthDelta, heightDelta, keepRatio, current.drag.latest);
      });
    onResizeDraft(size);
  }

  function commitResize(previousBox: MotionSize, next: MotionSize, handle: ResizeHandle, start: MotionPlacement) {
    const focused = document.activeElement;
    setPlacement({ ...commitPageResizePlacement(geometry.boxFor(next), { ...previousBox, handle }, start), scaleFactor: start.scaleFactor });
    onResize(next);
    if (overlay.current?.contains(focused)) requestAnimationFrame(() => {
      // Compact frames can replace the focused corner with an edge handle.
      if (!focused?.isConnected && document.activeElement === document.body) {
        overlay.current?.querySelector<SVGCircleElement>(".studio-canvas-handle")?.focus({ preventScroll: true });
      }
    });
  }

  function finish(reason: ResizeGestureEnd, pointerId?: number) {
    const current = gesture.current;
    if (!current || (pointerId !== undefined && pointerId !== current.pointerId)) return;
    gesture.current = null;
    const svg = overlay.current;
    if (svg?.hasPointerCapture(current.pointerId)) svg.releasePointerCapture(current.pointerId);
    setLiveResize(null);
    onResizeDraft(null);
    const { width, height } = current.drag.latest;
    if (shouldCommitResizeGesture(reason) && (width !== current.original.width || height !== current.original.height)) {
      commitResize(current.originalBox, { width, height }, current.handle, current.placement);
    }
  }

  return <div className="motion-stage">
    <div className="motion-artboard-footprint" ref={footprint} style={{
      aspectRatio: `${original.width} / ${original.height}`,
      width: `min(100%, ${original.width}px, calc(var(--motion-artboard-max-height) * ${original.width / original.height}))`,
    }}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The focused preview supports keyboard positioning as an alternative to dragging. */}
      <div className="motion-artboard" style={layout} data-moving={moving || undefined} role="group" aria-label="Move sketch with the arrow keys" tabIndex={0}
        onPointerDown={event => {
          if (event.button !== 0 || !scale || gesture.current || moveGesture.current) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          moveGesture.current = {
            drag: beginCanvasMove(event.pointerId, { x: event.clientX, y: event.clientY }),
            placement: displayedPlacement(), previous: placement,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setMoving(true);
        }}
        onPointerMove={event => {
          const current = moveGesture.current;
          if (!scale || !current) return;
          const delta = canvasMoveDelta(current.drag, event.pointerId, { x: event.clientX, y: event.clientY });
          if (delta) moveSketch(current.placement, { x: delta.x / scale, y: delta.y / scale });
        }}
        onPointerUp={event => finishMove(event.currentTarget, event.pointerId, "pointer-up")}
        onPointerCancel={event => finishMove(event.currentTarget, event.pointerId, "pointer-cancel")}
        onLostPointerCapture={event => finishMove(event.currentTarget, event.pointerId, "capture-loss")}
        onBlur={event => {
          const current = moveGesture.current;
          if (current) finishMove(event.currentTarget, current.drag.pointerId, "escape");
        }}
        onKeyDown={event => {
          const current = moveGesture.current;
          if (current && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finishMove(event.currentTarget, current.drag.pointerId, "escape");
          }
          if (!scale || current || gesture.current || event.metaKey || event.ctrlKey || event.altKey) return;
          const delta = canvasMoveKeyDelta(event.key, event.shiftKey, 1 / scale);
          if (!delta) return;
          event.preventDefault();
          moveSketch(displayedPlacement(), delta);
        }}>
        <svg width={asset.width} height={asset.height} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="img" aria-label={`${asset.name} animation preview`}>
          {path ? <path d={path} fill="none" stroke={asset.colour} strokeWidth={asset.thickness} strokeLinecap="round" strokeLinejoin="round" /> : null}
        </svg>
      </div>
      {displayWidth > 0 ? <svg ref={overlay} className="motion-resize-overlay" style={layout} role="group" aria-label="Sketch resize handles"
        viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        onPointerMove={move} onPointerUp={event => finish("pointer-up", event.pointerId)}
        onPointerCancel={event => finish("pointer-cancel", event.pointerId)}
        onLostPointerCapture={event => finish("capture-loss", event.pointerId)}>
        <PageResizeHandles page={{ width: displayWidth, height: displayHeight }} controlScale={1} labelSubject="sketch"
          availableHandles={availableHandles}
          activeHandle={liveResize?.handle} onPointerDown={begin} onKeyDown={(event, handle) => {
            if (gesture.current) {
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish("escape"); }
              return;
            }
            const previous = { width: asset.width, height: asset.height };
            const next = resizePageFromKey(previous, handle, event.key, event.shiftKey, resizeMotion);
            if (!next) return;
            event.preventDefault();
            if (next.width !== previous.width || next.height !== previous.height) commitResize(box, next, handle, displayedPlacement(displayWidth / box.width));
          }} />
      </svg> : null}
    </div>
  </div>;
}
