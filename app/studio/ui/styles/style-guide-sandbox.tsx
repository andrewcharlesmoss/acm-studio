"use client";

import { useMemo, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import {
  createUniversalStylePreset,
  resolveUniversalStyleValue,
  universalStylePresetToCssVariables,
  UNIVERSAL_STYLE_PRESET,
  type ButtonStyle,
  type FontFamily,
  type FontSizeValue,
  type LetterSpacingValue,
  type LineHeightValue,
  type ResponsiveValue,
  type StyleViewport,
  type UniversalStylePreset,
} from "@acm/styles";
import type { CSSProperties } from "react";
import { StudioUiLibrary } from "../studio-ui-library";
import "../style-guide.css";

type Panel = "palette" | "typography" | "buttons" | "layout";
type TypographyRole = keyof UniversalStylePreset["typography"];
type MetricName = "size" | "lineHeight" | "letterSpacing";
type Metric = FontSizeValue | LineHeightValue | LetterSpacingValue;
type ButtonRole = keyof UniversalStylePreset["buttons"];

const fontFamilies: { id: FontFamily; name: string }[] = [
  { id: "inter", name: "Inter" },
  { id: "system-sans", name: "System Sans" },
  { id: "georgia", name: "Georgia" },
];
const typographyRoles: { id: TypographyRole; label: string }[] = [
  { id: "body", label: "Body" }, { id: "h1", label: "H1" }, { id: "h2", label: "H2" },
  { id: "h3", label: "H3" }, { id: "h4", label: "H4" }, { id: "h5", label: "H5" },
  { id: "h6", label: "H6" }, { id: "button", label: "Buttons" },
  { id: "navigation", label: "Navigation" }, { id: "metadata", label: "Secondary metadata" },
];
const paletteRoles = [
  ["surface", "Surface"], ["surfaceRaised", "Raised surface"], ["surfaceSubtle", "Subtle surface"],
  ["textPrimary", "Primary text"], ["textSecondary", "Secondary text"], ["border", "Border"],
  ["accent", "Accent"], ["onAccent", "Text on accent"], ["success", "Success"],
  ["information", "Information"], ["alert", "Alert"], ["warning", "Warning"], ["rating", "Rating"],
] as const;
const metricDetails: { id: MetricName; label: string; units: readonly string[]; min: number; max: number; step: number }[] = [
  { id: "size", label: "Font size", units: ["rem", "em", "px"], min: 8, max: 96, step: 0.05 },
  { id: "lineHeight", label: "Line height", units: ["number", "em"], min: 0.8, max: 3, step: 0.05 },
  { id: "letterSpacing", label: "Letter spacing", units: ["em", "px"], min: -5, max: 20, step: 0.01 },
];
function metricBounds(name: MetricName, unit: string): [number, number] {
  if (name === "size") return unit === "px" ? [8, 96] : [0.5, 6];
  if (name === "letterSpacing") return unit === "px" ? [-5, 20] : [-0.5, 1];
  return [0.8, 3];
}
const buttonRoles: { id: ButtonRole; label: string }[] = [
  { id: "base", label: "Base" }, { id: "secondary", label: "Secondary" }, { id: "outline", label: "Outline" },
];
const viewportRoles: { id: StyleViewport; label: string }[] = [
  { id: "desktop", label: "Desktop" }, { id: "tablet", label: "Tablet" }, { id: "mobile", label: "Mobile" },
];

function baselineTypography(role: TypographyRole) { return UNIVERSAL_STYLE_PRESET.typography[role]; }
function copyPreset<T>(value: T): T { return structuredClone(value); }
function formatNumber(value: number) { return Number(value.toFixed(3)); }

export function StyleGuideSandbox() {
  const [preset, setPreset] = useState(() => createUniversalStylePreset());
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [panel, setPanel] = useState<Panel>("typography");
  const [role, setRole] = useState<TypographyRole>("body");
  const [fontQuery, setFontQuery] = useState("");
  const [buttonRole, setButtonRole] = useState<ButtonRole>("base");
  const variables = useMemo(() => universalStylePresetToCssVariables(preset, viewport) as CSSProperties, [preset, viewport]);

  function updateTypography(update: (current: UniversalStylePreset["typography"][TypographyRole]) => UniversalStylePreset["typography"][TypographyRole]) {
    setPreset(current => {
      const next = copyPreset(current);
      next.typography[role] = update(next.typography[role]);
      return next;
    });
  }

  function updateMetric(metricName: MetricName, update: (metric: Metric) => Metric) {
    updateTypography(current => {
      const responsive = current[metricName] as ResponsiveValue<Metric>;
      const resolved = resolveUniversalStyleValue(responsive, viewport).value;
      return { ...current, [metricName]: { ...responsive, [viewport]: update({ ...resolved }) } } as UniversalStylePreset["typography"][TypographyRole];
    });
  }

  function resetTypographyProperty(property: "family" | "weight" | "style" | "transform") {
    updateTypography(current => ({ ...current, [property]: baselineTypography(role)[property] }));
  }

  function resetMetric(metricName: MetricName) {
    updateTypography(current => {
      const responsive = { ...current[metricName] } as Record<string, Metric>;
      if (viewport === "desktop") responsive.desktop = { ...baselineTypography(role)[metricName].desktop };
      else delete responsive[viewport];
      return { ...current, [metricName]: responsive } as UniversalStylePreset["typography"][TypographyRole];
    });
  }

  function resetSection() {
    setPreset(current => {
      const next = copyPreset(current);
      if (panel === "palette") next.palette = copyPreset(UNIVERSAL_STYLE_PRESET.palette);
      if (panel === "typography") next.typography = copyPreset(UNIVERSAL_STYLE_PRESET.typography);
      if (panel === "buttons") next.buttons = copyPreset(UNIVERSAL_STYLE_PRESET.buttons);
      if (panel === "layout") next.layout = copyPreset(UNIVERSAL_STYLE_PRESET.layout);
      return next;
    });
  }

  function resetAll() {
    setPreset(createUniversalStylePreset());
    setViewport("desktop");
    setPanel("typography");
    setRole("body");
    setButtonRole("base");
    setFontQuery("");
  }

  function setPaletteColour(key: keyof UniversalStylePreset["palette"], value: string) {
    setPreset(current => ({ ...current, palette: { ...current.palette, [key]: value } }));
  }

  function updateButton(key: keyof ButtonStyle, value: string | number) {
    setPreset(current => ({ ...current, buttons: { ...current.buttons, [buttonRole]: { ...current.buttons[buttonRole], [key]: value } } }));
  }

  const activeTypography = preset.typography[role];
  const matchingFamilies = fontFamilies.filter(font => font.name.toLowerCase().includes(fontQuery.toLowerCase()));

  return <StudioUiLibrary section="styles">
    <section className="sg-page" aria-labelledby="sg-page-title">
      <header className="ui-page-intro sg-intro">
        <p className="rl-eyebrow">Universal ACM Foundation</p>
        <h1 id="sg-page-title">Style Guide</h1>
        <p>Explore the shared visual rules and see how they affect interface specimens.</p>
      </header>
      <div className="sg-toolbar">
        <div className="sg-viewports" role="group" aria-label="Preview size">
          {viewportRoles.map(item => <button type="button" key={item.id} aria-pressed={viewport === item.id} onClick={() => setViewport(item.id)}>{item.label}</button>)}
        </div>
        <div className="sg-toolbar-actions">
          <span className="sg-sandbox-note">Preview sandbox — changes are not saved or applied to projects.</span>
          <button type="button" className="sg-reset-all" onClick={resetAll}><AcmIcon name="action.reset" size={17} />Reset All</button>
        </div>
      </div>
      <div className="sg-workbench">
        <aside className="sg-settings" aria-label="Style settings">
          <h2>Settings</h2>
          <nav className="sg-setting-navigation" aria-label="Style categories">
            {([ ["palette", "Colours"], ["typography", "Typography"], ["buttons", "Buttons"], ["layout", "Layout"] ] as [Panel, string][]).map(([id, label]) => <button type="button" key={id} className={panel === id ? "is-selected" : ""} aria-current={panel === id ? "page" : undefined} onClick={() => setPanel(id)}>{label}</button>)}
          </nav>
          <div className="sg-setting-content">
            <div className="sg-setting-heading"><div><p className="rl-eyebrow">ACM UNIVERSAL STYLE</p><h3>{panel === "palette" ? "Colours" : panel === "typography" ? "Typography" : panel === "buttons" ? "Buttons" : "Layout"}</h3></div><button type="button" className="sg-reset-section" onClick={resetSection}>Reset section</button></div>
            {panel === "palette" ? <div className="sg-colour-settings">{paletteRoles.map(([key, label]) => <div key={key} className="sg-colour-setting"><span>{label}</span><input type="color" aria-label={label} value={preset.palette[key]} onChange={event => setPaletteColour(key, event.target.value)} /><code>{preset.palette[key]}</code><button type="button" aria-label={`Reset ${label} colour`} onClick={() => setPaletteColour(key, UNIVERSAL_STYLE_PRESET.palette[key])}>Reset</button></div>)}</div> : null}
            {panel === "typography" ? <>
              <div className="sg-role-list" role="group" aria-label="Typography role">
                {typographyRoles.map(item => <button type="button" key={item.id} aria-pressed={role === item.id} onClick={() => setRole(item.id)}>{item.label}</button>)}
              </div>
              <TypographyControls
                role={role}
                viewport={viewport}
                value={activeTypography}
                search={fontQuery}
                matchingFamilies={matchingFamilies}
                onSearch={setFontQuery}
                onChange={updateTypography}
                onMetricChange={updateMetric}
                onResetProperty={resetTypographyProperty}
                onResetMetric={resetMetric}
              />
            </> : null}
            {panel === "buttons" ? <>
              <div className="sg-role-list" role="group" aria-label="Button variant">{buttonRoles.map(item => <button type="button" key={item.id} aria-pressed={buttonRole === item.id} onClick={() => setButtonRole(item.id)}>{item.label}</button>)}</div>
              <div className="sg-button-settings">{([ ["background", "Background"], ["foreground", "Text"], ["border", "Border"], ["hoverBackground", "Hover background"], ["hoverForeground", "Hover text"] ] as [Exclude<keyof ButtonStyle, "borderWidth">, string][]).map(([key, label]) => <ColourControl key={key} label={label} value={preset.buttons[buttonRole][key]} onChange={value => updateButton(key, value)} onReset={() => updateButton(key, UNIVERSAL_STYLE_PRESET.buttons[buttonRole][key])} />)}<label className="sg-button-border-width">Border width (px)<input type="number" min={0} max={12} step={1} value={preset.buttons[buttonRole].borderWidth} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 12) updateButton("borderWidth", value); }} /></label></div>
            </> : null}
            {panel === "layout" ? <div className="sg-layout-settings">{([ ["spacing", "Spacing", 0, 120], ["contentWidth", "Content width", 320, 1800], ["radius", "Corner radius", 0, 80], ["borderWidth", "Border width", 0, 12] ] as const).map(([key, label, min, max]) => <div key={key} className="sg-layout-setting"><label htmlFor={`sg-layout-${key}`}>{label}</label><div><input id={`sg-layout-${key}`} type="number" min={min} max={max} step={1} value={preset.layout[key]} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) setPreset(current => ({ ...current, layout: { ...current.layout, [key]: number } })); }} /><span>px</span><button type="button" aria-label={`Reset ${label}`} onClick={() => setPreset(current => ({ ...current, layout: { ...current.layout, [key]: UNIVERSAL_STYLE_PRESET.layout[key] } }))}>Reset</button></div></div>)}</div> : null}
          </div>
        </aside>
        <section className="sg-preview-panel" aria-label="Live style preview">
          <div className="sg-preview-heading"><div><p className="rl-eyebrow">LIVE PREVIEW</p><h2>Style specimens</h2></div><span>{viewportRoles.find(item => item.id === viewport)?.label} preview</span></div>
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- This labelled preview region needs focus so keyboard users can scroll contained overflow. */}
          <div className="sg-preview-frame" role="region" tabIndex={0} aria-label="Scrollable style specimen preview" data-viewport={viewport}>
            <div className="sg-preview acm-universal-style-preset" style={variables}>
              <header className="sg-site-identity"><div className="sg-site-icon" aria-hidden="true">AM</div><div><strong>ACM Studio</strong><span>Universal style specimen</span></div><nav className="acm-navigation" aria-label="Example site navigation"><a href="#specimens">Home</a><a href="#colours">About</a><a href="#buttons">Contact</a></nav></header>
              <section id="buttons" className="sg-example-section sg-button-specimens"><h2>Buttons</h2><div>
                <button type="button" className="acm-button">Base button</button>
                <button type="button" className="acm-button acm-button-secondary">Secondary button</button>
                <button type="button" className="acm-button acm-button-outline">Outline button</button>
              </div></section>
              <section id="colours" className="sg-example-section"><h2>Semantic colours</h2><div className="sg-palette-grid">{paletteRoles.map(([key, label]) => <div className="sg-swatch" key={key}><span style={{ background: `var(--acm-color-${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)})` }} /><strong>{label}</strong><code>{preset.palette[key]}</code></div>)}</div></section>
              <section id="specimens" className="sg-example-section sg-type-specimens"><h2>Typography</h2><div className="sg-type-samples"><h1>H1 heading specimen</h1><h2>H2 heading specimen</h2><h3>H3 heading specimen</h3><h4>H4 heading specimen</h4><h5>H5 heading specimen</h5><h6>H6 heading specimen</h6><p>This is body text, shown at the selected scale and line height. Clear typography creates a comfortable reading rhythm across pages and interface surfaces.</p><p>Supporting text can include a <a href="#buttons">text link</a> that stays recognisable and accessible.</p><div className="sg-list-specimens"><div><h3>Unordered list</h3><ul><li>First list item</li><li>Second list item</li><li>Third list item</li></ul></div><div><h3>Ordered list</h3><ol><li>First step</li><li>Second step</li><li>Third step</li></ol></div></div><blockquote><p>Good typography is invisible. Bad typography is everywhere.</p><cite>Anonymous</cite></blockquote></div></section>
            </div>
          </div>
        </section>
      </div>
    </section>
  </StudioUiLibrary>;
}

