"use client";

import { useEffect, useRef, useState } from "react";
import { cloneWorkspace, initialStudioWorkspace, type StudioDocument, type StudioWorkspace } from "./editor-model";
import { commitHistory, redoHistory, undoHistory } from "./studio-command-operations.mjs";
import { browserWorkspaceRepository, type WorkspaceRepository } from "./workspace-repository";

import { studioWriteOwnership, ownershipMessage, type OwnershipState, type StudioWriteOwnership } from "./write-ownership";

const MAX_HISTORY = 60;

export function useStudioWorkspace(repository: WorkspaceRepository = browserWorkspaceRepository, ownership: StudioWriteOwnership = studioWriteOwnership, initialWorkspace: StudioWorkspace = initialStudioWorkspace) {
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
  const historyRef = useRef<StudioWorkspace[]>([]);
  const futureRef = useRef<StudioWorkspace[]>([]);

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
    load(null);
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
    if (!ready || loadedRepository !== repository || loadError || !ownership.canWrite(loadedToken)) return;
    let cancelled = false;
    let message: string;
    let failed = false;
    try {
      repository.save(workspace);
      const latest = workspace.documents.find((item) => item.id === workspace.activeDocumentId)?.updatedAt;
      const updated = latest ? new Date(latest) : new Date();
      message = `Saved locally ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      failed = true;
      message = "Could not save locally";
    }
    queueMicrotask(() => {
      if (cancelled || !ownership.canWrite(loadedToken)) return;
      setSaveError(failed ? message : null);
      setSaveLabel(message);
    });
    return () => { cancelled = true; };
  }, [ready, repository, loadedRepository, loadError, workspace, ownership, loadedToken, ownershipState]);

  function commit(update: (current: StudioWorkspace) => StudioWorkspace) {
    if (!ownership.canWrite(loadedToken)) return;
    setWorkspace((current) => {
      if (!ownership.canWrite(loadedToken)) return current;
      const nextHistory = commitHistory(current, historyRef.current, MAX_HISTORY);
      historyRef.current = nextHistory.history;
      futureRef.current = nextHistory.future;
      return update(cloneWorkspace(current));
    });
  }

  function undo() {
    if (!ownership.canWrite(loadedToken)) return;
    const result = undoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
      if (!ownership.canWrite(loadedToken)) return current;
      const next = undoHistory(current, historyRef.current, futureRef.current, MAX_HISTORY);
      if (!next) return current;
      historyRef.current = next.history;
      futureRef.current = next.future;
      return next.workspace;
    });
  }

  function redo() {
    if (!ownership.canWrite(loadedToken)) return;
    const result = redoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
      if (!ownership.canWrite(loadedToken)) return current;
      const next = redoHistory(current, historyRef.current, futureRef.current, MAX_HISTORY);
      if (!next) return current;
      historyRef.current = next.history;
      futureRef.current = next.future;
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

  return { workspace, ready, ownershipGeneration, writable: ownership.canWrite(loadedToken), canRetryEditing: ["waiting", "unavailable"].includes(ownershipState), retryEditing: () => { if (["waiting", "unavailable"].includes(ownership.getState())) setAttempt((value) => value + 1); }, saveLabel: ownershipMessage(ownershipState) ?? loadError ?? saveError ?? saveLabel, setSaveLabel, commit, undo, redo, updateDocument, updateActiveDocument, updateActiveField, setActiveDocument };
}
