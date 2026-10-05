"use client";

import { useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { expandBoxLengths } from "../content/box-lengths";
import { SpacingRangeControl } from "./controls/spacing-range-control";
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

const units = ["px", "em", "rem", "%", "vw", "vh", "ch"] as const;

function lengthParts(value: string) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|ch|vw|vh)?$/);
  return { amount: match ? Number(match[1]) : 0, unit: match?.[2] ?? "px" };
}

function BoxLengthRow({ label, settingLabel, value, min, max, allowPercent, onChange, presets, compact = false, corners = false, disabled = false }: { label: string; settingLabel: string; value: string; min: number; max: number; allowPercent: boolean; onChange: (value: string | undefined) => void; presets?: readonly number[]; compact?: boolean; corners?: boolean; disabled?: boolean }) {
  const { amount, unit } = lengthParts(value);
  const cornerIcon = cornerIcons[label as keyof typeof cornerIcons];
  const [customOpen, setCustomOpen] = useState(() => Boolean(presets && value && (unit !== "px" || !presets.includes(amount))));
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft === null) return;
    if (draft === "") { setDraft(null); onChange(undefined); return; }
    const parsed = Number(draft);
    setDraft(null);
    if (Number.isFinite(parsed)) onChange(`${Math.max(min, Math.min(max, parsed))}${unit}`);
  }
  return <div className={`box-length-row${compact ? " is-compact" : ""}`}>
    {corners ? <span className={`box-length-corner${cornerIcon ? " is-single" : ""}`} aria-hidden="true"><AcmIcon name="layout.corners" scale="Regular-M" size={24} />{cornerIcon ? <AcmIcon className="box-length-active-corner" name={cornerIcon} scale="Regular-M" size={24} /> : null}</span> : !compact ? <span className={`box-length-side is-${label.toLowerCase().replaceAll(" ", "-")}`} aria-hidden="true" /> : null}
    {compact || corners ? <label className="box-length-inline-value"><span className="visually-hidden">{label} value</span><input disabled={disabled} aria-label={`${settingLabel} ${label} value`} type="number" min={min} max={max} step="any" value={draft ?? (value ? amount : "")} placeholder="" onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft === "") { setDraft(null); onChange(undefined); } else commit(); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select disabled={disabled} aria-label={`${settingLabel} ${label} unit`} value={unit} onChange={event => { const nextAmount = draft === null ? amount : Number(draft); setDraft(null); if (Number.isFinite(nextAmount)) onChange(`${Math.max(min, Math.min(max, nextAmount))}${event.target.value}`); }}>{[...(!allowPercent && unit === "%" ? ["%"] : []), ...units.filter(option => allowPercent || option !== "%")].map(option => <option key={option} value={option}>{option}</option>)}</select></label> : null}
    {presets ? <SpacingRangeControl disabled={disabled} label={`${settingLabel} ${label} amount`} value={value ? amount : undefined} valueText={value ? `${amount} ${unit}${unit !== "px" || !presets.includes(amount) ? ", custom value" : ""}` : "Default"} presets={presets} onChange={next => onChange(next === undefined ? undefined : `${next}px`)} /> : <input className="studio-range-control" disabled={disabled} aria-label={`${settingLabel} ${label} amount`} type="range" min={min} max={max} step="1" value={Math.max(min, Math.min(max, amount))} onChange={event => onChange(`${event.target.value}${unit}`)} />}
    {!compact && !corners ? <button disabled={disabled} type="button" className="box-length-custom-trigger" aria-label={`${settingLabel} ${label} custom value`} aria-expanded={customOpen} onClick={() => setCustomOpen(open => !open)}><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button> : null}
    {customOpen && !corners ? <div className="box-length-custom"><input disabled={disabled} aria-label={`${settingLabel} ${label} value`} type="number" min={min} max={max} step="0.1" value={draft ?? (value ? amount : "")} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select disabled={disabled} aria-label={`${settingLabel} ${label} unit`} value={unit} onChange={event => { const nextAmount = draft === null ? amount : Number(draft); setDraft(null); if (Number.isFinite(nextAmount)) onChange(`${Math.max(min, Math.min(max, nextAmount))}${event.target.value}`); }}>{[...(!allowPercent && unit === "%" ? ["%"] : []), ...units.filter(option => allowPercent || option !== "%")].map(option => <option key={option} value={option}>{option}</option>)}</select></div> : null}
  </div>;
}

