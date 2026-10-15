"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { useId, type ReactNode } from "react";
import "./choice-controls.css";

type RadioOption = { value: string; label: ReactNode; disabled?: boolean };

/** Keep native grouping, Tab entry, Space selection, and arrow-key navigation. */
export function RadioGroup({ label, options, value, disabled = false, onChange }: {
  label: string;
  options: readonly RadioOption[];
  value?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return <fieldset className="studio-radio-group" {...controlLibraryAttributes("radio-group")} role="radiogroup" aria-labelledby={`${id}-label`} disabled={disabled}>
    <legend id={`${id}-label`}>{label}</legend>
    {options.map(option => <label className="studio-choice-control" key={option.value}><input type="radio" name={id} value={option.value} checked={value === option.value} disabled={disabled || option.disabled} onChange={event => { if (event.target.checked) onChange(option.value); }} /><span>{option.label}</span></label>)}
  </fieldset>;
}
