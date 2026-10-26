"use client";
import { SelectControl, TextInput } from "./controls/native-fields";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import { InserterToggleIcon } from "./controls/inserter-toggle-icon";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties, type DragEvent } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock, ParagraphAppearance } from "../content/model";
import { equivalentLinkDestination, updatedLinkDestination } from "../content/link-destination";
import { paragraphStyleToCss, paragraphStyleClassName, paragraphStyleAnchor } from "../content/paragraph-styles";
import { LinkDestinationPopover, type LinkSuggestion } from "./controls/link-destination-popover";
import { LinkSuggestions } from "./controls/link-controls";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { PaletteColourSetting } from "./controls/palette-colour-setting";
import { PaneTabs, paneTabTarget } from "./panes/pane-components";
import { AdvancedFieldsControl } from "./controls/advanced-fields-control";
import { ToggleSetting } from "./controls/toggle-setting";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { GroupLayoutControls } from "./blocks/group-layout-controls";
import { useResponsiveStyleScope } from "./responsive-style-context";
import { ParagraphInspector } from "./blocks/inspectors/paragraph-inspector";
import { navigationStyleProfile } from "./blocks/capability-profiles";
import { resolveBlockToolbar } from "./blocks/toolbar-registry";
import { BlockToolbar } from "./blocks/block-toolbar";
import { InspectorToolsSection } from "./inspector-tools-section";
import { InspectorAccordionSection } from "./inspector-accordion";
import { StudioIcon } from "./studio-icons";
import { templateId, type NavigationTemplateNode, type TemplatePart, type SiteLink } from "./template-model";
import { insertNavigationItem, moveNavigationItem, navigationEntries, reorderNavigationItem, removeNavigationItem, updateNavigationItem } from "./navigation-items";

import { useGapReordering } from "./use-gap-reordering";

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
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const baseline = useRef<SiteLink[]>(props.links);
  const entries = navigationEntries(props.links);
  const parent = parentId ? entries.find(item => item.link.id === parentId) : null;
  const allowed = entries.length < 100 && (!parentId || Boolean(parent && parent.depth < 5));
  const visible = open && props.writable && allowed;
  const label = visible ? "Close link picker" : parentId ? "Add submenu link" : "Add navigation link";
  const close = (focus: boolean) => { setOpen(false); if (focus) trigger.current?.focus(); };
  const matches = props.suggestions.filter(item => `${item.title} ${item.href}`.toLocaleLowerCase("en-GB").includes(query.trim().toLocaleLowerCase("en-GB"))).slice(0, 5);
  function insertLink(text: string, url: string) {
    if (!props.writable || JSON.stringify(props.links) !== JSON.stringify(baseline.current)) {
      setError("The menu changed. Close and reopen to add a link to its latest version.");
      return;
    }
    const destination = updatedLinkDestination({ url: "" }, { url, opensInNewTab: false, nofollow: false });
    if (!destination) {
      setError("Use a full URL, email link, /path or #anchor.");
      return;
    }
    const link = { id: templateId(), label: text.trim().slice(0, 160), ...destination };
    if (!link.label) {
      setError("Choose a page or enter a link destination.");
      return;
    }
    if (!props.onChange(insertNavigationItem(props.links, link, parentId, afterId))) {
      setError("The link could not be saved. Your menu is unchanged.");
      return;
    }
    props.onSelect(link.id);
    close(false);
    focusNavigationItem(link.id, props.blockId);
  }
  return <>
    <button ref={trigger} type="button" className="navigation-add" disabled={!props.writable || !allowed} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={visible} onClick={event => { event.stopPropagation(); if (visible) { close(true); return; } baseline.current = props.links; setQuery(""); setError(null); setOpen(true); }}><InserterToggleIcon open={visible} size={20} /></button>
    {visible ? <StudioAnchoredPopover key={`add-${parentId ?? afterId ?? "root"}`} anchor={() => trigger.current} label="Add navigation link" focusOnMount onClose={close} className="navigation-add-picker">
      <button className="studio-link-close" type="button" onClick={() => close(true)} aria-label="Close link picker" title="Close"><StudioIcon name="close" size={20} /></button>
      <form onSubmit={event => {
        event.preventDefault();
        const value = query.trim();
        const exact = props.suggestions.find(item => item.href === value || item.title.toLocaleLowerCase("en-GB") === value.toLocaleLowerCase("en-GB"));
        insertLink(exact?.title ?? value, exact?.href ?? value);
      }}>
        <label className="studio-link-url"><span className="visually-hidden">Search or type URL</span><TextInput aria-label="Search or type URL" placeholder="Search or type URL" autoComplete="url" value={query} onChange={event => { setQuery(event.target.value); setError(null); }} /></label>
      </form>
      <LinkSuggestions items={matches} onChoose={item => insertLink(item.title, item.href)} />
      {error ? <p role="alert">{error}</p> : null}
    </StudioAnchoredPopover> : null}
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
    </StudioAnchoredMenu> : null}
  </>;
}

