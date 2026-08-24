"use client";

import { useEffect, useRef, useState } from "react";
import { cloneWorkspace, initialStudioWorkspace, type StudioDocument, type StudioWorkspace } from "./editor-model";
import { commitHistory, redoHistory, undoHistory } from "./studio-command-operations.mjs";
import { browserWorkspaceRepository, type WorkspaceRepository } from "./workspace-repository";

const MAX_HISTORY = 60;

export function useStudioWorkspace(repository: WorkspaceRepository = browserWorkspaceRepository) {
  const [workspace, setWorkspace] = useState<StudioWorkspace>(() => cloneWorkspace(initialStudioWorkspace));
  const [ready, setReady] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Preparing local workspace…");
  const historyRef = useRef<StudioWorkspace[]>([]);
  const futureRef = useRef<StudioWorkspace[]>([]);

  useEffect(() => {
    let cancelled = false;
    let savedWorkspace: StudioWorkspace | null = null;
    let message = "Local workspace ready";
    try {
      savedWorkspace = repository.load();
    } catch {
      message = "Local storage unavailable";
    }
    queueMicrotask(() => {
      if (cancelled) return;
      if (savedWorkspace) setWorkspace(savedWorkspace);
      setSaveLabel(message);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [repository]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let message: string;
    try {
      repository.save(workspace);
      const latest = workspace.documents.find((item) => item.id === workspace.activeDocumentId)?.updatedAt;
      const updated = latest ? new Date(latest) : new Date();
      message = `Saved locally ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      message = "Could not save locally";
    }
    queueMicrotask(() => { if (!cancelled) setSaveLabel(message); });
    return () => { cancelled = true; };
  }, [ready, repository, workspace]);

  function commit(update: (current: StudioWorkspace) => StudioWorkspace) {
    setWorkspace((current) => {
      const nextHistory = commitHistory(current, historyRef.current, MAX_HISTORY);
      historyRef.current = nextHistory.history;
      futureRef.current = nextHistory.future;
      return update(cloneWorkspace(current));
    });
  }

  function undo() {
    const result = undoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
      const next = undoHistory(current, historyRef.current, futureRef.current, MAX_HISTORY);
      if (!next) return current;
      historyRef.current = next.history;
      futureRef.current = next.future;
      return next.workspace;
    });
  }

  function redo() {
    const result = redoHistory(workspace, historyRef.current, futureRef.current, MAX_HISTORY);
    if (!result) return;
    setWorkspace((current) => {
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

  return { workspace, ready, saveLabel, setSaveLabel, commit, undo, redo, updateDocument, updateActiveDocument, updateActiveField, setActiveDocument };
}
