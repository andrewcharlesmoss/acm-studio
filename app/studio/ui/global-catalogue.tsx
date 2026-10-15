"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { iconNames, iconMetadata, type IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { PanelCard } from "@acm/panel";
import { Ribbon, RibbonButton, RibbonControls, RibbonField, RibbonGroup, RibbonPanel, RibbonToggleButton } from "@acm/ribbon";
import { UNIVERSAL_STYLE_PRESET } from "@acm/styles";
import { blockLibraryEntries } from "../blocks/library-catalogue";
import { BlockLibraryIconSample, type BlockIconType } from "../block-library-icons";
import { studioControlEntries, type StudioControlEntry } from "../controls/library-catalogue";
import { PaneSpecimen } from "../panes/pane-specimen";
import { paneExamples, defaultRegions, skeletonDefinition } from "../panes/catalogue-model";
import { componentDescriptions } from "../ribbon/catalogue-model";
import { ApplicationSectionNavigation } from "./application-section-navigation";
import { ControlSpecimen } from "./controls/control-specimen";

const sections = ["Workspace", "Navigation", "Ribbon", "Panes", "Panels", "Blocks", "Controls", "Icons", "Styles"] as const;
type Section = typeof sections[number];
type Preview = { kind: "icon" | "control" | "block" | "pane" | "ribbon" | "panel" | "navigation" | "workspace" | "style"; key?: string };
type Entry = { id: string; name: string; section: Section; purpose: string; owner: string; consumers: string; dependencies: string; href: string; preview: Preview };

const controlEntries: Entry[] = studioControlEntries.map((entry) => ({
  id: `control:${entry.id}`, name: entry.title, section: "Controls", purpose: entry.purpose,
  owner: entry.owner, consumers: entry.consumers.join(", "),
  dependencies: (entry.dependencies ?? []).map((dependency) => `${dependency.kind}: ${dependency.label} — ${dependency.detail}`).join("; ") || "None documented",
  href: `/studio/ui/controls#${entry.id}`, preview: { kind: "control", key: entry.id },
}));
const blockEntries: Entry[] = blockLibraryEntries.map((entry) => ({
  id: `block:${entry.type}`, name: entry.label, section: "Blocks", purpose: entry.description,
  owner: "ACM Studio Block Library", consumers: ["Block inserter", "Editor canvas", "Inspector"].join(", "),
  dependencies: entry.profile ? "Uses the shared block capability profile and renderer." : "Uses the shared block icon catalogue.",
  href: `/studio/ui/blocks/${entry.type}`, preview: { kind: "block", key: entry.type },
}));
const iconEntries: Entry[] = iconNames.map((name) => {
  const metadata = iconMetadata[name];
  return { id: `icon:${name}`, name: metadata.label, section: "Icons", purpose: metadata.description,
    owner: "@acm/icons", consumers: `Symbol ${name}`, dependencies: metadata.keywords.join(", ") || "Three optical sizes",
    href: `/studio/ui/icons?icon=${encodeURIComponent(name)}`, preview: { kind: "icon", key: name } };
});
const controlById = Object.fromEntries(studioControlEntries.map((entry) => [entry.id, entry])) as Record<string, StudioControlEntry>;
const entries: Entry[] = [
  { id: "workspace:composition", name: "Workspace composition", section: "Workspace", purpose: "Application navigation, Ribbon and panes composed as one editing workspace.", owner: "ACM Studio UI Library", consumers: "Studio applications", dependencies: "ApplicationSectionNavigation, @acm/ribbon and shared Pane components.", href: "/studio/ui/workspace", preview: { kind: "workspace" } },
  { id: "navigation:application", name: "Application section navigation", section: "Navigation", purpose: "Shared pattern for moving between top-level application sections.", owner: "ACM Studio UI Library", consumers: "Studio application header", dependencies: "ApplicationSectionNavigation; consumers provide routes and section content.", href: "/studio/ui/navigation", preview: { kind: "navigation" } },
  ...Object.entries(componentDescriptions).map(([name, purpose]) => ({ id: `ribbon:${name}`, name, section: "Ribbon" as const, purpose, owner: "@acm/ribbon", consumers: "Studio Ribbon and Design", dependencies: "Ribbon package components and semantic action definitions.", href: "/studio/ui/ribbon", preview: { kind: "ribbon" as const, key: name } })),
  ...paneExamples.map((entry) => ({ id: `pane:${entry.id}`, name: entry.label, section: "Panes" as const, purpose: entry.description, owner: "ACM Studio Pane components", consumers: entry.sourceComponent, dependencies: `Shared Pane layout, dimensions and interaction contract. ${entry.tabs.length ? `Tabs: ${entry.tabs.join(", ")}.` : ""}`, href: "/studio/ui/panes", preview: { kind: "pane" as const, key: entry.id } })),
  { id: "panel:card", name: "Panel card", section: "Panels", purpose: "Raised card for related details and actions, with content slots.", owner: "@acm/panel", consumers: "Studio UI Library; future application panels", dependencies: "Shared PanelCard surface and slot contract.", href: "/studio/ui/panels", preview: { kind: "panel" } },
  ...blockEntries,
  ...controlEntries,
  ...iconEntries,
  ...["Colour", "Typography", "Buttons", "Interactions", "Layout"].map((name) => ({ id: `style:${name.toLowerCase()}`, name: `${name} styles`, section: "Styles" as const, purpose: `Shared ${name.toLowerCase()} tokens and rendered examples from the executable universal style preset.`, owner: "@acm/styles", consumers: "Studio interface and registered ACM consumers", dependencies: "Canonical preset schema and semantic CSS variables.", href: "/studio/ui/styles", preview: { kind: "style" as const, key: name } })),
];

