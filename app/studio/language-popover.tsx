"use client";
import { useId, useState } from "react";
import { validLanguageCode, type LanguageMark } from "../content/language-runs";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { PopoverHeading } from "./overlays/popover-heading";
import { StudioButton } from "./controls/button";

export function LanguagePopover({ anchor, anchorRect, onApply, onClose }: {
  anchor: () => HTMLElement | null;
  anchorRect: () => DOMRect | null;
  onApply: (mark: LanguageMark) => boolean;
  onClose: (restoreFocus: boolean) => void;
}) {
  const id = useId();
  const [language, setLanguage] = useState("");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [conflict, setConflict] = useState(false);
  const valid = validLanguageCode(language.trim());
  return <StudioAnchoredPopover anchor={anchor} anchorRect={anchorRect} label="Language" focusOnMount onClose={onClose} className="rich-text-language-popover">
    <PopoverHeading closeLabel="Close Language" onClose={() => onClose(true)}>Language</PopoverHeading>
    <form onSubmit={event => {
      event.preventDefault();
      if (valid && !onApply({ type: "language", language: language.trim(), direction })) setConflict(true);
    }}>
      <label htmlFor={id}>Language code<input id={id} value={language} maxLength={255} placeholder="en, es, fr" aria-invalid={!valid} onChange={event => setLanguage(event.target.value)} /></label>
      <label>Text direction<select value={direction} onChange={event => setDirection(event.target.value as "ltr" | "rtl")}><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label>
      {!valid ? <p role="alert">Enter a language tag, or leave it empty to set only the direction.</p> : null}
      {conflict ? <p role="alert">The text changed. Close and reopen Language to use the latest selection.</p> : null}
      <div className="html-editor-actions"><StudioButton variant="secondary" type="button" onClick={() => onClose(true)}>Cancel</StudioButton><StudioButton type="submit" disabled={!valid || conflict}>Apply</StudioButton></div>
    </form>
  </StudioAnchoredPopover>;
}
