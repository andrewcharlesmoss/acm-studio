"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";
import { equivalentLinkDestination, updatedLinkDestination } from "../content/link-destination";
import { paragraphStyleToCss } from "../content/paragraph-styles";
import { LinkDestinationPopover, type LinkSuggestion } from "./controls/link-destination-popover";
import { PaletteColourSetting } from "./controls/palette-colour-setting";
import { PaneTabs, paneTabTarget } from "./panes/pane-components";
import { ToggleSetting } from "./controls/toggle-setting";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { GroupLayoutControls } from "./blocks/group-layout-controls";
import { ParagraphInspector } from "./blocks/inspectors/paragraph-inspector";
import { navigationStyleProfile } from "./blocks/capability-profiles";
import { InspectorToolsSection } from "./inspector-tools-section";
import { InspectorAccordionSection } from "./inspector-accordion";
import { StudioIcon } from "./studio-icons";
import { templateId, type NavigationTemplateNode, type SiteLink } from "./template-model";
import { insertNavigationItem, moveNavigationItem, navigationEntries, removeNavigationItem, updateNavigationItem } from "./navigation-items";

export type NavigationEditingProps = {
  blockId?: string; links: SiteLink[]; selectedId: string | null; writable: boolean; suggestions: LinkSuggestion[];
  onSelect: (id: string | null) => void; onChange: (links: SiteLink[]) => boolean;
};

function focusNavigationItem(id: string, blockId?: string) {
  const previousFocus = document.activeElement;
  requestAnimationFrame(() => {
    if (document.activeElement !== previousFocus && document.activeElement !== document.body) return;
    const canvas = blockId ? Array.from(document.querySelectorAll<HTMLElement>("[data-navigation-block-id]")).find(element => element.dataset.navigationBlockId === blockId) : null;
    const owner = canvas ?? document.querySelector(".navigation-menu-list");
    const control = owner && Array.from(owner.querySelectorAll<HTMLElement>("[data-navigation-link-id]")).find(element => element.dataset.navigationLinkId === id);
    control?.focus();
  });
}