function PreviewContent({ entry }: { entry: Entry }) {
  if (entry.preview.kind === "icon") return <div className="ui-global-preview-icon"><AcmIcon name={entry.preview.key as IconName} size={48} /><span>{entry.preview.key}</span></div>;
  if (entry.preview.kind === "control") {
    const definition = controlById[entry.preview.key ?? ""];
    return definition ? <div className="ui-global-preview-control" inert><ControlSpecimen entry={definition} /></div> : null;
  }
  if (entry.preview.kind === "block") return <div className="ui-global-preview-block"><BlockLibraryIconSample type={entry.preview.key as BlockIconType} size={48} scale="Regular-L" /><span>{entry.name}</span></div>;
  if (entry.preview.kind === "pane") {
    const definition = paneExamples.find((item) => item.id === entry.preview.key) ?? skeletonDefinition;
    return <div className="ui-global-preview-pane" inert><PaneSpecimen definition={definition} regions={defaultRegions} layout="left" content="normal" studio={false} /></div>;
  }
  if (entry.preview.kind === "ribbon") return <RibbonComponentPreview name={entry.preview.key as keyof typeof componentDescriptions} />;
  if (entry.preview.kind === "panel") return <div className="ui-global-preview-panel" inert><PanelCard eyebrow="Shared component" title="Panel card" description="A composed detail surface."><p>Content slot</p></PanelCard></div>;
  if (entry.preview.kind === "navigation") return <div className="ui-global-preview-navigation" inert><ApplicationSectionNavigation initialActiveId="accounts" preventNavigation /></div>;
  if (entry.preview.kind === "workspace") return <div className="ui-global-preview-workspace" inert><ApplicationSectionNavigation initialActiveId="accounts" preventNavigation /><div><RibbonButton size="large"><AcmIcon name="action.adjust" size={24} /><span>Example</span></RibbonButton></div><PaneSpecimen definition={skeletonDefinition} regions={defaultRegions} layout="left" content="normal" studio={false} /></div>;
  return <StylePreview kind={entry.preview.key ?? "Colour"} />;
}

function RibbonComponentPreview({ name }: { name: keyof typeof componentDescriptions }) {
  const button = <RibbonButton size="large"><AcmIcon name="action.undo" size={22} /><span>Undo</span></RibbonButton>;
  const sampleGroup = <RibbonGroup label="History"><RibbonControls>{button}<RibbonToggleButton size="large" pressed><AcmIcon name="action.redo" size={22} /><span>Redo</span></RibbonToggleButton></RibbonControls></RibbonGroup>;
  const tabs = [{ id: "home", label: "Home" }, { id: "insert", label: "Insert" }];
  if (name === "Ribbon") return <div className="ui-global-preview-ribbon" inert><Ribbon tabs={tabs} activeTab="home" onTabChange={() => {}} brand={<strong>Example</strong>}><RibbonPanel tab="home">{sampleGroup}</RibbonPanel><RibbonPanel tab="insert">{sampleGroup}</RibbonPanel></Ribbon></div>;
  if (name === "RibbonTabs") return <div className="ui-global-preview-ribbon" inert><Ribbon tabs={tabs} activeTab="home" onTabChange={() => {}}><RibbonPanel tab="home">{button}</RibbonPanel><RibbonPanel tab="insert">{button}</RibbonPanel></Ribbon></div>;
  if (name === "RibbonPanel") return <div className="ui-global-preview-ribbon" inert><Ribbon tabs={tabs} activeTab="home" onTabChange={() => {}}><RibbonPanel tab="home">{sampleGroup}</RibbonPanel><RibbonPanel tab="insert">{button}</RibbonPanel></Ribbon></div>;
  if (name === "RibbonGroup") return <div className="ui-global-preview-ribbon" inert>{sampleGroup}</div>;
  if (name === "RibbonControls") return <div className="ui-global-preview-ribbon" inert><RibbonControls>{button}<RibbonButton><AcmIcon name="action.redo" size={20} /><span>Redo</span></RibbonButton></RibbonControls></div>;
  if (name === "RibbonToggleButton") return <div className="ui-global-preview-ribbon" inert><RibbonToggleButton size="large" pressed><AcmIcon name="view.pages" size={22} /><span>Pages</span></RibbonToggleButton></div>;
  if (name === "RibbonField") return <div className="ui-global-preview-ribbon" inert><RibbonField><span>Page width</span><input aria-label="Page width" readOnly value="1200 px" /></RibbonField></div>;
  return <div className="ui-global-preview-ribbon" inert>{button}</div>;
}

