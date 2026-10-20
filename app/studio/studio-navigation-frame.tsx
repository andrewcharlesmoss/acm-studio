"use client";

import { useId, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { ProjectLocalLinksProvider, LocalFixtureSiteNavigation } from "./project-local-links";
import { StudioIcon } from "./studio-icons";
import { StudioToolIcon } from "./studio-tool-icon";
import type { StudioDocumentKind } from "./editor-model";
import type { LocalFixtureSiteId } from "./test-site/sites";

import { useNavigationOrdering } from "./use-site-ordering";
import { LibraryDragHandle } from "./library-drag-handle";
import { DragPlacementIndicator } from "./drag-placement-indicator";

import { StudioTooltipGroup } from "./controls/tooltip-group";

type LibraryKind = StudioDocumentKind | "templates";

/** Navigation structure is shared by content and template workspaces. */
export function StudioNavigationFrame({ width, collapsed, onWidthChange, onCollapsedChange,
  selectedSite, onSelectSite, onSelectWorkspace, libraryKind, onSelectLibraryKind,
  counts, binCount, studioSection = "content", writable, templateWritable,
  onNewDocument, onNewFromTemplate, onOpenFiles, onOpenBackup, onOpenBin,
  onExportContent, children,
}: {
  width: number; collapsed: boolean; onWidthChange: (width: number) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  selectedSite?: LocalFixtureSiteId | null; onSelectSite?: (id: LocalFixtureSiteId) => void;
  onSelectWorkspace?: () => void;
  libraryKind: LibraryKind; onSelectLibraryKind?: (kind: LibraryKind) => void;
  counts: Record<LibraryKind, number | null>; binCount: number; studioSection?: string;
  writable: boolean; templateWritable: boolean;
  onNewDocument?: (kind: StudioDocumentKind) => void; onNewFromTemplate?: () => void;
  onOpenFiles?: () => void; onOpenBackup?: () => void; onOpenBin?: () => void;
  onExportContent?: () => void; children: ReactNode;
}) {
  const tabsId = useId();
  const tools = [
    { id: "files", label: "Files", description: "Browse images and files", icon: "files" as const, action: onOpenFiles },
    { id: "templates", label: "Templates", description: "Create reusable layouts", icon: "templates" as const, action: () => onSelectLibraryKind?.("templates"), disabled: !onSelectLibraryKind },
    { id: "designs", label: "Design Canvas", description: "Create and edit images", icon: "designs" as const, href: "/studio/designs" },
    { id: "ui-library", label: "Studio UI Library", description: "Explore shared UI", icon: "uiLibrary" as const, href: "/studio/ui" },
    { id: "backup", label: "Backup", description: "Export and restore data", icon: "backup" as const, action: onOpenBackup },
    { id: "bin", label: "Bin", description: "Restore deleted items", icon: "bin" as const, action: onOpenBin },
    { id: "site-editor", label: "Site Editor", description: "Preview site design", icon: "siteEditor" as const, href: "/studio/site-editor" },
  ];
  const { order, reordering, status } = useNavigationOrdering(tools.map(tool => tool.id), "acm-studio-tool-order-v1", "Tool order", "studio-tools");
  return <ProjectLocalLinksProvider><Pane trackClassName="studio-library-track" className="studio-library"
    flushRegions={["header", "body", "footer"]} bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={width}
    onWidthChange={onWidthChange} minWidth={270} maxWidth={480} collapsed={collapsed}
    onCollapsedChange={onCollapsedChange} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
    header={<><StudioTooltipGroup className="library-create">
      <button type="button" aria-label="New post" data-studio-tooltip="New post" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("post")}><AcmIcon name="document.new-post" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New page" data-studio-tooltip="New page" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("page")}><AcmIcon name="document.new-page" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New from template" data-studio-tooltip="New from template" disabled={!writable || !templateWritable || !onNewFromTemplate} onClick={onNewFromTemplate}><AcmIcon name="document.from-template" scale="Regular-S" size={20} /></button>
    </StudioTooltipGroup><div className="library-tools" {...reordering.listProps}>
      <DragPlacementIndicator line={reordering.line} />
      {order.map(id => {
        const tool = tools.find(item => item.id === id)!;
        const dragProps = reordering.rowProps(id);
        const active = studioSection === id;
        const content = <><span className="library-tool-icon"><StudioToolIcon tool={tool.icon} /></span><span className="library-tool-copy"><strong>{tool.label}</strong><small>{tool.description}</small></span>{id === "bin" ? <span className="library-tool-count" aria-hidden="true">{binCount}</span> : null}</>;
        const actionProps = { className: `library-tool-button${active ? " is-active" : ""}`, "aria-current": active ? "page" as const : undefined, "aria-label": id === "bin" ? `Bin, ${binCount} deleted ${binCount === 1 ? "item" : "items"}` : undefined };
        return <div key={id} className="library-tool-row" data-gap-row={dragProps["data-gap-row"]} data-gap-owner={dragProps["data-gap-owner"]} data-library-drop-row={true} onDragOver={dragProps.onDragOver} onDragLeave={dragProps.onDragLeave} onDrop={dragProps.onDrop}>
          {tool.href ? <a {...actionProps} href={tool.href} draggable={false}>{content}</a> : <button {...actionProps} type="button" onClick={tool.action} disabled={tool.disabled}>{content}</button>}
          <button {...dragProps} data-gap-row={undefined} data-gap-owner={undefined} data-library-drop-row={undefined} data-drop-edge={undefined} className="studio-tool-drag-button studio-site-drag-button" type="button" aria-disabled={!reordering.canReorder} aria-label={`Reorder ${tool.label}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={reordering.canReorder} /></button>
        </div>;
      })}
      <span className="visually-hidden" role="status">{reordering.message}</span>
      {status ? <p className="studio-site-order-status" role="status">{status}</p> : null}
    </div></>}
    tabs={<><StudioTooltipGroup className="pane-inset"><button type="button" className="studio-drafts-action" aria-pressed={!selectedSite} data-studio-tooltip="Posts and pages not assigned to a site." onClick={onSelectWorkspace}><AcmIcon name="document.content" scale="Regular-S" size={20} /><span>Studio Drafts</span></button></StudioTooltipGroup><LocalFixtureSiteNavigation selectedSite={selectedSite} onSelectSite={onSelectSite} libraryKind={libraryKind} /><div className="library-tabs"><PaneTabs id={tabsId} label="Content type" tabs={[
      { id: "post", label: "Posts" }, { id: "page", label: "Pages" }, { id: "templates", label: "Templates" },
    ]} active={libraryKind} onChange={id => onSelectLibraryKind?.(id as LibraryKind)} renderLabel={tab => <><span className="library-tab-label">{tab.label}</span><span>{counts[tab.id as LibraryKind] ?? "…"}</span></>} /></div></>}
    footer={<div className="library-footer"><button type="button" onClick={onExportContent}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div>}>
    {(["post", "page", "templates"] as const).map(kind => <PaneTabPanel key={kind} id={tabsId} tab={kind} active={libraryKind}>{kind === libraryKind ? children : null}</PaneTabPanel>)}
  </Pane></ProjectLocalLinksProvider>;
}
