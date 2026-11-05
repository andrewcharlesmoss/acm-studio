"use client";
import { SettingLabel, useSettingInherited } from "./setting-inheritance";
import { InheritedIndicator } from "./inherited-indicator";

import { SelectControl } from "./native-fields";
import { NumberUnitField } from "./number-unit-field";
import { RangeControl } from "./range-control";

import { useId, useState, type ComponentProps } from "react";
import type { ParagraphBorderStyle } from "../../content/model";
import { compactBoxLengths, expandBoxLengths, validBoxLengths } from "../../content/box-lengths";
import { StudioIcon } from "../studio-icons";
import { ColourPicker, ColourValueSwatch } from "./colour-picker";
import "./inspector-controls.css";

const sides = ["Top", "Right", "Bottom", "Left"] as const;
const units = ["px", "em", "rem", "vw", "vh", "ch"];

function lengthParts(value: string) {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|em|rem|%|vw|vh|ch)?$/);
  return { amount: match ? Number(match[1]) : 0, unit: match?.[2] ?? "px" };
}

function supportedWidth(amount: number, unit: string) {
  const value = `${amount}${unit}`;
  return Number.isFinite(amount) && amount >= 0 && validBoxLengths(value) ? value : undefined;
}

type Props = {
  palette?: ComponentProps<typeof ColourPicker>['palette'];
  enableAlpha?: boolean;
  onSelectPalette?: ComponentProps<typeof ColourPicker>['onSelectPalette'];
  initiallyLinked?: boolean;
  allowStyle?: boolean;
  unitOptions?: readonly string[];
  value?: string;
  resolvedSides?: readonly [string, string, string, string];
  onSidesChange?: (indices: number[], value: string | undefined) => void;
  colour?: string;
  borderStyle?: ParagraphBorderStyle;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
  onColourChange: (value: string | undefined) => void;
  onStyleChange: (value: ParagraphBorderStyle) => void;
};

function BorderWidthInput({ palette, enableAlpha, onSelectPalette, allowStyle = true, label, value, mixed = false, colour, borderStyle, disabled, unitOptions, onChange, onColourChange, onStyleChange }: Props & { label: string; mixed?: boolean }) {
  const { amount, unit } = lengthParts(value ?? "0");
  const inheritedDescriptionId = useId();
  const inheritedColour = useSettingInherited("Border colour");
  const inheritedStyle = useSettingInherited("Border style");
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (!next) onChange(undefined);
    else {
      const width = supportedWidth(Number(next), unit);
      if (width !== undefined) onChange(width);
    }
  }
  return <NumberUnitField className={`studio-border-input is-${label.toLowerCase()}`}
    leadingControl={
    <ColourPicker palette={palette} enableAlpha={enableAlpha} onSelectPalette={onSelectPalette} label="Border colour" value={colour} disabled={disabled} onChange={onColourChange}
      additionalControls={allowStyle ? <><label className="studio-border-style"><SettingLabel>Border style</SettingLabel><SelectControl aria-label="Border style" aria-describedby={inheritedStyle ? `${inheritedDescriptionId}-style` : undefined} value={borderStyle ?? "none"} disabled={disabled} onChange={event => onStyleChange(event.target.value as ParagraphBorderStyle)}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></SelectControl>{inheritedStyle ? <span id={`${inheritedDescriptionId}-style`} className="visually-hidden" aria-hidden="true">Inherited border style</span> : null}</label><p className="studio-border-shared-note">Colour and style apply to all sides.</p></> : undefined}
      trigger={({ expanded, controls, onClick }) => <button className="studio-border-colour" data-inherited={inheritedColour || undefined} type="button" disabled={disabled} aria-describedby={inheritedColour ? `${inheritedDescriptionId}-colour` : undefined} aria-label={`Choose border colour for all sides (${label} control)`} title={allowStyle ? "Border colour and style for all sides" : "Border colour for all sides"} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={colour} />{inheritedColour ? <><InheritedIndicator /><span id={`${inheritedDescriptionId}-colour`} className="visually-hidden" aria-hidden="true">Inherited border colour</span></> : null}</button>} />
    }
    inputProps={{ "aria-label": `Border ${label} width`, disabled, min: 0, step: "any", placeholder: mixed ? "Mixed" : "", value: draft ?? (value && !mixed ? amount : ""),
      onChange: event => setDraft(event.target.value), onBlur: commit,
      onKeyDown: event => { if (event.key === "Enter") event.currentTarget.blur(); } }}
    unitProps={{ "aria-label": `Border ${label} unit`, disabled, value: unit,
      onChange: event => { const next = draft === null || draft === "" ? amount : Number(draft); setDraft(null); const width = supportedWidth(next, event.target.value); if (width !== undefined) onChange(width); } }}
    units={[...(unit === "%" ? ["%"] : []), ...(unitOptions ?? units)]} />;
}

/** Widths use the existing CSS shorthand; linking the view never discards mixed values. */
export function BorderWidthSetting(props: Props) {
  const inheritedWidthDescriptionId = useId();
  const inheritedWidth = useSettingInherited("Border width");
  const parts = props.resolvedSides ?? expandBoxLengths(props.value);
  const [splitOverride, setSplitOverride] = useState<boolean | null>(null);
  const split = splitOverride ?? Boolean(!props.initiallyLinked && props.value && props.value.trim().split(/\s+/).length > 1);
  const mixed = (splitOverride !== null || !props.initiallyLinked) && parts.some(part => part !== parts[0]);
  const { amount, unit } = lengthParts(parts[0]);
  function updateSide(index: number, value: string | undefined) {
    if (props.onSidesChange) { props.onSidesChange([index], value); return; }
    const next = [...parts];
    next[index] = value ?? "0px";
    props.onChange(compactBoxLengths(next));
  }
  return <div className={`studio-border-width${split ? " is-split" : " is-linked"}`} role="group" aria-label="Border widths" aria-describedby={inheritedWidth ? inheritedWidthDescriptionId : undefined}>
    {inheritedWidth ? <span id={inheritedWidthDescriptionId} className="visually-hidden" aria-hidden="true">Some or all border widths are inherited</span> : null}
    {split ? <div className="studio-border-diagram" aria-hidden="true" /> : null}
    {split ? sides.map((side, index) => <BorderWidthInput key={side} {...props} label={side} value={props.value || props.resolvedSides ? parts[index] : undefined} onChange={value => updateSide(index, value)} />) : <>
      <BorderWidthInput {...props} label="All" value={props.value || props.resolvedSides ? parts[0] : undefined} mixed={mixed} onChange={value => props.onSidesChange ? props.onSidesChange([0, 1, 2, 3], value) : props.onChange(value)} />
      <RangeControl className="studio-range-control" disabled={props.disabled} aria-label="Border width" aria-valuetext={mixed ? "Mixed" : props.value ? `${amount}${unit}` : "Default"} min={0} max={Number.isFinite(amount) ? Math.max(100, amount) : 100} step="1" value={Number.isFinite(amount) ? amount : 0} onChange={event => { const width = supportedWidth(Number(event.target.value), unit); if (width !== undefined) { if (props.onSidesChange) props.onSidesChange([0, 1, 2, 3], width); else props.onChange(width); } }} />
    </>}
    <button className="studio-border-link" type="button" disabled={props.disabled} aria-label={split ? "Link border sides" : "Unlink border sides"} title={split ? "Link border sides" : "Edit border sides separately"} aria-pressed={!split} onClick={() => setSplitOverride(!split)}><StudioIcon name={split ? "link-off" : "link"} size={24} /></button>
  </div>;
}
