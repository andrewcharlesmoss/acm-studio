"use client";

import { SelectControl } from "./native-fields";
import { FontPreviewSelect } from "./font-preview-select";
import type { ParagraphFontFamily } from "../../content/model";
import { PARAGRAPH_FONT_FAMILIES } from "../../content/paragraph-styles";

/** Pass the authored value; this shared boundary keeps unset selections controlled. */
export function FontFamilySelect({ value = "", options, onChange, label = "Font", disabled = false, previewOptions = false }: {
  value?: string;
  options: readonly { value: string; label: string; family?: string }[];
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  previewOptions?: boolean;
}) {
  const known = options.some(option => option.value === value);
  if (previewOptions) {
    const previewOptions = [
      ...(!known ? [{ value, label: value, family: value || undefined }] : []),
      ...options.map(option => ({ ...option, family: option.family ?? (option.value || undefined) })),
    ];
    return <FontPreviewSelect label={label} value={value} options={previewOptions} disabled={disabled} onChange={onChange} />;
  }
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
  return <FontFamilySelect label={label} disabled={disabled} value={value} options={[{ value: "", label: "Default" }, ...Object.entries(PARAGRAPH_FONT_FAMILIES).map(([id, font]) => ({ value: id, label: font.label }))]} onChange={value => onChange((value || undefined) as ParagraphFontFamily | undefined)} />;
}
