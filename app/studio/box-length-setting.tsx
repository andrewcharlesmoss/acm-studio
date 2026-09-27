"use client";

import { useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { expandBoxLengths } from "../content/box-lengths";
import { StudioIcon } from "./studio-icons";

type BoxLengthSettingProps = {
  label: string;
  value?: string;
  layout: "axes" | "all" | "vertical";
  corners?: boolean;
  allowPercent?: boolean;
  canReset?: boolean;
  min: number;
  max: number;
  onChange: (value: string | undefined) => void;
};

const units = ["px", "em", "rem", "%", "vw", "vh", "ch"] as const;

function lengthParts(value: string) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|ch|vw|vh)?$/);
  return { amount: match ? Number(match[1]) : 0, unit: match?.[2] ?? "px" };
}

function BoxLengthRow({ label, value, min, max, allowPercent, onChange }: { label: string; value: string; min: number; max: number; allowPercent: boolean; onChange: (value: string) => void }) {
  const { amount, unit } = lengthParts(value);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null);
    if (Number.isFinite(parsed)) onChange(`${Math.max(min, Math.min(max, parsed))}${unit}`);
  }
  return <div className="box-length-row">
    <span className={`box-length-side is-${label.toLowerCase().replaceAll(" ", "-")}`} aria-hidden="true" />
    <input aria-label={`${label} amount`} type="range" min={min} max={max} step="1" value={Math.max(min, Math.min(max, amount))} onChange={event => onChange(`${event.target.value}${unit}`)} />
    <button type="button" className="box-length-custom-trigger" aria-label={`${label} custom value`} aria-expanded={customOpen} onClick={() => setCustomOpen(open => !open)}><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button>
    {customOpen ? <div className="box-length-custom"><input aria-label={`${label} value`} type="number" min={min} max={max} step="0.1" value={draft ?? amount} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select aria-label={`${label} unit`} value={unit} onChange={event => { const nextAmount = draft === null ? amount : Number(draft); setDraft(null); if (Number.isFinite(nextAmount)) onChange(`${Math.max(min, Math.min(max, nextAmount))}${event.target.value}`); }}>{[...(!allowPercent && unit === "%" ? ["%"] : []), ...units.filter(option => allowPercent || option !== "%")].map(option => <option key={option} value={option}>{option}</option>)}</select></div> : null}
  </div>;
}

export function BoxLengthSetting({ label, value, layout, corners = false, allowPercent = true, canReset = Boolean(value), min, max, onChange }: BoxLengthSettingProps) {
  const parts = expandBoxLengths(value);
  const split = layout !== "vertical" && Boolean(value && value.trim().split(/\s+/).length >= (layout === "axes" ? 3 : 2));
  const rows = split
    ? (corners ? ["Top left", "Top right", "Bottom right", "Bottom left"] : ["Top", "Right", "Bottom", "Left"]).map((name, index) => ({ name, index }))
    : layout === "axes" ? [{ name: "Vertical", index: 0 }, { name: "Horizontal", index: 1 }] : layout === "vertical" ? [{ name: "Vertical", index: 0 }] : [{ name: "All", index: 0 }];

  function update(index: number, next: string) {
    const updated = [...parts];
    if (split) updated[index] = next;
    else if (layout === "axes") {
      if (index === 0) updated[0] = updated[2] = next;
      else updated[1] = updated[3] = next;
    } else if (layout === "vertical") updated[0] = updated[2] = next;
    else updated.fill(next);
    onChange(split ? updated.join(" ") : layout === "axes" ? `${updated[0]} ${updated[1]}` : layout === "vertical" ? `${updated[0]} 0px` : updated[0]);
  }

  function toggleSides() {
    if (split) onChange(layout === "axes" ? `${parts[0]} ${parts[1]}` : parts[0]);
    else onChange(parts.join(" "));
  }

  return <div className="box-length-setting">
    <div className="box-length-heading"><span>{label}</span>{layout !== "vertical" ? <button type="button" aria-label={`${split ? "Link" : "Unlink"} ${label.toLowerCase()} sides`} title={split ? `Link ${label.toLowerCase()} using the top${layout === "axes" ? " and right" : ""} value${layout === "axes" ? "s" : ""}` : `Edit ${label.toLowerCase()} separately`} aria-pressed={!split} onClick={toggleSides}><StudioIcon name={split ? "link-off" : "link"} size={20} /></button> : null}</div>
    <div className="box-length-rows">{rows.map(({ name, index }) => <BoxLengthRow key={name} label={name} value={parts[index]} min={min} max={max} allowPercent={allowPercent} onChange={next => update(index, next)} />)}</div>
    {canReset ? <button type="button" className="paragraph-reset-button box-length-reset" onClick={() => onChange(undefined)}>Reset</button> : null}
  </div>;
}
