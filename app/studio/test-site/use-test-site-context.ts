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
import { testSiteCollection, testSiteWorkspace, type SiteNavigationAssignment, type SiteNavigationMenu } from "./contract";
import type { useTestSite } from "./use-test-site";

/** One site aggregate owns content, taxonomy, templates and their shared undo history. */
export function useTestSiteContext(site: ReturnType<typeof useTestSite>, browser: ReturnType<typeof useStudioWorkspace>, previewDocumentId?: string | null, globals?: GlobalTemplateLibrary | null, globalsInitialised = false, selectedNavigationMenuId?: string) {
  const [selectedId, setSelectedId] = useState(previewDocumentId ?? "test-site");
  const [navigationReviewPending, setNavigationReviewPending] = useState(false);
  const sourceCollection = site.draft ? testSiteCollection(site.draft) : null;
  const bindings = sourceCollection && globals ? sourceCollection.globalTemplates.length ? sourceCollection.globalTemplates : migrateGlobalTemplateBindings(sourceCollection.templates, globals, site.siteId) : [];
  const selectedMenuId = sourceCollection?.navigationMenus.some(menu => menu.id === selectedNavigationMenuId) ? selectedNavigationMenuId! : sourceCollection?.defaultNavigationMenuId;
  const projectMenu = (store: TemplateStore, links?: SiteNavigationMenu["links"]) => links ? { ...store, sets: store.sets.map(set => set.id === sourceCollection?.siteNavigation.setId ? { ...set, navigation: links } : set) } : store;
  const collection = sourceCollection && globals ? { ...sourceCollection, templates: projectMenu(effectiveGlobalTemplates(sourceCollection.templates, globals, bindings), sourceCollection.navigationMenus.find(menu => menu.id === selectedMenuId)?.links) } : sourceCollection;
  const workspace: StudioWorkspace = collection ? testSiteWorkspace(collection, selectedId)
    : { version: 32, documents: [], activeDocumentId: "", categories: [], bin: [] };
  function commitContent(update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) {
    return site.updateDraft(current => {
      const source = testSiteCollection(current);
      if (!globals || !globalsInitialised) throw new Error("Global templates are unavailable. The site draft was preserved.");
      const refs = source.globalTemplates.length ? source.globalTemplates : migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = projectMenu(effectiveGlobalTemplates(source.templates, globals, refs), source.navigationMenus.find(menu => menu.id === selectedMenuId)?.links);
      const next = update(testSiteWorkspace(source, selectedId), effective);
      const currentNavigation = source.navigationMenus.find(menu => menu.id === selectedMenuId)?.links ?? source.navigationMenus.find(menu => menu.id === source.defaultNavigationMenuId)?.links;
      const nextNavigation = next.templates.sets.find(item => item.id === source.siteNavigation.setId)?.navigation;
      if (JSON.stringify(currentNavigation) !== JSON.stringify(nextNavigation)) {
        site.deferAutoSave(true);
        setNavigationReviewPending(true);
      }
      const sets = retainFixtureTemplateContent(source.templates, effective, next.templates, source.siteNavigation.setId);
      const selectedLinks = next.templates.sets.find(item => item.id === source.siteNavigation.setId)?.navigation;
      const navigationMenus = selectedLinks ? source.navigationMenus.map(menu => menu.id === selectedMenuId ? { ...menu, links: selectedLinks } : menu) : source.navigationMenus;
      const defaultLinks = navigationMenus.find(menu => menu.id === source.defaultNavigationMenuId)?.links;
      const publications = localSitePublicationSnapshots(source);
      const retainedIds = new Set([...next.workspace.documents, ...next.workspace.bin.map(item => item.document)].map(document => document.id));
      return { ...source, publications: publications.filter(item => retainedIds.has(item.document.id)), documents: next.workspace.documents, categories: next.workspace.categories,
        bin: next.workspace.bin, version: 15, globalTemplates: refs, templates: { ...source.templates, sets: sets.map(set => set.id === source.siteNavigation.setId && defaultLinks ? { ...set, navigation: defaultLinks } : set), assignments: next.templates.assignments, bin: next.templates.bin }, navigationMenus, activeDocumentId: source.homeDocumentId };
    });
  }
  function commit(update: (current: StudioWorkspace) => StudioWorkspace) {
    let nextId = selectedId;
    const saved = commitContent((current, templates) => { const next = update(current); nextId = next.activeDocumentId; return { workspace: next, templates }; });
    if (saved) setSelectedId(nextId);
    return saved;
  }
  function updateDocument(documentId: string, update: (document: StudioWorkspace["documents"][number]) => StudioWorkspace["documents"][number]) {
    let found = false;
    let invalid = false;
    const accepted = commit(current => ({ ...current, documents: current.documents.map(document => {
      if (document.id !== documentId) return document;
      found = true;
      const next = update(document);
      if (JSON.stringify(next) === JSON.stringify(document)) return document;
      const blocks = reconcileFootnoteBlocks(document.blocks, next.blocks);
      if (!blocks) invalid = true;
      return blocks ? { ...next, blocks, updatedAt: new Date().toISOString() } : document;
    }) }));
    return accepted && found && !invalid;
  }
  function commitNavigationMenus(update: (current: { menus: SiteNavigationMenu[]; defaultMenuId: string; assignments: SiteNavigationAssignment[] }) => { menus: SiteNavigationMenu[]; defaultMenuId: string; assignments: SiteNavigationAssignment[] }) {
    if (!site.writable || !sourceCollection) return false;
    const accepted = site.updateDraft(current => {
      const source = testSiteCollection(current);
      const next = update({ menus: source.navigationMenus, defaultMenuId: source.defaultNavigationMenuId, assignments: source.navigationAssignments });
      if (!next.menus.length || !next.menus.some(menu => menu.id === next.defaultMenuId) || next.assignments.some(item => !next.menus.some(menu => menu.id === item.menuId))) throw new Error("The navigation menu change is invalid. The site draft was kept.");
      const defaultMenu = next.menus.find(menu => menu.id === next.defaultMenuId)!;
      return { ...source, version: 15, navigationMenus: next.menus, defaultNavigationMenuId: next.defaultMenuId, navigationAssignments: next.assignments,
        templates: { ...source.templates, sets: source.templates.sets.map(set => set.id === source.siteNavigation.setId ? { ...set, navigation: defaultMenu.links } : set) } };
    });
    if (accepted) { site.deferAutoSave(true); setNavigationReviewPending(true); }
    return accepted;
  }
  function finishNavigationReview() {
    site.deferAutoSave(false);
    setNavigationReviewPending(false);
  }
  async function changePublicationStatus(documentId: string, status: LocalSiteStatus, captureScheduled = true) {
    if (!site.writable || !globals || !globalsInitialised) throw new Error("Local publishing is unavailable. Your draft was kept.");
    if (!site.updateDraft(current => {
      const source = testSiteCollection(current);
      const document = source.documents.find(item => item.id === documentId);
      if (!document) throw new Error("The document is unavailable. Your draft was kept.");
      const refs = source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates, globals, site.siteId);
      const effective = effectiveGlobalTemplates(source.templates, globals, refs);
      const publications = localSitePublicationSnapshots(source);
      return changeLocalSiteStatus({ ...source, version: 15, globalTemplates: refs, publications }, documentId, status, effective, new Date().toISOString(), captureScheduled);
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
    const published = collection?.publications.find(item => item.document.id === documentId)?.document;
    return { status: published?.status === "published" ? "published" as const : "draft" as const,
      publishedAt: published?.status === "published" ? published.publishedAt : undefined };
  }
  return { reconnect, publishDocument, changePublicationStatus, publicationFor, siteNavigation: collection?.siteNavigation, headerReference: collection && globals ? sharedHeaderReference(collection.templates, globals, bindings) : undefined, collection, selectedNavigationMenuId: selectedMenuId, siteId: site.siteId, session, templates, commitContent, commitNavigationMenus, navigationReviewPending, finishNavigationReview, updateDocument, homeDocumentId: collection?.homeDocumentId ?? "test-site" };
}