type NavigationCanvasItemProps = NavigationEditingProps & {
  item: SiteLink; vertical: boolean; version: string;
  onDragItem: (event: DragEvent<HTMLElement>, id: string) => void;
  handleProps: ReturnType<typeof useGapReordering>["handleProps"];
  rowProps: (id: string) => { "data-gap-row": string; "data-gap-owner": string };
  onDragEndItem: () => void;
};

function NavigationCanvasItem({ item, vertical, version, onDragItem, rowProps, handleProps, onDragEndItem, ...props }: NavigationCanvasItemProps) {
  const selected = props.selectedId === item.id;
  const [hovered, setHovered] = useState(false);
  const toolbarVisible = selected || hovered;
  const toolbarActions = resolveBlockToolbar({ block: { type: "page-link" }, writable: props.writable, selected: toolbarVisible });
  const hasToolbarAction = (id: string) => toolbarActions.some(action => action.id === id);
  const itemRef = useRef<HTMLLIElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarBounds, setToolbarBounds] = useState({ offset: 0, width: 360 });
  useLayoutEffect(() => {
    const owner = itemRef.current?.closest<HTMLElement>(".navigation-editor");
    const itemElement = itemRef.current;
    const toolbar = toolbarRef.current;
    if (!toolbarVisible || !owner || !itemElement || !toolbar) return;
    const place = () => {
      const scale = owner.getBoundingClientRect().width / owner.offsetWidth || 1;
      const left = (itemElement.getBoundingClientRect().left - owner.getBoundingClientRect().left) / scale;
      const offset = Math.max(-left, Math.min(0, owner.clientWidth - left - toolbar.offsetWidth));
      setToolbarBounds(current => current.offset === offset && current.width === owner.clientWidth ? current : { offset, width: owner.clientWidth });
    };
    const observer = new ResizeObserver(place);
    observer.observe(owner); observer.observe(itemElement); observer.observe(toolbar);
    place();
    return () => observer.disconnect();
  }, [toolbarVisible, props.links]);
  const trigger = useRef<HTMLButtonElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const entry = navigationEntries(props.links).find(entry => entry.link.id === item.id)!;
  const close = (focus: boolean) => { setLinkOpen(false); if (focus) trigger.current?.focus(); };
  const appearance = item.visualStyle?.appearance ?? "regular";
  const italic = appearance === "italic" || appearance.endsWith("-italic");
  const weight = italic ? appearance === "italic" ? "regular" : appearance.slice(0, -7) : appearance;
  const bold = ["bold", "extra-bold", "black"].includes(weight);
  function format(nextBold: boolean, nextItalic: boolean) {
    if (!props.writable) return;
    const nextWeight = nextBold === bold ? weight : nextBold ? "bold" : "regular";
    const nextAppearance = (nextItalic ? nextWeight === "regular" ? "italic" : `${nextWeight}-italic` : nextWeight) as ParagraphAppearance;
    props.onChange(updateNavigationItem(props.links, item.id, link => ({ ...link, visualStyle: { ...link.visualStyle, appearance: nextAppearance } })));
  }
  return <li ref={itemRef} id={paragraphStyleAnchor(item.visualStyle)} style={paragraphStyleToCss(item.visualStyle)} className={`navigation-edit-item${selected ? " is-selected" : ""} ${paragraphStyleClassName(item.visualStyle)}`} {...rowProps(item.id)} onFocusCapture={event => { if (event.target instanceof HTMLElement && event.target.closest(".navigation-edit-item") === event.currentTarget && !selected) props.onSelect(item.id); }} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={event => { if (event.pointerType !== "touch") setHovered(false); }}>
    {toolbarVisible ? <BlockToolbar actions={toolbarActions} blockType="page-link" className="navigation-link-toolbar" label="Page link tools" style={{ insetInlineStart: toolbarBounds.offset, maxWidth: toolbarBounds.width }}>
      {hasToolbarAction("page-link-parent") ? <button type="button" className="navigation-parent-select" onClick={() => props.onSelect(null)} aria-label="Select parent block: Navigation" title="Select parent block: Navigation"><AcmIcon name="navigation.menu" size={24} /></button> : null}
      <span className="navigation-link-type" title="Page link"><AcmIcon name="view.pages" size={24} /><span className="visually-hidden">Page link</span></span>
      {hasToolbarAction("page-link-reorder") ? <><button {...handleProps(item.id)} type="button" draggable={props.writable} disabled={!props.writable} onDragStart={event => onDragItem(event, item.id)} onDragEnd={onDragEndItem} aria-label="Drag Page link" title="Drag"><StudioIcon name="drag-handle" size={20} /></button>
      <button type="button" disabled={!props.writable || entry.index === 0} onClick={() => { if (props.onChange(moveNavigationItem(props.links, item.id, -1))) focusNavigationItem(item.id, props.blockId); }} aria-label={vertical ? "Move Page link up" : "Move Page link left"} title={vertical ? "Move up" : "Move left"}><StudioIcon name={vertical ? "arrow-up" : "arrow-left"} size={20} /></button>
      <button type="button" disabled={!props.writable || entry.index === entry.siblings.length - 1} onClick={() => { if (props.onChange(moveNavigationItem(props.links, item.id, 1))) focusNavigationItem(item.id, props.blockId); }} aria-label={vertical ? "Move Page link down" : "Move Page link right"} title={vertical ? "Move down" : "Move right"}><StudioIcon name={vertical ? "arrow-down" : "arrow-right"} size={20} /></button></> : null}
      {hasToolbarAction("page-link-edit") ? <button ref={trigger} type="button" disabled={!props.writable} onClick={() => setLinkOpen(true)} aria-label="Edit Page link" title="Link" aria-haspopup="dialog" aria-expanded={linkOpen}><StudioIcon name="link" size={20} /></button> : null}
      {hasToolbarAction("page-link-add") ? <NavigationAdd {...props} parentId={item.id} /> : null}
      {hasToolbarAction("bold") ? <button type="button" disabled={!props.writable} aria-label="Bold Page link" title="Bold" aria-pressed={bold} onClick={() => format(!bold, italic)}><StudioIcon name="format-bold" size={20} /></button> : null}
      {hasToolbarAction("italic") ? <button type="button" disabled={!props.writable} aria-label="Italic Page link" title="Italic" aria-pressed={italic} onClick={() => format(bold, !italic)}><StudioIcon name="format-italic" size={20} /></button> : null}
      {hasToolbarAction("page-link-options") ? <NavigationItemActions {...props} item={item} onEdit={() => setLinkOpen(true)} /> : null}
    </BlockToolbar> : null}
    <TextInput className="navigation-edit-label" data-navigation-link-id={item.id} aria-label={`Navigation link text: ${item.label || "Untitled"}`} value={item.label} maxLength={160} readOnly={!props.writable} style={paragraphStyleToCss({ ...item.visualStyle, additionalCss: undefined })} onFocus={() => props.onSelect(item.id)} onChange={event => props.onChange(updateNavigationItem(props.links, item.id, current => ({ ...current, label: event.target.value })))} onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); event.stopPropagation(); setLinkOpen(true); }
      if ((event.metaKey || event.ctrlKey) && ["b", "i"].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopPropagation(); if (event.key.toLowerCase() === "b") format(!bold, italic); else format(bold, !italic); }
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.stopPropagation(); props.onSelect(null); }
    }} />
    {item.children?.length ? <div className="navigation-edit-submenu"><StudioIcon name="chevron-down" size={16} /><NavigationCanvasList {...props} version={version} siblings={item.children} vertical /></div> : null}
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

