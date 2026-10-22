"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AcmIcon } from "@acm/icons/react";
import { interfaceStylePresetToCssVariables, validateInterfaceStylePreset, type InterfaceStylePreset } from "@acm/styles";
import { INTERFACE_STYLE_PRESET, STYLE_GUIDE_MARKDOWN } from "./canonical-style-guide";
import { StudioButton } from "../../controls/button";
import { HistoryActions } from "../../controls/history-actions";
import { SelectControl, TextInput } from "../../controls/native-fields";
import { RangeControl } from "../../controls/range-control";
import { ToggleSetting } from "../../controls/toggle-setting";
import { InspectorToolsSection } from "../../inspector-tools-section";
import { createSharedStylesClient } from "./shared-styles-client.mjs";
import { interfaceStyleHistoryReducer } from "./interface-style-history";
import { InterfaceStyleScope } from "./interface-style-scope";
import { InterfaceStyleSettings, interfaceStyleSectionFromHash, interfaceStyleSections as scopes, type InterfaceStyleSection as Scope } from "./interface-style-settings";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import { InterfaceStyleSourceInspector, useInterfaceStyleInspection, type GuideMapping } from "./interface-style-inspection";
import { parseStyleGuidePresets } from "./style-guide-tokens.mjs";
import "./interface-style-sandbox.css";

type SourceState = { preset: InterfaceStylePreset; revision: string; token: string; source: { document: string; mappings: Record<string, GuideMapping> } };

function clone<T>(value: T): T { return structuredClone(value); }
function subscribeSectionChange(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}
function currentSection() { return interfaceStyleSectionFromHash(window.location.hash); }
function serverSection(): Scope { return "colours"; }
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

