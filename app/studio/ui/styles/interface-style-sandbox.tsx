"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { INTERFACE_STYLE_PRESET, interfaceStylePresetToCssVariables, validateInterfaceStylePreset, type InterfaceStylePreset } from "@acm/styles";
import { StudioButton } from "../../controls/button";
import { HistoryActions } from "../../controls/history-actions";
import { NumberInput, SelectControl, TextInput } from "../../controls/native-fields";
import { RangeControl } from "../../controls/range-control";
import { ToggleSetting } from "../../controls/toggle-setting";
import { InspectorToolsSection } from "../../inspector-tools-section";
import { createSharedStylesClient } from "./shared-styles-client.mjs";
import { interfaceStyleHistoryReducer } from "./interface-style-history";
import { InterfaceStyleScope } from "./interface-style-scope";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import "./interface-style-sandbox.css";

type Scope = "colours" | "typography" | "fields" | "buttons" | "interactions";
type SourceState = { preset: InterfaceStylePreset; revision: string; token: string; source: { document: string; mappings: Record<string, unknown> }; needsSynchronisation: boolean };
const scopes: { id: Scope; label: string; description: string }[] = [
  { id: "colours", label: "Colours", description: "Interface surfaces, text, labels, and selection colours." },
  { id: "typography", label: "Typography", description: "Compact controls and the shared application header." },
  { id: "fields", label: "Fields", description: "The shared corner radius for input, number, select, and text-area controls." },
  { id: "buttons", label: "Buttons", description: "Shared base, secondary, and outline interface buttons." },
  { id: "interactions", label: "Interactions", description: "Hover treatments for shared control families." },
];
const colourFields: { key: keyof InterfaceStylePreset["colours"]; label: string }[] = [
  { key: "surface", label: "Surface" }, { key: "raisedSurface", label: "Raised surface" }, { key: "subtleSurface", label: "Subtle surface" },
  { key: "workspaceBackground", label: "Workspace background" }, { key: "primaryText", label: "Primary text" }, { key: "secondaryText", label: "Secondary text" },
  { key: "label", label: "Labels" }, { key: "border", label: "Borders" }, { key: "actionAccent", label: "Action accent" },
  { key: "controlAccent", label: "Control accent" }, { key: "selection", label: "Interface selection" }, { key: "blockSelection", label: "Block selection" },
  { key: "neutralHover", label: "Neutral row hover" },
];
const buttonLabels = { base: "Base", secondary: "Secondary", outline: "Outline" } as const;
const interactionLabels: Record<keyof InterfaceStylePreset["interactions"], string> = {
  textActions: "Text actions", iconActions: "Icon actions", inspectorOptions: "Inspector option rows",
  colourRows: "Colour setting rows", neutralRows: "Neutral menu and list rows", fields: "Fields", buttons: "Buttons",
};
const hoverTreatments = [{ value: "none", label: "No change" }, { value: "text-icon", label: "Text/icon only" }, { value: "background", label: "Background fill" }];

