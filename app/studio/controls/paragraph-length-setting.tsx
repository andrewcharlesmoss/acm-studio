"use client";
import { cssDecimal } from "../../content/box-lengths";

import { NumberUnitField } from "./number-unit-field";
import { RangeControl } from "./range-control";

import { useState, type ReactNode } from "react";

export function ParagraphLengthSetting({ label, value, min, max, onChange, disabled = false, presentation = "standard", units = ["px", "rem", "em", "%", "ch", "vw", "vh"] }: { label: ReactNode; value?: string; min: number; max: number; onChange: (value: string | undefined) => void; disabled?: boolean; presentation?: "standard" | "input-first"; units?: readonly string[] }) {
  const match = value?.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)?$/);
  const number = match ? Number(match[1]) : 0;
  const [emptyUnit, setEmptyUnit] = useState("px");
  const unit = match?.[2] ?? (presentation === "input-first" ? emptyUnit : "px");
  const [draft, setDraft] = useState<string | null>(null);
  const displayedDraft = draft ?? (match ? match[1] : "");
  function setNumber(next: number) {
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(min, Math.min(max, next));
    setDraft(null);
    onChange(bounded === 0 && !value ? undefined : `${cssDecimal(bounded)}${unit}`);
  }
  function commitDraft() {
    if (draft === null) return;
    if (draft.trim() === "") {
      setDraft(null);
      onChange(undefined);
      return;
    }
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) setNumber(parsed);
    else setDraft(null);
  }
  const rangeMin = Math.min(presentation === "input-first" ? 0 : min, number);
  const rangeMax = Math.max(max, number);
  const range = <RangeControl className="studio-range-control" disabled={disabled} aria-label={`${label} amount`} min={rangeMin} max={rangeMax} step="0.1" value={number} onChange={(event) => setNumber(Number(event.target.value))} />;
  const input = <NumberUnitField inputProps={{ disabled, "aria-label": `${label} value`, min, max, step: "0.1", value: displayedDraft, placeholder: presentation === "input-first" ? "" : "0", onChange: event => setDraft(event.target.value), onBlur: commitDraft, onKeyDown: event => { if (event.key === "Enter") event.currentTarget.blur(); } }} unitProps={{ "aria-label": `${label} unit`, value: unit, onChange: event => { const nextUnit = event.target.value; setEmptyUnit(nextUnit); if (match) onChange(`${cssDecimal(number)}${nextUnit}`); }, disabled: disabled || presentation !== "input-first" && !match }} units={units} />;
  return <div className="paragraph-length-setting"><span>{label}</span><div className={`paragraph-length-controls${presentation === "input-first" ? " paragraph-length-controls--input-first" : ""}`}>
    {presentation === "input-first" ? <>{input}{range}</> : <>{range}{input}<button type="button" className="paragraph-reset-button" onClick={() => { setDraft(null); onChange(undefined); }} disabled={disabled || !value}>Reset</button></>}
  </div></div>;
}