export function InterfaceStyleSandbox() {
  const [history, dispatch] = useReducer(interfaceStyleHistoryReducer, undefined, () => ({ past: [], present: clone(INTERFACE_STYLE_PRESET), future: [] }));
  const preset = history.present;
  const inspection = useInterfaceStyleInspection(preset);
  const [baseline, setBaseline] = useState<InterfaceStylePreset>(INTERFACE_STYLE_PRESET);
  const [source, setSource] = useState<SourceState | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Loading source…");
  // The first hydration matches the server; the URL section follows afterwards.
  const scope = useSyncExternalStore(subscribeSectionChange, currentSection, serverSection);
  function setScope(value: Scope) {
    window.history.replaceState(null, "", `#interface-style-${value}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  const [rangeValue, setRangeValue] = useState(56);
  const [toggleValue, setToggleValue] = useState(true);
  const [visibleOptions, setVisibleOptions] = useState<ReadonlySet<string>>(new Set(["font", "size"]));
  const clientRef = useRef<ReturnType<typeof createSharedStylesClient> | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  const activeRef = useRef(true);
  const loadingRef = useRef(false);
  const baselineRef = useRef(baseline);
  const presetRef = useRef(preset);
  const sourceRef = useRef(source);
  const busyRef = useRef(busy);
  const originals = useMemo(() => parseStyleGuidePresets(source?.source.document ?? STYLE_GUIDE_MARKDOWN).originalInterfacePreset as InterfaceStylePreset, [source]);
  const canReset = JSON.stringify(preset) !== JSON.stringify(originals);
  const dirty = JSON.stringify(preset) !== JSON.stringify(baseline);
  const variables = useMemo(() => interfaceStylePresetToCssVariables(preset) as CSSProperties & Record<string, string>, [preset]);

  useEffect(() => { baselineRef.current = baseline; presetRef.current = preset; sourceRef.current = source; busyRef.current = busy; }, [baseline, preset, source, busy]);
  const install = useCallback((state: SourceState) => {
    const value = validateInterfaceStylePreset(state.preset);
    setBaseline(value);
    setSource(state);
    dispatch({ type: "load", preset: clone(value) });
    setMessage("Source loaded");
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
    // Document scope also reaches this editor's portalled picker and menu controls.
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !pageRef.current?.getClientRects().length) return;
      handleStudioHistoryShortcut(event, navigator.platform, undo, redo);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [undo, redo]);

  function change(path: string, value: unknown, editKey = path) {
    if (busyRef.current) return;
    setMessage("Unsaved changes");
    dispatch({ type: "change", editKey, update: current => setPath(current, path, value) });
  }
  function endEdit() { dispatch({ type: "end-edit" }); }
  function reset(path: string) {
    if (busyRef.current) return;
    dispatch({ type: "change", update: current => setPath(current, path, getPath(originals, path)) });
    setMessage("Unsaved changes");
  }
  function resetSection() {
    dispatch({ type: "change", update: current => setPath(current, scope, clone(getPath(originals, scope))) });
    setMessage("Unsaved changes");
  }
  function resetAll() { dispatch({ type: "change", update: () => clone(originals) }); setMessage("Unsaved changes"); }
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
  const sectionDirty = JSON.stringify(getPath(preset, scope)) !== JSON.stringify(getPath(originals, scope));
  const statusMessage = !dirty && message === "Unsaved changes" ? "No unsaved changes" : dirty && message === "Source loaded" ? "Unsaved changes" : message;
  const sourceDocument = source?.source.document ?? STYLE_GUIDE_MARKDOWN;
  const editorStyle = { ...variables, "--studio-range-accent": variables["--acm-ui-color-control-accent"], "--studio-range-hover-accent": variables["--acm-ui-color-control-hover"], "--studio-range-pressed-accent": variables["--acm-ui-color-control-pressed"] } as CSSProperties;

  return <section ref={pageRef} className="interface-style-page" aria-labelledby="interface-style-title" {...inspection.events} onBlurCapture={event => { endEdit(); inspection.events.onBlurCapture(event); }}>
    <header className="ui-page-intro interface-style-intro"><p className="rl-eyebrow">ACM STUDIO</p><h1 id="interface-style-title">Interface Styles</h1><p>Set the colours, typography, fields, buttons, and hover behaviour used across the Studio interface.</p></header>
    <div className="interface-style-toolbar"><HistoryActions onUndo={undo} onRedo={redo} canUndo={Boolean(history.past.length)} canRedo={Boolean(history.future.length)} disabled={busy} undoLabel="Undo interface style change" redoLabel="Redo interface style change"/><ToggleSetting label="Hover Inspection" checked={inspection.enabled} onChange={inspection.setEnabled}/><span className="interface-style-status" role="status">{statusMessage}</span><StudioButton type="button" disabled={busy || !source || !dirty} onClick={() => { void save(); }}>Save Interface Styles</StudioButton><StudioButton variant="secondary" type="button" disabled={busy} title="Load the current interface style source and discard unsaved changes" onClick={() => { void reloadSource(); }}>Reload Source</StudioButton><StudioButton variant="text" type="button" disabled={busy || !canReset} onClick={resetAll}><AcmIcon name="action.reset" size={17}/>Reset All</StudioButton></div>
    <div className="interface-style-layout" data-canonical-source-layout>
      <nav className="interface-style-navigation" aria-label="Interface style settings">{scopes.map(item => <button key={item.id} type="button" aria-current={scope === item.id ? "page" : undefined} onClick={() => setScope(item.id)}>{item.label}</button>)}</nav>
      <section id={`interface-style-${scope}`} className="interface-style-settings" data-inspector-popover-owner aria-labelledby="interface-style-section-title"><div className="interface-style-section-heading"><div><h2 id="interface-style-section-title">{selectedScope.label}</h2><p>{selectedScope.description}</p></div><StudioButton variant="text" type="button" disabled={busy || !sectionDirty} onClick={resetSection}>Reset Section</StudioButton></div>
        <InterfaceStyleSettings key={scope} section={scope} preset={preset} baseline={originals} disabled={busy} inspectedPath={inspection.path} onChange={change} onReset={reset} onEndEdit={endEdit} />
      </section>
      <div className="interface-style-preview-column"><InterfaceStyleSourceInspector path={inspection.path} pinned={inspection.pinned === inspection.path} baseline={baseline} draft={preset} guideDocument={sourceDocument} mapping={(source?.source.mappings ?? {})[`interface.${inspection.path}`]} onPin={inspection.pin} onClear={inspection.clear}/><aside className="interface-style-preview" aria-label="Production control previews" style={editorStyle} data-inspector-popover-owner><InterfaceStyleScope preset={preset}><h2>Live preview</h2><p>These examples use the shared controls used across ACM Studio.</p><div className="interface-style-preview-surface"><label data-style-path="fields.radius">Shared text field<TextInput aria-label="Preview text field" placeholder="Text field" defaultValue="Example" /></label><label data-style-path="interactions.fields.treatment">Shared select<SelectControl aria-label="Preview select"><option>Default</option><option>Alternative</option></SelectControl></label><div className="interface-style-preview-actions"><StudioButton data-style-path="buttons.base.background" type="button">Base action</StudioButton><StudioButton data-style-path="buttons.secondary.background" type="button" variant="secondary">Secondary</StudioButton><StudioButton data-style-path="buttons.outline.background" type="button" variant="outline">Outline</StudioButton><StudioButton type="button" disabled>Disabled</StudioButton><StudioButton data-style-path="interactions.textActions.foreground" type="button" variant="text">Text action</StudioButton><button type="button" data-style-path="interactions.iconActions.foreground" className="studio-adjustment-action interface-preview-adjust" aria-label="Adjustment action" title="Adjustment action"><AcmIcon name="action.adjust" size={20}/></button></div><div data-style-path="colours.controlAccent"><ToggleSetting label="Enabled toggle" checked={toggleValue} onChange={setToggleValue}/><RangeControl data-style-path="colours.controlAccent" aria-label="Standard slider" min="0" max="100" value={rangeValue} onChange={event => setRangeValue(Number(event.target.value))}/></div><div data-style-path="interactions.inspectorOptions.foreground"><InspectorToolsSection title="Inspector options" options={[{ id: "colour", label: "Colour" }, { id: "font", label: "Font" }]} visible={visibleOptions} showCloseControl={false} menuWidth={240} onToggle={id => setVisibleOptions(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => setVisibleOptions(new Set())}><TextInput aria-label="Inspector control example" defaultValue="Shared field" /></InspectorToolsSection></div></div></InterfaceStyleScope></aside></div>
    </div>
  </section>;
}
