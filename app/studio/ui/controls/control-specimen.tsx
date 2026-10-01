"use client";

import { useState } from "react";
import type { ParagraphAppearance, ParagraphBackgroundGradient, ParagraphFontSize, ParagraphStyle } from "../../../content/model";
import { blockLibraryEntryByType } from "../../blocks/library-catalogue";
import { studioControlEntries, type StudioControlEntry } from "../../controls/library-catalogue";
import { BoxLengthSetting } from "../../../studio/box-length-setting";
import { InspectorAccordionSection } from "../../../studio/inspector-accordion";
import { InspectorToolsSection } from "../../../studio/inspector-tools-section";
import { BackgroundSelection } from "../../../studio/controls/background-selection";
import { BorderSettings } from "../../../studio/controls/border-settings";
import { ColourPicker, ColourValueSwatch } from "../../../studio/controls/colour-picker";
import { CustomFontSizeSetting } from "../../../studio/controls/custom-font-size-setting";
import { FocalPositionSetting } from "../../../studio/controls/focal-position-setting";
import { FontSizeAppearanceSetting } from "../../../studio/controls/font-size-appearance-setting";
import { LineHeightSetting } from "../../../studio/controls/line-height-setting";
import { ImageDimensionsSetting } from "../../../studio/controls/image-dimensions-setting";
import { ParagraphLengthSetting } from "../../../studio/controls/paragraph-length-setting";
import { PresetNumberSetting } from "../../../studio/controls/preset-number-setting";
import { StudioIcon } from "../../../studio/studio-icons";

const blockLinksByControl: Record<string, string[]> = {
  "colour-picker": ["paragraph", "divider"],
  "background-selection": ["paragraph", "quote", "group"],
  "custom-font-size": ["paragraph", "heading"],
  "font-size-appearance": ["paragraph", "heading"],
  "line-height": ["paragraph", "list"],
  "paragraph-length": ["paragraph", "divider"],
  "box-length": ["paragraph", "group", "columns"],
  "preset-number": ["columns", "column", "group"],
  "image-dimensions": ["image", "cover-image"],
  "focal-position": ["image", "cover-image", "group"],
  "border-settings": ["paragraph", "image", "cover-image"],
  "inspector-tools": ["paragraph", "quote", "group"],
  "inspector-accordion": ["paragraph", "template-content"],
};

