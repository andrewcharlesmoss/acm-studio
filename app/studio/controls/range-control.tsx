"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { createContext, useContext, useRef, useState, type CSSProperties, type InputHTMLAttributes } from "react";

// A history owner may group synchronous value changes from one pointer drag.
type RangeDragEdit = (change: () => void) => void;
export const RangeDragHistoryContext = createContext<((input: HTMLInputElement) => RangeDragEdit | undefined) | null>(null);

const rangeKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);
const thumbSize = 12;

type RangeControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  tooltipText?: string;
  tooltipPlacement?: "above" | "below";
};

/** Native range semantics with a thumb-positioned value label, shared by inspector controls. */
export function RangeControl({ tooltipText, tooltipPlacement = "below", className = "studio-range-control", disabled, min = 0, max = 100, value, onChange, onKeyDown, onFocus, onBlur, onPointerMove, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture, ...props }: RangeControlProps) {
  const beginDragEdit = useContext(RangeDragHistoryContext);
  const dragEdit = useRef<{ pointerId: number; keyboardStep: boolean; apply: RangeDragEdit } | null>(null);
  function endDragEdit(pointerId: number) {
    if (dragEdit.current?.pointerId === pointerId) dragEdit.current = null;
  }
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const amount = Number(value);
  const fraction = Number(max) > Number(min) ? Math.max(0, Math.min(1, (amount - Number(min)) / (Number(max) - Number(min)))) : 0;
  // Native thumbs stop half a thumb-width inside either end of the track.
  const position = `calc(${fraction * 100}% + ${thumbSize / 2 - fraction * thumbSize}px)`;
  const text = tooltipText ?? String(value ?? "");
  const visible = !disabled && Number.isFinite(amount) && text !== "" && (focused || hovered || dragging);
  return <span {...controlLibraryAttributes("slider-foundation")} className="studio-range-wrapper" data-tooltip-placement={tooltipPlacement} style={{ "--range-label-position": position, "--range-thumb-size": `${thumbSize}px` } as CSSProperties}>
    <input {...props} className={className} type="range" disabled={disabled} min={min} max={max} value={value}
      onChange={event => {
        if (dragEdit.current && !dragEdit.current.keyboardStep) dragEdit.current.apply(() => onChange?.(event));
        else onChange?.(event);
      }}
      onKeyDown={event => {
        if (dragEdit.current && rangeKeys.has(event.key)) dragEdit.current.keyboardStep = true;
        onKeyDown?.(event);
      }}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { dragEdit.current = null; setFocused(false); setDragging(false); onBlur?.(event); }}
      onPointerMove={event => {
        if (dragEdit.current && dragEdit.current.pointerId === event.pointerId) dragEdit.current.keyboardStep = false;
        const bounds = event.currentTarget.getBoundingClientRect();
        const thumb = bounds.left + thumbSize / 2 + fraction * (bounds.width - thumbSize);
        setHovered(event.pointerType === "mouse" && Math.abs(event.clientX - thumb) <= thumbSize);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => { setHovered(false); onPointerLeave?.(event); }}
      onPointerDown={event => {
        if (event.isPrimary && event.button === 0) {
          const apply = beginDragEdit?.(event.currentTarget);
          if (apply) {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragEdit.current = { pointerId: event.pointerId, keyboardStep: false, apply };
          }
        }
        setDragging(true); onPointerDown?.(event);
      }}
      onPointerUp={event => { endDragEdit(event.pointerId); setDragging(false); onPointerUp?.(event); }}
      onPointerCancel={event => { endDragEdit(event.pointerId); setDragging(false); setHovered(false); onPointerCancel?.(event); }}
      onLostPointerCapture={event => { endDragEdit(event.pointerId); setDragging(false); onLostPointerCapture?.(event); }} />
    {visible ? <span className="studio-range-value-label" aria-hidden="true">{text}</span> : null}
  </span>;
}
