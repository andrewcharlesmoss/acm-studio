"use client";
import { useRef, useState, type MouseEvent } from "react";
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

export function useNavigationEditSelection(site: LocalFixtureSiteId | null) {
  const [editingSiteNavigation, setEditingSiteNavigation] = useState(false);
  const [navigationEditTarget, setNavigationEditTarget] = useState<NavigationEditTarget>(site ?? "drafts");
  return { editingSiteNavigation, setEditingSiteNavigation, navigationEditTarget, setNavigationEditTarget };
}

/** Menu editing borrows each owner's existing session; preview has no editing authority. */
export function useNavigationEditing({ target, onTargetChange, editing, onEditingChange, browserTemplates, globals, fixture, browserSession }: {
  target: NavigationEditTarget; onTargetChange: (target: NavigationEditTarget) => void;
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
  async function changeNavigationTarget(nextTarget: NavigationEditTarget) {
    if (nextTarget === target || !await prepareNavigationLeave(false)) return;
    setNavigationFeedback(null); onTargetChange(nextTarget);
  }
  const navigationControls = <NavigationEditControls target={target} busy={navigationBusy} editing={editing} onChange={target => { void changeNavigationTarget(target); }} onEdit={() => { setNavigationFeedback(null); onEditingChange(true); }} />;
  const navigationEditor = editing ? <SiteNavigationEditor key={target} ownerName={navigationTargetName(target)} siteId={target === "drafts" ? undefined : target}
    targetControls={navigationControls} prepareToLeaveRef={navigationLeaveRef} historyChangeRef={navigationHistoryChangeRef} navigation={navigationReference ?? { setId: "unavailable", partId: "unavailable" }} templates={navigationTemplates} documents={navigationDocuments}
    onSave={async () => { if (target === "drafts") { if (!browserTemplates.flush) throw new Error("Studio Drafts saving is unavailable."); await browserTemplates.flush(); } else await fixture.flush(); }} onClose={closeNavigation} /> : undefined;
  function guardNavigationLink(event: MouseEvent) {
    if (!editing || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a.studio-brand, a.library-tool-button, .library-footer a");
    if (!link || link.target === "_blank") return;
    event.preventDefault(); event.stopPropagation();
    void afterNavigation(() => window.location.assign(link.href));
  }
  function canLeaveViaHistory() {
    if (!editing) return true;
    setNavigationFeedback("Close navigation editing before using browser Back or Forward. Your menu remains here."); return false;
  }
  return { guardNavigationLink, canLeaveViaHistory, controls: navigationControls, editor: navigationEditor, feedback: navigationFeedback, prepareLeave: prepareNavigationLeave, afterNavigation,
    templates: { ...navigationTemplates, undo: () => { navigationHistoryChangeRef.current?.(); return navigationTemplates.undo(); }, redo: () => { navigationHistoryChangeRef.current?.(); return navigationTemplates.redo(); } } };
}
