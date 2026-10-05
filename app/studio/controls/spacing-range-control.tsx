"use client";

import type { CSSProperties } from "react";

/** A discrete spacing scale; custom measurements remain untouched until the range is edited. */
export function SpacingRangeControl({ id, label, value, valueText, presets, disabled = false, onChange }: {
  id?: string;
  label: string;
  value?: number;
  valueText?: string;
  presets: readonly number[];
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
}) {
  const closest = value === undefined ? -1 : presets.reduce((best, preset, index) =>
    Math.abs(preset - value) < Math.abs(presets[best] - value) ? index : best, 0);
  return <input id={id} className="studio-range-control studio-spacing-range" type="range" min={0} max={presets.length} step={1}
    aria-label={label} aria-valuetext={valueText ?? (value === undefined ? "Default" : `${value} pixels${presets.includes(value) ? "" : ", custom value"}`)}
    value={closest + 1} disabled={disabled} style={{ "--spacing-segments": presets.length } as CSSProperties}
    onChange={event => { const index = Number(event.target.value); onChange(index === 0 ? undefined : presets[index - 1]); }} />;
}
