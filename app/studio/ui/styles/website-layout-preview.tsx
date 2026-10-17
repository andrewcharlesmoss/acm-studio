"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import type { StyleViewport } from "@acm/styles";
import type { WebsiteLayoutOrigin, WebsiteLayoutOverrides } from "../../website-layout";
import { SelectControl } from "../../controls/native-fields";
import { NumberUnitField } from "../../controls/number-unit-field";
import { RangeControl } from "../../controls/range-control";
import { HistoryActions } from "../../controls/history-actions";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import { createPreviewHistory, parsePreviewNumber, previewHistoryReducer, resolvePreview, type PreviewScope } from "./website-layout-preview-state";

const viewports = ["desktop", "tablet", "mobile"] as const;
const names = { profile: "Shared Profile", journal: "Sample Journal", portfolio: "Sample Portfolio" };
function originLabel(origin: WebsiteLayoutOrigin & { viewport?: StyleViewport }, scope: PreviewScope, viewport?: StyleViewport) {
  const source = origin.scope === "defaults" ? "Illustrative Defaults" : origin.scope === "profile" ? "Sample Websites" : names[scope];
  const fallback = viewport && origin.viewport !== viewport ? " · Desktop fallback" : "";
  return `${origin.scope === (scope === "profile" ? "profile" : "template") && !fallback ? "Custom" : "Inherited"} · ${source}${fallback}`;
}
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
  function historyAction(type: "undo" | "redo" | "reset") { setFieldEpoch(value => value + 1); dispatch({ type }); }
  useEffect(() => {
    const root = rootRef.current;
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { setFieldEpoch(value => value + 1); dispatch({ type: "undo" }); }, () => { setFieldEpoch(value => value + 1); dispatch({ type: "redo" }); });
    root?.addEventListener("keydown", listener);
    return () => root?.removeEventListener("keydown", listener);
  }, []);
  const [scope, setScope] = useState<PreviewScope>("profile");
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const resolved = resolvePreview(history.present, scope);
  const overrides = history.present[scope];
  const endEdit = () => dispatch({ type: "end-edit" });
  function change(key: string, update: (current: WebsiteLayoutOverrides) => WebsiteLayoutOverrides) {
    dispatch({ type: "change", scope, overrides: update(overrides), editKey: `${scope}:${key}` });
  }
  function reset(key: "siteWidth" | "contentWidth" | "wideWidth" | "gutters") {
    const next = { ...overrides };
    if (key === "gutters") { next.gutters = { ...next.gutters }; delete next.gutters[viewport]; if (!Object.keys(next.gutters).length) delete next.gutters; }
    else delete next[key];
    dispatch({ type: "change", scope, overrides: next });
  }
  const width = viewport === "desktop" ? 1440 : viewport === "tablet" ? 768 : 390;
  const siteWidth = resolved.values.siteWidth.mode === "full" ? width : Math.min(width, resolved.values.siteWidth.maxWidth);
  const innerWidth = Math.max(0, siteWidth - 2 * resolved.values.gutters[viewport]);
  const contentWidth = Math.min(innerWidth, resolved.values.contentWidth);
  const wideWidth = Math.min(innerWidth, resolved.values.wideWidth);
  const sampleScopes = scope === "profile" ? ["journal", "portfolio"] as const : [scope];
  return <section className="website-layout-page" aria-label="Website Styles Layout" ref={rootRef}>
    <header><p className="rl-eyebrow">Website Styles · Layout</p><h1>Shared website layout</h1><p>Explore a shared profile and template inheritance using illustrative samples.</p><p className="website-preview-notice">Preview Only · Changes stay on this page. Existing sites and shared ACM defaults are unchanged.</p></header>
    <div className="website-layout-toolbar"><div className="sg-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => historyAction("undo")} onRedo={() => historyAction("redo")} /></div><div className="website-style-navigation" aria-label="Preview Viewport">{viewports.map(device => <button key={device} type="button" aria-pressed={viewport === device} onClick={() => { endEdit(); setViewport(device); }}>{device[0].toUpperCase() + device.slice(1)}</button>)}</div><button type="button" onClick={() => historyAction("reset")}>Reset Preview</button></div>
    <div className="website-layout-workbench"><aside className="website-layout-settings"><h2>Layout</h2><label className="website-scope-label">Editing<SelectControl className="website-layout-select" value={scope} onChange={event => { endEdit(); setScope(event.currentTarget.value as PreviewScope); }}>{Object.entries(names).map(([id, name]) => <option key={id} value={id}>{name}{id === "profile" ? " · Sample Websites" : " · Template"}</option>)}</SelectControl></label><p>Sample Journal and Sample Portfolio are fictitious templates linked to Sample Websites.</p>
      <div className="website-layout-setting"><h3>Site Width</h3><p>{originLabel(resolved.origins.siteWidth, scope)}</p><label>Width Mode<SelectControl className="website-layout-select" aria-label="Site Width Mode" value={overrides.siteWidth?.mode ?? "inherit"} onChange={event => { if (event.currentTarget.value === "inherit") reset("siteWidth"); else { change("siteWidth", current => ({ ...current, siteWidth: event.currentTarget.value === "full" ? { mode: "full" } : { mode: "max", maxWidth: resolved.values.siteWidth.mode === "max" ? resolved.values.siteWidth.maxWidth : 1440 } })); endEdit(); } }}><option value="inherit">Inherit</option><option value="full">Full Width</option><option value="max">Custom Maximum</option></SelectControl></label>{resolved.values.siteWidth.mode === "max" ? <Measurement key={`${scope}:${fieldEpoch}:site`} label="Site Width" value={resolved.values.siteWidth.maxWidth} onChange={value => change("siteWidth", current => ({ ...current, siteWidth: { mode: "max", maxWidth: value } }))} onEnd={endEdit} /> : <p>Full width of the available viewport.</p>}<button type="button" disabled={!Object.hasOwn(overrides, "siteWidth")} onClick={() => reset("siteWidth")}>Reset to Inherited</button></div>
      {(["contentWidth", "wideWidth"] as const).map(key => <div className="website-layout-setting" key={key}><h3>{key === "contentWidth" ? "Content Width" : "Wide Width"}</h3><p>{originLabel(resolved.origins[key], scope)}</p><Measurement key={`${scope}:${fieldEpoch}:${key}`} label={key === "contentWidth" ? "Content Width" : "Wide Width"} value={resolved.values[key]} onChange={value => change(key, current => ({ ...current, [key]: value }))} onEnd={endEdit} /><button type="button" disabled={!Object.hasOwn(overrides, key)} onClick={() => reset(key)}>Reset to Inherited</button></div>)}
      <div className="website-layout-setting"><h3>Page Gutters · {viewport[0].toUpperCase() + viewport.slice(1)}</h3><p>{originLabel(resolved.origins.gutters[viewport], scope, viewport)}</p><Measurement key={`${scope}:${fieldEpoch}:${viewport}:gutter`} label="Page Gutters" gutter value={resolved.values.gutters[viewport]} onChange={value => change(`gutters.${viewport}`, current => ({ ...current, gutters: { ...current.gutters, [viewport]: value } }))} onEnd={endEdit} /><button type="button" disabled={!Object.hasOwn(overrides.gutters ?? {}, viewport)} onClick={() => reset("gutters")}>Reset to Inherited</button><p>Tablet and Mobile fall back to Desktop unless explicitly set. Mobile never inherits Tablet.</p></div>
    </aside><div className="website-layout-previews"><h2>Live preview</h2><p>{width}px {viewport} viewport · Widths shrink to fit available space. Samples are scaled to fit.</p>{sampleScopes.map(sample => {
      const layout = resolvePreview(history.present, sample);
      const frame = layout.values.siteWidth.mode === "full" ? width : Math.min(width, layout.values.siteWidth.maxWidth);
      const available = Math.max(0, frame - 2 * layout.values.gutters[viewport]);
      const content = Math.min(available, layout.values.contentWidth);
      const wide = Math.min(available, layout.values.wideWidth);
      return <figure key={sample}><figcaption>{names[sample]} · Illustrative template</figcaption><div className="website-preview-viewport" style={{ maxWidth: width }}><div className="website-preview-site" style={{ width: `${frame / width * 100}%`, "--preview-gutter": `${Math.min(frame / 2, layout.values.gutters[viewport]) / frame * 100}%`, "--preview-content": `${content / frame * 100}%`, "--preview-wide": `${wide / frame * 100}%` } as CSSProperties}><div className="website-preview-header">{names[sample]}</div><div className="website-preview-content"><span>Content · {layout.values.contentWidth}px maximum</span><h3>A place for thoughtful ideas</h3><p>Readable text stays within its content column while wider artwork has room to breathe.</p></div><div className="website-preview-wide"><span>Wide · {layout.values.wideWidth}px maximum</span><div className="website-preview-artwork" aria-hidden="true" /></div><div className="website-preview-content"><p>Shared decisions flow through to each inheriting template.</p></div><div className="website-preview-footer">Gutters · {layout.values.gutters[viewport]}px each side</div></div></div></figure>;
    })}<p className="website-preview-summary">Selected layout: site {siteWidth}px · content {contentWidth}px · wide {wideWidth}px after gutters.</p></div></div>
  </section>;
}
