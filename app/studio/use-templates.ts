"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { copyTemplateData, emptyTemplateStore, type TemplateStore } from "./template-model";
import { loadTemplates, saveTemplates } from "./template-store";
import { studioWriteOwnership } from "./write-ownership";
import { createStudioSync, type StudioSyncConflict, type StudioSyncSession, type StudioSyncStatus, type StudioSyncTransaction } from "./studio-sync";
import { reconcileStudioPendingSave, type StudioPendingSave } from "./studio-pending-save";
import { validateTemplateStore } from "./template-model";

/** The host owns the lock lifecycle; this hook only loads after each acquisition. */
export function useTemplates(generation: number, writable: boolean) {
  const [store, setStore] = useState<TemplateStore>(emptyTemplateStore);
  const current = useRef(store);
  const [ready, setReady] = useState(false);
  const [loadedGeneration, setLoadedGeneration] = useState<number | null>(null);
  const currentGeneration = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("Loading templates…");
  const history = useRef<TemplateStore[]>([]);
  const future = useRef<TemplateStore[]>([]);
  const syncRef = useRef<StudioSyncSession<TemplateStore> | null>(null);
  const authoritativeStoreRef = useRef(copyTemplateData(emptyTemplateStore()));
  const pendingPeerSaveRef = useRef<StudioPendingSave<TemplateStore> | null>(null);
  const pendingConflictRef = useRef<StudioSyncConflict | null>(null);
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("disconnected");
  const [syncSnapshotReady, setSyncSnapshotReady] = useState(false);
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  const [availability, setAvailability] = useState({ undo: false, redo: false });
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcilePendingPeerSave = useCallback((snapshot: TemplateStore, acknowledgedTransaction?: StudioSyncTransaction) => {
    const authoritative = copyTemplateData(snapshot);
    authoritativeStoreRef.current = authoritative;
    const reconciled = reconcileStudioPendingSave(pendingPeerSaveRef.current, authoritative, validateTemplateStore,
      "Templates conflict with your unsaved changes.", acknowledgedTransaction);
    pendingPeerSaveRef.current = reconciled.pending;
    if (reconciled.conflict) pendingConflictRef.current = reconciled.conflict;
    return { store: reconciled.snapshot, conflict: reconciled.conflict };
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const loaded = loadTemplates();
        const reconciled = pendingConflictRef.current
          ? { store: validateTemplateStore(pendingConflictRef.current.localSnapshot), conflict: pendingConflictRef.current }
          : reconcilePendingPeerSave(loaded);
        current.current = reconciled.store; currentGeneration.current = generation; setLoadedGeneration(generation); setStore(reconciled.store); setReady(true); setError(null); setSaveLabel("Templates ready"); history.current = []; future.current = []; setAvailability({ undo: false, redo: false });
      } catch (reason) { setReady(false); setError(reason instanceof Error ? reason.message : "Templates could not be loaded."); setSaveLabel("Templates need attention"); }
    });
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [generation, reconcilePendingPeerSave]);

  useEffect(() => {
    if (!ready || loadedGeneration !== generation) return;
    let closed = false;
    const primary = studioWriteOwnership.canWrite();
    const updateSyncStatus = (status: StudioSyncStatus) => {
      setSyncStatus(status);
      if (primary) return;
      if (status === "connecting") setSaveLabel("Connecting to another ACM Studio tab…");
      else if (status === "disconnected") setSaveLabel("Connection lost — template editing is paused");
      else if (status === "unsupported") setSaveLabel("Read-only: this browser cannot synchronise Studio tabs");
    };
    const session = createStudioSync<TemplateStore>({
      scope: "main-studio",
      storeKey: "templates",
      initialSnapshot: current.current,
      role: primary ? "primary" : "peer",
      validateSnapshot: (value) => validateTemplateStore(value),
      onCommittedSnapshot: (snapshot, { acknowledgedTransaction }) => {
        if (closed) return;
        if (pendingConflictRef.current) { authoritativeStoreRef.current = copyTemplateData(snapshot); return; }
        const reconciled = reconcilePendingPeerSave(snapshot, acknowledgedTransaction);
        if (reconciled.conflict) queueMicrotask(() => { if (!closed) syncRef.current?.resumeConflict(reconciled.conflict!); });
      },
      onSnapshot: (snapshot, source) => {
        if (closed || (pendingConflictRef.current && source !== "commit" && source !== "conflict")) return;
        const view = pendingPeerSaveRef.current?.snapshot ?? snapshot;
        current.current = view;
        setSyncSnapshotReady(true);
        setStore(view);
        if (!primary && (source === "welcome" || source === "update" || source === "commit")) setSaveLabel("Synced with another ACM Studio tab");
        if (source === "update" || source === "welcome" || source === "failover" || source === "recovery") {
          history.current = [];
          future.current = [];
          setAvailability({ undo: false, redo: false });
        }
      },
      onConflict: (conflict) => {
        if (closed) return;
        pendingConflictRef.current = conflict;
        const local = validateTemplateStore(conflict.localSnapshot);
        current.current = local;
        setStore(local);
        setSyncConflict(conflict);
        setError(conflict.reason);
        setSaveLabel("Resolve conflicting changes");
      },
      onStatus: updateSyncStatus,
      loadAuthoritative: () => loadTemplates(),
      persistPrimary: (snapshot) => saveTemplates(snapshot),
    });
    syncRef.current = session;
    updateSyncStatus(session.getStatus());
    if (pendingConflictRef.current) session.resumeConflict(pendingConflictRef.current);
    else if (primary && pendingPeerSaveRef.current) {
      const pendingSnapshot = copyTemplateData(pendingPeerSaveRef.current.snapshot);
      void session.commitPrimary(pendingSnapshot).then(() => {
        if (closed) return;
        setError(null); setSaveLabel("Saved locally");
      }).catch((reason) => {
        if (closed) return;
        setError(reason instanceof Error ? reason.message : "Could not save templates locally.");
        setSaveLabel("Could not save locally");
      });
    }
    return () => {
      closed = true;
      session.close();
      if (syncRef.current === session) syncRef.current = null;
      setSyncSnapshotReady(false);
      setSyncStatus("disconnected");
    };
  }, [ready, loadedGeneration, generation, reconcilePendingPeerSave]);

  const primaryWritable = studioWriteOwnership.canWrite();
  const peerWritable = !primaryWritable && syncStatus === "synced" && syncSnapshotReady;
  const editable = (primaryWritable || peerWritable) && !syncConflict;

  function install(next: TemplateStore) {
    if (!ready || loadedGeneration !== generation || currentGeneration.current !== generation || !writable || !editable) return false;
    const saveSequence = ++sequence.current;
    if (timer.current) clearTimeout(timer.current);
    try {
      const session = syncRef.current;
      let save: Promise<void> | undefined;
      if (primaryWritable) {
        if (syncRef.current?.isAvailable() && syncRef.current.isPrimary()) save = syncRef.current.commitPrimary(next);
        else { saveTemplates(next); save = Promise.resolve(); }
      } else {
        const pending = pendingPeerSaveRef.current;
        pendingPeerSaveRef.current = {
          base: pending ? copyTemplateData(pending.base) : copyTemplateData(authoritativeStoreRef.current),
          snapshot: copyTemplateData(next),
        };
        save = syncRef.current?.submit(next);
      }
      if (!save) throw new Error("Studio synchronisation is unavailable.");
      current.current = next; setStore(next); setError(null); setSaveLabel("Saving…");
      void save.then(() => {
        if (syncRef.current !== session || sequence.current !== saveSequence) return;
        timer.current = setTimeout(() => { if (sequence.current === saveSequence) setSaveLabel(primaryWritable ? "Saved locally" : "Synced with another ACM Studio tab"); }, 500);
      }).catch((reason) => {
        if (syncRef.current !== session || sequence.current !== saveSequence) return;
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        setError(reason instanceof Error ? reason.message : "Could not save templates locally.");
        setSaveLabel("Could not save locally");
      });
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save templates locally."); setSaveLabel("Could not save locally"); return false; }
  }
  function commit(update: (store: TemplateStore) => TemplateStore) {
    const before = current.current;
    try {
      const next = update(copyTemplateData(before));
      if (!install(next)) return false;
      history.current = [...history.current.slice(-59), before]; future.current = [];
      setAvailability({ undo: true, redo: false });
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The template change could not be applied."); setSaveLabel("Could not save locally"); return false; }
  }
  function undo() {
    const next = history.current.at(-1); if (!next) return false;
    const before = current.current;
    if (!install(next)) return false;
    history.current.pop(); future.current.push(before); setAvailability({ undo: history.current.length > 0, redo: true }); return true;
  }
  function redo() {
    const next = future.current.at(-1); if (!next) return false;
    const before = current.current;
    if (!install(next)) return false;
    future.current.pop(); history.current.push(before); setAvailability({ undo: true, redo: future.current.length > 0 }); return true;
  }
  async function resolveSyncConflict(choice: "mine" | "theirs") {
    const session = syncRef.current;
    if (!session) throw new Error("Studio synchronisation is unavailable.");
    const pendingPeerSave = pendingPeerSaveRef.current;
    pendingPeerSaveRef.current = null;
    try {
      await session.resolveConflict(choice);
      pendingConflictRef.current = null;
      setSyncConflict(null);
      setError(null);
      setSaveLabel(primaryWritable ? "Saved locally" : "Synced with another ACM Studio tab");
    } catch (reason) {
      pendingPeerSaveRef.current = pendingPeerSave;
      setError(reason instanceof Error ? reason.message : "The choice could not be saved. Your template changes remain available for another attempt.");
    }
  }
  return { store, ready: ready && loadedGeneration === generation, error, saveLabel, syncStatus, syncConflict, resolveSyncConflict, commit, undo, redo, canUndo: editable && availability.undo, canRedo: editable && availability.redo, writable: editable && ready && loadedGeneration === generation, exclusiveWritable: primaryWritable };
}
