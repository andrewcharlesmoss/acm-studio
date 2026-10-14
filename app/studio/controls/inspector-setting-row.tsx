"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInspectorContentDisabled } from "../inspector-accordion";
import { watchInspectorPopover, type InspectorPopoverPosition } from "../panes/inspector-popover-position";
import { StudioIcon } from "../studio-icons";

/** Document and template settings share one row and workspace-facing editor. */
export function InspectorSettingRow({ label, value, children, disabled = false, hideLabel = false, className = "" }: {
  label: string; value: ReactNode; children: ReactNode; disabled?: boolean; hideLabel?: boolean; className?: string;
}) {
  const inheritedDisabled = useInspectorContentDisabled();
  const unavailable = disabled || inheritedDisabled;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<InspectorPopoverPosition | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback((returnFocus = true) => {
    // Template text fields commit on blur; preserve that edit before unmounting.
    const active = document.activeElement;
    if (active instanceof HTMLElement && popup.current?.contains(active)) active.blur();
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    return watchInspectorPopover(trigger.current, popup.current, 320, setPosition);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => popup.current?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")?.focus());
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(false);
    }
    function focusOutside(event: FocusEvent) {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener("keydown", escape);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", focusOutside); document.removeEventListener("keydown", escape); };
  }, [open, close]);

  return <div className={`inspector-setting-row ${className}`}>
    <span id={`${id}-label`} className={hideLabel ? "visually-hidden" : undefined}>{label}</span>
    <button ref={trigger} type="button" className="inspector-setting-trigger" disabled={unavailable} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { if (open) close(); else { setPosition(null); setOpen(true); } }}><span id={`${id}-value`}>{value}</span></button>
    {open ? createPortal(<div ref={popup} id={id} className="inspector-popover inspector-setting-popover" role="dialog" aria-label={label} style={{ ...position, visibility: position ? "visible" : "hidden" }}>
      <div className="inspector-popover-heading"><strong>{label}</strong><button type="button" aria-label={`Close ${label.toLowerCase()}`} onClick={() => close()}><StudioIcon name="close" size={20} /></button></div>
      <fieldset disabled={unavailable}>{children}</fieldset>
    </div>, document.body) : null}
  </div>;
}

export function InspectorSettingsSection({ title, children, disabled = false, className = "" }: { title?: ReactNode; children: ReactNode; disabled?: boolean; className?: string }) {
  const inheritedDisabled = useInspectorContentDisabled();
  return <section className={`inspector-settings-section ${className}`}>
    {title ? <h2>{title}</h2> : null}
    <fieldset disabled={disabled || inheritedDisabled}>{children}</fieldset>
  </section>;
}