function NavigationCanvasList({ siblings, vertical, version, root = false, ...props }: NavigationEditingProps & { siblings: SiteLink[]; vertical: boolean; version: string; root?: boolean }) {
  const reorder = useGapReordering({ ids: siblings.map(link => link.id), version, writable: props.writable, axis: vertical ? "y" : "x",
    accepts: move => Boolean(reorderNavigationItem(props.links, move.id, move.targetId, move.edge)),
    onMove: move => { const next = reorderNavigationItem(props.links, move.id, move.targetId, move.edge); if (!next || !props.onChange(next)) return false; props.onSelect(move.id); focusNavigationItem(move.id, props.blockId); return true; },
  });
  return <ul className={root ? "template-navigation-items" : undefined} {...reorder.listProps}>
    {siblings.map(item => <NavigationCanvasItem key={item.id} {...props} item={item} vertical={vertical} version={version} handleProps={reorder.handleProps} rowProps={reorder.rowProps} onDragItem={reorder.start} onDragEndItem={reorder.cancel} />)}
    {root && props.writable ? <li className="navigation-appender"><NavigationAdd {...props} /></li> : null}
    <DragPlacementIndicator as="li" line={reorder.line} />
  </ul>;
}

export function NavigationCanvasEditor({ node, ...props }: NavigationEditingProps & { node: NavigationTemplateNode }) {
  return <nav id={paragraphStyleAnchor(node.visualStyle)} className={["template-navigation acm-navigation navigation-editor", paragraphStyleClassName(node.visualStyle)].filter(Boolean).join(" ")} data-navigation-block-id={node.id} aria-label={node.ariaLabel || "Site navigation"} data-navigation-layout={node.layout ?? "row"} data-navigation-align={node.horizontalAlign ?? node.align ?? "left"} style={{ ...paragraphStyleToCss(node.visualStyle), "--navigation-submenu-text": node.submenuTextColor, "--navigation-submenu-background": node.submenuBackgroundColor, justifyContent: (node.horizontalAlign ?? node.align) === "centre" ? "center" : (node.horizontalAlign ?? node.align) === "right" ? "flex-end" : node.horizontalAlign === "space-between" ? "space-between" : "flex-start", flexWrap: node.allowWrap === false ? "nowrap" : "wrap", gap: node.gap === undefined ? undefined : `${node.gap}px` } as CSSProperties} onPointerDown={event => event.stopPropagation()}>
    <NavigationCanvasList {...props} version={JSON.stringify([props.links, node])} blockId={node.id} siblings={props.links} vertical={node.layout === "stack"} root />
  </nav>;
}

