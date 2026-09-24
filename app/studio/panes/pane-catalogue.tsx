"use client";

import { useEffect, useRef, useState } from "react";
import { StudioIcon } from "../studio-icons";
import { defaultRegions, paneContractVersion, paneExamples, paneStructure, paneTokens, skeletonDefinition, type RegionOptions } from "./catalogue-model";
import { PaneSpecimen } from "./pane-specimen";
import snapshots from "./source-snapshots.json";
import "./pane-library.css";

const sections = ["Overview", "Skeletons", "Studio Examples"] as const;
type CatalogueSection = typeof sections[number];

export function PaneCatalogue() {
  const [section, setSection] = useState<CatalogueSection>("Overview");
  const [exampleId, setExampleId] = useState(paneExamples[0].id);
  const [layout, setLayout] = useState<"both" | "left" | "right">("both");
  const [options, setOptions] = useState(defaultRegions);
  const [content, setContent] = useState<"normal" | "empty" | "long">("normal");
  const [width, setWidth] = useState("available");
  const [boundaries, setBoundaries] = useState(false);
  const [selected, setSelected] = useState("workspace");
  const [revision, setRevision] = useState(0);
  const [second, setSecond] = useState(false);
  const [metrics, setMetrics] = useState<{ dimensions: string; tokens: Record<string, string> }>({ dimensions: "", tokens: {} });
  const host = useRef<HTMLDivElement>(null);
  const studio = section === "Studio Examples";
  const definition = studio ? paneExamples.find((item) => item.id === exampleId)! : skeletonDefinition;
  const regions: RegionOptions = studio ? { header: true, tabs: definition.tabs.length > 0, toolbar: definition.toolbar, footer: definition.footer } : section === "Overview" ? defaultRegions : options;
  const actualLayout = studio ? definition.side : section === "Overview" ? "both" : layout;
  const sides: ("left" | "right")[] = actualLayout === "both" ? ["left", "right"] : [actualLayout];
  const structure = paneStructure(sides, regions);
  const selection = structure.find((item) => item.id === selected) ?? structure[0];
  const specimenKey = `${section}-${exampleId}-${actualLayout}-${revision}`;

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const target = [...root.querySelectorAll<HTMLElement>("[data-pane-region]")].find((node) => node.dataset.paneRegion === selection.id);
    if (!target) return;
    target.setAttribute("data-pane-inspected", "true");
    function measure() {
      if (!target || !root) return;
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      setMetrics({ dimensions: target.getClientRects().length ? `${Math.round(rect.width)} × ${Math.round(rect.height)} px` : "Hidden — reopen the pane to inspect this region.", tokens: Object.fromEntries(paneTokens.map((token) => [token, style.getPropertyValue(token).trim()])) });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(root);
    return () => { observer.disconnect(); target.removeAttribute("data-pane-inspected"); };
  }, [selection.id, specimenKey, width, regions.header, regions.tabs, regions.toolbar, regions.footer, content]);

  function chooseSection(next: CatalogueSection) { setSection(next); setSelected("workspace"); }
  function reset() { setRevision((value) => value + 1); setContent("normal"); }
  const specimen = <PaneSpecimen key={specimenKey} definition={definition} regions={regions} layout={actualLayout} content={content} studio={studio} />;

  return <main className="pl-catalogue">
    <header className="pl-header"><a href="/studio"><StudioIcon name="arrow-left" size={20} />ACM Studio</a><strong>Pane Library</strong><span className="pl-badge">Skeletons · v{paneContractVersion}</span></header>
    <div className="pl-intro"><p className="pl-eyebrow">Foundations / Panes</p><h1>A consistent frame for your tools.</h1><p>Explore the panes you use, their structure and their collapse controls.</p></div>
    <nav className="pl-sections" aria-label="Pane Library Sections">{sections.map((name) => <button type="button" key={name} aria-current={section === name ? "page" : undefined} onClick={() => chooseSection(name)}>{name}</button>)}</nav>
    <div className="pl-catalogue-layout">
      <aside className="pl-navigation" aria-label="Pane Examples and Structure">
        {studio && <label className="pl-field">Studio Example<select value={exampleId} onChange={(event) => { setExampleId(event.target.value as typeof exampleId); setSelected("workspace"); }}>{paneExamples.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        <h2>Structure</h2><ul className="pl-structure">{structure.map((item) => <li key={item.id} className={item.id.includes(".") ? "pl-structure-child" : ""}><button type="button" aria-pressed={selection.id === item.id} onClick={() => setSelected(item.id)}>{item.label}</button></li>)}</ul>
        <a className="pl-related" href="/studio/ribbon">Open Ribbon Library<StudioIcon name="arrow-right" size={18} /></a>
      </aside>
      <section className="pl-main" aria-label="Pane Specimens">
        <div className="pl-specimen-heading"><p className="pl-eyebrow">{studio ? "Studio example" : "Working skeleton"}</p><h2>{studio ? definition.label : "Left pane. Workspace. Right pane."}</h2><p>{studio ? definition.description : "The same structure supports navigation, libraries and inspectors. Each region has a clear role."}</p></div>
        {section === "Skeletons" && <fieldset className="pl-options"><legend>Skeleton Regions</legend><label className="pl-field">Layout<select value={layout} onChange={(event) => setLayout(event.target.value as typeof layout)}><option value="both">Left and Right</option><option value="left">Left Only</option><option value="right">Right Only</option></select></label>{(Object.keys(options) as (keyof RegionOptions)[]).map((key) => <label className="pl-check" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => setOptions((previous) => ({ ...previous, [key]: event.target.checked }))} />{key === "toolbar" ? "Toolbar / Search" : key.charAt(0).toUpperCase() + key.slice(1)}</label>)}</fieldset>}
        <div className="pl-preview-tools">
          <label className="pl-check"><input type="checkbox" checked={boundaries} onChange={(event) => setBoundaries(event.target.checked)} />Show Boundaries</label>
          <label className="pl-field">Content<select value={content} onChange={(event) => setContent(event.target.value as typeof content)}><option value="normal">Normal</option><option value="empty">Empty</option><option value="long">Long</option></select></label>
          <label className="pl-field">Preview Width<select value={width} onChange={(event) => setWidth(event.target.value)}><option value="available">Available Width</option><option value="1280">1280px</option><option value="768">768px</option><option value="390">390px</option></select></label>
          <button className="pl-button" type="button" onClick={reset}><StudioIcon name="undo" size={18} />Reset Demo</button>
        </div>
        <div className="pl-preview-frame" style={{ width: width === "available" ? "100%" : `${width}px` }}>
          {/* Keyboard users must be able to scroll this fixed-width specimen viewport. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div ref={host} className={`pl-preview-viewport${boundaries ? " pl-boundaries" : ""}`} role="region" aria-label="Scrollable Pane Preview" tabIndex={0}>{specimen}</div>
        </div>
        <p className="pl-caption">Fixed-width panes. Narrow previews scroll horizontally; collapse controls stay available. Changes are temporary.</p>
        <label className="pl-check"><input type="checkbox" checked={second} onChange={(event) => setSecond(event.target.checked)} />Show Second Independent Specimen</label>
        {/* The second specimen needs the same keyboard scrolling entry point. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        {second && <div className="pl-preview-viewport pl-second" role="region" aria-label="Second Scrollable Pane Preview" tabIndex={0}><PaneSpecimen key={`second-${specimenKey}`} definition={definition} regions={regions} layout={actualLayout} content={content} studio={studio} /></div>}
        <details className="pl-source"><summary>Source reference · {snapshots.commit.slice(0, 7)}</summary><p>Captured {snapshots.capturedAt}. Structural examples with isolated sample state; live Studio panes use the same shared Pane components.</p>{studio && <p>{definition.sourceComponent} · {definition.width}px<br /><code>{definition.source}</code></p>}<p>Fixed headers, consistent spacing and always-available edge controls are shared structure; product data and actions remain feature-owned.</p><ul>{snapshots.files.map((file) => <li key={file.path}><code>{file.path}</code><br /><span className="pl-hash">SHA-256 {file.sha256}</span></li>)}</ul></details>
      </section>
      <aside className="pl-inspector" aria-label="Pane Structure Inspector"><p className="pl-eyebrow">Structure inspector</p><h2>{selection.label}</h2><p>{selection.description}</p><h3>Rendered Size</h3><p aria-live="polite">{metrics.dimensions}</p><h3>Computed Tokens</h3><p className="pl-muted">Read from the selected rendered region. Inspection applies to the first specimen.</p><dl>{Object.entries(metrics.tokens).map(([name, value]) => <div key={name}><dt>{name.replace("--pane-", "")}</dt><dd>{value || "Not set"}</dd></div>)}</dl></aside>
    </div>
  </main>;
}
