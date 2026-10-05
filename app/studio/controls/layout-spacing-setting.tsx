"use client";

import { useId, useState } from "react";
import { SpacingRangeControl } from "./spacing-range-control";
import { AcmIcon } from "@acm/icons/react";

type LayoutSpacingSettingProps = {
  label: string;
  value: number | undefined;
  presets: readonly number[];
  min: number;
  max: number;
  onChange: (value: number | undefined) => void;
};

export function LayoutSpacingSetting({ label, value, presets, min, max, onChange }: LayoutSpacingSettingProps) {
  const customId = useId();
  const [customOpen, setCustomOpen] = useState(() => value !== undefined && !presets.includes(value));

  function setCustomValue(rawValue: string) {
    if (rawValue === "") {
      onChange(undefined);
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(min, Math.min(max, parsed)));
  }

  return <div className="layout-spacing-setting">
    <label className="layout-spacing-label" htmlFor={`${customId}-range`}>{label}</label>
    <div className="layout-spacing-range-row">
      <SpacingRangeControl id={`${customId}-range`} label={label} value={value} presets={presets} onChange={onChange} />
      <button
        className="layout-spacing-custom-trigger"
        type="button"
        aria-label={`${label} custom value`}
        aria-controls={`${customId}-custom`}
        aria-expanded={customOpen}
        aria-pressed={customOpen}
        title={customOpen ? `Use ${label.toLocaleLowerCase("en-GB")} presets` : `Set custom ${label.toLocaleLowerCase("en-GB")} value`}
        onClick={() => setCustomOpen(open => !open)}
      ><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button>
    </div>
    {customOpen ? <label className="layout-spacing-custom">
      <span className="visually-hidden">{label} custom value in pixels</span>
      <input id={`${customId}-custom`} type="number" min={min} max={max} step="any" value={value ?? ""} placeholder="Default" aria-label={`${label} custom value in pixels`} onChange={event => setCustomValue(event.target.value)} />
      <span aria-hidden="true">px</span>
    </label> : null}
    <output className="layout-spacing-value">{value === undefined ? "Default" : `${value}px`}</output>
  </div>;
}
