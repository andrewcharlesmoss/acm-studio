"use client";
import { SettingLabel } from "./setting-inheritance";

import { SelectControl } from "./native-fields";
import { FontPreviewSelect } from "./font-preview-select";
import type { ParagraphFontFamily } from "../../content/model";
import { referenceFonts } from "../../content/website-fonts";
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
  return <label><SettingLabel>{label}</SettingLabel><SelectControl disabled={disabled} value={value} onChange={event => onChange(event.target.value)}>
    {!known ? <option value={value}>{value}</option> : null}
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </SelectControl></label>;
}

export function FontFamilySetting({ value, displayValue, onChange, label = "Font", disabled = false, families, websiteFamilies }: {
  value?: ParagraphFontFamily;
  displayValue?: string;
  onChange: (value: ParagraphFontFamily | undefined) => void;
  label?: string;
  disabled?: boolean;
  families?: readonly ParagraphFontFamily[];
  websiteFamilies?: readonly string[];
}) {
  const availableFamilies = families ?? ["inter", "helvetica-neue", "helvetica", "arial"];
  const entries = Object.entries(PARAGRAPH_FONT_FAMILIES).filter(([id]) => availableFamilies.includes(id as ParagraphFontFamily));
  const inherited = referenceFonts.find(font => font.family === displayValue)?.id ?? (displayValue && Object.hasOwn(PARAGRAPH_FONT_FAMILIES, displayValue) ? displayValue as ParagraphFontFamily : undefined);
  const selected = value ?? inherited;
  if (websiteFamilies) {
    const fonts = [...referenceFonts].filter(font => websiteFamilies.includes(font.family) || font.id === selected).sort((a, b) => a.name.localeCompare(b.name, "en"));
    const legacy = selected && !referenceFonts.some(font => font.id === selected) ? [{ value: selected, label: PARAGRAPH_FONT_FAMILIES[selected].label, family: PARAGRAPH_FONT_FAMILIES[selected].css }] : [];
    return <FontFamilySelect label={label} disabled={disabled} previewOptions value={selected} options={[{ value: "", label: "Default" }, ...fonts.map(font => ({ value: font.id, label: font.name, family: font.family })), ...legacy]} onChange={value => onChange((value || undefined) as ParagraphFontFamily | undefined)} />;
  }
  return <FontFamilySelect label={label} disabled={disabled} value={selected} options={[{ value: "", label: "Default" }, ...entries.map(([id, font]) => ({ value: id, label: font.label }))]} onChange={value => onChange((value || undefined) as ParagraphFontFamily | undefined)} />;
}
