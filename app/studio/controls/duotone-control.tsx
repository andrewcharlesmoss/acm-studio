"use client";
import { useId, useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { PaletteColourSetting } from "./palette-colour-setting";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { StudioButton } from "./button";
import { ColourValueSwatch } from "./colour-picker";
import type { DuotoneValue } from "./duotone-filter";
export { duotoneChannels, DuotoneFilter } from "./duotone-filter";
export type { DuotoneValue } from "./duotone-filter";

const presets = [
  { dark: '#000000', light: '#FFFFFF' },
  { dark: '#000080', light: '#FFCC00' },
  { dark: '#3B003B', light: '#F5C5DD' },
  { dark: '#003333', light: '#B9F6CA' },
];

/** Owners supply content/default inheritance; presentation retains one control. */
export function DuotoneControl({ value, inheritedValue, onChange, presentation = "inspector", disabled = false, allowClearWhenUnset = false, onReset }: {
  value?: DuotoneValue | null;
  inheritedValue?: DuotoneValue | null;
  onChange: (value: DuotoneValue | null) => void;
  presentation?: "inspector" | "toolbar";
  disabled?: boolean;
  allowClearWhenUnset?: boolean;
  onReset?: () => void;
}) {
  const [disclosure, setDisclosure] = useState({ open: false, disabled });
  if (disclosure.disabled !== disabled) setDisclosure({ open: false, disabled });
  const open = disclosure.open && !disabled;
  const setOpen = (next: boolean) => setDisclosure({ open: next, disabled });
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  function dismiss(restore: boolean) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  const displayedValue = value === undefined ? inheritedValue : value;
  return <>
    <button className={presentation === "inspector" ? "inspector-colour-row" : "canvas-duotone-control"} disabled={disabled} type="button" ref={trigger} aria-label="Duotone" aria-expanded={open && !disabled} onClick={() => setOpen(!open)}>
      {presentation === "toolbar" ? <AcmIcon name="view.styles" scale="Regular-M" size={20} /> : displayedValue ? <span className="studio-colour-value-swatch has-colour" aria-hidden="true" style={{ backgroundImage: `linear-gradient(90deg,${displayedValue.dark} 50%,${displayedValue.light} 50%)` }} /> : <ColourValueSwatch />}
      {presentation === "inspector" ? <span>Duotone</span> : null}
    </button>
    {open && !disabled ? <StudioAnchoredPopover anchor={() => trigger.current} inspectorPlacement={presentation === "inspector"} preferredWidth={280} label="Duotone" focusOnMount initialFocus={() => close.current} onClose={dismiss}>
      <PopoverHeading closeRef={close} closeLabel="Close Duotone" onClose={() => dismiss(true)}>Duotone</PopoverHeading>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="studio-duotone-presets">{presets.map((preset, index) => <StudioButton key={index} aria-label={`Duotone preset ${index + 1}`} onClick={() => onChange(preset)}><span style={{ background: `linear-gradient(90deg,${preset.dark} 50%,${preset.light} 50%)`, width: 32, height: 24 }} /></StudioButton>)}</div>
        <PaletteColourSetting row label="Shadows" value={displayedValue?.dark ?? '#000000'} onChange={dark => { if (dark && /^#[\da-f]{6}$/i.test(dark)) onChange({ dark, light: displayedValue?.light ?? '#FFFFFF' }); }} />
        <PaletteColourSetting row label="Highlights" value={displayedValue?.light ?? '#FFFFFF'} onChange={light => { if (light && /^#[\da-f]{6}$/i.test(light)) onChange({ dark: displayedValue?.dark ?? '#000000', light }); }} />
        <StudioButton variant="text" disabled={value === null || (!value && !allowClearWhenUnset)} onClick={() => onChange(null)}>Clear Duotone</StudioButton>
        {onReset ? <StudioButton variant="text" disabled={value === undefined} onClick={onReset}>Reset Duotone</StudioButton> : null}
      </fieldset>
      <span id={id} className="visually-hidden">Duotone changes the image’s shadows and highlights.</span>
    </StudioAnchoredPopover> : null}
  </>;
}
