"use client";

import { useId, useRef, useState } from "react";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioIcon } from "../studio-icons";
import "./font-preview-select.css";

export type FontPreviewOption = {
  value: string;
  label: string;
  family?: string;
  weight?: number;
  italic?: boolean;
};

/** Shared font choice menu with each option rendered in its own face and style. */
export function FontPreviewSelect({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: readonly FontPreviewOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];
  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  }
  return <div className="studio-font-preview-select">
    <span id={id}>{label}</span>
    <button ref={trigger} type="button" className="studio-font-preview-trigger" aria-labelledby={`${id} ${id}-value`} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(current => !current)}>
      <span id={`${id}-value`}>{selected?.label}</span><StudioIcon name="chevron-down" size={16} />
    </button>
    {open && !disabled ? <StudioAnchoredMenu anchor={() => trigger.current} aria-labelledby={id} className="studio-font-preview-menu" initialFocus={menu => menu.querySelector<HTMLElement>('[aria-checked="true"]')} onClose={close}>
      <button type="button" role="menuitem" aria-label={`Close ${label}`} onClick={() => close()}><span>Close</span><StudioIcon name="close" size={18} /></button>
      {options.map(option => <button type="button" role="menuitemradio" aria-checked={option.value === value} key={option.value} onClick={() => { onChange(option.value); close(); }}>
        <span style={{ fontFamily: option.family, fontWeight: option.weight ?? 400, fontStyle: option.italic ? "italic" : "normal" }}>{option.label}</span>
        {option.value === value ? <StudioIcon name="check" size={18} /> : null}
      </button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
