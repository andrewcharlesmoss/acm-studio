"use client";

import type { CSSProperties, KeyboardEventHandler, PointerEventHandler } from "react";
import "./canvas-handle.css";

/** SVG-local handle. Owners retain geometry, permissions, and editing transactions. */
export function CanvasHandle({ cx, cy, controlScale, cursor, disabled = false, "aria-label": label, "aria-describedby": describedBy, onPointerDown, onKeyDown }: {
  cx: number;
  cy: number;
  controlScale: number;
  cursor: CSSProperties["cursor"];
  disabled?: boolean;
  "aria-label": string;
  "aria-describedby"?: string;
  onPointerDown: PointerEventHandler<SVGCircleElement>;
  onKeyDown?: KeyboardEventHandler<SVGCircleElement>;
}) {
  return <circle role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-describedby={describedBy} aria-disabled={disabled || undefined} className="studio-canvas-handle" cx={cx} cy={cy} r={8 * controlScale} style={{ cursor }} onPointerDown={event => { if (!disabled) onPointerDown(event); }} onKeyDown={event => { if (!disabled) onKeyDown?.(event); }} />;
}
