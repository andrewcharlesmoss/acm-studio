"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { NumberInput, SelectControl } from "./native-fields";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import "./number-unit-field.css";

type Props = {
  id?: string;
  className?: string;
  leadingControl?: ReactNode;
  inputProps: Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
  unitProps: SelectHTMLAttributes<HTMLSelectElement>;
  units: readonly string[];
};

/** Shared presentation; each setting owns its value, units and validation policy. */
export function NumberUnitField({ id, className = "", leadingControl, inputProps, unitProps, units }: Props) {
  return <div id={id} className={`studio-number-unit-field ${className}`} {...controlLibraryAttributes("number-unit-field")}>
    {leadingControl}
    <NumberInput {...inputProps} />
    <SelectControl {...unitProps}>
      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
    </SelectControl>
  </div>;
}