function NavigationAdd({ parentId, afterId, ...props }: NavigationEditingProps & { parentId?: string; afterId?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const baseline = useRef<SiteLink[]>(props.links);
  const entries = navigationEntries(props.links);
  const parent = parentId ? entries.find(item => item.link.id === parentId) : null;
  const allowed = entries.length < 100 && (!parentId || Boolean(parent && parent.depth < 5));
  const close = (focus: boolean) => { setOpen(false); if (focus) trigger.current?.focus(); };
  return <>
    <button ref={trigger} type="button" className="navigation-add" disabled={!props.writable || !allowed} aria-label={parentId ? "Add submenu link" : "Add navigation link"} title={parentId ? "Add submenu link" : "Add navigation link"} aria-haspopup="dialog" aria-expanded={open} onClick={event => { event.stopPropagation(); baseline.current = props.links; setText(""); setOpen(true); }}><StudioIcon name="add" size={20} /></button>
    {open && props.writable && allowed ? <LinkDestinationPopover inspectorPlacement key={`add-${parentId ?? afterId ?? "root"}`} value={{ url: "" }} mode="edit" anchor={() => trigger.current} focusOnMount suggestions={props.suggestions} textControl={{ value: text, onChange: setText }} onSuggestionSelect={item => { if (!text.trim()) setText(item.title.slice(0, 160)); }} onEdit={() => {}} onRemove={() => close(true)} onClose={close} onApply={draft => {
      if (!props.writable || JSON.stringify(props.links) !== JSON.stringify(baseline.current)) return "The menu changed. Close and reopen to add a link to its latest version.";
      if (!text.trim()) return "Enter text for this navigation link.";
      const destination = updatedLinkDestination({ url: "" }, draft);
      if (!destination) return "Use a full URL, email link, /path or #anchor.";
      const link = { id: templateId(), label: text.trim(), ...destination };
      if (!props.onChange(insertNavigationItem(props.links, link, parentId, afterId))) return "The link could not be saved. Your draft is still here.";
      props.onSelect(link.id); close(false); focusNavigationItem(link.id, props.blockId); return null;
    }} /> : null}
  </>;
}

function NavigationItemActions({ item, onEdit, ...props }: NavigationEditingProps & { item: SiteLink; onEdit?: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const entries = navigationEntries(props.links);
  const entry = entries.find(entry => entry.link.id === item.id);
  const close = (focus = true) => { setOpen(false); if (focus) trigger.current?.focus(); };
  function duplicate(link: SiteLink): SiteLink { return { ...link, id: templateId(), ...(link.children ? { children: link.children.map(duplicate) } : {}) }; }
  const duplicateSize = navigationEntries([item]).length;
  return <>
    <button ref={trigger} type="button" className="navigation-item-options" aria-label={`Options for ${item.label || "navigation link"}`} title="Options" aria-haspopup="menu" aria-expanded={open} disabled={!props.writable} onClick={event => { event.stopPropagation(); setOpen(value => !value); }}><StudioIcon name="more-vertical" size={20} /></button>
    {open ? <StudioAnchoredMenu inspectorPlacement anchor={() => trigger.current} className="navigation-item-menu" aria-label="Navigation link options" onClose={close}>
      {onEdit ? <button type="button" role="menuitem" onClick={() => { close(false); onEdit(); }}><StudioIcon name="link" />Edit Link</button> : null}
      <button type="button" role="menuitem" disabled={!entry?.index || !props.writable} onClick={() => { props.onChange(moveNavigationItem(props.links, item.id, -1)); close(); }}><StudioIcon name="arrow-up" />Move Up</button>
      <button type="button" role="menuitem" disabled={!entry || entry.index === entry.siblings.length - 1 || !props.writable} onClick={() => { props.onChange(moveNavigationItem(props.links, item.id, 1)); close(); }}><StudioIcon name="arrow-down" />Move Down</button>
      <button type="button" role="menuitem" disabled={entries.length + duplicateSize > 100 || !props.writable} onClick={() => { const copy = duplicate(item); if (props.onChange(insertNavigationItem(props.links, copy, undefined, item.id))) { props.onSelect(copy.id); close(false); focusNavigationItem(copy.id, props.blockId); } }}><StudioIcon name="copy" />Duplicate</button>
      <button type="button" role="menuitem" disabled={!props.writable} onClick={() => { const remaining = removeNavigationItem(props.links, item.id); const neighbour = navigationEntries(remaining)[0]?.link; const fallback = trigger.current?.closest(".navigation-editor, .navigation-menu-list")?.querySelector<HTMLButtonElement>(".navigation-appender > .navigation-add, .navigation-menu-add > .navigation-add"); if (props.onChange(remaining)) { props.onSelect(neighbour?.id ?? null); close(false); if (neighbour) focusNavigationItem(neighbour.id, props.blockId); else requestAnimationFrame(() => fallback?.focus()); } }}><StudioIcon name="trash" />Delete</button>
      <button type="button" role="menuitem" onClick={() => close()}><StudioIcon name="close" />Close</button>
    </StudioAnchoredMenu> : null}
  </>;
}

function NavigationCanvasItem({ item, ...props }: NavigationEditingProps & { item: SiteLink }) {
  const selected = props.selectedId === item.id;
  const trigger = useRef<HTMLButtonElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const entry = navigationEntries(props.links).find(entry => entry.link.id === item.id)!;
  const close = (focus: boolean) => { setLinkOpen(false); if (focus) trigger.current?.focus(); };
  return <li className={`navigation-edit-item${selected ? " is-selected" : ""}`}>
    {selected ? <div className="navigation-link-toolbar" role="toolbar" aria-label="Navigation link tools">
      <button type="button" disabled={!props.writable || entry.index === 0} onClick={() => { if (props.onChange(moveNavigationItem(props.links, item.id, -1))) focusNavigationItem(item.id, props.blockId); }} aria-label="Move navigation link up" title="Move up"><StudioIcon name="arrow-up" size={20} /></button>
      <button type="button" disabled={!props.writable || entry.index === entry.siblings.length - 1} onClick={() => { if (props.onChange(moveNavigationItem(props.links, item.id, 1))) focusNavigationItem(item.id, props.blockId); }} aria-label="Move navigation link down" title="Move down"><StudioIcon name="arrow-down" size={20} /></button>
      <button ref={trigger} type="button" disabled={!props.writable} onClick={() => setLinkOpen(true)} aria-label="Edit navigation link" title="Link" aria-haspopup="dialog" aria-expanded={linkOpen}><StudioIcon name="link" size={20} /></button>
      <NavigationAdd {...props} parentId={item.id} />
      <NavigationItemActions {...props} item={item} onEdit={() => setLinkOpen(true)} />
    </div> : null}
    <input className="navigation-edit-label" data-navigation-link-id={item.id} aria-label={`Navigation link text: ${item.label || "Untitled"}`} value={item.label} maxLength={160} readOnly={!props.writable} style={{ width: `${Math.max(1, item.label.length + 1)}ch` }} onFocus={() => props.onSelect(item.id)} onChange={event => props.onChange(updateNavigationItem(props.links, item.id, current => ({ ...current, label: event.target.value })))} onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); event.stopPropagation(); setLinkOpen(true); }
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.stopPropagation(); props.onSelect(null); }
    }} />
    {item.children?.length ? <div className="navigation-edit-submenu"><StudioIcon name="chevron-down" size={16} /><ul>{item.children.map(child => <NavigationCanvasItem key={child.id} {...props} item={child} />)}</ul></div> : null}
    {selected && linkOpen && props.writable ? <LinkDestinationPopover key={item.id} value={item} mode="edit" anchor={() => trigger.current} focusOnMount suggestions={props.suggestions} onEdit={() => {}} onClose={close} onRemove={() => {
      const remaining = removeNavigationItem(props.links, item.id);
      const neighbour = navigationEntries(remaining)[0]?.link;
      const fallback = trigger.current?.closest(".navigation-editor")?.querySelector<HTMLButtonElement>(".navigation-appender > .navigation-add");
      if (props.onChange(remaining)) {
        props.onSelect(neighbour?.id ?? null); close(false);
        if (neighbour) focusNavigationItem(neighbour.id, props.blockId); else requestAnimationFrame(() => fallback?.focus());
      }
    }} onApply={(draft, baseline) => {
      const current = navigationEntries(props.links).find(entry => entry.link.id === item.id)?.link;
      if (!props.writable || !current || !equivalentLinkDestination(current, baseline)) return "This link changed. Close and reopen to edit its latest version.";
      const next = updatedLinkDestination(current, draft);
      if (!next) return "Use a full URL, email link, /path or #anchor.";
      if (!props.onChange(updateNavigationItem(props.links, item.id, link => ({ ...link, ...next })))) return "The link could not be saved. Your draft is still here.";
      close(true); return null;
    }} /> : null}
  </li>;
}

