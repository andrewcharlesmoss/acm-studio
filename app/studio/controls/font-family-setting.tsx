"use client";

import type { ParagraphFontFamily } from "../../content/model";
import { PARAGRAPH_FONT_FAMILIES } from "../../content/paragraph-styles";

export function FontFamilySetting({ value, onChange, label = "Font", disabled = false }: {
  value?: ParagraphFontFamily;
  onChange: (value: ParagraphFontFamily | undefined) => void;
  label?: string;
  disabled?: boolean;
}) {
  return <label><span>{label}</span><select disabled={disabled} value={value ?? ""} onChange={event => onChange((event.target.value || undefined) as ParagraphFontFamily | undefined)}>
    <option value="">Default</option>
    {Object.entries(PARAGRAPH_FONT_FAMILIES).map(([id, font]) => <option key={id} value={id}>{font.label}</option>)}
  </select></label>;
}
