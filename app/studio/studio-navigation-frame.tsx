"use client";

import { useId, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { ProjectLocalLinksProvider, LocalFixtureSiteNavigation } from "./project-local-links";
import { StudioIcon } from "./studio-icons";
import { StudioToolIcon } from "./studio-tool-icon";
import type { StudioDocumentKind } from "./editor-model";
import type { LocalFixtureSiteId } from "./test-site/sites";

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
  return <ProjectLocalLinksProvider><Pane trackClassName="studio-library-track" className="studio-library"
    flushRegions={["header", "body", "footer"]} bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={width}
    onWidthChange={onWidthChange} minWidth={270} maxWidth={480} collapsed={collapsed}
    onCollapsedChange={onCollapsedChange} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
    header={<><StudioTooltipGroup className="library-create">
      <button type="button" aria-label="New post" data-studio-tooltip="New post" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("post")}><AcmIcon name="document.new-post" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New page" data-studio-tooltip="New page" disabled={!writable || !onNewDocument} onClick={() => onNewDocument?.("page")}><AcmIcon name="document.new-page" scale="Regular-S" size={20} /></button>
      <button type="button" aria-label="New from template" data-studio-tooltip="New from template" disabled={!writable || !templateWritable || !onNewFromTemplate} onClick={onNewFromTemplate}><AcmIcon name="document.from-template" scale="Regular-S" size={20} /></button>
    </StudioTooltipGroup><div className="library-tools">
      <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={onOpenFiles}><span className="library-tool-icon"><StudioToolIcon tool="files" /></span><strong>Files</strong></button>
      <button className={`library-tool-button${studioSection === "templates" ? " is-active" : ""}`} type="button" aria-current={studioSection === "templates" ? "page" : undefined} disabled={!onSelectLibraryKind} onClick={() => onSelectLibraryKind?.("templates")}><span className="library-tool-icon"><StudioToolIcon tool="templates" /></span><strong>Templates</strong></button>
      <a className="library-tool-button" href="/studio/designs"><span className="library-tool-icon"><StudioToolIcon tool="designs" /></span><strong>Design Canvas</strong></a>
      <a className="library-tool-button" href="/studio/ui"><span className="library-tool-icon"><StudioToolIcon tool="uiLibrary" /></span><strong>Studio UI Library</strong></a>
      <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={onOpenBackup}><span className="library-tool-icon"><StudioToolIcon tool="backup" /></span><strong>Backup</strong></button>
      <button className={`library-tool-button${studioSection === "bin" ? " is-active" : ""}`} type="button" aria-label={`Bin, ${binCount} deleted ${binCount === 1 ? "item" : "items"}`} onClick={onOpenBin}><span className="library-tool-icon"><StudioToolIcon tool="bin" /></span><strong>Bin</strong><span className="library-tool-count" aria-hidden="true">{binCount}</span></button>
      <a className="library-tool-button" href="/studio/site-editor"><span className="library-tool-icon"><StudioToolIcon tool="siteEditor" /></span><strong>Site Editor</strong></a>
    </div></>}
    tabs={<><StudioTooltipGroup className="pane-inset"><button type="button" className="studio-drafts-action" aria-pressed={!selectedSite} data-studio-tooltip="Posts and pages not assigned to a site." onClick={onSelectWorkspace}><AcmIcon name="document.content" scale="Regular-S" size={20} /><span>Studio Drafts</span></button></StudioTooltipGroup><LocalFixtureSiteNavigation selectedSite={selectedSite} onSelectSite={onSelectSite} libraryKind={libraryKind} /><div className="library-tabs"><PaneTabs id={tabsId} label="Content type" tabs={[
      { id: "post", label: "Posts" }, { id: "page", label: "Pages" }, { id: "templates", label: "Templates" },
    ]} active={libraryKind} onChange={id => onSelectLibraryKind?.(id as LibraryKind)} renderLabel={tab => <><span className="library-tab-label">{tab.label}</span><span>{counts[tab.id as LibraryKind] ?? "…"}</span></>} /></div></>}
    footer={<div className="library-footer"><button type="button" onClick={onExportContent}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div>}>
    {(["post", "page", "templates"] as const).map(kind => <PaneTabPanel key={kind} id={tabsId} tab={kind} active={libraryKind}>{kind === libraryKind ? children : null}</PaneTabPanel>)}
  </Pane></ProjectLocalLinksProvider>;
}
