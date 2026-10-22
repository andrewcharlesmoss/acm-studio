"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { flushHostedHome, hostedHomeProtocol, validHostedHomeMessage } from "./hosted-home-contract";
import type { LocalFixtureSiteId } from "../test-site/sites";
export function useHostedHome(site: LocalFixtureSiteId | null, adapter: Parameters<typeof flushHostedHome>[0]) {
  const [prepared, setPrepared] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const preparing = useRef<Promise<boolean> | null>(null);
  function announce(next: boolean) { if (site) window.parent.postMessage({ protocol: hostedHomeProtocol, site, action: "mode", editing: next }, window.location.origin); }
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
  const handle = useEffectEvent(async (event: MessageEvent) => {
    if (!site || !validHostedHomeMessage(event, window.parent, window.location.origin, site)) return;
    if (event.data.action !== "prepare-leave" || typeof event.data.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(event.data.requestId)) return;
    const accepted = editing ? await prepare() : true;
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, action: "leave-result", requestId: event.data.requestId, accepted }, window.location.origin);
  });
  useEffect(() => {
    if (!site) return;
    const listener = (event: MessageEvent) => { void handle(event); };
    window.addEventListener("message", listener);
    window.parent.postMessage({ protocol: hostedHomeProtocol, site, action: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", listener);
  }, [site]);
  return { editing, busy, prepared, feedback, edit() { adapter.pause?.(false); setPrepared(false); setEditing(true); announce(true); }, async returnToPreview() { if (await prepare()) { adapter.pause?.(false); setPrepared(false); setEditing(false); setFeedback(""); announce(false); } } };
}
