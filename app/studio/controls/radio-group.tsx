"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { useId, type ReactNode } from "react";
import "./choice-controls.css";

type RadioOption = { value: string; label: ReactNode; disabled?: boolean; accessibleName?: string; title?: string };

/** Keep native grouping, Tab entry, Space selection, and arrow-key navigation. */
export function RadioGroup({ label, options, value, disabled = false, presentation = "radios", hideLabel = false, onChange }: {
  label: string;
  options: readonly RadioOption[];
  value?: string;
  disabled?: boolean;
  presentation?: "radios" | "buttons" | "segmented";
  hideLabel?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return <fieldset className={`studio-radio-group${presentation !== "radios" ? ` studio-radio-group--buttons${presentation === "segmented" ? " studio-radio-group--segmented" : ""}` : ""}`} {...controlLibraryAttributes("radio-group")} role="radiogroup" aria-labelledby={`${id}-label`} disabled={disabled}>
    <legend className={hideLabel ? "visually-hidden" : undefined} id={`${id}-label`}>{label}</legend>
    {options.map(option => <label className="studio-choice-control" key={option.value} title={option.title}><input type="radio" aria-label={option.accessibleName} name={id} value={option.value} checked={value === option.value} disabled={disabled || option.disabled} onChange={event => { if (event.target.checked) onChange(option.value); }} /><span>{option.label}</span></label>)}
  </fieldset>;
}
