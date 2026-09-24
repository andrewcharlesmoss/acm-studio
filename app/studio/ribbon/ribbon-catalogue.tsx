"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { iconNames, iconMetadata, iconScales, type IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import "@acm/ribbon/styles.css";
import "./ribbon-library.css";
import { commandInventory, componentDescriptions, examples, flattenStructure, ribbonTokens, structureFor, type StructureNode } from "./catalogue-model";
import { controlPresentation, disabledReason, initialDemo, rangeValue } from "./demo-state";
import { RibbonPreview } from "./ribbon-preview";

import snapshots from "./source-snapshots.json";

type Section = "Overview" | "Components" | "Product Examples" | "Icons";
const sections: Section[] = ["Overview", "Components", "Product Examples", "Icons"];
const sectionIcons = { Overview: "library.designs", Components: "layout.columns", "Product Examples": "view.pages", Icons: "insert.shapes" } as const;
function Tree({ node, selected, choose, query }: { node: StructureNode; selected: string; choose: (node: StructureNode) => void; query: string }) {
  if (query && !flattenStructure(node).some((item) => (item.label + " " + item.component).toLowerCase().includes(query.toLowerCase()))) return null;
  return <li><button type="button" aria-current={selected === node.id ? "true" : undefined} onClick={() => choose(node)}><span>{node.label}</span><small>{node.component}</small></button>{node.children.length > 0 && <ul>{node.children.map((child) => <Tree key={child.id} node={child} selected={selected} choose={choose} query={query} />)}</ul>}</li>;
}
export function RibbonCatalogue() {
  const [section, setSection] = useState<Section>("Overview");
  const [exampleId, setExampleId] = useState("skeleton");
  const example = examples.find((item) => item.id === exampleId)!;
  const [tab, setTab] = useState(example.initialTab);
  const [state, setState] = useState(() => initialDemo(example));
  const [selectedId, setSelectedId] = useState("skeleton");
  const [query, setQuery] = useState("");
  const [iconQuery, setIconQuery] = useState("");
  const [golden, setGolden] = useState(false);
  const [dark, setDark] = useState(false);
  const [icon, setIcon] = useState<IconName>("action.undo");
  const [width, setWidth] = useState("fluid");
  const [outlines, setOutlines] = useState(false);
  const [metrics, setMetrics] = useState<{ dimensions: string; tokens: Record<string, string> }>({ dimensions: "Measuring…", tokens: {} });
  const [inspectionBox, setInspectionBox] = useState<{ left: number; top: number; width: number; height: number; borderRadius: string } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const tree = useMemo(() => structureFor(example), [example]);
  const nodes = useMemo(() => flattenStructure(tree), [tree]);
  const selected = nodes.find((node) => node.id === selectedId) ?? tree;
  const filteredIcons = iconNames.filter((name) => (!golden || iconMetadata[name].golden) && (name + " " + iconMetadata[name].label + " " + iconMetadata[name].keywords.join(" ")).toLowerCase().includes(iconQuery.toLowerCase()));
  function chooseExample(id: string) {
    const next = examples.find((item) => item.id === id)!;
    setExampleId(id); setState(initialDemo(next)); setTab(next.initialTab); setSelectedId(id);
  }
  function chooseSection(next: Section) {
    setSection(next); setQuery("");
    if (next === "Overview" || next === "Components") chooseExample("skeleton");
    if (next === "Product Examples" && exampleId === "skeleton") chooseExample("studio");
  }
  function inspect(node: StructureNode) {
    setSelectedId(node.id);
    if (node.tab) setTab(node.tab);
    setState((current) => ({ ...current, ...(node.control?.condition ? { [node.control.condition]: true } : {}), menu: node.id.startsWith("account.highlight.") && node.id !== "account.highlight.menu" ? "highlight" : node.id.startsWith("account.columns.") ? "columns" : null }));
  }
  useEffect(() => {
    const root = host.current; if (!root || section === "Icons") return;
    const measure = () => {
      root.querySelectorAll("[data-inspected]").forEach((element) => element.removeAttribute("data-inspected"));
      const element = root.querySelector<HTMLElement>(selected.selector);
      const ribbon = root.querySelector<HTMLElement>(".acm-ribbon");
      if (!element || !ribbon) { setInspectionBox(null); setMetrics({ dimensions: "Not rendered in this state", tokens: {} }); return; }
      element.setAttribute("data-inspected", "true");
      const bounds = element.getBoundingClientRect();
      const preview = root.querySelector<HTMLElement>(".rl-preview");
      if (preview) {
        const previewBounds = preview.getBoundingClientRect();
        const radius = element === ribbon || element.classList.contains("acm-ribbon-header") ? "8px 8px 0 0" : getComputedStyle(element).borderRadius;
        setInspectionBox({ left: bounds.left - previewBounds.left + 1, top: bounds.top - previewBounds.top + 1, width: Math.max(0, bounds.width - 2), height: Math.max(0, bounds.height - 2), borderRadius: radius });
      }
      const style = getComputedStyle(element);
      setMetrics({ dimensions: Math.round(bounds.width) + " × " + Math.round(bounds.height) + " px", tokens: Object.fromEntries(ribbonTokens.map((token) => [token, style.getPropertyValue(token).trim() || getComputedStyle(ribbon).getPropertyValue(token).trim()])) });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure); observer.observe(root);
    root.addEventListener("scroll", measure, true);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); root.removeEventListener("scroll", measure, true); };
  }, [selected, width, tab, state.menu, state.handoff, state.linked, section]);
  const displayedIcon = selected.control ? controlPresentation(selected.control, state).icon : undefined;
  const source = example.id === "studio" ? snapshots.studio : example.id === "account" ? snapshots.account : snapshots.ribbon;
  const usages = commandInventory.filter((control) => control.icon === icon || control.iconVariants?.includes(icon));
  return <main className="rl-shell">
    <header className="rl-header"><a href="/studio"><AcmIcon name="navigation.back" size={20} />ACM Studio</a><strong>Ribbon Library</strong><span className="rl-badge">Catalogue · v0.1.0</span></header>
    <div className="rl-title"><p className="rl-eyebrow">FOUNDATIONS / RIBBON</p><h1>See how it fits together.</h1><p>Explore the structure, try the controls and inspect original ACM symbols.</p></div>
    <nav className="rl-sections" aria-label="Ribbon Library Sections">{sections.map((name) => <button type="button" key={name} aria-current={section === name ? "page" : undefined} onClick={() => chooseSection(name)}><AcmIcon name={sectionIcons[name]} size={20} />{name}</button>)}</nav>
    <div className="rl-layout">
      <aside className="rl-sidebar" aria-label={section === "Icons" ? "Icon Filters" : "Catalogue Structure"}>
        {section === "Icons" ? <><h2>Symbols</h2><label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Icons" placeholder="Search icons…" value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} /></label><label className="rl-check"><input type="checkbox" checked={golden} onChange={(event) => setGolden(event.target.checked)} />Golden Reference Only</label><label className="rl-check"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label><p>{filteredIcons.length} {filteredIcons.length === 1 ? "symbol" : "symbols"} · three scales</p><p className="rl-secondary">Regular-S · 16px<br />Regular-M · 24px<br />Regular-L · 32px</p></> : <>
          {section === "Product Examples" ? <label className="rl-picker">Product<select aria-label="Product Example" value={exampleId} onChange={(event) => chooseExample(event.target.value)}><option value="studio">ACM Studio</option><option value="account">ACM Account</option></select></label> : <><h2>Components</h2><div className="rl-components">{Object.keys(componentDescriptions).map((component) => <button key={component} type="button" onClick={() => { const node = nodes.find((item) => item.component === component); if (node) inspect(node); }}>{component}</button>)}</div></>}
          <h2>Structure</h2><label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Structure" placeholder="Find a component…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <ul className="rl-tree"><Tree node={tree} selected={selected.id} choose={inspect} query={query} /></ul>
          {query && !nodes.some((node) => (node.label + " " + node.component).toLowerCase().includes(query.toLowerCase())) && <p>No matching structure items.</p>}
        </>}
      </aside>
      <section className="rl-main" aria-label={section}>
        {section === "Icons" ? <><div className="rl-section-heading"><p className="rl-eyebrow">ACM ICONS</p><h2>One family. Every action.</h2></div><div className={"rl-icon-grid" + (dark ? " rl-dark" : "")}>{filteredIcons.map((name) => <button className="rl-icon-card" type="button" key={name} aria-pressed={icon === name} onClick={() => setIcon(name)}><span className="rl-icon-scales">{iconScales.map((scale, index) => <span key={scale} title={scale}><AcmIcon name={name} scale={scale} size={[16,24,32][index]} /></span>)}</span><strong>{iconMetadata[name].label}</strong><small>{name}</small></button>)}</div>{!filteredIcons.length && <p>No icons match this search.</p>}</> : <>
          {section === "Overview" && <div className="rl-overview-cards">{[["01", "Structure", "Eight components form the foundation."], ["02", "Composition", "Products supply commands and appearance."], ["03", "Symbols", iconNames.length + " original SVG symbols in three scales."]].map(([number,title,description]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></article>)}</div>}
          <div className="rl-section-heading"><p className="rl-eyebrow">{section === "Product Examples" ? "PRODUCT REFERENCE" : "LIVE SPECIMEN"}</p><h2>{example.label}</h2><p>{example.description}</p></div>
          <div className="rl-preview-tools"><label className="rl-check"><input type="checkbox" checked={outlines} onChange={(event) => setOutlines(event.target.checked)} />Show Boundaries</label><label>Preview Width<select aria-label="Preview Width" value={width} onChange={(event) => setWidth(event.target.value)}><option value="fluid">Available Width</option><option value="1280">Desktop · 1280</option><option value="768">Tablet · 768</option><option value="390">Mobile · 390</option></select></label></div>
          <div ref={host} className={"rl-preview-viewport" + (outlines ? " rl-outlines" : "")}><div style={{ width: width === "fluid" ? "100%" : Number(width), minWidth: width === "fluid" ? 0 : Number(width) }}><RibbonPreview example={example} tab={tab} setTab={setTab} state={state} setState={setState} />{inspectionBox && <span className="rl-inspection-box" aria-hidden="true" style={inspectionBox} />}</div></div>
          <p className="rl-secondary">Temporary demo state. Reloading or Reset Demo restores the example.</p>
          <details className="rl-source"><summary>Source reference · {source.commit.slice(0,7)}{"dirty" in source && source.dirty ? " + recorded working changes" : ""}</summary><p>Captured {snapshots.capturedAt}. This example is a maintained snapshot, not a live product connection.</p>{source.files.map((file) => <p key={file.path}><code>{file.path}</code><br /><code>SHA-256 {file.sha256}</code></p>)}</details>
          {section === "Overview" && <div className="rl-overview-copy"><h2>A foundation for future editing.</h2><p>The structure list, inspector and preview share the same definitions. ACM Icons owns the symbols; the Ribbon package supplies components. These examples use temporary data.</p><button type="button" onClick={() => chooseSection("Product Examples")}>Explore Product Examples<AcmIcon name="view.pages" size={18} /></button></div>}
        </>}
      </section>
      <aside className="rl-inspector" aria-label="Inspector">{section === "Icons" ? <>
        <p className="rl-eyebrow">SYMBOL INSPECTOR</p><h2>{iconMetadata[icon].label}</h2><code>{icon}</code><div className="rl-enlarged"><AcmIcon name={icon} size={144} /></div><p>{iconMetadata[icon].description}</p>
        <div className="rl-scale-samples">{iconScales.map((scale,index) => <div key={scale}><AcmIcon name={icon} scale={scale} size={[16,24,32][index]} /><span>{scale}<small>{[16,24,32][index]}px</small></span></div>)}</div>
        <h3>Used by</h3><ul className="rl-usage">{usages.map((control) => <li key={control.id}><small>{control.product === "skeleton" ? "Component Specimen" : control.product === "studio" ? "ACM Studio" : "ACM Account"}</small>{control.label}{icon !== control.icon ? " (state variant)" : ""}</li>)}</ul>{!usages.length && <p>Supporting catalogue symbol.</p>}
        <details><summary>Provenance and source</summary><p>{iconMetadata[icon].provenance}</p><code>acm-icons/masters/{icon}.svg</code><p>Three editable scale groups. ACM icon specification v0.5.6.</p></details>
      </> : <>
        <p className="rl-eyebrow">STRUCTURE INSPECTOR</p><h2>{selected.label}</h2><code>{selected.component}</code><p>{selected.purpose}</p>
        <dl className="rl-properties"><dt>Component Owner</dt><dd>{selected.owner}</dd><dt>Composition / Command Owner</dt><dd>{example.label}</dd><dt>Region</dt><dd><code>{selected.id}</code></dd><dt>Rendered Size</dt><dd>{metrics.dimensions}</dd>
          {selected.control && <><dt>Kind</dt><dd>{selected.control.kind}</dd><dt>Size</dt><dd>{selected.control.size ?? "Native field"}</dd><dt>Command</dt><dd><code>{selected.control.command}</code></dd><dt>Current State</dt><dd>{disabledReason(selected.control,state) ?? (["text","number","select","range","compound-range"].includes(selected.control.kind) ? "Value: " + String(selected.control.kind === "compound-range" ? rangeValue(selected.control,state) : state.values[selected.control.id]) : controlPresentation(selected.control,state).pressed ? "Pressed / selected" : "Available")}</dd>{selected.control.initial !== undefined && <><dt>Initial Value</dt><dd>{String(selected.control.initial)}</dd></>}{selected.control.min !== undefined && <><dt>Range</dt><dd>{selected.control.min}–{selected.control.max}; step {selected.control.step}</dd></>}{selected.control.states && <><dt>States</dt><dd>{selected.control.states.join(" · ")}</dd></>}</>}
        </dl>
        {displayedIcon && <button className="rl-icon-link" type="button" onClick={() => { setIcon(displayedIcon); setSection("Icons"); }}><AcmIcon name={displayedIcon} size={32} /><span>{displayedIcon}<small>Inspect SVG Symbol</small></span></button>}
        <h3>Computed tokens</h3><p className="rl-secondary">Read from the rendered component.</p><dl className="rl-tokens">{Object.entries(metrics.tokens).map(([name,value]) => <div key={name}><dt>{name.replace("--acm-ribbon-","")}</dt><dd>{value}</dd></div>)}</dl>
        <details><summary>Supported properties</summary><p>{selected.component === "Ribbon" ? "tabs, activeTab, onTabChange, brand, status, accessibleName, prefix, className; native section attributes." : selected.component === "RibbonTabs" ? "tabs, activeTab, onTabChange, accessibleName. Rendered automatically by Ribbon." : selected.component === "RibbonPanel" ? "tab, active, prefix, className; native div attributes." : selected.component === "RibbonGroup" ? "label, prefix, className; native div attributes." : selected.component === "RibbonButton" || selected.component === "RibbonToggleButton" ? "size, active, prefix, className, disabled; native button attributes. Toggle buttons require pressed." : selected.component === "RibbonField" ? "prefix, className; native label attributes. Its child owns the input contract." : "prefix, className; native attributes and consumer-supplied children."}</p></details>
      </>}</aside>
    </div>
  </main>;
}
