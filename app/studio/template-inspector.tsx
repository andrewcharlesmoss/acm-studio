"use client";

import { handleStudioHistoryShortcut } from "./studio-history-shortcuts.mjs";
import { HistoryActions } from "./controls/history-actions";
import { StudioButton } from "./controls/button";
import { CheckboxControl } from "./controls/checkbox-control";
import { NumberInput, SelectControl, TextInput } from "./controls/native-fields";
import { useResponsiveStyleScope } from "./responsive-style-context";
import type { ListItemBackgroundTarget } from "./list-item-background";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { ContentBlock } from "../content/model";
import { findColumnsParent, maximumColumnWidth } from "../content/columns";
import { spacerOrientationFor } from "../content/spacer";
import { BlockInspector } from "./studio-inspectors";
import type { ListItemSelection } from "../content/model";
import { InspectorAccordionSection, InspectorContentDisabledProvider } from "./inspector-accordion";
import { templateId, templateElementLabel, templateEditorBlocks, type TemplateSet, type PageTemplate, type TemplatePart, type SiteLink, type SiteStyles } from "./template-model";
import { templateCopyrightPlaceholders } from "./template-placeholders";
import { Pane, PaneTabs } from "./panes/pane-components";
import { PageLinkInspector } from "./page-link-inspector";
import { NavigationInspector, NavigationMenuList } from "./template-navigation-editor";
import type { LinkSuggestion } from "./controls/link-destination-popover";
import { navigationEntries } from "./navigation-items";
import { createNavigationOverlay } from "./navigation-overlay";
import { StudioIcon } from "./studio-icons";
import { InspectorSettingRow, InspectorSettingsSection } from "./controls/inspector-setting-row";
import { useSharedStylePreset } from "./ui/styles/shared-style-preset";
import { PaletteColourSetting } from "./controls/palette-colour-setting";
import { NavigationReviewDialog } from "./site-editor/navigation-review-dialog";

