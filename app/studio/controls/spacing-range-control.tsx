"use client";

import type { CSSProperties } from "react";

/** Eight positions on the standard scale, including zero; unset values stay unset until edited. */
export function SpacingRangeControl({ id, label, value, valueText, presets, disabled = false, onChange }: {
  id?: string;
  label: string;
  value?: number;
  valueText?: string;
  presets: readonly number[];
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
}) {
  const closest = value === undefined ? 0 : presets.reduce((best, preset, index) =>
    Math.abs(preset - value) < Math.abs(presets[best] - value) ? index : best, 0);
  return <input id={id} className="studio-range-control studio-spacing-range" type="range" min={0} max={presets.length - 1} step={1}
    aria-label={label} aria-valuetext={valueText ?? (value === undefined ? "Default" : `${value} pixels${presets.includes(value) ? "" : ", custom value"}`)}
    value={closest} disabled={disabled} style={{ "--spacing-segments": presets.length - 1 } as CSSProperties}
    onChange={event => { const index = Number(event.target.value); onChange(presets[index]); }} />;
}
