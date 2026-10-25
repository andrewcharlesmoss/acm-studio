"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { flushHostedHome, hostedHomeProtocol, validHostedHomeMessage, boundedHostedSaveStatus, validHostedSaveStatus, type HostedSaveStatus } from "./hosted-home-contract";
import type { LocalFixtureSiteId } from "../test-site/sites";
export function useHostedHome(site: LocalFixtureSiteId | null, adapter: Parameters<typeof flushHostedHome>[0], onTemplateVisibilityChange: (showTemplate: boolean) => void, targetId?: string, editImmediately = false, saveStatus?: HostedSaveStatus, recovery?: { reconnect(): void; exportDraft(): void }) {
  const [acknowledgedStatus, setAcknowledgedStatus] = useState<string | null>(null);
  const statusKey = JSON.stringify([site, targetId, saveStatus ? boundedHostedSaveStatus(saveStatus) : null]);
  const recoveryHosted = acknowledgedStatus === statusKey;
  const [prepared, setPrepared] = useState(false);
  const [editing, setEditing] = useState(editImmediately);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const preparing = useRef<Promise<boolean> | null>(null);
  function announce(next: boolean) { if (site) window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "mode", editing: next }, window.location.origin); }
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
  const handle = useEffectEvent(async (event: MessageEvent) => {
    if (!site || !validHostedHomeMessage(event, window.parent, window.location.origin, site, targetId)) return;
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
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "ready" }, window.location.origin);
    if (editImmediately) window.parent.postMessage({ protocol: hostedHomeProtocol, site, ...(targetId ? { documentId: targetId } : {}), action: "mode", editing: true }, window.location.origin);
    return () => window.removeEventListener("message", listener);
  }, [site, targetId, editImmediately]);
  return { editing, busy, prepared, feedback, recoveryHosted, edit() { adapter.pause?.(false); setPrepared(false); setEditing(true); announce(true); }, returnToPreview };
}
