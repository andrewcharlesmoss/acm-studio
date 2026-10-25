"use client";
import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, sharedHeaderReference, type GlobalTemplateLibrary } from "../global-template-contract";
import { retainFixtureTemplateContent } from "./template-content";
import { reconcileFootnoteBlocks } from "../../content/footnote-reconciliation";
import { useState } from "react";
import { type StudioWorkspace } from "../editor-model";
import { emptyTemplateStore, type TemplateStore } from "../template-model";
import type { useStudioWorkspace } from "../use-studio-workspace";
import type { useTemplates } from "../use-templates";
import { changeLocalSiteStatus, localSitePublicationSnapshots, type LocalSiteStatus } from "./local-publication";
import { testSiteCollection, testSiteWorkspace } from "./contract";
import type { useTestSite } from "./use-test-site";

/** One site aggregate owns content, taxonomy, templates and their shared undo history. */
export function useTestSiteContext(site: ReturnType<typeof useTestSite>, browser: ReturnType<typeof useStudioWorkspace>, previewDocumentId?: string | null, globals?: GlobalTemplateLibrary | null, globalsInitialised = false) {
  const [selectedId, setSelectedId] = useState(previewDocumentId ?? "test-site");
  const sourceCollection = site.draft ? testSiteCollection(site.draft) : null;
  const bindings = sourceCollection && globals ? sourceCollection.globalTemplates ?? migrateGlobalTemplateBindings(sourceCollection.templates, globals, site.siteId) : [];
  const collection = sourceCollection && globals ? { ...sourceCollection, templates: effectiveGlobalTemplates(sourceCollection.templates, globals, bindings) } : sourceCollection;
  const workspace: StudioWorkspace = collection ? testSiteWorkspace(collection, selectedId)
    : { version: 29, documents: [], activeDocumentId: "", categories: [], bin: [] };
  function commitContent(update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) {
    return site.updateDraft(current => {
      const source = testSiteCollection(current);
      if (!globals || !globalsInitialised) throw new Error("Global templates are unavailable. The site draft was preserved.");
      const refs = source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = effectiveGlobalTemplates(source.templates, globals, refs);
      const next = update(testSiteWorkspace(source, selectedId), effective);
      const sets = retainFixtureTemplateContent(source.templates, effective, next.templates, source.siteNavigation.setId);
      const publications = localSitePublicationSnapshots(source, effective);
      const retainedIds = new Set([...next.workspace.documents, ...next.workspace.bin.map(item => item.document)].map(document => document.id));
      return { ...source, publications: publications.filter(item => retainedIds.has(item.document.id)), documents: next.workspace.documents, categories: next.workspace.categories,
        bin: next.workspace.bin, version: 11, globalTemplates: refs, templates: { ...source.templates, sets, assignments: next.templates.assignments, bin: next.templates.bin }, activeDocumentId: source.homeDocumentId };
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
  async function changePublicationStatus(documentId: string, status: LocalSiteStatus, captureScheduled = true) {
    if (!site.writable || !globals || !globalsInitialised) throw new Error("Local publishing is unavailable. Your draft was kept.");
    if (!site.updateDraft(current => {
      const source = testSiteCollection(current);
      const document = source.documents.find(item => item.id === documentId);
      if (!document) throw new Error("The document is unavailable. Your draft was kept.");
      const refs = source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = effectiveGlobalTemplates(source.templates, globals, refs);
      const publications = localSitePublicationSnapshots(source, effective);
      return changeLocalSiteStatus({ ...source, version: 11, globalTemplates: refs, publications }, documentId, status, effective, new Date().toISOString(), captureScheduled);
    }, false)) throw new Error("The publication change could not be saved. Your draft was kept.");
    await site.flush();
  }
  const publishDocument = (documentId: string) => {
    const document = workspace.documents.find(item => item.id === documentId);
    return changePublicationStatus(documentId, document?.status === "scheduled" ? "scheduled" : document?.status === "private" ? "private" : "published");
  };
  function reconnect() {
    // The site handshake cannot recover an unavailable browser writer itself.
    // Retry that owner through its existing adapter before renewing site authority.
    browser.retryEditing();
    return site.reconnect();
  }
  const session: ReturnType<typeof useStudioWorkspace> = {
    ...browser, workspace, ready: Boolean(collection), writable: site.writable && Boolean(globals) && globalsInitialised, exclusiveWritable: site.writable && Boolean(globals) && globalsInitialised && browser.exclusiveWritable,
    loadError: site.failure, saveLabel: site.label, commit, setActiveDocument: setSelectedId,
    updateDocument, updateActiveDocument: update => updateDocument(workspace.activeDocumentId, update),
    updateActiveField: (field, value) => updateDocument(workspace.activeDocumentId, document => ({ ...document, [field]: value })),
    undo: () => { if (!site.canUndo) return false; site.undo(); return true; }, redo: () => { if (!site.canRedo) return false; site.redo(); return true; }, canUndo: site.canUndo, canRedo: site.canRedo,
    requestSave: () => { if (!site.writable) return false; void site.flush().catch(() => {}); return true; },
    flush: site.flush,
    syncConflict: site.syncConflict, syncResolutionError: site.syncResolutionError, resolveSyncConflict: site.resolveSyncConflict,
    retryEditing: () => { void reconnect(); }, canRetryEditing: browser.canRetryEditing || Boolean(site.failure) || site.syncStatus === "disconnected", syncStatus: site.syncStatus,
  };
  const templates: ReturnType<typeof useTemplates> = {
    store: collection?.templates ?? emptyTemplateStore(), ready: Boolean(collection && globals), writable: site.writable && Boolean(globals) && globalsInitialised,
    exclusiveWritable: session.exclusiveWritable, error: site.failure, saveLabel: site.label, syncStatus: site.syncStatus,
    syncConflict: site.syncConflict, resolveSyncConflict: site.resolveSyncConflict, retryConnection: () => { void reconnect(); },
    commit: update => commitContent((current, store) => ({ workspace: current, templates: update(store) })),
    undo: () => { site.undo(); return true; }, redo: () => { site.redo(); return true; }, canUndo: site.canUndo, canRedo: site.canRedo,
  };
  function publicationFor(documentId: string) {
    const published = (collection?.version === 6 || (collection?.version === 7 || (collection?.version === 8 || (collection?.version === 9 || collection?.version === 10 || collection?.version === 11))))
      ? collection.publications.find(item => item.document.id === documentId)?.document
      : collection?.documents.find(item => item.id === documentId);
    return { status: published?.status === "published" ? "published" as const : "draft" as const,
      publishedAt: published?.status === "published" ? published.publishedAt : undefined };
  }
  return { reconnect, publishDocument, changePublicationStatus, publicationFor, siteNavigation: collection?.siteNavigation, headerReference: collection && globals ? sharedHeaderReference(collection.templates, globals, bindings) : undefined, collection, siteId: site.siteId, session, templates, commitContent, updateDocument, homeDocumentId: collection?.homeDocumentId ?? "test-site" };
}
