"use client";

import { AcmIcon } from "@acm/icons/react";
import type { ComponentPropsWithoutRef } from "react";
import { StudioButton } from "./button";
import { NumberInput } from "./native-fields";
import "./number-stepper.css";

type NumberStepperProps = ComponentPropsWithoutRef<typeof NumberInput> & {
  label: string;
  value: string | number;
  min: number;
  max: number;
  onStep: (direction: -1 | 1) => void;
};

/** Hosts own the draft and decide when to commit changes. */
export function NumberStepper({ label, value, min, max, step, disabled, readOnly, onStep, ...input }: NumberStepperProps) {
  const number = String(value).trim() === "" ? undefined : Number(value);
  const locked = disabled || readOnly;
  return <div className="studio-number-stepper">
    <NumberInput {...input} aria-label={label} value={value} min={min} max={max} step={step} disabled={disabled} readOnly={readOnly} />
    <StudioButton type="button" variant="text" aria-label={`Increase ${label}`} title={`Increase ${label}`}
      disabled={locked || (number !== undefined && number >= max)} onClick={() => onStep(1)}>
      <AcmIcon name="action.add" size={20} scale="Regular-M" />
    </StudioButton>
    <StudioButton type="button" variant="text" aria-label={`Decrease ${label}`} title={`Decrease ${label}`}
      disabled={locked || (number !== undefined && number <= min)} onClick={() => onStep(-1)}>
      <AcmIcon name="action.remove" size={20} scale="Regular-M" />
    </StudioButton>
  </div>;
}
