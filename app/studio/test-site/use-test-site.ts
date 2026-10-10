"use client";
import { localFixtureName, type LocalFixtureSiteId } from "./sites";
import { shouldProtectTestSiteBeforeUnload } from "./before-unload";
import { canApplyTestProposal, testDraftRecoveryEnvelope } from "./draft-recovery";
import { useCallback, useEffect, useMemo, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { studioWriteOwnership } from "../write-ownership";
import { createStudioSync, type StudioSyncConflict, type StudioSyncSession, type StudioSyncStatus } from "../studio-sync";
import { reconcileStudioPendingSave, type StudioPendingSave } from "../studio-pending-save";
import { testSiteCollection, validTestSiteDocument, type TestSiteDocument, type TestSnapshot } from "./contract";

class ConnectionError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
// Retain compatibility with an already-running local gateway during a source update.
const expiredSessionMessage = "The local editing connection expired. Reconnect to continue.";
function authorityFailureMessage(message: string, siteName: string) {
  return message === expiredSessionMessage
    || message === `${siteName}'s editing lease expired. Reconnect before editing.`
    || message === `${siteName} is already being edited in another session.`
    || message === `Another session owns ${siteName} editing. Reconnect when it is available.`;
}
function rejectedConnectionAuthority(error: unknown, siteName: string) {
  return error instanceof ConnectionError && (
    error.status === 401 && (error.code === "session_expired" || error.message === expiredSessionMessage)
    || error.status === 423 && (error.code === "lease_expired" || error.code === "ownership_lost" || authorityFailureMessage(error.message, siteName))
  );
}
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function validateSiteDocument(value: unknown, siteId: LocalFixtureSiteId): TestSiteDocument {
  if (!validTestSiteDocument(value) || value.siteId !== siteId) throw new Error("The selected site contains unsupported content or belongs to another site. The draft was preserved.");
  return testSiteCollection(value);
}
function validateSiteSnapshot(value: unknown, siteId: LocalFixtureSiteId): TestSnapshot {
  const candidate = value as Partial<TestSnapshot> | null;
  if (!candidate || typeof candidate.revision !== "string" || !/^[a-f0-9]{64}$/.test(candidate.revision) || candidate.previewRevision !== candidate.revision) throw new Error("The selected site returned an invalid saved revision.");
  validateSiteDocument(candidate.document, siteId);
  return candidate as TestSnapshot;
}
async function documentRevision(document: TestSiteDocument) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(document)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function useTestSite(enabled = true, borrowedOwnership?: boolean, siteId: LocalFixtureSiteId = "test") {
  const siteName = localFixtureName(siteId);
  const WAKE_CHANNEL = `acm-studio-${siteId}-editing-v1`;
  const WAKE_MESSAGE = useMemo(() => ({ protocol: WAKE_CHANNEL, kind: "open", siteId }), [WAKE_CHANNEL, siteId]);
  const validateDocument = useCallback((value: unknown) => validateSiteDocument(value, siteId), [siteId]);
  const validateSnapshot = useCallback((value: unknown) => validateSiteSnapshot(value, siteId), [siteId]);
  // Once activated, retain the broker while this shell switches to browser content.
  const [activated, setActivated] = useState(enabled);
  const requested = enabled || activated;
  const [snapshot, setSnapshot] = useState<TestSnapshot | null>(null);
  const [draft, setDraft] = useState<TestSiteDocument | null>(null);
  const [past, setPast] = useState<TestSiteDocument[]>([]);
  const [future, setFuture] = useState<TestSiteDocument[]>([]);
  const [label, setLabel] = useState(`Loading ${siteName}…`);
  const [failure, setFailure] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<StudioSyncStatus>("connecting");
  const [syncConflict, setSyncConflict] = useState<StudioSyncConflict | null>(null);
  const [syncResolutionError, setSyncResolutionError] = useState<string | null>(null);
  const [promptRunning, setPromptRunning] = useState(false);
  const [promptResult, setPromptResult] = useState("");
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const recoveringAuthority = useRef(false);
  const authorityRecoveryPending = useRef(false);
  const [editingPaused, setEditingPaused] = useState(false);
  const editingPausedRef = useRef(false);
  function pauseEditing(paused: boolean) { editingPausedRef.current = paused; setEditingPaused(paused); }
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting" as const);
  const token = useRef<string | null>(null);
  const live = useRef({ snapshot, draft, past, future, failure, promptRunning });
  useLayoutEffect(() => { live.current = { snapshot, draft, past, future, failure, promptRunning }; }, [snapshot, draft, past, future, failure, promptRunning]);
  const sync = useRef<StudioSyncSession<TestSiteDocument> | null>(null);
  const pending = useRef<StudioPendingSave<TestSiteDocument> | null>(null);
  const conflict = useRef<StudioSyncConflict | null>(null);
  const claimed = useRef(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const saving = useRef<Promise<void> | null>(null);
  const gatewayWriteGeneration = useRef(0);
  const gatewayWriting = useRef(false);
  const mounted = useRef(true);
  const legacyBase = useRef<{ document: TestSiteDocument; revision: string } | null>(null);
  const dirty = Boolean(snapshot && draft && !equal(snapshot.document, draft));
  const primary = Boolean(borrowedOwnership) && ownership === "writable" && isClaimed;
  const writable = enabled && (primary && syncStatus === "primary" || !borrowedOwnership && syncStatus === "synced") && !failure && !syncConflict && !promptRunning && !reconnecting && !editingPaused;
  const request = useCallback(async (input: Record<string, unknown>, connectionToken = token.current, keepalive = false) => {
    const response = await fetch("/__studio/test-site", { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", ...(connectionToken ? { "X-Studio-Test-Token": connectionToken } : {}) }, body: JSON.stringify({ ...input, siteId }), keepalive });
    const result = await response.json();
    if (!response.ok) throw new ConnectionError(result.error ?? `${siteName} could not be loaded.`, response.status, typeof result.code === "string" ? result.code : undefined);
    return result;
  }, [siteId, siteName]);
  const [preservedProposal, setPreservedProposal] = useState<unknown>(null);
  const fail = useCallback((message: string) => {
    live.current.failure = message;
    setFailure(message); setLabel("Connection paused — draft preserved");
  }, []);
  const installSaved = useCallback((saved: TestSnapshot) => {
    const document = validateDocument(saved.document);
    // Use the same editable shape before the first legacy-to-collection save, so independent
    // edits do not conflict merely because both tabs migrate the envelope.
    if (!equal(saved.document, document)) legacyBase.current = { document, revision: saved.revision };
    const normalised = { ...saved, document };
    live.current.snapshot = normalised;
    setSnapshot(normalised);
  }, [validateDocument]);
  const recoverConnectionAuthority = useCallback(() => {
    // Never replay an in-flight or uncertain save. Reconnect only connection authority;
    // pending edits retain their original base for the existing synchronisation rebase.
    if (recoveringAuthority.current || saving.current || gatewayWriting.current || live.current.promptRunning) return;
    recoveringAuthority.current = true;
    authorityRecoveryPending.current = false;
    claimed.current = false;
    setIsClaimed(false); setReconnecting(true); setSyncStatus("connecting");
    sync.current?.close(); sync.current = null;
    setLabel(`Reconnecting ${siteName} — draft preserved`);
    setAttempt(value => value + 1);
  }, [siteName]);

  useEffect(() => {
    if (typeof BroadcastChannel !== "function") return;
    const channel = new BroadcastChannel(WAKE_CHANNEL);
    const wake = (event: MessageEvent<unknown>) => {
      if (equal(event.data, WAKE_MESSAGE) && borrowedOwnership && studioWriteOwnership.canWrite()) setActivated(true);
    };
    channel.addEventListener("message", wake);
    // Repeat discovery so an ordinary editor tab can become the next saving tab.
    const announce = () => { if (enabled) channel.postMessage(WAKE_MESSAGE); };
    announce();
    const timer = window.setInterval(announce, 2000);
    if (enabled) queueMicrotask(() => setActivated(true));
    return () => { window.clearInterval(timer); channel.removeEventListener("message", wake); channel.close(); };
  }, [enabled, borrowedOwnership, WAKE_CHANNEL, WAKE_MESSAGE]);

  useEffect(() => {
    if (!requested) return;
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
        if (typeof connectionToken !== "string" || !/^[a-f0-9]{64}$/.test(connectionToken)) throw new Error(`${siteName} returned an invalid editing session.`);
        const saved = validateSnapshot(result);
        if (cancelled) { releaseSession(); return; }
        token.current = connectionToken;
        live.current.failure = null;
        setFailure(null); setIsClaimed(false);
        installSaved(saved);
        if (!pending.current) { live.current.draft = live.current.snapshot!.document; setDraft(live.current.draft); }
        setConnectionGeneration(value => value + 1);
        recoveringAuthority.current = false;
        setLabel(`Connecting ${siteName} tabs…`); setReconnecting(false);
      } catch (error) { if (!cancelled) { recoveringAuthority.current = false; fail(error instanceof Error ? error.message : `${siteName} could not be loaded.`); setReconnecting(false); } }
    }
    queueMicrotask(() => { if (!cancelled) { setIsClaimed(false); setLabel(`Loading ${siteName}…`); void connect(); } });
    return () => { cancelled = true; mounted.current = false; claimed.current = false; token.current = null; window.removeEventListener("pagehide", releaseSession); releaseSession(); };
  }, [attempt, request, requested, fail, installSaved, siteName, validateSnapshot]);

  useEffect(() => {
    if (!requested || !token.current) return;
    const connectionToken = token.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!borrowedOwnership) {
      claimed.current = false;
      void request({ action: "release" }, connectionToken, true).finally(() => { if (!cancelled) setIsClaimed(false); }).catch(() => {});
      return;
    }
    async function claim() {
      try {
        const fresh = validateSnapshot(await studioWriteOwnership.write(() => request({ action: "claim" }, connectionToken)));
        if (cancelled) { void request({ action: "release" }, connectionToken, true).catch(() => {}); return; }
        claimed.current = true; installSaved(fresh); setIsClaimed(true);
      } catch (error) {
        if (cancelled) return;
        // A crashed previous tab's lease may remain briefly. No save is retried.
        if (error instanceof ConnectionError && error.status === 423) {
          setLabel(`Waiting for ${siteName} save handover…`); timer = setTimeout(() => void claim(), 1000);
        } else fail(error instanceof Error ? error.message : `${siteName} could not be claimed.`);
      }
    }
    void claim();
    return () => { cancelled = true; if (timer) clearTimeout(timer); claimed.current = false; };
  }, [requested, borrowedOwnership, connectionGeneration, request, fail, installSaved, siteName, validateSnapshot]);

  useEffect(() => {
    if (!requested || !token.current || !live.current.snapshot || (borrowedOwnership && !isClaimed) || !["waiting", "writable"].includes(ownership)) return;
    let closed = false;
    const connectionToken = token.current;
    const owner = Boolean(borrowedOwnership) && isClaimed;
    const disk = { snapshot: live.current.snapshot };
    const reconcile = (document: TestSiteDocument, acknowledgedTransaction?: Parameters<typeof reconcileStudioPendingSave>[4]) => {
      const next = reconcileStudioPendingSave(pending.current, document, validateDocument, `${siteName} changes overlap with unsaved changes in this tab.`, acknowledgedTransaction);
      pending.current = next.pending;
      if (next.conflict) { conflict.current = next.conflict; setSyncConflict(next.conflict); }
      return next;
    };
    const session = createStudioSync<TestSiteDocument>({
      scope: `local-${siteId}`, storeKey: "document", initialSnapshot: disk.snapshot.document,
      role: owner ? "primary" : "peer", validateSnapshot: validateDocument,
      loadAuthoritative: () => disk.snapshot.document,
      persistPrimary: async document => {
        if (live.current.failure) throw new Error(live.current.failure);
        gatewayWriteGeneration.current += 1; gatewayWriting.current = true;
        try {
          const saved = await studioWriteOwnership.write(async () => {
            if (!claimed.current || token.current !== connectionToken) throw new Error(`${siteName}'s saving session changed. The draft was preserved.`);
            return validateSnapshot(await request({ action: "save", baseRevision: disk.snapshot.revision, document }, connectionToken));
          });
          disk.snapshot = saved;
        } catch (error) {
          if (!closed) {
            // Only an explicit authority rejection proves that this save did not
            // commit. Transport failures and interrupted writes stay paused.
            authorityRecoveryPending.current = rejectedConnectionAuthority(error, siteName);
            fail(error instanceof Error ? error.message : `${siteName} could not be saved.`);
          }
          throw error;
        } finally {
          gatewayWriting.current = false; gatewayWriteGeneration.current += 1;
          // Peer submissions have no local flush promise. Let the synchronisation
          // transaction settle before closing its rejected session.
          if (authorityRecoveryPending.current) window.setTimeout(() => {
            if (!closed && authorityRecoveryPending.current) recoverConnectionAuthority();
          }, 0);
        }
      },
      onCommittedSnapshot: (document, commit) => {
        if (closed) return;
        if (commit.source === "commit" || commit.source === "update" || commit.acknowledgedTransaction) legacyBase.current = null;
        const current = live.current.snapshot!;
        installSaved({ ...current, document, ...(owner ? { revision: disk.snapshot.revision, previewRevision: disk.snapshot.previewRevision } : {}) });
        if (conflict.current) return;
        const next = reconcile(document, commit.acknowledgedTransaction);
        if (next.conflict) queueMicrotask(() => { if (!closed) session.resumeConflict(next.conflict!); });
        // ACKs never erase newer keystrokes, including those still waiting for autosave.
        live.current.draft = next.snapshot; setDraft(next.snapshot);
      },
      onSnapshot: (document, source) => {
        if (closed || conflict.current || live.current.failure) return;
        const displayed = pending.current?.snapshot ?? document;
        live.current.draft = displayed; setDraft(displayed);
        if (["update", "welcome", "failover", "recovery"].includes(source)) { live.current.past = []; live.current.future = []; setPast([]); setFuture([]); }
        setLabel(pending.current ? "Unsaved changes" : owner ? "Saved locally" : `Synced with another ${siteName} tab`);
      },
      onConflict: value => {
        if (closed) return;
        // A rejected submission may be older than the keystrokes awaiting autosave.
        const retained = pending.current;
        const full = retained ? { ...value, baseSnapshot: retained.base, localSnapshot: retained.snapshot } : value;
        conflict.current = full; setSyncConflict(full); setSyncResolutionError(null);
        live.current.draft = validateDocument(full.localSnapshot); setDraft(live.current.draft);
        if (!equal(value.localSnapshot, full.localSnapshot) || !equal(value.baseSnapshot, full.baseSnapshot)) {
          queueMicrotask(() => { if (!closed) session.resumeConflict(full); });
        }
        setLabel(`Conflicting ${siteName} changes — review required`);
      },
      onStatus: status => { if (!closed) { setSyncStatus(status); if (status === "disconnected") setLabel(`${siteName} sync paused — reconnect to continue`); } },
    });
    sync.current = session;
    setSyncStatus(session.getStatus());
    if (conflict.current) session.resumeConflict(conflict.current);
    return () => { closed = true; session.close(); if (sync.current === session) sync.current = null; };
  }, [requested, connectionGeneration, borrowedOwnership, isClaimed, ownership, request, fail, installSaved, recoverConnectionAuthority, siteId, siteName, validateDocument, validateSnapshot]);

  const installDraft = useCallback((next: TestSiteDocument, history = true) => {
    const current = live.current;
    const session = sync.current;
    if (editingPausedRef.current || !current.draft || !session || !(session.isConnectedPeer() || session.isPrimary() && claimed.current && studioWriteOwnership.canWrite()) || conflict.current || current.failure || current.promptRunning) return false;
    if (!validTestSiteDocument(next) || next.siteId !== siteId) { setPromptResult(`This change uses a capability that ${siteName} does not support yet.`); return false; }
    if (equal(current.draft, next)) return true;
    if (history) { const previous = [...current.past.slice(-99), current.draft]; live.current.past = previous; live.current.future = []; setPast(previous); setFuture([]); }
    pending.current = { base: pending.current?.base ?? current.snapshot!.document, snapshot: next };
    live.current.draft = next; setDraft(next); setLabel("Unsaved changes"); return true;
  }, [siteId, siteName]);
  const updateDraft = (update: (current: TestSiteDocument) => TestSiteDocument) => {
    if (!live.current.draft) return false;
    return installDraft(update(structuredClone(live.current.draft)));
  };
  const flush = useCallback(async () => {
    while (saving.current) await saving.current;
    const current = live.current;
    if (!current.snapshot || !current.draft) return;
    if (current.failure) throw new Error(current.failure);
    if (conflict.current) throw new Error(`Review the conflicting ${siteName} changes before saving.`);
    if (!pending.current || equal(current.snapshot.document, current.draft)) return;
    const session = sync.current;
    if (!session || !(session.isPrimary() && claimed.current && studioWriteOwnership.canWrite() || session.isConnectedPeer())) throw new Error(`${siteName} is waiting for its saving tab. Your draft has been preserved.`);
    setLabel("Saving…");
    const operation = (session.isPrimary() ? session.commitPrimary(current.draft) : session.submit(current.draft)).then(() => {
      if (mounted.current) setLabel(pending.current ? "Unsaved changes" : session.isPrimary() ? "Saved locally" : `Synced with another ${siteName} tab`);
    }).catch(error => {
      if (mounted.current && sync.current === session && !conflict.current && !["connecting", "disconnected"].includes(session.getStatus())) fail(error instanceof Error ? error.message : "Save failed.");
      throw error;
    }).finally(() => {
      if (saving.current === operation) saving.current = null;
      if (mounted.current && authorityRecoveryPending.current) recoverConnectionAuthority();
    });
    saving.current = operation;
    await operation;
  }, [fail, recoverConnectionAuthority, siteName]);
  useEffect(() => {
    if (!dirty || !writable) return;
    const timer = window.setTimeout(() => { void flush().catch(() => {}); }, 600);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, writable, flush]);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (!token.current || refreshing || recoveringAuthority.current || saving.current || gatewayWriting.current || live.current.promptRunning) return;
      if (live.current.failure) {
        // Recover a pre-update authority banner without discarding the draft. Other
        // failures still require explicit review/export and are never retried.
        if (authorityRecoveryPending.current || authorityFailureMessage(live.current.failure, siteName)) recoverConnectionAuthority();
        return;
      }
      refreshing = true;
      const connectionToken = token.current;
      try {
        // Keep the owner lease alive in background tabs as well as visible tabs.
        const beforeRevision = live.current.snapshot?.revision;
        const beforeGeneration = gatewayWriteGeneration.current;
        // A pagehide release can outlive a restored page's local claimed flag.
        // Claim checks the server owner and may safely reacquire an unowned lease;
        // ordinary peer reads intentionally do not require ownership.
        const fresh = validateSnapshot(await (claimed.current
          ? studioWriteOwnership.write(() => request({ action: "claim" }, connectionToken))
          : request({ action: "read" }, connectionToken)));
        if (cancelled || !mounted.current || token.current !== connectionToken) return;
        const current = live.current;
        if (claimed.current && !gatewayWriting.current && !saving.current && gatewayWriteGeneration.current === beforeGeneration && current.snapshot?.revision === beforeRevision && fresh.revision !== beforeRevision) {
          fail(`${siteName} changed outside its tab synchronisation session. Export your draft before reconnecting.`);
        }
      } catch (error) {
        if (!cancelled && mounted.current && token.current === connectionToken) {
          if (rejectedConnectionAuthority(error, siteName)) recoverConnectionAuthority();
          else fail(error instanceof Error ? error.message : "Connection failed.");
        }
      } finally { refreshing = false; }
    };
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", resume);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); document.removeEventListener("visibilitychange", resume); };
  }, [request, requested, fail, recoverConnectionAuthority, siteName, validateSnapshot]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (shouldProtectTestSiteBeforeUnload({ dirty, saving: Boolean(saving.current), promptRunning, editingPaused: editingPausedRef.current })) {
        event.preventDefault(); event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, promptRunning]);
  function undo() {
    const current = live.current; const previous = current.past.at(-1);
    if (!writable || !previous || !current.draft) return;
    const original = current.draft;
    if (installDraft(previous, false)) { live.current.past = current.past.slice(0, -1); live.current.future = [...current.future, original]; setPast(live.current.past); setFuture(live.current.future); }
  }
  function redo() {
    const current = live.current; const next = current.future.at(-1);
    if (!writable || !next || !current.draft) return;
    const original = current.draft;
    if (installDraft(next, false)) { live.current.future = current.future.slice(0, -1); live.current.past = [...current.past, original]; setFuture(live.current.future); setPast(live.current.past); }
  }
  async function resolveSyncConflict(choice: "mine" | "theirs") {
    const session = sync.current;
    if (!session || !conflict.current) return;
    setSyncResolutionError(null);
    try {
      // Other tabs may have saved since the conflict opened. Rebase the choice
      // against the session's latest authoritative state, retaining all local edits.
      session.resumeConflict(conflict.current);
      await session.resolveConflict(choice);
      conflict.current = null; pending.current = null; setSyncConflict(null);
      live.current.past = []; live.current.future = []; setPast([]); setFuture([]);
      const saved = live.current.snapshot;
      if (saved) { live.current.draft = saved.document; setDraft(saved.document); }
      setLabel(session.isPrimary() ? "Saved locally" : `Synced with another ${siteName} tab`);
    } catch (error) { setSyncResolutionError(error instanceof Error ? error.message : "The conflict could not be resolved."); }
  }
  async function submitPrompt(prompt: string) {
    // Prompts remain deferred and may only use the existing exclusive session.
    if (!writable || !primary) return;
    setPromptResult("");
    try {
      await flush();
      if (live.current.failure || !live.current.snapshot) return;
      const baseline = live.current.snapshot;
      setPromptRunning(true); live.current.promptRunning = true; setLabel("Working on your prompt…");
      const proposal = await request({ action: "prompt", baseRevision: baseline.revision, prompt });
      if (!canApplyTestProposal(baseline, live.current)) { setPromptResult("The document changed while the prompt ran. The proposal was preserved for export."); setPreservedProposal(proposal); return; }
      live.current.promptRunning = false;
      if (!installDraft(proposal.document)) throw new Error("The proposed change could not be applied.");
      await flush(); setPromptResult(proposal.explanation || "Prompt changes saved locally.");
    } catch (error) { setPromptResult(error instanceof Error ? error.message : "Prompt failed; the site was preserved."); }
    finally { live.current.promptRunning = false; setPromptRunning(false); }
  }
  async function exportDraft() {
    const current = live.current;
    const base = pending.current?.base ?? current.snapshot?.document;
    const revision = base ? legacyBase.current && equal(base, legacyBase.current.document) ? legacyBase.current.revision : await documentRevision(base) : undefined;
    const blob = new Blob([JSON.stringify(testDraftRecoveryEnvelope(current.draft, revision, preservedProposal), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = `${siteId}-unsaved-draft.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function reconnect() {
    if (reconnecting || promptRunning) return;
    if (authorityRecoveryPending.current || live.current.failure && authorityFailureMessage(live.current.failure, siteName)) { recoverConnectionAuthority(); return; }
    setReconnecting(true);
    try { await saving.current; } catch { /* The user is reconnecting to inspect a failed or interrupted save. */ }
    if ((pending.current || preservedProposal || conflict.current) && !window.confirm(`Reload ${siteName} and discard the current draft? Export it first if you need to keep it.`)) { setReconnecting(false); return; }
    pending.current = null; conflict.current = null; setSyncConflict(null); setPast([]); setFuture([]);
    setPreservedProposal(null); setSyncResolutionError(null);
    live.current.failure = null; setFailure(null); setIsClaimed(false); setLabel(`Connecting to ${siteName}…`);
    setAttempt(value => value + 1);
  }
  return { siteId, siteName, snapshot, draft, writable, label, failure, syncStatus, syncConflict, syncResolutionError, resolveSyncConflict, promptRunning, reconnecting, promptResult, installDraft, updateDraft, undo, redo, canUndo: writable && past.length > 0, canRedo: writable && future.length > 0, submitPrompt, reconnect, exportDraft, flush, pauseEditing };
}
