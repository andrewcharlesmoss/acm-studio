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

const appearanceWeights = ["Thin", "Extra Light", "Light", "Regular", "Medium", "Semi Bold", "Bold", "Extra Bold", "Black", "Extra Black"];
/** Match Gutenberg's CSS appearance choices; the browser resolves the available face. */
export const typographyAppearanceOptions = [
  { value: "", label: "Default" },
  ...[false, true].flatMap(italic => appearanceWeights.map((name, index) => ({
    value: `${(index + 1) * 100}:${italic ? "italic" : "normal"}`,
    label: `${name}${italic ? " Italic" : ""}`, weight: (index + 1) * 100, italic,
  }))),
];
