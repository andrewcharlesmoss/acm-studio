"use client";

import { AcmIcon } from "@acm/icons/react";
import { handleStudioHistoryShortcut } from "./studio-history-shortcuts.mjs";
import { HistoryActions } from "./controls/history-actions";
import { StudioButton } from "./controls/button";
import { SelectControl, TextInput } from "./controls/native-fields";
import { useResponsiveStyleScope } from "./responsive-style-context";
import type { ListItemBackgroundTarget } from "./list-item-background";
import { useEffect, useId, useState } from "react";
import type { ContentBlock } from "../content/model";
import { findColumnsParent, maximumColumnWidth } from "../content/columns";
import { parentOfNestedBlock } from "./block-inserter-options";
import { spacerOrientationFor } from "../content/spacer";
import { BlockInspector } from "./studio-inspectors";
import type { ListItemSelection } from "../content/model";
import { InspectorAccordionSection, InspectorContentDisabledProvider } from "./inspector-accordion";
import { templateId, templateElementLabel, templateEditorBlocks, visitTemplateNodes, isNavigationSpacer, type TemplateSet, type PageTemplate, type TemplatePart, type SiteLink, type NavigationItem } from "./template-model";
import { templateCopyrightPlaceholders } from "./template-placeholders";
import { Pane, PaneTabs } from "./panes/pane-components";
import { PageLinkInspector } from "./page-link-inspector";
import { NavigationInspector, NavigationMenuList, NavigationSearchInspector, NavigationSpacerInspector } from "./template-navigation-editor";
import type { LinkSuggestion } from "./controls/link-destination-popover";
import { navigationEntries } from "./navigation-items";
import { createNavigationOverlay } from "./navigation-overlay";
import { StudioIcon } from "./studio-icons";
import { InspectorSettingRow, InspectorSettingsSection } from "./controls/inspector-setting-row";
import { NavigationReviewDialog } from "./site-editor/navigation-review-dialog";

