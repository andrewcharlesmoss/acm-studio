"use client";

import { useState, type ReactNode } from "react";

export function ParagraphLengthSetting({ label, value, min, max, onChange, disabled = false }: { label: ReactNode; value?: string; min: number; max: number; onChange: (value: string | undefined) => void; disabled?: boolean }) {
  const match = value?.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)?$/);
  const number = match ? Number(match[1]) : 0;
  const unit = match?.[2] ?? "px";
  const [draft, setDraft] = useState<string | null>(null);
  const displayedDraft = draft ?? (match ? match[1] : "");
  const units = ["px", "rem", "em", "%", "ch", "vw", "vh"];
  function setNumber(next: number) {
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(min, Math.min(max, next));
    setDraft(null);
    onChange(bounded === 0 && !value ? undefined : `${bounded}${unit}`);
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
  const rangeMin = Math.min(min, number);
  const rangeMax = Math.max(max, number);
  return <div className="paragraph-length-setting"><span>{label}</span><div className="paragraph-length-controls"><input disabled={disabled} aria-label={`${label} amount`} type="range" min={rangeMin} max={rangeMax} step="0.1" value={number} onChange={(event) => setNumber(Number(event.target.value))} /><input disabled={disabled} aria-label={`${label} value`} type="number" min={min} max={max} step="0.1" value={displayedDraft} placeholder="0" onChange={(event) => setDraft(event.target.value)} onBlur={commitDraft} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select aria-label={`${label} unit`} value={unit} onChange={(event) => { const nextUnit = event.target.value; if (match) onChange(`${number}${nextUnit}`); }} disabled={disabled || !match}>{units.map((option) => <option key={option} value={option}>{option}</option>)}</select><button type="button" className="paragraph-reset-button" onClick={() => { setDraft(null); onChange(undefined); }} disabled={disabled || !value}>Reset</button></div></div>;
}
