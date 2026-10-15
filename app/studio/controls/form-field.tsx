"use client";

import { useId, type ReactNode } from "react";
import { controlLibraryAttributes } from "./control-library-links";
import "./form-field.css";

type FieldInputAttributes = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

/** Presentation and accessible associations only; feature adapters own validation. */
export function FormField({ id: suppliedId, label, description, error, className = "", children }: {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (attributes: FieldInputAttributes) => ReactNode;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const describedBy = [description ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return <div className={`studio-form-field ${className}`} {...controlLibraryAttributes("form-field")}>
    <label htmlFor={id}>{label}</label>
    {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
    {description ? <p className="studio-field-description setting-note" id={`${id}-help`}>{description}</p> : null}
    {error ? <p className="studio-field-error" id={`${id}-error`} role="alert">{error}</p> : null}
  </div>;
}
