"use client";

import { forwardRef, useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent, type UIEvent } from "react";
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
import styleGuideSource from "./style-guide-source.json";
import "../style-guide.css";

type Panel = "palette" | "typography" | "buttons" | "layout";
type TypographyRole = keyof UniversalStylePreset["typography"];
type MetricName = "size" | "lineHeight" | "letterSpacing";
type Metric = FontSizeValue | LineHeightValue | LetterSpacingValue;
type ButtonRole = keyof UniversalStylePreset["buttons"];
type MobilePanel = "settings" | "preview" | "guide";
type GuideSourceMapping = { line: number; excerpt: string; heading: string; rowPath: string };
type GuideView = "formatted" | "markdown";

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
function pathValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined, source);
}
function displayStyleValue(value: unknown, viewport: StyleViewport): string {
  if (value && typeof value === "object" && "desktop" in value) {
    const responsive = value as ResponsiveValue<Metric>;
    const resolved = resolveUniversalStyleValue(responsive, viewport);
    const metric = resolved.value;
    const unit = metric.unit === "number" ? "" : metric.unit;
    return `${metric.value}${unit}${resolved.inherited ? ` (inherited from ${resolved.inheritedFrom})` : ""}`;
  }
  if (value === "inter") return "Inter";
  if (value === "system-sans") return "System Sans";
  if (value === "georgia") return "Georgia";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return value === undefined ? "Documented guidance" : JSON.stringify(value);
}

function previewPathForStylePath(path: string | null): string | null {
  if (!path) return null;
  const segments = path.split(".");
  if (segments[0] === "typography" && segments.length >= 2) return `typography.${segments[1]}.size`;
  if (segments[0] === "buttons" && segments.length >= 2) return `buttons.${segments[1]}.background`;
  if (segments[0] === "layout") return null;
  return path;
}

