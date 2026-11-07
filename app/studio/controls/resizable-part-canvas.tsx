"use client";

import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { useCentredPreviewResize } from "./use-centred-preview-resize";
import { partCanvasResizeBounds, type NavigationCanvasResizeEdge } from "../navigation-canvas-resize";
import { clampPreviewWidth } from "./preview-frame-size";
import "./resizable-preview-frame.css";
import "./resizable-part-canvas.css";

/** A content-fitting canvas whose width remains owned by its host. */
export function ResizablePartCanvas({ children, width, onWidthChange, onReset, renderFrame, measureFrame = false, onGeometry, snapshotWidth, onRestore, requestedWidth, zoom = 100 }: { children: ReactNode; zoom?: number; width: number; onWidthChange: (width: number) => void; onReset: () => void; measureFrame?: boolean; onGeometry?: (width: number, overhead: number) => void; requestedWidth?: number | null; snapshotWidth?: () => number | null; onRestore?: (width: number | null) => void; renderFrame?: (frame: { id: string; width: number; controls: ReactNode; resizing: NavigationCanvasResizeEdge | null; children: ReactNode }) => ReactNode }) {
  const id = useId();
  const [measured, setMeasured] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const region = document.getElementById(id);
    const surface = region?.parentElement;
    const article = region?.closest("article");
    const stage = region?.closest("[data-part-preview-stage], .editor-canvas-scroll");
    if (!region || !surface || (measureFrame && !article)) return;
    const stageElement = stage instanceof HTMLElement ? stage : null;
    const previousOverlayHeight = stageElement?.style.getPropertyValue("--studio-part-overlay-height");
    const measure = () => {
      const actual = region.offsetWidth;
      const horizontal = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
      };
      const overhead = measureFrame && article ? horizontal(surface) + horizontal(article) : 0;
      const scale = region.getBoundingClientRect().width / region.offsetWidth || 1;
      // Preview zoom enlarges the canvas inside its scroll surface. Keep the
      // width bound in unzoomed CSS pixels so zoom can overflow and scroll.
      if (stage) setAvailableWidth(partCanvasResizeBounds(stage.clientWidth - horizontal(stage), overhead).max);
      if (stageElement) {
        const style = getComputedStyle(stageElement);
        const height = stageElement.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
        // Overlay height belongs to the visible preview stage, not saved content.
        stageElement.style.setProperty("--studio-part-overlay-height", `${Math.max(0, height) / scale}px`);
      }
      if (measureFrame && article) { setMeasured(actual); onGeometry?.(actual, overhead); }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region); observer.observe(surface); if (article) observer.observe(article); if (stage) observer.observe(stage);
    return () => {
      observer.disconnect();
      if (stageElement) {
        if (previousOverlayHeight) stageElement.style.setProperty("--studio-part-overlay-height", previousOverlayHeight);
        else stageElement.style.removeProperty("--studio-part-overlay-height");
      }
    };
  }, [id, measureFrame, onGeometry, zoom]);
  const desiredWidth = measureFrame ? (requestedWidth ?? availableWidth ?? measured ?? width) : width;
  const maximum = availableWidth ?? desiredWidth;
  // availableWidth is already a resolved maximum; never subtract its gutters twice.
  const bounds = { min: Math.min(320, maximum), max: maximum };
  const actualWidth = clampPreviewWidth(desiredWidth, bounds);
  const resize = useCentredPreviewResize({ width: actualWidth, bounds, snapshot: () => snapshotWidth ? snapshotWidth() : actualWidth, restore: value => onRestore ? onRestore(value) : onWidthChange(value ?? actualWidth), onChange: onWidthChange, onReset, stopPropagation: true, scale: target => target.getBoundingClientRect().width / target.offsetWidth });
  const handle = (edge: NavigationCanvasResizeEdge) => {
    const offset = -24 / Math.max(1, zoom / 100);
    // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role -- A focusable value-bearing separator follows the window splitter pattern.
    return <button key={edge} type="button" role="separator" aria-orientation="vertical" aria-label={`Resize template preview from ${edge} edge`} aria-controls={id} aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={actualWidth} aria-valuetext={`${actualWidth} pixels`} aria-describedby={`${id}-help`} className={`studio-preview-resize-handle studio-part-resize-handle is-${edge}`} style={edge === "left" ? { left: offset } : { right: offset }} {...resize.handlers(edge)} />;
  };
  const controls = <>{handle("left")}{handle("right")}<span id={`${id}-help`} hidden>Drag or use Left and Right arrows to resize. Hold Shift for larger steps. Home and End set the minimum and maximum; Enter or double-click fits the available space. Escape cancels a drag.</span></>;
  return renderFrame ? renderFrame({ id, width: actualWidth, controls, resizing: resize.active, children }) : <div id={id} style={{ width: actualWidth, marginInline: "auto" }} className="studio-part-resize-frame" data-resizing={resize.active || undefined}>{children}{controls}</div>;
}
