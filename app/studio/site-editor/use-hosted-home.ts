"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { flushHostedHome, hostedHomeProtocol, validHostedHomeMessage, boundedHostedSaveStatus, validHostedSaveStatus, validHostedSitePreview, type HostedSaveStatus, type HostedSitePreview } from "./hosted-home-contract";
import type { LocalFixtureSiteId } from "../test-site/sites";
export function useHostedHome(site: LocalFixtureSiteId | null, adapter: Parameters<typeof flushHostedHome>[0], onTemplateVisibilityChange: (showTemplate: boolean) => void, targetId?: string, editImmediately = false, saveStatus?: HostedSaveStatus, recovery?: { reconnect(): void; exportDraft(): void }) {
  const sessionId = useRef<string | null>(null);
  if (sessionId.current === null) sessionId.current = crypto.randomUUID();
  const [acknowledgedStatus, setAcknowledgedStatus] = useState<string | null>(null);
  const statusKey = JSON.stringify([site, targetId, saveStatus ? boundedHostedSaveStatus(saveStatus) : null]);
  const recoveryHosted = acknowledgedStatus === statusKey;
  const [prepared, setPrepared] = useState(false);
  const [editing, setEditing] = useState(editImmediately);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewState, setPreview] = useState<{ key: string; value: HostedSitePreview | null } | null>(null);
  const previewKey = site ? `${site}:${targetId ?? ""}` : "";
  const preparing = useRef<Promise<boolean> | null>(null);
  const announce = useCallback((next: boolean) => { if (site) window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "mode", sessionId: sessionId.current, editing: next }, window.location.origin); }, [site, targetId]);
  const prepare = () => {
    if (preparing.current) return preparing.current;
    setBusy(true);
    const pending = flushHostedHome(adapter).then(accepted => {
      if (accepted) setPrepared(true);
      if (!accepted) setFeedback("The draft could not be safely saved. Keep this editor open and resolve its saving problem before leaving.");
      return accepted;
    }).finally(() => { preparing.current = null; setBusy(false); });
    preparing.current = pending;
    return pending;
  };
  async function returnToPreview() {
    const accepted = await prepare();
    if (accepted) { adapter.pause?.(false); setPrepared(false); setEditing(false); setFeedback(""); announce(false); }
    return accepted;
  }
  const announceStatus = useEffectEvent(() => {
    if (site && saveStatus) window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "save-status", status: boundedHostedSaveStatus(saveStatus) }, window.location.origin);
  });
  useEffect(() => { announceStatus(); }, [site, targetId, saveStatus?.label, saveStatus?.warning, saveStatus?.reconnecting]);
  useEffect(() => {
    if (!site || previewState?.key !== previewKey || !previewState.value) return;
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "site-preview-applied", sessionId: sessionId.current, previewId: previewState.value.previewId }, window.location.origin);
  }, [site, targetId, previewKey, previewState]);
  const handle = useEffectEvent(async (event: MessageEvent) => {
    if (!site || !validHostedHomeMessage(event, window.parent, window.location.origin, site, targetId)) return;
    if (event.data.action === "request-session" && typeof event.data.challenge === "string" && /^[0-9a-f-]{36}$/i.test(event.data.challenge)) {
      window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "ready", sessionId: sessionId.current, challenge: event.data.challenge }, window.location.origin);
      return;
    }
    if (event.data.action === "confirm-session" && event.data.sessionId === sessionId.current && typeof event.data.challenge === "string" && /^[0-9a-f-]{36}$/i.test(event.data.challenge)) {
      window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "session-confirmed", sessionId: sessionId.current, challenge: event.data.challenge }, window.location.origin);
      announce(editing);
      return;
    }
    if (event.data.action === "set-site-preview") {
      if (event.data.preview === null) setPreview({ key: `${site}:${targetId ?? ""}`, value: null });
      else if (validHostedSitePreview(event.data.preview, event.origin)) {
        const value = event.data.preview;
        if (previewState?.key === previewKey && previewState.value?.previewId === value.previewId) {
          window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "site-preview-applied", sessionId: sessionId.current, previewId: value.previewId }, window.location.origin);
        } else setPreview({ key: previewKey, value });
      } else if (Number.isSafeInteger(event.data.preview?.previewId) && event.data.preview.previewId > 0) {
        window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "site-preview-rejected", sessionId: sessionId.current, previewId: event.data.preview.previewId }, window.location.origin);
      }
      return;
    }
    if (event.data.action === "request-save-status") { announceStatus(); return; }
    if (event.data.action === "host-recovery") {
      if (saveStatus && validHostedSaveStatus(event.data.status) && JSON.stringify(event.data.status) === JSON.stringify(boundedHostedSaveStatus(saveStatus))) setAcknowledgedStatus(statusKey);
      return;
    }
    if (event.data.action === "reconnect") { recovery?.reconnect(); return; }
    if (event.data.action === "export-draft") { recovery?.exportDraft(); return; }
    if (event.data.action === "edit") {
      adapter.pause?.(false); setPrepared(false); setFeedback(""); setEditing(true); announce(true);
      return;
    }
    if (event.data.action === "set-template-visibility" && typeof event.data.showTemplate === "boolean") {
      onTemplateVisibilityChange(event.data.showTemplate);
      return;
    }
    if ((event.data.action !== "prepare-leave" && event.data.action !== "return-to-preview") || typeof event.data.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(event.data.requestId)) return;
    const accepted = editing ? await (event.data.action === "return-to-preview" ? returnToPreview() : prepare()) : true;
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "leave-result", requestId: event.data.requestId, accepted }, window.location.origin);
  });
  useEffect(() => {
    if (!site) return;
    const listener = (event: MessageEvent) => { void handle(event); };
    window.addEventListener("message", listener);
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "ready", sessionId: sessionId.current }, window.location.origin);
    if (editImmediately) announce(true);
    return () => window.removeEventListener("message", listener);
  }, [site, targetId, editImmediately, announce]);
  return { editing, busy, prepared, feedback, recoveryHosted, preview: previewState?.key === previewKey ? previewState.value : null, edit() { adapter.pause?.(false); setPrepared(false); setEditing(true); announce(true); }, returnToPreview };
}
