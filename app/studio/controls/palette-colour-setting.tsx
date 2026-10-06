"use client";

import { AcmIcon } from "@acm/icons/react";
import { ColourPicker, ColourValueSwatch } from "./colour-picker";

export function PaletteColourSetting({ label, row = false, value, onChange, hoverValue, onHoverChange, warningStates, warningDescriptionId, defaultWarning, hoverWarning, warningMessage, hoverWarningMessage, announceWarning }: {
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
  warningMessage?: string;
  hoverWarningMessage?: string;
  announceWarning?: boolean;
}) {
  const warning = warningStates || defaultWarning;
  const hasHoverState = Boolean(onHoverChange);
  return <ColourPicker label={label} trigger={row ? ({ expanded, controls, onClick }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label}${warning ? `. Colour warning${warningStates ? ` for ${warningStates.toLowerCase()} state` : ""}.` : ""}`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}>{hasHoverState ? <span className="inspector-colour-row-swatches" aria-hidden="true"><ColourValueSwatch value={value} /><ColourValueSwatch value={hoverValue} overlap /></span> : <ColourValueSwatch value={value} />}<span>{label}</span>{warning ? <span className="paragraph-palette-warning-icon" aria-hidden="true"><AcmIcon name="state.warning" size={18} /></span> : null}</button> : undefined} wrapperClassName={row ? "inspector-colour-row-setting" : undefined} value={value} onChange={onChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} descriptionId={warningDescriptionId} defaultWarning={defaultWarning} hoverWarning={hoverWarning} warningMessage={warningMessage} hoverWarningMessage={hoverWarningMessage} announceWarning={announceWarning} />;
}
