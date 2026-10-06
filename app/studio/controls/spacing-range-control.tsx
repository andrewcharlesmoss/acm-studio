"use client";

import type { CSSProperties } from "react";
import { RangeControl } from "./range-control";
import { LAYOUT_SPACING_PRESETS } from "../../content/layout";

const spacingNames = ["None", "2X-Small", "X-Small", "Small", "Medium", "Large", "X-Large", "2X-Large"];

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
  const standardScale = presets.length === LAYOUT_SPACING_PRESETS.length && presets.every((preset, index) => preset === LAYOUT_SPACING_PRESETS[index]);
  const tooltipText = valueText === "Mixed" ? "Mixed" : value === undefined ? "Default" : valueText?.includes(", custom value") ? valueText.replace(", custom value", "") : standardScale && presets.includes(value) ? spacingNames[closest] : String(value);
  return <RangeControl tooltipText={tooltipText} id={id} className="studio-range-control studio-spacing-range" min={0} max={presets.length - 1} step={1}
    aria-label={label} aria-valuetext={valueText ?? (value === undefined ? "Default" : `${value} pixels${presets.includes(value) ? "" : ", custom value"}`)}
    value={closest} disabled={disabled} style={{ "--spacing-segments": presets.length - 1 } as CSSProperties}
    onChange={event => { const index = Number(event.target.value); onChange(presets[index]); }} />;
}
