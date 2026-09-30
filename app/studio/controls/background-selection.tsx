"use client";

import type { ParagraphBackgroundGradient } from "../../content/model";
import { GradientPicker } from "./gradient-picker";
import { ColourPicker } from "./colour-picker";

export function BackgroundSelection({ mode, colour, gradient, onModeChange, onColourChange, onGradientChange, disabled = false }: {
  mode: "colour" | "gradient";
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
  onModeChange: (mode: "colour" | "gradient") => void;
  onColourChange: (value: string | undefined) => void;
  onGradientChange: (value: ParagraphBackgroundGradient | undefined) => void;
  disabled?: boolean;
}) {
  return <div className="paragraph-background-control">
    <ColourPicker label="Background colour" value={colour} onChange={onColourChange} clearLabel="Clear background colour" wrapperClassName="paragraph-background-picker" disabled={disabled} trigger={({ disabled: isDisabled, expanded, controls, onClick, close }) => <div className="paragraph-background-modes" role="group" aria-label="Background type">
      <button type="button" disabled={isDisabled} aria-expanded={expanded} aria-controls={controls} onClick={() => { onModeChange("colour"); onClick(); }}>
        <span className={`paragraph-background-mode-swatch${colour ? " has-colour" : ""}`} aria-hidden="true" style={colour ? { backgroundColor: colour } : undefined} />Colour
      </button>
      <GradientPicker active={mode === "gradient"} value={gradient} onChange={onGradientChange} disabled={isDisabled} onOpen={() => { onModeChange("gradient"); close(); }} />
    </div>} />

  </div>;
}
