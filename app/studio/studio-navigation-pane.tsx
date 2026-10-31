"use client";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import type { LocalFixtureSiteId } from "./test-site/sites";
import { useRef, useState } from "react";
import { StudioNavigationFrame } from "./studio-navigation-frame";
import { StudioListContextMenu, type StudioListContextMenuTarget } from "./studio-list-context-menu";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import type { useTemplates } from "./use-templates";
import { useLibraryReordering } from "./use-library-reordering";
import { LibraryDragHandle } from "./library-drag-handle";
import { orderedLibraryDocuments, type LibraryMove } from "./library-reordering";
import { templateLibraryEntries } from "./template-library";
import { templateNameInitial } from "./template-library";
import { studioContentDocumentPath, studioContextPath, studioSiteEditorPath } from "./use-studio-screen-navigation";
import { getStudioNavigationPreview } from "./navigation-continuity";

export function StudioNavigationPane({ workspace, activeDocument, templateSession, templateLibrarySession, onReorderDocuments, onReorderTemplates, templateTarget,
  libraryKind, templateCount, siteDataReady, libraryPaneWidth, libraryPaneCollapsed, setLibraryPaneWidth, setLibraryPaneCollapsed,
  studioSection, writable, exclusiveWritable, codeEditorDirty, addDocument, addDocumentFromTemplate,
  openMediaLibrary, selectDocument, canDeleteDocument, requestRenameDocument, duplicateDocument,
  requestDeleteDocument, onOpenBackup, onOpenBin, onOpenTemplates, onSelectLibraryKind,
  onSelectTemplate, onExportContent, onSelectSite, onSelectWorkspace, selectedSite,
}: {
  workspace: StudioWorkspace; activeDocument: StudioDocument;
  templateLibrarySession: Pick<ReturnType<typeof useTemplates>, "store" | "writable">;
  onReorderDocuments: (kind: StudioDocumentKind, move: LibraryMove) => boolean;
  onReorderTemplates: (move: LibraryMove) => boolean;
  templateSession: Pick<ReturnType<typeof useTemplates>, "store" | "writable">;
  templateTarget: { setId: string | null; targetId: string | null };
  libraryKind: StudioDocumentKind | "templates"; templateCount: number | null; siteDataReady: boolean;
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
  onSelectTemplate: (setId: string, targetId: string) => void; onExportContent: () => void; onSelectSite?: (id: LocalFixtureSiteId) => void; onSelectWorkspace?: () => void; selectedSite?: LocalFixtureSiteId | null;
}) {
  const kind = libraryKind;
  const cachedSiteSnapshot = selectedSite ? getStudioNavigationPreview(selectedSite) : undefined;
  const cachedSitePreview = !siteDataReady ? cachedSiteSnapshot : undefined;
  const cachedSiteDocuments = cachedSitePreview?.documents;
  const cachedLibraryDocuments = cachedSiteDocuments && kind !== "templates" ? orderedLibraryDocuments(cachedSiteDocuments, kind) : undefined;
  const visibleCounts = cachedSitePreview ? {
    post: cachedSitePreview.documents.filter(item => item.kind === "post").length,
    page: cachedSitePreview.documents.filter(item => item.kind === "page").length,
    templates: cachedSitePreview.templateCount,
  } : {
    post: workspace.documents.filter(item => item.kind === "post").length,
    page: workspace.documents.filter(item => item.kind === "page").length,
    templates: templateCount ?? cachedSiteSnapshot?.templateCount ?? null,
  };
  const liveBinCount = workspace.bin.length + templateSession.store.bin.length + templateLibrarySession.store.bin.length;
  const visibleBinCount = cachedSitePreview?.binCount ?? (templateCount === null ? cachedSiteSnapshot?.binCount : undefined) ?? liveBinCount;
  const entries = templateLibraryEntries(templateLibrarySession.store);
  const libraryDocuments = orderedLibraryDocuments(workspace.documents, kind === "templates" ? "page" : kind);
  const ids = kind === "templates"
    ? cachedSitePreview?.templates.map(entry => `${entry.setId}/${entry.id}`) ?? entries.map(({ set, entry }) => `${set.id}/${entry.id}`)
    : cachedLibraryDocuments?.map(item => item.id) ?? libraryDocuments.map(item => item.id);
  const reordering = useLibraryReordering(ids, kind === "templates" ? templateLibrarySession.writable : writable && !codeEditorDirty, move => kind === "templates" ? onReorderTemplates(move) : onReorderDocuments(kind, move), `${selectedSite ?? "drafts"}/${kind}`);
  const documentContextMenuTriggerRef = useRef<HTMLElement | null>(null);
  const [documentContextMenu, setDocumentContextMenu] = useState<(StudioListContextMenuTarget & { id: string }) | null>(null);
  function closeDocumentContextMenu() {
    setDocumentContextMenu(null);
    requestAnimationFrame(() => documentContextMenuTriggerRef.current?.isConnected && documentContextMenuTriggerRef.current.focus());
  }
  return <StudioNavigationFrame width={libraryPaneWidth} collapsed={libraryPaneCollapsed}
    onWidthChange={setLibraryPaneWidth} onCollapsedChange={setLibraryPaneCollapsed}
    selectedSite={selectedSite} onSelectSite={onSelectSite} onSelectWorkspace={onSelectWorkspace}
    contentEditorHref={activeDocument.id === "studio-empty-preview"
      ? studioContextPath(selectedSite ?? null, activeDocument.kind)
      : studioContentDocumentPath(selectedSite ?? null, activeDocument.kind, activeDocument.id)}
    siteEditorHref={studioSiteEditorPath(selectedSite ?? null,
      selectedSite && libraryKind === "page" && activeDocument.id !== "studio-empty-preview" && activeDocument.kind === "page" ? activeDocument.id : undefined,
      libraryKind)}
    libraryKind={libraryKind} onSelectLibraryKind={onSelectLibraryKind}
    counts={visibleCounts}
    binCount={visibleBinCount} studioSection={studioSection}
    writable={writable} templateWritable={templateSession.writable}
    onNewDocument={addDocument} onNewFromTemplate={addDocumentFromTemplate}
    onOpenFiles={openMediaLibrary} onOpenTemplates={onOpenTemplates} onOpenBackup={onOpenBackup} onOpenBin={onOpenBin}
    onExportContent={onExportContent}>
            <div className="document-list" {...reordering.listProps}>
              <DragPlacementIndicator line={reordering.line} />
              {cachedLibraryDocuments && kind !== "templates" ? cachedLibraryDocuments.map(document => <button {...reordering.rowProps(document.id)} className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} disabled aria-disabled="true" aria-haspopup="menu" aria-expanded={false}>
                <span className="document-kind-mark" aria-hidden="true">{document.kind === "page" ? "P" : "A"}</span>
                <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                <span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
                <LibraryDragHandle enabled={false} />
              </button>) : null}
              {kind === "templates" ? <>
                {cachedSitePreview ? cachedSitePreview.templates.map(entry => (
                  <button {...reordering.rowProps(`${entry.setId}/${entry.id}`)} className={`document-item template-target-item${templateTarget.setId === entry.setId && templateTarget.targetId === entry.id ? " is-active" : ""}`} type="button" key={`${entry.setId}/${entry.id}`} disabled aria-disabled="true">
                    <span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span>
                    <span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" || entry.kind === "overlay" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span>
                    <i aria-hidden="true" />
                    <LibraryDragHandle enabled={false} />
                  </button>
                )) : entries.map(({ set, entry }) => (
                  <button {...reordering.rowProps(`${set.id}/${entry.id}`)} className={`document-item template-target-item${templateTarget.setId === set.id && templateTarget.targetId === entry.id ? " is-active" : ""}`} type="button" key={`${set.id}/${entry.id}`} onClick={() => onSelectTemplate(set.id, entry.id)}>
                    <span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span>
                    <span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" || entry.kind === "overlay" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span>
                    <i aria-hidden="true" />
                    <LibraryDragHandle enabled={reordering.canReorder} />
                  </button>
                ))}
                <button className="button-secondary" type="button" onClick={onOpenTemplates}>Open Template Editor</button>
                {entries.length === 0 ? <p className="document-list-empty">No templates yet.</p> : null}
              </> : cachedSiteDocuments ? null : libraryDocuments.map((document) => (
                  <button {...reordering.rowProps(document.id)} className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} aria-haspopup="menu" aria-expanded={documentContextMenu?.id === document.id} onClick={() => selectDocument(document)} onContextMenu={async (event) => { event.preventDefault(); const opener = event.currentTarget; const x = event.clientX; const y = event.clientY; if (!await selectDocument(document)) return; documentContextMenuTriggerRef.current = opener; setDocumentContextMenu({ id: document.id, label: document.title, x, y }); }} onKeyDown={async (event) => { reordering.rowProps(document.id).onKeyDown(event); if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); const opener = event.currentTarget; if (!await selectDocument(document)) return; documentContextMenuTriggerRef.current = opener; const rect = opener.getBoundingClientRect(); setDocumentContextMenu({ id: document.id, label: document.title, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
                  <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
                  <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                  <span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
                  <LibraryDragHandle enabled={reordering.canReorder} />
                </button>
              ))}
              {kind !== "templates" && siteDataReady && !workspace.documents.some((document) => document.kind === kind) ? <p className="document-list-empty">No {kind === "page" ? "pages" : "posts"} yet.</p> : null}
              <span className="visually-hidden" role="status">{reordering.message}</span>
            </div>

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
  </StudioNavigationFrame>;
}
