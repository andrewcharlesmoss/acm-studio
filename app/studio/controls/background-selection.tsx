"use client";
import { useSettingInherited } from "./setting-inheritance";
import { InheritedIndicator } from "./inherited-indicator";

import "./background-selection.css";

import { useRef, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { UNIVERSAL_STYLE_PRESET } from "../ui/styles/canonical-style-guide";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { paragraphTextColourHasPoorContrast } from "../../content/paragraph-styles";
import { GradientPicker } from "./gradient-picker";
import { ColourPicker, type ColourPaletteEntry } from "./colour-picker";

export function BackgroundSelection({ mode, colour, gradient, inheritedColour, inheritedGradient, textColour, fontSize, fontWeight, assessTextContrast = false, hasBackgroundImage = false, contrastWarning, announceWarning, imageControl, palette, enableAlpha, onSelectPalette, onModeChange, onColourChange, onGradientChange, disabled = false, allowGradient = true }: {
  allowGradient?: boolean;
  palette?: readonly ColourPaletteEntry[];
  enableAlpha?: boolean;
  onSelectPalette?: (entry: ColourPaletteEntry) => void;
  imageControl?: ReactNode;
  mode: "colour" | "gradient";
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
  inheritedColour?: string;
  inheritedGradient?: ParagraphBackgroundGradient;
  textColour?: string;
  fontSize?: string;
  fontWeight?: number | string;
  assessTextContrast?: boolean;
  hasBackgroundImage?: boolean;
  contrastWarning?: string | null;
  announceWarning?: boolean;
  onModeChange: (mode: "colour" | "gradient") => void;
  onColourChange: (value: string | undefined) => void;
  onGradientChange: (value: ParagraphBackgroundGradient | undefined) => void;
  disabled?: boolean;
}) {
  const inheritedColourFlag = useSettingInherited("Background colour");
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const colourTriggerRef = useRef<HTMLButtonElement>(null);
  const lowContrast = contrastWarning === undefined
    ? Boolean(assessTextContrast && colour && !hasBackgroundImage && paragraphTextColourHasPoorContrast(textColour ?? UNIVERSAL_STYLE_PRESET.palette.textPrimary, colour, fontSize, fontWeight))
    : Boolean(contrastWarning);
  return <div className="paragraph-background-control">
    <ColourPicker label="Background colour" value={colour} palette={palette} enableAlpha={enableAlpha} onSelectPalette={onSelectPalette} onChange={onColourChange} clearLabel="Clear background colour" wrapperClassName="paragraph-background-picker" focusReturnRef={focusReturnRef} focusFallbackRef={colourTriggerRef} disabled={disabled} defaultWarning={lowContrast} warningMessage={contrastWarning ?? undefined} announceWarning={announceWarning} trigger={({ disabled: isDisabled, expanded, controls, onClick, close }) => <div className="paragraph-background-modes" role="group" aria-label="Background type">
      {imageControl ? <div className="paragraph-background-option-row">{imageControl}</div> : null}
      <div className="paragraph-background-option-row">
        <button ref={colourTriggerRef} type="button" className="paragraph-background-option" disabled={isDisabled} aria-pressed={mode === "colour"} aria-expanded={expanded} aria-controls={controls} onClick={event => { focusReturnRef.current = event.currentTarget; onModeChange("colour"); onClick(); }}>
          <span className={`paragraph-background-mode-swatch${colour || inheritedColour ? " has-colour" : ""}`} aria-hidden="true" style={colour || inheritedColour ? { backgroundImage: `linear-gradient(${colour ?? inheritedColour}, ${colour ?? inheritedColour}), var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" } : undefined} />Colour
        </button>
        <span className="paragraph-background-option-actions">
          {inheritedColourFlag ? <><InheritedIndicator /><span className="visually-hidden">Inherited background colour</span></> : null}
          {colour ? <button type="button" className="paragraph-background-reset-button" title="Reset" aria-label="Reset background colour" disabled={isDisabled} onClick={() => onColourChange(undefined)}><AcmIcon name="action.remove" size={16} /></button> : null}
          {lowContrast ? <button type="button" className="paragraph-background-contrast-button" title="Colour warning" aria-label="Colour warning" aria-expanded={expanded} aria-controls={controls} disabled={isDisabled} onClick={event => { focusReturnRef.current = event.currentTarget; onModeChange("colour"); onClick(); }}><AcmIcon name="state.warning" size={18} /></button> : null}
        </span>
      </div>
      {allowGradient ? <div className="paragraph-background-option-row paragraph-gradient-option-row"><GradientPicker active={mode === "gradient"} value={gradient} inheritedValue={inheritedGradient} onChange={onGradientChange} disabled={isDisabled} onOpen={() => { onModeChange("gradient"); close(); }} /></div> : null}
    </div>} />

  </div>;
}