function NavigationMenuSiblings({ siblings, version, nested = false, ...props }: NavigationEditingProps & { siblings: SiteLink[]; version: string; nested?: boolean }) {
  const reorder = useGapReordering({ ids: siblings.map(link => link.id), version, writable: props.writable,
    accepts: move => Boolean(reorderNavigationItem(props.links, move.id, move.targetId, move.edge)),
    onMove: move => {
      const next = reorderNavigationItem(props.links, move.id, move.targetId, move.edge);
      if (!next || !props.onChange(next)) return false;
      return true;
    },
  });
  function move(id: string, direction: -1 | 1, button: HTMLButtonElement) {
    const index = siblings.findIndex(link => link.id === id);
    if (!props.writable || index < 0 || index + direction < 0 || index + direction >= siblings.length) return;
    const reachesBoundary = index + direction === (direction === -1 ? 0 : siblings.length - 1);
    const restoreFocus = reachesBoundary && document.activeElement === button;
    if (!props.onChange(moveNavigationItem(props.links, id, direction)) || !restoreFocus) return;
    // A boundary move disables its trigger; retain keyboard focus within the same row.
    requestAnimationFrame(() => {
      if (!button.isConnected || (document.activeElement !== button && document.activeElement !== document.body)) return;
      button.closest(".navigation-menu-row")?.querySelector<HTMLButtonElement>(".navigation-menu-move:not(:disabled)")?.focus();
    });
  }
  return <ul className={nested ? "navigation-menu-submenu" : undefined} aria-label={nested ? "Submenu items" : "Navigation menu items"} {...reorder.listProps}>
    {siblings.map((link, index) => <li key={link.id} {...reorder.rowProps(link.id)}>
      <div className="navigation-menu-row">
        <button {...reorder.handleProps(link.id)} type="button" className="navigation-item-options navigation-menu-drag" draggable={props.writable && siblings.length > 1} disabled={!props.writable || siblings.length < 2} onDragStart={event => reorder.start(event, link.id)} onDragEnd={reorder.cancel} aria-label={`Drag ${link.label || "Untitled Link"}`} title="Drag to reorder"><StudioIcon name="drag-handle" size={20} /></button>
        <button type="button" className="navigation-menu-select" data-navigation-link-id={link.id} aria-pressed={props.selectedId === link.id} onClick={() => { props.onSelect(link.id); focusNavigationItem(link.id, props.blockId); }}><AcmIcon name="view.pages" size={20} /><span>{link.label || "Untitled Link"}</span></button>
        <button type="button" className="navigation-item-options navigation-menu-move" disabled={!props.writable || index === 0} aria-label={`Move ${link.label || "Untitled Link"} up`} title="Move Up" onClick={event => move(link.id, -1, event.currentTarget)}><StudioIcon name="arrow-up" size={20} /></button>
        <button type="button" className="navigation-item-options navigation-menu-move" disabled={!props.writable || index === siblings.length - 1} aria-label={`Move ${link.label || "Untitled Link"} down`} title="Move Down" onClick={event => move(link.id, 1, event.currentTarget)}><StudioIcon name="arrow-down" size={20} /></button>
        <NavigationItemActions {...props} item={link} />
      </div>
      {link.children?.length ? <NavigationMenuSiblings {...props} siblings={link.children} version={version} nested /> : null}
    </li>)}
    <DragPlacementIndicator as="li" line={reorder.line} />
  </ul>;
}

