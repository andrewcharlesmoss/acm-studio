"use client";

import type { ReactNode } from "react";
import "./inspector-controls.css";

export function ToggleSetting({ label, checked, disabled = false, onChange }: {
  label: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <label className="studio-toggle-setting"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="studio-toggle-track" aria-hidden="true" /><span>{label}</span></label>;
}
