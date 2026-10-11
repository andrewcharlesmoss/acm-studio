"use client";
import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, retainLegacyNavigationPresentation, type GlobalTemplateLibrary } from "../global-template-contract";
import { reconcileFootnoteBlocks } from "../../content/footnote-reconciliation";
import { useState } from "react";
import { type StudioWorkspace } from "../editor-model";
import { emptyTemplateStore, type TemplateStore, resolveTemplate } from "../template-model";
import type { useStudioWorkspace } from "../use-studio-workspace";
import type { useTemplates } from "../use-templates";
import { testSiteCollection, testSiteWorkspace } from "./contract";
import type { useTestSite } from "./use-test-site";

/** One site aggregate owns content, taxonomy, templates and their shared undo history. */
export function useTestSiteContext(site: ReturnType<typeof useTestSite>, browser: ReturnType<typeof useStudioWorkspace>, previewDocumentId?: string | null, globals?: GlobalTemplateLibrary | null, globalsInitialised = false) {
  const [selectedId, setSelectedId] = useState(previewDocumentId ?? "test-site");
  const sourceCollection = site.draft ? testSiteCollection(site.draft) : null;
  const bindings = sourceCollection && globals ? sourceCollection.globalTemplates ?? migrateGlobalTemplateBindings(sourceCollection.templates, globals, site.siteId) : [];
  const collection = sourceCollection && globals ? { ...sourceCollection, templates: effectiveGlobalTemplates(sourceCollection.templates, globals, bindings) } : sourceCollection;
  const workspace: StudioWorkspace = collection ? testSiteWorkspace(collection, selectedId)
    : { version: 24, documents: [], activeDocumentId: "", categories: [], bin: [] };
  function commitContent(update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) {
    return site.updateDraft(current => {
      const source = testSiteCollection(current);
      if (!globals || !globalsInitialised) throw new Error("Global templates are unavailable. The site draft was preserved.");
      const refs = source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = effectiveGlobalTemplates(source.templates, globals, refs);
      const next = update(testSiteWorkspace(source, selectedId), effective);
      const design = (store: TemplateStore) => store.sets.map(({ identity: _identity, navigation: _navigation, socialLinks: _social, ...original }) => { void _identity; void _navigation; void _social; return original; });
      if (JSON.stringify(design(next.templates)) !== JSON.stringify(design(effective))) throw new Error("Templates are global. Edit their original in Templates; site design changes are unavailable.");
      for (const set of next.templates.sets) { retainLegacyNavigationPresentation(set.navigation, []); retainLegacyNavigationPresentation(set.socialLinks, []); }
      // Preserve legacy designs/patches for recovery; only identity, links and assignments belong to this site.
      const sets = source.templates.sets.map(retained => {
        const local = next.templates.sets.find(item => item.id === retained.id);
        return local ? { ...retained, identity: local.identity, navigation: retainLegacyNavigationPresentation(local.navigation, retained.navigation), socialLinks: retainLegacyNavigationPresentation(local.socialLinks, retained.socialLinks) } : retained;
      });
      for (const entry of next.templates.sets) if (!sets.some(set => set.id === entry.id)) sets.push(entry);
      const publications = source.version === 6 ? source.publications : source.documents.map(document => {
        const presentation = resolveTemplate(effective, document);
        return { document: structuredClone(document), ...(presentation ? { assignment: { documentId: document.id, kind: document.kind, setId: presentation.set.id, templateId: presentation.templateId } } : {}) };
      });
      const retainedIds = new Set([...next.workspace.documents, ...next.workspace.bin.map(item => item.document)].map(document => document.id));
      return { ...source, publications: publications.filter(item => retainedIds.has(item.document.id)), documents: next.workspace.documents, categories: next.workspace.categories,
        bin: next.workspace.bin, version: 6, globalTemplates: refs, templates: { ...source.templates, sets, assignments: next.templates.assignments, bin: next.templates.bin }, activeDocumentId: source.homeDocumentId };
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
  async function publishDocument(documentId: string) {
    if (!site.writable || !globals || !globalsInitialised) throw new Error("Local publishing is unavailable. Your draft was kept.");
    if (!site.updateDraft(current => {
      const source = testSiteCollection(current);
      const document = source.documents.find(item => item.id === documentId);
      if (!document || !document.title.trim()) throw new Error("Add a title before publishing.");
      const published = { ...document, status: "published" as const, publishedAt: document.publishedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      const refs = source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = effectiveGlobalTemplates(source.templates, globals, refs);
      const publications = source.version === 6 ? source.publications : source.documents.map(document => {
        const presentation = resolveTemplate(effective, document);
        return { document: structuredClone(document), ...(presentation ? { assignment: { documentId: document.id, kind: document.kind, setId: presentation.set.id, templateId: presentation.templateId } } : {}) };
      });
      const presentation = resolveTemplate(effective, published);
      const publication = { document: structuredClone(published), ...(presentation ? { assignment: { documentId, kind: published.kind, setId: presentation.set.id, templateId: presentation.templateId } } : {}) };
      return { ...source, version: 6, globalTemplates: refs, documents: source.documents.map(item => item.id === documentId ? published : item), publications: [...publications.filter(item => item.document.id !== documentId), publication] };
    }, false)) throw new Error("The revision could not be published. Your draft was kept.");
    await site.flush();
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
    retryEditing: () => { void site.reconnect(); }, canRetryEditing: Boolean(site.failure), syncStatus: site.syncStatus,
  };
  const templates: ReturnType<typeof useTemplates> = {
    store: collection?.templates ?? emptyTemplateStore(), ready: Boolean(collection && globals), writable: site.writable && Boolean(globals) && globalsInitialised,
    exclusiveWritable: session.exclusiveWritable, error: site.failure, saveLabel: site.label, syncStatus: site.syncStatus,
    syncConflict: site.syncConflict, resolveSyncConflict: site.resolveSyncConflict, retryConnection: () => { void site.reconnect(); },
    commit: update => commitContent((current, store) => ({ workspace: current, templates: update(store) })),
    undo: () => { site.undo(); return true; }, redo: () => { site.redo(); return true; }, canUndo: site.canUndo, canRedo: site.canRedo,
  };
  return { publishDocument, siteNavigation: collection?.siteNavigation, collection, siteId: site.siteId, session, templates, commitContent, updateDocument, homeDocumentId: collection?.homeDocumentId ?? "test-site" };
}
