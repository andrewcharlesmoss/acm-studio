"use client";

import { AcmIcon } from "@acm/icons/react";
import { ColourPicker, ColourValueSwatch } from "./colour-picker";

export function PaletteColourSetting({ label, row = false, value, onChange, hoverValue, onHoverChange, warningStates, warningDescriptionId, defaultWarning, hoverWarning }: {
  label: string;
  row?: boolean;
  value?: string;
  onChange: (value: string | undefined) => void;
  hoverValue?: string;
  onHoverChange?: (value: string | undefined) => void;
  warningStates?: string;
  warningDescriptionId?: string;
  defaultWarning?: boolean;
  hoverWarning?: boolean;
}) {
  const warning = warningStates || defaultWarning;
  return <ColourPicker label={label} trigger={row ? ({ expanded, controls, onClick }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label}${warning ? `. Low contrast${warningStates ? ` for ${warningStates.toLowerCase()} state` : ""}.` : ""}`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={value} /><span>{label}</span>{warning ? <span className="paragraph-palette-warning-icon" aria-hidden="true"><AcmIcon name="state.warning" size={18} /></span> : null}</button> : undefined} wrapperClassName={row ? "inspector-colour-row-setting" : undefined} value={value} onChange={onChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} descriptionId={warningDescriptionId} defaultWarning={defaultWarning} hoverWarning={hoverWarning} />;
}
