"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cloneWorkspace, initialStudioWorkspace, type StudioDocument, type StudioWorkspace } from "./editor-model";
import { validateStudioWorkspace } from "./workspace-validation";
import { commitHistory, redoHistory, undoHistory } from "./studio-command-operations.mjs";
import { browserWorkspaceRepository, type WorkspaceRepository } from "./workspace-repository";

import { studioWriteOwnership, ownershipMessage, type OwnershipState, type StudioWriteOwnership } from "./write-ownership";
import { createStudioSync, type StudioSyncConflict, type StudioSyncSession, type StudioSyncStatus, type StudioSyncTransaction } from "./studio-sync";
import { reconcileStudioPendingSave, type StudioPendingSave } from "./studio-pending-save";

const MAX_HISTORY = 60;

export function useStudioWorkspace(repository: WorkspaceRepository = browserWorkspaceRepository, ownership: StudioWriteOwnership = studioWriteOwnership, initialWorkspace: StudioWorkspace = initialStudioWorkspace, scope = "main-studio", validateSnapshot: (value: unknown) => StudioWorkspace = validateStudioWorkspace) {
  const [workspace, setWorkspace] = useState<StudioWorkspace>(() => cloneWorkspace(initialWorkspace));
  const [ready, setReady] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Preparing local workspace…");
  const [loadedRepository, setLoadedRepository] = useState<WorkspaceRepository | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ownershipState, setOwnershipState] = useState<OwnershipState>(ownership.getState());
  const [ownershipGeneration, setOwnershipGeneration] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef<symbol | null>(null);
  const [loadedToken, setLoadedToken] = useState<symbol | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({ undo: false, redo: false });
  const historyRef = useRef<StudioWorkspace[]>([]);
  const futureRef = useRef<StudioWorkspace[]>([]);
  const initialLoadRef = useRef(false);
  const workspaceRef = useRef(workspace);
  const syncRef = useRef<StudioSyncSession<StudioWorkspace> | null>(null);
  const pendingConflictRef = useRef<StudioSyncConflict | null>(null);
  const authoritativeWorkspaceRef = useRef(cloneWorkspace(initialWorkspace));
  const pendingPeerSaveRef = useRef<StudioPendingSave<StudioWorkspace> | null>(null);
  const lastPersistedWorkspaceRef = useRef<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("disconnected");
  const [syncSnapshotReady, setSyncSnapshotReady] = useState(false);
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  const [syncResolutionError, setSyncResolutionError] = useState<string | null>(null);
  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);

  const reconcilePendingPeerSave = useCallback((snapshot: StudioWorkspace, acknowledgedTransaction?: StudioSyncTransaction) => {
    const authoritative = cloneWorkspace(snapshot);
    authoritativeWorkspaceRef.current = authoritative;
    const reconciled = reconcileStudioPendingSave(pendingPeerSaveRef.current, authoritative, validateSnapshot,
      "Studio changes conflict with your unsaved content.", acknowledgedTransaction);
    pendingPeerSaveRef.current = reconciled.pending;
    if (reconciled.conflict) pendingConflictRef.current = reconciled.conflict;
    return { workspace: reconciled.snapshot, conflict: reconciled.conflict };
  }, [validateSnapshot]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = ownership.subscribe(() => {
      if (!cancelled) setOwnershipState(ownership.getState());
    });
    // Browsing remains available in a losing tab, but only the lock owner
    // installs a snapshot that may subsequently be persisted.
    const load = (token: symbol | null) => {
      let savedWorkspace: StudioWorkspace | null = null;
      let failed = false;
      try { savedWorkspace = repository.load(); } catch { failed = true; }
      const message = failed
        ? "Saved workspace could not be loaded. Original data has not been replaced. Changes are not being saved; restore a valid backup to continue."
        : "Local workspace ready";
      queueMicrotask(() => {
        if (cancelled || (token && tokenRef.current !== token)) return;
        const loaded = savedWorkspace ?? cloneWorkspace(initialWorkspace);
        const reconciled = pendingConflictRef.current
          ? { workspace: validateSnapshot(pendingConflictRef.current.localSnapshot), conflict: pendingConflictRef.current }
          : reconcilePendingPeerSave(loaded);
        workspaceRef.current = reconciled.workspace;
        setWorkspace(reconciled.workspace);
        historyRef.current = [];
        futureRef.current = [];
        setHistoryAvailability({ undo: false, redo: false });
        setLoadedRepository(failed || !token ? null : repository);
        setLoadedToken(token);
        if (token) setOwnershipGeneration((generation) => generation + 1);
        setLoadError(failed ? message : null);
        setSaveError(null);
        setSaveLabel(message);
        setReady(true);
        if (token) ownership.loaded(token, !failed);
      });
    };
    // A retry only re-attempts the writer lock. Do not reload the browsing
    // snapshot on every attempt: a peer tab may be editing through the sync
    // channel while it waits to become the persistence owner.
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      load(null);
    }
    const release = ownership.acquire((token) => {
      tokenRef.current = token;
      load(token);
    });
    return () => {
      cancelled = true;
      tokenRef.current = null;
      unsubscribe();
      release();
    };
  }, [repository, ownership, attempt, initialWorkspace, validateSnapshot, reconcilePendingPeerSave]);

  useEffect(() => {
    if (ownershipState !== "waiting") return;
    // Web Locks with ifAvailable do not wake a waiting tab when the current
    // owner closes. Polling only retries acquisition; it never writes without
    // the lock and therefore preserves the no-unlocked-fallback rule.
    const retryTimer = setInterval(() => {
      if (ownership.getState() === "waiting") setAttempt((value) => value + 1);
    }, 1000);
    return () => clearInterval(retryTimer);
  }, [ownership, ownershipState]);

  useEffect(() => {
    if (!ready || loadError || ownershipState === "loading" || !["writable", "waiting"].includes(ownershipState)) return;
    let closed = false;
    const primary = ownership.canWrite(loadedToken);
    const session = createStudioSync<StudioWorkspace>({
      scope,
      storeKey: "workspace",
      initialSnapshot: workspaceRef.current,
      role: primary ? "primary" : "peer",
      validateSnapshot,
      cloneSnapshot: cloneWorkspace,
      loadAuthoritative: () => repository.load() ?? cloneWorkspace(initialWorkspace),
      onCommittedSnapshot: (snapshot, { source, acknowledgedTransaction }) => {
        if (closed) return;
        let snapshotWasPersisted = !primary || source !== "failover";
        if (primary && source === "failover") {
          try { snapshotWasPersisted = repository.load() !== null; }
          catch { snapshotWasPersisted = false; }
        }
        if (snapshotWasPersisted) lastPersistedWorkspaceRef.current = JSON.stringify({ ...cloneWorkspace(snapshot), activeDocumentId: workspaceRef.current.activeDocumentId });
        if (pendingConflictRef.current) { authoritativeWorkspaceRef.current = cloneWorkspace(snapshot); return; }
        const reconciled = reconcilePendingPeerSave(snapshot, acknowledgedTransaction);
        if (reconciled.conflict) queueMicrotask(() => { if (!closed) syncRef.current?.resumeConflict(reconciled.conflict!); });
      },
      onSnapshot: (snapshot, source) => {
        if (closed || (pendingConflictRef.current && source !== "commit" && source !== "conflict")) return;
        // Display updates may contain optimistic edits. Only the committed
        // callback above may advance the saved or handover baseline.
        const view = pendingPeerSaveRef.current?.snapshot ?? snapshot;
        const activeDocumentId = view.documents.some(document => document.id === workspaceRef.current.activeDocumentId)
          ? workspaceRef.current.activeDocumentId : view.activeDocumentId;
        const displayed = { ...cloneWorkspace(view), activeDocumentId };
        workspaceRef.current = displayed;
        setSyncSnapshotReady(true);
        setWorkspace(displayed);
        if (!primary && (source === "welcome" || source === "update" || source === "commit")) setSaveLabel("Synced with another ACM Studio tab");
        if (source === "update" || source === "welcome" || source === "failover" || source === "recovery") {
          historyRef.current = [];
          futureRef.current = [];
          setHistoryAvailability({ undo: false, redo: false });
        }
      },
      onConflict: (conflict) => {
        if (closed) return;
        pendingConflictRef.current = conflict;
        const local = validateSnapshot(conflict.localSnapshot);
        const activeDocumentId = local.documents.some(document => document.id === workspaceRef.current.activeDocumentId)
          ? workspaceRef.current.activeDocumentId : local.activeDocumentId;
        const displayed = { ...cloneWorkspace(local), activeDocumentId };
        workspaceRef.current = displayed;
        setWorkspace(displayed);
        setSyncConflict(conflict);
        setSyncResolutionError(null);
        setSaveError(conflict.reason);
      },
      onStatus: setSyncStatus,
      persistPrimary: (snapshot) => repository.save(snapshot),
    });
    syncRef.current = session;
    setSyncStatus(session.getStatus());
    if (pendingConflictRef.current) session.resumeConflict(pendingConflictRef.current);
    else setSyncConflict(session.getConflict());
    setSyncResolutionError(null);
    return () => {
      closed = true;
      session.close();
      if (syncRef.current === session) syncRef.current = null;
      setSyncSnapshotReady(false);
      setSyncStatus("disconnected");
    };
  }, [ready, loadError, ownershipState, loadedToken, repository, initialWorkspace, ownership, scope, validateSnapshot, reconcilePendingPeerSave]);

  const primaryWritable = ownership.canWrite(loadedToken);
  const peerWritable = !primaryWritable && syncStatus === "synced" && syncSnapshotReady;
  const editable = primaryWritable || peerWritable;

  useEffect(() => {
    if (!ready || loadError || syncConflict || (!primaryWritable && !peerWritable)) return;
    let cancelled = false;
    let message: string;
    let failed = false;
    const snapshotKey = JSON.stringify(workspace);
    if (lastPersistedWorkspaceRef.current === snapshotKey) return;
    setSaveLabel("Saving…");
    if (primaryWritable && (!syncRef.current?.isAvailable() || !syncRef.current.isPrimary())) {
      try {
        repository.save(workspace);
        const updated = new Date();
        queueMicrotask(() => {
          setSaveError(null);
          setSaveLabel(`Saved locally ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
          lastPersistedWorkspaceRef.current = snapshotKey;
        });
      } catch (error) {
        queueMicrotask(() => {
          setSaveError(error instanceof Error ? error.message : "Could not save locally");
          setSaveLabel("Could not save locally");
        });
      }
      return;
    }
    void (async () => {
      const session = syncRef.current;
      try {
        if (primaryWritable) {
          if (session?.isAvailable() && session.isPrimary()) await session.commitPrimary(workspace);
          else repository.save(workspace);
        } else if (session?.isConnectedPeer()) {
          const pending = pendingPeerSaveRef.current;
          pendingPeerSaveRef.current = {
            base: pending ? cloneWorkspace(pending.base) : cloneWorkspace(authoritativeWorkspaceRef.current),
            snapshot: cloneWorkspace(workspace),
          };
          await session.submit(workspace);
        } else return;
        if (syncRef.current !== session) return;
        const updated = new Date();
        message = primaryWritable ? `Saved locally ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Synced with another ACM Studio tab";
        if (!pendingPeerSaveRef.current && JSON.stringify(workspaceRef.current) === snapshotKey) lastPersistedWorkspaceRef.current = snapshotKey;
      } catch (error) {
        failed = true;
        message = error instanceof Error ? error.message : "Could not save locally";
      }
      queueMicrotask(() => {
        if (cancelled || (!primaryWritable && !peerWritable)) return;
        setSaveError(failed ? message : null);
        setSaveLabel(message);
      });
    })();
    return () => { cancelled = true; };
  }, [ready, repository, loadedRepository, loadError, syncConflict, workspace, ownership, loadedToken, ownershipState, primaryWritable, peerWritable]);

  function commit(update: (current: StudioWorkspace) => StudioWorkspace) {
    if (!editable) return;
    setWorkspace((current) => {
      if (!editable) return current;
      const nextHistory = commitHistory(current, historyRef.current, MAX_HISTORY);
      historyRef.current = nextHistory.history;
      futureRef.current = nextHistory.future;
      setHistoryAvailability({ undo: nextHistory.history.length > 0, redo: nextHistory.future.length > 0 });
      return update(cloneWorkspace(current));
    });
  }

  function undo() {
    if (!editable) return;
    const result = undoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
      if (!editable) return current;
      const next = undoHistory(current, historyRef.current, futureRef.current, MAX_HISTORY);
      if (!next) return current;
      historyRef.current = next.history;
      futureRef.current = next.future;
      setHistoryAvailability({ undo: next.history.length > 0, redo: next.future.length > 0 });
      return next.workspace;
    });
  }

  function redo() {
    if (!editable) return;
    const result = redoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
      if (!editable) return current;
      const next = redoHistory(current, historyRef.current, futureRef.current, MAX_HISTORY);
      if (!next) return current;
      historyRef.current = next.history;
      futureRef.current = next.future;
      setHistoryAvailability({ undo: next.history.length > 0, redo: next.future.length > 0 });
      return next.workspace;
    });
  }

  function updateDocument(documentId: string, update: (document: StudioDocument) => StudioDocument) {
    commit((current) => ({
      ...current,
      documents: current.documents.map((document) => document.id === documentId
        ? { ...update(document), updatedAt: new Date().toISOString() }
        : document),
    }));
  }

  function updateActiveDocument(update: (document: StudioDocument) => StudioDocument) {
    const activeDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0];
    if (!activeDocument) return;
    updateDocument(activeDocument.id, update);
  }

  function updateActiveField<K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) {
    updateActiveDocument((document) => ({ ...document, [field]: value }));
  }

  function setActiveDocument(documentId: string) {
    setWorkspace((current) => ({ ...current, activeDocumentId: documentId }));
  }

  async function resolveSyncConflict(choice: "mine" | "theirs") {
    setSyncResolutionError(null);
    const pendingPeerSave = pendingPeerSaveRef.current;
    // The session conflict already owns the complete local snapshot. Stop the
    // handover rebase from applying that same pending transaction again while
    // the chosen resolution installs its result.
    pendingPeerSaveRef.current = null;
    try {
      const session = syncRef.current;
      if (!session) throw new Error("Studio synchronisation is unavailable. Keep this tab open and try again.");
      await session.resolveConflict(choice);
      pendingConflictRef.current = null;
      setSyncConflict(null);
      setSaveError(null);
    } catch (error) {
      pendingPeerSaveRef.current = pendingPeerSave;
      setSyncResolutionError(error instanceof Error ? error.message : "The choice could not be saved. Your changes remain available for another attempt.");
    }
  }

  const statusLabel = syncConflict
    ? "Resolve conflicting changes"
    : syncStatus === "disconnected" && !primaryWritable
      ? "Connection lost — editing is paused"
      : syncStatus === "unsupported" && !primaryWritable
        ? "Read-only: this browser cannot synchronise Studio tabs"
        : ownershipState === "waiting" && syncStatus === "connecting"
          ? "Connecting to another ACM Studio tab…"
          : null;
  const ownershipLabel = ownershipState === "waiting" && (peerWritable || syncStatus === "connecting") ? null : ownershipMessage(ownershipState);
  const canRetryEditing = ownershipState === "unavailable" || (ownershipState === "waiting" && ["unsupported", "disconnected"].includes(syncStatus));
  return { workspace, ready, ownershipGeneration, writable: editable && !syncConflict, exclusiveWritable: primaryWritable, syncStatus, syncConflict, syncResolutionError, resolveSyncConflict, canUndo: editable && !syncConflict && historyAvailability.undo, canRedo: editable && !syncConflict && historyAvailability.redo, canRetryEditing, retryEditing: () => { if (["waiting", "unavailable"].includes(ownership.getState())) setAttempt((value) => value + 1); }, saveLabel: loadError ?? statusLabel ?? ownershipLabel ?? saveError ?? saveLabel, setSaveLabel, commit, undo, redo, updateDocument, updateActiveDocument, updateActiveField, setActiveDocument };
}
