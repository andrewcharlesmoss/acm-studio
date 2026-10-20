"use client";
import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { PaneTabs, PaneTabPanel } from "../panes/pane-components";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { CheckboxControl } from "../controls/checkbox-control";
import { TypographyChoices } from "./browse-styles";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { referenceFonts, alphabeticalReferenceFonts, updatedFontAvailability, visibleTypographyFonts, typographyInUseFamilies, resolveFontSizePresets, defaultFontSizePresets, type TypographyRole, type FontSizePreset, type TypographySettings } from "./typography-preview-model";
import { ElementTypographySample } from "./element-typography-sample";
import { TypographyElementSettings } from "./typography-element-settings";
import { TypographyPresetEditor } from "./typography-preset-editor";
import type { PreviewScope } from "./identity-preview-state";

type View = "menu" | "sizes" | "preset" | "element";
export type TypographyPreviewNavigation = { view: View; role: TypographyRole };
export function TypographyPreview({ selection, scope, dispatch, authoredTypography, onBack, navigation, onNavigate }: { selection: StyleSelection; scope: PreviewScope; dispatch: Dispatch<StyleAction>; authoredTypography: TypographySettings; onBack: () => void; navigation: TypographyPreviewNavigation; onNavigate: Dispatch<SetStateAction<TypographyPreviewNavigation>> }) {
  const { view, role } = navigation;
  const setView = (view: View) => onNavigate(current => ({ ...current, view }));
  const setRole = (role: TypographyRole) => onNavigate(current => ({ ...current, role }));
  const [preset, setPreset] = useState<FontSizePreset | null>(null);
  const [fontDialog, setFontDialog] = useState<{ opener: HTMLElement; family?: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { typography, palette } = previewStyleDetails(selection);
  const settings = selection.typography ?? {};
  const presets = resolveFontSizePresets(settings);
  const inUseFamilies = typographyInUseFamilies(typography, settings);
  const fonts = visibleTypographyFonts(typography, settings);
  useEffect(() => { heading.current?.focus(); }, [view, role]);
  const title = view === "menu" ? "Typography" : view === "sizes" ? "Font Size Presets" : view === "preset" ? (presets.find(item => item.id === preset?.id)?.name ?? preset?.name ?? "Add Font Size") : role.startsWith("h") ? "Headings" : role[0].toUpperCase() + role.slice(1);
  function back() { if (view === "menu") onBack(); else setView(view === "preset" ? "sizes" : "menu"); }
  return <div className="site-browse-styles site-typography">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={view === "menu" ? "Back to Styles" : "Back to Typography"} onClick={back}><AcmIcon name="navigation.chevron-left" size={20} scale="Regular-M" /></StudioButton><h3 tabIndex={-1} ref={heading}>{title}</h3></div>
    {view === "menu" ? <>
      <p>Available fonts, typographic styles, and the application of those styles.</p>
      <section><h3>Typesets</h3><TypographyChoices selected={selection.typographyId} onChange={typographyId => dispatch({ type: "change", scope, patch: { typographyId } })} /></section>
      <section><div className="site-typography-section-heading"><h3>Fonts</h3><StudioButton variant="text" className="studio-adjustment-action" aria-label="Manage Fonts" title="Manage Fonts" onClick={event => setFontDialog({ opener: event.currentTarget })}><AcmIcon name="action.adjust" size={20} scale="Regular-M" /></StudioButton></div><div className="site-typography-list">{fonts.map(font => <button type="button" key={font.name} onClick={event => setFontDialog({ opener: event.currentTarget, family: font.family })}><span style={{ fontFamily: font.family }}>{font.name}</span><span className="site-typography-trailing">{font.variable ? "1 variant" : `${font.weights.length} variants`}</span></button>)}</div></section>
      <section><h3>Elements</h3><div className="site-typography-list">{([ ["text", "Text"], ["links", "Links"], ["headings", "Headings"], ["captions", "Captions"], ["buttons", "Buttons"] ] as const).map(([id, label]) => <button type="button" key={id} onClick={() => { setRole(id); setView("element"); }}><ElementTypographySample role={id} selection={selection} /><span>{label}</span></button>)}</div></section>
      <section><h3>Font Sizes</h3><div className="site-typography-list"><button type="button" onClick={() => setView("sizes")}><span>Font Size Presets</span><AcmIcon name="navigation.chevron-right" size={20} scale="Regular-M" /></button></div></section>
    </> : view === "element" ? <>
      {(role === "headings" || /^h[1-6]$/.test(role)) ? <div className="site-typography-heading-levels" role="group" aria-label="Heading level">{(["headings", "h1", "h2", "h3", "h4", "h5", "h6"] as const).map(id => <button type="button" key={id} aria-label={id === "headings" ? "All Headings" : `Heading ${id.slice(1)}`} aria-pressed={role === id} onClick={() => setRole(id)}>{id === "headings" ? "All" : id.toUpperCase()}</button>)}</div> : null}
      <TypographyElementSettings key={`${scope}-${role}-${selection.typographyId}`} role={role} typography={typography} palette={palette} settings={settings} colourSettings={selection.colours} authored={authoredTypography.elements?.[role] ?? {}} onChange={patch => dispatch({ type: "element", scope, role, patch })} onReset={() => dispatch({ type: "reset-element", scope, role })} onResetFields={fields => dispatch({ type: "reset-element-fields", scope, role, fields })} />
    </> : view === "sizes" ? <>
      <p>Customise the font sizes available throughout this preview.</p><div className="site-typography-list">{presets.map(item => <button type="button" key={item.id} onClick={() => { setPreset(item); setView("preset"); }}><span>{item.name}</span><span className="site-typography-trailing">{item.size}</span></button>)}</div>
      <StudioButton type="button" variant="text" onClick={() => { setPreset({ id: `custom-${crypto.randomUUID()}`, name: "Custom", size: "1rem", min: "1rem", max: "2rem", fluid: false, customFluid: false }); setView("preset"); }}>Add Font Size Preset</StudioButton>
    </> : preset ? <TypographyPresetEditor key={preset.id} value={presets.find(item => item.id === preset.id) ?? preset} custom={!defaultFontSizePresets.some(item => item.id === preset.id)} onPreview={value => dispatch({ type: "font-preset", scope, id: value.id, preset: value })} onSave={value => { dispatch({ type: "font-preset", scope, id: value.id, preset: value }); setView("sizes"); }} onRemove={() => { dispatch({ type: "font-preset", scope, id: preset.id, preset: null }); setView("sizes"); }} onReset={() => { dispatch({ type: "font-preset", scope, id: preset.id, preset: undefined }); setView("sizes"); }} /> : null}
    {fontDialog ? <FontLibrary opener={fontDialog.opener} initialFamily={fontDialog.family} selected={fonts.filter(font => !settings.disabledFonts?.includes(font.family)).map(font => font.family)} families={fonts.map(font => font.family)} onClose={() => setFontDialog(null)} onUpdate={families => { dispatch({ type: "fonts", scope, ...updatedFontAvailability(settings, fonts.map(font => font.family), families, inUseFamilies) }); }} /> : null}
  </div>;
}
export function FontLibrary({ opener, initialFamily, selected, families, onClose, onUpdate }: { opener: HTMLElement; initialFamily?: string; selected: string[]; families: string[]; onClose: () => void; onUpdate: (families: string[]) => void }) {
  const [draft, setDraft] = useState(selected);
  const [family, setFamily] = useState(initialFamily);
  const [updated, setUpdated] = useState(false);
  const [previousSelected, setPreviousSelected] = useState(selected);
  const sameFamilies = (first: string[], second: string[]) => first.length === second.length && first.every(value => second.includes(value));
  // Follow history changes when clean, while preserving unfinished checkbox edits.
  if (!sameFamilies(previousSelected, selected)) {
    setPreviousSelected(selected);
    if (sameFamilies(draft, previousSelected)) setDraft(selected);
    if (!sameFamilies(draft, selected)) setUpdated(false);
  }
  const activeFont = referenceFonts.find(font => font.family === family);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  const tabsId = useId();
  useEffect(() => { libraryHeading.current?.focus(); }, [family]);
  const isEnabled = (value: string) => draft.includes(value);
  const changeFamily = (value: string, enabled: boolean) => {
    setUpdated(false);
    setDraft(current => enabled ? [...new Set([...current, value])] : current.filter(item => item !== value));
  };
  const changed = draft.length !== selected.length || draft.some(value => !selected.includes(value));
  const weightNames: Record<number, string> = { 100: "Thin", 200: "Extra Light", 300: "Light", 400: "Normal", 500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black" };
  const successNotice = updated ? <div className="site-font-library-success" role="status"><span>Font family updated successfully.</span><StudioButton variant="text" aria-label="Dismiss font update message" onClick={() => { setUpdated(false); libraryHeading.current?.focus(); }}><AcmIcon name="action.close" size={20} scale="Regular-M" /></StudioButton></div> : null;
  return <StudioDialog title="Fonts" returnFocus={opener} onClose={onClose} closeOnBackdrop className="site-typography-font-dialog">
    <div className="site-font-library-navigation"><div><PaneTabs id={tabsId} label="Font sources" tabs={[{ id: "library", label: "Library" }]} active="library" onChange={() => {}} /></div></div>
    <PaneTabPanel id={tabsId} tab="library" active="library" className="site-font-library-body">
      {activeFont ? <>
        <div className="site-font-library-family-heading"><StudioButton variant="text" aria-label="Back to Library" onClick={() => { setFamily(undefined); setUpdated(false); }}><AcmIcon name="navigation.chevron-left" size={20} scale="Regular-M" /></StudioButton><h3 ref={libraryHeading} tabIndex={-1}>{activeFont.name}</h3></div>
        {successNotice}
        <p>Choose font variants. Keep in mind that too many variants could make your site slower.</p>
        <div className="site-font-library-select-all"><CheckboxControl label="Select all" checked={isEnabled(activeFont.family)} onChange={checked => changeFamily(activeFont.family, checked)} /></div>
        <div className="site-font-library-variants">
          {activeFont.variable ? <div className="site-font-library-variant"><CheckboxControl checked={isEnabled(activeFont.family)} onChange={checked => changeFamily(activeFont.family, checked)} label={<span style={{ fontFamily: activeFont.family }}>{activeFont.name} {activeFont.weights[0]} {activeFont.weights.at(-1)}</span>} /></div>
          : activeFont.weights.map(weight => <div className="site-font-library-variant" key={weight}><span style={{ fontFamily: activeFont.family, fontWeight: weight }}>{activeFont.name} {weightNames[weight]}</span></div>)}
        </div>
        {!activeFont.variable ? <p className="site-font-library-help">These bundled variants are enabled together.</p> : null}
      </> : <>
        <h3 className="site-font-library-theme-heading" ref={libraryHeading} tabIndex={-1}>Theme</h3>
        {successNotice}
        <div className="site-typography-list site-font-library-theme-list">{alphabeticalReferenceFonts.filter(font => families.includes(font.family)).map(font => {
          const count = font.variable ? 1 : font.weights.length;
          return <button type="button" key={font.name} aria-label={`View ${font.name} variants`} onClick={() => { setFamily(font.family); setUpdated(false); }}><span className="site-font-library-family-name" style={{ fontFamily: font.family }}>{font.name}</span><span className="site-typography-trailing">{isEnabled(font.family) ? count : 0} of {count} active</span><AcmIcon name="navigation.chevron-right" size={20} scale="Regular-M" /></button>;
        })}</div>
      </>}
    </PaneTabPanel>
    <footer className="site-font-library-footer"><StudioDialogActions><StudioButton type="button" disabled={!changed} onClick={() => { onUpdate(draft); setUpdated(true); }}>Update</StudioButton></StudioDialogActions></footer>
  </StudioDialog>;
}
