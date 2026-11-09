"use client";
import { SettingLabel } from "./setting-inheritance";
import { useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { StudioButton } from "./button";
import { paragraphStyleToCss } from "../../content/paragraph-styles";

export const GROUP_SHADOW_PRESETS = (["natural", "deep", "sharp", "outlined", "crisp"] as const).map(id => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)}`, css: String(paragraphStyleToCss({ shadow: id }).boxShadow) }));
export function ShadowPresetSelect({ value, choices, onChange, allowCustom = true, unsetLabel, clearLabel = "Reset" }: {
    value?: string;
    allowCustom?: boolean;
    unsetLabel?: string;
    clearLabel?: string;
    choices: readonly {
        id: string;
        label: string;
        css: string;
    }[];
    onChange: (value: string | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    function dismiss(restore: boolean) { setOpen(false); if (restore)
        trigger.current?.focus(); }
    return <><button className="inspector-colour-row" type="button" ref={trigger} aria-label="Drop shadow" aria-expanded={open} onClick={() => setOpen(v => !v)}><AcmIcon name="view.shadow" size={24}/><SettingLabel>Drop shadow</SettingLabel></button>{open ? <StudioAnchoredPopover anchor={() => trigger.current} inspectorPlacement preferredWidth={280} label="Shadow presets" focusOnMount initialFocus={() => close.current} onClose={dismiss}><PopoverHeading closeRef={close} closeLabel="Close Shadow presets" onClose={() => dismiss(true)}>Shadow</PopoverHeading><div className="studio-shadow-preset-choices">{unsetLabel ? <button type="button" aria-pressed={value === undefined} onClick={() => { onChange(undefined); dismiss(true); }}><span aria-hidden="true" />{unsetLabel}</button> : null}{choices.map(choice => <button type="button" key={choice.id} aria-pressed={value === choice.id} onClick={() => { onChange(choice.id); dismiss(true); }}><span aria-hidden="true" style={{ boxShadow: choice.css }}/>{choice.label}</button>)}</div>{allowCustom ? <StudioButton variant="text" onClick={() => { onChange('custom'); dismiss(true); }}>Custom shadow</StudioButton> : null}<StudioButton variant="text" disabled={value === undefined} onClick={() => { onChange(undefined); dismiss(true); }}>{clearLabel}</StudioButton></StudioAnchoredPopover> : null}</>;
}
