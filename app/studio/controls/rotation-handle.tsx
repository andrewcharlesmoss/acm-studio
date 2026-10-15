"use client";

import type { CSSProperties, KeyboardEventHandler, PointerEventHandler } from "react";
import { StudioIcon } from "../studio-icons";
import { formatRotationAngle, rotationBadgePoint, rotationCursorCss, type RotationBox, type RotationPoint } from "./rotation-geometry";
import "./rotation-handle.css";

/** SVG-local presentation. Owners retain coordinate conversion, permission and transactions. */
export function RotationHandle({ object, controlScale, rotating = false, cursor = null, showHandle = true, disabled = false, onPointerDown, onKeyDown }: {
  object: RotationBox;
  controlScale: number;
  rotating?: boolean;
  cursor?: RotationPoint | null;
  showHandle?: boolean;
  disabled?: boolean;
  onPointerDown: PointerEventHandler<SVGCircleElement>;
  onKeyDown: KeyboardEventHandler<SVGCircleElement>;
}) {
  const cx = object.width / 2;
  const cy = object.height + 34 * controlScale;
  if (rotating) {
    const badge = rotationBadgePoint(object, cursor, controlScale);
    return <g className="studio-rotation-badge" transform={`rotate(${-object.rotation} ${badge.x} ${badge.y})`} pointerEvents="none"><rect x={badge.x - 25 * controlScale} y={badge.y - 15 * controlScale} width={50 * controlScale} height={30 * controlScale} rx={7 * controlScale} /><text x={badge.x} y={badge.y + 5 * controlScale} style={{ fontSize: `${13 * controlScale}px` }} textAnchor="middle">{formatRotationAngle(object.rotation)}</text></g>;
  }
  return showHandle ? <>
    <circle role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined} aria-label={`Rotate selected object (${formatRotationAngle(object.rotation)})`} className="studio-rotation-handle" style={{ "--rotation-cursor": rotationCursorCss(object.rotation) } as CSSProperties} cx={cx} cy={cy} r={18 * controlScale} onPointerDown={event => { if (!disabled) onPointerDown(event); }} onKeyDown={event => { if (!disabled) onKeyDown(event); }} />
    <g className="studio-rotation-icon" transform={`rotate(${-object.rotation} ${cx} ${cy}) translate(${cx - 14 * controlScale} ${cy - 14 * controlScale})`} pointerEvents="none"><StudioIcon name="rotate-free" size={28 * controlScale} /></g>
  </> : null;
}
