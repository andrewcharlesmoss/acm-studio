"use client";

import "./inspector-controls.css";

export function StyleVariationSetting({ kind, value = "default", disabled = false, onChange }: {
  kind: "quote" | "table";
  value?: "default" | "plain" | "stripes";
  disabled?: boolean;
  onChange: (value: "default" | "plain" | "stripes") => void;
}) {
  const choices = kind === "quote" ? [{ value: "default", label: "Default" }, { value: "plain", label: "Plain" }] as const : [{ value: "default", label: "Default" }, { value: "stripes", label: "Stripes" }] as const;
  return <div className={`studio-style-variations${kind === "table" ? " is-label-only" : ""}`} role="group" aria-label={`${kind === "quote" ? "Quote" : "Table"} styles`}>
    {choices.map(choice => <button type="button" key={choice.value} aria-pressed={value === choice.value} disabled={disabled} onClick={() => onChange(choice.value)}>
      {kind === "quote" ? <span className={`studio-style-preview is-quote is-${choice.value}`} aria-hidden="true"><blockquote><p>Quote</p><cite>Citation</cite></blockquote></span> : null}
      <span>{choice.label}</span>
    </button>)}
  </div>;
}

/** Navigation to edit a registered variation, rather than applying it to content. */
export function StyleVariationList({ choices, onChoose }: { choices: readonly { id: string; label: string }[]; onChoose: (id: string) => void }) {
  return <div className="studio-style-variation-list" role="group" aria-label="Style variations">{choices.map(choice => <button type="button" key={choice.id} onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</div>;
}