export function TemplateTextSetting({ label, value, onCommit, placeholder, inline = false }: { label: string; value: string; onCommit: (value: string) => void; placeholder?: string; inline?: boolean }) {
  const editor = <label>{label}<TextInput key={value} defaultValue={value} placeholder={placeholder} onBlur={event => { if (event.target.value !== value) onCommit(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
  return inline ? editor : <InspectorSettingRow label={label} value={value || "Not set"}>{editor}</InspectorSettingRow>;
}

function LinkSettings({ title, links, onChange, disabled = false }: { title: string; links: SiteLink[]; onChange: (links: SiteLink[]) => void; disabled?: boolean }) {
  const [label, setLabel] = useState(""); const [url, setUrl] = useState("");
  return <InspectorSettingsSection title={title} disabled={disabled}>{links.map((link, index) => <div key={link.id} className="template-link-item">
    <TemplateTextSetting label="Link label" value={link.label} onCommit={label => onChange(links.map(item => item.id === link.id ? { ...item, label } : item))} />
    <TemplateTextSetting label="Destination" value={link.url} onCommit={url => onChange(links.map(item => item.id === link.id ? { ...item, url } : item))} />
    <button type="button" disabled={!index} onClick={() => { const next = [...links]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>Move up</button>{" "}
    <button type="button" onClick={() => onChange(links.filter(item => item.id !== link.id))}>Remove link</button>
  </div>)}<label>New Link label<TextInput value={label} onChange={event => setLabel(event.target.value)} placeholder={title === "Social and support" ? "LinkedIn or Buy Me a Coffee" : "About"} /></label><label>New destination<TextInput value={url} onChange={event => setUrl(event.target.value)} placeholder="https://… or /page" /></label><button type="button" disabled={!label.trim() || !url.trim()} onClick={() => { onChange([...links, { id: templateId(), label: label.trim(), url: url.trim() }]); }}>Add link</button></InspectorSettingsSection>;
}

export function TemplatePartReferenceRow({ nodeId, name, kind, selected, onSelect }: { nodeId: string; name: string; kind: "header" | "footer"; selected: boolean; onSelect: (id: string) => void }) {
  return <button type="button" className="template-part-reference-row" aria-pressed={selected} onClick={() => onSelect(nodeId)}><AcmIcon name={kind === "header" ? "layout.header" : "layout.footer"} size={20} /><span>{name}</span></button>;
}

export function TemplateInspector({ siteNavigationPane, globalOriginal = false, canOpenImageFiles = false, set, target, selectedBlock, selectedListItem = null, navigationLinkId = null, navigationSearch = false, navigationPageList = false, navigationSuggestions = [], siteId, onSelectNavigationLink = () => {}, onNavigationChange, writable, onChange, onBlockChange, onColumnCountChange, onColumnWidthChange, onColumnWidthUnitChange, onOpenMedia, onEditPart, onSelectTemplatePart = () => {}, users, tab: selectedTab, onTabChange, paneWidth = 300, onPaneWidthChange, paneCollapsed = false, onPaneCollapsedChange }: {
  siteNavigationPane?: import("./use-navigation-editing").SiteNavigationPaneAdapter;
  globalOriginal?: boolean;
  canOpenImageFiles?: boolean; set: TemplateSet; target: PageTemplate | TemplatePart; selectedBlock: ContentBlock | null; writable: boolean;
  selectedListItem?: ListItemSelection | null;
  siteId?: import("./test-site/sites").LocalFixtureSiteId;
  navigationLinkId?: string | null; navigationSearch?: boolean; navigationPageList?: boolean; navigationSuggestions?: LinkSuggestion[]; onSelectNavigationLink?: (id: string | null) => void; onNavigationChange?: (links: NavigationItem[]) => boolean;
  onChange: (set: TemplateSet) => boolean; onBlockChange: (block: ContentBlock) => void; onColumnCountChange?: (parent: Extract<ContentBlock, { type: "columns" }>, count: number) => void; onColumnWidthChange?: (parent: Extract<ContentBlock, { type: "columns" }>, columnId: string, width: number) => void; onColumnWidthUnitChange?: (parent: Extract<ContentBlock, { type: "columns" }>, columnId: string, width: number, unit: import("../content/model").ColumnWidthUnit) => void; onOpenMedia: (logo?: boolean, background?: boolean, item?: ListItemBackgroundTarget, trigger?: HTMLElement) => void; onEditPart: (id: string, nextSet?: TemplateSet) => void; users: string[];
  onSelectTemplatePart?: (id: string) => void;
  tab?: "template" | "styles" | "block"; onTabChange?: (tab: "template" | "styles" | "block") => void;
  paneWidth?: number; onPaneWidthChange?: (width: number) => void; paneCollapsed?: boolean; onPaneCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [localTab, setLocalTab] = useState<"template" | "styles" | "block">("template");
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, "presets" | "custom">>({});
  const [navigationReviewOpen, setNavigationReviewOpen] = useState(false);
  const [navigationReviewOpener, setNavigationReviewOpener] = useState<HTMLElement | null>(null);
  const requestedTab = selectedTab ?? localTab;
  const isPageOrPost = target.kind === "page" || target.kind === "post";
  const tab = requestedTab === "styles" ? "template" : requestedTab;
  const { editingViewport } = useResponsiveStyleScope();
  const tabPrefix = useId();
  function selectTab(nextTab: typeof tab) { setLocalTab(nextTab); onTabChange?.(nextTab); }
  const element = selectedBlock?.type === "group" ? selectedBlock.data?.templateElement : undefined;
  const partId = selectedBlock?.type === "group" ? selectedBlock.data?.templatePart : undefined;
  const canSetSticky = selectedBlock?.type === "group" && target.nodes.some(node => node.id === selectedBlock.id);
  const templateBlocks = templateEditorBlocks(target.nodes);
  const selectedColumnParent = selectedBlock?.type === "column" ? findColumnsParent(templateBlocks, selectedBlock.id) : undefined;
  const selectedFlexParent = selectedBlock ? parentOfNestedBlock(templateBlocks, selectedBlock.id) : null;
  const selectedSpacerOrientation = selectedBlock?.type === "spacer" ? spacerOrientationFor(templateBlocks, selectedBlock.id) : "vertical";
  const templateTarget = target.kind === "page" || target.kind === "post" ? target : undefined;
  const referencedParts: { nodeId: string; name: string; kind: "header" | "footer" }[] = [];
  if (templateTarget) visitTemplateNodes(templateTarget.nodes, node => {
    if (node.type !== "part") return;
    const part = set.parts.find(candidate => candidate.id === node.partId);
    if (part?.kind === "header" || part?.kind === "footer") referencedParts.push({ nodeId: node.id, name: part.name, kind: part.kind });
  });
  useEffect(() => {
    if (!siteNavigationPane?.writable) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest(".template-inspector .navigation-menu-section, .template-inspector .page-link-inspector")) handleStudioHistoryShortcut(event, navigator.platform, siteNavigationPane.undo, siteNavigationPane.redo);
    };
    document.addEventListener("keydown", keydown, true);
    return () => document.removeEventListener("keydown", keydown, true);
  }, [siteNavigationPane]);
  function renderNavigationSettings() {
    if (!selectedBlock) return null;
    const assignedMenuId = siteNavigationPane?.assignments.find(item => item.navigationId === selectedBlock.id)?.menuId ?? siteNavigationPane?.defaultMenuId;
    const assignment = siteNavigationPane?.menus.length ? <label className="navigation-menu-assignment">Menu<SelectControl aria-label="Navigation menu" value={assignedMenuId ?? ""} disabled={!siteNavigationPane.writable} onChange={event => siteNavigationPane.assign(selectedBlock.id, event.currentTarget.value)}>{siteNavigationPane.menus.map(menu => <option value={menu.id} key={menu.id}>{menu.name}</option>)}</SelectControl></label> : null;
    const links = siteNavigationPane?.linksFor(selectedBlock.id) ?? set.navigation;
    const editor = navigationSearch && selectedBlock.type === "group"
      ? <NavigationSearchInspector block={selectedBlock} writable={writable && !globalOriginal} onBlockChange={onBlockChange} />
      : navigationPageList && selectedBlock.type === "group"
      ? <div className="navigation-search-inspector inspector-sections"><div className="navigation-block-summary"><h3>Page List</h3><p>Automatically displays published pages in the menu.</p></div><InspectorAccordionSection title="Page List"><p className="setting-note">This block follows the site’s page hierarchy. Use Edit Page List in its canvas toolbar to convert the current pages into editable menu links.</p></InspectorAccordionSection></div>
      : navigationLinkId && navigationEntries(links).some(entry => entry.link.id === navigationLinkId) && isNavigationSpacer(navigationEntries(links).find(entry => entry.link.id === navigationLinkId)!.link)
      ? <NavigationSpacerInspector links={links} selectedId={navigationLinkId} writable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} onSelect={onSelectNavigationLink} onChange={navigation => siteNavigationPane ? siteNavigationPane.changeForNavigation(selectedBlock.id, navigation) : onNavigationChange?.(navigation) ?? (onChange({ ...set, navigation }), true)} />
      : navigationLinkId && navigationEntries(links).some(entry => entry.link.id === navigationLinkId)
      ? <PageLinkInspector contentOnly={Boolean(siteNavigationPane)} siteId={siteId} key={navigationLinkId} blockId={selectedBlock.id} links={siteNavigationPane?.linksFor(selectedBlock.id) ?? set.navigation} selectedId={navigationLinkId} writable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} suggestions={navigationSuggestions} onSelect={onSelectNavigationLink} onChange={navigation => siteNavigationPane ? siteNavigationPane.changeForNavigation(selectedBlock.id, navigation) : onNavigationChange?.(navigation) ?? (onChange({ ...set, navigation }), true)} />
      : <NavigationInspector linksWritable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} linkHistory={siteNavigationPane ? <><p className="setting-note">{siteNavigationPane.ownerName} links · {siteNavigationPane.saveLabel}</p><HistoryActions presentation="labelled" canUndo={siteNavigationPane.canUndo} canRedo={siteNavigationPane.canRedo} onUndo={siteNavigationPane.undo} onRedo={siteNavigationPane.redo} /></> : undefined} canCreateOverlay={set.parts.length < 100} overlayContext={target.kind === "overlay"} overlayParts={set.parts.filter(part => part.kind === "overlay")} onCreateOverlay={() => { if (!writable) return; const created = createNavigationOverlay(set, selectedBlock.id); if (created && onChange(created.set)) onEditPart(created.partId, created.set); }} onEditOverlay={onEditPart} menuName={target.name} block={selectedBlock as Extract<ContentBlock, { type: "group" }>} onBlockChange={onBlockChange} links={siteNavigationPane?.linksFor(selectedBlock.id) ?? set.navigation} selectedId={navigationLinkId} writable={writable} suggestions={navigationSuggestions} onSelect={onSelectNavigationLink} onChange={navigation => siteNavigationPane ? siteNavigationPane.changeForNavigation(selectedBlock.id, navigation) : onNavigationChange?.(navigation) ?? (onChange({ ...set, navigation }), true)} />;
    return <>{assignment}{siteNavigationPane?.reviewPending ? <div className="navigation-review-action"><StudioButton type="button" onClick={event => { setNavigationReviewOpener(event.currentTarget); setNavigationReviewOpen(true); }}>Review 1 change…</StudioButton></div> : null}{editor}{navigationReviewOpen && siteNavigationPane ? <NavigationReviewDialog items={[{ id: "navigation", label: "Navigation" }]} opener={navigationReviewOpener} onClose={() => setNavigationReviewOpen(false)} onSave={siteNavigationPane.reviewSave} /> : null}</>;
  }
  return <Pane trackClassName="studio-inspector-track" className={`studio-inspector template-inspector${tab === "block" && element === "navigation" ? " navigation-inspector-pane" : ""}`} flushRegions={["body"]} bodyClassName={`inspector-scroll${tab === "block" && element === "navigation" ? " navigation-inspector-scroll" : ""}`} label="Template Inspector" side="right" width={paneWidth} onWidthChange={onPaneWidthChange} minWidth={270} maxWidth={480} collapsed={paneCollapsed} onCollapsedChange={onPaneCollapsedChange ?? (() => undefined)} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
    tabs={<PaneTabs id={tabPrefix} label="Template settings" className="inspector-tabs template-tabs-two" tabs={[{ id: "template", label: target.kind === "header" || target.kind === "footer" ? "Template Part" : "Template" }, { id: "block", label: "Block", disabled: !selectedBlock }]} active={tab} onChange={value => selectTab(value as typeof tab)} />}>
    <InspectorContentDisabledProvider disabled={!writable}>
      {tab === "block" ? selectedBlock ? element === "navigation" ? renderNavigationSettings() : element && element !== "content" ? editingViewport !== "desktop" ? <p className="setting-note">This element has no responsive block style controls. Its shared settings are available in Desktop.</p> : <InspectorAccordionSection contentDisabled={!writable} title={templateElementLabel(String(element))}><p>Content is supplied by the preview document or site identity.</p><label>Alignment<SelectControl value={String(selectedBlock.type === "group" ? selectedBlock.data?.align ?? "left" : "left")} onChange={event => onBlockChange({ ...selectedBlock, data: { ...(selectedBlock.type === "group" ? selectedBlock.data : {}), align: event.target.value } } as ContentBlock)}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label></InspectorAccordionSection> : partId ? editingViewport !== "desktop" ? <p className="setting-note">Shared part selection is available in Desktop. Select a block inside the part to edit responsive styles.</p> : <InspectorAccordionSection contentDisabled={!writable} title="Shared part"><label>Part<SelectControl value={String(partId)} onChange={event => onBlockChange({ ...selectedBlock, data: { templatePart: event.target.value } } as ContentBlock)}>{set.parts.filter(part => part.kind !== "overlay").map(part => <option value={part.id} key={part.id}>{part.name}</option>)}</SelectControl></label><button type="button" onClick={() => onEditPart(String(partId))}>Edit {set.parts.find(part => part.id === partId)?.name}</button></InspectorAccordionSection> : <BlockInspector contentSlot={element === "content"} block={selectedBlock} selectedListItem={selectedListItem?.blockId === selectedBlock.id ? selectedListItem : null} canSetSticky={canSetSticky} spacerOrientation={selectedSpacerOrientation} flexItemParent={selectedFlexParent?.type === "group" && selectedFlexParent.allowSizingOnChildren === true && (selectedFlexParent.layout === "row" || selectedFlexParent.layout === "stack")} gridItemParent={selectedFlexParent?.type === "group" && selectedFlexParent.layout === "grid"} fontSizeModeScope={`${set.id}:${target.id}`} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, mode) => setFontSizeViewModes(current => ({ ...current, [key]: mode }))} onChange={onBlockChange} onColumnCountChange={selectedBlock.type === "columns" && onColumnCountChange ? count => onColumnCountChange(selectedBlock, count) : undefined} columnWidthMax={maximumColumnWidth(selectedColumnParent?.children.filter(column => !column.widthUnit).length ?? 2)} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 && onColumnWidthChange ? (columnId, width) => onColumnWidthChange(selectedColumnParent, columnId, width) : undefined} onColumnWidthUnitChange={selectedColumnParent && onColumnWidthUnitChange ? (columnId, width, unit) => onColumnWidthUnitChange(selectedColumnParent, columnId, width, unit) : undefined} onOpenFiles={trigger => onOpenMedia(false, false, undefined, trigger)} onOpenBackgroundMedia={item => onOpenMedia(false, true, item)} canOpenFiles={selectedBlock.type === "image" ? canOpenImageFiles : true} /> : <p>Select a block in the canvas or List View.</p> : <div className="inspector-sections document-settings-pane template-document-inspector">
        {templateTarget ? <>
          <InspectorSettingsSection className="document-overview"><div className="document-summary"><div><strong>{templateTarget.name}</strong></div></div><p className="setting-note">{templateTarget.kind === "page" ? "Displays a static page unless a custom template has been applied to that page." : "Displays a single post unless a custom template has been applied to that post."}</p></InspectorSettingsSection>
          <InspectorContentDisabledProvider disabled={false}><InspectorAccordionSection title="Content">
            {referencedParts.length ? referencedParts.map(part => <TemplatePartReferenceRow key={part.nodeId} {...part} selected={selectedBlock?.id === part.nodeId} onSelect={onSelectTemplatePart} />) : <p className="setting-note">No header or footer is used in this template.</p>}
          </InspectorAccordionSection>
          <InspectorAccordionSection title="Design" defaultOpen={false}><p className="setting-note">No alternative designs are available.</p></InspectorAccordionSection></InspectorContentDisabledProvider>
        </> : <>
          <InspectorSettingsSection disabled={!writable} className="document-overview"><div className="document-summary"><span className="kind-badge">{target.kind.charAt(0).toUpperCase()}</span><div><strong>{target.name}</strong><small>Shared part</small></div></div><p className="setting-note">{globalOriginal ? "Site usage is resolved through each site’s assignments and shared-part references." : `Used by: ${users.join(", ") || "No templates yet"}.`}</p></InspectorSettingsSection>
        {globalOriginal ? <p className="setting-note">Site identity, menu links and social links belong to the site. The preview uses only the selected site’s content. With no site selected, Preview Site defaults to Neutral and can show another site’s content.</p> : <>
        <InspectorSettingsSection disabled={!writable} title="Site identity"><TemplateTextSetting label="Site name" value={set.identity.name} onCommit={name => onChange({ ...set, identity: { ...set.identity, name } })} />
        <TemplateTextSetting label="Home address" value={set.identity.homeUrl} onCommit={homeUrl => onChange({ ...set, identity: { ...set.identity, homeUrl } })} />
        <TemplateTextSetting label="Copyright" value={set.identity.copyright} onCommit={copyright => onChange({ ...set, identity: { ...set.identity, copyright } })} />
        <p className="setting-note">Placeholders: {templateCopyrightPlaceholders.map(item => item.token).join(", ")}. They update when the template is rendered.</p>
        <button type="button" onClick={() => onOpenMedia(true)}>Choose logo</button>{set.identity.logo ? <><TemplateTextSetting label="Logo alternative text" value={set.identity.logo.alt} onCommit={alt => onChange({ ...set, identity: { ...set.identity, logo: { ...set.identity.logo!, alt } } })} /><button type="button" onClick={() => onChange({ ...set, identity: { ...set.identity, logo: undefined } })}>Remove logo</button></> : null}
        </InspectorSettingsSection>
        <InspectorSettingsSection title="Navigation" disabled={!writable}><NavigationMenuList links={set.navigation} selectedId={navigationLinkId} writable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} suggestions={navigationSuggestions} onSelect={onSelectNavigationLink} onChange={onNavigationChange ?? (navigation => { onChange({ ...set, navigation }); return true; })} /></InspectorSettingsSection>
        <LinkSettings title="Social and support" links={set.socialLinks} onChange={socialLinks => onChange({ ...set, socialLinks })} disabled={!writable} />
        </>}
        </>}
      </div>}
    </InspectorContentDisabledProvider>
  </Pane>;
}
