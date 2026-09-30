"use client";

import type { ParagraphBackgroundGradient } from "../../content/model";
import { PARAGRAPH_BACKGROUND_GRADIENTS, paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { ColourPicker } from "./colour-picker";

export function BackgroundSelection({ mode, colour, gradient, onModeChange, onColourChange, onGradientChange, disabled = false }: {
  mode: "colour" | "gradient";
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
  onModeChange: (mode: "colour" | "gradient") => void;
  onColourChange: (value: string | undefined) => void;
  onGradientChange: (value: ParagraphBackgroundGradient) => void;
  disabled?: boolean;
}) {
  return <div className="paragraph-background-control">
    <ColourPicker label="Background colour" value={colour} onChange={onColourChange} clearLabel="Clear background colour" wrapperClassName="paragraph-background-picker" disabled={disabled} trigger={({ disabled: isDisabled, expanded, controls, onClick, close }) => <div className="paragraph-background-modes" role="group" aria-label="Background type">
      <button type="button" disabled={isDisabled} aria-pressed={mode === "colour"} aria-expanded={expanded} aria-controls={controls} className={mode === "colour" ? "is-active" : ""} onClick={() => { onModeChange("colour"); onClick(); }}>
        <span className={`paragraph-background-mode-swatch${colour ? " has-colour" : ""}`} aria-hidden="true" style={colour ? { backgroundColor: colour } : undefined} />Colour
      </button>
      <button type="button" disabled={isDisabled} aria-pressed={mode === "gradient"} className={mode === "gradient" ? "is-active" : ""} onClick={() => { onModeChange("gradient"); close(); }}>
        <span className={`paragraph-background-mode-swatch${gradient ? " has-gradient" : ""}`} aria-hidden="true" style={gradient ? { backgroundImage: paragraphBackgroundGradientCss(gradient) } : undefined} />Gradient
      </button>
    </div>} />
    {mode === "gradient" ? <div className="paragraph-gradient-options" role="group" aria-label="Background gradient">{(Object.entries(PARAGRAPH_BACKGROUND_GRADIENTS) as [ParagraphBackgroundGradient, string][]).map(([name]) => <button key={name} type="button" disabled={disabled} aria-label={`${name} gradient`} aria-pressed={gradient === name} className={gradient === name ? "is-active" : ""} style={{ backgroundImage: paragraphBackgroundGradientCss(name) }} onClick={() => onGradientChange(name)} />)}</div> : null}
  </div>;
}
