"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useCentredPreviewResize } from "./use-centred-preview-resize";
import { clampPreviewWidth, previewFrameBounds, previewFrameHeight } from "./preview-frame-size";
import "./resizable-preview-frame.css";

/** Preview geometry only; content and style history remain with their existing owners. */
export function ResizablePreviewFrame({ children, style, className = "", preferredWidth }: { children: ReactNode; style?: CSSProperties; className?: string; preferredWidth?: number | null }) {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [request, setRequest] = useState({ preferredWidth, value: preferredWidth ?? null });
  const requested = preferredWidth !== request.preferredWidth && preferredWidth !== undefined ? preferredWidth : request.value;
  if (preferredWidth !== request.preferredWidth) setRequest({ preferredWidth, value: requested });
  const setRequested = (value: number | null) => setRequest(current => ({ ...current, value }));
  const bounds = previewFrameBounds(available.width);
  const width = clampPreviewWidth(requested ?? bounds.max, bounds);
  const height = previewFrameHeight(width, bounds.max, available.height);
  const resize = useCentredPreviewResize({ width, bounds, snapshot: () => requested, restore: setRequested, onChange: setRequested, onReset: () => setRequested(null), endResets: true, scale: () => {
    const element = stage.current;
    return element ? element.getBoundingClientRect().width / element.clientWidth : 1;
  } });
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setAvailable({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={stage} className={`studio-preview-stage ${className}`} data-resizing={Boolean(resize.active) || undefined}>
    <div className="studio-preview-frame" style={{ width: available.width ? width : "calc(100% - 48px)", height: available.height ? height : "100%" }}>
      <div id={id} className="studio-preview-frame-content" style={style}>{children}</div>
      {/* A focusable, value-bearing separator follows the ARIA window-splitter pattern. */}
      {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
      <button type="button" role="separator" aria-orientation="vertical" aria-label="Resize preview"
        aria-controls={id} aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={width}
        aria-valuetext={`${width} pixels`} aria-describedby={`${id}-help`} className="studio-preview-resize-handle"
        {...resize.handlers("left")} />
      <span id={`${id}-help`} hidden>Drag to resize. Left expands; Right narrows. Hold Shift for larger steps. Home sets the minimum; End, Enter or double-click fits the available space. Escape cancels a drag.</span>
    </div>
  </div>;
}
