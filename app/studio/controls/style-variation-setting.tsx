"use client";

import "./inspector-controls.css";
import { TEXT_STYLE_VARIATIONS, type TextStyleVariation } from "../../content/text-style-variations";

export type StyleVariationValue = TextStyleVariation | "plain" | "stripes";

export function StyleVariationSetting({ kind, value = "default", disabled = false, onChange }: {
  kind: "quote" | "table" | "paragraph" | "heading";
  value?: StyleVariationValue;
  disabled?: boolean;
  onChange: (value: StyleVariationValue) => void;
}) {
  const textKind = kind === "paragraph" || kind === "heading";
  const choices = textKind ? [{ value: "default", label: "Default" }, ...TEXT_STYLE_VARIATIONS.map(choice => ({ value: choice.id, label: choice.label }))] as const : kind === "quote" ? [{ value: "default", label: "Default" }, { value: "plain", label: "Plain" }] as const : [{ value: "default", label: "Default" }, { value: "stripes", label: "Stripes" }] as const;
  return <div className={`studio-style-variations${kind !== "quote" ? " is-label-only" : ""}`} role="group" aria-label={`${kind.charAt(0).toUpperCase() + kind.slice(1)} styles`}>
    {choices.map(choice => <button type="button" key={choice.value} aria-pressed={(choices.some(choice => choice.value === value) ? value : "default") === choice.value} disabled={disabled} onClick={() => onChange(choice.value)}>
      {kind === "quote" ? <span className={`studio-style-preview is-quote is-${choice.value}`} aria-hidden="true"><blockquote><p>Quote</p><cite>Citation</cite></blockquote></span> : null}
      <span>{choice.label}</span>
    </button>)}
  </div>;
}

/** Navigation to edit a registered variation, rather than applying it to content. */
export function StyleVariationList({ choices, onChoose }: { choices: readonly { id: string; label: string }[]; onChoose: (id: string) => void }) {
  return <div className="studio-style-variation-list" role="group" aria-label="Style variations">{choices.map(choice => <button type="button" key={choice.id} onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</div>;
}
