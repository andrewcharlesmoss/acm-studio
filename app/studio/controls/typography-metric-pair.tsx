"use client";

import { useState } from "react";
import { NumberUnitField } from "./number-unit-field";
import { SettingLabel } from "./setting-inheritance";
import { LineHeightSetting } from "./line-height-setting";
import "./typography-metric-pair.css";

const units = ["px", "em", "rem"] as const;
const validStoredLetterSpacingNumber = /^-?(?:0|\d+(?:\.\d+)?)$/;

export function normaliseLetterSpacingNumber(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return undefined;
  const normalised = String(number);
  return validStoredLetterSpacingNumber.test(normalised) ? normalised : undefined;
}

function splitLetterSpacing(value: string | undefined) {
  const match = value?.trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|em|rem|%|ch|vw|vh)?$/);
  return { number: match?.[1] ?? "", unit: match?.[2] ?? "px" };
}

function LetterSpacingField({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const label = "Letter spacing";
  const parsed = splitLetterSpacing(value);
  const [unit, setUnit] = useState(parsed.unit);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setUnit(value ? splitLetterSpacing(value).unit : "px");
  }
  const write = (number: string, nextUnit = unit) => {
    if (!number.trim()) { onChange(undefined); return; }
    const normalisedNumber = normaliseLetterSpacingNumber(number);
    if (normalisedNumber === undefined) return;
    onChange(`${normalisedNumber}${nextUnit}`);
  };
  return <label className="typography-metric-field"><SettingLabel>{label}</SettingLabel><NumberUnitField
    inputProps={{
      "aria-label": label,
      value: parsed.number,
      inputMode: "decimal",
      step: "any",
      onChange: event => write(event.target.value),
    }}
    unitProps={{
      "aria-label": `${label} unit`,
      value: unit,
      onChange: event => { setUnit(event.target.value); if (parsed.number) write(parsed.number, event.target.value); },
    }}
    units={units}
  /></label>;
}

export function TypographyMetricPair({ lineHeight, inheritedLineHeight, defaultLineHeight = 1.5, letterSpacing, onLineHeightChange, onLetterSpacingChange, showLineHeight = true, showLetterSpacing = true }: {
  lineHeight?: string;
  inheritedLineHeight?: string;
  defaultLineHeight?: number;
  letterSpacing?: string;
  onLineHeightChange: (value: string | undefined) => void;
  onLetterSpacingChange: (value: string | undefined) => void;
  showLineHeight?: boolean;
  showLetterSpacing?: boolean;
}) {
  if (!showLineHeight && !showLetterSpacing) return null;
  const isUnitlessInheritedValue = inheritedLineHeight !== undefined && /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(inheritedLineHeight);
  const authoredLineHeightIsUnitless = lineHeight === undefined || /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(lineHeight);
  const inheritedPlaceholder = inheritedLineHeight ?? String(defaultLineHeight);
  return <div className="typography-metric-pair">
    {showLineHeight ? !authoredLineHeightIsUnitless ? <LineHeightSetting label="Line height" value={lineHeight} placeholder={inheritedLineHeight ?? "Default"} onChange={onLineHeightChange} /> : <LineHeightSetting label="Line height" stepper min={0.1} max={10} step={0.1} defaultValue={isUnitlessInheritedValue ? Number(inheritedLineHeight) : defaultLineHeight} value={lineHeight} placeholder={inheritedPlaceholder} onChange={onLineHeightChange} /> : null}
    {showLetterSpacing ? <LetterSpacingField value={letterSpacing} onChange={onLetterSpacingChange} /> : null}
  </div>;
}
