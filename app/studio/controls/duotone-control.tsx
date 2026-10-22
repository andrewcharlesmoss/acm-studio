"use client";
import { useId, useRef, useState } from "react";
import { PaletteColourSetting } from "./palette-colour-setting";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { StudioButton } from "./button";
import { ColourValueSwatch } from "./colour-picker";
import type { DuotoneValue } from "./duotone-filter";
export { duotoneChannels, DuotoneFilter } from "./duotone-filter";
export type { DuotoneValue } from "./duotone-filter";
export function DuotoneControl({ value, onChange }: {
    value?: DuotoneValue | null;
    onChange: (value: DuotoneValue | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    const id = useId();
    const presets = [{ dark: '#000000', light: '#FFFFFF' }, { dark: '#000080', light: '#FFCC00' }, { dark: '#3B003B', light: '#F5C5DD' }, { dark: '#003333', light: '#B9F6CA' }];
    function dismiss(restore: boolean) { setOpen(false); if (restore)
        trigger.current?.focus(); }
    return <><button className="inspector-colour-row" type="button" ref={trigger} aria-label="Duotone" aria-expanded={open} onClick={() => setOpen(v => !v)}>{value ? <span className="studio-colour-value-swatch has-colour" aria-hidden="true" style={{backgroundImage:`linear-gradient(90deg,${value.dark} 50%,${value.light} 50%)`}}/> : <ColourValueSwatch/>}<span>Duotone</span></button>{open ? <StudioAnchoredPopover anchor={() => trigger.current} inspectorPlacement preferredWidth={280} label="Duotone" focusOnMount initialFocus={() => close.current} onClose={dismiss}><PopoverHeading closeRef={close} closeLabel="Close Duotone" onClose={() => dismiss(true)}>Duotone</PopoverHeading><div className="studio-duotone-presets">{presets.map((preset, index) => <StudioButton key={index} aria-label={`Duotone preset ${index + 1}`} onClick={() => onChange(preset)}><span style={{ background: `linear-gradient(90deg,${preset.dark} 50%,${preset.light} 50%)`, width: 32, height: 24 }}/></StudioButton>)}</div><PaletteColourSetting row label="Shadows" value={value?.dark ?? '#000000'} onChange={dark => { if (dark && /^#[\da-f]{6}$/i.test(dark))
        onChange({ dark, light: value?.light ?? '#FFFFFF' }); }}/><PaletteColourSetting row label="Highlights" value={value?.light ?? '#FFFFFF'} onChange={light => { if (light && /^#[\da-f]{6}$/i.test(light))
        onChange({ dark: value?.dark ?? '#000000', light }); }}/><StudioButton variant="text" disabled={!value} onClick={() => onChange(null)}>Clear Duotone</StudioButton><span id={id} className="visually-hidden">Duotone applies to the preview image.</span></StudioAnchoredPopover> : null}</>;
}
