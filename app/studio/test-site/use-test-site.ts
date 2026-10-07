"use client";
import { canApplyTestProposal, testDraftRecoveryEnvelope } from "./draft-recovery";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { studioWriteOwnership } from "../write-ownership";
import { validTestSiteDocument, type TestSiteDocument, type TestSnapshot } from "./contract";

class ConnectionError extends Error { constructor(message: string, public status: number) { super(message); } }
export function useTestSite(enabled = true, borrowedOwnership?: boolean) {
  const [snapshot, setSnapshot] = useState<TestSnapshot | null>(null);
  const [draft, setDraft] = useState<TestSiteDocument | null>(null);
  const [past, setPast] = useState<TestSiteDocument[]>([]);
  const [future, setFuture] = useState<TestSiteDocument[]>([]);
  const [label, setLabel] = useState("Loading Test…");
  const [failure, setFailure] = useState<string | null>(null);
  const [promptRunning, setPromptRunning] = useState(false);
  const [promptResult, setPromptResult] = useState("");
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting" as const);
  const token = useRef<string | null>(null);
  const live = useRef({ snapshot, draft, past, future, failure, promptRunning });
  useLayoutEffect(() => { live.current = { snapshot, draft, past, future, failure, promptRunning }; }, [snapshot, draft, past, future, failure, promptRunning]);
  const claimed = useRef(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const saving = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const dirty = Boolean(snapshot && draft && JSON.stringify(snapshot.document) !== JSON.stringify(draft));
  const writable = enabled && Boolean(borrowedOwnership) && ownership === "writable" && isClaimed && !failure && !promptRunning && !reconnecting;
  const request = useCallback(async (input: Record<string, unknown>, connectionToken = token.current, keepalive = false) => {
    const response = await fetch("/__studio/test-site", { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", ...(connectionToken ? { "X-Studio-Test-Token": connectionToken } : {}) }, body: JSON.stringify({ ...input, siteId: "test" }), keepalive });
    const result = await response.json();
    if (!response.ok) throw new ConnectionError(result.error ?? "Test could not be loaded.", response.status);
    return result;
  }, []);
  const [preservedProposal, setPreservedProposal] = useState<unknown>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let connectionToken: string | null = null;
    const releaseSession = () => { if (connectionToken) void request({ action: "release" }, connectionToken, true).catch(() => {}); };
    window.addEventListener("pagehide", releaseSession);
    mounted.current = true;
    claimed.current = false;
    async function connect() {
      try {
        const result = await request({ action: "connect" });
        connectionToken = result.token;
        if (cancelled) { releaseSession(); return; }
        token.current = result.token;
        setFailure(null); setIsClaimed(false);
        setSnapshot(result); setDraft(result.document); setPast([]); setFuture([]); setPreservedProposal(null);
        setConnectionGeneration(value => value + 1);
        setLabel("Read-only — try editing here when the other tab is closed"); setReconnecting(false);
      } catch (error) { if (!cancelled) { setFailure(error instanceof Error ? error.message : "Test could not be loaded."); setLabel("Connection failed"); setReconnecting(false); } }
    }
    queueMicrotask(() => { if (!cancelled) { setIsClaimed(false); setLabel("Loading Test…"); void connect(); } });
    return () => { cancelled = true; mounted.current = false; claimed.current = false; window.removeEventListener("pagehide", releaseSession); releaseSession(); };
  }, [attempt, request, enabled]);
  useEffect(() => {
    if (!enabled || !token.current) return;
    const connectionToken = token.current;
    let cancelled = false;
    if (!borrowedOwnership) {
      claimed.current = false;
      void request({ action: "release" }, connectionToken, true).finally(() => { if (!cancelled) setIsClaimed(false); }).catch(() => {});
      return;
    }
    void request({ action: "claim" }, connectionToken).then(fresh => {
      if (cancelled) return;
      const current = live.current;
      const dirtyDraft = current.draft && JSON.stringify(current.draft) !== JSON.stringify(current.snapshot?.document);
      if (dirtyDraft && current.snapshot?.revision !== fresh.revision) {
        setFailure("Test changed while editing was paused. Export your draft before reconnecting."); setLabel("Conflict — draft preserved"); return;
      }
      claimed.current = true; setIsClaimed(true);
      if (!dirtyDraft) { setSnapshot(fresh); setDraft(fresh.document); }
      setLabel(dirtyDraft ? "Unsaved changes" : "Saved locally");
    }).catch(error => { if (!cancelled) { setFailure(error instanceof Error ? error.message : "Test could not be claimed."); setLabel("Read-only — draft preserved"); } });
    return () => { cancelled = true; };
  }, [enabled, borrowedOwnership, connectionGeneration, request]);
  const installDraft = useCallback((next: TestSiteDocument, history = true) => {
    const current = live.current;
    if (!current.draft || !studioWriteOwnership.canWrite() || !claimed.current || current.failure || current.promptRunning) return false;
    if (!validTestSiteDocument(next)) { setPromptResult("This change uses a capability that Test does not support yet."); return false; }
    if (JSON.stringify(current.draft) === JSON.stringify(next)) return true;
    if (history) { setPast(previous => [...previous.slice(-99), current.draft!]); setFuture([]); }
    live.current.draft = next;
    setDraft(next); setLabel("Unsaved changes"); return true;
  }, []);
  const flush = useCallback(async () => {
    if (saving.current) { await saving.current; }
    const current = live.current;
    if (!current.snapshot || !current.draft) return;
    if (current.failure) throw new Error(current.failure);
    if (JSON.stringify(current.snapshot.document) === JSON.stringify(current.draft)) return;
    const document = current.draft;
    const baseRevision = current.snapshot.revision;
    setLabel("Saving…");
    const operation = studioWriteOwnership.write(async () => {
      const result = await request({ action: "save", baseRevision, document });
      if (!mounted.current) return;
      live.current.snapshot = result;
      setSnapshot(result); setLabel(JSON.stringify(live.current.draft) === JSON.stringify(document) ? "Saved locally" : "Unsaved changes");
    }).catch(error => {
      if (mounted.current) { const message = error instanceof Error ? error.message : "Save failed."; live.current.failure = message; setFailure(message); setLabel("Save failed — draft preserved"); }
      throw error;
    }).finally(() => { saving.current = null; });
    saving.current = operation;
    await operation;
  }, [request]);
  useEffect(() => {
    if (!dirty || !writable) return;
    const timer = window.setTimeout(() => { void flush().catch(() => {}); }, 600);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, writable, flush]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = async () => {
      if (!token.current || document.visibilityState === "hidden" || saving.current || live.current.failure) return;
      try {
        const fresh = await request({ action: "read" });
        const current = live.current;
        if (!current.snapshot || fresh.revision === current.snapshot.revision) return;
        if (current.draft && JSON.stringify(current.draft) !== JSON.stringify(current.snapshot.document) || current.promptRunning) {
          const message = "Test has newer changes. Export your draft before reloading."; live.current.failure = message; setFailure(message); setLabel("Conflict — draft preserved"); return;
        }
        live.current.snapshot = fresh; live.current.draft = fresh.document;
        setSnapshot(fresh); setDraft(fresh.document); setPast([]); setFuture([]); setLabel("Latest saved revision loaded");
      } catch (error) { const message = error instanceof Error ? error.message : "Connection failed."; live.current.failure = message; setFailure(message); setLabel("Connection failed — draft preserved"); }
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [request, enabled]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty || saving.current || promptRunning) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, promptRunning]);
  function undo() {
    const current = live.current;
    const previous = current.past.at(-1);
    if (!writable || !previous || !current.draft) return;
    const original = current.draft;
    if (installDraft(previous, false)) { setPast(current.past.slice(0, -1)); setFuture([...current.future, original]); }
  }
  function redo() {
    const current = live.current;
    const next = current.future.at(-1);
    if (!writable || !next || !current.draft) return;
    const original = current.draft;
    if (installDraft(next, false)) { setFuture(current.future.slice(0, -1)); setPast([...current.past, original]); }
  }
  async function submitPrompt(prompt: string) {
    if (!writable) return;
    setPromptResult("");
    try {
      await flush();
      if (live.current.failure || !live.current.snapshot) return;
      const baseline = live.current.snapshot;
      setPromptRunning(true); live.current.promptRunning = true; setLabel("Working on your prompt…");
      const proposal = await request({ action: "prompt", baseRevision: baseline.revision, prompt });
      if (!canApplyTestProposal(baseline, live.current)) {
        setPromptResult("The document changed while the prompt ran. The proposal was preserved for export.");
        setPreservedProposal(proposal); return;
      }
      live.current.promptRunning = false;
      if (!installDraft(proposal.document)) throw new Error("The proposed change could not be applied.");
      await flush();
      setPromptResult(proposal.explanation || "Prompt changes saved locally.");
    } catch (error) { setPromptResult(error instanceof Error ? error.message : "Prompt failed; the site was preserved."); }
    finally {
      live.current.promptRunning = false; setPromptRunning(false);
      if (!live.current.failure) setLabel(JSON.stringify(live.current.draft) === JSON.stringify(live.current.snapshot?.document) ? "Saved locally" : "Unsaved changes");
    }
  }
  function exportDraft() {
    const blob = new Blob([JSON.stringify(testDraftRecoveryEnvelope(live.current.draft, live.current.snapshot?.revision, preservedProposal), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = "test-unsaved-draft.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function reconnect() {
    if (reconnecting || promptRunning) return;
    setReconnecting(true); claimed.current = false;
    try { await saving.current; } catch { /* The user is explicitly reconnecting to inspect a failed or interrupted save. */ }
    const current = live.current;
    const hasUnsaved = current.draft && JSON.stringify(current.draft) !== JSON.stringify(current.snapshot?.document);
    if ((hasUnsaved || preservedProposal) && !window.confirm("Reload Test and discard the current draft? Export it first if you need to keep it.")) { claimed.current = isClaimed; setReconnecting(false); return; }
    setFailure(null); setIsClaimed(false); setLabel("Connecting to Test…");
    setAttempt(value => value + 1);
  }
  return { snapshot, draft, writable, label, failure, promptRunning, reconnecting, promptResult, installDraft, undo, redo, canUndo: writable && past.length > 0, canRedo: writable && future.length > 0, submitPrompt, reconnect, exportDraft, flush };
}
