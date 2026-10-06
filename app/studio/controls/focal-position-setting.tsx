"use client";

import { RangeControl } from "./range-control";

export function FocalPositionSetting({ x = 50, y = 50, onXChange, onYChange, presentation = "number", label = "Focal position", disabled = false }: {
  x?: number;
  y?: number;
  onXChange: (value: number) => void;
  onYChange: (value: number) => void;
  presentation?: "number" | "range";
  label?: string;
  disabled?: boolean;
}) {
  const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  if (presentation === "range") return <div className="focal-position-setting" role="group" aria-label={label}>
    <label><span>Horizontal focal point ({x}%)</span><RangeControl className="studio-range-control" disabled={disabled} aria-label={`${label} horizontal`} min="0" max="100" value={x} onChange={(event) => onXChange(clamp(Number(event.target.value)))} /></label>
    <label><span>Vertical focal point ({y}%)</span><RangeControl className="studio-range-control" disabled={disabled} aria-label={`${label} vertical`} min="0" max="100" value={y} onChange={(event) => onYChange(clamp(Number(event.target.value)))} /></label>
  </div>;
  return <div className="inspector-two-column focal-position-setting" role="group" aria-label={label}>
    <label><span>Focal X (%)</span><input disabled={disabled} aria-label={`${label} horizontal`} type="number" min="0" max="100" value={x} onChange={(event) => onXChange(clamp(Number(event.target.value) || 0))} /></label>
    <label><span>Focal Y (%)</span><input disabled={disabled} aria-label={`${label} vertical`} type="number" min="0" max="100" value={y} onChange={(event) => onYChange(clamp(Number(event.target.value) || 0))} /></label>
  </div>;
}
