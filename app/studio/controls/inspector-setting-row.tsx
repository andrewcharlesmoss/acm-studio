"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { PopoverHeading as StudioPopoverHeading } from "../overlays/popover-heading";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { useInspectorContentDisabled } from "../inspector-accordion";

/** Document and template settings share one row and workspace-facing editor. */
export function InspectorSettingRow({ label, value, children, disabled = false, hideLabel = false, className = "" }: {
  label: string; value: ReactNode; children: ReactNode; disabled?: boolean; hideLabel?: boolean; className?: string;
}) {
  const inheritedDisabled = useInspectorContentDisabled();
  const unavailable = disabled || inheritedDisabled;
  const [open, setOpen] = useState(false);
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

  return <div className={`inspector-setting-row ${className}`}>
    <span id={`${id}-label`} className={hideLabel ? "visually-hidden" : undefined}>{label}</span>
    <button ref={trigger} type="button" className="inspector-setting-trigger" disabled={unavailable} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { if (open) close(); else setOpen(true); }}><span id={`${id}-value`}>{value}</span></button>
    {open ? <StudioAnchoredPopover id={id} contentRef={popup} anchor={() => trigger.current} inspectorPlacement focusOnMount commitOnClose label={label} onClose={close} className="inspector-popover inspector-setting-popover">
      <StudioPopoverHeading className="inspector-popover-heading" title={label} closeLabel={`Close ${label.toLowerCase()}`} onClose={() => close()} />
      <fieldset disabled={unavailable}>{children}</fieldset>
    </StudioAnchoredPopover> : null}
  </div>;
}

export function InspectorSettingsSection({ title, children, disabled = false, className = "" }: { title?: ReactNode; children: ReactNode; disabled?: boolean; className?: string }) {
  const inheritedDisabled = useInspectorContentDisabled();
  return <section className={`inspector-settings-section ${className}`}>
    {title ? <h2>{title}</h2> : null}
    <fieldset disabled={disabled || inheritedDisabled}>{children}</fieldset>
  </section>;
}
