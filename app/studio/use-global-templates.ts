"use client";
import { refreshWebsiteDesignStartup } from "./site-editor/website-design-startup-cache";
import { validateWebsiteDesign, type WebsiteDesign } from "./site-editor/website-design";
import { currentBrowserTemplateReferences } from "./browser-template-references";
import { installGlobalReferenceLibrary, protectGlobalReferenceRemoval, withTemplateReferenceWrite } from "./template-reference-gate";
import { useEffect, useRef, useState } from "react";
import { copyTemplateData, emptyTemplateStore, validateTemplateStore, type TemplateStore } from "./template-model";
import { studioWriteOwnership } from "./write-ownership";
import { createStudioSync, createStudioTransaction, type StudioSyncSession, type StudioSyncStatus, type StudioSyncConflict } from "./studio-sync";
import { globalTemplateChangeCanUndo, validateGlobalTemplateLibrary, type GlobalTemplateLibrary } from "./global-template-contract";
import type { useTestSite } from "./test-site/use-test-site";
import type { useTemplates } from "./use-templates";

export const GLOBAL_TEMPLATE_WAKE_CHANNEL = "acm-studio-global-template-editing-v1";
export const GLOBAL_TEMPLATE_WAKE_MESSAGE = { protocol: GLOBAL_TEMPLATE_WAKE_CHANNEL, kind: "open" } as const;

type GlobalSnapshot = { templates: TemplateStore; websiteDesignDefaults?: WebsiteDesign };
function validateGlobalSnapshot(value: unknown): GlobalSnapshot {
  const candidate = value as GlobalSnapshot;
  if (!candidate || typeof candidate !== "object" || Object.keys(candidate).some(key => !["templates", "websiteDesignDefaults"].includes(key))) throw new Error("Invalid global design snapshot.");
  return { templates: validateTemplateStore(candidate.templates), ...(candidate.websiteDesignDefaults ? { websiteDesignDefaults: validateWebsiteDesign(candidate.websiteDesignDefaults) } : {}) };
}
function sameTemplateDesign(before: GlobalSnapshot, after: GlobalSnapshot) {
  // Use the broker's semantic comparison: projection key order and timestamps
  // excluded from its transactions cannot turn an own receipt into a foreign edit.
  return createStudioTransaction(before, after, { transactionId: "comparison", clientId: "comparison", brokerEpoch: "comparison", baseRevision: 0 }).changes.length === 0;
}