export function NavigationMenuList(props: NavigationEditingProps) {
  return <div className="navigation-menu-list"><NavigationMenuSiblings {...props} siblings={props.links} version={JSON.stringify(props.links)} /><div className="navigation-menu-add"><NavigationAdd {...props} /></div></div>;
}

export function LinkSetting({ label, value, maxLength = 2000, onCommit, onDraftChange }: { label: string; value: string; maxLength?: number; onCommit: (value: string) => void; onDraftChange?: (value: string) => void }) {
  return <label>{label}<TextInput key={value} defaultValue={value} maxLength={maxLength} onChange={event => onDraftChange?.(event.target.value)} onBlur={event => { if (event.target.value !== value) onCommit(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
}

export function NavigationInspector({ linkHistory, linksWritable, block, menuName = "Navigation", onBlockChange, overlayContext = false, overlayParts = [], canCreateOverlay = true, onCreateOverlay, onEditOverlay, ...props }: NavigationEditingProps & { linkHistory?: ReactNode; linksWritable?: boolean; menuName?: string; block: Extract<ContentBlock, { type: "group" }>; onBlockChange: (block: ContentBlock) => void; overlayContext?: boolean; overlayParts?: TemplatePart[]; canCreateOverlay?: boolean; onCreateOverlay?: () => void; onEditOverlay?: (id: string) => void }) {
  const { editingViewport } = useResponsiveStyleScope();
  const menuWritable = linksWritable ?? props.writable;
  const [activeTab, setActiveTab] = useState("menu");
  const tabId = useId();
  const [menuOptionsOpen, setMenuOptionsOpen] = useState(false);
  const menuOptionsTrigger = useRef<HTMLButtonElement>(null);
  const [visibleColours, setVisibleColours] = useState(() => new Set(["text", "background", "submenu-text", "submenu-background"]));
  const [fontSizeViewMode, setFontSizeViewMode] = useState<"presets" | "custom" | null>(null);
  const data = (patch: Record<string, string | boolean | undefined>) => {
    const next = { ...block.data };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined) delete next[key]; else next[key] = value; }
    if (props.writable) onBlockChange({ ...block, data: next });
  };

  return <div className="navigation-inspector inspector-sections">
    <div className="navigation-block-summary"><h3><AcmIcon name="navigation.menu" size={24} />Navigation</h3><p>A collection of blocks that allow visitors to get around your site.</p></div>
    <PaneTabs id={tabId} label="Navigation controls" indicatorVariant="selected" className="navigation-inspector-tabs" tabs={[{ id: "menu", label: "Menu" }, { id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]} active={activeTab} onChange={setActiveTab} renderLabel={tab => <><AcmIcon name={tab.id === "menu" ? "view.list" : tab.id === "settings" ? "action.settings" : "view.styles"} size={24} /><span className="visually-hidden">{tab.label}</span></>} />
    <div role="tabpanel" id={paneTabTarget(tabId, activeTab, "panel")} aria-labelledby={paneTabTarget(tabId, activeTab, "tab")}>
    {editingViewport !== "desktop" && activeTab !== "menu" ? <div className="navigation-inspector inspector-sections"><h3>Navigation</h3><p className="setting-note">Style {editingViewport} only. Unset values inherit Desktop.</p><ParagraphInspector key={`${block.id}:${editingViewport}`} profileOverride={navigationStyleProfile} block={block} onChange={next => { if (props.writable) onBlockChange(next); }} fontSizeViewMode={fontSizeViewMode} onFontSizeViewModeChange={setFontSizeViewMode} /></div> : activeTab === "menu" ? <>
    <section className="navigation-menu-section">
      <div className="navigation-menu-heading"><h2>{menuName}</h2><button ref={menuOptionsTrigger} type="button" className="navigation-item-options" aria-label="Menu options" aria-haspopup="menu" aria-expanded={menuOptionsOpen} onClick={() => setMenuOptionsOpen(open => !open)}><StudioIcon name="more-vertical" size={20} /></button></div>
      {menuOptionsOpen ? <StudioAnchoredMenu inspectorPlacement anchor={() => menuOptionsTrigger.current} aria-label="Menu options" onClose={(focus = true) => { setMenuOptionsOpen(false); if (focus) menuOptionsTrigger.current?.focus(); }}>
        <button type="button" role="menuitem" disabled={!props.links.length} onClick={() => { setMenuOptionsOpen(false); props.onSelect(props.links[0]?.id ?? null); }}>Edit first Page link</button>
      </StudioAnchoredMenu> : null}
      {linkHistory}<NavigationMenuList {...props} writable={menuWritable} blockId={block.id} />{linksWritable === false ? <p className="setting-note">Menu links are read-only. Editing requires an active site with editing available; preview selection does not grant permission.</p> : null}
    </section>
    </> : activeTab === "settings" ? <>
    {!overlayContext ? <InspectorAccordionSection title="Overlay" contentDisabled={!props.writable}>
      <fieldset className="navigation-overlay-control"><legend>Overlay visibility</legend><div role="group" aria-label="Overlay visibility">{(["never", "mobile", "always"] as const).map(value => <button type="button" key={value} aria-pressed={(block.data?.overlayMenu ?? "never") === value} onClick={() => data({ overlayMenu: value })}>{value === "never" ? "Off" : value === "mobile" ? "Mobile" : "Always"}</button>)}</div></fieldset>
      <p className="setting-note">Collapses the navigation options in a menu icon opening an overlay.</p>
      {(block.data?.overlayMenu ?? "never") !== "never" ? <>
      <div className="navigation-overlay-specimen" aria-hidden="true">{block.data?.showIcon === false ? <><span>Menu</span><span>Close</span></> : <><AcmIcon name={block.data?.icon === "handle" ? "navigation.menu-compact" : "navigation.menu"} size={24} /><StudioIcon name="close" size={24} /></>}</div>
      <div className="navigation-overlay-toggle"><ToggleSetting label="Show icon button" checked={block.data?.showIcon !== false} disabled={!props.writable} onChange={showIcon => data({ showIcon })} /><p className="setting-note">Configure the visual appearance of the button that toggles the overlay menu.</p></div>
      {block.data?.showIcon !== false ? <fieldset className="navigation-overlay-control navigation-icon-control"><legend>Icon</legend><div role="group" aria-label="Overlay button icon">{(["handle", "menu"] as const).map(icon => <button type="button" key={icon} aria-label={icon === "handle" ? "Two-line menu icon" : "Three-line menu icon"} aria-pressed={(block.data?.icon ?? "menu") === icon} onClick={() => data({ icon })}><AcmIcon name={icon === "handle" ? "navigation.menu-compact" : "navigation.menu"} size={24} /></button>)}</div></fieldset> : null}
      <div className="navigation-overlay-template-heading"><label htmlFor={`${tabId}-overlay-template`}>Overlay template</label>{onCreateOverlay ? <button type="button" aria-label="Create new overlay template" title="Create new overlay template" disabled={!props.writable || !canCreateOverlay} onClick={onCreateOverlay}><StudioIcon name="add" size={24} /></button> : null}</div>
      <SelectControl id={`${tabId}-overlay-template`} value={String(block.data?.overlayPartId ?? "")} onChange={event => data({ overlayPartId: event.target.value || undefined })}><option value="">Default</option>{overlayParts.map(part => <option key={part.id} value={part.id}>{part.name}</option>)}</SelectControl>
      <p className="setting-note">Select an overlay for navigation.</p>
      {block.data?.overlayPartId && onEditOverlay ? <button type="button" className="navigation-edit-overlay" onClick={() => onEditOverlay(String(block.data?.overlayPartId))}><StudioIcon name="pencil" />Edit overlay</button> : null}
      <p className="setting-note">An overlay template allows you to customise the appearance of the dialogue that opens when the menu button is pressed.</p>
      </> : null}
    </InspectorAccordionSection> : null}
    {props.links.some(item => navigationEntries([item]).some(entry => entry.link.children?.length)) ? <InspectorAccordionSection title="Submenus" contentDisabled={!props.writable}>
      <ToggleSetting label="Open submenus on click" checked={Boolean(block.data?.submenuOpenOnClick)} disabled={!props.writable} onChange={submenuOpenOnClick => data({ submenuOpenOnClick })} />
      <ToggleSetting label="Show submenu arrow" checked={block.data?.showSubmenuIcon !== false} disabled={!props.writable} onChange={showSubmenuIcon => data({ showSubmenuIcon })} />
    </InspectorAccordionSection> : null}
    <InspectorAccordionSection title="Advanced" defaultOpen={false} contentDisabled={!props.writable}><AdvancedFieldsControl fields={{ anchor: true, className: true, additionalCss: true }} style={block.visualStyle ?? {}} blockName="Navigation" onChange={(field, value) => { if (props.writable) onBlockChange({ ...block, visualStyle: { ...block.visualStyle, [field]: value || undefined } }); }} /><LinkSetting label="Accessible label" value={String(block.data?.ariaLabel ?? "Site navigation")} maxLength={160} onCommit={ariaLabel => data({ ariaLabel })} /></InspectorAccordionSection>
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
