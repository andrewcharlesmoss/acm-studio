"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { StyleViewport } from "@acm/styles";
import type { WebsiteLayoutOverrides } from "../../website-layout";
import { WebsiteLayoutEditorPreview } from "./website-layout-editor-preview";
import { SelectControl } from "../../controls/native-fields";
import { NumberUnitField } from "../../controls/number-unit-field";
import { RangeControl } from "../../controls/range-control";
import { HistoryActions } from "../../controls/history-actions";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import { createPreviewHistory, previewDefaults, parsePreviewNumber, previewHistoryReducer, resolvePreview } from "./website-layout-preview-state";

const viewports = ["desktop", "tablet", "mobile"] as const;
function Measurement({ label, value, gutter = false, onChange, onEnd }: { label: string; value: number; gutter?: boolean; onChange: (number: number) => void; onEnd: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const invalid = text !== null && parsePreviewNumber(text, gutter) === null;
  return <div className="website-measurement">
    <RangeControl aria-label={`${label} slider`} min={gutter ? 0 : Math.min(240, value)} max={Math.max(gutter ? 96 : 1920, value)} step="any" value={value} tooltipText={`${value}px`} onChange={event => { setText(null); onChange(Math.round(Number(event.currentTarget.value))); }} onPointerUp={onEnd} onPointerCancel={onEnd} onBlur={onEnd} onKeyUp={onEnd} />
    <NumberUnitField inputProps={{ "aria-label": label, "aria-invalid": invalid, min: gutter ? 0 : 1, max: gutter ? 512 : 8192, step: "any", value: text ?? value, onChange: event => { const input = event.currentTarget.value; setText(input); const number = parsePreviewNumber(input, gutter); if (number !== null) onChange(number); }, onBlur: () => { setText(null); onEnd(); } }} units={["px"]} unitProps={{ "aria-label": `${label} unit`, value: "px", disabled: true }} />
    {invalid ? <span className="website-field-error" role="status">Use {gutter ? "0–512" : "1–8192"}px.</span> : null}
  </div>;
}
export function WebsiteLayoutPreview() {
  const rootRef = useRef<HTMLElement>(null);
  const [history, dispatch] = useReducer(previewHistoryReducer, undefined, createPreviewHistory);
  const [fieldEpoch, setFieldEpoch] = useState(0);
  function historyAction(type: "undo" | "redo" | "reset") { setFieldEpoch(value => value + 1); if (type === "reset") setExampleEpoch(value => value + 1); dispatch({ type }); }
  useEffect(() => {
    const root = rootRef.current;
    const listener = (event: KeyboardEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".website-layout-settings, .website-layout-toolbar")) return;
      handleStudioHistoryShortcut(event, navigator.platform, () => { setFieldEpoch(value => value + 1); dispatch({ type: "undo" }); }, () => { setFieldEpoch(value => value + 1); dispatch({ type: "redo" }); });
    };
    root?.addEventListener("keydown", listener);
    return () => root?.removeEventListener("keydown", listener);
  }, []);
  const scope = "profile" as const;
  const [exampleEpoch, setExampleEpoch] = useState(0);
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const resolved = resolvePreview(history.present, scope);
  const overrides = history.present[scope];
  const endEdit = () => dispatch({ type: "end-edit" });
  function change(key: string, update: (current: WebsiteLayoutOverrides) => WebsiteLayoutOverrides) {
    dispatch({ type: "change", scope, overrides: update(overrides), editKey: `${scope}:${key}` });
  }
  function reset(key: "siteWidth" | "contentWidth" | "wideWidth" | "gutters") {
    const next = { ...overrides };
    if (key === "gutters") next.gutters = { ...next.gutters, [viewport]: previewDefaults.gutters[viewport] };
    else Object.assign(next, { [key]: key === "siteWidth" ? { ...previewDefaults.siteWidth } : previewDefaults[key] });
    dispatch({ type: "change", scope, overrides: next });
  }
  const resetLabel = "Reset to Default";
  function canReset(key: "siteWidth" | "contentWidth" | "wideWidth" | "gutters") {
    return JSON.stringify(key === "gutters" ? overrides.gutters?.[viewport] : overrides[key]) !== JSON.stringify(key === "gutters" ? previewDefaults.gutters[viewport] : previewDefaults[key]);
  }
  const width = viewport === "desktop" ? 1440 : viewport === "tablet" ? 768 : 390;
  const siteWidth = resolved.values.siteWidth.mode === "full" ? width : Math.min(width, resolved.values.siteWidth.maxWidth);
  const innerWidth = Math.max(0, siteWidth - 2 * resolved.values.gutters[viewport]);
  const contentWidth = Math.min(innerWidth, resolved.values.contentWidth);
  const wideWidth = Math.min(innerWidth, resolved.values.wideWidth);

  return <section className="website-layout-page" aria-label="Website Styles Layout" ref={rootRef}>
    <header><p className="rl-eyebrow">Website Styles · Layout</p><h1>Website layout</h1><p>Adjust website defaults and try them in a temporary block editor.</p><p className="website-preview-notice">Preview Only · Changes stay on this page. Existing sites and shared ACM defaults are unchanged.</p></header>
    <div className="website-layout-toolbar"><div className="sg-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => historyAction("undo")} onRedo={() => historyAction("redo")} /></div><div className="website-style-navigation" aria-label="Preview Viewport">{viewports.map(device => <button key={device} type="button" aria-pressed={viewport === device} onClick={() => { endEdit(); setViewport(device); }}>{device[0].toUpperCase() + device.slice(1)}</button>)}</div><button type="button" onClick={() => historyAction("reset")}>Reset Preview</button></div>
    <div className="website-layout-workbench"><aside className="website-layout-settings"><h2>Layout</h2><p>Canonical website defaults · Preview Only</p>
      <div className="website-layout-setting"><h3>Site Width</h3><p>Canonical</p><label>Width Mode<SelectControl className="website-layout-select" aria-label="Site Width Mode" value={overrides.siteWidth.mode} onChange={event => { change("siteWidth", current => ({ ...current, siteWidth: event.currentTarget.value === "full" ? { mode: "full" } : { mode: "max", maxWidth: resolved.values.siteWidth.mode === "max" ? resolved.values.siteWidth.maxWidth : 1440 } })); endEdit(); }}><option value="full">Full Width</option><option value="max">Custom Maximum</option></SelectControl></label>{resolved.values.siteWidth.mode === "max" ? <Measurement key={`${scope}:${fieldEpoch}:site`} label="Site Width" value={resolved.values.siteWidth.maxWidth} onChange={value => change("siteWidth", current => ({ ...current, siteWidth: { mode: "max", maxWidth: value } }))} onEnd={endEdit} /> : <p>Full width of the available viewport.</p>}<button type="button" disabled={!canReset("siteWidth")} onClick={() => reset("siteWidth")}>{resetLabel}</button></div>
      {(["contentWidth", "wideWidth"] as const).map(key => <div className="website-layout-setting" key={key}><h3>{key === "contentWidth" ? "Content Width" : "Wide Width"}</h3><p>Canonical</p><Measurement key={`${scope}:${fieldEpoch}:${key}`} label={key === "contentWidth" ? "Content Width" : "Wide Width"} value={resolved.values[key]} onChange={value => change(key, current => ({ ...current, [key]: value }))} onEnd={endEdit} /><button type="button" disabled={!canReset(key)} onClick={() => reset(key)}>{resetLabel}</button></div>)}
      <div className="website-layout-setting"><h3>Page Gutters · {viewport[0].toUpperCase() + viewport.slice(1)}</h3><p>Canonical</p><Measurement key={`${scope}:${fieldEpoch}:${viewport}:gutter`} label="Page Gutters" gutter value={resolved.values.gutters[viewport]} onChange={value => change(`gutters.${viewport}`, current => ({ ...current, gutters: { ...current.gutters, [viewport]: value } }))} onEnd={endEdit} /><button type="button" disabled={!canReset("gutters")} onClick={() => reset("gutters")}>{resetLabel}</button><p>Each viewport has its own gutter value.</p></div>
    </aside><div className="website-layout-previews"><h2>Block editor preview</h2><p>{width}px {viewport} viewport · Edit the example or switch to Preview. All changes are temporary.</p><WebsiteLayoutEditorPreview key={exampleEpoch} layout={resolved.values} viewport={viewport} onViewportChange={setViewport} /><p className="website-preview-summary">Selected layout: site {siteWidth}px · content {contentWidth}px · wide {wideWidth}px after gutters.</p></div></div>
  </section>;
}