/** Global originals have their own CAS revision; failed saves keep the complete local draft. */
/** Transport stays with the persistent broker; exclusive UI actions still require the same document’s writer lock. */
export function useGlobalTemplates(site: ReturnType<typeof useTestSite>, enabled: boolean, exclusive: boolean, readOnly = false, exclusiveActions = exclusive) {
  const [sourceEpoch, setSourceEpoch] = useState(0);
  const acknowledged = useRef<GlobalSnapshot | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [library, setLibrary] = useState<GlobalTemplateLibrary | null>(null);
  const [store, setStore] = useState<TemplateStore>(emptyTemplateStore);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("Loading global templates…");
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("connecting");
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  const sync = useRef<StudioSyncSession<GlobalSnapshot> | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const current = useRef<GlobalSnapshot>({ templates: store });
  const revision = useRef("");
  const readGeneration = useRef(0);
  const pending = useRef(false);
  const completion = useRef<Promise<void> | null>(null);
  const past = useRef<TemplateStore[]>([]);
  const future = useRef<TemplateStore[]>([]);
  const request = useRef(site.requestGlobalTemplates);
  useEffect(() => { request.current = site.requestGlobalTemplates; }, [site.requestGlobalTemplates]);
  const alive = useRef(true);
  const canInitialise = useRef(false);
  useEffect(() => { canInitialise.current = !readOnly && exclusive && site.canSaveGlobalTemplates; }, [readOnly, exclusive, site.canSaveGlobalTemplates]);
  useEffect(() => {
    if (!enabled || readOnly || typeof BroadcastChannel !== "function") return;
    const channel = new BroadcastChannel(GLOBAL_TEMPLATE_WAKE_CHANNEL);
    const announce = () => channel.postMessage(GLOBAL_TEMPLATE_WAKE_MESSAGE);
    announce();
    const timer = window.setInterval(announce, 2000);
    window.addEventListener("focus", announce);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", announce); channel.close(); };
  }, [enabled, readOnly]);
  async function load() {
    const generation = ++readGeneration.current;
    const response = await request.current({ action: "global-read", initialise: canInitialise.current });
    const next = validateGlobalTemplateLibrary(response.library);
    if (canInitialise.current) await studioWriteOwnership.write(async () => { refreshWebsiteDesignStartup(response); });
    if (typeof response.revision !== "string" || !/^[a-f0-9]{64}$/.test(response.revision)) throw new Error("Invalid global template revision.");
    if (!alive.current || pending.current || generation !== readGeneration.current) return;
    // A peer learns the gateway hash on its next read, after its transaction was
    // acknowledged. That unchanged saved design must retain its local Undo.
    if (revision.current !== response.revision && !sameTemplateDesign(current.current, validateGlobalSnapshot({ templates: next.templates, websiteDesignDefaults: next.websiteDesignDefaults }))) { setSourceEpoch(epoch => epoch + 1); past.current = []; future.current = []; setHistoryState({ undo: false, redo: false }); }
    installGlobalReferenceLibrary(next);
    acknowledged.current = validateGlobalSnapshot({ templates: next.templates, websiteDesignDefaults: next.websiteDesignDefaults });
    revision.current = response.revision; current.current = { templates: next.templates, ...(next.websiteDesignDefaults ? { websiteDesignDefaults: next.websiteDesignDefaults } : {}) };
    setLibrary(next); setStore(next.templates); setInitialised(response.initialised === true); setError(response.previewErrors?.length ? "Global templates initialised, but a local preview refresh failed. Reload originals, then save to refresh both previews." : null); setLabel(response.previewErrors?.length ? "Global templates initialised — preview refresh incomplete" : response.initialised === true ? "Global templates saved locally" : "Read-only originals — the owning Studio tab needs to reconnect");
  }
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    const refresh = () => {
      // A suspended peer may still hold a current source snapshot but have lost
      // its channel handshake. Reading that snapshot alone cannot reconnect it.
      if (sync.current && !sync.current.isPrimary() && sync.current.getStatus() !== "synced") sync.current.retryConnection();
      if (!pending.current) void load().catch(reason => { if (alive.current) { setError(reason instanceof Error ? reason.message : "Global templates could not be loaded."); setLabel("Global templates unavailable — draft preserved"); } });
    };
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
    const session = createStudioSync<GlobalSnapshot>({ scope: "global-template-library-v2", storeKey: "templates", initialSnapshot: current.current, role: primary ? "primary" : "peer", validateSnapshot: validateGlobalSnapshot,
      loadAuthoritative: () => current.current,
      persistPrimary: snapshot => studioWriteOwnership.write(() => withTemplateReferenceWrite(async () => {
        ++readGeneration.current;
        const browserReferences = currentBrowserTemplateReferences();
        protectGlobalReferenceRemoval(snapshot.templates);
        const designImages = snapshot.websiteDesignDefaults ? await (await import("./test-site/featured-images")).collectSiteImages(snapshot.websiteDesignDefaults, "global") : [];
        const result = await request.current({ action: "global-save", designImages, revision: revision.current, templates: snapshot.templates, websiteDesignDefaults: snapshot.websiteDesignDefaults, browserReferences });
        const saved = validateGlobalTemplateLibrary(result.library);
        refreshWebsiteDesignStartup(result);
        installGlobalReferenceLibrary(saved);
        ++readGeneration.current;
        revision.current = result.revision;
        if (!closed) { setLibrary(saved); setLabel(result.previewErrors?.length ? "Global templates saved — reconnect affected local previews" : "Global templates saved locally"); }
        if (result.previewErrors?.length) throw new Error("The global original was saved, but a local preview refresh failed. Reload global originals before retrying.");
      })),
      onCommittedSnapshot: (snapshot, commit) => {
        acknowledged.current = snapshot;
        const sameDesign = sameTemplateDesign(snapshot, current.current);
        const exactOwnAcknowledgement = Boolean(commit.acknowledgedTransaction) && sameDesign;
        // A transport timeout may reject the caller before its saved receipt
        // arrives. An exact receipt settles this draft without submitting again.
        if (exactOwnAcknowledgement) {
          pending.current = false; completion.current = null;
          setBusy(false); setError(null); setLabel("Global templates saved locally");
          setLibrary(previous => previous ? { ...previous, ...snapshot } : previous);
          current.current = snapshot; setStore(snapshot.templates);
        }
        // History contains complete designs. A foreign change or a merged
        // acknowledgement invalidates those old designs; Undo must not revert
        // another tab's properties. Exact own receipts retain local history.
        if (!exactOwnAcknowledgement && !sameDesign) {
          past.current = []; future.current = []; setHistoryState({ undo: false, redo: false });
        }
      },
      onSnapshot: snapshot => { if (!closed && !pending.current) { current.current = snapshot; setStore(snapshot.templates); setLibrary(previous => previous ? { ...previous, ...snapshot, websiteDesignDefaults: snapshot.websiteDesignDefaults } : previous); } },
      onStatus: status => { if (!closed) setSyncStatus(status); },
      onConflict: conflict => { if (!closed) { current.current = validateGlobalSnapshot(conflict.localSnapshot); setStore(current.current.templates); setSyncConflict(conflict); setError(conflict.reason); } },
    });
    sync.current = session;
    return () => { closed = true; session.close(); if (sync.current === session) sync.current = null; };
    // A canonical revision change does not restart the typed broker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, enabled, Boolean(library), initialised, exclusive, site.canSaveGlobalTemplates, sourceEpoch]);
  const writable = !readOnly && enabled && initialised && Boolean(library) && (exclusive && site.canSaveGlobalTemplates || syncStatus === "synced") && !busy && !error && !syncConflict;
  function installSnapshot(next: GlobalSnapshot, recordHistory?: () => void) {
    if (!writable || pending.current) return false;
    const checked = validateGlobalSnapshot({ ...next, templates: { ...next.templates, assignments: [] } });
    ++readGeneration.current; acknowledged.current = null; pending.current = true; setBusy(true); current.current = checked; setStore(checked.templates); setLibrary(previous => previous ? { ...previous, ...checked } : previous); setLabel("Saving global templates…");
    recordHistory?.();
    const session = sync.current;
    const saving = exclusive ? session?.commitPrimary(checked) : session?.submit(checked);
    if (!saving) { pending.current = false; setBusy(false); setError("The global template broker is unavailable. Your draft was preserved."); return false; }
    completion.current = saving;
    void saving.then(() => {
      if (!alive.current) return;
      pending.current = false; setBusy(false); setError(null); setLabel("Global templates saved locally");
      const saved = acknowledged.current ?? checked;
      setLibrary(previous => previous ? { ...previous, ...saved } : previous);
      current.current = saved; setStore(saved.templates);
    }).catch(reason => {
      if (!alive.current) return;
      setError(reason instanceof Error ? reason.message : "Global templates could not be saved. The draft was preserved."); setLabel("Global save paused — draft preserved"); setBusy(false);
    });
    return true;
  }
  const install = (templates: TemplateStore, recordHistory?: () => void) => installSnapshot({ ...current.current, templates }, recordHistory);
  const session: ReturnType<typeof useTemplates> = {
    store, ready: Boolean(library), writable, exclusiveWritable: writable && exclusiveActions && studioWriteOwnership.canWrite(), error,
    saveLabel: !error && !busy && library && initialised && !writable
      ? syncStatus === "disconnected" ? "Global template connection paused — reconnecting" : "Connecting global template saving…"
      : label,
    syncStatus, syncConflict,
    resolveSyncConflict: async choice => { await sync.current?.resolveConflict(choice); pending.current = false; setSyncConflict(null); setError(null); },
    retryConnection: () => { if (pending.current && !window.confirm("Reload global templates and discard this unsaved global draft?")) return; pending.current = false; void load().catch(reason => setError(String(reason))); },
    commit: (update, options) => { const before = current.current.templates; try { const next = update(copyTemplateData(before)); if (options?.skipUnchanged && JSON.stringify(next) === JSON.stringify(before)) return writable && !pending.current; return install(next, () => { past.current = globalTemplateChangeCanUndo(before, next) ? [...past.current, before] : []; future.current = []; setHistoryState({ undo: past.current.length > 0, redo: false }); }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Invalid global template change."); return false; } },
    undo: () => { const next = past.current.at(-1); return Boolean(next && install(next, () => { past.current.pop(); future.current.push(store); setHistoryState({ undo: past.current.length > 0, redo: true }); })); },
    redo: () => { const next = future.current.at(-1); return Boolean(next && install(next, () => { future.current.pop(); past.current.push(store); setHistoryState({ undo: true, redo: future.current.length > 0 }); })); },
    flush: async () => { const expected = current.current; if (completion.current) await completion.current; if (!sameTemplateDesign(current.current, expected)) throw new Error("Global templates changed while saving. Reload before continuing."); },
    canUndo: writable && historyState.undo, canRedo: writable && historyState.redo,
  };
  return { library, initialised, session, confirmedWebsiteDesign: () => acknowledged.current?.websiteDesignDefaults, reconnectSaving: () => sync.current?.retryConnection(), restoreLibrary: (value: GlobalTemplateLibrary) => { const checked = validateGlobalTemplateLibrary(value); return installSnapshot({ templates: checked.templates, websiteDesignDefaults: checked.websiteDesignDefaults }); }, saveDesign: (design: WebsiteDesign) => installSnapshot({ ...current.current, websiteDesignDefaults: validateWebsiteDesign(design) }) };
}
