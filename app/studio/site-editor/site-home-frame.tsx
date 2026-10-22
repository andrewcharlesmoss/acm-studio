"use client";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { hostedHomeHref, hostedHomeProtocol, validHostedHomeMessage } from "./hosted-home-contract";
import type { LocalFixtureSiteId } from "../test-site/sites";
export type SiteHomeFrameHandle = { prepareLeave(): Promise<boolean> };
export function SiteHomeFrame({ site, handleRef, onEditing }: { site: LocalFixtureSiteId; handleRef: Ref<SiteHomeFrameHandle>; onEditing: (editing: boolean) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const pending = useRef<{ id: string; resolve: (accepted: boolean) => void; timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [feedback, setFeedback] = useState("Loading the authored home page…");
  useImperativeHandle(handleRef, () => ({ prepareLeave() {
    if (pending.current) return Promise.resolve(false);
    if (!ready.current || !frame.current?.contentWindow) { setFeedback("The home editor has not connected. Keep this view open and wait before switching sites."); return Promise.resolve(false); }
    return new Promise(resolve => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => { pending.current = null; setFeedback("The home editor did not confirm saving. Your current view has been kept."); resolve(false); }, 20000);
      pending.current = { id, resolve, timeout };
      frame.current!.contentWindow!.postMessage({ protocol: hostedHomeProtocol, site, action: "prepare-leave", requestId: id }, window.location.origin);
    });
  } }), [site]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!validHostedHomeMessage(event, frame.current?.contentWindow ?? null, window.location.origin, site)) return;
      if (event.data.action === "ready") { ready.current = true; setFeedback(""); }
      if (event.data.action === "mode" && typeof event.data.editing === "boolean") onEditing(event.data.editing);
      if (event.data.action === "leave-result" && pending.current && event.data.requestId === pending.current.id && typeof event.data.accepted === "boolean") {
        const request = pending.current; pending.current = null; clearTimeout(request.timeout);
        if (!event.data.accepted) setFeedback("The home draft could not be safely saved. Resolve its saving problem before switching sites.");
        request.resolve(event.data.accepted);
      }
    };
    window.addEventListener("message", listener);
    return () => { window.removeEventListener("message", listener); if (pending.current) { clearTimeout(pending.current.timeout); pending.current.resolve(false); pending.current = null; } };
  }, [site, onEditing]);
  return <div className="site-editor-home-host">{feedback ? <p role="status">{feedback}</p> : null}<iframe ref={frame} title={`${site === "test" ? "Test" : "Test2"} authored home page`} src={hostedHomeHref(site)} /></div>;
}
