"use client";
import { useId, useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { ProjectLocalLinksProvider, ProjectLocalSiteNavigation } from "./project-local-links";
import { StudioIcon } from "./studio-icons";
import { StudioListContextMenu, type StudioListContextMenuTarget } from "./studio-list-context-menu";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import type { useTemplates } from "./use-templates";

export function StudioNavigationPane({ workspace, activeDocument, templateSession, templateTarget,
  libraryKind, libraryPaneWidth, libraryPaneCollapsed, setLibraryPaneWidth, setLibraryPaneCollapsed,
  studioSection, writable, exclusiveWritable, codeEditorDirty, addDocument, addDocumentFromTemplate,
  openMediaLibrary, selectDocument, canDeleteDocument, requestRenameDocument, duplicateDocument,
  requestDeleteDocument, onOpenBackup, onOpenBin, onOpenTemplates, onSelectLibraryKind,
  onSelectTemplate, onExportContent, onSelectTest,
}: {
  workspace: StudioWorkspace; activeDocument: StudioDocument;
  templateSession: Pick<ReturnType<typeof useTemplates>, "store" | "writable">;
  templateTarget: { setId: string | null; targetId: string | null };
  libraryKind: StudioDocumentKind | "templates";
  libraryPaneWidth: number; libraryPaneCollapsed: boolean;
  setLibraryPaneWidth: (width: number) => void; setLibraryPaneCollapsed: (collapsed: boolean) => void;
  studioSection: string; writable: boolean; exclusiveWritable: boolean; codeEditorDirty: boolean;
  addDocument: (kind: StudioDocumentKind) => void; addDocumentFromTemplate: () => void;
  openMediaLibrary: () => void; selectDocument: (document: StudioDocument) => boolean | Promise<boolean>;
  canDeleteDocument: (document: StudioDocument | undefined) => boolean;
  requestRenameDocument: (documentId: string, opener: HTMLElement | null) => void;
  duplicateDocument: (documentId: string) => void; requestDeleteDocument: (documentId: string) => void;
  onOpenBackup: () => void; onOpenBin: () => void; onOpenTemplates: () => void;
  onSelectLibraryKind: (kind: StudioDocumentKind | "templates") => void;
  onSelectTemplate: (setId: string, targetId: string) => void; onExportContent: () => void; onSelectTest?: () => void;
}) {
  const libraryTabsId = useId();
  const documentContextMenuTriggerRef = useRef<HTMLElement | null>(null);
  const [documentContextMenu, setDocumentContextMenu] = useState<(StudioListContextMenuTarget & { id: string }) | null>(null);
  function closeDocumentContextMenu() {
    setDocumentContextMenu(null);
    requestAnimationFrame(() => documentContextMenuTriggerRef.current?.isConnected && documentContextMenuTriggerRef.current.focus());
  }
  return <ProjectLocalLinksProvider>
        <Pane trackClassName="studio-library-track" className="studio-library" bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={libraryPaneWidth} onWidthChange={setLibraryPaneWidth} minWidth={270} maxWidth={480} collapsed={libraryPaneCollapsed} onCollapsedChange={setLibraryPaneCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
          header={<><div className="library-create">
            <button type="button" disabled={!writable} onClick={() => addDocument("post")}><StudioIcon name="add" size={16} /> New post</button>
            <button type="button" disabled={!writable} onClick={() => addDocument("page")}><StudioIcon name="add" size={16} /> New page</button>
            <button type="button" disabled={!writable || !templateSession.writable} onClick={addDocumentFromTemplate}>New from template</button>
          </div><div className="library-tools">
            <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={() => openMediaLibrary()}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
            <a className="library-tool-button" href="/studio/designs"><span><StudioIcon name="image" /></span><strong>Design Canvas</strong><small>Create and annotate images</small></a>
            <a className="library-tool-button" href="/studio/ui"><span><AcmIcon name="layout.columns" /></span><strong>Studio UI Library</strong><small>Workspace, Ribbon, panes and shared icons</small></a>
            <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={onOpenBackup}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
            <button className={`library-tool-button${studioSection === "bin" ? " is-active" : ""}`} type="button" onClick={onOpenBin}><span><StudioIcon name="archive" /></span><strong>Bin</strong><small>{workspace.bin.length + templateSession.store.bin.length} deleted items</small></button>
          </div></>}
          tabs={<><ProjectLocalSiteNavigation id="test" name="Test" onSelectTest={onSelectTest} /><div className="library-tabs"><PaneTabs id={libraryTabsId} label="Content type" tabs={[
            { id: "page", label: "Pages" }, { id: "post", label: "Posts" }, { id: "templates", label: "Templates" },
          ]} active={libraryKind} onChange={id => onSelectLibraryKind(id as StudioDocumentKind | "templates")} renderLabel={(tab) => <><span className="library-tab-label">{tab.label}</span><span>{tab.id === "templates" ? templateSession.store.sets.reduce((count, item) => count + item.templates.length + item.parts.length, 0) : workspace.documents.filter((item) => item.kind === tab.id).length}</span></>} /></div></>}
          footer={<div className="library-footer"><button type="button" onClick={() => onExportContent()}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div>}>
          {(["page", "post", "templates"] as const).map((kind) => <PaneTabPanel key={kind} id={libraryTabsId} tab={kind} active={libraryKind}>
            <div className="document-list">
              {kind === "templates" ? <>
                {templateSession.store.sets.flatMap(set => [...set.templates, ...set.parts].map(entry => ({ set, entry }))).map(({ set, entry }) => (
                  <button className={`document-item template-target-item${templateTarget.setId === set.id && templateTarget.targetId === entry.id ? " is-active" : ""}`} type="button" key={`${set.id}/${entry.id}`} onClick={() => onSelectTemplate(set.id, entry.id)}>
                    <span className="document-kind-mark">{entry.kind === "post" ? "A" : entry.kind === "page" ? "P" : "H"}</span>
                    <span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span>
                    <i aria-hidden="true" />
                  </button>
                ))}
                <button className="button-secondary" type="button" onClick={onOpenTemplates}>Open Template Editor</button>
                {!templateSession.store.sets.some(set => set.templates.length || set.parts.length) ? <p className="document-list-empty">No templates yet.</p> : null}
              </> : workspace.documents.filter((document) => document.kind === kind).map((document) => (
                  <button className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} aria-haspopup="menu" aria-expanded={documentContextMenu?.id === document.id} onClick={() => selectDocument(document)} onContextMenu={async (event) => { event.preventDefault(); const opener = event.currentTarget; const x = event.clientX; const y = event.clientY; if (!await selectDocument(document)) return; documentContextMenuTriggerRef.current = opener; setDocumentContextMenu({ id: document.id, label: document.title, x, y }); }} onKeyDown={async (event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); const opener = event.currentTarget; if (!await selectDocument(document)) return; documentContextMenuTriggerRef.current = opener; const rect = opener.getBoundingClientRect(); setDocumentContextMenu({ id: document.id, label: document.title, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
                  <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
                  <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                  <span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
                </button>
              ))}
              {kind !== "templates" && !workspace.documents.some((document) => document.kind === kind) ? <p className="document-list-empty">No {kind === "page" ? "pages" : "posts"} yet.</p> : null}
            </div>
          </PaneTabPanel>)}
          {documentContextMenu ? (() => {
            const contextDocument = workspace.documents.find((item) => item.id === documentContextMenu.id);
            const contextAssignment = templateSession.store.assignments.find((item) => item.documentId === documentContextMenu.id);
            const requiresExclusiveOwnership = contextDocument?.kind === "post" && contextDocument.status === "published";
            const canDelete = canDeleteDocument(contextDocument);
            const disabledReason = !writable ? "Editing is unavailable in this tab." : requiresExclusiveOwnership && !exclusiveWritable ? "Published posts require exclusive ownership to remove their local publication." : contextAssignment && !templateSession.writable ? "The template assignment is not writable in this tab." : undefined;
            const actions = contextDocument ? [
              { label: "Rename", icon: "pencil" as const, onClick: () => requestRenameDocument(contextDocument.id, documentContextMenuTriggerRef.current), disabled: !writable },
              { label: "Duplicate", icon: "copy" as const, onClick: () => duplicateDocument(contextDocument.id), disabled: !writable || codeEditorDirty, disabledReason: !writable ? "Editing is unavailable in this tab." : codeEditorDirty ? "Apply the code editor changes before duplicating this document." : undefined },
            ] : [];
            return <StudioListContextMenu target={documentContextMenu} actions={actions} canDelete={canDelete} disabledReason={disabledReason} returnFocusRef={documentContextMenuTriggerRef} onDelete={() => requestDeleteDocument(documentContextMenu.id)} onClose={closeDocumentContextMenu} />;
          })() : null}
        </Pane>
  </ProjectLocalLinksProvider>;
}
