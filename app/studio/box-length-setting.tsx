"use client";

import { RangeControl } from "./controls/range-control";

import { useId, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { compactBoxLengths, expandBoxLengths, validBoxLengths } from "../content/box-lengths";
import { SpacingRangeControl } from "./controls/spacing-range-control";
import { spacingRangeSettings } from "./controls/spacing-range-settings";
import { StudioIcon } from "./studio-icons";

type BoxLengthSettingProps = {
  label: string;
  value?: string;
  layout: "axes" | "all" | "vertical";
  corners?: boolean;
  presets?: readonly number[];
  compact?: boolean;
  leadingControl?: ReactNode;
  allowPercent?: boolean;
  canReset?: boolean;
  disabled?: boolean;
  min: number;
  max: number;
  onChange: (value: string | undefined) => void;
};

const cornerIcons = {
  "Top left": "layout.corner-top-left",
  "Top right": "layout.corner-top-right",
  "Bottom right": "layout.corner-bottom-right",
  "Bottom left": "layout.corner-bottom-left",
} as const;

const sideIcons = {
  All: "layout.sides-all", Vertical: "layout.sides-vertical", Horizontal: "layout.sides-horizontal",
  Top: "layout.side-top", Bottom: "layout.side-bottom", Left: "layout.side-left", Right: "layout.side-right",
} as const;

const units = ["px", "em", "rem", "%", "vw", "vh", "ch"] as const;

function lengthParts(value: string) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|ch|vw|vh)?$/);
  return { amount: match ? Number(match[1]) : 0, unit: match?.[2] ?? "px" };
}

function BoxLengthRow({ label, settingLabel, value, min, max, allowPercent, onChange, presets, compact = false, corners = false, mixed = false, disabled = false }: { label: string; settingLabel: string; value: string; min: number; max: number; allowPercent: boolean; onChange: (value: string | undefined) => void; presets?: readonly number[]; compact?: boolean; corners?: boolean; mixed?: boolean; disabled?: boolean }) {
  const { amount, unit } = lengthParts(value);
  const customId = useId();
  const cornerIcon = cornerIcons[label as keyof typeof cornerIcons];
  const [customOpen, setCustomOpen] = useState(() => Boolean(presets && value && (unit !== "px" || !presets.includes(amount))));
  const sideIcon = sideIcons[label as keyof typeof sideIcons];
  const [draft, setDraft] = useState<string | null>(null);
  const spacingRange = !corners && !compact ? spacingRangeSettings(unit, min < 0) : undefined;
  const rangeMin = spacingRange?.min ?? min;
  const rangeMax = spacingRange?.max ?? max;
  const rangeStep = spacingRange?.step ?? 1;
  const sliderValue = Math.max(rangeMin, Math.min(rangeMax, amount));
  // A unit switch changes the suffix, never converts or silently truncates the measurement.
  const entryMin = spacingRange ? min < 0 ? undefined : 0 : min;
  const entryMax = spacingRange ? undefined : max;
  const boundedEntry = (amount: number) => spacingRange ? Math.max(entryMin ?? -Infinity, amount) : Math.max(min, Math.min(max, amount));
  function updateAmount(next: number, nextUnit = unit) {
    if (!Number.isFinite(next)) return;
    const nextValue = `${boundedEntry(next)}${nextUnit}`;
    // The content contract accepts decimal CSS lengths, not exponent notation.
    if (validBoxLengths(nextValue, min < 0)) onChange(nextValue);
  }
  function commit() {
    if (draft === null) return;
    if (draft === "") { setDraft(null); onChange(undefined); return; }
    const parsed = Number(draft);
    setDraft(null);
    updateAmount(parsed);
  }
  const inline = compact || corners || customOpen;
  return <div className={`box-length-row${compact ? " is-compact" : ""}${customOpen && !compact && !corners ? " is-custom-spacing" : ""}`}>
    {corners ? <span className={`box-length-corner${cornerIcon ? " is-single" : ""}`} aria-hidden="true"><AcmIcon name="layout.corners" scale="Regular-M" size={24} />{cornerIcon ? <AcmIcon className="box-length-active-corner" name={cornerIcon} scale="Regular-M" size={24} /> : null}</span> : !compact ? <span className={`box-length-indicator${label !== "All" ? " is-single" : ""}`} aria-hidden="true"><AcmIcon name="layout.sides-all" scale="Regular-M" size={24} />{label !== "All" && sideIcon ? <AcmIcon name={sideIcon} className="box-length-active-side" scale="Regular-M" size={24} /> : null}</span> : null}
    {inline ? <label className="box-length-inline-value" id={customId}><span className="visually-hidden">{label} value</span><input disabled={disabled} aria-label={`${settingLabel} ${label} value`} type="number" min={entryMin} max={entryMax} step="any" value={draft ?? (!mixed && value ? amount : "")} placeholder={mixed ? "Mixed" : ""} onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft === "") { setDraft(null); onChange(undefined); } else commit(); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select disabled={disabled} aria-label={`${settingLabel} ${label} unit`} value={unit} onChange={event => { const nextAmount = draft === null ? amount : Number(draft); setDraft(null); updateAmount(nextAmount, event.target.value); }}>{[...(!allowPercent && unit === "%" ? ["%"] : []), ...units.filter(option => allowPercent || option !== "%")].map(option => <option key={option} value={option}>{option}</option>)}</select></label> : null}
    {!inline ? presets ? <SpacingRangeControl disabled={disabled} label={`${settingLabel} ${label} amount`} value={value ? amount : undefined} valueText={mixed ? "Mixed" : value ? `${amount} ${unit}${unit !== "px" || !presets.includes(amount) ? ", custom value" : ""}` : "Default"} presets={presets} onChange={next => onChange(next === undefined ? undefined : `${next}px`)} /> : <RangeControl tooltipText={mixed ? "Mixed" : value ? String(sliderValue) : "Default"} className="studio-range-control" disabled={disabled} aria-label={`${settingLabel} ${label} amount`} min={rangeMin} max={rangeMax} step={rangeStep} value={sliderValue} onChange={event => onChange(`${event.target.value}${unit}`)} /> : <RangeControl tooltipText={mixed ? "Mixed" : value ? String(sliderValue) : "Default"} className="studio-range-control" disabled={disabled} aria-label={`${settingLabel} ${label} amount`} min={rangeMin} max={rangeMax} step={rangeStep} value={sliderValue} onChange={event => { setDraft(null); onChange(`${event.target.value}${unit}`); }} />}
    {!compact && !corners ? <button disabled={disabled} type="button" className="box-length-custom-trigger" aria-label={`${settingLabel} ${label} custom value`} aria-controls={customOpen ? customId : undefined} aria-expanded={customOpen} aria-pressed={customOpen} title={customOpen ? `Use ${settingLabel.toLowerCase()} ${label.toLowerCase()} presets` : `Set custom ${settingLabel.toLowerCase()} ${label.toLowerCase()}`} onClick={() => setCustomOpen(open => !open)}><AcmIcon name="action.adjust" scale="Regular-M" size={24} /></button> : null}
    {mixed && !inline ? <span className="box-length-mixed" aria-hidden="true">Mixed</span> : null}
  </div>;
}

