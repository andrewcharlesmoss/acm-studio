"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import "./number-unit-field.css";

type Props = {
  className?: string;
  leadingControl?: ReactNode;
  inputProps: Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
  unitProps: SelectHTMLAttributes<HTMLSelectElement>;
  units: readonly string[];
};

/** Shared presentation; each setting owns its value, units and validation policy. */
export function NumberUnitField({ className = "", leadingControl, inputProps, unitProps, units }: Props) {
  return <div className={`studio-number-unit-field ${className}`}>
    {leadingControl}
    <input {...inputProps} type="number" />
    <select {...unitProps}>
      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
    </select>
  </div>;
}
