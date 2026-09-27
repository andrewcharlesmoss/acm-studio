"use client";

import { useState } from "react";

const SUPPORTED_COLOUR = /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i;

export function BorderColourControl({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (!next) onChange(undefined);
    else if (SUPPORTED_COLOUR.test(next) && CSS.supports("color", next)) onChange(next);
  }
  return <div className="box-border-colour">
    <label><span>Border colour</span><span className="box-border-swatch" style={value ? { backgroundColor: value } : undefined}><input aria-label="Choose border colour" type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#d1cfc7"} onChange={event => onChange(event.target.value)} /></span></label>
    <input aria-label="Border colour value" value={draft ?? value ?? ""} placeholder="Default" onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
  </div>;
}
