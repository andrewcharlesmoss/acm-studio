"use client";
import { useState } from "react";
import { NumberUnitField } from "../controls/number-unit-field";
import { TextInput } from "../controls/native-fields";
import { ToggleSetting } from "../controls/toggle-setting";
import { StudioButton } from "../controls/button";
import { validFontSizePreset, type FontSizePreset } from "./typography-preview-model";

function FontLengthField({ label, value, disabled = false, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/);
  const unit = match?.[2] ?? "rem";
  return <label><span>{label}</span><NumberUnitField units={["px", "rem", "em"]} inputProps={{ disabled, "aria-label": label, value: match?.[1] ?? "", min: 0.01, max: unit === "px" ? 400 : 25, step: 0.01, onChange: event => onChange(`${event.target.value}${unit}`) }} unitProps={{ disabled, "aria-label": `${label} unit`, value: unit, onChange: event => onChange(`${match?.[1] ?? 1}${event.target.value}`) }} /></label>;
}
export function TypographyPresetEditor({ value, custom, onSave, onPreview, onRemove, onReset }: { value: FontSizePreset; custom: boolean; onSave: (value: FontSizePreset) => void; onPreview: (value: FontSizePreset) => void; onRemove: () => void; onReset: () => void }) {
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) { setPreviousValue(value); setDraft(value); }
  const change = (patch: Partial<FontSizePreset>) => { const next = { ...draft, ...patch }; setDraft(next); if (validFontSizePreset(next)) onPreview(next); };
  const valid = validFontSizePreset(draft);
  return <div className="site-typography-element">
    <label><span>Name</span><TextInput value={draft.name} maxLength={80} onChange={event => change({ name: event.target.value })} /></label>
    <FontLengthField label="Size" disabled={draft.fluid && draft.customFluid !== false} value={draft.size} onChange={size => change({ size })} />
    <ToggleSetting label="Fluid Typography" checked={draft.fluid} onChange={fluid => change({ fluid, customFluid: false })} />
    <p>Scale this size between a minimum and maximum as the preview width changes.</p>
    {draft.fluid ? <ToggleSetting label="Custom Fluid Values" checked={draft.customFluid !== false} onChange={customFluid => change({ customFluid, ...(customFluid ? { min: draft.size, max: draft.size } : {}) })} /> : null}
    {draft.fluid && draft.customFluid !== false ? <><FontLengthField label="Minimum" value={draft.min} onChange={min => change({ min })} /><FontLengthField label="Maximum" value={draft.max} onChange={max => change({ max })} /></> : null}
    {!valid ? <p role="alert">Enter positive sizes within 400px or 25rem/em, with the minimum no greater than the maximum.</p> : null}
    {custom ? <StudioButton type="button" disabled={!valid} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>Done</StudioButton> : null}
    <StudioButton type="button" variant="text" onClick={onReset}>Reset to Inherited</StudioButton>
    {custom ? <StudioButton type="button" variant="text" onClick={onRemove}>Remove Preset</StudioButton> : null}
  </div>;
}
