"use client";

import { useEffect, useRef, useState } from "react";
import { NavigationOverview } from "../../site-editor/navigation-overview";
import { SiteNavigationEditor } from "../../site-navigation-editor";
import { createTemplateSet, emptyTemplateStore, type TemplateStore } from "../../template-model";
import type { TemplateStoreSession } from "../../template-workspace";
import { CheckboxControl } from "../../controls/checkbox-control";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import "../../templates.css";

function exampleStore() {
  const menu = createTemplateSet("Example");
  menu.id = "example-menu";
  menu.navigation = [{ id: "example-home", label: "Home", url: "#home" }, { id: "example-about", label: "About", url: "#about", children: [{ id: "example-team", label: "Team", url: "#team" }] }];
  return { ...emptyTemplateStore(), sets: [menu] };
}

/** Production presentation with an isolated, memory-only session adapter. */
export function NavigationSectionSpecimen() {
  const root = useRef<HTMLDivElement>(null);
  const [store, setStore] = useState(exampleStore);
  const current = useRef(store);
  const [past, setPast] = useState<TemplateStore[]>([]);
  const [future, setFuture] = useState<TemplateStore[]>([]);
  const [open, setOpen] = useState(false);
  const previousOpen = useRef(false);
  const [readOnly, setReadOnly] = useState(false);
  const [failSave, setFailSave] = useState(false);
  const leave = useRef<(() => Promise<boolean>) | null>(null);
  const history = useRef<(() => void) | null>(null);
  const [label, setLabel] = useState("Temporary example");
  const session: TemplateStoreSession = {
    store, ready: true, writable: !readOnly, exclusiveWritable: !readOnly, error: null, saveLabel: label,
    syncStatus: "synced", syncConflict: null, resolveSyncConflict: async () => {}, retryConnection: () => {},
    commit(update) { if (readOnly) return false; const previous = current.current; const next = update(previous); setPast(items => [...items, previous]); current.current = next; setStore(next); setFuture([]); setLabel("Unsaved changes"); return true; },
    undo() { if (readOnly || !past.length) return false; const previous = current.current; const next = past[past.length - 1]!; setFuture(items => [previous, ...items]); setPast(past.slice(0, -1)); current.current = next; setStore(next); setLabel("Unsaved changes"); return true; },
    redo() { if (readOnly || !future.length) return false; const previous = current.current; const next = future[0]!; setPast(items => [...items, previous]); setFuture(future.slice(1)); current.current = next; setStore(next); setLabel("Unsaved changes"); return true; },
    canUndo: !readOnly && past.length > 0, canRedo: !readOnly && future.length > 0,
  };
  useEffect(() => {
    if (previousOpen.current === open) return;
    previousOpen.current = open;
    root.current?.querySelector<HTMLButtonElement>(open ? '[aria-label="Close navigation editor"]' : '.site-navigation-overview-entry')?.focus();
  }, [open]);
  async function close() { if (!leave.current || await leave.current()) setOpen(false); }
  // The logical React boundary includes portalled menus; shortcuts preserve native field editing.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <div onKeyDown={event => handleStudioHistoryShortcut(event.nativeEvent, navigator.platform, () => { history.current?.(); session.undo(); }, () => { history.current?.(); session.redo(); })} className="site-editor-navigation-workspace" role="group" aria-label="Navigation section example" ref={root}>
    <p>All menu changes stay in this example. Use Reset example to restore it.</p>
    <CheckboxControl label="Read-only example" checked={readOnly} onChange={setReadOnly} />
    <CheckboxControl label="Simulate failed save" checked={failSave} onChange={setFailSave} />
    {open ? <SiteNavigationEditor ownerName="Example website" navigation={{ setId: "example-menu", partId: "example-header" }} templates={session} documents={[]} onSave={async () => { if (failSave) throw new Error("Example save failed. Your menu draft remains here."); setLabel("Saved in this example"); }} onClose={() => { void close(); }} closeTitle="Back to Navigation" prepareToLeaveRef={leave} historyChangeRef={history} /> : <NavigationOverview siteName="Example website" ready onOpen={() => setOpen(true)} />}
  </div>;
}
