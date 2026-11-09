"use client";
import { SettingLabel } from "./setting-inheritance";

import { AcmIcon } from "@acm/icons/react";
import type { ReactNode } from "react";
import type { ParagraphAppearance, ParagraphFontSize, ParagraphWeight } from "../../content/model";
import { CustomFontSizeSetting } from "./custom-font-size-setting";
import { FontPreviewSelect } from "./font-preview-select";
import { referenceFonts } from "../../content/website-fonts";

const appearanceWeights = [
  ["thin", "Thin"], ["extra-light", "Extra Light"], ["light", "Light"], ["regular", "Regular"],
  ["medium", "Medium"], ["semi-bold", "Semi Bold"], ["bold", "Bold"],
  ["extra-bold", "Extra Bold"], ["black", "Black"], ["extra-black", "Extra Black"],
] as const;
const appearanceWeightValues: Record<ParagraphWeight, number> = {
  thin: 100, "extra-light": 200, light: 300, regular: 400, medium: 500,
  "semi-bold": 600, bold: 700, "extra-bold": 800, black: 900, "extra-black": 1000,
};

export function FontSizeAppearanceSetting<T extends string = ParagraphFontSize>({ presetChoices, size, customSize, appearance, appearanceFontFamily, appearanceFontId, mode, onModeChange, onSizeChange, onCustomSizeChange, onAppearanceChange, fontControl, showSize = true, showAppearance = true, paragraphLabels = false, disabled = false }: {
  presetChoices?: readonly { value: T; label: string; accessibleName: string }[];
  size?: T;
  customSize?: string;
  appearance?: ParagraphAppearance;
  appearanceFontFamily?: string;
  appearanceFontId?: string;
  fontControl?: ReactNode;
  mode: "presets" | "custom";
  onModeChange: (mode: "presets" | "custom") => void;
  onSizeChange: (value: T | undefined) => void;
  onCustomSizeChange: (value: string | undefined) => void;
  onAppearanceChange: (value: ParagraphAppearance | undefined) => void;
  showSize?: boolean;
  showAppearance?: boolean;
  paragraphLabels?: boolean;
  disabled?: boolean;
}) {
  const availableWeights: readonly number[] | undefined = referenceFonts.find(font => font.id === appearanceFontId)?.weights;
  // An authored choice remains readable when switching to a font without that weight.
  const weights = appearanceWeights.filter(([weight]) => !availableWeights || availableWeights.includes(appearanceWeightValues[weight]) || appearance === weight || appearance === (weight === "regular" ? "italic" : `${weight}-italic`));
  const fontSizes = presetChoices ?? [
    { value: "small", label: "S", accessibleName: "Small" },
    { value: "medium", label: "M", accessibleName: "Medium" },
    { value: "large", label: "L", accessibleName: "Large" },
    { value: "x-large", label: "XL", accessibleName: paragraphLabels ? "Larger" : "Extra large" },
    { value: "xx-large", label: "XXL", accessibleName: paragraphLabels ? "XX-Large" : "Extra extra large" },
  ];
  return <fieldset className="paragraph-font-size-setting" disabled={disabled}>
    {fontControl}
    {showSize ? <><legend className="visually-hidden">Font size</legend><div className="paragraph-font-size-heading"><SettingLabel>Font size</SettingLabel><button type="button" className="studio-adjustment-action paragraph-font-size-mode" aria-label={mode === "custom" ? "Use font size presets" : "Use custom font size"} title={mode === "custom" ? "Use font size presets" : "Use custom font size"} aria-pressed={mode === "custom"} onClick={() => onModeChange(mode === "custom" ? "presets" : "custom")}><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button></div>{mode === "custom" ? <CustomFontSizeSetting value={customSize} onChange={onCustomSizeChange} /> : <div role="group" aria-label="Font size presets" className="paragraph-font-size-options" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(5, fontSizes.length))}, minmax(0, 1fr))` }}>{fontSizes.map(({ value, label, accessibleName }) => <button key={value} type="button" aria-label={accessibleName} aria-pressed={size === value} className={size === value ? "is-active" : ""} onClick={() => onSizeChange(size === value ? undefined : value as T)}>{label}</button>)}</div>}</> : null}
    {showAppearance ? <FontPreviewSelect label="Appearance" value={appearance ?? ""} matchAnchorWidth maxMenuHeight={400} menuClassName="is-appearance-menu" onChange={value => onAppearanceChange((value || undefined) as ParagraphAppearance | undefined)} options={[{ value: "", label: "Default" },
      ...weights.map(([value, label]) => ({ value, label, family: appearanceFontFamily, weight: appearanceWeightValues[value] })),
      ...weights.map(([value, label]) => ({ value: value === "regular" ? "italic" : `${value}-italic`, label: `${label} Italic`, family: appearanceFontFamily, weight: appearanceWeightValues[value], italic: true })),
    ]} disabled={disabled} /> : null}
  </fieldset>;
}
