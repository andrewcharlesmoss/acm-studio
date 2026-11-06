"use client";

import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { useCentredPreviewResize } from "./use-centred-preview-resize";
import { type NavigationCanvasResizeEdge } from "../navigation-canvas-resize";
import "./resizable-preview-frame.css";
import "./resizable-part-canvas.css";

/** A content-fitting canvas whose width remains owned by its host. */
export function ResizablePartCanvas({ children, width, onWidthChange, onReset, renderFrame, measureFrame = false, onGeometry, snapshotWidth, onRestore, requestedWidth }: { children: ReactNode; width: number; onWidthChange: (width: number) => void; onReset: () => void; measureFrame?: boolean; onGeometry?: (width: number, overhead: number) => void; requestedWidth?: number | null; snapshotWidth?: () => number | null; onRestore?: (width: number | null) => void; renderFrame?: (frame: { id: string; controls: ReactNode; resizing: NavigationCanvasResizeEdge | null; children: ReactNode }) => ReactNode }) {
  const id = useId();
  const [measured, setMeasured] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!measureFrame) return;
    const region = document.getElementById(id);
    const surface = region?.parentElement;
    const article = region?.closest("article");
    if (!region || !surface || !article) return;
    const measure = () => {
      const actual = region.offsetWidth;
      const horizontal = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
      };
      setMeasured(actual);
      onGeometry?.(actual, horizontal(surface) + horizontal(article));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region); observer.observe(surface); observer.observe(article);
    return () => observer.disconnect();
  }, [id, measureFrame, onGeometry]);
  const actualWidth = measureFrame && measured !== null ? (requestedWidth ?? measured) : width;
  const bounds = { min: Math.min(320, actualWidth), max: Math.max(1200, actualWidth) };
  const resize = useCentredPreviewResize({ width: actualWidth, bounds, snapshot: () => snapshotWidth ? snapshotWidth() : actualWidth, restore: value => onRestore ? onRestore(value) : onWidthChange(value ?? actualWidth), onChange: onWidthChange, onReset, stopPropagation: true, scale: target => target.getBoundingClientRect().width / target.offsetWidth });
  // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role -- A focusable value-bearing separator follows the window splitter pattern.
  const handle = (edge: NavigationCanvasResizeEdge) => <button key={edge} type="button" role="separator" aria-orientation="vertical" aria-label={`Resize template preview from ${edge} edge`} aria-controls={id} aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={actualWidth} aria-valuetext={`${actualWidth} pixels`} aria-describedby={`${id}-help`} className={`studio-preview-resize-handle studio-part-resize-handle is-${edge}`} {...resize.handlers(edge)} />;
  const controls = <>{handle("left")}{handle("right")}<span id={`${id}-help`} hidden>Drag or use Left and Right arrows to resize. Hold Shift for larger steps. Home and End set the minimum and maximum; Enter or double-click resets. Escape cancels a drag.</span></>;
  return renderFrame ? renderFrame({ id, controls, resizing: resize.active, children }) : <div id={id} className="studio-part-resize-frame" data-resizing={resize.active || undefined}>{children}{controls}</div>;
}