export function NavigationCanvasEditor({ node, ...props }: NavigationEditingProps & { node: NavigationTemplateNode }) {
  return <nav className="template-navigation acm-navigation navigation-editor" data-navigation-block-id={node.id} aria-label={node.ariaLabel || "Site navigation"} data-navigation-layout={node.layout ?? "row"} data-navigation-align={node.horizontalAlign ?? node.align ?? "left"} style={{ ...paragraphStyleToCss(node.visualStyle), "--navigation-submenu-text": node.submenuTextColor, "--navigation-submenu-background": node.submenuBackgroundColor, justifyContent: (node.horizontalAlign ?? node.align) === "centre" ? "center" : (node.horizontalAlign ?? node.align) === "right" ? "flex-end" : node.horizontalAlign === "space-between" ? "space-between" : "flex-start", flexWrap: node.allowWrap === false ? "nowrap" : "wrap", gap: node.gap === undefined ? undefined : `${node.gap}px` } as CSSProperties} onPointerDown={event => event.stopPropagation()}>
    <ul className="template-navigation-items">{props.links.map(item => <NavigationCanvasItem key={item.id} {...props} blockId={node.id} item={item} />)}<li className="navigation-appender"><NavigationAdd {...props} blockId={node.id} /></li></ul>
  </nav>;
}

export function NavigationMenuList(props: NavigationEditingProps) {
  return <div className="navigation-menu-list"><ul aria-label="Navigation menu items">{navigationEntries(props.links).map(({ link, depth }) => <li key={link.id} style={{ paddingInlineStart: `${depth * 16}px` }}>
    <button type="button" className="navigation-menu-select" data-navigation-link-id={link.id} aria-pressed={props.selectedId === link.id} onClick={() => props.onSelect(link.id)}><AcmIcon name="view.pages" size={20} /><span>{link.label || "Untitled Link"}</span></button><NavigationItemActions {...props} item={link} />
  </li>)}</ul><div className="navigation-menu-add"><NavigationAdd {...props} /></div></div>;
}

