"use client";
import { SettingLabel } from "./setting-inheritance";
import { useState } from "react";
import { TextInput } from "./native-fields";
import { NumberStepper } from "./number-stepper";
import type { ParagraphStyle } from "../../content/model";
import "./line-height-setting.css";

type LineHeightProps = {
  value: ParagraphStyle["lineHeight"]; onChange: (value: ParagraphStyle["lineHeight"]) => void;
  disabled?: boolean; label?: string; stepper?: boolean; min?: number; max?: number; step?: number; defaultValue?: number; placeholder?: string;
};
/** The optional stepper is unitless; the legacy text field retains CSS length support. */
export function steppedLineHeight(value: string | undefined, direction: -1 | 1, min = 0.1, max = 10, step = 0.1, defaultValue = 1.5): string {
  const number = value?.trim() && Number.isFinite(Number(value)) ? Number(value) : defaultValue;
  return String(Number(Math.max(min, Math.min(max, number + direction * step)).toFixed(3)));
}
export function committedLineHeight(raw: string, previous: string | undefined, min = 0.1, max = 10): string | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? String(Math.max(min, Math.min(max, parsed))) : previous;
}
export function LineHeightSetting({ value, onChange, disabled = false, label = "Line height", stepper = false, min = 0.1, max = 10, step = 0.1, defaultValue, placeholder }: LineHeightProps) {
  if (!stepper) return <label><SettingLabel>{label}</SettingLabel><TextInput type="text" inputMode="decimal" value={value ?? ""} onChange={event => onChange(event.target.value || undefined)} placeholder={placeholder ?? "Default"} disabled={disabled} /></label>;
  return <LineHeightStepper value={value} onChange={onChange} disabled={disabled} label={label} min={min} max={max} step={step} defaultValue={defaultValue} placeholder={placeholder} />;
}
function LineHeightStepper({ value, onChange, disabled, label = "Line height", min = 0.1, max = 10, step = 0.1, defaultValue = 1.5, placeholder = "Default" }: LineHeightProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) { setPreviousValue(value); setDraft(value ?? ""); }
  function commit() {
    if (draft === (value ?? "")) return;
    const next = committedLineHeight(draft, value, min, max);
    setDraft(next ?? "");
    if (next !== value) onChange(next);
  }
  function increment(direction: -1 | 1) { const next = steppedLineHeight(draft, direction, min, max, step, defaultValue); setDraft(next); onChange(next); }
  return <div className="studio-line-height-setting"><SettingLabel>{label}</SettingLabel>
    <NumberStepper label={label} value={draft} min={min} max={max} step={step} disabled={disabled} placeholder={placeholder} onStep={increment}
      onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
  </div>;
}