function ColourControl({ label, value, onChange, onReset }: { label: string; value: string; onChange: (value: string) => void; onReset: () => void }) {
  return <div className="sg-colour-setting"><span>{label}</span><input type="color" aria-label={label} value={value} onChange={event => onChange(event.target.value)} /><code>{value}</code><button type="button" aria-label={`Reset ${label} colour`} onClick={onReset}>Reset</button></div>;
}

function TypographyControls({ role, viewport, value, search, matchingFamilies, onSearch, onChange, onMetricChange, onResetProperty, onResetMetric }: {
  role: TypographyRole; viewport: StyleViewport; value: UniversalStylePreset["typography"][TypographyRole]; search: string;
  matchingFamilies: { id: FontFamily; name: string }[]; onSearch: (value: string) => void;
  onChange: (update: (current: UniversalStylePreset["typography"][TypographyRole]) => UniversalStylePreset["typography"][TypographyRole]) => void;
  onMetricChange: (name: MetricName, update: (value: Metric) => Metric) => void;
  onResetProperty: (property: "family" | "weight" | "style" | "transform") => void;
  onResetMetric: (name: MetricName) => void;
}) {
  const [tab, setTab] = useState<"font" | "style" | "size">("font");
  const roleName = typographyRoles.find(item => item.id === role)?.label ?? role;
  const resolved = (name: MetricName) => resolveUniversalStyleValue(value[name] as ResponsiveValue<Metric>, viewport);
  return <div className="sg-typography-editor">
    <div className="sg-editor-tabs" role="group" aria-label={`${roleName} settings`}>
      {([ ["font", "Font"], ["style", "Style"], ["size", "Size"] ] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === "font" ? <section className="sg-editor-panel"><label>Search fonts<input type="search" value={search} placeholder="Search curated fonts" onChange={event => onSearch(event.target.value)} /></label><div className="sg-font-picker" role="group" aria-label="Curated font family">{matchingFamilies.map(font => <button type="button" key={font.id} aria-pressed={value.family === font.id} onClick={() => onChange(current => ({ ...current, family: font.id }))}>{font.name}</button>)}{!matchingFamilies.length ? <p>No curated fonts match.</p> : null}</div><button type="button" className="sg-inline-reset" onClick={() => onResetProperty("family")}>Reset font family</button><p>Inter upright and italic are bundled; System Sans and Georgia use local system fonts.</p></section> : null}
    {tab === "style" ? <section className="sg-editor-panel"><label>Weight<select value={value.weight} onChange={event => onChange(current => ({ ...current, weight: Number(event.target.value) }))}>{Array.from({ length: 9 }, (_, index) => (index + 1) * 100).map(weight => <option value={weight} key={weight}>{weight}{weight === 400 ? " · Regular" : weight === 700 ? " · Bold" : ""}</option>)}</select></label><button type="button" className="sg-italic-toggle" aria-pressed={value.style === "italic"} onClick={() => onChange(current => ({ ...current, style: current.style === "italic" ? "normal" : "italic" }))}>Italic</button><label>Text transform<select value={value.transform} onChange={event => onChange(current => ({ ...current, transform: event.target.value as typeof current.transform }))}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></label><button type="button" className="sg-inline-reset" onClick={() => { onResetProperty("weight"); onResetProperty("style"); onResetProperty("transform"); }}>Reset style</button></section> : null}
    {tab === "size" ? <section className="sg-editor-panel sg-metric-panel">{metricDetails.map(detail => {
      const item = resolved(detail.id);
      const unitOptions = detail.units;
      const [min, max] = metricBounds(detail.id, item.value.unit);
      return <div className="sg-metric-control" key={detail.id}>
        <div className="sg-metric-title"><strong>{detail.label}</strong><button type="button" aria-label={`Reset ${roleName} ${detail.label.toLowerCase()}`} onClick={() => onResetMetric(detail.id)}>Reset</button></div>
        <div className="sg-metric-inputs"><input aria-label={`${roleName} ${detail.label} value for ${viewport}`} type="number" min={min} max={max} step={detail.step} value={item.value.value} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) onMetricChange(detail.id, current => ({ ...current, value: formatNumber(number) }) as Metric); }} /><select aria-label={`${roleName} ${detail.label} unit`} value={item.value.unit} onChange={event => onMetricChange(detail.id, current => { const oldUnit = current.unit; const nextUnit = event.target.value; const relativeUnits = detail.id !== "lineHeight"; const factor = relativeUnits && oldUnit !== nextUnit ? oldUnit === "px" ? 1 / 16 : nextUnit === "px" ? 16 : 1 : 1; return { ...current, value: formatNumber(current.value * factor), unit: nextUnit } as Metric; })}>{unitOptions.map(unit => <option value={unit} key={unit}>{unit === "number" ? "unitless" : unit}</option>)}</select></div>
        <p className="sg-inheritance">{item.inherited ? `Inherited from ${item.inheritedFrom}` : `Set for ${viewport}`}</p>
      </div>;
    })}</section> : null}
  </div>;
}
