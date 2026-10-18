"use client";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { StudioDialog } from "../overlays/dialog";
import { CheckboxControl } from "../controls/checkbox-control";
import { TypographyChoices } from "./browse-styles";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { referenceFonts, alphabeticalReferenceFonts, visibleTypographyFonts, typographyInUseFamilies, resolveFontSizePresets, defaultFontSizePresets, type TypographyRole, type FontSizePreset } from "./typography-preview-model";
import { ElementTypographySample } from "./element-typography-sample";
import { TypographyElementSettings } from "./typography-element-settings";
import { TypographyPresetEditor } from "./typography-preset-editor";
import type { PreviewScope } from "./identity-preview-state";

type View = "menu" | "sizes" | "preset" | "element";
export function TypographyPreview({ selection, scope, dispatch, onBack }: { selection: StyleSelection; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [view, setView] = useState<View>("menu");
  const [role, setRole] = useState<TypographyRole>("text");
  const [preset, setPreset] = useState<FontSizePreset | null>(null);
  const [fontDialog, setFontDialog] = useState<{ opener: HTMLElement; family?: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { typography } = previewStyleDetails(selection);
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
      <section><div className="site-typography-section-heading"><h3>Fonts</h3><StudioButton variant="text" aria-label="Manage Fonts" title="Manage Fonts" onClick={event => setFontDialog({ opener: event.currentTarget })}><AcmIcon name="action.adjust" size={20} scale="Regular-M" /></StudioButton></div><div className="site-typography-list">{fonts.map(font => <button type="button" key={font.name} onClick={event => setFontDialog({ opener: event.currentTarget, family: font.family })}><span style={{ fontFamily: font.family }}>{font.name}</span><span className="site-typography-trailing">{font.variable ? "1 variable variant" : `${font.weights.length} variants`}</span></button>)}</div></section>
      <section><h3>Elements</h3><div className="site-typography-list">{([ ["text", "Text"], ["links", "Links"], ["headings", "Headings"], ["captions", "Captions"], ["buttons", "Buttons"] ] as const).map(([id, label]) => <button type="button" key={id} onClick={() => { setRole(id); setView("element"); }}><ElementTypographySample role={id} selection={selection} /><span>{label}</span></button>)}</div></section>
      <section><h3>Font Sizes</h3><div className="site-typography-list"><button type="button" onClick={() => setView("sizes")}><span>Font Size Presets</span><AcmIcon name="navigation.chevron-right" size={20} scale="Regular-M" /></button></div></section>
    </> : view === "element" ? <>
      {(role === "headings" || /^h[1-6]$/.test(role)) ? <div className="site-typography-heading-levels" role="group" aria-label="Heading level">{(["headings", "h1", "h2", "h3", "h4", "h5", "h6"] as const).map(id => <button type="button" key={id} aria-label={id === "headings" ? "All Headings" : `Heading ${id.slice(1)}`} aria-pressed={role === id} onClick={() => setRole(id)}>{id === "headings" ? "All" : id.toUpperCase()}</button>)}</div> : null}
      <TypographyElementSettings key={`${scope}-${role}-${selection.typographyId}`} role={role} typography={typography} settings={settings} onChange={patch => dispatch({ type: "element", scope, role, patch })} onReset={() => dispatch({ type: "reset-element", scope, role })} />
    </> : view === "sizes" ? <>
      <p>Customise the font sizes available throughout this preview.</p><div className="site-typography-list">{presets.map(item => <button type="button" key={item.id} onClick={() => { setPreset(item); setView("preset"); }}><span>{item.name}</span><span className="site-typography-trailing">{item.size}</span></button>)}</div>
      <StudioButton type="button" variant="text" onClick={() => { setPreset({ id: `custom-${crypto.randomUUID()}`, name: "Custom", size: "1rem", min: "1rem", max: "2rem", fluid: false, customFluid: false }); setView("preset"); }}>Add Font Size Preset</StudioButton>
    </> : preset ? <TypographyPresetEditor key={preset.id} value={presets.find(item => item.id === preset.id) ?? preset} custom={!defaultFontSizePresets.some(item => item.id === preset.id)} onPreview={value => dispatch({ type: "font-preset", scope, id: value.id, preset: value })} onSave={value => { dispatch({ type: "font-preset", scope, id: value.id, preset: value }); setView("sizes"); }} onRemove={() => { dispatch({ type: "font-preset", scope, id: preset.id, preset: null }); setView("sizes"); }} onReset={() => { dispatch({ type: "font-preset", scope, id: preset.id, preset: undefined }); setView("sizes"); }} /> : null}
    {fontDialog ? <FontLibrary opener={fontDialog.opener} initialFamily={fontDialog.family} selected={settings.enabledFonts ?? []} required={inUseFamilies} onClose={() => setFontDialog(null)} onUpdate={families => { dispatch({ type: "fonts", scope, families }); setFontDialog(null); }} /> : null}
  </div>;
}
function FontLibrary({ opener, initialFamily, selected, required, onClose, onUpdate }: { opener: HTMLElement; initialFamily?: string; selected: string[]; required: string[]; onClose: () => void; onUpdate: (families: string[]) => void }) {
  const [draft, setDraft] = useState(selected);
  const [family, setFamily] = useState(initialFamily);
  const activeFont = referenceFonts.find(font => font.family === family);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { libraryHeading.current?.focus(); }, [family]);
  return <StudioDialog title="Font Library" returnFocus={opener} onClose={onClose} className="image-choice-dialog site-typography-font-dialog">
    {activeFont ? <><StudioButton variant="text" onClick={() => setFamily(undefined)}>Back to Library</StudioButton><h3 ref={libraryHeading} tabIndex={-1} style={{ fontFamily: activeFont.family }}>{activeFont.name}</h3><p>Bundled normal variants available in this preview:</p><div className="site-typography-font-faces">{activeFont.weights.map(weight => <p key={weight} style={{ fontFamily: activeFont.family, fontWeight: weight }}>{activeFont.name} · {weight} · The quick brown fox</p>)}</div><CheckboxControl label="Enable Font Family" checked={required.includes(activeFont.family) || draft.includes(activeFont.family)} disabled={required.includes(activeFont.family)} onChange={checked => setDraft(current => checked ? [...current, activeFont.family] : current.filter(item => item !== activeFont.family))} />{required.includes(activeFont.family) ? <p>This font is used by the theme or an element in this preview.</p> : null}</> : <><h3 ref={libraryHeading} tabIndex={-1}>Library</h3><p>Choose fonts for this preview. Enabling a family makes all its bundled variants available.</p><div className="site-typography-font-list">{alphabeticalReferenceFonts.map(font => <div key={font.name}><CheckboxControl label={<span style={{ fontFamily: font.family }}>{font.name}</span>} checked={required.includes(font.family) || draft.includes(font.family)} disabled={required.includes(font.family)} onChange={checked => setDraft(current => checked ? [...current, font.family] : current.filter(item => item !== font.family))} /><StudioButton type="button" variant="text" aria-label={`View ${font.name} variants`} onClick={() => setFamily(font.family)}>{font.variable ? `Variable ${font.weights[0]}–${font.weights.at(-1)}` : `${font.weights.length} Variants`}</StudioButton></div>)}</div></>}
    <StudioButton type="button" onClick={() => onUpdate(draft)}>Update Preview</StudioButton>
  </StudioDialog>;
}
