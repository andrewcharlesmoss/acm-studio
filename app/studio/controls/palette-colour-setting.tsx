"use client";

import "./palette-colour-setting.css";
import { AcmIcon } from "@acm/icons/react";
import { ColourPicker, ColourValueSwatch, type ColourPaletteEntry } from "./colour-picker";
import { useSettingInherited } from "./setting-inheritance";
import { InheritedIndicator } from "./inherited-indicator";

export function PaletteColourSetting({ label, row = false, value, inheritedValue, onChange, hoverValue, onHoverChange, warningStates, warningDescriptionId, defaultWarning, hoverWarning, warningMessage, hoverWarningMessage, announceWarning, disabled = false, palette, enableAlpha, onSelectPalette }: {
  label: string;
  onSelectPalette?: (entry: ColourPaletteEntry, state: "default" | "hover") => void;
  palette?: readonly ColourPaletteEntry[];
  enableAlpha?: boolean;
  row?: boolean;
  value?: string;
  /** Presentation only: the effective colour when this setting has no override. */
  inheritedValue?: string;
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
  disabled?: boolean;
}) {
  const warning = warningStates || defaultWarning;
  const hasHoverState = Boolean(onHoverChange);
  const contextInherited = useSettingInherited(label);
  const inheritedValueShown = value === undefined && Boolean(inheritedValue);
  const inherited = contextInherited || inheritedValueShown;
  return <ColourPicker onSelectPalette={onSelectPalette} palette={palette} enableAlpha={enableAlpha} label={label} disabled={disabled} trigger={row ? ({ disabled: triggerDisabled, expanded, controls, onClick }) => <button type="button" disabled={triggerDisabled} className="inspector-colour-row" aria-label={`Choose ${label}${inheritedValueShown ? `. Inherited colour ${inheritedValue}` : ""}${warning ? `. Colour warning${warningStates ? ` for ${warningStates.toLowerCase()} state` : ""}.` : ""}`} aria-description={contextInherited && !inheritedValueShown ? "Inherited" : undefined} aria-expanded={expanded} aria-controls={controls} onClick={onClick}>{hasHoverState ? <span className="inspector-colour-row-swatches" aria-hidden="true"><ColourValueSwatch value={value ?? inheritedValue} /><ColourValueSwatch value={hoverValue} overlap /></span> : <ColourValueSwatch value={value ?? inheritedValue} />}<span>{label}</span>{inherited || warning ? <span className="inspector-colour-row-indicators">{inherited ? <InheritedIndicator /> : null}{warning ? <span className="paragraph-palette-warning-icon" aria-hidden="true" title="Colour warning"><AcmIcon name="state.warning" size={18} /></span> : null}</span> : null}</button> : undefined} wrapperClassName={row ? "inspector-colour-row-setting" : undefined} value={value} onChange={onChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} descriptionId={warningDescriptionId} defaultWarning={defaultWarning} hoverWarning={hoverWarning} warningMessage={warningMessage} hoverWarningMessage={hoverWarningMessage} announceWarning={announceWarning} />;
}
