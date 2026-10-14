"use client";

import { useEffect, useLayoutEffect, useCallback, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { StudioButton } from "./controls/button";
import { StudioIcon } from "./studio-icons";
import { NavigationMenuList } from "./template-navigation-editor";
import { PageLinkInspector } from "./page-link-inspector";
import { Pane, PaneWorkspace } from "./panes/pane-components";
import { testDocumentHref, type SiteNavigationReference } from "./test-site/contract";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import type { StudioDocument } from "./editor-model";
import type { TemplateStoreSession } from "./template-workspace";
import type { SiteLink } from "./template-model";

/** Site content uses the site's existing history, ownership and saving adapter. */
export function SiteNavigationEditor({ siteId, ownerName, targetControls, prepareToLeaveRef, historyChangeRef, navigation, templates, documents, onSave, onClose }: {
  siteId?: LocalFixtureSiteId; ownerName?: string; targetControls?: ReactNode; prepareToLeaveRef?: MutableRefObject<(() => Promise<boolean>) | null>; historyChangeRef?: MutableRefObject<(() => void) | null>; navigation: SiteNavigationReference; templates: TemplateStoreSession;
  documents: StudioDocument[]; onSave: () => Promise<unknown>; onClose: () => void;
}) {
  const name = ownerName ?? (siteId ? localFixtureName(siteId) : "Studio Drafts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMenu, setSavedMenu] = useState<string | null>(null);
  const [detailsWidth, setDetailsWidth] = useState(300);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const rejectedField = useRef(false);
  const ownedChanges = useRef(false);
  const set = templates.store.sets.find(item => item.id === navigation.setId);
  const links = set?.navigation ?? [];
  const menuRevision = JSON.stringify(links);
  const committedMenu = useRef(menuRevision);
  useEffect(() => { committedMenu.current = menuRevision; }, [menuRevision]);
  const confirmedSaved = savedMenu === menuRevision && !templates.error && !["Unsaved changes", "Saving…"].includes(templates.saveLabel);
  const writable = templates.writable && Boolean(set) && !saving;
  const settleFields = useCallback(() => {
    if (document.querySelector("dialog[open], [role='dialog'], [role='menu']")) { setError("Apply or close the open menu before leaving or saving navigation."); return false; }
    // Inline fields commit on blur; link popovers retain their explicit Apply.
    const field = document.activeElement;
    if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.closest(".site-navigation-details")) flushSync(() => field.blur());
    return !rejectedField.current && !document.querySelector(".site-navigation-details [role='alert']");
  }, []);
  const save = useCallback(async () => {
    if (!settleFields()) return false;
    if (!writable) { setError("Saving is unavailable. Your menu draft remains here."); return false; }
    const savingMenu = committedMenu.current;
    setSavedMenu(null);
    setSaving(true);
    try { await onSave(); setError(null); setSavedMenu(savingMenu); ownedChanges.current = false; return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The menu could not be saved. Your draft is preserved."); return false; }
    finally { setSaving(false); }
  }, [writable, onSave, settleFields]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);
  useLayoutEffect(() => {
    if (!historyChangeRef) return;
    const mark = () => { ownedChanges.current = true; };
    historyChangeRef.current = mark;
    return () => { if (historyChangeRef.current === mark) historyChangeRef.current = null; };
  }, [historyChangeRef]);
  useLayoutEffect(() => {
    if (!prepareToLeaveRef) return;
    const prepare = () => {
      if (!settleFields()) return Promise.resolve(false);
      return (!templates.writable || !set) && !ownedChanges.current ? Promise.resolve(true) : save();
    };
    prepareToLeaveRef.current = prepare;
    return () => { if (prepareToLeaveRef.current === prepare) prepareToLeaveRef.current = null; };
  }, [prepareToLeaveRef, templates.writable, templates.error, set, save, settleFields]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || document.querySelector("dialog[open], [role='dialog'], [role='menu']")) return;
      event.preventDefault(); onClose();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose]);
  function changeLinks(next: SiteLink[]) {
    setSavedMenu(null);
    if (!writable) { rejectedField.current = true; return false; }
    try {
      const accepted = templates.commit(store => {
        const current = store.sets.find(item => item.id === navigation.setId);
        if (!current || JSON.stringify(current.navigation) !== JSON.stringify(links)) throw new Error("The menu changed. Reopen the action to edit its latest version.");
        return { ...store, sets: store.sets.map(item => item.id === current.id ? { ...item, navigation: next } : item) };
      });
      setError(accepted ? null : "Editing is unavailable. Your current menu has been preserved.");
      rejectedField.current = !accepted;
      if (accepted) { committedMenu.current = JSON.stringify(next); ownedChanges.current = true; }
      return accepted;
    } catch (failure) { rejectedField.current = true; setError(failure instanceof Error ? failure.message : "The menu could not be changed."); return false; }
  }
  const props = { links, selectedId, writable, suggestions: documents.map(document => ({ id: document.id, title: document.title, href: siteId ? testDocumentHref(document.id) : document.kind === "page" ? `/${document.slug}` : `/writing/${document.publishedSlug ?? document.slug}` })), onSelect: setSelectedId, onChange: changeLinks };
  return <section className="site-navigation-workspace" aria-label={`${name} navigation editor`}>
    <header><div><h1>{name} navigation</h1><p>Menu items belong to {name}. Colours and alignment come from the global Navigation template.</p>{targetControls}</div><button type="button" disabled={saving} aria-label="Close navigation editor" title="Back to Templates" onClick={onClose}><StudioIcon name="close" size={20} /></button></header>
    {!set ? <p role="status">{templates.error ?? `Loading ${name} navigation…`}</p> : null}
    <div className="site-navigation-actions"><button type="button" disabled={!templates.canUndo || saving} onClick={() => { ownedChanges.current = true; templates.undo(); }}><StudioIcon name="undo" />Undo</button><button type="button" disabled={!templates.canRedo || saving} onClick={() => { ownedChanges.current = true; templates.redo(); }}><StudioIcon name="redo" />Redo</button><span role="status">{saving ? "Saving navigation…" : confirmedSaved ? "Navigation saved locally" : templates.saveLabel}</span><StudioButton disabled={!writable} title="Save (⌘S / Ctrl+S)" onClick={() => void save()}>{saving ? "Saving…" : confirmedSaved ? "Saved" : "Save"}</StudioButton></div>
    {templates.syncConflict ? <div role="alert"><p>Another tab changed this menu. Choose which links to keep before leaving.</p><button type="button" onClick={() => void templates.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void templates.resolveSyncConflict("mine")}>Use My Change</button></div> : null}
    {error || templates.error ? <p role="alert">{error ?? templates.error} <button type="button" onClick={templates.retryConnection}>Reconnect</button></p> : null}
    <div className="site-navigation-pane-frame" onChangeCapture={() => { ownedChanges.current = true; setSavedMenu(null); rejectedField.current = false; }}>
      <PaneWorkspace className="site-navigation-columns" centreClassName="site-navigation-menu" label="Site navigation workspace"
        right={<Pane label="Navigation link details" side="right" width={detailsWidth} onWidthChange={setDetailsWidth} minWidth={270} maxWidth={480}
          collapsed={detailsCollapsed} onCollapsedChange={setDetailsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
          className="site-navigation-details" bodyClassName="site-navigation-details-body">
          {selectedId ? <PageLinkInspector key={selectedId} {...props} siteId={siteId} contentOnly /> : <p>Select a link to edit its text and destination. Use its options menu to move or delete it.</p>}
        </Pane>}>
        <div data-inspector-popover-owner><h2>Menu items</h2><NavigationMenuList {...props} /></div>
      </PaneWorkspace>
    </div>
  </section>;
}
