"use client";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { TextInput } from "../controls/native-fields";
import { RadioGroup } from "../controls/radio-group";
import { NumberUnitField } from "../controls/number-unit-field";
import { ColourPicker } from "../controls/colour-picker";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioMenuItem } from "../overlays/menu";
import { PopoverHeading } from "../overlays/popover-heading";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { previewColourEntries, previewColourValue, previewColourVariables, previewPaletteReference } from "./colours-preview-model";
import { defaultShadowPresets, newShadowLayer, resolveShadowPresets, shadowPresetCss, type PreviewShadowLayer, type PreviewShadowPreset } from "./shadows-preview-model";
import type { PreviewScope } from "./identity-preview-state";
import "./shadows-preview.css";

export function ShadowsPreview({ selection, authored, scope, dispatch, onBack }: { selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const presets = resolveShadowPresets(selection.shadows);
  const preset = presets.find(item => item.id === selected);
  const defaultIds = new Set(defaultShadowPresets.map(item => item.id));
  const { palette } = previewStyleDetails(selection);
  const entries = previewColourEntries(palette, selection.colours).map(({ key, label, colour }) => ({ key, label, colour }));
  useEffect(() => { heading.current?.focus(); }, [selected]);
  useEffect(() => { if (renaming) { nameInput.current?.focus(); nameInput.current?.select(); } }, [renaming]);
  function change(patch: Partial<Omit<PreviewShadowPreset, "id">>) { if (preset) dispatch({ type: "shadow", scope, id: preset.id, patch }); }
  function closeMenu(restore = true) { setMenu(false); if (restore) menuTrigger.current?.focus(); }
  function addPreset() { const id = `custom-shadow-${crypto.randomUUID()}`; dispatch({ type: "shadow", scope, id, patch: { name: "Custom shadow", layers: [newShadowLayer(crypto.randomUUID())] } }); setSelected(id); }
  const title = preset?.name ?? "Shadows";
  return <div ref={root} className="site-browse-styles site-shadows-preview">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={preset ? "Back to Shadows" : "Back to Styles"} onClick={() => { if (preset) { const previousId = preset.id; setSelected(null); setRenaming(false); requestAnimationFrame(() => [...(root.current?.querySelectorAll<HTMLButtonElement>("[data-shadow-preset-id]") ?? [])].find(button => button.dataset.shadowPresetId === previousId)?.focus()); } else onBack(); }}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton>{renaming && preset ? <TextInput ref={nameInput} aria-label="Shadow name" value={preset.name} maxLength={80} onChange={event => change({ name: event.target.value })} onBlur={() => setRenaming(false)} onKeyDown={event => { if (event.key === "Enter" || event.key === "Escape") { event.currentTarget.blur(); requestAnimationFrame(() => heading.current?.focus()); } }} /> : <h3 ref={heading} tabIndex={-1}>{title}</h3>}
      {preset ? <><button ref={menuTrigger} type="button" className="inspector-tools-trigger" aria-label="Shadow preset options" aria-expanded={menu} onClick={() => setMenu(open => !open)}><AcmIcon name="action.more-vertical" size={20} /></button>{menu ? <StudioAnchoredMenu anchor={() => menuTrigger.current} inspectorPlacement aria-label="Shadow preset actions" onClose={restore => closeMenu(restore !== false)}>
        {defaultIds.has(preset.id) ? <StudioMenuItem disabled={!authored.shadows?.[preset.id]} onClick={() => { dispatch({ type: "reset-shadow", scope, id: preset.id }); closeMenu(); }}>Reset</StudioMenuItem> : <><StudioMenuItem onClick={() => { setRenaming(true); closeMenu(false); }}>Rename</StudioMenuItem><StudioMenuItem onClick={() => { dispatch({ type: "delete-shadow", scope, id: preset.id }); setSelected(null); closeMenu(false); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[aria-label="Add shadow"]')?.focus()); }}>Delete</StudioMenuItem></>}
      </StudioAnchoredMenu> : null}</> : null}
    </div>
    {preset ? <>
      <div className="site-shadow-specimen" style={previewColourVariables(palette, selection.colours)} aria-label={`${preset.name || "Custom shadow"} preview`}><div style={{ boxShadow: shadowPresetCss(preset, true) }} /></div>
      <div className="site-shadow-section-heading"><h3>Shadows</h3><StudioButton variant="text" aria-label="Add shadow layer" onClick={() => change({ layers: [...preset.layers, newShadowLayer(crypto.randomUUID())] })}><AcmIcon name="action.add" size={20} /></StudioButton></div>
      <div className="site-shadow-preset-list">{preset.layers.map((layer, index) => <ShadowLayer key={layer.id} colour={previewColourValue(layer.colour, palette, selection.colours) ?? layer.colour} layer={layer} index={index} entries={entries} onChange={patch => change({ layers: preset.layers.map(item => item.id === layer.id ? { ...item, ...patch } : item) })} onRemove={() => {
        change({ layers: preset.layers.filter(item => item.id !== layer.id) });
        requestAnimationFrame(() => {
          const remaining = root.current?.querySelectorAll<HTMLButtonElement>('[aria-label^="Edit shadow layer"]');
          const target = remaining?.[Math.min(index, remaining.length - 1)] ?? root.current?.querySelector<HTMLButtonElement>('[aria-label="Add shadow layer"]');
          target?.focus();
        });
      }} />)}</div>
    </> : <><section><h3>Default</h3><div className="site-shadow-preset-list">{presets.filter(item => defaultIds.has(item.id)).map(item => <ShadowPresetRow key={item.id} preset={item} onClick={() => setSelected(item.id)} />)}</div></section><section><div className="site-shadow-section-heading"><h3>Custom</h3><StudioButton variant="text" aria-label="Add shadow" onClick={addPreset}><AcmIcon name="action.add" size={20} /></StudioButton></div><div className="site-shadow-preset-list">{presets.filter(item => !defaultIds.has(item.id)).map(item => <ShadowPresetRow key={item.id} preset={item} onClick={() => setSelected(item.id)} />)}</div></section></>}
  </div>;
}
function ShadowPresetRow({ preset, onClick }: { preset: PreviewShadowPreset; onClick: () => void }) {
  return <button type="button" className="site-shadow-preset-row" data-shadow-preset-id={preset.id} onClick={onClick}><span>{preset.name || "Custom shadow"}</span><AcmIcon name="navigation.chevron-right" size={20} /></button>;
}
function ShadowLayer({ layer, colour, index, entries, onChange, onRemove }: { colour: string; layer: PreviewShadowLayer; index: number; entries: { key: string; label: string; colour: string }[]; onChange: (patch: Partial<PreviewShadowLayer>) => void; onRemove: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null); const close = useRef<HTMLButtonElement>(null); const [open, setOpen] = useState(false);
  function dismiss(restore: boolean) { setOpen(false); if (restore) trigger.current?.focus(); }
  return <div className="site-shadow-layer"><button ref={trigger} type="button" className="site-shadow-preset-row" aria-label={`Edit shadow layer ${index + 1}`} aria-expanded={open} onClick={() => setOpen(value => !value)}><span>Drop shadow</span><AcmIcon name="navigation.chevron-right" size={20} /></button>
    {open ? <StudioAnchoredPopover anchor={() => trigger.current} label={`Shadow layer ${index + 1}`} inspectorPlacement preferredWidth={320} focusOnMount initialFocus={() => close.current} onClose={dismiss} className="site-shadow-layer-popup">
      <PopoverHeading closeRef={close} closeLabel="Close shadow layer" onClose={() => dismiss(true)}>Drop shadow</PopoverHeading>
      <ColourPicker label="Colour" palette={entries} enableAlpha allowClear={false} value={colour} onSelectPalette={entry => onChange({ colour: previewPaletteReference(entry.key) })} onChange={colour => { if (colour) onChange({ colour }); }} />
      <RadioGroup label="Shadow type" presentation="buttons" value={layer.inset ? "inset" : "outset"} options={[{ value: "outset", label: "Outset" }, { value: "inset", label: "Inset" }]} onChange={value => onChange({ inset: value === "inset" })} />
      <div className="site-shadow-layer-dimensions">{(["x", "y", "blur", "spread"] as const).map(field => <ShadowLengthField key={field} id={`shadow-${layer.id}-${field}`} label={{ x: "X Position", y: "Y Position", blur: "Blur", spread: "Spread" }[field]} value={layer[field]} negative={field !== "blur"} onChange={value => onChange({ [field]: value })} />)}</div>
      <StudioButton variant="text" onClick={onRemove}>Remove shadow</StudioButton>
    </StudioAnchoredPopover> : null}
  </div>;
}

function ShadowLengthField({ id, label, value, negative, onChange }: { id: string; label: string; value: string; negative: boolean; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const parts = value.match(/^(-?\d+(?:\.\d+)?)(.*)$/)!;
  function commit(unit = parts[2]) {
    const amount = Number(draft === null ? parts[1] : draft);
    setDraft(null);
    if (Number.isFinite(amount)) onChange(`${Math.min(10000, Math.max(negative ? -10000 : 0, amount))}${unit}`);
  }
  return <div><label htmlFor={id}>{label}</label><NumberUnitField inputProps={{ id, value: draft ?? parts[1], min: negative ? -10000 : 0, max: 10000, step: "any", onChange: event => setDraft(event.target.value), onBlur: () => { if (draft !== null) commit(); }, onKeyDown: event => { if (event.key === "Enter") event.currentTarget.blur(); } }} unitProps={{ "aria-label": `${label} unit`, value: parts[2], onChange: event => commit(event.target.value) }} units={["px", "em", "rem", "vw", "vh"]} /></div>;
}
