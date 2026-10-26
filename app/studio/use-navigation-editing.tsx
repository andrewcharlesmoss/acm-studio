"use client";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import type { SiteLink } from "./template-model";
import { copyTemplateData } from "./template-model";
import { draftGlobalTemplates } from "./draft-global-templates";
import { draftNavigationReference, retainDraftNavigation } from "./draft-navigation";
import { NavigationEditControls, navigationTargetName, type NavigationEditTarget } from "./navigation-edit-target";
import { SiteNavigationEditor } from "./site-navigation-editor";
import type { useTemplates } from "./use-templates";
import type { useGlobalTemplates } from "./use-global-templates";
import type { useTestSite } from "./test-site/use-test-site";
import { useTestSiteContext } from "./test-site/use-test-site-context";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { LocalFixtureSiteId } from "./test-site/sites";
export type { NavigationEditTarget } from "./navigation-edit-target";

export type SiteNavigationPaneAdapter = {
  links: SiteLink[]; writable: boolean; ownerName: string; saveLabel: string;
  menus: import("./test-site/contract").SiteNavigationMenu[]; defaultMenuId: string; assignments: import("./test-site/contract").SiteNavigationAssignment[];
  reviewPending: boolean; reviewSave: () => Promise<void>;
  change: (links: SiteLink[]) => boolean;
  linksFor: (navigationId: string) => SiteLink[];
  changeForNavigation: (navigationId: string, links: SiteLink[]) => boolean;
  assign: (navigationId: string, menuId: string) => boolean;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
};

export function useNavigationEditSelection(site: LocalFixtureSiteId | null) {
  const [editingSiteNavigation, setEditingSiteNavigation] = useState(false);
  const navigationEditTarget: NavigationEditTarget = site ?? "drafts";
  return { editingSiteNavigation, setEditingSiteNavigation, navigationEditTarget };
}