function StylePreview({ kind }: { kind: string }) {
  const palette = UNIVERSAL_STYLE_PRESET.palette;
  const headingStyle = UNIVERSAL_STYLE_PRESET.typography.h2;
  const headingSize = headingStyle.size.desktop;
  if (kind === "Colour") return <div className="ui-global-preview-style ui-global-preview-palette">{(["accent", "surface", "surfaceSubtle", "textPrimary"] as const).map(key => <span key={key} title={`${key}: ${palette[key]}`} style={{ background: palette[key] }}><small>{key}</small></span>)}</div>;
  if (kind === "Typography") return <div className="ui-global-preview-style ui-global-preview-typography"><strong style={{ fontFamily: headingStyle.family, fontSize: `${headingSize.value}${headingSize.unit}`, fontWeight: headingStyle.weight }}>Aa</strong><span style={{ fontFamily: UNIVERSAL_STYLE_PRESET.typography.body.family }}>Body text specimen</span></div>;
  if (kind === "Buttons") return <div className="ui-global-preview-style ui-global-preview-buttons">{(Object.entries(UNIVERSAL_STYLE_PRESET.buttons) as [keyof typeof UNIVERSAL_STYLE_PRESET.buttons, typeof UNIVERSAL_STYLE_PRESET.buttons.base][]).map(([key, style]) => <button key={key} type="button" inert style={{ background: style.background, color: style.foreground, border: `${style.borderWidth}px solid ${style.border}`, borderRadius: 5 }}>Example</button>)}</div>;
  if (kind === "Interactions") return <div className="ui-global-preview-style ui-global-preview-interactions"><span style={{ background: UNIVERSAL_STYLE_PRESET.interactions.neutralHoverBackground }} /><span style={{ background: UNIVERSAL_STYLE_PRESET.interactions.selectionColour }} /><span style={{ background: UNIVERSAL_STYLE_PRESET.interactions.controlAccentColour }} /></div>;
  return <div className="ui-global-preview-style ui-global-preview-layout"><div style={{ padding: UNIVERSAL_STYLE_PRESET.layout.spacing / 2, borderRadius: UNIVERSAL_STYLE_PRESET.layout.radius, borderWidth: UNIVERSAL_STYLE_PRESET.layout.borderWidth }}>Content width {UNIVERSAL_STYLE_PRESET.layout.contentWidth}px</div></div>;
}

