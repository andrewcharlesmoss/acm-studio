"use client";
import { useId, useRef, useState } from "react";
import type { InlineMath } from "../content/model";
import { mathPresentation } from "../content/math-presentation";
import { mathSource } from "../content/math-runs";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { PopoverHeading } from "./overlays/popover-heading";

type Props = { value: InlineMath; anchor: () => HTMLElement | null; editor?: HTMLElement; onChange: (value: InlineMath) => boolean; onClose: (restoreFocus: boolean) => void; onReturnToEditor: () => void };
/** One live syntax editor, shared by every canonical rich-text field. */
export function MathPopover({ value, anchor, editor, onChange, onClose, onReturnToEditor }: Props) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(mathSource(value));
  const [format, setFormat] = useState<"latex" | "mathml">(value.latex !== undefined ? "latex" : "mathml");
  const [description, setDescription] = useState(value.alternativeText);
  const [conflict, setConflict] = useState(false);
  const expression: InlineMath = { type: "math", [format]: draft, alternativeText: description };
  const result = mathPresentation(expression);
  const error = conflict ? "This expression changed elsewhere. Close and reopen it to edit the latest version." : result.error;
  function update(source: string, nextFormat = format, nextDescription = description) {
    setDraft(source); setFormat(nextFormat); setDescription(nextDescription);
    const next: InlineMath = { type: "math", [nextFormat]: source, alternativeText: nextDescription,
      ...(nextFormat === (value.latex !== undefined ? "latex" : "mathml") && source === mathSource(value) && value.sourceRuns ? { sourceRuns: value.sourceRuns } : {}) };
    // Unsafe MathML stays in this transient field; it never becomes saved content.
    if (nextFormat === "mathml" && mathPresentation(next).error) return;
    if (!onChange(next)) setConflict(true);
  }
  function close(restore: boolean) {
    if (!restore && error) { requestAnimationFrame(() => input.current?.focus()); return; }
    onClose(restore);
  }
  return <StudioAnchoredPopover anchor={anchor} ignoreOutside={target => editor?.contains(target) ?? false} label="Math" onClose={close} className="rich-text-math-popover">
    <PopoverHeading closeLabel="Close Math" onClose={() => onClose(true)}>Math</PopoverHeading>
    <label htmlFor={id}>{format === "mathml" ? "MathML syntax" : "LaTeX syntax"}</label>
    <textarea data-math-syntax="true" ref={input} id={id} rows={2} value={draft} spellCheck={false} maxLength={12000} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => { if (!(event.nativeEvent as InputEvent).isComposing) update(event.target.value); else setDraft(event.target.value); }} onCompositionEnd={event => update(event.currentTarget.value)} onKeyDown={event => {
      if (event.key === "Tab" && event.shiftKey) { event.preventDefault(); onReturnToEditor(); }
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !error) { event.preventDefault(); onClose(true); }
    }} />
    {error ? <p id={`${id}-error`} role="alert">{error}</p> : null}
    <details><summary>Expression options</summary>
      <label>Input format<select value={format} onChange={event => update(draft, event.target.value as "latex" | "mathml")}><option value="latex">LaTeX</option><option value="mathml">MathML</option></select></label>
      <label>Accessible description<input maxLength={500} value={description} onChange={event => update(draft, format, event.target.value)} /></label>
    </details>
  </StudioAnchoredPopover>;
}
