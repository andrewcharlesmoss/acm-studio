"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { InspectorAccordionSection } from "./inspector-accordion";
import { LocalFixtureSiteNavigation } from "./project-local-links";
import { StudioIcon } from "./studio-icons";
import { StudioToolIcon } from "./studio-tool-icon";
import type { StudioDocumentKind } from "./editor-model";
import type { LocalFixtureSiteId } from "./test-site/sites";

import { useNavigationOrdering } from "./use-site-ordering";
import { LibraryDragHandle } from "./library-drag-handle";
import { DragPlacementIndicator } from "./drag-placement-indicator";

import { StudioTooltipGroup } from "./controls/tooltip-group";
import { studioNavigationToolItems } from "./studio-navigation-visibility-contract.mjs";
import { useStudioNavigationVisibility } from "./studio-navigation-visibility";

type LibraryKind = StudioDocumentKind | "templates";
type StudioToolItem = { id: string; label: string; description: string; icon: "files" | "templates" | "designs" | "uiLibrary" | "content" | "siteEditor" | "backup" | "bin"; action?: () => void; href?: string; disabled?: boolean };

function keepEditorsTogether(order: string[]) {
  if (!order.includes("content") || !order.includes("site-editor")) return order;
  const next = order.filter(id => id !== "content");
  next.splice(next.indexOf("site-editor"), 0, "content");
  return next;
}