export function GlobalCatalogue() {
  const [query, setQuery] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<Section>>(new Set(sections));
  const [grouped, setGrouped] = useState(true);
  const [active, setActive] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const openTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  function cancelPendingPreview() {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = null;
  }
  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
  }, []);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((entry) => selectedSections.has(entry.section) && (!term || [entry.name, entry.section, entry.purpose, entry.owner, entry.consumers, entry.dependencies].join(" ").toLowerCase().includes(term)));
  }, [query, selectedSections]);
  const sectionsShown = useMemo(() => sections.filter((section) => selectedSections.has(section)), [selectedSections]);
  const activeEntry = active && entries.find((entry) => entry.id === active.id);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelPendingPreview();
        setActive(null);
        setPinned(false);
        if (active) returnFocus.current?.focus();
      }
    };
    const clear = () => { cancelPendingPreview(); setActive(null); setPinned(false); };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => { window.removeEventListener("keydown", dismiss); window.removeEventListener("scroll", clear, true); window.removeEventListener("resize", clear); };
  }, [active]);

  function toggleSection(section: Section) {
    dismissPreview();
    setSelectedSections(current => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }
  function show(entry: Entry, target: HTMLElement, pin = false) {
    cancelPendingPreview();
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    const rect = target.getBoundingClientRect();
    const previewHeight = Math.min(window.innerHeight * 0.8, 680);
    setActive({ id: entry.id, top: Math.min(Math.max(16, rect.top), Math.max(16, window.innerHeight - previewHeight - 16)), left: Math.min(Math.max(16, rect.left + 24), Math.max(16, window.innerWidth - 470)) });
    setPinned(pin);
    returnFocus.current = target;
  }
  function dismissPreview(restoreFocus = false) {
    cancelPendingPreview();
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
    setPinned(false);
    setActive(null);
    if (restoreFocus) returnFocus.current?.focus();
  }
  const groupedEntries = grouped ? sectionsShown.map(section => [section, filtered.filter(entry => entry.section === section)] as const).filter(([, items]) => items.length) : [["All results", filtered] as const];

  return <section className="ui-global-catalogue" aria-labelledby="ui-global-catalogue-title">
    <header className="ui-page-intro"><p className="rl-eyebrow">Studio UI Library / Catalogue</p><h1 id="ui-global-catalogue-title">Browse the whole library.</h1><p>Search shared components, visual building blocks and specimens across every section. Select an entry to open its full example.</p></header>
    <div className="ui-global-catalogue-tools">
      <label className="ui-global-search"><AcmIcon name="action.search" size={20} /><span className="sr-only">Search the Studio UI Library</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search names, purpose, owner, consumers…" /><button type="button" disabled={!query} aria-label="Clear search" onClick={() => setQuery("")}><AcmIcon name="action.close" size={16} /></button></label>
      <label className="ui-global-group-toggle"><input type="checkbox" checked={grouped} onChange={event => setGrouped(event.target.checked)} />Group by section</label>
    </div>
    <fieldset className="ui-global-filters"><legend>Sections</legend><button type="button" onClick={() => setSelectedSections(new Set(sections))}>All</button>{sections.map(section => <label key={section}><input type="checkbox" checked={selectedSections.has(section)} onChange={() => toggleSection(section)} />{section}</label>)}</fieldset>
    <p className="ui-global-count" role="status">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</p>
    <div className="ui-global-table-scroll"><table><thead><tr><th><span className="ui-global-name-header">Name</span></th><th>Section</th><th>Purpose</th><th>Owner</th><th>Used by</th><th>Dependencies</th></tr></thead><tbody>
      {groupedEntries.map(([group, items]) => <Fragment key={group}>{grouped && <tr className="ui-global-group-row"><th scope="row">{group}</th><td colSpan={5} aria-hidden="true" /></tr>}{items.map(entry => <tr key={entry.id}>
        <th scope="row"><div className="ui-global-entry-name"><a href={entry.href}>{entry.name}</a><button className="ui-global-preview-trigger" type="button" title={`Preview ${entry.name}`} aria-label={`Preview ${entry.name}`} aria-expanded={active?.id === entry.id} aria-controls={active?.id === entry.id ? "ui-global-preview" : undefined}
          onPointerEnter={event => {
            if (pinned || event.pointerType !== "mouse") return;
            cancelPendingPreview();
            if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
            const target = event.currentTarget;
            openTimer.current = window.setTimeout(() => { if (target.isConnected) show(entry, target); }, 350);
          }}
          onPointerLeave={() => {
            cancelPendingPreview();
            if (!pinned) leaveTimer.current = window.setTimeout(() => setActive(current => current?.id === entry.id ? null : current), 180);
          }}
          onClick={event => { if (pinned && active?.id === entry.id) dismissPreview(); else show(entry, event.currentTarget, true); }}><AcmIcon name="view.show" size={20} /></button></div></th><td>{entry.section}</td><td>{entry.purpose}</td><td>{entry.owner}</td><td>{entry.consumers}</td><td>{entry.dependencies}</td>
      </tr>)}</Fragment>)}
    </tbody></table>{filtered.length === 0 && <p className="ui-global-empty">No entries match. Try another search or section filter.</p>}</div>
    {active && activeEntry && <aside id="ui-global-preview" className="ui-global-preview" role="dialog" aria-labelledby="ui-global-preview-title" style={{ top: active.top, left: active.left }} onPointerEnter={() => { if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current); }} onPointerLeave={() => { if (!pinned) dismissPreview(); }}>
      <button className="ui-global-preview-close" type="button" aria-label="Close preview" onClick={() => dismissPreview(true)}><AcmIcon name="action.close" size={18} /></button><p className="rl-eyebrow">{activeEntry.section} preview</p><h2 id="ui-global-preview-title">{activeEntry.name}</h2><div className="ui-global-preview-body"><PreviewContent entry={activeEntry} /></div><p>{activeEntry.purpose}</p><a href={activeEntry.href}>Open full example</a>
    </aside>}
  </section>;
}