export function ControlSpecimen({ entry, sliderAccent, sliderHoverAccent, onSliderAccentChange, onSliderHoverAccentChange }: { entry: StudioControlEntry; sliderAccent: string; sliderHoverAccent: string; onSliderAccentChange: (value: string | null) => void; onSliderHoverAccentChange: (value: string | null) => void }) {
  const [colour, setColour] = useState<string | undefined>("#374151");
  const [hoverColour, setHoverColour] = useState<string | undefined>("#2563a6");
  const [fontSize, setFontSize] = useState<string | undefined>("1.5rem");
  const [lineHeight, setLineHeight] = useState<string | undefined>("1.5");
  const [indent, setIndent] = useState<string | undefined>("24px");
  const [padding, setPadding] = useState<string | undefined>("24px");
  const [visible, setVisible] = useState(new Set<string>(["line-height"]));
  const [showInspectorExample, setShowInspectorExample] = useState(true);
  const [sliderExampleValue, setSliderExampleValue] = useState(64);
  const [borderStyle, setBorderStyle] = useState<ParagraphStyle>({ borderColor: "#59728a", borderStyle: "solid", borderWidth: "2px", borderRadius: "6px", shadow: "soft" });
  const [fontPreset, setFontPreset] = useState<ParagraphFontSize | undefined>("large");
  const [fontCustom, setFontCustom] = useState<string | undefined>();
  const [appearance, setAppearance] = useState<ParagraphAppearance | undefined>("semi-bold");
  const [fontMode, setFontMode] = useState<"presets" | "custom">("presets");
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">("gradient");
  const [backgroundColour, setBackgroundColour] = useState<string | undefined>();
  const [backgroundGradient, setBackgroundGradient] = useState<ParagraphBackgroundGradient | undefined>("ocean");
  const [presetNumber, setPresetNumber] = useState<number | undefined>(24);
  const [aspectRatio, setAspectRatio] = useState<"original" | "square" | "portrait" | "landscape" | "wide">("wide");
  const [displayWidth, setDisplayWidth] = useState<number | undefined>(640);
  const [displayHeight, setDisplayHeight] = useState<number | undefined>(360);
  const [scale, setScale] = useState<"cover" | "contain" | "fill">("cover");
  const [focalX, setFocalX] = useState(58);
  const [focalY, setFocalY] = useState(42);
  const [resetRevision, setResetRevision] = useState(0);
  const blockLinks = blockLinksByControl[entry.id] ?? [];
  const dependencies = entry.dependencies ?? [];
  const dependentControls = studioControlEntries.filter(control => control.dependencies?.some(dependency => dependency.kind === "inherits" && dependency.entryId === entry.id));

  function resetExample() {
    switch (entry.id) {
      case "slider-foundation": onSliderAccentChange(null); onSliderHoverAccentChange(null); setSliderExampleValue(64); break;
      case "colour-picker": setColour("#374151"); setHoverColour("#2563a6"); break;
      case "custom-font-size": setFontSize("1.5rem"); break;
      case "line-height": setLineHeight("1.5"); break;
      case "paragraph-length": setIndent("24px"); break;
      case "box-length": setPadding("24px"); break;
      case "inspector-tools": setVisible(new Set(["line-height"])); setShowInspectorExample(true); break;
      case "border-settings": setBorderStyle({ borderColor: "#59728a", borderStyle: "solid", borderWidth: "2px", borderRadius: "6px", shadow: "soft" }); break;
      case "font-size-appearance": setFontPreset("large"); setFontCustom(undefined); setAppearance("semi-bold"); setFontMode("presets"); break;
      case "background-selection": setBackgroundMode("gradient"); setBackgroundColour(undefined); setBackgroundGradient("ocean"); break;
      case "preset-number": setPresetNumber(24); break;
      case "image-dimensions": setAspectRatio("wide"); setDisplayWidth(640); setDisplayHeight(360); setScale("cover"); setFocalX(58); setFocalY(42); break;
      case "focal-position": setFocalX(58); setFocalY(42); break;
    }
    setResetRevision(revision => revision + 1);
  }

  return <section id={entry.id} className="ui-control-entry" aria-labelledby={`control-entry-${entry.id}`}>
    <header className="ui-control-entry-header">
      <div><p className="rl-eyebrow">{entry.group} control</p><h3 id={`control-entry-${entry.id}`}>{entry.title}</h3><p className="ui-control-detail-intro">{entry.purpose}</p></div>
      <button className="ui-control-reset" type="button" onClick={resetExample}><StudioIcon name="rotate" size={18} />Reset example</button>
    </header>
    <div className="ui-control-detail-card" aria-labelledby={`control-specimen-${entry.id}`}>
      <div className="ui-control-detail-header"><h4 id={`control-specimen-${entry.id}`}>Live specimen</h4></div>
      <div key={resetRevision} className={`ui-control-detail-example inspector-sections${entry.id === "border-settings" || entry.id === "image-dimensions" ? " is-wide" : ""}`}>
        {entry.id === "slider-foundation" ? <div className="ui-control-slider-foundation"><div className="ui-control-slider-foundation-colours"><label htmlFor="ui-slider-foundation-colour">Shared slider accent colour<input id="ui-slider-foundation-colour" type="color" value={sliderAccent} onChange={event => onSliderAccentChange(event.target.value)} /></label><label htmlFor="ui-slider-foundation-hover-colour">Shared slider hover colour<input id="ui-slider-foundation-hover-colour" type="color" value={sliderHoverAccent} onChange={event => onSliderHoverAccentChange(event.target.value)} /></label></div><div className="ui-control-slider-example"><label htmlFor="ui-slider-foundation-example">Range example</label><input className="studio-range-control" id="ui-slider-foundation-example" type="range" min="0" max="100" value={sliderExampleValue} onChange={event => setSliderExampleValue(Number(event.target.value))} /></div><p>Preview colours: accent <code>{sliderAccent.toUpperCase()}</code>; hover <code>{sliderHoverAccent.toUpperCase()}</code>. Hover falls back to the accent until you change it. Both colours preview every standard slider on this Controls page; Reset example restores the defaults.</p><p>Gradient hue and alpha sliders use specialist colour tracks and are intentionally excluded.</p></div> : null}
        {entry.id === "colour-picker" ? <div className="ui-control-example-grid"><div className="ui-control-live ui-control-colour-live"><ColourPicker label="Link colour" value={colour} onChange={setColour} hoverValue={hoverColour} onHoverChange={setHoverColour} wrapperClassName="ui-control-colour-picker" paletteClassName="ui-control-colour-palette" /><p>Default: {colour ?? "Unset"} · Hover: {hoverColour ?? "Unset"}</p><button className="studio-clear-action" type="button" onClick={() => { setColour(undefined); setHoverColour(undefined); }}>Clear both colours</button></div><div className="ui-control-state-examples"><ColourPicker label="Disabled colour" value="#0088ff" onChange={() => {}} disabled wrapperClassName="ui-control-disabled" /><div className="ui-control-swatch-states" aria-label="Overlapping unset colour swatches"><ColourValueSwatch /><ColourValueSwatch overlap /></div><span>Unset swatches overlap with opaque white centres. The disabled picker cannot be opened.</span></div></div> : null}
        {entry.id === "custom-font-size" ? <div className="ui-control-live ui-control-size-example"><CustomFontSizeSetting value={fontSize} onChange={setFontSize} /><p>Current value: {fontSize ?? "Default"}</p></div> : null}
        {entry.id === "paragraph-length" ? <div className="ui-control-live ui-control-size-example"><ParagraphLengthSetting label="Line indent" value={indent} min={-100} max={300} onChange={setIndent} /><p>Current value: {indent ?? "Default"}</p><ParagraphLengthSetting label="Disabled example" value="16px" min={0} max={100} disabled onChange={() => {}} /></div> : null}
        {entry.id === "box-length" ? <div className="ui-control-live ui-control-size-example"><BoxLengthSetting label="Padding" value={padding} layout="axes" min={0} max={120} onChange={setPadding} /><p>Current value: {padding ?? "Default"}</p><BoxLengthSetting label="Disabled example" value="12px" layout="all" min={0} max={120} disabled onChange={() => {}} /></div> : null}
        {entry.id === "inspector-tools" ? <div className="ui-control-tools-example"><InspectorToolsSection title="Typography" options={[{ id: "line-height", label: "Line height" }, { id: "font-family", label: "Font family", source: "studio" }]} visible={visible} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => setVisible(new Set())}><div className={`ui-control-tools-field${visible.has("line-height") && showInspectorExample ? "" : " is-hidden"}`} aria-hidden={!visible.has("line-height") || !showInspectorExample}><label>Line height <input type="text" placeholder="Default" /></label></div></InspectorToolsSection><button className="ui-control-reset" type="button" onClick={() => setShowInspectorExample(value => !value)}><StudioIcon name="rotate" size={18} />Toggle example control</button></div> : null}
        {entry.id === "inspector-accordion" ? <div className="ui-control-live"><InspectorAccordionSection title="Example settings"><p>This content belongs to the open section. Use the disclosure heading to collapse or reopen it.</p><label>Example value <input type="text" defaultValue="Temporary value" /></label></InspectorAccordionSection></div> : null}
        {entry.id === "border-settings" ? <div className="ui-control-live ui-control-size-example"><BorderSettings style={borderStyle} idPrefix="catalogue" onChange={changes => setBorderStyle(current => ({ ...current, ...changes }))} /><p>Border state: {borderStyle.borderStyle ?? "Default"} · {borderStyle.borderWidth ?? "No width"}</p><BorderSettings style={borderStyle} idPrefix="catalogue-disabled" disabled onChange={() => {}} /></div> : null}
        {entry.id === "font-size-appearance" ? <div className="ui-control-live ui-control-size-example"><FontSizeAppearanceSetting size={fontPreset} customSize={fontCustom} appearance={appearance} mode={fontMode} onModeChange={setFontMode} onSizeChange={setFontPreset} onCustomSizeChange={setFontCustom} onAppearanceChange={setAppearance} /><FontSizeAppearanceSetting size="medium" appearance="regular" mode="presets" disabled onModeChange={() => {}} onSizeChange={() => {}} onCustomSizeChange={() => {}} onAppearanceChange={() => {}} /><p>Disabled Typography example shown beneath the working specimen.</p></div> : null}
        {entry.id === "line-height" ? <div className="ui-control-live ui-control-size-example"><LineHeightSetting value={lineHeight} onChange={setLineHeight} /><p>Current value: {lineHeight ?? "Default"}</p><LineHeightSetting value="1.25" disabled onChange={() => {}} label="Disabled example" /></div> : null}
        {entry.id === "background-selection" ? <div className="ui-control-live ui-control-size-example"><BackgroundSelection mode={backgroundMode} colour={backgroundColour} gradient={backgroundGradient} onModeChange={setBackgroundMode} onColourChange={setBackgroundColour} onGradientChange={setBackgroundGradient} /><BackgroundSelection mode="colour" colour="#e5e7eb" disabled onModeChange={() => {}} onColourChange={() => {}} onGradientChange={() => {}} /><p>Use Gradient to edit colour stops, type and angle or choose a preset. Colour opens the shared palette. Reset returns to the ocean gradient example.</p></div> : null}
        {entry.id === "preset-number" ? <div className="ui-control-live ui-control-size-example"><PresetNumberSetting label="Column gap" value={presetNumber} presets={[0, 8, 16, 24, 32, 48]} min={0} max={160} onChange={setPresetNumber} /><p>Current value: {presetNumber === undefined ? "Default" : `${presetNumber}px`}</p><PresetNumberSetting label="Disabled example" value={16} presets={[8, 16, 24]} min={0} max={120} disabled onChange={() => {}} /></div> : null}
        {entry.id === "image-dimensions" ? <div className="ui-control-size-example ui-control-image-dimensions"><ImageDimensionsSetting aspectRatio={aspectRatio} displayWidth={displayWidth} displayHeight={displayHeight} scale={scale} onAspectRatioChange={setAspectRatio} onWidthChange={setDisplayWidth} onHeightChange={setDisplayHeight} onScaleChange={setScale} /><div className="ui-control-image-preview-frame"><div className="ui-control-image-preview" style={{ width: "100%", aspectRatio: displayHeight ? `${displayWidth ?? 640} / ${displayHeight}` : aspectRatio === "original" ? "16 / 9" : aspectRatio === "square" ? "1 / 1" : aspectRatio === "portrait" ? "3 / 4" : aspectRatio === "landscape" ? "4 / 3" : "16 / 9", maxWidth: displayWidth ?? 640, height: "auto", backgroundSize: scale, backgroundPosition: `${focalX}% ${focalY}%` }} role="img" aria-label="Local abstract image preview"><span>Local media preview</span></div></div><ImageDimensionsSetting aspectRatio="wide" disabled onAspectRatioChange={() => {}} onWidthChange={() => {}} onHeightChange={() => {}} onScaleChange={() => {}} /></div> : null}
        {entry.id === "focal-position" ? <div className="ui-control-live ui-control-size-example"><div className="ui-control-focal-preview" style={{ backgroundPosition: `${focalX}% ${focalY}%` }} aria-hidden="true"><span>Image crop sample</span></div><FocalPositionSetting x={focalX} y={focalY} onXChange={setFocalX} onYChange={setFocalY} /><FocalPositionSetting x={50} y={50} disabled label="Disabled example" onXChange={() => {}} onYChange={() => {}} presentation="range" /><p>Both values are clamped to the 0–100 range.</p></div> : null}
      </div>
      {entry.id === "image-dimensions" ? <p className="ui-control-detail-note">The preview scales to fit the example; width and height settings remain in pixels. An automatic width uses this fixture’s intrinsic 640px width.</p> : null}
      <p className="ui-control-detail-note">Changes stay in this page’s temporary example state and do not edit a document or save block content.</p>
    </div>
    <details className="ui-control-facts"><summary><span>Ownership, consumers, dependencies and compatibility</span><StudioIcon name="chevron-right" size={16} /></summary><dl>
      <div><dt>Ownership</dt><dd>{entry.owner}</dd></div>
      <div><dt>Consumers</dt><dd>{entry.id === "slider-foundation" ? <ul className="ui-control-dependency-list">{dependentControls.map(control => <li key={control.id}><a href={`#${control.id}`}>{control.title}</a></li>)}{entry.consumers.map(consumer => <li key={consumer}>{consumer}</li>)}</ul> : entry.consumers.join("; ")}</dd></div>
      <div className="ui-control-fact-dependencies"><dt>Dependencies</dt><dd>{dependencies.length ? <ul className="ui-control-dependency-list">{dependencies.map((dependency, index) => <li key={`${dependency.label}-${index}`}><strong>{dependency.kind === "inherits" ? "Inherits" : "Uses"}</strong> {dependency.entryId ? <a href={`#${dependency.entryId}`}>{dependency.label}</a> : dependency.label}: {dependency.detail}</li>)}</ul> : "None documented."}</dd></div>
      <div><dt>Supported states</dt><dd>{entry.states}</dd></div>
      <div><dt>Compatibility</dt><dd>{entry.compatibility}</dd></div>
      <div><dt>Related block specimens</dt><dd>{blockLinks.map((block, index) => <span key={block}>{index ? ", " : ""}<a href={`/studio/ui/blocks/${block}`}>{blockLibraryEntryByType[block as keyof typeof blockLibraryEntryByType]?.label ?? block}</a></span>)}</dd></div>
    </dl></details>
  </section>;
}
