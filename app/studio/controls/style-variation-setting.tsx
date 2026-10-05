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
