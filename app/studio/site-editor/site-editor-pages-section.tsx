"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createDocument } from "../editor-model";
import { useStudioDocumentCommands } from "../use-studio-document-commands";
import { moveFixtureDocumentsToBin, restoreFixtureDocumentsFromBin } from "../document-bin-commands.mjs";
import { pagesPreferenceChangedEvent, pagesPreferenceKey } from "./pages-preferences-contract.mjs";
import { readPagesView, savePagesViewThroughOwner } from "./pages-preferences.mjs";
import { type PageStatusView, type PagesView } from "./pages-model.mjs";
import type { useTestSiteContext } from "../test-site/use-test-site-context";
import { PagesCatalogue } from "./pages-catalogue";

type SiteContext = ReturnType<typeof useTestSiteContext>;

function subscribePagesPreferences(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === pagesPreferenceKey || event.key === null) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(pagesPreferenceChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(pagesPreferenceChangedEvent, onChange);
  };
}

function getPagesPreferenceSnapshot() {
  try { return window.localStorage.getItem(pagesPreferenceKey) ?? "{}"; }
  catch { return "{}"; }
}

function getServerPagesPreferenceSnapshot() { return "{}"; }

function createSlug(title: string, documents: SiteContext["session"]["workspace"]["documents"]) {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
  const occupied = new Set(documents.filter(document => document.kind === "page").map(document => document.slug));
  let slug = base;
  for (let suffix = 2; occupied.has(slug); suffix++) slug = `${base}-${suffix}`;
  return slug;
}

