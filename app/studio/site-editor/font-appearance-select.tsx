"use client";

import { FontPreviewSelect } from "../controls/font-preview-select";

/** Owners supply available faces and retain their stored appearance values. */
export function FontAppearanceSelect({ value, family, options, onChange }: {
  value: string;
  family?: string;
  options: readonly { value: string; label: string; weight?: number; italic?: boolean }[];
  onChange: (value: string) => void;
}) {
  return <FontPreviewSelect label="Appearance" value={value} options={options.map(option => ({ ...option, family: option.weight ? family : undefined }))} onChange={onChange} />;
}
