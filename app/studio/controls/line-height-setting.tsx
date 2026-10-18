"use client";
import { useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { TextInput, NumberInput } from "./native-fields";
import { StudioButton } from "./button";
import type { ParagraphStyle } from "../../content/model";
import "./line-height-setting.css";

type LineHeightProps = {
  value: ParagraphStyle["lineHeight"]; onChange: (value: ParagraphStyle["lineHeight"]) => void;
  disabled?: boolean; label?: string; stepper?: boolean; min?: number; max?: number; step?: number;
};
/** The optional stepper is unitless; the legacy text field retains CSS length support. */
export function steppedLineHeight(value: string | undefined, direction: -1 | 1, min = 0.1, max = 10, step = 0.1): string {
  const number = value?.trim() && Number.isFinite(Number(value)) ? Number(value) : 1.5;
  return String(Number(Math.max(min, Math.min(max, number + direction * step)).toFixed(3)));
}
export function committedLineHeight(raw: string, previous: string | undefined, min = 0.1, max = 10): string | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? String(Math.max(min, Math.min(max, parsed))) : previous;
}
export function LineHeightSetting({ value, onChange, disabled = false, label = "Line height", stepper = false, min = 0.1, max = 10, step = 0.1 }: LineHeightProps) {
  if (!stepper) return <label><span>{label}</span><TextInput type="text" inputMode="decimal" value={value ?? ""} onChange={event => onChange(event.target.value || undefined)} placeholder="Default" disabled={disabled} /></label>;
  return <LineHeightStepper value={value} onChange={onChange} disabled={disabled} label={label} min={min} max={max} step={step} />;
}
function LineHeightStepper({ value, onChange, disabled, label, min = 0.1, max = 10, step = 0.1 }: LineHeightProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) { setPreviousValue(value); setDraft(value ?? ""); }
  const number = draft.trim() === "" ? undefined : Number(draft);
  function commit() { const next = committedLineHeight(draft, value, min, max); setDraft(next ?? ""); onChange(next); }
  function increment(direction: -1 | 1) { const next = steppedLineHeight(draft, direction, min, max, step); setDraft(next); onChange(next); }
  return <div className="studio-line-height-setting"><span>{label}</span><div className="studio-line-height-stepper">
    <NumberInput aria-label={label} value={draft} min={min} max={max} step={step} disabled={disabled} placeholder="Default" onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    <StudioButton type="button" variant="text" aria-label={`Increase ${label}`} title={`Increase ${label}`} disabled={disabled || (number !== undefined && number >= max)} onClick={() => increment(1)}><AcmIcon name="action.add" size={20} scale="Regular-M" /></StudioButton>
    <StudioButton type="button" variant="text" aria-label={`Decrease ${label}`} title={`Decrease ${label}`} disabled={disabled || (number !== undefined && number <= min)} onClick={() => increment(-1)}><AcmIcon name="action.remove" size={20} scale="Regular-M" /></StudioButton>
  </div></div>;
}
