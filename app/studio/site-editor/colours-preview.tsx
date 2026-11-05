"use client";
import { explicitTypographyFields, explicitPaletteColour } from "./style-provenance";
import { SettingLabel, SettingInheritanceProvider } from "../controls/setting-inheritance";
import { InheritedIndicator } from "../controls/inherited-indicator";
import { canAddWebsiteStyleEntry } from "./website-style-limits";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { ColourPicker, ColourValueSwatch } from "../controls/colour-picker";
import { PaneTabs } from "../panes/pane-components";
import { ElementColourSetting } from "./element-colour-setting";
import { CustomPaletteEditor, CustomGradientPaletteEditor } from "../controls/custom-palette-editor";
import { InspectorToolsSection } from "../inspector-tools-section";
import { DEFAULT_GRADIENTS } from "../../content/background-gradient";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { resolvedTypographyFields, type TypographyRole } from "./typography-preview-model";
import { previewColourEntries, previewColourValue, previewElementForeground, referenceColourPalettes, type PreviewColour, type PreviewGradient } from "./colours-preview-model";
import { stylePalettes } from "./style-reference-data";
import type { PreviewScope } from "./identity-preview-state";
import "../controls/palette-colour-setting.css";
import "./colours-preview.css";

const roles = [{ id: 'links', label: 'Link' }, { id: 'captions', label: 'Captions' }, { id: 'buttons', label: 'Button' }, { id: 'headings', label: 'Heading' }, ...([1, 2, 3, 4, 5, 6] as const).map(level => ({ id: `h${level}`, label: `H${level}` }))] as { id: TypographyRole; label: string }[];
export type ColoursPreviewView = "menu" | "palette";
export function ColoursPreview({ selection, authored, scope, dispatch, onBack, view: controlledView, onViewChange }: { view?: ColoursPreviewView; onViewChange?: (view: ColoursPreviewView) => void; selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [localView, setLocalView] = useState<ColoursPreviewView>("menu");
  const view = controlledView ?? localView;
  const setView = onViewChange ?? setLocalView;
  const [tab, setTab] = useState('colour');
  const [visibleByScope, setVisibleByScope] = useState<Partial<Record<PreviewScope, Set<TypographyRole>>>>({});
  const visible = visibleByScope[scope] ?? new Set([...roles.slice(0, 4).map(role => role.id), ...roles.filter(role => authored.colours?.elements?.[role.id] || authored.typography?.elements?.[role.id]?.colour !== undefined).map(role => role.id)]);
  function setVisible(update: (current: Set<TypographyRole>) => Set<TypographyRole>) {
    setVisibleByScope(current => ({ ...current, [scope]: update(current[scope] ?? visible) }));
  }
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
  const rowForeground = (role: TypographyRole) => previewElementForeground(role, resolvedTypographyFields(typography, selection.typography ?? {}, role).colour, palette, settings);
  const elementColourInherited = (role: TypographyRole) => {
    const paletteRole = role === "buttons" ? "buttonText" : role === "headings" || role.startsWith("h") ? "heading" : "text";
    const paletteSource = stylePalettes.find(item => item.id === (selection.paletteId ?? "default")) ?? stylePalettes[0];
    const paletteColour = paletteSource[paletteRole];
    const paletteIndex = paletteSource.colours.findIndex(colour => colour === paletteColour);
    const localPaletteColour = paletteIndex >= 0 && authored.colours?.theme?.[String(paletteIndex)] !== undefined;
    const paletteInherited = scope !== "global" && authored.paletteId === undefined && !localPaletteColour && explicitPaletteColour(selection, paletteRole);
    const baseRole = role === "headings" || role.startsWith("h") ? "headings" : role === "buttons" ? "buttons" : "text";
    const localElementColour = authored.typography?.elements?.[baseRole]?.colour !== undefined
      || authored.typography?.elements?.[role]?.colour !== undefined;
    const typographyInherited = !localElementColour && explicitTypographyFields(selection, role).colour !== undefined;
    if (scope === "global") return false;
    const effectiveFields = { ...(/^h[1-6]$/.test(role) ? settings.elements?.headings : {}), ...settings.elements?.[role] };
    const localFields = { ...(/^h[1-6]$/.test(role) ? authored.colours?.elements?.headings : {}), ...authored.colours?.elements?.[role] };
    const inheritedSurface = effectiveFields.gradientId ? localFields.gradientId === undefined
      : effectiveFields.gradient !== undefined ? localFields.gradient === undefined
      : effectiveFields.background !== undefined && localFields.background === undefined;
    return inheritedSurface || typographyInherited || (paletteInherited && !localElementColour)

      || (settings.elements?.[role]?.hover !== undefined && authored.colours?.elements?.[role]?.hover === undefined);
  };
  const themeInherited = (index: number) => scope !== "global" && authored.colours?.theme?.[String(index)] === undefined && (settings.theme?.[String(index)] !== undefined || (authored.paletteId === undefined && selection.paletteId !== "default"));
  return <div className="site-browse-styles site-colours-preview">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={view === 'menu' ? 'Back to Styles' : 'Back to Colours'} onClick={() => view === 'menu' ? onBack() : setView('menu')}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>{view === 'menu' ? 'Colours' : 'Edit palette'}</h3></div>
    {view === 'menu' ? <>
      <p className="site-colours-description">Palette colours and the application of those colours on site elements.</p>
      <section><h3>Palette</h3><button type="button" className="site-colours-edit-palette" onClick={() => setView('palette')}><span className="site-colours-overlapping" aria-hidden="true">{theme.slice(0, 5).map(item => <ColourValueSwatch key={item.key} value={item.colour} />)}</span><span>Edit palette</span><AcmIcon name="navigation.chevron-right" size={20} /></button></section>
      <InspectorToolsSection title="Elements" options={roles.map((role, index) => ({ ...role, disabled: index < 4 }))} visible={visible} showCloseControl={false} alwaysShow canReset={resettable.size > 0} resettableOptions={resettable} onResetOption={id => resetRole(id as TypographyRole)} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id as TypographyRole)) next.delete(id as TypographyRole); else next.add(id as TypographyRole); return next; })} onReset={() => { dispatch({ type: 'reset-colour-elements', scope }); }}>
        <div className="site-colours-element-list">{roles.filter(role => visible.has(role.id)).map(role => <SettingInheritanceProvider key={role.id} values={{ [role.label]: elementColourInherited(role.id) }}><ElementColour role={role.id} label={role.label} selection={selection} foreground={rowForeground(role.id)} onForeground={colour => dispatch({ type: 'element', scope, role: role.id, patch: { colour: colour ?? "" } })} onChange={patch => change({ elements: { [role.id]: patch } })} /></SettingInheritanceProvider>)}</div>
      </InspectorToolsSection>
    </> : <>
      <p className="site-colours-description">The combination of colours used across the site and in colour pickers.</p>
      <PaneTabs id="site-palette-kind" label="Palette type" tabs={[{ id: 'colour', label: 'Colour' }, { id: 'gradient', label: 'Gradient' }]} active={tab} onChange={setTab} />
      {tab === 'colour' ? <>
        <div ref={themeSection} className="site-colours-theme-section">{details ? <>
          <div className="site-colours-theme-details-heading"><h3 ref={themeDetailsHeading} tabIndex={-1}>THEME</h3><StudioButton variant="text" onClick={hideThemeDetails}>Done</StudioButton></div>
          <div className="site-colours-theme-details">{theme.map((item, index) => <ColourPicker key={item.key} label={item.label} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) change({ theme: { [String(index)]: colour } }); }} trigger={({ onClick, expanded, controls, disabled }) => <button type="button" className="inspector-colour-row site-colours-theme-detail-row" disabled={disabled} aria-label={`Choose ${item.label} colour`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={item.colour} /><SettingLabel inherited={themeInherited(index)}>{item.label}</SettingLabel></button>} />)}</div>
        </> : <InspectorToolsSection title="Theme" options={[]} visible={new Set(["theme"])} alwaysShow showCloseControl={false} canReset={Boolean(authored.colours?.theme)} menuOptions={[{ id: 'details', label: 'Show Details', checked: false }]} onMenuOptionSelect={showThemeDetails} onToggle={() => {}} onReset={() => dispatch({ type: 'reset-theme-colours', scope })}>
          <div className="site-colours-theme-grid">{theme.map((item, index) => <SettingInheritanceProvider key={item.key} values={{ [item.label]: themeInherited(index) }}><div><ColourPicker label={item.label} palette={entries} enableAlpha allowClear={false} value={item.colour} onChange={colour => { if (colour) change({ theme: { [String(index)]: colour } }); }} /></div></SettingInheritanceProvider>)}</div>
        </InspectorToolsSection>}</div>
        <CustomPaletteEditor inheritance={Object.fromEntries(custom.map(item => [item.id, scope !== "global" && authored.colours?.custom?.[item.id] === undefined]))} canAdd={canAddWebsiteStyleEntry(authored.colours?.custom, authored.colours?.retired)} colours={custom} entries={entries} onAdd={() => {
          if (!canAddWebsiteStyleEntry(authored.colours?.custom, authored.colours?.retired)) return;
          let number = 1;
          while (custom.some(item => item.name === `Colour ${number}`)) number += 1;
          const id = `custom-${crypto.randomUUID()}`;
          change({ custom: { [id]: { id, name: `Colour ${number}`, colour: '#000000' } } });
        }} onChange={item => change({ custom: { [item.id]: item } })} onRemove={id => dispatch({ type: 'remove-colour', scope, id })} onRemoveAll={() => dispatch({ type: 'remove-custom-colours', scope })} />
        <section><h3>Palettes</h3><div className="site-colours-palettes">{referenceColourPalettes.map(item => {
          const selected = selection.paletteId === item.id && item.colours.every((colour, index) => palette.colours[index] === colour);
          const inherited = selected && scope !== "global" && authored.paletteId === undefined && selection.paletteId !== "default";
          return <div className="site-colours-palette-choice" key={item.id}><button type="button" aria-label={`${item.name} colours${inherited ? ", inherited from Universal Defaults" : ""}`} title={item.name} aria-pressed={selected} data-inherited={inherited || undefined} onClick={() => dispatch({ type: 'colour-palette', scope, paletteId: item.id as StyleSelection['paletteId'] })}><span className="site-style-palette-sample" aria-hidden="true">{item.colours.slice(0, 4).map((colour, index) => <span key={index} style={{ background: colour }} />)}</span></button>{inherited ? <InheritedIndicator /> : <span aria-hidden="true" />}</div>;
        })}</div></section>
      </> : <CustomGradientPaletteEditor gradients={gradients} inheritance={Object.fromEntries(gradients.map(item => [item.id, scope !== "global" && authored.colours?.gradients?.[item.id] === undefined]))} canAdd={canAddWebsiteStyleEntry(authored.colours?.gradients, authored.colours?.retiredGradients)} onAdd={() => {
        if (!canAddWebsiteStyleEntry(authored.colours?.gradients, authored.colours?.retiredGradients)) return;
        let number = 1;
        while (gradients.some(item => item.name === `Colour ${number}`)) number += 1;
        const id = `gradient-${crypto.randomUUID()}`;
        change({ gradients: { [id]: { id, name: `Colour ${number}`, gradient: gradients.length ? DEFAULT_GRADIENTS[0].value : null } } });
      }} onChange={item => change({ gradients: { [item.id]: item } })} onRemove={id => dispatch({ type: 'remove-gradient', scope, id })} onRemoveAll={() => dispatch({ type: 'remove-custom-gradients', scope })} />}
    </>}
  </div>;
}
function ElementColour({ role, label, selection, foreground, onForeground, onChange }: { role: TypographyRole; label: string; selection: StyleSelection; foreground?: string; onForeground: (colour?: string) => void; onChange: (patch: { background?: string; gradient?: import('../../content/model').ParagraphBackgroundGradient; gradientId?: string; hover?: string }) => void }) {
  const { palette } = previewStyleDetails(selection);
  const settings = selection.colours ?? {};
  const fields = { ...(/^h[1-6]$/.test(role) ? settings.elements?.headings : {}), ...settings.elements?.[role] };
  const backgroundRole = role === 'buttons' || role === 'headings' || /^h[1-6]$/.test(role);
  return <ElementColourSetting label={label} selection={selection} foreground={foreground} background={previewColourValue(fields.background, palette, settings) ?? (role === 'buttons' ? palette.buttonBackground : undefined)} gradient={fields.gradient} gradientId={fields.gradientId} hover={fields.hover} backgroundEnabled={backgroundRole} resetPaletteRole={role === 'buttons' ? 'theme-0' : undefined} onForeground={onForeground} onBackground={background => onChange({ background: background ?? '', gradient: undefined, gradientId: undefined })} onGradient={(gradient, gradientId) => onChange({ gradient, gradientId, background: undefined })} onHover={role === 'links' ? hover => onChange({ hover: hover ?? '' }) : undefined} />;
}