function featuredImageUrl(document: SiteContext["session"]["workspace"]["documents"][number], siteId: SiteContext["siteId"]) {
  const source = document.coverImage?.src;
  if (!source) return undefined;
  if (source.startsWith("/media/")) return `/__studio/site-media/${siteId}/${source.slice("/media/".length)}`;
  if (/^https:\/\//i.test(source)) return source;
  return undefined;
}

export function SiteEditorPagesSection({ context, siteName, selectedId, status, onStatusChange, onSelectPage, onEditPage, onViewPublished }: {
  context: SiteContext;
  siteName: string;
  selectedId: string;
  status: PageStatusView;
  onStatusChange: (status: PageStatusView) => void;
  onSelectPage: (document: SiteContext["session"]["workspace"]["documents"][number]) => void | Promise<void>;
  onEditPage: (document: SiteContext["session"]["workspace"]["documents"][number]) => void | Promise<void>;
  onViewPublished: (document: SiteContext["session"]["workspace"]["documents"][number]) => void;
}) {
  const preferenceSnapshot = useSyncExternalStore(subscribePagesPreferences, getPagesPreferenceSnapshot, getServerPagesPreferenceSnapshot);
  const savedView = readPagesView({ getItem: (key: string) => key === pagesPreferenceKey ? preferenceSnapshot : null }, context.siteId);
  const [temporaryView, setTemporaryView] = useState<{ snapshot: string; siteId: string; view: PagesView } | null>(null);
  const view = temporaryView?.snapshot === preferenceSnapshot && temporaryView.siteId === context.siteId ? temporaryView.view : savedView;
  const [preferenceError, setPreferenceError] = useState("");
  const preferenceRequest = useRef(0);
  const workspace = context.session.workspace;
  const activeDocument = workspace.documents.find(document => document.id === workspace.activeDocumentId)
    ?? workspace.documents.find(document => document.kind === "page")
    ?? createDocument("page", `site-editor-${context.siteId}-pages-placeholder`);
  const commands = useStudioDocumentCommands({
    workspace,
    activeDocument,
    commit: context.session.commit,
    setActiveDocument: context.session.setActiveDocument,
    writable: context.session.writable,
    exclusiveWritable: context.session.exclusiveWritable,
    templates: context.templates,
    feedback: setPreferenceError,
    commitWithTemplates: context.commitContent,
  });

  function changeView(next: PagesView) {
    setTemporaryView({ snapshot: preferenceSnapshot, siteId: context.siteId, view: next });
    setPreferenceError("");
    const request = ++preferenceRequest.current;
    void savePagesViewThroughOwner(context.siteId, next).then(result => {
      if (request !== preferenceRequest.current) return;
      if (!result.saved) setPreferenceError("View options could not be saved. This choice is kept for this session.");
    }).catch(() => {
      if (request === preferenceRequest.current) setPreferenceError("View options could not be saved. This choice is kept for this session.");
    });
  }

  async function addPage(title: string) {
    const choice = context.templates.store.sets.flatMap(set => set.templates.map(template => ({ set, template })))
      .find(item => item.template.kind === "page" && item.template.isDefault);
    const created = commands.addDocument("page", choice ? { setId: choice.set.id, templateId: choice.template.id } : undefined,
      { title, slug: createSlug(title, workspace.documents) });
    if (!created) throw new Error("The page could not be created. Check the saving status and try again.");
    await context.session.flush();
    return created;
  }

  async function renamePage(document: SiteContext["session"]["workspace"]["documents"][number], title: string) {
    if (!commands.renameDocument(document.id, title)) throw new Error("The page could not be renamed. Check the saving status and try again.");
    await context.session.flush();
  }

  async function orderPage(document: SiteContext["session"]["workspace"]["documents"][number], pageOrder: number) {
    if (!context.updateDocument(document.id, current => ({ ...current, pageOrder, updatedAt: new Date().toISOString() }))) {
      throw new Error("The page order could not be saved. Check the saving status and try again.");
    }
    await context.session.flush();
  }

  async function binPages(ids: string[]) {
    const selected = ids.map(id => workspace.documents.find(document => document.id === id));
    if (selected.some(document => !document)) throw new Error("A selected page is no longer available. The Bin was not changed.");
    if (selected.some(document => document!.status === "published" || document!.status === "scheduled") && !context.session.exclusiveWritable) {
      throw new Error("The saving owner is unavailable, so published pages cannot be moved to the Bin yet.");
    }
    const transaction = moveFixtureDocumentsToBin(workspace, context.templates.store, ids, { protectedDocumentIds: [context.homeDocumentId] });
    if (!context.commitContent(() => ({ workspace: transaction.workspace, templates: transaction.templates }))) {
      throw new Error("The pages could not be moved to the Bin. Your current view was kept.");
    }
    if (ids.includes(selectedId)) {
      const home = workspace.documents.find(document => document.id === context.homeDocumentId);
      if (home) await onSelectPage(home);
    }
    await context.session.flush();
  }

  async function restorePages(binIds: string[]) {
    const transaction = restoreFixtureDocumentsFromBin(workspace, context.templates.store, binIds);
    if (!context.commitContent(() => ({ workspace: transaction.workspace, templates: transaction.templates }))) {
      throw new Error("The pages could not be restored. Your current view was kept.");
    }
    await context.session.flush();
  }

  function templateName(document: SiteContext["session"]["workspace"]["documents"][number]) {
    const assignment = context.templates.store.assignments.find(item => item.documentId === document.id);
    return assignment && context.templates.store.sets.find(set => set.id === assignment.setId)?.templates.find(item => item.id === assignment.templateId)?.name;
  }

  return <>
    <PagesCatalogue
      siteName={siteName}
      documents={workspace.documents}
      binned={workspace.bin}
      homeDocumentId={context.homeDocumentId}
      selectedId={selectedId}
      status={status}
      onStatusChange={onStatusChange}
      view={view}
      writable={context.session.writable}
      preferenceError={preferenceError}
      onViewChange={changeView}
      onAddPage={addPage}
      onSelect={onSelectPage}
      onEdit={onEditPage}
      onViewPage={document => {
        if (context.publicationFor(document.id).status === "published") onViewPublished(document);
        else onSelectPage(document);
      }}
      onRename={renamePage}
      onOrder={orderPage}
      onBin={binPages}
      onRestore={restorePages}
      resolveFeaturedImage={document => featuredImageUrl(document, context.siteId)}
      templateNameFor={templateName}
    />
  </>;
}
