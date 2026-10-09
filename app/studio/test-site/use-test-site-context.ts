"use client";
import { reconcileFootnoteBlocks } from "../../content/footnote-reconciliation";
import { useState } from "react";
import { type StudioWorkspace } from "../editor-model";
import { emptyTemplateStore, type TemplateStore } from "../template-model";
import type { useStudioWorkspace } from "../use-studio-workspace";
import type { useTemplates } from "../use-templates";
import { testSiteCollection, testSiteWorkspace } from "./contract";
import type { useTestSite } from "./use-test-site";

/** One site aggregate owns content, taxonomy, templates and their shared undo history. */
export function useTestSiteContext(site: ReturnType<typeof useTestSite>, browser: ReturnType<typeof useStudioWorkspace>, previewDocumentId?: string | null) {
  const [selectedId, setSelectedId] = useState(previewDocumentId ?? "test-site");
  const collection = site.draft ? testSiteCollection(site.draft) : null;
  const workspace: StudioWorkspace = collection ? testSiteWorkspace(collection, selectedId)
    : { version: 24, documents: [], activeDocumentId: "", categories: [], bin: [] };
  function commitContent(update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) {
    return site.updateDraft(current => {
      const source = testSiteCollection(current);
      const next = update(testSiteWorkspace(source, selectedId), source.templates);
      // Selection is local to the tab. The saved home remains a valid fallback.
      return { ...source, documents: next.workspace.documents, categories: next.workspace.categories,
        bin: next.workspace.bin, templates: next.templates, activeDocumentId: source.homeDocumentId };
    });
  }
  function commit(update: (current: StudioWorkspace) => StudioWorkspace) {
    let nextId = selectedId;
    const saved = commitContent((current, templates) => { const next = update(current); nextId = next.activeDocumentId; return { workspace: next, templates }; });
    if (saved) setSelectedId(nextId);
    return saved;
  }
  function updateDocument(documentId: string, update: (document: StudioWorkspace["documents"][number]) => StudioWorkspace["documents"][number]) {
    return commit(current => ({ ...current, documents: current.documents.map(document => {
      if (document.id !== documentId) return document;
      const next = update(document);
      if (JSON.stringify(next) === JSON.stringify(document)) return document;
      const blocks = reconcileFootnoteBlocks(document.blocks, next.blocks);
      return blocks ? { ...next, blocks, updatedAt: new Date().toISOString() } : document;
    }) }));
  }
  const session: ReturnType<typeof useStudioWorkspace> = {
    ...browser, workspace, ready: Boolean(collection), writable: site.writable, exclusiveWritable: site.writable && browser.exclusiveWritable,
    loadError: site.failure, saveLabel: site.label, commit, setActiveDocument: setSelectedId,
    updateDocument, updateActiveDocument: update => updateDocument(workspace.activeDocumentId, update),
    updateActiveField: (field, value) => updateDocument(workspace.activeDocumentId, document => ({ ...document, [field]: value })),
    undo: () => { if (!site.canUndo) return false; site.undo(); return true; }, redo: () => { if (!site.canRedo) return false; site.redo(); return true; }, canUndo: site.canUndo, canRedo: site.canRedo,
    requestSave: () => { if (!site.writable) return false; void site.flush().catch(() => {}); return true; },
    syncConflict: site.syncConflict, syncResolutionError: site.syncResolutionError, resolveSyncConflict: site.resolveSyncConflict,
    retryEditing: () => { void site.reconnect(); }, canRetryEditing: Boolean(site.failure), syncStatus: site.syncStatus,
  };
  const templates: ReturnType<typeof useTemplates> = {
    store: collection?.templates ?? emptyTemplateStore(), ready: Boolean(collection), writable: site.writable,
    exclusiveWritable: session.exclusiveWritable, error: site.failure, saveLabel: site.label, syncStatus: site.syncStatus,
    syncConflict: site.syncConflict, resolveSyncConflict: site.resolveSyncConflict, retryConnection: () => { void site.reconnect(); },
    commit: update => commitContent((current, store) => ({ workspace: current, templates: update(store) })),
    undo: () => { site.undo(); return true; }, redo: () => { site.redo(); return true; }, canUndo: site.canUndo, canRedo: site.canRedo,
  };
  return { siteId: site.siteId, session, templates, commitContent, updateDocument, homeDocumentId: collection?.homeDocumentId ?? "test-site" };
}
