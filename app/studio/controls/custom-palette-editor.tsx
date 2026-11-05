"use client";

import { useRef, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "./button";
import { TextInput } from "./native-fields";
import { SettingInheritanceProvider } from "./setting-inheritance";
import { InheritedIndicator } from "./inherited-indicator";
import { ColourPicker } from "./colour-picker";
import { GradientPicker } from "./gradient-picker";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { DEFAULT_GRADIENTS } from "../../content/background-gradient";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import "./custom-palette-editor.css";

export type CustomPaletteColour = { id: string; name: string; colour: string };

type PaletteSectionProps = { kind: "Colour" | "Gradient"; count: number; canAdd: boolean; onAdd: () => void; onRemoveAll: () => void; children: (details: boolean) => ReactNode };
function CustomPaletteSection({ kind, count, canAdd, onAdd, onRemoveAll, children }: PaletteSectionProps) {
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const section = useRef<HTMLElement>(null);
  const options = useRef<HTMLButtonElement>(null);
  function add() {
    if (!canAdd) return;
    onAdd(); setDetails(true);
    requestAnimationFrame(() => section.current?.querySelectorAll<HTMLInputElement>('input').item(count)?.focus());
  }
  function closeMenu(restore = true) { setMenuOpen(false); if (restore) options.current?.focus(); }
  return <section ref={section} className="studio-custom-palette-section">
    <div className="studio-custom-palette-heading"><h3>CUSTOM</h3><div>
      {details ? <StudioButton variant="text" className="studio-custom-palette-done" onClick={() => { setDetails(false); options.current?.focus(); }}>Done</StudioButton> : null}
      <StudioButton variant="text" className="studio-custom-palette-add" aria-label={`Add ${kind}`} disabled={!canAdd} onClick={add}><AcmIcon name="action.add" size={20} /></StudioButton>
      <button ref={options} type="button" className="inspector-tools-trigger" aria-label={`${kind === "Colour" ? "Custom" : "Gradient"} options`} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><AcmIcon name="action.more-vertical" size={18} /></button>
    </div></div>
    {menuOpen ? <StudioAnchoredMenu anchor={() => options.current} inspectorPlacement aria-label={`${kind === "Colour" ? "Custom" : "Gradient"} options`} onClose={closeMenu}>
      <button type="button" role="menuitemcheckbox" aria-checked={details} onClick={() => { setDetails(value => !value); closeMenu(); }}>Show details</button>
      <button type="button" role="menuitem" disabled={!count} onClick={() => { onRemoveAll(); closeMenu(); }}>Remove all {kind === "Colour" ? "colours" : "gradients"}</button>
    </StudioAnchoredMenu> : null}
    <div className={details ? 'studio-custom-palette-details' : 'studio-custom-palette-swatches'}>{children(details)}</div>
  </section>;
}
export function CustomPaletteEditor({ colours, entries, inheritance = {}, canAdd = true, onAdd, onChange, onRemove, onRemoveAll }: { inheritance?: Readonly<Record<string, boolean>>; colours: CustomPaletteColour[]; entries: { key: string; label: string; colour: string }[]; canAdd?: boolean; onAdd: () => void; onChange: (item: CustomPaletteColour) => void; onRemove: (id: string) => void; onRemoveAll: () => void }) {
  return <CustomPaletteSection kind="Colour" count={colours.length} canAdd={canAdd} onAdd={onAdd} onRemoveAll={onRemoveAll}>{details => colours.map(item => <SettingInheritanceProvider key={item.id} values={{ [item.name]: inheritance[item.id] === true }}><div className="studio-custom-palette-entry">
    <ColourPicker label={item.name} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) onChange({ ...item, colour }); }} />
    {details ? <><TextInput aria-label={`Colour name: ${item.name}`} value={item.name} maxLength={80} onChange={event => onChange({ ...item, name: event.target.value })} /><StudioButton variant="text" aria-label={`Remove colour: ${item.name}`} onClick={() => onRemove(item.id)}><AcmIcon name="action.remove" size={20} /></StudioButton></> : null}
  </div></SettingInheritanceProvider>)}</CustomPaletteSection>;
}
export type CustomPaletteGradient = { id: string; name: string; gradient: ParagraphBackgroundGradient | null };
function CustomGradientEntry({ item, inherited, details, onChange, onRemove }: { item: CustomPaletteGradient; inherited: boolean; details: boolean; onChange: (item: CustomPaletteGradient) => void; onRemove: () => void }) {
  const [active, setActive] = useState(false);
  return <SettingInheritanceProvider values={{ Gradient: inherited }}><div className="studio-custom-palette-entry studio-custom-gradient-entry">
    <GradientPicker allowClear={false} triggerLabel={`Edit gradient: ${item.name}${inherited ? ", inherited" : ""}`} value={item.gradient ?? undefined} defaultGradient={DEFAULT_GRADIENTS[0].value} onChange={gradient => { if (gradient) onChange({ ...item, gradient }); }} active={active} onOpen={() => setActive(true)} />
    {inherited ? <InheritedIndicator /> : null}
    {details ? <><TextInput aria-label={`Gradient name: ${item.name}`} value={item.name} maxLength={80} onChange={event => onChange({ ...item, name: event.target.value })} /><StudioButton variant="text" aria-label={`Remove gradient: ${item.name}`} onClick={onRemove}><AcmIcon name="action.remove" size={20} /></StudioButton></> : null}
  </div></SettingInheritanceProvider>;
}
export function CustomGradientPaletteEditor({ gradients, inheritance = {}, canAdd = true, onAdd, onChange, onRemove, onRemoveAll }: { gradients: CustomPaletteGradient[]; inheritance?: Readonly<Record<string, boolean>>; canAdd?: boolean; onAdd: () => void; onChange: (item: CustomPaletteGradient) => void; onRemove: (id: string) => void; onRemoveAll: () => void }) {
  return <CustomPaletteSection kind="Gradient" count={gradients.length} canAdd={canAdd} onAdd={onAdd} onRemoveAll={onRemoveAll}>{details => gradients.map(item => <CustomGradientEntry key={item.id} item={item} inherited={inheritance[item.id] === true} details={details} onChange={onChange} onRemove={() => onRemove(item.id)} />)}</CustomPaletteSection>;
}