export function StyleGuideSandbox() {
  const [preset, setPreset] = useState(() => createUniversalStylePreset());
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [panel, setPanel] = useState<Panel>("typography");
  const [role, setRole] = useState<TypographyRole>("body");
  const [fontQuery, setFontQuery] = useState("");
  const [buttonRole, setButtonRole] = useState<ButtonRole>("base");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("settings");
  const [hoveredSourcePath, setHoveredSourcePath] = useState<string | null>(null);
  const [focusedSourcePath, setFocusedSourcePath] = useState<string | null>(null);
  const [pinnedSourcePath, setPinnedSourcePath] = useState<string | null>(null);
  const [guideQuery, setGuideQuery] = useState("");
  const [guideView, setGuideView] = useState<GuideView>("formatted");
  const [guideMatchIndex, setGuideMatchIndex] = useState(0);
  const [guideJumpLine, setGuideJumpLine] = useState<number | null>(null);
  const guideSourceRef = useRef<HTMLDivElement>(null);
  const hasSourceInteraction = useRef(false);
  const guideScrollSyncSuspended = useRef(false);
  const variables = useMemo(() => universalStylePresetToCssVariables(preset, viewport) as CSSProperties, [preset, viewport]);
  const guideLines = useMemo(() => styleGuideSource.document.split("\n"), []);
  const guideMatches = useMemo(() => guideQuery.trim() ? guideLines.flatMap((line, index) => line.toLowerCase().includes(guideQuery.toLowerCase()) ? [index + 1] : []) : [], [guideLines, guideQuery]);
  const styleMappings = styleGuideSource.mappings as Record<string, GuideSourceMapping>;
  const guidePathByLine = Object.fromEntries(Object.entries(styleMappings)
    .filter(([path, mapping]) => path === mapping.rowPath)
    .map(([path, mapping]) => [mapping.line, path])) as Record<number, string>;
  const selectedPreviewPath = previewPathForStylePath(pinnedSourcePath);
  const activeSourcePath = pinnedSourcePath ?? hoveredSourcePath ?? focusedSourcePath ?? `typography.${role}.size`;
  const activeSource = styleMappings[activeSourcePath] ?? styleMappings["typography.body.size"];
  const activeBaseline = activeSourcePath.startsWith("specimen.") ? "Guidance only — no @acm/styles token" : displayStyleValue(pathValue(UNIVERSAL_STYLE_PRESET, activeSourcePath), viewport);
  const activeValue = activeSourcePath.startsWith("specimen.") ? "Documented specimen guidance" : displayStyleValue(pathValue(preset, activeSourcePath), viewport);
  const activeGuideLine = guideJumpLine ?? activeSource?.line ?? 1;
  const buttonPathParts = activeSourcePath.split(".");
  const relatedButtonValues = activeSourcePath.startsWith("buttons.") ? (["background", "foreground", "border", "borderWidth", "hoverBackground", "hoverForeground"] as const).map(property => {
    const propertyPath = `${buttonPathParts[0]}.${buttonPathParts[1]}.${property}`;
    return { path: propertyPath, current: displayStyleValue(pathValue(preset, propertyPath), viewport), baseline: displayStyleValue(pathValue(UNIVERSAL_STYLE_PRESET, propertyPath), viewport) };
  }) : [];

  useEffect(() => {
    if (!hasSourceInteraction.current) return;
    const guides = guideSourceRef.current?.querySelectorAll<HTMLElement>(".sg-guide-document");
    if (!guides?.length) return;
    guideScrollSyncSuspended.current = true;
    const activeGuide = Array.from(guides).find(guide => !guide.classList.contains("is-inactive"));
    const resumeSync = () => { guideScrollSyncSuspended.current = false; };
    activeGuide?.addEventListener("scrollend", resumeSync, { once: true });
    const syncTimeout = window.setTimeout(resumeSync, 800);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    guides?.forEach(guide => {
      const viewPrefix = guide.classList.contains("sg-guide-markdown") ? "sg-guide-markdown" : "sg-guide-formatted";
      const line = guide.querySelector<HTMLElement>(`#${viewPrefix}-line-${activeGuideLine}`);
      if (!line) return;
      const guideRect = guide.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const top = guide.scrollTop + lineRect.top - guideRect.top - (guide.clientHeight - lineRect.height) / 2;
      guide.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => {
      window.clearTimeout(syncTimeout);
      activeGuide?.removeEventListener("scrollend", resumeSync);
      guideScrollSyncSuspended.current = false;
    };
  }, [activeGuideLine]);

  function sourcePathFromTarget(target: EventTarget | null): string | null {
    return target instanceof Element ? target.closest<HTMLElement>("[data-style-path]")?.dataset.stylePath ?? null : null;
  }

  function handleSourcePointer(event: PointerEvent<HTMLDivElement>) {
    const path = sourcePathFromTarget(event.target);
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      setHoveredSourcePath(path);
      setGuideJumpLine(null);
    }
  }

  function handleSourceFocus(event: FocusEvent<HTMLDivElement>) {
    const path = sourcePathFromTarget(event.target);
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      setFocusedSourcePath(path);
      setGuideJumpLine(null);
    }
  }

  function pinSource(event: MouseEvent<HTMLDivElement>) {
    const path = sourcePathFromTarget(event.target);
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      setPinnedSourcePath(path);
      setGuideJumpLine(null);
    }
  }

  function selectGuideSource(path: string) {
    const parts = path.split(".");
    let selectedPath = path;
    if (parts[0] === "typography" && parts.length === 2) {
      setPanel("typography");
      setRole(parts[1] as TypographyRole);
      selectedPath = `${path}.size`;
    } else if (parts[0] === "buttons" && parts.length === 2) {
      setPanel("buttons");
      setButtonRole(parts[1] as ButtonRole);
      selectedPath = `${path}.background`;
    } else if (parts[0] === "palette") setPanel("palette");
    else if (parts[0] === "layout") setPanel("layout");
    if (!styleMappings[selectedPath]) return;
    hasSourceInteraction.current = true;
    setHoveredSourcePath(null);
    setFocusedSourcePath(null);
    setPinnedSourcePath(selectedPath);
    setGuideJumpLine(null);
  }

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
    setMobilePanel("settings");
    setHoveredSourcePath(null);
    setFocusedSourcePath(null);
    setPinnedSourcePath(null);
    setGuideQuery("");
    setGuideView("formatted");
    setGuideMatchIndex(0);
    setGuideJumpLine(null);
    hasSourceInteraction.current = false;
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
        <p>Compare the universal rules, their source in the written guide and a live specimen.</p>
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
      <div
        className="sg-workbench"
        data-mobile-panel={mobilePanel}
        onPointerOverCapture={handleSourcePointer}
        onPointerLeave={() => setHoveredSourcePath(null)}
        onFocusCapture={handleSourceFocus}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedSourcePath(null); }}
        onClickCapture={pinSource}
      >
        <nav className="sg-workbench-switcher" aria-label="Style guide workspace panels" role="group">
          {([ ["settings", "Settings"], ["preview", "Preview"], ["guide", "Written guide"] ] as [MobilePanel, string][]).map(([id, label]) => <button type="button" key={id} aria-pressed={mobilePanel === id} onClick={() => setMobilePanel(id)}>{label}</button>)}
        </nav>
        <aside className="sg-settings" aria-label="Style settings">
          <h2>Settings</h2>
          <nav className="sg-setting-navigation" aria-label="Style categories">
            {([ ["palette", "Colours"], ["typography", "Typography"], ["buttons", "Buttons"], ["layout", "Layout"] ] as [Panel, string][]).map(([id, label]) => <button type="button" key={id} className={panel === id ? "is-selected" : ""} aria-current={panel === id ? "page" : undefined} onClick={() => setPanel(id)}>{label}</button>)}
          </nav>
          <div className="sg-setting-content">
            <div className="sg-setting-heading"><div><p className="rl-eyebrow">ACM UNIVERSAL STYLE</p><h3>{panel === "palette" ? "Colours" : panel === "typography" ? "Typography" : panel === "buttons" ? "Buttons" : "Layout"}</h3></div><button type="button" className="sg-reset-section" onClick={resetSection}>Reset section</button></div>
            {panel === "palette" ? <div className="sg-colour-settings">{paletteRoles.map(([key, label]) => <div key={key} className="sg-colour-setting"><span>{label}</span><input data-style-path={`palette.${key}`} type="color" aria-label={label} value={preset.palette[key]} onChange={event => setPaletteColour(key, event.target.value)} /><code>{preset.palette[key]}</code><button data-style-path={`palette.${key}`} type="button" aria-label={`Reset ${label} colour`} onClick={() => setPaletteColour(key, UNIVERSAL_STYLE_PRESET.palette[key])}>Reset</button></div>)}</div> : null}
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
              <div className="sg-role-list" role="group" aria-label="Button variant">{buttonRoles.map(item => <button data-style-path={`buttons.${item.id}.background`} type="button" key={item.id} aria-pressed={buttonRole === item.id} onClick={() => setButtonRole(item.id)}>{item.label}</button>)}</div>
              <div className="sg-button-settings">{([ ["background", "Background"], ["foreground", "Text"], ["border", "Border"], ["hoverBackground", "Hover background"], ["hoverForeground", "Hover text"] ] as [Exclude<keyof ButtonStyle, "borderWidth">, string][]).map(([key, label]) => <ColourControl key={key} stylePath={`buttons.${buttonRole}.${key}`} label={label} value={preset.buttons[buttonRole][key]} onChange={value => updateButton(key, value)} onReset={() => updateButton(key, UNIVERSAL_STYLE_PRESET.buttons[buttonRole][key])} />)}<label className="sg-button-border-width">Border width (px)<input data-style-path={`buttons.${buttonRole}.borderWidth`} type="number" min={0} max={12} step={1} value={preset.buttons[buttonRole].borderWidth} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 12) updateButton("borderWidth", value); }} /></label></div>
            </> : null}
            {panel === "layout" ? <div className="sg-layout-settings">{([ ["spacing", "Spacing", 0, 120], ["contentWidth", "Content width", 320, 1800], ["radius", "Corner radius", 0, 80], ["borderWidth", "Border width", 0, 12] ] as const).map(([key, label, min, max]) => <div key={key} className="sg-layout-setting"><label htmlFor={`sg-layout-${key}`}>{label}</label><div><input data-style-path={`layout.${key}`} id={`sg-layout-${key}`} type="number" min={min} max={max} step={1} value={preset.layout[key]} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) setPreset(current => ({ ...current, layout: { ...current.layout, [key]: number } })); }} /><span>px</span><button data-style-path={`layout.${key}`} type="button" aria-label={`Reset ${label}`} onClick={() => setPreset(current => ({ ...current, layout: { ...current.layout, [key]: UNIVERSAL_STYLE_PRESET.layout[key] } }))}>Reset</button></div></div>)}</div> : null}
          </div>
        </aside>
        <section className="sg-preview-panel" aria-label="Live style preview">
          <div className="sg-preview-heading"><div><p className="rl-eyebrow">LIVE PREVIEW</p><h2>Style specimens</h2></div><span>{viewportRoles.find(item => item.id === viewport)?.label} preview</span></div>
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- This labelled preview region needs focus so keyboard users can scroll contained overflow. */}
          <div className="sg-preview-frame" role="region" tabIndex={0} aria-label="Scrollable style specimen preview" data-viewport={viewport}>
            <div className="sg-preview acm-universal-style-preset" style={variables} data-source-selected={pinnedSourcePath?.startsWith("layout.") ? "true" : undefined}>
              <header className="sg-site-identity"><div className="sg-site-icon" aria-hidden="true">AM</div><div><strong>ACM Studio</strong><span data-style-path="typography.metadata.size" data-source-selected={selectedPreviewPath === "typography.metadata.size" ? "true" : undefined}>Universal style specimen</span></div><nav className="acm-navigation" data-style-path="typography.navigation.size" data-source-selected={selectedPreviewPath === "typography.navigation.size" ? "true" : undefined} aria-label="Example site navigation"><a href="#specimens">Home</a><a href="#colours">About</a><a href="#buttons">Contact</a></nav></header>
              <section id="buttons" className="sg-example-section sg-button-specimens"><h2>Buttons</h2><div>
                <button data-style-path="buttons.base.background" data-source-selected={selectedPreviewPath === "buttons.base.background" ? "true" : undefined} type="button" className="acm-button"><span data-style-path="typography.button.size" data-source-selected={selectedPreviewPath === "typography.button.size" ? "true" : undefined}>Base button</span></button>
                <button data-style-path="buttons.secondary.background" data-source-selected={selectedPreviewPath === "buttons.secondary.background" ? "true" : undefined} type="button" className="acm-button acm-button-secondary">Secondary button</button>
                <button data-style-path="buttons.outline.background" data-source-selected={selectedPreviewPath === "buttons.outline.background" ? "true" : undefined} type="button" className="acm-button acm-button-outline">Outline button</button>
              </div></section>
              <section id="colours" className="sg-example-section"><h2>Semantic colours</h2><div className="sg-palette-grid">{paletteRoles.map(([key, label]) => <button data-style-path={`palette.${key}`} data-source-selected={selectedPreviewPath === `palette.${key}` ? "true" : undefined} type="button" aria-label={`Inspect ${label} colour source, ${preset.palette[key]}`} className="sg-swatch" key={key}><span style={{ background: `var(--acm-color-${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)})` }} /><strong>{label}</strong><code>{preset.palette[key]}</code></button>)}</div></section>
              <section id="specimens" className="sg-example-section sg-type-specimens"><h2>Typography</h2><div className="sg-type-samples"><h1 tabIndex={0} data-style-path="typography.h1.size" data-source-selected={selectedPreviewPath === "typography.h1.size" ? "true" : undefined}>H1 heading specimen</h1><h2 tabIndex={0} data-style-path="typography.h2.size" data-source-selected={selectedPreviewPath === "typography.h2.size" ? "true" : undefined}>H2 heading specimen</h2><h3 tabIndex={0} data-style-path="typography.h3.size" data-source-selected={selectedPreviewPath === "typography.h3.size" ? "true" : undefined}>H3 heading specimen</h3><h4 tabIndex={0} data-style-path="typography.h4.size" data-source-selected={selectedPreviewPath === "typography.h4.size" ? "true" : undefined}>H4 heading specimen</h4><h5 tabIndex={0} data-style-path="typography.h5.size" data-source-selected={selectedPreviewPath === "typography.h5.size" ? "true" : undefined}>H5 heading specimen</h5><h6 tabIndex={0} data-style-path="typography.h6.size" data-source-selected={selectedPreviewPath === "typography.h6.size" ? "true" : undefined}>H6 heading specimen</h6><p tabIndex={0} data-style-path="typography.body.size" data-source-selected={selectedPreviewPath === "typography.body.size" ? "true" : undefined}>This is body text, shown at the selected scale and line height. Clear typography creates a comfortable reading rhythm across pages and interface surfaces.</p><p>Supporting text can include a <a data-style-path="specimen.link" data-source-selected={selectedPreviewPath === "specimen.link" ? "true" : undefined} href="#buttons">text link</a> that stays recognisable and accessible.</p><div className="sg-list-specimens"><div><h3>Unordered list</h3><ul tabIndex={0} data-style-path="specimen.unordered-list" data-source-selected={selectedPreviewPath === "specimen.unordered-list" ? "true" : undefined}><li>First list item</li><li>Second list item</li><li>Third list item</li></ul></div><div><h3>Ordered list</h3><ol tabIndex={0} data-style-path="specimen.ordered-list" data-source-selected={selectedPreviewPath === "specimen.ordered-list" ? "true" : undefined}><li>First step</li><li>Second step</li><li>Third step</li></ol></div></div><blockquote tabIndex={0} data-style-path="specimen.quote" data-source-selected={selectedPreviewPath === "specimen.quote" ? "true" : undefined}><p>Good typography is invisible. Bad typography is everywhere.</p><cite>Anonymous</cite></blockquote></div></section>
            </div>
          </div>
        </section>
        <GuideSourcePanel
          ref={guideSourceRef}
          activePath={activeSourcePath}
          mapping={activeSource}
          currentValue={activeValue}
          baselineValue={activeBaseline}
          relatedButtonValues={relatedButtonValues}
          lines={guideLines}
          view={guideView}
          onViewChange={view => { hasSourceInteraction.current = true; setGuideView(view); }}
          sourceRevision={styleGuideSource.sourceRevision}
          query={guideQuery}
          matchCount={guideMatches.length}
          matchIndex={guideMatchIndex}
          activeLine={activeGuideLine}
          pinned={pinnedSourcePath !== null}
          guidePathByLine={guidePathByLine}
          onSelectSource={selectGuideSource}
          guideScrollSyncSuspendedRef={guideScrollSyncSuspended}
          onQueryChange={value => { setGuideQuery(value); setGuideMatchIndex(0); setGuideJumpLine(null); }}
          onMatchChange={direction => {
            if (!guideMatches.length) return;
            hasSourceInteraction.current = true;
            const nextIndex = (guideMatchIndex + direction + guideMatches.length) % guideMatches.length;
            setGuideMatchIndex(nextIndex);
            setGuideJumpLine(guideMatches[nextIndex]);
          }}
          onClearPin={() => setPinnedSourcePath(null)}
        />
      </div>
    </section>
  </StudioUiLibrary>;
}

