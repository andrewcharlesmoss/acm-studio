"use client";
import { NumberInput, SearchInput, SelectControl, TextInput } from "../../controls/native-fields";
import { HistoryActions } from "../../controls/history-actions";

import { ToggleSetting } from "../../controls/toggle-setting";
import { StudioButton } from "../../controls/button";
import { forwardRef, useCallback, useEffect, useMemo, useReducer, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent, type UIEvent } from "react";
import { AcmIcon } from "@acm/icons/react";
import {
  resolveUniversalStyleValue,
  universalStylePresetToCssVariables,
  validateUniversalStylePreset,
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
import { parseStyleGuidePresets, updateStyleGuideTokensFromDraft, indexStyleGuide } from "./style-guide-tokens.mjs";
import { BUNDLED_STYLE_GUIDE_SOURCE, createUniversalStylePreset, UNIVERSAL_STYLE_PRESET } from "./canonical-style-guide";
import { resetResponsiveStyleMetric } from "./style-preset-values";
import { createSharedStylesClient } from "./shared-styles-client.mjs";
import { createStylePresetHistory, stylePresetHistoryReducer } from "./style-preset-history";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import { styleSourcePathFromTarget } from "./style-source-path";
import { initialStyleGuideSelection, selectedStyleGuidePreviewPath, styleGuideSelectionReducer } from "./style-guide-selection";
import { FormattedGuideDocument } from "./formatted-guide-document";
import { CanonicalSourceResizer } from "./canonical-source-resizer";
import { CanonicalSourceLines, canonicalSourceScrollTop } from "./canonical-source-lines";
import "../style-guide.css";

type Panel = "palette" | "typography" | "buttons" | "interactions" | "layout";
type TypographyRole = keyof UniversalStylePreset["typography"];
type MetricName = "size" | "lineHeight" | "letterSpacing";
type Metric = FontSizeValue | LineHeightValue | LetterSpacingValue;
type ButtonRole = keyof UniversalStylePreset["buttons"];
type MobilePanel = "settings" | "preview" | "guide";
type GuideSourceMapping = { line: number; excerpt: string; heading: string; rowPath: string };
type GuideView = "formatted" | "markdown";

const fontFamilies: { id: FontFamily; name: string }[] = [
  { id: "inter", name: "Inter" },
  { id: "helvetica-neue", name: "Helvetica Neue" },
  { id: "helvetica", name: "Helvetica" },
  { id: "arial", name: "Arial" },
  { id: "sans-serif", name: "sans-serif" },
];
const typographyRoles: { id: TypographyRole; label: string }[] = [
  { id: "body", label: "Body" }, { id: "h1", label: "H1" }, { id: "h2", label: "H2" },
  { id: "h3", label: "H3" }, { id: "h4", label: "H4" }, { id: "h5", label: "H5" },
  { id: "h6", label: "H6" }, { id: "button", label: "Buttons" },
  { id: "navigation", label: "Navigation" }, { id: "metadata", label: "Secondary metadata" },
];
const paletteRoles = [
  ["surface", "Surface"], ["surfaceRaised", "Raised surface"], ["surfaceSubtle", "Subtle surface"],
  ["workspaceBackground", "Workspace Background"],
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
  if (value === "helvetica-neue") return "Helvetica Neue";
  if (value === "helvetica") return "Helvetica";
  if (value === "arial") return "Arial";
  if (value === "sans-serif") return "sans-serif";
  if (value === "system-sans") return "System Sans";
  if (value === "georgia") return "Georgia";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return value === undefined ? "Documented guidance" : JSON.stringify(value);
}

export function StyleGuideSandbox({ active = true }: { active?: boolean }) {
  const [history, dispatchHistory] = useReducer(stylePresetHistoryReducer, undefined, () => createStylePresetHistory(createUniversalStylePreset()));
  const preset = history.present;
  const [baseline, setBaseline] = useState<UniversalStylePreset>(UNIVERSAL_STYLE_PRESET);
  const [sourceState, setSourceState] = useState<{ preset: UniversalStylePreset; revision: string; token: string; source: typeof BUNDLED_STYLE_GUIDE_SOURCE } | null>(null);
  const [busy, setBusy] = useState(true);
  const [saveMessage, setSaveMessage] = useState("Loading source…");
  const requestEpoch = useRef(0);
  const clientRef = useRef<ReturnType<typeof createSharedStylesClient> | null>(null);
  const stateRef = useRef(sourceState);
  const draftRef = useRef(preset);
  const busyRef = useRef(busy);
  const originals = useMemo(() => parseStyleGuidePresets(sourceState?.source.document ?? BUNDLED_STYLE_GUIDE_SOURCE.document).originalUniversalPreset as UniversalStylePreset, [sourceState]);
  const dirty = JSON.stringify(preset) !== JSON.stringify(baseline);
  const baselineRef = useRef(baseline);
  useEffect(() => { stateRef.current = sourceState; draftRef.current = preset; busyRef.current = busy; baselineRef.current = baseline; }, [sourceState, preset, busy, baseline]);

  const installSource = useCallback((state: NonNullable<typeof sourceState>) => {
    const value = validateUniversalStylePreset(state.preset);
    setBaseline(value);
    setSourceState(state);
    dispatchHistory({ type: "load", preset: copyPreset(value) });
    setSaveMessage("Source loaded");
  }, []);

  useEffect(() => {
    const client = createSharedStylesClient();
    clientRef.current = client;
    let active = true;
    let reading = false;
    async function load(initial = false) {
      if (reading || (!initial && busyRef.current)) return;
      reading = true;
      const epoch = ++requestEpoch.current;
      try {
        const state = await client.load(stateRef.current?.token);
        if (!active || epoch !== requestEpoch.current || (!initial && busyRef.current)) return;
        if (initial || JSON.stringify(draftRef.current) === JSON.stringify(baselineRef.current)) installSource(state);
        else if (state.revision !== stateRef.current?.revision) setSaveMessage("Source changed externally. Your draft is preserved. Reload Source before saving.");
      } catch (error) {
        if (active && epoch === requestEpoch.current) setSaveMessage(error instanceof Error ? error.message : "Source saving is unavailable.");
      } finally { reading = false; if (active && initial && epoch === requestEpoch.current) setBusy(false); }
    }
    void load(true);
    const refresh = () => { void load(); };
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [installSource]);

  async function reloadSource() {
    if (busyRef.current) return;
    requestEpoch.current++;
    busyRef.current = true;
    setBusy(true);
    try { installSource(await clientRef.current!.load(sourceState?.token)); }
    catch (error) { setSaveMessage(error instanceof Error ? error.message : "Source could not be loaded."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function saveSharedStyles() {
    if (busyRef.current || !sourceState) return;
    requestEpoch.current++;
    busyRef.current = true;
    setBusy(true);
    setSaveMessage("Saving shared styles…");
    try {
      const saved = await clientRef.current!.save(preset, sourceState);
      // Saving establishes a baseline, but preserves Undo history.
      const savedPreset = validateUniversalStylePreset(saved.preset);
      setBaseline(savedPreset);
      setSourceState(saved);
      setSaveMessage("Saved to source");
      window.dispatchEvent(new Event("studio-shared-styles-saved"));
      const channel = new BroadcastChannel("studio-shared-styles-refresh");
      channel.postMessage("refresh");
      channel.close();
      dispatchHistory({ type: "saved", preset: savedPreset });
    } catch (error) { setSaveMessage(error instanceof Error ? error.message : "Saving failed. Your draft is preserved."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const guideDocument: string = useMemo(() => updateStyleGuideTokensFromDraft(sourceState?.source.document ?? BUNDLED_STYLE_GUIDE_SOURCE.document, preset), [sourceState, preset]);
  const styleGuideSource = useMemo(() => ({ ...(sourceState?.source ?? BUNDLED_STYLE_GUIDE_SOURCE), document: guideDocument, ...indexStyleGuide(guideDocument, preset) }), [sourceState, guideDocument, preset]);

  const pageRef = useRef<HTMLElement>(null);
  const undo = useCallback(() => !busyRef.current && dispatchHistory({ type: "undo" }), []);
  const redo = useCallback(() => !busyRef.current && dispatchHistory({ type: "redo" }), []);
  const endEdit = useCallback(() => dispatchHistory({ type: "end-edit" }), []);
  function setPreset(update: UniversalStylePreset | ((current: UniversalStylePreset) => UniversalStylePreset), editKey?: string) {
    if (busyRef.current) return;
    setSaveMessage("Unsaved changes");
    dispatchHistory({ type: "change", update: typeof update === "function" ? update : () => update, editKey });
  }

  useEffect(() => {
    if (!active) return;
    const page = pageRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.isComposing) handleStudioHistoryShortcut(event, navigator.platform, undo, redo);
    };
    page?.addEventListener("keydown", handleKeyDown);
    return () => page?.removeEventListener("keydown", handleKeyDown);
  }, [active, undo, redo]);
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [panel, setPanel] = useState<Panel>("typography");
  const [role, setRole] = useState<TypographyRole>("body");
  const [fontQuery, setFontQuery] = useState("");
  const [buttonRole, setButtonRole] = useState<ButtonRole>("base");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("settings");
  const [hoverInspection, setHoverInspection] = useState(false);
  const [selection, dispatchSelection] = useReducer(styleGuideSelectionReducer, initialStyleGuideSelection);
  const { hoveredSourcePath, hoveredGuidePath, focusedSourcePath, pinnedSourcePath } = selection;
  const [guideQuery, setGuideQuery] = useState("");
  const [guideView, setGuideView] = useState<GuideView>("formatted");
  const [guideMatchIndex, setGuideMatchIndex] = useState(0);
  const [guideJumpLine, setGuideJumpLine] = useState<number | null>(null);
  const guideSourceRef = useRef<HTMLDivElement>(null);
  const hasSourceInteraction = useRef(false);
  const guideScrollSyncSuspended = useRef(false);
  const variables = useMemo(() => universalStylePresetToCssVariables(preset, viewport) as CSSProperties & Record<string, string>, [preset, viewport]);
  const guideLines = useMemo(() => styleGuideSource.document.split("\n"), [styleGuideSource.document]);
  const guideMatches = useMemo(() => guideQuery.trim() ? guideLines.flatMap((line, index) => line.toLowerCase().includes(guideQuery.toLowerCase()) ? [index + 1] : []) : [], [guideLines, guideQuery]);
  const styleMappings = styleGuideSource.mappings as Record<string, GuideSourceMapping>;
  const guidePathByLine = Object.fromEntries(Object.entries(styleMappings)
    .filter(([path, mapping]) => path === mapping.rowPath)
    .map(([path, mapping]) => [mapping.line, path])) as Record<number, string>;
  const selectedColourPath = hoveredGuidePath ?? hoveredSourcePath ?? focusedSourcePath ?? pinnedSourcePath;
  const selectedPreviewPath = selectedStyleGuidePreviewPath(selection);
  const hoveredGuidePreviewPath = hoveredGuidePath ? selectedStyleGuidePreviewPath({ ...selection, previewHoverPath: null, focusedSourcePath: null, pinnedSourcePath: null }) : null;
  const activeSourcePath = hoveredGuidePreviewPath ?? hoveredGuidePath ?? hoveredSourcePath ?? focusedSourcePath ?? pinnedSourcePath ?? `typography.${role}.size`;
  const activeSource = styleMappings[activeSourcePath] ?? styleMappings["typography.body.size"];
  const activeBaseline = activeSourcePath.startsWith("specimen.") ? "Guidance only — no @acm/styles token" : displayStyleValue(pathValue(baseline, activeSourcePath), viewport);
  const activeValue = activeSourcePath.startsWith("specimen.") ? "Documented specimen guidance" : displayStyleValue(pathValue(preset, activeSourcePath), viewport);
  const activeGuideLine = guideJumpLine ?? activeSource?.line ?? 1;
  const buttonPathParts = activeSourcePath.split(".");
  const relatedButtonValues = activeSourcePath.startsWith("buttons.") ? (["background", "foreground", "border", "borderWidth", "hoverBackground", "hoverForeground"] as const).map(property => {
    const propertyPath = `${buttonPathParts[0]}.${buttonPathParts[1]}.${property}`;
    return { path: propertyPath, current: displayStyleValue(pathValue(preset, propertyPath), viewport), baseline: displayStyleValue(pathValue(baseline, propertyPath), viewport) };
  }) : [];

  useEffect(() => {
    if (!hasSourceInteraction.current || hoveredGuidePath) return;
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
      const top = canonicalSourceScrollTop(guideRect, lineRect, guide.scrollTop, guide.clientHeight);
      guide.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => {
      window.clearTimeout(syncTimeout);
      activeGuide?.removeEventListener("scrollend", resumeSync);
      guideScrollSyncSuspended.current = false;
    };
  }, [activeGuideLine, hoveredGuidePath]);

  function sourcePathFromTarget(target: EventTarget | null): string | null {
    return styleSourcePathFromTarget(target);
  }

  function changeHoverInspection(enabled: boolean) {
    hasSourceInteraction.current = false;
    guideScrollSyncSuspended.current = false;
    dispatchSelection({ type: "clear-hover" });
    setHoverInspection(enabled);
  }

  function handleSourcePointer(event: PointerEvent<HTMLDivElement>) {
    if (!hoverInspection) return;
    const path = sourcePathFromTarget(event.target);
    const mappedPath = path && styleMappings[path] ? path : null;
    dispatchSelection({ type: "hover-source", path: mappedPath });
    const previewPath = event.target instanceof Element && event.target.closest(".sg-preview") ? mappedPath : null;
    dispatchSelection({ type: "hover-preview", path: previewPath });
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      // Keep a focused Settings editor mounted while the pointer explores the preview.
      const editingSettings = document.activeElement?.closest(".sg-setting-content");
      if (path.startsWith("palette.") && event.target instanceof Element && event.target.closest(".sg-preview") && !editingSettings) setPanel("palette");
      setGuideJumpLine(null);
    }
  }

  function handleSourceFocus(event: FocusEvent<HTMLDivElement>) {
    const path = sourcePathFromTarget(event.target);
    dispatchSelection({ type: "focus-source", path: path && styleMappings[path] ? path : null });
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      if (path.startsWith("palette.") && event.target instanceof Element && event.target.closest(".sg-preview")) setPanel("palette");
      setGuideJumpLine(null);
    }
  }

  function pinSource(event: MouseEvent<HTMLDivElement>) {
    const path = sourcePathFromTarget(event.target);
    if (path && styleMappings[path]) {
      hasSourceInteraction.current = true;
      dispatchSelection({ type: "pin-source", path });
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
    else if (parts[0] === "interface" || parts[0] === "interactions") {
      const section = parts[1] === "typography" ? "typography" : parts[1] === "fields" ? "fields" : parts[1] === "buttons" ? "buttons" : parts[1] === "interactions" ? "interactions" : "colours";
      window.location.href = `/studio/ui/interface-styles#interface-style-${section}`;
      return;
    }
    else if (parts[0] === "layout") setPanel("layout");
    if (!styleMappings[selectedPath]) return;
    hasSourceInteraction.current = true;
    dispatchSelection({ type: "pin-source", path: selectedPath });
    setGuideJumpLine(null);
  }

  function hoverGuideSource(event: PointerEvent<HTMLDivElement>) {
    if (!hoverInspection) return;
    const target = event.target;
    const path = target instanceof Element
      ? target.closest<HTMLElement>("[data-guide-style-path]")?.dataset.guideStylePath ?? null
      : null;
    hasSourceInteraction.current = false;
    dispatchSelection({ type: "hover-guide", path: path && styleMappings[path] ? path : null });
  }

  function clearGuideHover() {
    if (!hoverInspection) return;
    hasSourceInteraction.current = false;
    dispatchSelection({ type: "clear-guide-hover" });
  }

  function updateTypography(update: (current: UniversalStylePreset["typography"][TypographyRole]) => UniversalStylePreset["typography"][TypographyRole], editKey?: string) {
    setPreset(current => {
      const next = copyPreset(current);
      next.typography[role] = update(next.typography[role]);
      return next;
    }, editKey);
  }

  function updateMetric(metricName: MetricName, update: (metric: Metric) => Metric, continuous = false) {
    updateTypography(current => {
      const responsive = current[metricName] as ResponsiveValue<Metric>;
      const resolved = resolveUniversalStyleValue(responsive, viewport).value;
      return { ...current, [metricName]: { ...responsive, [viewport]: update({ ...resolved }) } } as UniversalStylePreset["typography"][TypographyRole];
    }, continuous ? `typography.${role}.${metricName}.${viewport}` : undefined);
  }

  function resetTypographyProperty(property: "family" | "weight" | "style" | "transform") {
    updateTypography(current => ({ ...current, [property]: originals.typography[role][property] }));
  }

  function resetMetric(metricName: MetricName) {
    updateTypography(current => {
      const responsive = resetResponsiveStyleMetric(current[metricName] as ResponsiveValue<Metric>, originals.typography[role][metricName] as ResponsiveValue<Metric>, viewport);
      return { ...current, [metricName]: responsive } as UniversalStylePreset["typography"][TypographyRole];
    });
  }

  function resetSection() {
    setPreset(current => {
      const next = copyPreset(current);
      if (panel === "palette") next.palette = copyPreset(originals.palette);
      if (panel === "typography") next.typography = copyPreset(originals.typography);
      if (panel === "buttons") next.buttons = copyPreset(originals.buttons);
      if (panel === "interactions") next.interactions = copyPreset(originals.interactions);
      if (panel === "layout") next.layout = copyPreset(originals.layout);
      return next;
    });
  }

  function resetAll() {
    setPreset(copyPreset(originals));
    setViewport("desktop");
    setPanel("typography");
    setRole("body");
    setButtonRole("base");
    setFontQuery("");
    setMobilePanel("settings");
    dispatchSelection({ type: "clear-all" });
    setGuideQuery("");
    setGuideView("formatted");
    setGuideMatchIndex(0);
    setGuideJumpLine(null);
    hasSourceInteraction.current = false;
  }

  function setPaletteColour(key: keyof UniversalStylePreset["palette"], value: string, continuous = true) {
    setPreset(current => ({ ...current, palette: { ...current.palette, [key]: value } }), continuous ? `palette.${key}` : undefined);
  }

  function updateButton(key: keyof ButtonStyle, value: string | number, continuous = true) {
    setPreset(current => ({ ...current, buttons: { ...current.buttons, [buttonRole]: { ...current.buttons[buttonRole], [key]: value } } }), continuous ? `buttons.${buttonRole}.${key}` : undefined);
  }

  const activeTypography = preset.typography[role];
  const matchingFamilies = fontFamilies.filter(font => font.name.toLowerCase().includes(fontQuery.toLowerCase()));
  const ordinaryStatus = ["Unsaved changes", "Source loaded", "Saved to source"].includes(saveMessage);
  let statusMessage = saveMessage;
  if (!busy && ordinaryStatus) statusMessage = dirty ? "Unsaved changes" : saveMessage === "Unsaved changes" ? "No unsaved changes" : saveMessage;
  else if (dirty && !ordinaryStatus) statusMessage += " · Unsaved";

  return <section ref={pageRef} className="sg-page" style={{ "--acm-interaction-control-accent-colour": preset.interactions.controlAccentColour, "--acm-interaction-control-hover-colour": variables["--acm-interaction-control-hover-colour"], "--acm-interaction-control-pressed-colour": variables["--acm-interaction-control-pressed-colour"], "--studio-selection-colour": preset.interactions.selectionColour, "--acm-interaction-block-selection-colour": preset.interactions.blockSelectionColour, "--studio-range-accent": preset.interactions.controlAccentColour, "--studio-range-hover-accent": variables["--acm-interaction-control-hover-colour"], "--studio-range-pressed-accent": variables["--acm-interaction-control-pressed-colour"] } as CSSProperties} aria-labelledby="sg-page-title" onFocusCapture={endEdit} onBlurCapture={endEdit}>
      <header className="ui-page-intro sg-intro">
        <p className="rl-eyebrow">Universal ACM Foundation</p>
        <h1 id="sg-page-title">Style Guide</h1>
        <p>Compare the universal rules, their source in the written guide and a live specimen.</p>
      </header>
      <div className="sg-toolbar">
        <div className="sg-toolbar-controls">
          <div className="sg-history" role="group" aria-label="Style preview history">
      <HistoryActions onUndo={undo} onRedo={redo} canUndo={Boolean(history.past.length)} canRedo={Boolean(history.future.length)} disabled={busy} undoLabel="Undo style change" redoLabel="Redo style change" />
          </div>
          <div className="sg-viewports" role="group" aria-label="Preview size">
            {viewportRoles.map(item => <button type="button" key={item.id} aria-pressed={viewport === item.id} onClick={() => setViewport(item.id)}>{item.label}</button>)}
          </div>
          <ToggleSetting label="Hover Inspection" checked={hoverInspection} onChange={changeHoverInspection} />
        </div>
        <div className="sg-toolbar-actions">
          <span className="sg-sandbox-note" role="status">{statusMessage}</span>
          <StudioButton type="button" disabled={busy || !sourceState || !dirty} onClick={() => { void saveSharedStyles(); }}>Save Website Styles</StudioButton>
          <StudioButton type="button" variant="secondary" disabled={busy} title="Load the current source files and discard unsaved style changes" onClick={() => { void reloadSource(); }}>Reload Source</StudioButton>
          <button type="button" className="sg-reset-all" disabled={busy} onClick={resetAll}><AcmIcon name="action.reset" size={17} />Reset All</button>
        </div>
      </div>
      <div
        className="sg-workbench"
        data-canonical-source-layout
        data-mobile-panel={mobilePanel}
        onPointerOverCapture={handleSourcePointer}
        onPointerLeave={() => dispatchSelection({ type: "clear-source-hover" })}
        onFocusCapture={handleSourceFocus}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dispatchSelection({ type: "clear-focus" }); }}
        onClickCapture={pinSource}
      >
        <nav className="sg-workbench-switcher" aria-label="Style guide workspace panels" role="group">
          {([ ["settings", "Settings"], ["preview", "Preview"], ["guide", "Written guide"] ] as [MobilePanel, string][]).map(([id, label]) => <button type="button" key={id} aria-pressed={mobilePanel === id} onClick={() => setMobilePanel(id)}>{label}</button>)}
        </nav>
        <aside className="sg-settings" aria-label="Style settings">
          <h2>Settings</h2>
        <nav className="sg-setting-navigation" aria-label="Website style categories">
          {([ ["palette", "Colours"], ["typography", "Typography"], ["buttons", "Buttons"], ["layout", "Layout"] ] as [Panel, string][]).map(([id, label]) => <button type="button" key={id} className={panel === id ? "is-selected" : ""} aria-current={panel === id ? "page" : undefined} onClick={() => setPanel(id)}>{label}</button>)}
          </nav>
          <fieldset className="sg-setting-content" disabled={busy}>
            <div className="sg-setting-heading"><div><p className="rl-eyebrow">WEBSITE DEFAULTS</p><h3>{panel === "palette" ? "Colours" : panel === "typography" ? "Typography" : panel === "buttons" ? "Buttons" : panel === "interactions" ? "Interactions" : "Layout"}</h3></div>{panel !== "interactions" ? <button type="button" className="sg-reset-section" onClick={resetSection}>Reset section</button> : null}</div>
            {panel === "palette" ? <div className="sg-colour-settings">{paletteRoles.map(([key, label]) => <div key={key} className="sg-colour-setting" data-style-path={`palette.${key}`} data-source-selected={selectedColourPath === `palette.${key}` ? "true" : undefined}><span>{label}</span><input data-style-path={`palette.${key}`} type="color" aria-label={label} value={preset.palette[key]} onChange={event => setPaletteColour(key, event.target.value)} />{key === "workspaceBackground" ? <WorkspaceBackgroundHex key={preset.palette[key]} value={preset.palette[key]} onChange={value => setPaletteColour(key, value)} /> : <code>{preset.palette[key]}</code>}<button data-style-path={`palette.${key}`} type="button" aria-label={`Reset ${label} colour`} onClick={() => setPaletteColour(key, originals.palette[key], false)}>Reset</button></div>)}</div> : null}
            {panel === "typography" ? <>
              <div className="sg-role-list" role="group" aria-label="Typography role">
                {typographyRoles.map(item => <button type="button" key={item.id} aria-pressed={role === item.id} onClick={() => setRole(item.id)}>{item.label}</button>)}
              </div>
              <TypographyControls
                role={role}
                viewport={viewport}
                value={activeTypography}
                baseline={originals.typography[role]}
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
              <div className="sg-button-settings">{([ ["background", "Background colour"], ["foreground", "Text colour"], ["border", "Border colour"], ["hoverBackground", "Hover background colour"], ["hoverForeground", "Hover text colour"] ] as [Exclude<keyof ButtonStyle, "borderWidth">, string][]).map(([key, label]) => <ColourControl key={key} stylePath={`buttons.${buttonRole}.${key}`} label={label} value={preset.buttons[buttonRole][key]} onChange={value => updateButton(key, value)} onReset={() => updateButton(key, originals.buttons[buttonRole][key], false)} />)}<label className="sg-button-border-width">Border width (px)<NumberInput data-style-path={`buttons.${buttonRole}.borderWidth`}  min={0} max={12} step={1} value={preset.buttons[buttonRole].borderWidth} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 12) updateButton("borderWidth", value); }} /></label></div>
            </> : null}
            {panel === "interactions" ? <div className="sg-interaction-settings"><section className="sg-interaction-group" aria-labelledby="sg-neutral-hover-heading"><h4 id="sg-neutral-hover-heading">Neutral hover background</h4><p id="sg-neutral-hover-description">Disclosure headings, neutral controls, menu items and list items share this colour.</p><ColourControl stylePath="interactions.neutralHoverBackground" label="Neutral hover background" visibleLabel="" descriptionId="sg-neutral-hover-description" value={preset.interactions.neutralHoverBackground} onChange={value => setPreset(current => ({ ...current, interactions: { ...current.interactions, neutralHoverBackground: value } }), "interactions.neutralHoverBackground")} onReset={() => setPreset(current => ({ ...current, interactions: { ...current.interactions, neutralHoverBackground: originals.interactions.neutralHoverBackground } }))} /></section><section className="sg-interaction-group" aria-labelledby="sg-selection-heading"><h4 id="sg-selection-heading">Interface selection colour</h4><p id="sg-selection-description">Selected interface controls and source highlights share this colour. Specimen Accent stays separate.</p><ColourControl stylePath="interactions.selectionColour" label="Interface selection colour" visibleLabel="" descriptionId="sg-selection-description" value={preset.interactions.selectionColour} onChange={value => setPreset(current => ({ ...current, interactions: { ...current.interactions, selectionColour: value } }), "interactions.selectionColour")} onReset={() => setPreset(current => ({ ...current, interactions: { ...current.interactions, selectionColour: originals.interactions.selectionColour } }))} /></section><section className="sg-interaction-group" aria-labelledby="sg-block-selection-heading"><h4 id="sg-block-selection-heading">Block selection colour</h4><p id="sg-block-selection-description">Selected blocks share one outline and range highlight. Alert and interface selection colours stay separate.</p><ColourControl stylePath="interactions.blockSelectionColour" label="Block selection colour" visibleLabel="" descriptionId="sg-block-selection-description" value={preset.interactions.blockSelectionColour} onChange={value => setPreset(current => ({ ...current, interactions: { ...current.interactions, blockSelectionColour: value } }), "interactions.blockSelectionColour")} onReset={() => setPreset(current => ({ ...current, interactions: { ...current.interactions, blockSelectionColour: originals.interactions.blockSelectionColour } }))} /></section><section className="sg-interaction-group" aria-labelledby="sg-control-accent-heading"><h4 id="sg-control-accent-heading">Control accent colour</h4><p id="sg-control-accent-description">Enabled toggles and standard sliders share this colour. Hover is 12% darker; pressed is a further 12% darker.</p><ColourControl stylePath="interactions.controlAccentColour" label="Control accent colour" visibleLabel="" descriptionId="sg-control-accent-description" value={preset.interactions.controlAccentColour} onChange={value => setPreset(current => ({ ...current, interactions: { ...current.interactions, controlAccentColour: value } }), "interactions.controlAccentColour")} onReset={() => setPreset(current => ({ ...current, interactions: { ...current.interactions, controlAccentColour: originals.interactions.controlAccentColour } }))} /></section></div> : null}
            {panel === "layout" ? <div className="sg-layout-settings">{([ ["spacing", "Spacing", 0, 120], ["contentWidth", "Content width", 320, 1800], ["radius", "Corner radius", 0, 80], ["borderWidth", "Border width", 0, 12] ] as const).map(([key, label, min, max]) => <div key={key} className="sg-layout-setting"><label htmlFor={`sg-layout-${key}`}>{label}</label><div><NumberInput data-style-path={`layout.${key}`} id={`sg-layout-${key}`}  min={min} max={max} step={1} value={preset.layout[key]} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) setPreset(current => ({ ...current, layout: { ...current.layout, [key]: number } }), `layout.${key}`); }} /><span>px</span><button data-style-path={`layout.${key}`} type="button" aria-label={`Reset ${label}`} onClick={() => setPreset(current => ({ ...current, layout: { ...current.layout, [key]: originals.layout[key] } }))}>Reset</button></div></div>)}</div> : null}
          </fieldset>
        </aside>
        <section className="sg-preview-panel" aria-label="Live style preview">
          <div className="sg-preview-heading"><div><p className="rl-eyebrow">LIVE PREVIEW</p><h2>Style specimens</h2></div><span>{viewportRoles.find(item => item.id === viewport)?.label} preview</span></div>
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- This labelled preview region needs focus so keyboard users can scroll contained overflow. */}
          <div className="sg-preview-frame" role="region" tabIndex={0} aria-label="Scrollable style specimen preview" data-viewport={viewport}>
            <div className="sg-preview acm-universal-style-preset" style={variables} data-source-selected={(selection.previewHoverPath ?? hoveredGuidePath ?? focusedSourcePath ?? pinnedSourcePath)?.startsWith("layout.") ? "true" : undefined}>
              <header className="sg-site-identity"><div className="sg-site-icon" aria-hidden="true">AM</div><div><strong>ACM Studio</strong><span data-style-path="typography.metadata.size" data-source-selected={selectedPreviewPath === "typography.metadata.size" ? "true" : undefined}>Universal style specimen</span></div><nav className="acm-navigation" data-style-path="typography.navigation.size" data-source-selected={selectedPreviewPath === "typography.navigation.size" ? "true" : undefined} aria-label="Example site navigation"><a href="#specimens">Home</a><a href="#colours">About</a><a href="#buttons">Contact</a></nav></header>
              <section id="buttons" className="sg-example-section sg-button-specimens"><h2>Buttons</h2><div>
                <button data-style-path="buttons.base.background" data-source-selected={selectedPreviewPath === "buttons.base.background" ? "true" : undefined} type="button" className="acm-button"><span data-style-path="typography.button.size">Base button</span></button>
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
          sourceDigest={styleGuideSource.sourceDigest}
          sourceRevision={`${styleGuideSource.sourceRevision}${dirty ? " · Unsaved draft" : styleGuideSource.sourceWorkingTree ? " · Working tree" : ""}`}
          query={guideQuery}
          matchCount={guideMatches.length}
          matchIndex={guideMatchIndex}
          activeLine={activeGuideLine}
          pinned={pinnedSourcePath !== null}
          hoverInspection={hoverInspection}
          guidePathByLine={guidePathByLine}
          onSelectSource={selectGuideSource}
          onHoverSource={hoverGuideSource}
          onClearHover={clearGuideHover}
          guideScrollSyncSuspendedRef={guideScrollSyncSuspended}
          onQueryChange={value => { setGuideQuery(value); setGuideMatchIndex(0); setGuideJumpLine(null); }}
          onMatchChange={direction => {
            if (!guideMatches.length) return;
            hasSourceInteraction.current = true;
            const nextIndex = (guideMatchIndex + direction + guideMatches.length) % guideMatches.length;
            setGuideMatchIndex(nextIndex);
            setGuideJumpLine(guideMatches[nextIndex]);
          }}
          onClearPin={() => dispatchSelection({ type: "clear-pin" })}
        />
      </div>
    </section>;
}

