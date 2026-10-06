"use client";

import { useId, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { UNIVERSAL_STYLE_PRESET } from "@acm/styles";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { paragraphTextColourHasPoorContrast } from "../../content/paragraph-styles";
import { GradientPicker } from "./gradient-picker";
import { ColourPicker } from "./colour-picker";

export function BackgroundSelection({ mode, colour, gradient, textColour, fontSize, fontWeight, assessTextContrast = false, hasBackgroundImage = false, contrastWarning, announceWarning, imageControl, onModeChange, onColourChange, onGradientChange, disabled = false }: {
  imageControl?: ReactNode;
  mode: "colour" | "gradient";
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
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
  const [showContrastHelp, setShowContrastHelp] = useState(false);
  const contrastHelpId = useId();
  const lowContrast = contrastWarning === undefined
    ? Boolean(assessTextContrast && colour && !hasBackgroundImage && paragraphTextColourHasPoorContrast(textColour ?? UNIVERSAL_STYLE_PRESET.palette.textPrimary, colour, fontSize, fontWeight))
    : Boolean(contrastWarning);
  return <div className="paragraph-background-control">
    <ColourPicker label="Background colour" value={colour} onChange={onColourChange} clearLabel="Clear background colour" wrapperClassName="paragraph-background-picker" disabled={disabled} defaultWarning={lowContrast} warningMessage={contrastWarning ?? undefined} announceWarning={announceWarning} trigger={({ disabled: isDisabled, expanded, controls, onClick, close }) => <div className="paragraph-background-modes" role="group" aria-label="Background type">
      {imageControl ? <div className="paragraph-background-option-row">{imageControl}</div> : null}
      <div className="paragraph-background-option-row">
        <button type="button" className="paragraph-background-option" disabled={isDisabled} aria-pressed={mode === "colour"} aria-expanded={expanded} aria-controls={controls} onClick={() => { onModeChange("colour"); onClick(); }}>
          <span className={`paragraph-background-mode-swatch${colour ? " has-colour" : ""}`} aria-hidden="true" style={colour ? { backgroundColor: colour } : undefined} />Colour
        </button>
        <span className="paragraph-background-option-actions">
          {colour ? <button type="button" className="paragraph-background-reset-button" title="Reset" aria-label="Reset background colour" disabled={isDisabled} onClick={() => { setShowContrastHelp(false); onColourChange(undefined); }}><AcmIcon name="action.remove" size={16} /></button> : null}
          {lowContrast ? <button type="button" className="paragraph-background-contrast-button" title="Colour warning" aria-label="Colour warning" aria-expanded={showContrastHelp} aria-controls={contrastHelpId} disabled={isDisabled} onClick={() => setShowContrastHelp(value => !value)}><AcmIcon name="state.warning" size={18} /></button> : null}
        </span>
      </div>
      <div className="paragraph-background-option-row paragraph-gradient-option-row"><GradientPicker active={mode === "gradient"} value={gradient} onChange={onGradientChange} disabled={isDisabled} onOpen={() => { onModeChange("gradient"); close(); }} /></div>
      {lowContrast ? <p className="paragraph-background-contrast-help" id={contrastHelpId} role={announceWarning === false ? undefined : "status"} hidden={!showContrastHelp}>{contrastWarning ?? "Text and background colours may be difficult to read together. Choose a combination that meets WCAG AA for this text size."}</p> : null}
    </div>} />

  </div>;
}
