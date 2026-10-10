"use client";
import { useEffect, useRef, useState } from "react";
import { copyTemplateData, emptyTemplateStore, validateTemplateStore, type TemplateStore } from "./template-model";
import { studioWriteOwnership } from "./write-ownership";
import { createStudioSync, type StudioSyncSession, type StudioSyncStatus, type StudioSyncConflict } from "./studio-sync";
import { validateGlobalTemplateLibrary, type GlobalTemplateLibrary } from "./global-template-contract";
import type { useTestSite } from "./test-site/use-test-site";
import type { useTemplates } from "./use-templates";

/** Global originals have their own CAS revision; failed saves keep the complete local draft. */
export function useGlobalTemplates(site: ReturnType<typeof useTestSite>, enabled: boolean, exclusive: boolean, readOnly = false) {
  const [sourceEpoch, setSourceEpoch] = useState(0);
  const acknowledged = useRef<TemplateStore | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [library, setLibrary] = useState<GlobalTemplateLibrary | null>(null);
  const [store, setStore] = useState<TemplateStore>(emptyTemplateStore);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("Loading global templates…");
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("connecting");
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  const sync = useRef<StudioSyncSession<TemplateStore> | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const current = useRef(store);
  const revision = useRef("");
  const readGeneration = useRef(0);
  const pending = useRef(false);
  const past = useRef<TemplateStore[]>([]);
  const future = useRef<TemplateStore[]>([]);
  const request = useRef(site.requestGlobalTemplates);
  useEffect(() => { request.current = site.requestGlobalTemplates; }, [site.requestGlobalTemplates]);
  const alive = useRef(true);
  const canInitialise = useRef(false);
  useEffect(() => { canInitialise.current = !readOnly && exclusive && site.canSaveGlobalTemplates; }, [readOnly, exclusive, site.canSaveGlobalTemplates]);
  async function load() {
    const generation = ++readGeneration.current;
    const response = await request.current({ action: "global-read", initialise: canInitialise.current });
    const next = validateGlobalTemplateLibrary(response.library);
    if (typeof response.revision !== "string" || !/^[a-f0-9]{64}$/.test(response.revision)) throw new Error("Invalid global template revision.");
    if (!alive.current || pending.current || generation !== readGeneration.current) return;
    if (revision.current !== response.revision) { setSourceEpoch(epoch => epoch + 1); past.current = []; future.current = []; setHistoryState({ undo: false, redo: false }); }
    revision.current = response.revision; current.current = next.templates;
    setLibrary(next); setStore(next.templates); setInitialised(response.initialised === true); setError(response.previewErrors?.length ? "Global templates initialised, but a local preview refresh failed. Reload originals, then save to refresh both previews." : null); setLabel(response.previewErrors?.length ? "Global templates initialised — preview refresh incomplete" : response.initialised === true ? "Global templates saved locally" : "Read-only originals — the owning Studio tab needs to reconnect");
  }
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    const refresh = () => { if (!pending.current) void load().catch(reason => { if (alive.current) { setError(reason instanceof Error ? reason.message : "Global templates could not be loaded."); setLabel("Global templates unavailable — draft preserved"); } }); };
    refresh();
    const protectDraft = (event: BeforeUnloadEvent) => { if (pending.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protectDraft);
    const interval = setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    return () => { alive.current = false; clearInterval(interval); window.removeEventListener("beforeunload", protectDraft); window.removeEventListener("focus", refresh); };
    // The connection function always comes from the current site session.
  }, [enabled, site.siteId]);
  useEffect(() => {
    if (readOnly || !enabled || !library || !initialised || exclusive && !site.canSaveGlobalTemplates) return;
    let closed = false;
    const primary = exclusive && site.canSaveGlobalTemplates;
    const session = createStudioSync<TemplateStore>({ scope: "global-template-library", storeKey: "templates", initialSnapshot: current.current, role: primary ? "primary" : "peer", validateSnapshot: validateTemplateStore,
      loadAuthoritative: () => current.current,
      persistPrimary: async templates => {
        ++readGeneration.current;
        const result = await studioWriteOwnership.write(() => request.current({ action: "global-save", revision: revision.current, templates }));
        const saved = validateGlobalTemplateLibrary(result.library);
        ++readGeneration.current;
        revision.current = result.revision;
        if (!closed) { setLibrary(saved); setLabel(result.previewErrors?.length ? "Global templates saved — reconnect affected local previews" : "Global templates saved locally"); }
        if (result.previewErrors?.length) throw new Error("The global original was saved, but a local preview refresh failed. Reload global originals before retrying.");
      },
      onCommittedSnapshot: snapshot => { acknowledged.current = snapshot; },
      onSnapshot: snapshot => { if (!closed && !pending.current) { current.current = snapshot; setStore(snapshot); } },
      onStatus: status => { if (!closed) setSyncStatus(status); },
      onConflict: conflict => { if (!closed) { current.current = validateTemplateStore(conflict.localSnapshot); setStore(current.current); setSyncConflict(conflict); setError(conflict.reason); } },
    });
    sync.current = session;
    return () => { closed = true; session.close(); if (sync.current === session) sync.current = null; };
    // A canonical revision change does not restart the typed broker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, enabled, Boolean(library), initialised, exclusive, site.canSaveGlobalTemplates, sourceEpoch]);
  const writable = !readOnly && enabled && initialised && Boolean(library) && (exclusive && site.canSaveGlobalTemplates || syncStatus === "synced") && !busy && !error && !syncConflict;
  function install(next: TemplateStore) {
    if (!writable || pending.current) return false;
    const checked = validateTemplateStore({ ...next, assignments: [], bin: [] });
    ++readGeneration.current; acknowledged.current = null; pending.current = true; setBusy(true); current.current = checked; setStore(checked); setLabel("Saving global templates…");
    const session = sync.current;
    const saving = exclusive ? session?.commitPrimary(checked) : session?.submit(checked);
    if (!saving) { pending.current = false; setBusy(false); setError("The global template broker is unavailable. Your draft was preserved."); return false; }
    void saving.then(() => {
      if (!alive.current) return;
      pending.current = false; setBusy(false); setError(null); setLabel("Global templates saved locally");
      const saved = acknowledged.current ?? checked;
      setLibrary(previous => previous ? { ...previous, templates: saved } : previous);
      current.current = saved; setStore(saved);
    }).catch(reason => {
      if (!alive.current) return;
      setError(reason instanceof Error ? reason.message : "Global templates could not be saved. The draft was preserved."); setLabel("Global save paused — draft preserved"); setBusy(false);
    });
    return true;
  }
  const session: ReturnType<typeof useTemplates> = {
    store, ready: Boolean(library), writable, exclusiveWritable: writable && exclusive, error, saveLabel: label, syncStatus, syncConflict,
    resolveSyncConflict: async choice => { await sync.current?.resolveConflict(choice); pending.current = false; setSyncConflict(null); setError(null); },
    retryConnection: () => { if (pending.current && !window.confirm("Reload global templates and discard this unsaved global draft?")) return; pending.current = false; void load().catch(reason => setError(String(reason))); },
    commit: update => { const before = current.current; try { if (!install(update(copyTemplateData(before)))) return false; past.current.push(before); future.current = []; setHistoryState({ undo: true, redo: false }); return true; } catch (reason) { setError(reason instanceof Error ? reason.message : "Invalid global template change."); return false; } },
    undo: () => { const next = past.current.at(-1); if (!next || !install(next)) return false; past.current.pop(); future.current.push(store); setHistoryState({ undo: past.current.length > 0, redo: true }); return true; },
    redo: () => { const next = future.current.at(-1); if (!next || !install(next)) return false; future.current.pop(); past.current.push(store); setHistoryState({ undo: true, redo: future.current.length > 0 }); return true; },
    canUndo: writable && historyState.undo, canRedo: writable && historyState.redo,
  };
  return { library, initialised, session };
}