function ColourControl({ stylePath, label, value, onChange, onReset }: { stylePath: string; label: string; value: string; onChange: (value: string) => void; onReset: () => void }) {
  return <div className="sg-colour-setting"><span>{label}</span><input data-style-path={stylePath} type="color" aria-label={label} value={value} onChange={event => onChange(event.target.value)} /><code>{value}</code><button data-style-path={stylePath} type="button" aria-label={`Reset ${label} colour`} onClick={onReset}>Reset</button></div>;
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
    {tab === "font" ? <section className="sg-editor-panel"><label>Search fonts<input data-style-path={`typography.${role}.family`} type="search" value={search} placeholder="Search curated fonts" onChange={event => onSearch(event.target.value)} /></label><div className="sg-font-picker" role="group" aria-label="Curated font family">{matchingFamilies.map(font => <button data-style-path={`typography.${role}.family`} type="button" key={font.id} aria-pressed={value.family === font.id} onClick={() => onChange(current => ({ ...current, family: font.id }))}>{font.name}</button>)}{!matchingFamilies.length ? <p>No curated fonts match.</p> : null}</div><button data-style-path={`typography.${role}.family`} type="button" className="sg-inline-reset" onClick={() => onResetProperty("family")}>Reset font family</button><p>Inter upright and italic are bundled; System Sans and Georgia use local system fonts.</p></section> : null}
    {tab === "style" ? <section className="sg-editor-panel"><label>Weight<select data-style-path={`typography.${role}.weight`} value={value.weight} onChange={event => onChange(current => ({ ...current, weight: Number(event.target.value) }))}>{Array.from({ length: 9 }, (_, index) => (index + 1) * 100).map(weight => <option value={weight} key={weight}>{weight}{weight === 400 ? " · Regular" : weight === 700 ? " · Bold" : ""}</option>)}</select></label><button data-style-path={`typography.${role}.style`} type="button" className="sg-italic-toggle" aria-pressed={value.style === "italic"} onClick={() => onChange(current => ({ ...current, style: current.style === "italic" ? "normal" : "italic" }))}>Italic</button><label>Text transform<select data-style-path={`typography.${role}.transform`} value={value.transform} onChange={event => onChange(current => ({ ...current, transform: event.target.value as typeof current.transform }))}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></label><button data-style-path={`typography.${role}.weight`} type="button" className="sg-inline-reset" onClick={() => { onResetProperty("weight"); onResetProperty("style"); onResetProperty("transform"); }}>Reset style</button></section> : null}
    {tab === "size" ? <section className="sg-editor-panel sg-metric-panel">{metricDetails.map(detail => {
      const item = resolved(detail.id);
      const unitOptions = detail.units;
      const [min, max] = metricBounds(detail.id, item.value.unit);
      return <div className="sg-metric-control" key={detail.id}>
        <div className="sg-metric-title"><strong>{detail.label}</strong><button data-style-path={`typography.${role}.${detail.id}`} type="button" aria-label={`Reset ${roleName} ${detail.label.toLowerCase()}`} onClick={() => onResetMetric(detail.id)}>Reset</button></div>
        <div className="sg-metric-inputs"><input data-style-path={`typography.${role}.${detail.id}`} aria-label={`${roleName} ${detail.label} value for ${viewport}`} type="number" min={min} max={max} step={detail.step} value={item.value.value} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) onMetricChange(detail.id, current => ({ ...current, value: formatNumber(number) }) as Metric); }} /><select data-style-path={`typography.${role}.${detail.id}`} aria-label={`${roleName} ${detail.label} unit`} value={item.value.unit} onChange={event => onMetricChange(detail.id, current => { const oldUnit = current.unit; const nextUnit = event.target.value; const relativeUnits = detail.id !== "lineHeight"; const factor = relativeUnits && oldUnit !== nextUnit ? oldUnit === "px" ? 1 / 16 : nextUnit === "px" ? 16 : 1 : 1; return { ...current, value: formatNumber(current.value * factor), unit: nextUnit } as Metric; })}>{unitOptions.map(unit => <option value={unit} key={unit}>{unit === "number" ? "unitless" : unit}</option>)}</select></div>
        <p className="sg-inheritance">{item.inherited ? `Inherited from ${item.inheritedFrom}` : `Set for ${viewport}`}</p>
      </div>;
    })}</section> : null}
  </div>;
}