export function BoxLengthSetting({ label, value, layout, corners = false, presets, compact = false, leadingControl, allowPercent = true, canReset = !corners && Boolean(value), disabled = false, min, max, onChange }: BoxLengthSettingProps) {
  const parts = expandBoxLengths(value);
  const [splitOverride, setSplitOverride] = useState<boolean | null>(null);
  const split = splitOverride ?? Boolean(value && (layout === "vertical" ? parts[0] !== parts[2] : value.trim().split(/\s+/).length >= (layout === "axes" ? 3 : 2)));
  const rows = split
    ? layout === "vertical" ? [{ name: "Top", index: 0 }, { name: "Bottom", index: 2 }] : corners ? [{ name: "Top left", index: 0 }, { name: "Top right", index: 1 }, { name: "Bottom left", index: 3 }, { name: "Bottom right", index: 2 }] : ["Top", "Right", "Bottom", "Left"].map((name, index) => ({ name, index }))
    : layout === "axes" ? [{ name: "Vertical", index: 0 }, { name: "Horizontal", index: 1 }] : layout === "vertical" ? [{ name: "Vertical", index: 0 }] : [{ name: "All", index: 0 }];

  function update(index: number, next: string | undefined) {
    if (next === undefined && !split && layout === "all") { onChange(undefined); return; }
    const nextValue = next ?? "0px";
    const updated = [...parts];
    if (split) updated[index] = nextValue;
    else if (layout === "axes") {
      if (index === 0) updated[0] = updated[2] = nextValue;
      else updated[1] = updated[3] = nextValue;
    } else if (layout === "vertical") updated[0] = updated[2] = nextValue;
    else updated.fill(nextValue);
    onChange(split ? updated.join(" ") : layout === "axes" ? `${updated[0]} ${updated[1]}` : layout === "vertical" ? updated.join(" ") : updated[0]);
  }

  function toggleSides() {
    setSplitOverride(!split);
    if (split && value) onChange(layout === "axes" ? `${parts[0]} ${parts[1]}` : layout === "vertical" ? `${parts[0]} ${parts[1]} ${parts[0]} ${parts[3]}` : parts[0]);
  }

  return <div className={`box-length-setting${compact && !split ? " is-compact" : ""}${corners ? " is-radius" : ""}`}>
    <div className="box-length-heading"><span>{label}</span>{<button disabled={disabled} type="button" aria-label={`${split ? "Link" : "Unlink"} ${label.toLowerCase()} ${corners ? "corners" : "sides"}`} title={split ? `Link ${label.toLowerCase()} using the top${layout === "axes" ? " and right" : ""} value${layout === "axes" ? "s" : ""}` : `Edit ${label.toLowerCase()} separately`} aria-pressed={!split} onClick={toggleSides}><StudioIcon name={split ? "link-off" : "link"} size={corners ? 24 : 20} /></button>}</div>
    <div className="box-length-rows">{compact ? leadingControl : null}{rows.map(({ name, index }) => <BoxLengthRow key={name} label={name} settingLabel={label} value={value ? parts[index] : ""} presets={presets} compact={compact && !split} corners={corners} min={min} max={max} allowPercent={allowPercent} disabled={disabled} onChange={next => update(index, next)} />)}</div>
    {canReset ? <button disabled={disabled} type="button" className="paragraph-reset-button box-length-reset" onClick={() => onChange(undefined)}>Reset</button> : null}
  </div>;
}
