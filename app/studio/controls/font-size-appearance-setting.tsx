"use client";

import { AcmIcon } from "@acm/icons/react";
import type { ParagraphAppearance, ParagraphFontSize } from "../../content/model";
import { CustomFontSizeSetting } from "./custom-font-size-setting";

const appearanceWeights = [
  ["thin", "Thin"], ["extra-light", "Extra light"], ["light", "Light"], ["regular", "Regular"],
  ["medium", "Medium"], ["semi-bold", "Semi bold"], ["bold", "Bold"],
  ["extra-bold", "Extra bold"], ["black", "Black"],
] as const;

export function FontSizeAppearanceSetting({ size, customSize, appearance, mode, onModeChange, onSizeChange, onCustomSizeChange, onAppearanceChange, showSize = true, showAppearance = true, paragraphLabels = false, disabled = false }: {
  size?: ParagraphFontSize;
  customSize?: string;
  appearance?: ParagraphAppearance;
  mode: "presets" | "custom";
  onModeChange: (mode: "presets" | "custom") => void;
  onSizeChange: (value: ParagraphFontSize | undefined) => void;
  onCustomSizeChange: (value: string | undefined) => void;
  onAppearanceChange: (value: ParagraphAppearance | undefined) => void;
  showSize?: boolean;
  showAppearance?: boolean;
  paragraphLabels?: boolean;
  disabled?: boolean;
}) {
  const fontSizes: { value: ParagraphFontSize; label: string; accessibleName: string }[] = [
    { value: "small", label: "S", accessibleName: "Small" },
    { value: "medium", label: "M", accessibleName: "Medium" },
    { value: "large", label: "L", accessibleName: "Large" },
    { value: "x-large", label: "XL", accessibleName: paragraphLabels ? "Larger" : "Extra large" },
    { value: "xx-large", label: "XXL", accessibleName: paragraphLabels ? "XX-Large" : "Extra extra large" },
  ];
  return <fieldset className="paragraph-font-size-setting" disabled={disabled}>
    {showSize ? <><legend className="visually-hidden">Font size</legend><div className="paragraph-font-size-heading"><span>Font size</span><button type="button" className="paragraph-font-size-mode" aria-label={mode === "custom" ? "Use font size presets" : "Use custom font size"} title={mode === "custom" ? "Use font size presets" : "Use custom font size"} aria-pressed={mode === "custom"} onClick={() => onModeChange(mode === "custom" ? "presets" : "custom")}><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button></div>{mode === "custom" ? <CustomFontSizeSetting value={customSize} onChange={onCustomSizeChange} /> : <div role="group" aria-label="Font size presets" className="paragraph-font-size-options">{fontSizes.map(({ value, label, accessibleName }) => <button key={value} type="button" aria-label={accessibleName} aria-pressed={size === value} className={size === value ? "is-active" : ""} onClick={() => onSizeChange(size === value ? undefined : value)}>{label}</button>)}</div>}</> : null}
    {showAppearance ? <label><span>Appearance</span><select value={appearance ?? ""} onChange={(event) => onAppearanceChange((event.target.value || undefined) as ParagraphAppearance | undefined)}><option value="">Default</option>{appearanceWeights.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{appearanceWeights.map(([value, label]) => <option key={`${value}-italic`} value={value === "regular" ? "italic" : `${value}-italic`}>{label} italic</option>)}</select></label> : null}
  </fieldset>;
}
