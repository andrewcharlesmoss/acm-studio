"use client";

import { useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "./button";
import { TextInput } from "./native-fields";
import { ColourPicker } from "./colour-picker";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import "./custom-palette-editor.css";

export type CustomPaletteColour = { id: string; name: string; colour: string };

export function CustomPaletteEditor({ colours, entries, canAdd = true, onAdd, onChange, onRemove, onRemoveAll }: { colours: CustomPaletteColour[]; entries: { key: string; label: string; colour: string }[]; canAdd?: boolean; onAdd: () => void; onChange: (item: CustomPaletteColour) => void; onRemove: (id: string) => void; onRemoveAll: () => void }) {
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const section = useRef<HTMLElement>(null);
  const options = useRef<HTMLButtonElement>(null);
  function addColour() {
    if (!canAdd) return;
    onAdd();
    setDetails(true);
    requestAnimationFrame(() => section.current?.querySelectorAll<HTMLInputElement>('input').item(colours.length)?.focus());
  }
  function closeMenu(restore = true) { setMenuOpen(false); if (restore) options.current?.focus(); }
  return <section ref={section} className="studio-custom-palette-section">
    <div className="studio-custom-palette-heading"><h3>CUSTOM</h3><div>
      {details ? <StudioButton variant="text" className="studio-custom-palette-done" onClick={() => { setDetails(false); options.current?.focus(); }}>Done</StudioButton> : null}
      <StudioButton variant="text" className="studio-custom-palette-add" aria-label="Add Colour" disabled={!canAdd} onClick={addColour}><AcmIcon name="action.add" size={20} /></StudioButton>
      <button ref={options} type="button" className="inspector-tools-trigger" aria-label="Custom options" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><AcmIcon name="action.more-vertical" size={18} /></button>
    </div></div>
    {menuOpen ? <StudioAnchoredMenu anchor={() => options.current} inspectorPlacement aria-label="Custom options" onClose={closeMenu}>
      <button type="button" role="menuitemcheckbox" aria-checked={details} onClick={() => { setDetails(value => !value); closeMenu(); }}>Show details</button>
      <button type="button" role="menuitem" disabled={!colours.length} onClick={() => { onRemoveAll(); closeMenu(); }}>Remove all colours</button>
    </StudioAnchoredMenu> : null}
    <div className={details ? 'studio-custom-palette-details' : 'studio-custom-palette-swatches'}>{colours.map(item => <div className="studio-custom-palette-entry" key={item.id}>
      <ColourPicker label={item.name} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) onChange({ ...item, colour }); }} />
      {details ? <><TextInput aria-label={`Colour name: ${item.name}`} value={item.name} maxLength={80} onChange={event => onChange({ ...item, name: event.target.value })} /><StudioButton variant="text" aria-label={`Remove colour: ${item.name}`} onClick={() => onRemove(item.id)}><AcmIcon name="action.remove" size={20} /></StudioButton></> : null}
    </div>)}</div>
  </section>;
}