type GuideSourcePanelProps = {
  activePath: string;
  mapping: GuideSourceMapping;
  currentValue: string;
  baselineValue: string;
  relatedButtonValues: { path: string; current: string; baseline: string }[];
  lines: string[];
  view: GuideView;
  onViewChange: (view: GuideView) => void;
  sourceRevision: string;
  query: string;
  matchCount: number;
  matchIndex: number;
  activeLine: number;
  pinned: boolean;
  guidePathByLine: Record<number, string>;
  onSelectSource: (path: string) => void;
  guideScrollSyncSuspendedRef: { current: boolean };
  onQueryChange: (value: string) => void;
  onMatchChange: (direction: number) => void;
  onClearPin: () => void;
};

const GuideSourcePanel = forwardRef<HTMLDivElement, GuideSourcePanelProps>(function GuideSourcePanel({
  activePath, mapping, currentValue, baselineValue, relatedButtonValues, lines, view, onViewChange, sourceRevision, query, matchCount,
  matchIndex, activeLine, pinned, guidePathByLine, onSelectSource, guideScrollSyncSuspendedRef, onQueryChange, onMatchChange, onClearPin,
}, ref) {
  const formattedGuideRef = useRef<HTMLDivElement>(null);
  const markdownGuideRef = useRef<HTMLDivElement>(null);

  function resumeScrollSync() {
    guideScrollSyncSuspendedRef.current = false;
  }

  function syncGuideScroll(event: UIEvent<HTMLDivElement>) {
    const source = event.currentTarget;
    const sourceIsActive = source.classList.contains("sg-guide-markdown") ? view === "markdown" : view === "formatted";
    if (!sourceIsActive || guideScrollSyncSuspendedRef.current) return;

    const target = source.classList.contains("sg-guide-markdown") ? formattedGuideRef.current : markdownGuideRef.current;
    if (!target) return;
    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    if (sourceRange <= 0 || targetRange <= 0) return;
    const nextTop = (source.scrollTop / sourceRange) * targetRange;
    if (Math.abs(target.scrollTop - nextTop) > 3) target.scrollTop = nextTop;
  }

  function sourcePathFromTarget(target: EventTarget | null): string | null {
    return target instanceof Element ? target.closest<HTMLElement>("[data-guide-style-path]")?.dataset.guideStylePath ?? null : null;
  }

  function selectSourceFromPointer(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return;
    const path = sourcePathFromTarget(event.target);
    if (path) onSelectSource(path);
  }

  return <aside className="sg-guide-panel" aria-label="Written Style Guide" ref={ref}>
    <div className="sg-guide-heading">
      <div><p className="rl-eyebrow">CANONICAL SOURCE</p><h2>Written Style Guide</h2></div>
      <span title={sourceRevision}>Revision {sourceRevision.slice(0, 7)}</span>
    </div>
    <section className="sg-source-detail" aria-label="Selected style source">
      <div className="sg-source-detail-heading"><div><p className="rl-eyebrow">{mapping.heading}</p><h3>{activePath}</h3></div>{pinned ? <button type="button" onClick={onClearPin}>Clear selection</button> : <span>Hover or focus a style</span>}</div>
      <dl>
        <div><dt>Universal baseline</dt><dd>{baselineValue}</dd></div>
        <div><dt>Preview value</dt><dd>{currentValue}</dd></div>
        <div><dt>Guide location</dt><dd>Line {mapping.line}</dd></div>
      </dl>
      {relatedButtonValues.length ? <details className="sg-related-values"><summary>All {buttonPathPartsLabel(activePath)} button properties</summary><dl>{relatedButtonValues.map(item => <div key={item.path}><dt>{item.path.split(".").at(-1)}</dt><dd>{item.current}<span>Baseline {item.baseline}</span></dd></div>)}</dl></details> : null}
      <p className="sg-source-help">Hover or focus a preview item to inspect its rule. Click a mapped guide line, or focus its selection button and press Enter or Space, to select the matching preview item.</p>
      <blockquote><code>{mapping.excerpt}</code></blockquote>
      {activePath.startsWith("specimen.") ? <p className="sg-source-note">This is written guidance for the example. It is not a token in the executable preset.</p> : null}
    </section>
    <div className="sg-guide-search">
      <label htmlFor="sg-guide-search-input">Search the full guide</label>
      <input id="sg-guide-search-input" type="search" value={query} placeholder="Search guide text" onChange={event => onQueryChange(event.target.value)} />
      <div><span aria-live="polite">{matchCount ? `${matchIndex + 1} of ${matchCount} matches` : query ? "No matches" : `${lines.length} lines`}</span><div><button type="button" disabled={!matchCount} aria-label="Previous matching guide line" onClick={() => onMatchChange(-1)}>Previous</button><button type="button" disabled={!matchCount} aria-label="Next matching guide line" onClick={() => onMatchChange(1)}>Next</button></div></div>
    </div>
    <div className="sg-guide-view-switch" role="group" aria-label="Written guide format">
      <button type="button" aria-pressed={view === "formatted"} onClick={() => onViewChange("formatted")}>Formatted</button>
      <button type="button" aria-pressed={view === "markdown"} onClick={() => onViewChange("markdown")}>Markdown source</button>
    </div>
    <div
      className="sg-guide-views"
      onWheelCapture={resumeScrollSync}
      onTouchStartCapture={resumeScrollSync}
      onPointerDownCapture={resumeScrollSync}
      onKeyDownCapture={resumeScrollSync}
      onClickCapture={selectSourceFromPointer}
    >
      <FormattedGuideDocument
        ref={formattedGuideRef}
        lines={lines}
        query={query}
        activeLine={activeLine}
        active={view === "formatted"}
        onScroll={syncGuideScroll}
        guidePathByLine={guidePathByLine}
        onSelectSource={onSelectSource}
      />
      <div
        ref={markdownGuideRef}
        className={`sg-guide-document sg-guide-markdown${view === "markdown" ? "" : " is-inactive"}`}
        role="region"
        tabIndex={view === "markdown" ? 0 : -1}
        aria-hidden={view !== "markdown"}
        aria-label="Full Style Guide Markdown source with line numbers"
        onScroll={syncGuideScroll}
      >
        <ol>
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const matchAt = query ? line.toLowerCase().indexOf(query.toLowerCase()) : -1;
            const content = matchAt < 0 ? line || " " : <>{line.slice(0, matchAt)}<mark>{line.slice(matchAt, matchAt + query.length)}</mark>{line.slice(matchAt + query.length)}</>;
            const guideStylePath = guidePathByLine[lineNumber];
            return <li id={`sg-guide-markdown-line-${lineNumber}`} key={lineNumber} data-guide-style-path={guideStylePath} aria-current={lineNumber === activeLine ? "location" : undefined} className={lineNumber === activeLine ? "is-current-source" : ""}><span className="sg-guide-line-number" aria-hidden="true">{lineNumber}</span><span>{content}</span>{guideStylePath ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${guideStylePath} in the preview`} onClick={() => onSelectSource(guideStylePath)} /> : null}</li>;
          })}
        </ol>
      </div>
    </div>
    <p className="sg-guide-footer">{styleGuideSource.sourcePath} · SHA-256 {styleGuideSource.sourceDigest.slice(0, 12)}</p>
  </aside>;
});

type FormattedBlock =
  | { type: "heading"; line: number; level: number; text: string }
  | { type: "paragraph"; line: number; lines: { line: number; text: string }[] }
  | { type: "quote"; line: number; lines: { line: number; text: string }[] }
  | { type: "list"; line: number; ordered: boolean; items: { line: number; text: string; continuations: { line: number; text: string }[] }[] }
  | { type: "table"; line: number; endLine: number; headings: string[]; rows: { line: number; cells: string[] }[] }
  | { type: "rule"; line: number };

function parseFormattedBlocks(lines: string[]): FormattedBlock[] {
  const blocks: FormattedBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const text = lines[index].trim();
    const line = index + 1;
    if (!text) { index++; continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(text);
    if (heading) { blocks.push({ type: "heading", line, level: heading[1].length, text: heading[2] }); index++; continue; }
    if (/^\|/.test(text)) {
      const tableLines: { line: number; cells: string[] }[] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        const raw = lines[index].trim();
        const cells = raw.slice(1, raw.endsWith("|") ? -1 : undefined).split("|").map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) tableLines.push({ line: index + 1, cells });
        else tableLines.push({ line: index + 1, cells: [] });
        index++;
      }
      const headings = tableLines[0]?.cells ?? [];
      const rows = tableLines.slice(1).filter(row => row.cells.length > 0);
      blocks.push({ type: "table", line, endLine: index, headings, rows });
      continue;
    }
    if (/^(?:---+|\*\*\*+|___+)$/.test(text)) { blocks.push({ type: "rule", line }); index++; continue; }
    if (/^>\s?/.test(text)) {
      const quoteLines: { line: number; text: string }[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) { quoteLines.push({ line: index + 1, text: lines[index].replace(/^\s*>\s?/, "") }); index++; }
      blocks.push({ type: "quote", line, lines: quoteLines }); continue;
    }
    const listMatch = /^\s*((?:[-*+])|(?:\d+[.)]))\s+(.+)$/.exec(lines[index]);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: { line: number; text: string; continuations: { line: number; text: string }[] }[] = [];
      while (index < lines.length) {
        const item = /^\s*((?:[-*+])|(?:\d+[.)]))\s+(.+)$/.exec(lines[index]);
        if (item && /^\d/.test(item[1]) === ordered) {
          items.push({ line: index + 1, text: item[2], continuations: [] }); index++; continue;
        }
        if (items.length && /^\s{2,}\S/.test(lines[index]) && !/^\s{2,}(?:[-*+]|\d+[.)])\s+/.test(lines[index])) {
          items.at(-1)!.continuations.push({ line: index + 1, text: lines[index].trim() }); index++; continue;
        }
        break;
      }
      blocks.push({ type: "list", line, ordered, items }); continue;
    }
    const paragraphLines: { line: number; text: string }[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|\s*\||\s*>\s?|\s*(?:[-*+]|\d+[.)])\s+|(?:---+|\*\*\*+|___+)$/.test(lines[index])) {
      paragraphLines.push({ line: index + 1, text: lines[index].trim() }); index++;
    }
    if (paragraphLines.length) blocks.push({ type: "paragraph", line, lines: paragraphLines });
    else index++;
  }
  return blocks;
}

function renderGuideInline(text: string, query: string): React.ReactNode {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const tokens = text.split(tokenPattern).filter(Boolean);
  return tokens.map((token, index) => {
    let node: React.ReactNode = token;
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) node = <strong>{renderGuideText(token.slice(2, -2), query)}</strong>;
    else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) node = <em>{renderGuideText(token.slice(1, -1), query)}</em>;
    else if (token.startsWith("`") && token.endsWith("`")) node = <code>{renderGuideText(token.slice(1, -1), query)}</code>;
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const safeHref = /^(?:https?:|mailto:|\/|#)/i.test(link[2]) ? link[2] : undefined;
        node = safeHref ? <a href={safeHref}>{renderGuideText(link[1], query)}</a> : link[1];
      }
    }
    return <span key={index}>{node}</span>;
  });
}

function renderGuideText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const at = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return at < 0 ? text : <>{text.slice(0, at)}<mark>{text.slice(at, at + query.length)}</mark>{text.slice(at + query.length)}</>;
}

const FormattedGuideDocument = forwardRef<HTMLDivElement, {
  lines: string[];
  query: string;
  activeLine: number;
  active: boolean;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  guidePathByLine: Record<number, string>;
  onSelectSource: (path: string) => void;
}>(function FormattedGuideDocument({ lines, query, activeLine, active, onScroll, guidePathByLine, onSelectSource }, ref) {
  const blocks = useMemo(() => parseFormattedBlocks(lines), [lines]);
  const current = (start: number, end = start) => activeLine >= start && activeLine <= end;
  return <div
    ref={ref}
    className={`sg-guide-document sg-guide-formatted${active ? "" : " is-inactive"}`}
    role="region"
    tabIndex={active ? 0 : -1}
    aria-hidden={!active}
    aria-label="Formatted Style Guide"
    onScroll={onScroll}
  >
    <article>
      {blocks.map((block, index) => {
        const isCurrent = block.type === "paragraph" || block.type === "quote"
          ? block.lines.some(item => item.line === activeLine)
          : block.type === "list"
            ? block.items.some(item => item.line === activeLine || item.continuations.some(continuation => continuation.line === activeLine))
            : current(block.line, block.type === "table" ? block.endLine : block.line);
        const marker = <span className="sg-formatted-line" aria-label={`Source line ${block.line}`}>Line {block.line}</span>;
        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          const path = guidePathByLine[block.line];
          return <div id={`sg-guide-formatted-line-${block.line}`} key={index} data-guide-style-path={path} className={`sg-formatted-block${isCurrent ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined}>{marker} <Heading>{renderGuideInline(block.text, query)}</Heading>{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}</div>;
        }
        if (block.type === "paragraph" || block.type === "quote") {
          const Content = block.type === "quote" ? "blockquote" : "p";
          return <div key={index} className="sg-formatted-block">{marker}<Content>{block.lines.map(item => { const path = guidePathByLine[item.line]; return <span id={`sg-guide-formatted-line-${item.line}`} key={item.line} data-guide-line={item.line} data-guide-style-path={path} aria-current={activeLine === item.line ? "location" : undefined} className={`sg-formatted-source-line${activeLine === item.line ? " is-current-source" : ""}`}>{renderGuideInline(item.text, query)}{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null} </span>; })}</Content></div>;
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return <div key={index} className="sg-formatted-block">{marker}<List>{block.items.map(item => { const path = guidePathByLine[item.line]; return <li id={`sg-guide-formatted-line-${item.line}`} key={item.line} data-guide-style-path={path} aria-current={activeLine === item.line ? "location" : undefined} className={activeLine === item.line ? "is-current-source" : undefined}>{renderGuideInline(item.text, query)}{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}{item.continuations.map(continuation => { const continuationPath = guidePathByLine[continuation.line]; return <span id={`sg-guide-formatted-line-${continuation.line}`} key={continuation.line} data-guide-style-path={continuationPath} aria-current={activeLine === continuation.line ? "location" : undefined} className={`sg-formatted-source-line${activeLine === continuation.line ? " is-current-source" : ""}`}> {renderGuideInline(continuation.text, query)}{continuationPath ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${continuationPath} in the preview`} onClick={() => onSelectSource(continuationPath)} /> : null}</span>; })}</li>; })}</List></div>;
        }
        if (block.type === "rule") return <div id={`sg-guide-formatted-line-${block.line}`} key={index} className={`sg-formatted-block sg-formatted-rule${isCurrent ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined} />;
        const currentTableRow = block.rows.some(row => row.line === activeLine);
        const highlightTable = isCurrent && !currentTableRow;
        return <div id={`sg-guide-formatted-line-${block.line}`} key={index} data-guide-style-path={guidePathByLine[block.line]} tabIndex={guidePathByLine[block.line] ? 0 : undefined} aria-label={guidePathByLine[block.line] ? `Select ${guidePathByLine[block.line]} in the preview` : undefined} className={`sg-formatted-block sg-formatted-table${highlightTable ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined}>
          <span className="sg-formatted-line" aria-label={`Table source line ${block.line}`}>Line {block.line}</span>
          <table><thead><tr>{block.headings.map((heading, cell) => <th key={cell}>{renderGuideInline(heading, query)}</th>)}</tr></thead><tbody>{block.rows.map(row => { const path = guidePathByLine[row.line]; return <tr id={`sg-guide-formatted-line-${row.line}`} key={row.line} data-guide-style-path={path} aria-current={activeLine === row.line ? "location" : undefined} className={activeLine === row.line ? "is-current-row" : undefined}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}>{renderGuideInline(cell, query)}{cellIndex === 0 && path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}</td>)}</tr>; })}</tbody></table>
          <span className="sg-formatted-line-range">Lines {block.line}–{block.endLine}</span>
          <span id={`sg-guide-formatted-line-${block.line + 1}`} className="sg-guide-hidden-anchor" aria-hidden="true" />
        </div>;
      })}
    </article>
  </div>;
});

function buttonPathPartsLabel(path: string) {
  const role = path.split(".")[1];
  return role ? role[0].toUpperCase() + role.slice(1) : "Related";
}