/** Menu editing borrows each owner's existing session; preview has no editing authority. */
export function useNavigationEditing({ target, editing, onEditingChange, browserTemplates, globals, fixture, browserSession }: {
  target: NavigationEditTarget;
  editing: boolean; onEditingChange: (editing: boolean) => void;
  browserTemplates: ReturnType<typeof useTemplates>; globals: ReturnType<typeof useGlobalTemplates>;
  fixture: ReturnType<typeof useTestSite>; browserSession: ReturnType<typeof useStudioWorkspace>;
}) {
  const context = useTestSiteContext(fixture, browserSession, undefined, globals.library, globals.initialised);
  const documents = browserSession.workspace.documents;
  const navigationLeaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const navigationHistoryChangeRef = useRef<(() => void) | null>(null);
  const navigationTransition = useRef(false);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
  let draftNavigationError: string | null = null;
  let draftNavigationStore = browserTemplates.store;
  let draftNavigation: ReturnType<typeof draftNavigationReference> | undefined;
  if (globals.library && browserTemplates.ready) {
    try {
      draftNavigationStore = draftGlobalTemplates(browserTemplates.store, globals.library);
      draftNavigation = draftNavigationReference(browserTemplates.store, globals.library);
    } catch (reason) { draftNavigationError = reason instanceof Error ? reason.message : "Studio Drafts navigation is unavailable."; }
  }
  const draftNavigationSession = {
    ...browserTemplates, store: draftNavigationStore,
    writable: browserTemplates.writable && globals.initialised && Boolean(draftNavigation) && !draftNavigationError,
    error: browserTemplates.error ?? draftNavigationError,
    commit: (update: (store: typeof draftNavigationStore) => typeof draftNavigationStore) => {
      if (!globals.library || !globals.initialised || draftNavigationError) return false;
      const library = globals.library;
      return browserTemplates.commit(source => retainDraftNavigation(source, update(copyTemplateData(draftGlobalTemplates(source, library))), library));
    },
  };
  const navigationTemplates = target === "drafts" ? draftNavigationSession : context.templates;
  const navigationReference = target === "drafts" ? draftNavigation : context.siteNavigation;
  const navigationDocuments = target === "drafts" ? documents : context.session.workspace.documents;
  const paneAuthority = useRef({ target, setId: navigationReference?.setId, partId: navigationReference?.partId });
  useLayoutEffect(() => { paneAuthority.current = { target, setId: navigationReference?.setId, partId: navigationReference?.partId }; }, [target, navigationReference?.setId, navigationReference?.partId]);
  const paneSet = navigationTemplates.store.sets.find(item => item.id === navigationReference?.setId);
  const paneLinks = paneSet?.navigation ?? [];
  // This adapter carries authority from the active fixture owner, never from a
  // preview choice or the global template's transient site projection.
  const pane: SiteNavigationPaneAdapter | undefined = target === "drafts" ? undefined : {
    links: paneLinks, writable: navigationTemplates.writable && Boolean(paneSet),
    ownerName: navigationTargetName(target), saveLabel: navigationTemplates.saveLabel,
    menus: context.collection?.navigationMenus ?? [], defaultMenuId: context.collection?.defaultNavigationMenuId ?? "",
    assignments: context.collection?.navigationAssignments ?? [],
    reviewPending: context.navigationReviewPending, reviewSave: async () => { await context.session.flush(); context.finishNavigationReview(); },
    undo: navigationTemplates.undo, redo: navigationTemplates.redo,
    canUndo: navigationTemplates.canUndo, canRedo: navigationTemplates.canRedo,
    change(next) {
      if (!navigationTemplates.writable || !paneSet || paneAuthority.current.target !== target
        || paneAuthority.current.setId !== paneSet.id || paneAuthority.current.partId !== navigationReference?.partId) return false;
      try {
        const accepted = navigationTemplates.commit(store => {
          const current = store.sets.find(item => item.id === paneSet.id);
          if (!current || JSON.stringify(current.navigation) !== JSON.stringify(paneLinks)) throw new Error("The menu changed. Reopen the action to edit its latest version.");
          return { ...store, sets: store.sets.map(item => item.id === current.id ? { ...item, navigation: next } : item) };
        });
        setNavigationFeedback(accepted ? null : "Editing is unavailable. Your current menu has been preserved.");
        return accepted;
      } catch (failure) { setNavigationFeedback(failure instanceof Error ? failure.message : "The menu could not be changed."); return false; }
    },
    assign(navigationId, menuId) {
      return context.commitNavigationMenus(current => {
        if (!current.menus.some(menu => menu.id === menuId)) throw new Error("The selected navigation menu is unavailable.");
        return { ...current, assignments: [...current.assignments.filter(item => item.navigationId !== navigationId), ...(menuId === current.defaultMenuId ? [] : [{ navigationId, menuId }])] };
      });
    },
    linksFor(navigationId) {
      const menuId = context.collection?.navigationAssignments.find(item => item.navigationId === navigationId)?.menuId ?? context.collection?.defaultNavigationMenuId;
      return context.collection?.navigationMenus.find(menu => menu.id === menuId)?.links ?? paneLinks;
    },
    changeForNavigation(navigationId, links) {
      const menuId = context.collection?.navigationAssignments.find(item => item.navigationId === navigationId)?.menuId ?? context.collection?.defaultNavigationMenuId;
      if (!menuId) return false;
      return context.commitNavigationMenus(current => ({ ...current, menus: current.menus.map(menu => menu.id === menuId ? { ...menu, links } : menu) }));
    },
  };
  async function prepareNavigationLeave(close = true) {
    if (!editing) return true;
    if (navigationTransition.current) return false;
    navigationTransition.current = true; setNavigationBusy(true);
    try {
      if (navigationLeaveRef.current && !await navigationLeaveRef.current()) return false;
      setNavigationFeedback(null);
      if (close) onEditingChange(false);
      return true;
    } catch (reason) { setNavigationFeedback(reason instanceof Error ? reason.message : "Navigation could not be saved. Your draft was kept."); return false; }
    finally { navigationTransition.current = false; setNavigationBusy(false); }
  }
  function afterNavigation(action: () => void) {
    if (!editing) { action(); return true; }
    return prepareNavigationLeave().then(accepted => { if (accepted) action(); return accepted; });
  }
  function closeNavigation() {
    void prepareNavigationLeave().then(accepted => { if (accepted) requestAnimationFrame(() => document.getElementById("studio-edit-site-navigation")?.focus()); });
  }
  const navigationControls = <NavigationEditControls target={target} busy={navigationBusy} editing={editing} onEdit={() => { setNavigationFeedback(null); onEditingChange(true); }} />;
  const navigationEditor = editing ? <SiteNavigationEditor key={target} ownerName={navigationTargetName(target)} siteId={target === "drafts" ? undefined : target}
    targetControls={navigationControls} prepareToLeaveRef={navigationLeaveRef} historyChangeRef={navigationHistoryChangeRef} navigation={navigationReference ?? { setId: "unavailable", partId: "unavailable" }} templates={navigationTemplates} documents={navigationDocuments}
    onSave={async () => { if (target === "drafts") { if (!browserTemplates.flush) throw new Error("Studio Drafts saving is unavailable."); await browserTemplates.flush(); } else await fixture.flush(); }} onClose={closeNavigation} /> : undefined;
  function guardNavigationLink(event: MouseEvent) {
    if (!editing || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a.studio-app-brand, a.library-tool-button, .library-footer a");
    if (!link || link.target === "_blank") return;
    event.preventDefault(); event.stopPropagation();
    void afterNavigation(() => window.location.assign(link.href));
  }
  function canLeaveViaHistory() {
    if (!editing) return true;
    setNavigationFeedback("Close navigation editing before using browser Back or Forward. Your menu remains here."); return false;
  }
  return { pane, guardNavigationLink, canLeaveViaHistory, controls: navigationControls, editor: navigationEditor, feedback: navigationFeedback, prepareLeave: prepareNavigationLeave, afterNavigation,
    templates: { ...navigationTemplates, undo: () => { navigationHistoryChangeRef.current?.(); return navigationTemplates.undo(); }, redo: () => { navigationHistoryChangeRef.current?.(); return navigationTemplates.redo(); } } };
}
