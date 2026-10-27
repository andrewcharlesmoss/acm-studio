"use client";

import { useRef } from "react";
import type { IconName } from "@acm/icons";
import { preserveTextSelection } from "./editors/rich-text";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioIcon } from "../studio-icons";

/** Presentation for metadata variations; owning adapters retain their records. */
export function MetadataVariationControl<Value extends string>({ value, label, icon, choices, writable, open, onOpenChange, onChoose }: {
  value: Value;
  label: string;
  icon: IconName;
  choices: readonly { value: Value; label: string; icon: IconName }[];
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (value: Value) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="transform-control">
    <button ref={trigger} className={open ? "is-active" : ""} type="button" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={label} title="Transform block">
      <StudioHoverIcon name={icon} /><StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu presentation="custom" anchor={() => trigger.current} className="transform-menu" aria-label={label} onClose={restore => { onOpenChange(false); if (restore !== false) trigger.current?.focus(); }}>
      {choices.map(choice => <button className="table-style-choice" type="button" role="menuitemradio" aria-checked={value === choice.value} key={choice.value} disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => { onChoose(choice.value); onOpenChange(false); requestAnimationFrame(() => trigger.current?.focus()); }}>
        <StudioHoverIcon name={choice.icon} /><span>{choice.label}{value === choice.value ? <StudioIcon name="check" size={18} /> : null}</span>
      </button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