function clone<T>(value: T): T { return structuredClone(value); }
function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined, source);
}
function setPath(preset: InterfaceStylePreset, path: string, value: unknown): InterfaceStylePreset {
  const next = clone(preset) as unknown as Record<string, unknown>;
  const parts = path.split(".");
  let current = next;
  for (const part of parts.slice(0, -1)) current = current[part] as Record<string, unknown>;
  current[parts.at(-1)!] = value;
  return next as unknown as InterfaceStylePreset;
}
function validColour(value: string) { return /^#[0-9a-f]{6}$/i.test(value); }

export function InterfaceStyleSandbox() {
  const [history, dispatch] = useReducer(interfaceStyleHistoryReducer, undefined, () => ({ past: [], present: clone(INTERFACE_STYLE_PRESET), future: [] }));
  const preset = history.present;
  const [baseline, setBaseline] = useState<InterfaceStylePreset>(INTERFACE_STYLE_PRESET);
  const [source, setSource] = useState<SourceState | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Loading source…");
  const [scope, setScope] = useState<Scope>(() => {
    const requested = typeof window === "undefined" ? "" : window.location.hash.replace("#interface-style-", "");
    return scopes.find(item => item.id === requested)?.id ?? "colours";
  });
  const [rangeValue, setRangeValue] = useState(56);
  const [toggleValue, setToggleValue] = useState(true);
  const [visibleOptions, setVisibleOptions] = useState<ReadonlySet<string>>(new Set(["font", "size"]));
  const clientRef = useRef<ReturnType<typeof createSharedStylesClient> | null>(null);
  const activeRef = useRef(true);
  const loadingRef = useRef(false);
  const baselineRef = useRef(baseline);
  const presetRef = useRef(preset);
  const sourceRef = useRef(source);
  const busyRef = useRef(busy);
  const dirty = JSON.stringify(preset) !== JSON.stringify(baseline);
  const variables = useMemo(() => interfaceStylePresetToCssVariables(preset) as CSSProperties & Record<string, string>, [preset]);

  useEffect(() => { baselineRef.current = baseline; presetRef.current = preset; sourceRef.current = source; busyRef.current = busy; }, [baseline, preset, source, busy]);
  const install = useCallback((state: SourceState) => {
    const value = validateInterfaceStylePreset(state.preset);
    setBaseline(value);
    setSource(state);
    dispatch({ type: "load", preset: clone(value) });
    setMessage(state.needsSynchronisation ? "Guide tables need synchronising. Save Interface Styles to update them." : "Source loaded");
  }, []);

  useEffect(() => {
    const client = createSharedStylesClient({ scope: "interface" });
    clientRef.current = client;
    activeRef.current = true;
    async function load(initial = false) {
      if (loadingRef.current || (!initial && busyRef.current)) return;
      loadingRef.current = true;
      try {
        const state = await client.load(sourceRef.current?.token);
        if (!activeRef.current) return;
        if (initial || JSON.stringify(presetRef.current) === JSON.stringify(baselineRef.current)) install(state);
        else if (state.revision !== sourceRef.current?.revision) setMessage("Source changed externally. Your draft is preserved. Reload Source before saving.");
      } catch (error) { if (activeRef.current) setMessage(error instanceof Error ? error.message : "Source saving is unavailable."); }
      finally { loadingRef.current = false; if (initial && activeRef.current) { busyRef.current = false; setBusy(false); } }
    }
    void load(true);
    const refresh = () => { void load(); };
    window.addEventListener("focus", refresh);
    return () => { activeRef.current = false; window.removeEventListener("focus", refresh); };
  }, [install]);

  const undo = useCallback(() => !busyRef.current && dispatch({ type: "undo" }), []);
  const redo = useCallback(() => !busyRef.current && dispatch({ type: "redo" }), []);
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".interface-style-page");
    const listener = (event: KeyboardEvent) => { if (!event.isComposing) handleStudioHistoryShortcut(event, navigator.platform, undo, redo); };
    page?.addEventListener("keydown", listener);
    return () => page?.removeEventListener("keydown", listener);
  }, [undo, redo]);

  function change(path: string, value: unknown, editKey = path) {
    if (busyRef.current) return;
    setMessage("Unsaved changes");
    dispatch({ type: "change", editKey, update: current => setPath(current, path, value) });
  }
  function reset(path: string) { change(path, getPath(baseline, path), undefined); }
  function resetSection() {
    dispatch({ type: "change", update: current => setPath(current, scope, clone(getPath(baseline, scope))) });
    setMessage("Unsaved changes");
  }
  function resetAll() { dispatch({ type: "change", update: () => clone(baseline) }); setMessage("Unsaved changes"); }
  async function reloadSource() {
    if (busyRef.current || !clientRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("Reloading source…");
    try { install(await clientRef.current.load(source?.token)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Source could not be loaded."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function save() {
    if (busyRef.current || !source || !clientRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("Saving interface styles…");
    try {
      const saved = await clientRef.current.save(preset, source);
      const value = validateInterfaceStylePreset(saved.preset);
      setBaseline(value); setSource(saved); dispatch({ type: "saved", preset: value }); setMessage("Saved to source");
      window.dispatchEvent(new Event("studio-shared-styles-saved"));
      const channel = new BroadcastChannel("studio-shared-styles-refresh"); channel.postMessage("refresh"); channel.close();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Saving failed. Your draft is preserved."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const selectedScope = scopes.find(item => item.id === scope)!;
  const sourceDocument = source?.source.document ?? "The canonical Style Guide source is loading.";
  const sourceJson = JSON.stringify(source?.preset ?? INTERFACE_STYLE_PRESET, null, 2);
  const editorStyle = { ...variables, "--studio-range-accent": variables["--acm-ui-color-control-accent"], "--studio-range-hover-accent": variables["--acm-ui-color-control-hover"], "--studio-range-pressed-accent": variables["--acm-ui-color-control-pressed"] } as CSSProperties;

  return <InterfaceStyleScope preset={preset}><section className="interface-style-page" style={editorStyle} aria-labelledby="interface-style-title" onBlurCapture={() => dispatch({ type: "end-edit" })}>
    <header className="ui-page-intro interface-style-intro"><p className="rl-eyebrow">ACM STUDIO</p><h1 id="interface-style-title">Interface Styles</h1><p>Set the colours, typography, fields, buttons, and hover behaviour used across the Studio interface.</p></header>
    <div className="interface-style-toolbar"><HistoryActions onUndo={undo} onRedo={redo} canUndo={Boolean(history.past.length)} canRedo={Boolean(history.future.length)} disabled={busy} undoLabel="Undo interface style change" redoLabel="Redo interface style change"/><span className="interface-style-status" role="status">{dirty && message === "Source loaded" ? "Unsaved changes" : message}</span><StudioButton type="button" disabled={busy || !source || (!dirty && !source.needsSynchronisation)} onClick={() => { void save(); }}>Save Interface Styles</StudioButton><StudioButton variant="secondary" type="button" disabled={busy} title="Load the current interface style source and discard unsaved changes" onClick={() => { void reloadSource(); }}>Reload Source</StudioButton><StudioButton variant="text" type="button" disabled={busy} onClick={resetAll}><AcmIcon name="action.reset" size={17}/>Reset All</StudioButton></div>
    <div className="interface-style-layout">
      <nav className="interface-style-navigation" aria-label="Interface style settings">{scopes.map(item => <button key={item.id} type="button" aria-current={scope === item.id ? "page" : undefined} onClick={() => { setScope(item.id); window.history.replaceState(null, "", `#interface-style-${item.id}`); }}>{item.label}</button>)}</nav>
      <section id={`interface-style-${scope}`} className="interface-style-settings" aria-labelledby="interface-style-section-title"><div className="interface-style-section-heading"><div><h2 id="interface-style-section-title">{selectedScope.label}</h2><p>{selectedScope.description}</p></div><StudioButton variant="text" type="button" onClick={resetSection}>Reset Section</StudioButton></div>
        {scope === "colours" ? <div className="interface-style-field-grid">{colourFields.map(({ key, label }) => { const path = `colours.${key}`; return <Setting key={path} label={label} path={path} baseline={baseline} onReset={reset}><TextInput aria-label={label} value={preset.colours[key]} onChange={event => { if (validColour(event.target.value)) change(path, event.target.value.toUpperCase()); }} /></Setting>; })}</div> : null}
        {scope === "typography" ? <div className="interface-style-typography-grid">{(["control", "header"] as const).map(role => <fieldset className="interface-style-card" key={role}><legend>{role === "control" ? "Compact controls" : "Application header"}</legend><Setting label="Font family" path={`typography.${role}.family`} baseline={baseline} onReset={reset}><SelectControl aria-label={`${role} font family`} value={preset.typography[role].family} onChange={event => change(`typography.${role}.family`, event.target.value)}><option value="system-sans">System Sans</option><option value="inter">Inter</option></SelectControl></Setting><Setting label="Font size" path={`typography.${role}.size`} baseline={baseline} onReset={reset}><NumberInput aria-label={`${role} font size`} min={13} max={role === "header" ? 32 : 24} value={preset.typography[role].size} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 13 && value <= (role === "header" ? 32 : 24)) change(`typography.${role}.size`, value); }} /></Setting><Setting label="Font weight" path={`typography.${role}.weight`} baseline={baseline} onReset={reset}><NumberInput aria-label={`${role} font weight`} min={100} max={900} step={100} value={preset.typography[role].weight} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 100 && value <= 900) change(`typography.${role}.weight`, value); }} /></Setting><p className="interface-style-type-specimen" style={{ fontFamily: `var(--acm-ui-font-${role})`, fontSize: `var(--acm-ui-size-${role})`, fontWeight: `var(--acm-ui-weight-${role})` } as CSSProperties}>{role === "control" ? "A control label and its value" : "ACM Studio · Interface Styles"}</p></fieldset>)}</div> : null}
        {scope === "fields" ? <div className="interface-style-card interface-style-radius-setting"><Setting label="Field corner radius" path="fields.radius" baseline={baseline} onReset={reset}><NumberInput aria-label="Field corner radius" min={0} max={16} value={preset.fields.radius} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 16) change("fields.radius", value); }} /></Setting><p>Applies to shared text, number, select, and text-area fields. Panels, menus, and authored website content keep their own radii.</p></div> : null}
        {scope === "buttons" ? <div className="interface-style-button-settings">{(Object.keys(buttonLabels) as (keyof typeof buttonLabels)[]).map(role => <fieldset className="interface-style-card" key={role}><legend>{buttonLabels[role]} button</legend>{(["background", "foreground", "border"] as const).map(property => { const path = `buttons.${role}.${property}`; return <Setting key={path} label={property} path={path} baseline={baseline} onReset={reset}><TextInput aria-label={`${buttonLabels[role]} button ${property}`} value={preset.buttons[role][property]} onChange={event => { if (validColour(event.target.value)) change(path, event.target.value.toUpperCase()); }} /></Setting>; })}<Setting label="Border width" path={`buttons.${role}.borderWidth`} baseline={baseline} onReset={reset}><NumberInput aria-label={`${buttonLabels[role]} button border width`} min={0} max={12} value={preset.buttons[role].borderWidth} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 12) change(`buttons.${role}.borderWidth`, value); }} /></Setting><StudioButton type="button" variant={role}>{buttonLabels[role]} button</StudioButton></fieldset>)}</div> : null}
        {scope === "interactions" ? <div className="interface-style-interaction-settings">{(Object.keys(interactionLabels) as (keyof InterfaceStylePreset["interactions"])[]).map(key => <fieldset className="interface-style-interaction-row" key={key}><legend>{interactionLabels[key]}</legend><Setting label="Hover treatment" path={`interactions.${key}.treatment`} baseline={baseline} onReset={reset}><SelectControl aria-label={`${interactionLabels[key]} hover treatment`} value={preset.interactions[key].treatment} onChange={event => change(`interactions.${key}.treatment`, event.target.value)}>{hoverTreatments.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectControl></Setting><Setting label="Hover text or icon" path={`interactions.${key}.foreground`} baseline={baseline} onReset={reset}><TextInput aria-label={`${interactionLabels[key]} hover foreground`} value={preset.interactions[key].foreground} onChange={event => { if (validColour(event.target.value)) change(`interactions.${key}.foreground`, event.target.value.toUpperCase()); }} /></Setting><Setting label="Hover background" path={`interactions.${key}.background`} baseline={baseline} onReset={reset}><TextInput aria-label={`${interactionLabels[key]} hover background`} value={preset.interactions[key].background} onChange={event => { if (validColour(event.target.value)) change(`interactions.${key}.background`, event.target.value.toUpperCase()); }} /></Setting></fieldset>)}</div> : null}
      </section>
      <aside className="interface-style-preview" aria-label="Production control previews"><h2>Live preview</h2><p>These examples use the shared controls used across ACM Studio.</p><div className="interface-style-preview-surface"><label>Shared text field<TextInput aria-label="Preview text field" placeholder="Text field" defaultValue="Example" /></label><label>Shared select<SelectControl aria-label="Preview select"><option>Default</option><option>Alternative</option></SelectControl></label><div className="interface-style-preview-actions"><StudioButton type="button">Base action</StudioButton><StudioButton type="button" variant="secondary">Secondary</StudioButton><StudioButton type="button" variant="text">Text action</StudioButton><button type="button" className="studio-adjustment-action interface-preview-adjust" aria-label="Adjustment action" title="Adjustment action"><AcmIcon name="action.adjust" size={20}/></button></div><ToggleSetting label="Enabled toggle" checked={toggleValue} onChange={setToggleValue}/><RangeControl aria-label="Standard slider" min="0" max="100" value={rangeValue} onChange={event => setRangeValue(Number(event.target.value))}/><InspectorToolsSection title="Inspector options" options={[{ id: "colour", label: "Colour" }, { id: "font", label: "Font" }]} visible={visibleOptions} showCloseControl={false} menuWidth={240} onToggle={id => setVisibleOptions(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => setVisibleOptions(new Set())}><TextInput aria-label="Inspector control example" defaultValue="Shared field" /></InspectorToolsSection></div><details className="interface-style-source"><summary>Preset source and written guide</summary><h3>Interface preset JSON</h3><pre>{sourceJson}</pre><h3>Written Style Guide</h3><pre>{sourceDocument}</pre></details></aside>
    </div>
  </section></InterfaceStyleScope>;
}

function Setting({ label, path, onReset, children }: { label: string; path: string; baseline: InterfaceStylePreset; onReset: (path: string) => void; children: ReactNode }) {
  return <div className="interface-style-setting"><label>{label}{children}</label><StudioButton variant="text" type="button" aria-label={`Reset ${label}`} title={`Reset ${label}`} onClick={() => onReset(path)}>Reset</StudioButton></div>;
}
