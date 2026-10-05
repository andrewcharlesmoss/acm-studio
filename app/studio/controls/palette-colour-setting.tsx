"use client";

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
  return <ColourPicker label={label} trigger={row ? ({ expanded, controls, onClick }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label}`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={value} /><span>{label}</span></button> : undefined} wrapperClassName={row ? "inspector-colour-row-setting" : undefined} value={value} onChange={onChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} descriptionId={warningDescriptionId} defaultWarning={defaultWarning} hoverWarning={hoverWarning} />;
}
