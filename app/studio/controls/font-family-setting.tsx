"use client";

import { SelectControl } from "./native-fields";
import type { ParagraphFontFamily } from "../../content/model";
import { PARAGRAPH_FONT_FAMILIES } from "../../content/paragraph-styles";

/** Select presentation supports each owner's exact stored font values. */
export function FontFamilySelect({ value, options, onChange, label = "Font", disabled = false }: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const known = options.some(option => option.value === value);
  return <label><span>{label}</span><SelectControl disabled={disabled} value={value} onChange={event => onChange(event.target.value)}>
    {!known ? <option value={value}>{value}</option> : null}
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </SelectControl></label>;
}

export function FontFamilySetting({ value, onChange, label = "Font", disabled = false }: {
  value?: ParagraphFontFamily;
  onChange: (value: ParagraphFontFamily | undefined) => void;
  label?: string;
  disabled?: boolean;
}) {
  return <FontFamilySelect label={label} disabled={disabled} value={value ?? ""} options={[{ value: "", label: "Default" }, ...Object.entries(PARAGRAPH_FONT_FAMILIES).map(([id, font]) => ({ value: id, label: font.label }))]} onChange={value => onChange((value || undefined) as ParagraphFontFamily | undefined)} />;
}