export function TemplateTextSetting({ label, value, onCommit, placeholder, inline = false }: { label: string; value: string; onCommit: (value: string) => void; placeholder?: string; inline?: boolean }) {
  const editor = <label>{label}<TextInput key={value} defaultValue={value} placeholder={placeholder} onBlur={event => { if (event.target.value !== value) onCommit(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
  return inline ? editor : <InspectorSettingRow label={label} value={value || "Not set"}>{editor}</InspectorSettingRow>;
}

function ResettableStyleSetting({ label, changed, onReset, children }: { label: string; changed: boolean; onReset: () => void; children: ReactNode }) {
  return <div className="template-resettable-setting">{children}{changed ? <button type="button" className="template-style-reset" aria-label={`Reset ${label} to global default`} title={`Reset ${label} to global default`} onClick={onReset}>Reset</button> : null}</div>;
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

export function TemplateInspector({ siteNavigationPane, globalOriginal = false, canOpenImageFiles = false, set, target, selectedBlock, selectedListItem = null, navigationLinkId = null, navigationSuggestions = [], siteId, onSelectNavigationLink = () => {}, onNavigationChange, writable, onChange, onBlockChange, onColumnCountChange, onColumnWidthChange, onOpenMedia, onEditPart, users, tab: selectedTab, onTabChange, paneWidth = 300, onPaneWidthChange, paneCollapsed = false, onPaneCollapsedChange }: {
  siteNavigationPane?: import("./use-navigation-editing").SiteNavigationPaneAdapter;
  globalOriginal?: boolean;
  canOpenImageFiles?: boolean; set: TemplateSet; target: PageTemplate | TemplatePart; selectedBlock: ContentBlock | null; writable: boolean;
  selectedListItem?: ListItemSelection | null;
  siteId?: import("./test-site/sites").LocalFixtureSiteId;
  navigationLinkId?: string | null; navigationSuggestions?: LinkSuggestion[]; onSelectNavigationLink?: (id: string | null) => void; onNavigationChange?: (links: SiteLink[]) => boolean;
  onChange: (set: TemplateSet) => boolean; onBlockChange: (block: ContentBlock) => void; onColumnCountChange?: (parent: Extract<ContentBlock, { type: "columns" }>, count: number) => void; onColumnWidthChange?: (parent: Extract<ContentBlock, { type: "columns" }>, columnId: string, width: number) => void; onOpenMedia: (logo?: boolean, background?: boolean, item?: ListItemBackgroundTarget, trigger?: HTMLElement) => void; onEditPart: (id: string, nextSet?: TemplateSet) => void; users: string[];
  tab?: "template" | "styles" | "block"; onTabChange?: (tab: "template" | "styles" | "block") => void;
  paneWidth?: number; onPaneWidthChange?: (width: number) => void; paneCollapsed?: boolean; onPaneCollapsedChange?: (collapsed: boolean) => void;
}) {
  const globalStylePreset = useSharedStylePreset();
  const [localTab, setLocalTab] = useState<"template" | "styles" | "block">("template");
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, "presets" | "custom">>({});
  const [navigationReviewOpen, setNavigationReviewOpen] = useState(false);
  const [navigationReviewOpener, setNavigationReviewOpener] = useState<HTMLElement | null>(null);
  const tab = selectedTab ?? localTab;
  const { editingViewport } = useResponsiveStyleScope();
  const tabPrefix = useId();
  function selectTab(nextTab: typeof tab) { setLocalTab(nextTab); onTabChange?.(nextTab); }
  const element = selectedBlock?.type === "group" ? selectedBlock.data?.templateElement : undefined;
  const partId = selectedBlock?.type === "group" ? selectedBlock.data?.templatePart : undefined;
  const canSetSticky = selectedBlock?.type === "group" && target.nodes.some(node => node.id === selectedBlock.id);
  const templateBlocks = templateEditorBlocks(target.nodes);
  const selectedColumnParent = selectedBlock?.type === "column" ? findColumnsParent(templateBlocks, selectedBlock.id) : undefined;
  const selectedSpacerOrientation = selectedBlock?.type === "spacer" ? spacerOrientationFor(templateBlocks, selectedBlock.id) : "vertical";
  const templateTarget = target.kind === "page" || target.kind === "post" ? target : undefined;
  const defaults = templateTarget?.defaults ?? set.defaults ?? {};
  const changeDefaults = (next: NonNullable<TemplateSet["defaults"]>) => onChange(templateTarget ? { ...set, templates: set.templates.map(template => template.id === templateTarget.id ? { ...template, defaults: next } : template) } : { ...set, defaults: next });
  const changePalette = (key: keyof SiteStyles["palette"], colour: string) => onChange({ ...set, styles: { ...set.styles, palette: { ...set.styles.palette, [key]: colour } } });
  const changeBodyTypography = (patch: Partial<SiteStyles["typography"]["body"]>) => onChange({ ...set, styles: { ...set.styles, typography: { ...set.styles.typography, body: { ...set.styles.typography.body, ...patch } } } });
  const desktopBodySize = set.styles.typography.body.size.desktop;
  const bodySizeInPixels = Math.round(desktopBodySize.value * (desktopBodySize.unit === "px" ? 1 : 16));
  const changeLayout = (key: keyof SiteStyles["layout"], value: number) => onChange({ ...set, styles: { ...set.styles, layout: { ...set.styles.layout, [key]: value } } });
  const resetStyles = {
    ...set.styles,
    palette: { ...globalStylePreset.palette },
    typography: { ...set.styles.typography, body: structuredClone(globalStylePreset.typography.body) },
    layout: { ...globalStylePreset.layout },
  };
  const hasStyleOverrides = JSON.stringify(set.styles.palette) !== JSON.stringify(resetStyles.palette)
    || JSON.stringify(set.styles.typography.body) !== JSON.stringify(resetStyles.typography.body)
    || JSON.stringify(set.styles.layout) !== JSON.stringify(resetStyles.layout);
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
    const editor = navigationLinkId && navigationEntries(links).some(entry => entry.link.id === navigationLinkId)
      ? <PageLinkInspector contentOnly={Boolean(siteNavigationPane)} siteId={siteId} key={navigationLinkId} blockId={selectedBlock.id} links={siteNavigationPane?.linksFor(selectedBlock.id) ?? set.navigation} selectedId={navigationLinkId} writable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} suggestions={navigationSuggestions} onSelect={onSelectNavigationLink} onChange={navigation => siteNavigationPane ? siteNavigationPane.changeForNavigation(selectedBlock.id, navigation) : onNavigationChange?.(navigation) ?? (onChange({ ...set, navigation }), true)} />
      : <NavigationInspector linksWritable={siteNavigationPane ? siteNavigationPane.writable : writable && !globalOriginal} linkHistory={siteNavigationPane ? <><p className="setting-note">{siteNavigationPane.ownerName} links · {siteNavigationPane.saveLabel}</p><HistoryActions presentation="labelled" canUndo={siteNavigationPane.canUndo} canRedo={siteNavigationPane.canRedo} onUndo={siteNavigationPane.undo} onRedo={siteNavigationPane.redo} /></> : undefined} canCreateOverlay={set.parts.length < 100} overlayContext={target.kind === "overlay"} overlayParts={set.parts.filter(part => part.kind === "overlay")} onCreateOverlay={() => { if (!writable) return; const created = createNavigationOverlay(set, selectedBlock.id); if (created && onChange(created.set)) onEditPart(created.partId, created.set); }} onEditOverlay={onEditPart} menuName={target.name} block={selectedBlock as Extract<ContentBlock, { type: "group" }>} onBlockChange={onBlockChange} links={siteNavigationPane?.linksFor(selectedBlock.id) ?? set.navigation} selectedId={navigationLinkId} writable={writable} suggestions={navigationSuggestions} onSelect={onSelectNavigationLink} onChange={navigation => siteNavigationPane ? siteNavigationPane.changeForNavigation(selectedBlock.id, navigation) : onNavigationChange?.(navigation) ?? (onChange({ ...set, navigation }), true)} />;
    return <>{assignment}{siteNavigationPane?.reviewPending ? <div className="navigation-review-action"><StudioButton type="button" onClick={event => { setNavigationReviewOpener(event.currentTarget); setNavigationReviewOpen(true); }}>Review 1 change…</StudioButton></div> : null}{editor}{navigationReviewOpen && siteNavigationPane ? <NavigationReviewDialog items={[{ id: "navigation", label: "Navigation" }]} opener={navigationReviewOpener} onClose={() => setNavigationReviewOpen(false)} onSave={siteNavigationPane.reviewSave} /> : null}</>;
  }
  return <Pane trackClassName="studio-inspector-track" className={`studio-inspector template-inspector${tab === "block" && element === "navigation" ? " navigation-inspector-pane" : ""}`} flushRegions={["body"]} bodyClassName={`inspector-scroll${tab === "block" && element === "navigation" ? " navigation-inspector-scroll" : ""}`} label="Template Inspector" side="right" width={paneWidth} onWidthChange={onPaneWidthChange} minWidth={270} maxWidth={480} collapsed={paneCollapsed} onCollapsedChange={onPaneCollapsedChange ?? (() => undefined)} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
    tabs={<PaneTabs id={tabPrefix} label="Template settings" className="inspector-tabs" tabs={[{ id: "template", label: "Template" }, { id: "block", label: "Block", disabled: !selectedBlock }, { id: "styles", label: "Styles" }]} active={tab} onChange={value => selectTab(value as typeof tab)} />}>
    <InspectorContentDisabledProvider disabled={!writable}>
      {tab === "block" ? selectedBlock ? element === "navigation" ? renderNavigationSettings() : element && element !== "content" ? editingViewport !== "desktop" ? <p className="setting-note">This element has no responsive block style controls. Its shared settings are available in Desktop.</p> : <InspectorAccordionSection contentDisabled={!writable} title={templateElementLabel(String(element))}><p>Content is supplied by the preview document or site identity.</p><label>Alignment<SelectControl value={String(selectedBlock.type === "group" ? selectedBlock.data?.align ?? "left" : "left")} onChange={event => onBlockChange({ ...selectedBlock, data: { ...(selectedBlock.type === "group" ? selectedBlock.data : {}), align: event.target.value } } as ContentBlock)}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label></InspectorAccordionSection> : partId ? editingViewport !== "desktop" ? <p className="setting-note">Shared part selection is available in Desktop. Select a block inside the part to edit responsive styles.</p> : <InspectorAccordionSection contentDisabled={!writable} title="Shared part"><label>Part<SelectControl value={String(partId)} onChange={event => onBlockChange({ ...selectedBlock, data: { templatePart: event.target.value } } as ContentBlock)}>{set.parts.filter(part => part.kind !== "overlay").map(part => <option value={part.id} key={part.id}>{part.name}</option>)}</SelectControl></label><button type="button" onClick={() => onEditPart(String(partId))}>Edit {set.parts.find(part => part.id === partId)?.name}</button></InspectorAccordionSection> : <BlockInspector contentSlot={element === "content"} block={selectedBlock} selectedListItem={selectedListItem?.blockId === selectedBlock.id ? selectedListItem : null} canSetSticky={canSetSticky} spacerOrientation={selectedSpacerOrientation} fontSizeModeScope={`${set.id}:${target.id}`} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, mode) => setFontSizeViewModes(current => ({ ...current, [key]: mode }))} onChange={onBlockChange} onColumnCountChange={selectedBlock.type === "columns" && onColumnCountChange ? count => onColumnCountChange(selectedBlock, count) : undefined} columnWidthMax={maximumColumnWidth(selectedColumnParent?.children.length ?? 2)} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 && onColumnWidthChange ? (columnId, width) => onColumnWidthChange(selectedColumnParent, columnId, width) : undefined} onOpenFiles={trigger => onOpenMedia(false, false, undefined, trigger)} onOpenBackgroundMedia={item => onOpenMedia(false, true, item)} canOpenFiles={selectedBlock.type === "image" ? canOpenImageFiles : true} /> : <p>Select a block in the canvas or List View.</p> : tab === "styles" && editingViewport !== "desktop" ? <p className="setting-note">Select a block to style {editingViewport} only. Shared template styles are available in Desktop.</p> : tab === "styles" ? <>
        <InspectorAccordionSection contentDisabled={!writable} title="Semantic colours"><p>Shared with: {[...set.templates, ...set.parts].map(item => item.name).join(", ")}. Explicit block styles take precedence.</p>
          {([ ["surface", "Surface"], ["surfaceRaised", "Raised surface"], ["surfaceSubtle", "Subtle surface"], ["textPrimary", "Primary text"], ["textSecondary", "Secondary text"], ["border", "Border"], ["accent", "Accent"], ["onAccent", "Text on accent"], ["success", "Success"], ["information", "Information"], ["alert", "Alert"], ["warning", "Warning"], ["rating", "Rating"] ] as [keyof SiteStyles["palette"], string][]).map(([key, label]) => <div className="template-palette-colour-setting" key={key}>
            <PaletteColourSetting row label={label} value={set.styles.palette[key]} disabled={!writable} onChange={value => changePalette(key, value ?? globalStylePreset.palette[key])} />
            {set.styles.palette[key].toUpperCase() !== globalStylePreset.palette[key].toUpperCase() ? <button className="template-palette-colour-reset" type="button" aria-label={`Reset ${label} to global default`} title={`Reset ${label} to global default`} onClick={() => onChange({ ...set, styles: { ...set.styles, palette: { ...set.styles.palette, [key]: globalStylePreset.palette[key] } } })}>Reset</button> : null}
          </div>)}
        </InspectorAccordionSection>
        <InspectorAccordionSection contentDisabled={!writable} title="Body typography">
          <ResettableStyleSetting label="Typeface" changed={set.styles.typography.body.family !== globalStylePreset.typography.body.family} onReset={() => changeBodyTypography({ family: globalStylePreset.typography.body.family })}><label>Typeface<SelectControl value={set.styles.typography.body.family} onChange={event => changeBodyTypography({ family: event.target.value as SiteStyles["typography"]["body"]["family"] })}><option value="inter">Inter</option><option value="system-sans">System sans</option><option value="georgia">Georgia</option></SelectControl></label></ResettableStyleSetting>
          <ResettableStyleSetting label="Body text size" changed={JSON.stringify(desktopBodySize) !== JSON.stringify(globalStylePreset.typography.body.size.desktop)} onReset={() => changeBodyTypography({ size: { ...set.styles.typography.body.size, desktop: { ...globalStylePreset.typography.body.size.desktop } } })}><label>Body text size (px)<NumberInput  min={8} max={96} step={1} value={bodySizeInPixels} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 8 && value <= 96) changeBodyTypography({ size: { ...set.styles.typography.body.size, desktop: { value, unit: "px" } } }); }} /></label></ResettableStyleSetting>
          <ResettableStyleSetting label="Weight" changed={set.styles.typography.body.weight !== globalStylePreset.typography.body.weight} onReset={() => changeBodyTypography({ weight: globalStylePreset.typography.body.weight })}><label>Weight<SelectControl value={set.styles.typography.body.weight} onChange={event => changeBodyTypography({ weight: Number(event.target.value) })}>{Array.from({ length: 9 }, (_, index) => (index + 1) * 100).map(weight => <option value={weight} key={weight}>{weight}</option>)}</SelectControl></label></ResettableStyleSetting>
          <ResettableStyleSetting label="Style" changed={set.styles.typography.body.style !== globalStylePreset.typography.body.style} onReset={() => changeBodyTypography({ style: globalStylePreset.typography.body.style })}><label>Style<SelectControl value={set.styles.typography.body.style} onChange={event => changeBodyTypography({ style: event.target.value as "normal" | "italic" })}><option value="normal">Normal</option><option value="italic">Italic</option></SelectControl></label></ResettableStyleSetting>
          <ResettableStyleSetting label="Text transform" changed={set.styles.typography.body.transform !== globalStylePreset.typography.body.transform} onReset={() => changeBodyTypography({ transform: globalStylePreset.typography.body.transform })}><label>Text transform<SelectControl value={set.styles.typography.body.transform} onChange={event => changeBodyTypography({ transform: event.target.value as SiteStyles["typography"]["body"]["transform"] })}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalise</option></SelectControl></label></ResettableStyleSetting>
          {([ ["lineHeight", "Line height", 0.8, 3], ["letterSpacing", "Letter spacing", -5, 20] ] as const).map(([key, label, min, max]) => <ResettableStyleSetting key={key} label={label} changed={JSON.stringify(set.styles.typography.body[key].desktop) !== JSON.stringify(globalStylePreset.typography.body[key].desktop)} onReset={() => changeBodyTypography({ [key]: { ...set.styles.typography.body[key], desktop: { ...globalStylePreset.typography.body[key].desktop } } })}><label>{label}<NumberInput  min={min} max={max} step={0.05} value={set.styles.typography.body[key].desktop.value} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= min && value <= max) changeBodyTypography({ [key]: { ...set.styles.typography.body[key], desktop: { ...set.styles.typography.body[key].desktop, value } } }); }} /></label></ResettableStyleSetting>)}
        </InspectorAccordionSection>
        <InspectorAccordionSection contentDisabled={!writable} title="Shared layout">
          {([["spacing", "Spacing", 0, 120], ["contentWidth", "Content width", 320, 1800], ["radius", "Corner radius", 0, 80], ["borderWidth", "Border width", 0, 12]] as const).map(([key, label, min, max]) => <ResettableStyleSetting key={key} label={label} changed={set.styles.layout[key] !== globalStylePreset.layout[key]} onReset={() => changeLayout(key, globalStylePreset.layout[key])}><label>{label} (px)<NumberInput  min={min} max={max} value={set.styles.layout[key]} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= min && value <= max) changeLayout(key, value); }} /></label></ResettableStyleSetting>)}
        </InspectorAccordionSection>
        {hasStyleOverrides ? <div className="template-reset-all-styles"><button type="button" disabled={!writable} onClick={() => onChange({ ...set, styles: resetStyles })}>Reset all styles</button></div> : null}
      </> : <div className="inspector-sections document-settings-pane template-document-inspector">
        <InspectorSettingsSection disabled={!writable} className="document-overview"><div className="document-summary"><span className="kind-badge">{target.kind.charAt(0).toUpperCase()}</span><div><strong>{target.name}</strong><small>{target.kind === "page" || target.kind === "post" ? "Template" : "Shared part"}</small></div></div><p className="setting-note">{target.kind === "header" || target.kind === "footer" || target.kind === "overlay" ? globalOriginal ? "Site usage is resolved through each site’s assignments and shared-part references." : `Used by: ${users.join(", ") || "No templates yet"}.` : `Reusable ${target.kind} layout. Content is optional while exploring; add at most one Content element.`}</p></InspectorSettingsSection>
        {templateTarget ? <>
          <InspectorSettingsSection disabled={!writable} title="Template defaults">
            <p className="setting-note">Documents inherit these values until they explicitly override them.</p>
            <InspectorSettingRow label="Default template" value={templateTarget.isDefault ? "Yes" : "No"}>
              <CheckboxControl className="checkbox-setting" checked={Boolean(templateTarget.isDefault)} onChange={checked => onChange({ ...set, templates: set.templates.map(template => template.kind === templateTarget.kind ? { ...template, isDefault: template.id === templateTarget.id ? checked : false } : template) })} label={<>Use as default {templateTarget.kind} template</>} />
            </InspectorSettingRow>
            <TemplateTextSetting label="Author" value={defaults.author ?? ""} placeholder="No default author" onCommit={author => changeDefaults({ ...defaults, author: author || undefined })} />
            <TemplateTextSetting label="Parent" value={defaults.parentPageId ?? ""} placeholder="No default parent" onCommit={value => changeDefaults({ ...defaults, parentPageId: value || undefined })} />
            <h4>Field display defaults</h4>
            {(["title", "subtitle", "coverImage", "author", "publicationDate", "readingTime"] as const).map(field => <InspectorSettingRow key={field} label={field === "coverImage" ? "Featured image" : field === "publicationDate" ? "Publication date" : field === "readingTime" ? "Reading time" : field.charAt(0).toUpperCase() + field.slice(1)} value={templateTarget.displayDefaults?.[field] === "hide" ? "Hide" : "Show"}><label>Display<SelectControl value={templateTarget.displayDefaults?.[field] ?? "show"} onChange={event => onChange({ ...set, templates: set.templates.map(template => template.id === templateTarget.id ? { ...template, displayDefaults: { ...template.displayDefaults, [field]: event.target.value as "show" | "hide" } } : template) })}><option value="show">Show</option><option value="hide">Hide</option></SelectControl></label></InspectorSettingRow>)}
          </InspectorSettingsSection>
          <InspectorAccordionSection title="Categories" contentDisabled={!writable}><TemplateTextSetting inline label="Category" value={defaults.category ?? ""} placeholder="No default category" onCommit={value => changeDefaults({ ...defaults, category: value || undefined })} /></InspectorAccordionSection>
          <InspectorAccordionSection title="Tags" contentDisabled={!writable}><TemplateTextSetting inline label="Tags" value={(defaults.tags ?? []).join(", ")} placeholder="No default tags" onCommit={value => changeDefaults({ ...defaults, tags: value.split(",").map(tag => tag.trim()).filter(Boolean) })} /></InspectorAccordionSection>
        </> : null}
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
      </div>}
    </InspectorContentDisabledProvider>
  </Pane>;
}
