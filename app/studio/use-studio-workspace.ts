"use client";

import { useEffect, useRef, useState } from "react";
import { cloneWorkspace, initialStudioWorkspace, type StudioDocument, type StudioWorkspace } from "./editor-model";
import { validateStudioWorkspace } from "./workspace-validation";
import { commitHistory, redoHistory, undoHistory } from "./studio-command-operations.mjs";
import { browserWorkspaceRepository, type WorkspaceRepository } from "./workspace-repository";

import { studioWriteOwnership, ownershipMessage, type OwnershipState, type StudioWriteOwnership } from "./write-ownership";
import { createStudioSync, type StudioSyncConflict, type StudioSyncSession, type StudioSyncStatus } from "./studio-sync";

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
  const lastPersistedWorkspaceRef = useRef<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("disconnected");
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);

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
        setWorkspace(savedWorkspace ?? cloneWorkspace(initialWorkspace));
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
  }, [repository, ownership, attempt, initialWorkspace]);

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
    const primary = ownership.canWrite(loadedToken);
    const session = createStudioSync<StudioWorkspace>({
      scope,
      storeKey: "workspace",
      initialSnapshot: workspaceRef.current,
      role: primary ? "primary" : "peer",
      validateSnapshot,
      cloneSnapshot: cloneWorkspace,
      loadAuthoritative: () => repository.load() ?? cloneWorkspace(initialWorkspace),
      onSnapshot: (snapshot, source) => {
        const activeDocumentId = workspaceRef.current.documents.some(document => document.id === workspaceRef.current.activeDocumentId)
          ? workspaceRef.current.activeDocumentId
          : snapshot.activeDocumentId;
        const displayed = { ...cloneWorkspace(snapshot), activeDocumentId };
        workspaceRef.current = displayed;
        setWorkspace(displayed);
        if (source === "update" || source === "welcome" || source === "failover" || source === "recovery") {
          historyRef.current = [];
          futureRef.current = [];
          setHistoryAvailability({ undo: false, redo: false });
        }
      },
      onConflict: (conflict) => {
        setSyncConflict(conflict);
        setSaveError(conflict.reason);
      },
      onStatus: setSyncStatus,
      persistPrimary: (snapshot) => repository.save(snapshot),
    });
    syncRef.current = session;
    setSyncStatus(session.getStatus());
    return () => {
      session.close();
      if (syncRef.current === session) syncRef.current = null;
      setSyncStatus("disconnected");
    };
  }, [ready, loadError, ownershipState, loadedToken, repository, initialWorkspace, ownership, scope, validateSnapshot]);

  const primaryWritable = ownership.canWrite(loadedToken);
  const peerWritable = !primaryWritable && syncStatus === "synced";
  const editable = primaryWritable || peerWritable;

  useEffect(() => {
    if (!ready || loadError || (!primaryWritable && !peerWritable)) return;
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
      try {
        if (primaryWritable) {
          if (syncRef.current?.isAvailable() && syncRef.current.isPrimary()) await syncRef.current.commitPrimary(workspace);
          else repository.save(workspace);
        } else if (syncRef.current?.isConnectedPeer()) {
          await syncRef.current.submit(workspace);
        } else return;
        const updated = new Date();
        message = primaryWritable ? `Saved locally ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Synced with another ACM Studio tab";
        lastPersistedWorkspaceRef.current = snapshotKey;
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
  }, [ready, repository, loadedRepository, loadError, workspace, ownership, loadedToken, ownershipState, primaryWritable, peerWritable]);

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
    const session = syncRef.current;
    if (!session) throw new Error("Studio synchronisation is unavailable.");
    await session.resolveConflict(choice);
    setSyncConflict(null);
    setSaveError(null);
  }

  const statusLabel = syncConflict ? "Resolve conflicting changes" : syncStatus === "disconnected" && !primaryWritable ? "Connection lost — editing is paused" : syncStatus === "unsupported" && !primaryWritable ? "Read-only: this browser cannot synchronise Studio tabs" : null;
  return { workspace, ready, ownershipGeneration, writable: editable && !syncConflict, exclusiveWritable: primaryWritable, syncStatus, syncConflict, resolveSyncConflict, canUndo: editable && !syncConflict && historyAvailability.undo, canRedo: editable && !syncConflict && historyAvailability.redo, canRetryEditing: ["waiting", "unavailable"].includes(ownershipState), retryEditing: () => { if (["waiting", "unavailable"].includes(ownership.getState())) setAttempt((value) => value + 1); }, saveLabel: loadError ?? ownershipMessage(ownershipState) ?? statusLabel ?? saveError ?? saveLabel, setSaveLabel, commit, undo, redo, updateDocument, updateActiveDocument, updateActiveField, setActiveDocument };
}
