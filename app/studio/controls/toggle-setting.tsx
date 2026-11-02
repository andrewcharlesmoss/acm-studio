"use client";
import { SettingLabel } from "./setting-inheritance";

import type { ReactNode } from "react";
import "./inspector-controls.css";

export function ToggleSetting({ label, inheritanceLabel, checked, disabled = false, onChange }: {
  label: ReactNode; inheritanceLabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <label className="studio-toggle-setting"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="studio-toggle-track" aria-hidden="true" /><SettingLabel inheritanceLabel={inheritanceLabel}>{label}</SettingLabel></label>;
}
