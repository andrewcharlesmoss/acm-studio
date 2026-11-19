"use client";

import { AcmIcon } from "@acm/icons/react";
import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
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
  const latestStep = useRef(onStep);
  const press = useRef<{ button: HTMLButtonElement; pointerId: number; timer?: number; repeated: boolean } | null>(null);
  useLayoutEffect(() => { latestStep.current = onStep; }, [onStep]);
  useLayoutEffect(() => {
    const stop = () => window.clearTimeout(press.current?.timer);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      stop();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
    };
  }, []);

  function stopRepeat(event: PointerEvent<HTMLButtonElement>) {
    const current = press.current;
    if (current?.button === event.currentTarget && current.pointerId === event.pointerId) window.clearTimeout(current.timer);
  }

  function startRepeat(event: PointerEvent<HTMLButtonElement>, direction: -1 | 1) {
    if (!event.isPrimary || event.button !== 0) return;
    window.clearTimeout(press.current?.timer);
    const button = event.currentTarget;
    const current: NonNullable<typeof press.current> = { button, pointerId: event.pointerId, repeated: false };
    press.current = current;
    function repeat() {
      if (button.disabled) return;
      current.repeated = true;
      latestStep.current(direction);
      current.timer = window.setTimeout(repeat, 90);
    }
    current.timer = window.setTimeout(repeat, 400);
  }

  return <div className="studio-number-stepper">
    <NumberInput {...input} aria-label={label} value={value} min={min} max={max} step={step} disabled={disabled} readOnly={readOnly} />
    {([1, -1] as const).map(direction => {
      const action = `${direction === 1 ? "Increase" : "Decrease"} ${label}`;
      const atLimit = number !== undefined && (direction === 1 ? number >= max : number <= min);
      return <StudioButton key={direction} type="button" variant="text" aria-label={action} title={action}
        disabled={locked || atLimit}
        onPointerDown={event => startRepeat(event, direction)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onLostPointerCapture={stopRepeat}
        onBlur={event => {
          if (press.current?.button === event.currentTarget) window.clearTimeout(press.current.timer);
        }}
        onClick={event => {
          const current = press.current;
          if (event.detail === 0 || current?.button !== event.currentTarget || !current.repeated) onStep(direction);
        }}>
        <AcmIcon name={direction === 1 ? "action.add" : "action.remove"} size={20} scale="Regular-M" />
      </StudioButton>;
    })}
  </div>;
}
