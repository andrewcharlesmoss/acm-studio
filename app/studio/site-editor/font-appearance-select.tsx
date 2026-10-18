"use client";

import { useId, useRef, useState } from "react";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioIcon } from "../studio-icons";
import "./font-appearance-select.css";

/** Owners supply available faces and retain their stored appearance values. */
export function FontAppearanceSelect({ value, family, options, onChange }: {
  value: string;
  family?: string;
  options: readonly { value: string; label: string; weight?: number; italic?: boolean }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];
  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  }
  return <div className="studio-font-appearance-select">
    <span id={id}>Appearance</span>
    <button ref={trigger} type="button" className="studio-font-appearance-trigger" aria-labelledby={`${id} ${id}-value`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span id={`${id}-value`}>{selected?.label}</span><StudioIcon name="chevron-down" size={16} />
    </button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} aria-labelledby={id} className="studio-font-appearance-menu" initialFocus={menu => menu.querySelector<HTMLElement>('[aria-checked="true"]')} onClose={close}>
      <button type="button" role="menuitem" aria-label="Close Appearance" onClick={() => close()}><span>Close</span><StudioIcon name="close" size={18} /></button>
      {options.map(option => <button type="button" role="menuitemradio" aria-checked={option.value === value} key={option.value} onClick={() => { onChange(option.value); close(); }}>
        <span style={{ fontFamily: option.weight ? family : undefined, fontWeight: option.weight ?? 400, fontStyle: option.italic ? "italic" : "normal" }}>{option.label}</span>
        {option.value === value ? <StudioIcon name="check" size={18} /> : null}
      </button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