export function BoxLengthSetting({ label, value, layout, corners = false, presets, compact = false, leadingControl, allowPercent = true, canReset = !corners && !presets && Boolean(value), disabled = false, min, max, onChange }: BoxLengthSettingProps) {
  const parts = expandBoxLengths(value);
  const spacing = !corners && !compact;
  // View changes never rewrite stored dimensions. Keep the rows stable during a drag.
  const [split, setSplit] = useState(() => Boolean(value && (corners
    ? value.trim().split(/\s+/).length > 1
    : parts[0] !== parts[2] || (layout !== "vertical" && parts[1] !== parts[3]))));
  const rows = split
    ? layout === "vertical" ? [{ name: "Top", indices: [0] }, { name: "Bottom", indices: [2] }]
      : corners ? [{ name: "Top left", indices: [0] }, { name: "Top right", indices: [1] }, { name: "Bottom left", indices: [3] }, { name: "Bottom right", indices: [2] }]
        : [{ name: "Top", indices: [0] }, { name: "Bottom", indices: [2] }, { name: "Left", indices: [3] }, { name: "Right", indices: [1] }]
    : spacing ? layout === "vertical" ? [{ name: "Vertical", indices: [0, 2] }]
      : [{ name: "Vertical", indices: [0, 2] }, { name: "Horizontal", indices: [1, 3] }]
      : [{ name: "All", indices: [0, 1, 2, 3] }];

  function update(indices: number[], next: string | undefined) {
    if (next === undefined && indices.length === 4) { onChange(undefined); return; }
    const updated = [...parts];
    for (const index of indices) updated[index] = next ?? "0px";
    onChange(compactBoxLengths(updated));
  }

  function toggleSides() {
    setSplit(!split);
    // Radius retains its existing link behaviour; spacing only changes view.
    if (corners && split && value) onChange(parts[0]);
  }

  return <div className={`box-length-setting${compact && !split ? " is-compact" : ""}${corners ? " is-radius" : spacing ? " is-spacing" : ""}`}>
    <div className="box-length-heading"><span>{label}</span>{<button disabled={disabled} type="button" aria-label={`${split ? "Link" : "Unlink"} ${label.toLowerCase()} ${corners ? "corners" : "sides"}`} title={split ? `Link ${label.toLowerCase()} ${corners ? "corners" : "axes"}` : `Edit ${label.toLowerCase()} separately`} aria-pressed={!split} onClick={toggleSides}><StudioIcon name={split ? "link-off" : "link"} size={24} /></button>}</div>
    <div className="box-length-rows">{compact ? leadingControl : null}{rows.map(({ name, indices }) => <BoxLengthRow key={name} label={name} settingLabel={label} value={value ? parts[indices[0]] : ""} mixed={indices.some(index => parts[index] !== parts[indices[0]])} presets={presets} compact={compact && !split} corners={corners} min={min} max={max} allowPercent={allowPercent} disabled={disabled} onChange={next => update(indices, next)} />)}</div>
    {canReset ? <button disabled={disabled} type="button" className="paragraph-reset-button box-length-reset" onClick={() => onChange(undefined)}>Reset</button> : null}
  </div>;
}