/** Navigation structure is shared by content and template workspaces. */
export function StudioNavigationFrame({ width, collapsed, onWidthChange, onCollapsedChange,
  selectedSite, onSelectSite, onSelectWorkspace, libraryKind, onSelectLibraryKind,
  counts, binCount, studioSection = "content", writable, templateWritable,
  onNewDocument, onNewFromTemplate, onOpenFiles, onOpenTemplates, onOpenBackup, onOpenBin,
  onExportContent, contentEditorHref, siteEditorHref, loading = false, children,
}: {
  loading?: boolean;
  width: number; collapsed: boolean; onWidthChange: (width: number) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  selectedSite?: LocalFixtureSiteId | null; onSelectSite?: (id: LocalFixtureSiteId) => void;
  onSelectWorkspace?: () => void;
  libraryKind: LibraryKind; onSelectLibraryKind?: (kind: LibraryKind) => void;
  counts: Record<LibraryKind, number | null>; binCount: number; studioSection?: string;
  writable: boolean; templateWritable: boolean;
  onNewDocument?: (kind: StudioDocumentKind) => void; onNewFromTemplate?: () => void;
  onOpenFiles?: () => void; onOpenTemplates?: () => void; onOpenBackup?: () => void; onOpenBin?: () => void;
  onExportContent?: () => void; contentEditorHref?: string; siteEditorHref?: string; children: ReactNode;
}) {
  const tabsId = useId();
  const [visibilityEditing, setVisibilityEditing] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const toolsVisibilityButton = useRef<HTMLButtonElement>(null);
  const details: Record<string, Omit<StudioToolItem, "id" | "label">> = {
      files: { description: "Browse images and files", icon: "files" as const, action: onOpenFiles },
      templates: { description: "Create reusable layouts", icon: "templates" as const, action: onOpenTemplates ?? (() => onSelectLibraryKind?.("templates")), disabled: !onOpenTemplates && !onSelectLibraryKind },
      designs: { description: "Create and edit images", icon: "designs" as const, href: "/studio/designs" },
      "ui-library": { description: "Explore shared UI", icon: "uiLibrary" as const, href: "/studio/ui" },
      content: { description: "Edit pages and posts", icon: "content" as const, href: contentEditorHref ?? "/studio" },
      "site-editor": { description: "Preview site design", icon: "siteEditor" as const, href: siteEditorHref ?? (selectedSite ? `/studio/site-editor?site=${selectedSite}` : "/studio/site-editor") },
      backup: { description: "Export and restore data", icon: "backup" as const, action: onOpenBackup },
      bin: { description: "Restore deleted items", icon: "bin" as const, action: onOpenBin },
  };
  const tools: StudioToolItem[] = studioNavigationToolItems.map(({ id, label }) => ({ id, label, ...details[id] }));
  const visibility = useStudioNavigationVisibility();
  const orderedVisibleIds = tools.filter(tool => visibility?.isVisible(tool.id) ?? true).map(tool => tool.id);
  const { order, reordering, status } = useNavigationOrdering(tools.map(tool => tool.id), "acm-studio-tool-order-v1", "Tool order", "studio-tools", "boundary", keepEditorsTogether, "y", "full-row", visibilityEditing ? tools.map(tool => tool.id) : orderedVisibleIds, visibilityEditing);
  return <Pane inert={loading} trackClassName="studio-library-track" className="studio-library"
    flushRegions={["header", "body", "footer"]} bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={width}
    onWidthChange={onWidthChange} minWidth={270} maxWidth={480} collapsed={collapsed}
    onCollapsedChange={onCollapsedChange} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
    header={<><StudioTooltipGroup className="library-create">
      <button type="button" aria-label="New post" data-studio-tooltip="New post" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("post")}><AcmIcon name="document.new-post" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New page" data-studio-tooltip="New page" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("page")}><AcmIcon name="document.new-page" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New from template" data-studio-tooltip="New from template" disabled={!writable || !templateWritable || !onNewFromTemplate} onClick={onNewFromTemplate}><AcmIcon name="document.from-template" scale="Regular-S" size={20} /></button>
    </StudioTooltipGroup><div className="studio-navigation-group studio-navigation-tools">
    <InspectorAccordionSection className="studio-navigation-group-disclosure" title="Tools" label="Tools" open={toolsExpanded} onOpenChange={open => { setToolsExpanded(open); if (!open) { setVisibilityEditing(false); reordering.cancel(); } }}>
    <div className={`library-tools${visibilityEditing ? " is-editing" : ""}`} {...reordering.listProps}>
      {visibilityEditing ? <div className="studio-navigation-edit-bar"><span>{tools.length} items · {orderedVisibleIds.length} visible · {tools.length - orderedVisibleIds.length} hidden</span><button type="button" onClick={() => { setVisibilityEditing(false); requestAnimationFrame(() => toolsVisibilityButton.current?.focus()); }}>Done</button></div> : null}
      <DragPlacementIndicator line={reordering.line} />
      {(visibilityEditing ? order : order.filter((id: string) => visibility?.isVisible(id) ?? true)).map((id: string) => {
        const tool = tools.find(item => item.id === id)!;
        const dragProps = reordering.rowProps(id);
        const active = studioSection === id;
        const hidden = !(visibility?.isVisible(id) ?? true);
        const content = <><span className="library-tool-icon"><StudioToolIcon tool={tool.icon} /></span><span className="library-tool-copy"><strong>{tool.label}</strong><small>{tool.description}</small></span>{id === "bin" ? <span className="library-tool-count" aria-hidden="true">{binCount}</span> : null}</>;
        const actionProps = { className: `library-tool-button${active ? " is-active" : ""}${hidden ? " is-hidden" : ""}`, "aria-current": active ? "page" as const : undefined, "aria-label": id === "bin" ? `Bin, ${binCount} deleted ${binCount === 1 ? "item" : "items"}` : undefined };
        return <div key={id} className={`library-tool-row${hidden ? " is-hidden" : ""}${visibilityEditing ? " is-editing" : ""}`} data-gap-row={visibilityEditing ? dragProps["data-gap-row"] : undefined} data-gap-owner={visibilityEditing ? dragProps["data-gap-owner"] : undefined} data-library-drop-row={visibilityEditing ? true : undefined} onDragOver={visibilityEditing ? dragProps.onDragOver : undefined} onDragLeave={visibilityEditing ? dragProps.onDragLeave : undefined} onDrop={visibilityEditing ? dragProps.onDrop : undefined}>
          {visibilityEditing ? <span {...actionProps} aria-disabled={hidden || undefined}>{content}</span> : tool.href ? <a {...actionProps} href={tool.href} data-studio-departure={id === "content" ? "" : undefined} draggable={false}>{content}</a> : <button {...actionProps} type="button" onClick={() => tool.action?.()} disabled={tool.disabled}>{content}</button>}
          {visibilityEditing ? <button type="button" className="studio-navigation-visibility-toggle" aria-label={hidden ? `Show ${tool.label} in navigation` : `Hide ${tool.label} from navigation`} aria-pressed={!hidden} title={hidden ? `Show ${tool.label}` : `Hide ${tool.label}`} onClick={() => visibility?.setVisible(id, hidden)}><AcmIcon name={hidden ? "view.hide" : "view.show"} scale="Regular-S" size={18} /></button> : null}
          {visibilityEditing ? <button {...dragProps} data-gap-row={undefined} data-gap-owner={undefined} data-library-drop-row={undefined} data-drop-edge={undefined} className="studio-tool-drag-button studio-site-drag-button" type="button" aria-disabled={!reordering.canReorder} aria-label={`Reorder ${tool.label}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={reordering.canReorder} /></button> : null}
        </div>;
      })}
      <span className="visually-hidden" role="status">{reordering.message}</span>
      {status ? <p className="studio-site-order-status" role="status">{status}</p> : null}
      {visibility?.status ? <p className="studio-site-order-status" role="status">{visibility.status}</p> : null}
    </div></InspectorAccordionSection>
    {toolsExpanded ? <div className="studio-navigation-group-action"><button ref={toolsVisibilityButton} type="button" aria-label={visibilityEditing ? "Done editing tool visibility and order" : "Edit tool visibility and order"} title={visibilityEditing ? "Done editing tools" : "Show or hide and reorder tools"} aria-pressed={visibilityEditing} onClick={() => setVisibilityEditing(value => !value)}><AcmIcon name="view.show" scale="Regular-S" size={18} /></button></div> : null}
    </div></>}
    tabs={<><StudioTooltipGroup className="pane-inset"><button type="button" className="studio-drafts-action" aria-pressed={!selectedSite} data-studio-tooltip="Posts and pages not assigned to a site." onClick={onSelectWorkspace}><AcmIcon name="document.content" scale="Regular-S" size={20} /><span>Studio Drafts</span></button></StudioTooltipGroup><LocalFixtureSiteNavigation selectedSite={selectedSite} onSelectSite={onSelectSite} libraryKind={libraryKind} studioSection={studioSection} /><div className="library-tabs"><PaneTabs id={tabsId} label="Content type" tabs={[
      { id: "post", label: "Posts" }, { id: "page", label: "Pages" }, { id: "templates", label: "Templates" },
    ]} active={libraryKind} onChange={id => onSelectLibraryKind?.(id as LibraryKind)} renderLabel={tab => <><span className="library-tab-label">{tab.label}</span><span>{counts[tab.id as LibraryKind] ?? "…"}</span></>} /></div></>}
    footer={<div className="library-footer"><button type="button" onClick={onExportContent}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div>}>
    {(["post", "page", "templates"] as const).map(kind => <PaneTabPanel key={kind} id={tabsId} tab={kind} active={libraryKind}>{kind === libraryKind ? children : null}</PaneTabPanel>)}
  </Pane>;
}
