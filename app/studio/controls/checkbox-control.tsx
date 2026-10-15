"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import "./choice-controls.css";

/** Native semantics and keyboard input; the owner supplies checked and mixed state. */
export function CheckboxControl({ label, checked, indeterminate = false, disabled = false, onChange, className = "" }: {
  label: ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate, checked]);
  return <label className={`studio-choice-control ${className}`}><input ref={input} type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}