function WorkspaceBackgroundHex({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const valid = /^#[0-9a-f]{6}$/i.test(draft);
  return <TextInput className="sg-workspace-hex" data-style-path="palette.workspaceBackground" aria-label="Workspace Background hex colour" aria-invalid={!valid || undefined} type="text" maxLength={7} spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={() => { if (valid) onChange(draft.toUpperCase()); else setDraft(value); }} />;
}

function ColourControl({ stylePath, label, visibleLabel = label, descriptionId, value, onChange, onReset }: { stylePath: string; label: string; visibleLabel?: string; descriptionId?: string; value: string; onChange: (value: string) => void; onReset: () => void }) {
  return <div className="sg-colour-setting">{visibleLabel ? <span>{visibleLabel}</span> : null}<input data-style-path={stylePath} type="color" aria-label={label} aria-describedby={descriptionId} value={value} onChange={event => onChange(event.target.value)} /><code>{value}</code><button data-style-path={stylePath} type="button" aria-label={`Reset ${label}`} onClick={onReset}>Reset</button></div>;
}

function TypographyControls({ role, viewport, value, baseline, search, matchingFamilies, onSearch, onChange, onMetricChange, onResetProperty, onResetMetric }: {
  baseline: UniversalStylePreset["typography"][TypographyRole];
  role: TypographyRole; viewport: StyleViewport; value: UniversalStylePreset["typography"][TypographyRole]; search: string;
  matchingFamilies: { id: FontFamily; name: string }[]; onSearch: (value: string) => void;
  onChange: (update: (current: UniversalStylePreset["typography"][TypographyRole]) => UniversalStylePreset["typography"][TypographyRole]) => void;
  onMetricChange: (name: MetricName, update: (value: Metric) => Metric, continuous?: boolean) => void;
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
    {tab === "font" ? <section className="sg-editor-panel"><label>Search fonts<SearchInput data-style-path={`typography.${role}.family`}  value={search} placeholder="Search font stack" onChange={event => onSearch(event.target.value)} /></label><div className="sg-font-picker" role="group" aria-label="Font stack family">{matchingFamilies.map(font => <button data-style-path={`typography.${role}.family`} type="button" key={font.id} aria-pressed={value.family === font.id} onClick={() => onChange(current => ({ ...current, family: font.id }))}>{font.name}</button>)}{!matchingFamilies.length ? <p>No font stack families match.</p> : null}</div><button data-style-path={`typography.${role}.family`} type="button" className="sg-inline-reset" onClick={() => onResetProperty("family")}>Reset font family</button><p>Inter upright and italic are bundled. Fallback fonts are supplied by your system.</p></section> : null}
    {tab === "style" ? <section className="sg-editor-panel"><label>Weight<SelectControl data-style-path={`typography.${role}.weight`} value={value.weight} onChange={event => onChange(current => ({ ...current, weight: Number(event.target.value) }))}>{Array.from({ length: 9 }, (_, index) => (index + 1) * 100).map(weight => <option value={weight} key={weight}>{weight}{weight === 400 ? " · Regular" : weight === 700 ? " · Bold" : ""}</option>)}</SelectControl></label><button data-style-path={`typography.${role}.style`} type="button" className="sg-italic-toggle" aria-pressed={value.style === "italic"} onClick={() => onChange(current => ({ ...current, style: current.style === "italic" ? "normal" : "italic" }))}>Italic</button><label>Text transform<SelectControl data-style-path={`typography.${role}.transform`} value={value.transform} onChange={event => onChange(current => ({ ...current, transform: event.target.value as typeof current.transform }))}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></SelectControl></label><button data-style-path={`typography.${role}.weight`} type="button" className="sg-inline-reset" onClick={() => onChange(current => ({ ...current, weight: baseline.weight, style: baseline.style, transform: baseline.transform }))}>Reset style</button></section> : null}
    {tab === "size" ? <section className="sg-editor-panel sg-metric-panel">{metricDetails.map(detail => {
      const item = resolved(detail.id);
      const unitOptions = detail.units;
      const [min, max] = metricBounds(detail.id, item.value.unit);
      return <div className="sg-metric-control" key={detail.id}>
        <div className="sg-metric-title"><strong>{detail.label}</strong><button data-style-path={`typography.${role}.${detail.id}`} type="button" aria-label={`Reset ${roleName} ${detail.label.toLowerCase()}`} onClick={() => onResetMetric(detail.id)}>Reset</button></div>
        <div className="sg-metric-inputs"><NumberInput data-style-path={`typography.${role}.${detail.id}`} aria-label={`${roleName} ${detail.label} value for ${viewport}`}  min={min} max={max} step={detail.step} value={item.value.value} onChange={event => { const number = Number(event.target.value); if (Number.isFinite(number) && number >= min && number <= max) onMetricChange(detail.id, current => ({ ...current, value: formatNumber(number) }) as Metric, true); }} /><SelectControl data-style-path={`typography.${role}.${detail.id}`} aria-label={`${roleName} ${detail.label} unit`} value={item.value.unit} onChange={event => onMetricChange(detail.id, current => { const oldUnit = current.unit; const nextUnit = event.target.value; const relativeUnits = detail.id !== "lineHeight"; const factor = relativeUnits && oldUnit !== nextUnit ? oldUnit === "px" ? 1 / 16 : nextUnit === "px" ? 16 : 1 : 1; return { ...current, value: formatNumber(current.value * factor), unit: nextUnit } as Metric; })}>{unitOptions.map(unit => <option value={unit} key={unit}>{unit === "number" ? "unitless" : unit}</option>)}</SelectControl></div>
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
  sourceDigest?: string;
  query: string;
  matchCount: number;
  matchIndex: number;
  activeLine: number;
  pinned: boolean;
  hoverInspection: boolean;
  guidePathByLine: Record<number, string>;
  onSelectSource: (path: string) => void;
  onHoverSource: (event: PointerEvent<HTMLDivElement>) => void;
  onClearHover: () => void;
  guideScrollSyncSuspendedRef: { current: boolean };
  onQueryChange: (value: string) => void;
  onMatchChange: (direction: number) => void;
  onClearPin: () => void;
};

const GuideSourcePanel = forwardRef<HTMLDivElement, GuideSourcePanelProps>(function GuideSourcePanel({
  activePath, mapping, currentValue, baselineValue, relatedButtonValues, lines, view, onViewChange, sourceRevision, sourceDigest, query, matchCount,
  matchIndex, activeLine, pinned, hoverInspection, guidePathByLine, onSelectSource, onHoverSource, onClearHover, guideScrollSyncSuspendedRef, onQueryChange, onMatchChange, onClearPin,
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
    <CanonicalSourceResizer remainingWidth={836} />
    <div className="sg-guide-heading">
      <div><p className="rl-eyebrow">CANONICAL SOURCE</p><h2>Written Style Guide</h2><p className="sg-guide-source-meta">workspace-governance/STYLE_GUIDE.md{sourceDigest ? ` · Saved source SHA-256 ${sourceDigest.slice(0, 12)}` : " · Bundled guide"}</p></div>
      <span title={sourceRevision}>Revision {sourceRevision.slice(0, 7)}{sourceRevision.includes(" · ") ? sourceRevision.slice(sourceRevision.indexOf(" · ")) : ""}</span>
    </div>
    <section className="sg-source-detail" aria-label="Selected style source">
      <div className="sg-source-detail-heading"><div><p className="rl-eyebrow">{mapping.heading}</p><h3>{activePath}</h3></div>{pinned ? <StudioButton variant="text" type="button" onClick={onClearPin}>Clear selection</StudioButton> : <span>{hoverInspection ? "Hover or focus a style" : "Click or focus a style"}</span>}</div>
      <dl>
        <div><dt>Saved value</dt><dd>{baselineValue}</dd></div>
        <div><dt>Current value</dt><dd>{currentValue}</dd></div>
        <div><dt>Guide location</dt><dd>Line {mapping.line}</dd></div>
      </dl>
      {relatedButtonValues.length ? <details className="sg-related-values"><summary>All {buttonPathPartsLabel(activePath)} button properties</summary><dl>{relatedButtonValues.map(item => <div key={item.path}><dt>{item.path.split(".").at(-1)}</dt><dd>{item.current}<span>Saved {item.baseline}</span></dd></div>)}</dl></details> : null}
      <p className="sg-source-help">{hoverInspection ? "Hover a mapped guide table row or preview item to inspect its rule. " : "Enable Hover Inspection to inspect rules by hovering. "}Click or focus a preview item to inspect its rule, or click a mapped guide line to pin its source details. Guide selection buttons also support Enter and Space.</p>
      <blockquote><code>{mapping.excerpt}</code></blockquote>
      {activePath.startsWith("specimen.") ? <p className="sg-source-note">This is written guidance for the example. It is not a token in the executable preset.</p> : null}
    </section>
    <div className="sg-guide-search">
      <label htmlFor="sg-guide-search-input">Search the full guide</label>
      <SearchInput id="sg-guide-search-input"  value={query} placeholder="Search guide text" onChange={event => onQueryChange(event.target.value)} />
      <div><span aria-live="polite">{matchCount ? `${matchIndex + 1} of ${matchCount} matches` : query ? "No matches" : `${lines.length} lines`}</span><div><button type="button" disabled={!matchCount} aria-label="Previous matching guide line" onClick={() => onMatchChange(-1)}>Previous</button><button type="button" disabled={!matchCount} aria-label="Next matching guide line" onClick={() => onMatchChange(1)}>Next</button></div></div>
    </div>
    <div className="sg-guide-view-switch" role="group" aria-label="Written guide format">
      <button type="button" aria-pressed={view === "formatted"} onClick={() => onViewChange("formatted")}>Formatted</button>
      <button type="button" aria-pressed={view === "markdown"} onClick={() => onViewChange("markdown")}>Markdown source</button>
    </div>
    <div
      className="sg-guide-views"
      onPointerOverCapture={onHoverSource}
      onPointerLeave={onClearHover}
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
        <CanonicalSourceLines lines={lines} activeLine={activeLine} query={query} idPrefix="sg-guide-markdown" pathByLine={guidePathByLine} onSelectPath={onSelectSource} />
      </div>
    </div>
  </aside>;
});

function buttonPathPartsLabel(path: string) {
  const role = path.split(".")[1];
  return role ? role[0].toUpperCase() + role.slice(1) : "Related";
}
