"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { LinkDestination, LinkDestinationDraft } from "../content/link-destination";
import { LinkDestinationPopover, type LinkSuggestion } from "./controls/link-destination-popover";
import { StudioIcon } from "./studio-icons";

type ButtonLinkControlProps = {
  value: LinkDestination;
  selected: boolean;
  writable: boolean;
  anchor: () => HTMLElement | null;
  suggestions: LinkSuggestion[];
  onCaptureSelection: () => void;
  onReturnFocus: () => void;
  onApply: (draft: LinkDestinationDraft, baseline: LinkDestination) => string | null;
  onUnlink: () => void;
};

/** Selection or ownership loss discards the transient draft and popup session. */
export function ButtonLinkControl(props: ButtonLinkControlProps) {
  return <ButtonLinkSession key={Number(props.selected && props.writable)} {...props} />;
}

/** This adapter owns Button selection and shortcuts, not rich-text link marks. */
function ButtonLinkSession({ value, selected, writable, anchor, suggestions, onCaptureSelection, onReturnFocus, onApply, onUnlink }: ButtonLinkControlProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"edit" | "preview" | null>(() => selected && writable && value.url ? "preview" : null);
  const [focusRevision, setFocusRevision] = useState(0);
  const [focusPreview, setFocusPreview] = useState(false);
  const latest = useRef({ value, selected, writable, anchor, onCaptureSelection, onReturnFocus, onUnlink });
  useLayoutEffect(() => { latest.current = { value, selected, writable, anchor, onCaptureSelection, onReturnFocus, onUnlink }; });

  function edit() {
    if (!writable || !selected) return;
    onCaptureSelection();
    setMode("edit");
    setFocusRevision(current => current + 1);
  }
  function unlink() {
    if (!writable || !selected) return;
    onCaptureSelection();
    onUnlink();
    setMode(null);
    onReturnFocus();
  }
  useLayoutEffect(() => {
    if (!selected || !writable) return;
    const shortcut = (event: KeyboardEvent) => {
      const current = latest.current;
      if (!current.selected || !current.writable || event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (!(event.target instanceof Element) || event.target.closest("input, textarea, select")) return;
      const editor = current.anchor();
      const boundary = editor?.closest("[data-studio-nested-block-id], .canvas-block");
      if (event.target !== triggerRef.current && (!boundary?.contains(event.target) || event.target.closest("[data-studio-nested-block-id], .canvas-block") !== boundary)) return;
      if (event.target.closest('[contenteditable="true"]') && !editor?.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      current.onCaptureSelection();
      if (event.shiftKey) {
        current.onUnlink();
        setMode(null);
        current.onReturnFocus();
      } else {
        setMode("edit");
        setFocusRevision(revision => revision + 1);
      }
    };
    document.addEventListener("keydown", shortcut, true);
    return () => document.removeEventListener("keydown", shortcut, true);
  }, [selected, writable]);
  const linked = Boolean(value.url);
  return <>
    <button ref={triggerRef} type="button" className={linked ? "is-active" : ""} disabled={!writable} aria-label={linked ? "Unlink button" : "Link button"} title={linked ? "Unlink" : "Link"} aria-pressed={linked} onMouseDown={event => { event.preventDefault(); onCaptureSelection(); }} onClick={() => {
      if (linked) unlink();
      else if (mode === "edit") { setMode(null); onReturnFocus(); }
      else edit();
    }}><StudioIcon name={linked ? "link-off" : "link"} size={24} /></button>
    {selected && writable && mode && (mode === "edit" || linked) ? <LinkDestinationPopover key={mode} value={value} mode={mode} anchor={() => triggerRef.current} ignoreOutside={target => Boolean(triggerRef.current?.contains(target))} focusOnMount={mode === "edit" || focusPreview} focusRevision={focusRevision} onFocusPlaced={mode === "preview" ? () => setFocusPreview(false) : undefined} suggestions={suggestions} onEdit={edit} onApply={(draft, baseline) => {
      const error = onApply(draft, baseline);
      if (!error) { setMode("preview"); setFocusPreview(true); }
      return error;
    }} onRemove={unlink} onClose={restoreFocus => { setMode(null); if (restoreFocus) onReturnFocus(); }} /> : null}
  </>;
}
