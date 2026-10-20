"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { TextInput } from "../controls/native-fields";
import { ColourPicker, ColourValueSwatch } from "../controls/colour-picker";
import { GradientPicker } from "../controls/gradient-picker";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { InspectorToolsSection } from "../inspector-tools-section";
import { PaneTabs } from "../panes/pane-components";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { editableBackgroundGradient } from "../../content/background-gradient";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { resolvedTypographyFields, type TypographyRole } from "./typography-preview-model";
import { previewColourEntries, previewPaletteReference, previewColourValue, referenceColourPalettes, type PreviewColour, type PreviewGradient } from "./colours-preview-model";
import type { PreviewScope } from "./identity-preview-state";
import "../controls/palette-colour-setting.css";
import "./colours-preview.css";

const roles = [{ id: 'links', label: 'Link' }, { id: 'captions', label: 'Captions' }, { id: 'buttons', label: 'Button' }, { id: 'headings', label: 'Heading' }, ...([1, 2, 3, 4, 5, 6] as const).map(level => ({ id: `h${level}`, label: `H${level}` }))] as { id: TypographyRole; label: string }[];
export function ColoursPreview({ selection, authored, scope, dispatch, onBack }: { selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [view, setView] = useState<'menu' | 'palette'>('menu');
  const [tab, setTab] = useState('colour');
  const [visible, setVisible] = useState(new Set(roles.slice(0, 4).map(role => role.id)));
  const [details, setDetails] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const themeSection = useRef<HTMLDivElement>(null);
  const themeDetailsHeading = useRef<HTMLHeadingElement>(null);
  function showThemeDetails() { setDetails(true); requestAnimationFrame(() => themeDetailsHeading.current?.focus()); }
  function hideThemeDetails() { setDetails(false); requestAnimationFrame(() => themeSection.current?.querySelector<HTMLButtonElement>('[aria-label="Theme options"]')?.focus()); }
  useEffect(() => { heading.current?.focus(); }, [view]);
  const { palette, typography } = previewStyleDetails(selection);
  const settings = selection.colours ?? {};
  const entries = previewColourEntries(palette, settings).map(({ key, label, colour }) => ({ key, label, colour }));
  const theme = entries.slice(0, 8);
  const custom = Object.values(settings.custom ?? {}).filter((item): item is PreviewColour => Boolean(item));
  const gradients = Object.values(settings.gradients ?? {}).filter((item): item is PreviewGradient => Boolean(item));
  const change = (patch: NonNullable<StyleSelection['colours']>) => dispatch({ type: 'colours', scope, patch });
  const resettable = new Set(roles.filter(role => authored.colours?.elements?.[role.id] || authored.typography?.elements?.[role.id]?.colour !== undefined).map(role => role.id));
  function resetRole(role: TypographyRole) { dispatch({ type: 'reset-colours', scope, role }); }
  const rowForeground = (role: TypographyRole) => previewColourValue(resolvedTypographyFields(typography, selection.typography ?? {}, role).colour, palette, settings) ?? (role === 'buttons' ? palette.buttonText : role === 'headings' || role.startsWith('h') ? palette.heading : palette.text);
  return <div className="site-browse-styles site-colours-preview">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={view === 'menu' ? 'Back to Styles' : 'Back to Colours'} onClick={() => view === 'menu' ? onBack() : setView('menu')}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>{view === 'menu' ? 'Colours' : 'Edit palette'}</h3></div>
    {view === 'menu' ? <>
      <section><h3>Palette</h3><button type="button" className="site-colours-edit-palette" onClick={() => setView('palette')}><span className="site-colours-overlapping" aria-hidden="true">{theme.slice(0, 5).map(item => <ColourValueSwatch key={item.key} value={item.colour} />)}</span><span>Edit Palette</span><AcmIcon name="navigation.chevron-right" size={20} /></button></section>
      <InspectorToolsSection title="Elements" options={roles.map((role, index) => ({ ...role, disabled: index < 4 }))} visible={visible} showCloseControl={false} alwaysShow canReset={resettable.size > 0} resettableOptions={resettable} onResetOption={id => resetRole(id as TypographyRole)} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id as TypographyRole)) next.delete(id as TypographyRole); else next.add(id as TypographyRole); return next; })} onReset={() => { dispatch({ type: 'reset-colour-elements', scope }); }}>
        <div className="site-colours-element-list">{roles.filter(role => visible.has(role.id)).map(role => <ElementColour key={role.id} role={role.id} label={role.label} selection={selection} foreground={rowForeground(role.id)} onForeground={colour => dispatch({ type: 'element', scope, role: role.id, patch: { colour: colour ?? "" } })} onChange={patch => change({ elements: { [role.id]: patch } })} />)}</div>
      </InspectorToolsSection>
    </> : <>
      <PaneTabs id="site-palette-kind" label="Palette type" tabs={[{ id: 'colour', label: 'Colour' }, { id: 'gradient', label: 'Gradient' }]} active={tab} onChange={setTab} />
      {tab === 'colour' ? <>
        <div ref={themeSection} className="site-colours-theme-section">{details ? <>
          <div className="site-colours-theme-details-heading"><h3 ref={themeDetailsHeading} tabIndex={-1}>THEME</h3><StudioButton variant="text" onClick={hideThemeDetails}>Done</StudioButton></div>
          <div className="site-colours-theme-details">{theme.map((item, index) => <ColourPicker key={item.key} label={item.label} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) change({ theme: { [String(index)]: colour } }); }} trigger={({ onClick, expanded, controls, disabled }) => <button type="button" className="site-colours-theme-detail-row" disabled={disabled} aria-label={`Choose ${item.label} colour`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={item.colour} /><span>{item.label}</span></button>} />)}</div>
        </> : <InspectorToolsSection title="Theme" options={[]} visible={new Set(["theme"])} alwaysShow showCloseControl={false} canReset={Boolean(authored.colours?.theme)} menuOptions={[{ id: 'details', label: 'Show Details', checked: false }]} onMenuOptionSelect={showThemeDetails} onToggle={() => {}} onReset={() => dispatch({ type: 'reset-theme-colours', scope })}>
          <div className="site-colours-theme-grid">{theme.map((item, index) => <div key={item.key}><ColourPicker label={item.label} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) change({ theme: { [String(index)]: colour } }); }} /></div>)}</div>
        </InspectorToolsSection>}</div>
        <CustomColours colours={custom} entries={entries} onAdd={item => change({ custom: { [item.id]: item } })} onChange={item => change({ custom: { [item.id]: item } })} onRemove={id => dispatch({ type: 'remove-colour', scope, id })} onRemoveAll={() => dispatch({ type: 'remove-custom-colours', scope })} />
        <section><h3>Palettes</h3><div className="site-colours-palettes">{referenceColourPalettes.map(item => <button type="button" key={item.id} aria-label={`${item.name} colours`} title={item.name} aria-pressed={selection.paletteId === item.id && item.colours.every((colour, index) => palette.colours[index] === colour)} onClick={() => dispatch({ type: 'colour-palette', scope, paletteId: item.id as StyleSelection['paletteId'] })}><span className="site-style-palette-sample" aria-hidden="true">{item.colours.slice(0, 4).map((colour, index) => <span key={index} style={{ background: colour }} />)}</span></button>)}</div></section>
      </> : <section><div className="site-typography-section-heading"><h3>Custom</h3><StudioButton variant="text" aria-label="Add Gradient" onClick={() => { const id = `gradient-${crypto.randomUUID()}`; change({ gradients: { [id]: { id, name: 'Custom Gradient', gradient: editableBackgroundGradient() } } }); }}><AcmIcon name="action.add" size={20} /></StudioButton></div>{gradients.map(item => <CustomGradient key={item.id} item={item} onChange={gradient => change({ gradients: { [item.id]: gradient } })} onRemove={() => dispatch({ type: 'remove-gradient', scope, id: item.id })} />)}</section>}
    </>}
  </div>;
}
function CustomColours({ colours, entries, onAdd, onChange, onRemove, onRemoveAll }: { colours: PreviewColour[]; entries: { key: string; label: string; colour: string }[]; onAdd: (item: PreviewColour) => void; onChange: (item: PreviewColour) => void; onRemove: (id: string) => void; onRemoveAll: () => void }) {
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const section = useRef<HTMLElement>(null);
  const options = useRef<HTMLButtonElement>(null);
  function addColour() {
    let number = 1;
    while (colours.some(item => item.name === `Colour ${number}`)) number += 1;
    onAdd({ id: `custom-${crypto.randomUUID()}`, name: `Colour ${number}`, colour: '#000000' });
    setDetails(true);
    requestAnimationFrame(() => section.current?.querySelectorAll<HTMLInputElement>('input').item(colours.length)?.focus());
  }
  function closeMenu(restore = true) { setMenuOpen(false); if (restore) options.current?.focus(); }
  return <section ref={section} className="site-colours-custom-section">
    <div className="site-colours-custom-heading"><h3>CUSTOM</h3><div>
      {details ? <StudioButton variant="text" className="site-colours-custom-done" onClick={() => { setDetails(false); options.current?.focus(); }}>Done</StudioButton> : null}
      <StudioButton variant="text" aria-label="Add Colour" onClick={addColour}><AcmIcon name="action.add" size={20} /></StudioButton>
      <button ref={options} type="button" className="inspector-tools-trigger" aria-label="Custom options" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><AcmIcon name="action.more-vertical" size={18} /></button>
    </div></div>
    {menuOpen ? <StudioAnchoredMenu anchor={() => options.current} inspectorPlacement aria-label="Custom options" onClose={closeMenu}>
      <button type="button" role="menuitemcheckbox" aria-checked={details} onClick={() => { setDetails(value => !value); closeMenu(); }}>Show details</button>
      <button type="button" role="menuitem" disabled={!colours.length} onClick={() => { onRemoveAll(); closeMenu(); }}>Remove all colours</button>
    </StudioAnchoredMenu> : null}
    <div className={details ? 'site-colours-custom-details' : 'site-colours-custom-swatches'}>{colours.map(item => <div className="site-colours-custom-entry" key={item.id}>
      <ColourPicker label={item.name} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) onChange({ ...item, colour }); }} />
      {details ? <><TextInput aria-label={`Colour name: ${item.name}`} value={item.name} maxLength={80} onChange={event => onChange({ ...item, name: event.target.value })} /><StudioButton variant="text" aria-label={`Remove colour: ${item.name}`} onClick={() => onRemove(item.id)}><AcmIcon name="action.remove" size={20} /></StudioButton></> : null}
    </div>)}</div>
  </section>;
}
function CustomGradient({ item, onChange, onRemove }: { item: PreviewGradient; onChange: (item: PreviewGradient) => void; onRemove: () => void }) {
  const [active, setActive] = useState(false);
  return <div className="site-colours-custom-row"><GradientPicker value={item.gradient} onChange={gradient => { if (gradient) onChange({ ...item, gradient }); }} active={active} onOpen={() => setActive(true)} /><TextInput aria-label={`Name ${item.name}`} value={item.name} maxLength={80} onChange={event => onChange({ ...item, name: event.target.value })} /><StudioButton variant="text" aria-label={`Remove ${item.name}`} onClick={onRemove}><AcmIcon name="action.delete" size={20} /></StudioButton></div>;
}
function ElementColour({ role, label, selection, foreground, onForeground, onChange }: { role: TypographyRole; label: string; selection: StyleSelection; foreground: string; onForeground: (colour?: string) => void; onChange: (patch: { background?: string; gradient?: import('../../content/model').ParagraphBackgroundGradient; gradientId?: string; hover?: string }) => void }) {
  const [tab, setTab] = useState('text');
  const ownerRef = useRef<HTMLDivElement>(null);
  const { palette } = previewStyleDetails(selection);
  const settings = selection.colours ?? {};
  const fields = { ...(/^h[1-6]$/.test(role) ? settings.elements?.headings : {}), ...settings.elements?.[role] };
  const paletteEntries = previewColourEntries(palette, settings).map(({ key, label, colour }) => ({ key, label, colour }));
  const backgroundRole = role === 'buttons' || role === 'headings' || /^h[1-6]$/.test(role);
  const background = previewColourValue(fields.background, palette, settings) ?? (role === 'buttons' ? palette.buttonBackground : undefined);
  const isBackground = backgroundRole && tab === 'background';
  const gradient = fields.gradientId ? settings.gradients?.[fields.gradientId]?.gradient ?? settings.retiredGradients?.[fields.gradientId] ?? fields.gradient : fields.gradient;
  return <div ref={ownerRef} className="site-colours-element"><ColourPicker wrapperClassName="inspector-colour-row-setting" label={label} onSelectPalette={(entry, state) => {
    const reference = previewPaletteReference(entry.key);
    if (role === 'links' && state === 'hover') onChange({ hover: reference });
    else if (isBackground) onChange({ background: reference, gradient: undefined, gradientId: undefined });
    else onForeground(reference);
  }} value={isBackground ? background : foreground} onChange={colour => isBackground ? onChange({ background: colour ?? "", gradient: undefined, gradientId: undefined }) : onForeground(colour)} hoverValue={previewColourValue(fields.hover, palette, settings)} onHoverChange={role === 'links' ? hover => onChange({ hover: hover ?? "" }) : undefined} palette={paletteEntries} enableAlpha trigger={({ onClick, expanded, controls }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label} colour`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><span className="inspector-colour-row-swatches" aria-hidden="true"><ColourValueSwatch value={foreground} />{backgroundRole ? <ColourValueSwatch overlap value={background} /> : role === "links" ? <ColourValueSwatch overlap value={previewColourValue(fields.hover, palette, settings)} /> : null}</span><span>{label}</span></button>} beforeControls={backgroundRole ? <PaneTabs id={`colour-${role}`} label={`${label} colour type`} tabs={[{ id: 'text', label: 'Text' }, { id: 'background', label: 'Background' }, { id: 'gradient', label: 'Gradient' }]} active={tab} onChange={setTab} /> : undefined} hideColourControls={backgroundRole && tab === 'gradient'} additionalControls={backgroundRole && tab === 'gradient' ? <div className="site-colours-background"><GradientPicker inline ownerRef={ownerRef} showPresets={false} value={gradient} active onOpen={() => {}} onChange={gradient => onChange({ gradient, gradientId: undefined, background: undefined })} />{Object.values(settings.gradients ?? {}).filter((item): item is PreviewGradient => Boolean(item)).map(item => <button type="button" key={item.id} className="site-colours-gradient-choice" onClick={() => onChange({ gradient: item.gradient, gradientId: item.id, background: undefined })}><i style={{ backgroundImage: `${paragraphBackgroundGradientCss(item.gradient)}, var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" }} />{item.name}</button>)}</div> : undefined} /></div>;
}
