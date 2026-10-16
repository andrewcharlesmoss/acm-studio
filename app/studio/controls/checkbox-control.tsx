"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import "./choice-controls.css";

type CheckboxInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "defaultChecked" | "onChange" | "disabled" | "className" | "style" | "children">;

/** Native semantics and keyboard input; the owner supplies controlled or default state. */
export function CheckboxControl({ label, checked, defaultChecked, indeterminate = false, disabled = false, onChange, className = "", inputProps }: {
  label: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  inputProps?: CheckboxInputProps;
}) {
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate, checked]);
  return <label htmlFor={inputProps?.id} className={`studio-choice-control ${className}`} {...controlLibraryAttributes("checkbox")}><input {...inputProps} ref={input} type="checkbox" checked={checked} defaultChecked={defaultChecked} disabled={disabled} onChange={event => onChange?.(event.target.checked)} />{label != null ? <span>{label}</span> : null}</label>;
}