function LinkSetting({ label, value, maxLength = 2000, onCommit }: { label: string; value: string; maxLength?: number; onCommit: (value: string) => void }) {
  return <label>{label}<input key={value} defaultValue={value} maxLength={maxLength} onBlur={event => { if (event.target.value !== value) onCommit(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
}

export function NavigationInspector({ block, menuName = "Navigation", onBlockChange, ...props }: NavigationEditingProps & { menuName?: string; block: Extract<ContentBlock, { type: "group" }>; onBlockChange: (block: ContentBlock) => void }) {
  const [activeTab, setActiveTab] = useState("menu");
  const tabId = useId();
  const [error, setError] = useState<string | null>(null);
  const [linkSettingsOpen, setLinkSettingsOpen] = useState(false);
  const [menuOptionsOpen, setMenuOptionsOpen] = useState(false);
  const menuOptionsTrigger = useRef<HTMLButtonElement>(null);
  const [visibleColours, setVisibleColours] = useState(() => new Set(["text", "background", "submenu-text", "submenu-background"]));
  const [fontSizeViewMode, setFontSizeViewMode] = useState<"presets" | "custom" | null>(null);
  const link = navigationEntries(props.links).find(item => item.link.id === props.selectedId)?.link;
  const update = (patch: Partial<SiteLink>) => { if (link && props.writable) props.onChange(updateNavigationItem(props.links, link.id, current => ({ ...current, ...patch }))); };
  const data = (patch: Record<string, string | boolean | undefined>) => {
    const next = { ...block.data };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined) delete next[key]; else next[key] = value; }
    if (props.writable) onBlockChange({ ...block, data: next });
  };
  return <div className="navigation-inspector inspector-sections">
    <div className="navigation-block-summary"><h3><AcmIcon name="navigation.menu" size={24} />Navigation</h3><p>A collection of blocks that allow visitors to get around your site.</p></div>
    <PaneTabs id={tabId} label="Navigation controls" indicatorVariant="selected" className="navigation-inspector-tabs" tabs={[{ id: "menu", label: "Menu" }, { id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]} active={activeTab} onChange={setActiveTab} renderLabel={tab => <><AcmIcon name={tab.id === "menu" ? "view.list" : tab.id === "settings" ? "action.settings" : "view.styles"} size={24} /><span className="visually-hidden">{tab.label}</span></>} />
    <div role="tabpanel" id={paneTabTarget(tabId, activeTab, "panel")} aria-labelledby={paneTabTarget(tabId, activeTab, "tab")}>
    {activeTab === "menu" ? <>
    <section className="navigation-menu-section">
      <div className="navigation-menu-heading"><h2>{menuName}</h2><button ref={menuOptionsTrigger} type="button" className="navigation-item-options" aria-label="Menu options" aria-haspopup="menu" aria-expanded={menuOptionsOpen} onClick={() => setMenuOptionsOpen(open => !open)}><StudioIcon name="more-vertical" size={20} /></button></div>
      {menuOptionsOpen ? <StudioAnchoredMenu inspectorPlacement anchor={() => menuOptionsTrigger.current} aria-label="Menu options" onClose={(focus = true) => { setMenuOptionsOpen(false); if (focus) menuOptionsTrigger.current?.focus(); }}>
        <button type="button" role="menuitemcheckbox" aria-checked={linkSettingsOpen} disabled={!link} onClick={() => { setLinkSettingsOpen(open => !open); setMenuOptionsOpen(false); menuOptionsTrigger.current?.focus(); }}>Show link settings</button>
        <button type="button" role="menuitem" onClick={() => { setMenuOptionsOpen(false); menuOptionsTrigger.current?.focus(); }}><StudioIcon name="close" />Close</button>
      </StudioAnchoredMenu> : null}
      <NavigationMenuList {...props} blockId={block.id} onSelect={id => { props.onSelect(id); setLinkSettingsOpen(true); }} />
    </section>
    {link && linkSettingsOpen ? <InspectorAccordionSection title={link.children?.length ? "Submenu Link" : "Navigation Link"} contentDisabled={!props.writable}>
      <LinkSetting label="Text" value={link.label} maxLength={160} onCommit={label => update({ label })} />
      <LinkSetting label="Link to" value={link.url} onCommit={url => { const destination = updatedLinkDestination(link, { url, opensInNewTab: Boolean(link.opensInNewTab), nofollow: Boolean(link.rel?.split(/\s+/).includes("nofollow")) }); if (destination) { update(destination); setError(null); } else setError("Use a full URL, email link, /path or #anchor."); }} />
      <ToggleSetting label="Open in new tab" checked={Boolean(link.opensInNewTab)} disabled={!props.writable} onChange={opensInNewTab => update({ opensInNewTab })} />
      <LinkSetting label="Description" value={link.description ?? ""} onCommit={description => update({ description })} />
      <LinkSetting label="Rel attributes" value={link.rel ?? ""} maxLength={200} onCommit={rel => { if (/^[a-zA-Z0-9_\s-]*$/.test(rel)) { update({ rel }); setError(null); } else setError("Use space-separated relationship names."); }} />
      {error ? <p role="alert">{error}</p> : null}<div className="navigation-menu-add"><span>Add Submenu</span><NavigationAdd {...props} blockId={block.id} parentId={link.id} /></div>
    </InspectorAccordionSection> : null}
    </> : activeTab === "settings" ? <>
    <InspectorAccordionSection title="Overlay" contentDisabled={!props.writable}>
      <fieldset className="navigation-overlay-control"><legend>Overlay visibility</legend><div role="group" aria-label="Overlay visibility">{(["never", "mobile", "always"] as const).map(value => <button type="button" key={value} aria-pressed={(block.data?.overlayMenu ?? "never") === value} onClick={() => data({ overlayMenu: value })}>{value === "never" ? "Off" : value === "mobile" ? "Mobile" : "Always"}</button>)}</div></fieldset>
      <p className="setting-note">Collapses the navigation options into a menu icon opening an overlay.</p>
      <div className="navigation-overlay-specimen" aria-hidden="true"><AcmIcon name="navigation.menu" size={24} /><StudioIcon name="close" size={24} /></div>
    </InspectorAccordionSection>
    {props.links.some(item => navigationEntries([item]).some(entry => entry.link.children?.length)) ? <InspectorAccordionSection title="Submenus" contentDisabled={!props.writable}>
      <ToggleSetting label="Open submenus on click" checked={Boolean(block.data?.submenuOpenOnClick)} disabled={!props.writable} onChange={submenuOpenOnClick => data({ submenuOpenOnClick })} />
      <ToggleSetting label="Show submenu arrow" checked={block.data?.showSubmenuIcon !== false} disabled={!props.writable} onChange={showSubmenuIcon => data({ showSubmenuIcon })} />
    </InspectorAccordionSection> : null}
    <InspectorAccordionSection title="Advanced" defaultOpen={false} contentDisabled={!props.writable}><LinkSetting label="Accessible label" value={String(block.data?.ariaLabel ?? "Site navigation")} maxLength={160} onCommit={ariaLabel => data({ ariaLabel })} /></InspectorAccordionSection>
    </> : <>
    <div className="navigation-style-settings"><ParagraphInspector profileOverride={navigationStyleProfile} block={block} onChange={next => { if (props.writable) onBlockChange(next); }} fontSizeViewMode={fontSizeViewMode} onFontSizeViewModeChange={setFontSizeViewMode} /></div>
    <InspectorToolsSection title="Colour" options={[{ id: "text", label: "Text" }, { id: "background", label: "Background" }, { id: "submenu-text", label: "Submenu and overlay text" }, { id: "submenu-background", label: "Submenu and overlay background" }]} visible={visibleColours} alwaysShow canReset={Boolean(block.visualStyle?.textColor || block.visualStyle?.backgroundColor || block.data?.submenuTextColor || block.data?.submenuBackgroundColor)} onToggle={id => setVisibleColours(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => { if (props.writable) { const nextData = { ...block.data }; delete nextData.submenuTextColor; delete nextData.submenuBackgroundColor; onBlockChange({ ...block, data: nextData, visualStyle: { ...block.visualStyle, textColor: undefined, backgroundColor: undefined } }); } }}><div className="navigation-colour-controls">
      {visibleColours.has("text") ? <PaletteColourSetting row label="Text" value={block.visualStyle?.textColor} onChange={textColor => onBlockChange({ ...block, visualStyle: { ...block.visualStyle, textColor } })} /> : null}
      {visibleColours.has("background") ? <PaletteColourSetting row label="Background" value={block.visualStyle?.backgroundColor} onChange={backgroundColor => onBlockChange({ ...block, visualStyle: { ...block.visualStyle, backgroundColor } })} /> : null}
      {visibleColours.has("submenu-text") ? <PaletteColourSetting row label="Submenu and overlay text" value={block.data?.submenuTextColor as string | undefined} onChange={submenuTextColor => data({ submenuTextColor })} /> : null}
      {visibleColours.has("submenu-background") ? <PaletteColourSetting row label="Submenu and overlay background" value={block.data?.submenuBackgroundColor as string | undefined} onChange={submenuBackgroundColor => data({ submenuBackgroundColor })} /> : null}
    </div></InspectorToolsSection>
    <GroupLayoutControls navigation block={block} onChange={onBlockChange} />
    </>}
    </div>
  </div>;
}
