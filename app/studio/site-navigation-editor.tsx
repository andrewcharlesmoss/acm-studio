"use client";

import { useEffect, useCallback, useRef, useState } from "react";
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
export function SiteNavigationEditor({ siteId, navigation, templates, documents, onSave, onClose }: {
  siteId: LocalFixtureSiteId; navigation: SiteNavigationReference; templates: TemplateStoreSession;
  documents: StudioDocument[]; onSave: () => Promise<unknown>; onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMenu, setSavedMenu] = useState<string | null>(null);
  const [detailsWidth, setDetailsWidth] = useState(300);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const rejectedField = useRef(false);
  const set = templates.store.sets.find(item => item.id === navigation.setId);
  const links = set?.navigation ?? [];
  const menuRevision = JSON.stringify(links);
  const committedMenu = useRef(menuRevision);
  useEffect(() => { committedMenu.current = menuRevision; }, [menuRevision]);
  const confirmedSaved = savedMenu === menuRevision && !templates.error && !["Unsaved changes", "Saving…"].includes(templates.saveLabel);
  const writable = templates.writable && Boolean(set) && !saving;
  const save = useCallback(async () => {
    if (!writable) return;
    // Inline inspector fields commit on blur; settle them before flushing.
    // Portalled link popovers retain their own explicit Apply transaction.
    const field = document.activeElement;
    if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.closest(".site-navigation-details")) flushSync(() => field.blur());
    if (rejectedField.current || document.querySelector(".site-navigation-details [role='alert']")) return;
    const savingMenu = committedMenu.current;
    setSavedMenu(null);
    setSaving(true);
    try { await onSave(); setError(null); setSavedMenu(savingMenu); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The menu could not be saved. Your draft is preserved."); }
    finally { setSaving(false); }
  }, [writable, onSave]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);
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
      if (accepted) committedMenu.current = JSON.stringify(next);
      return accepted;
    } catch (failure) { rejectedField.current = true; setError(failure instanceof Error ? failure.message : "The menu could not be changed."); return false; }
  }
  const props = { links, selectedId, writable, suggestions: documents.map(document => ({ id: document.id, title: document.title, href: testDocumentHref(document.id) })), onSelect: setSelectedId, onChange: changeLinks };
  return <section className="site-navigation-workspace" aria-label={`${localFixtureName(siteId)} navigation editor`}>
    <header><div><h1>{localFixtureName(siteId)} navigation</h1><p>Menu items belong to {localFixtureName(siteId)}. Colours and alignment come from the global Navigation template.</p></div><button type="button" aria-label="Close navigation editor" title="Back to Templates" onClick={onClose}><StudioIcon name="close" size={20} /></button></header>
    <div className="site-navigation-actions"><button type="button" disabled={!templates.canUndo || saving} onClick={templates.undo}><StudioIcon name="undo" />Undo</button><button type="button" disabled={!templates.canRedo || saving} onClick={templates.redo}><StudioIcon name="redo" />Redo</button><span role="status">{saving ? "Saving navigation…" : confirmedSaved ? "Navigation saved locally" : templates.saveLabel}</span><StudioButton disabled={!writable} title="Save (⌘S / Ctrl+S)" onClick={() => void save()}>{saving ? "Saving…" : confirmedSaved ? "Saved" : "Save"}</StudioButton></div>
    {error || templates.error ? <p role="alert">{error ?? templates.error}</p> : null}
    <div className="site-navigation-pane-frame" onChangeCapture={() => { setSavedMenu(null); rejectedField.current = false; }}>
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
