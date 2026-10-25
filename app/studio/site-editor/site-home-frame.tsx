"use client";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { hostedHomeHref, hostedPageHref, hostedHomeProtocol, validHostedHomeMessage, validHostedSaveStatus, type HostedSaveStatus } from "./hosted-home-contract";
import type { LocalFixtureSiteId } from "../test-site/sites";
import type { StudioTemplateTarget } from "../use-studio-screen-navigation";
export type SiteHomeFrameHandle = { prepareLeave(): Promise<boolean>; returnToPreview(): Promise<boolean>; reconnect(): void; exportDraft(): void };
export function SiteHomeFrame({ site, documentId, documentTitle, editRequest, handleRef, onEditing, onReopenPanes, onOpenTemplate, viewportWidth, showTemplate, onSaveStatus }: { site: LocalFixtureSiteId; documentId?: string; documentTitle?: string; editRequest?: number | null; handleRef: Ref<SiteHomeFrameHandle>; onEditing: (editing: boolean) => void; onReopenPanes: () => void; onOpenTemplate: (site: LocalFixtureSiteId, target: StudioTemplateTarget) => void; viewportWidth?: number; showTemplate: boolean; onSaveStatus?: (status: HostedSaveStatus) => void }) {
  const targetName = documentId ? "page" : "home page";
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const [connected, setConnected] = useState(false);
  const sentEditRequest = useRef<number | null>(null);
  const pending = useRef<{ id: string; resolve: (accepted: boolean) => void; timeout: ReturnType<typeof setTimeout> | null } | null>(null);
  // The embedded editor owns loading status; this frame reports transition failures only.
  const [feedback, setFeedback] = useState("");
  const requestTransition = useCallback((action: "prepare-leave" | "return-to-preview") => {
    if (pending.current) return Promise.resolve(false);
    if (!ready.current || !frame.current?.contentWindow) { setFeedback(`The ${targetName} editor has not connected. Keep this view open and wait before leaving the editor.`); return Promise.resolve(false); }
    return new Promise<boolean>(resolve => {
      const id = crypto.randomUUID();
      // Return retains the old in-editor behaviour: keep saving pending until its owner finishes.
      // Only departures time out; a late return must not collapse an editor reported as retained.
      const timeout = action === "prepare-leave" ? setTimeout(() => { pending.current = null; setFeedback(`The ${targetName} editor did not confirm saving. Your current view has been kept.`); resolve(false); }, 20000) : null;
      pending.current = { id, resolve, timeout };
      frame.current!.contentWindow!.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action, requestId: id }, window.location.origin);
    });
  }, [site, documentId, targetName]);
  const recover = useCallback((action: "reconnect" | "export-draft") => {
    if (ready.current) frame.current?.contentWindow?.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action }, window.location.origin);
  }, [site, documentId]);
  const prepareLeave = useCallback(() => requestTransition("prepare-leave"), [requestTransition]);
  useImperativeHandle(handleRef, () => ({ prepareLeave, returnToPreview: () => requestTransition("return-to-preview"), reconnect: () => recover("reconnect"), exportDraft: () => recover("export-draft") }), [prepareLeave, requestTransition, recover]);
  useEffect(() => {
    if (!ready.current || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action: "set-template-visibility", showTemplate }, window.location.origin);
  }, [site, documentId, showTemplate]);
  useEffect(() => {
    if (!connected || editRequest === undefined || editRequest === null || sentEditRequest.current === editRequest || !frame.current?.contentWindow) return;
    sentEditRequest.current = editRequest;
    frame.current.contentWindow.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action: "edit" }, window.location.origin);
  }, [connected, documentId, editRequest, site]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!validHostedHomeMessage(event, frame.current?.contentWindow ?? null, window.location.origin, site, documentId)) return;
      if (event.data.action === "ready") {
        ready.current = true;
        setConnected(true);
        setFeedback("");
        frame.current?.contentWindow?.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action: "request-save-status" }, window.location.origin);
        frame.current?.contentWindow?.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action: "set-template-visibility", showTemplate }, window.location.origin);
      }
      if (event.data.action === "save-status" && validHostedSaveStatus(event.data.status) && onSaveStatus) {
        onSaveStatus(event.data.status);
        frame.current?.contentWindow?.postMessage({ protocol: hostedHomeProtocol, site, ...(documentId ? { documentId } : {}), action: "host-recovery", status: event.data.status }, window.location.origin);
      }
      if (event.data.action === "mode" && typeof event.data.editing === "boolean") onEditing(event.data.editing);
      if (event.data.action === "reopen-panes") onReopenPanes();
      if (event.data.action === "open-template" && typeof event.data.setId === "string" && typeof event.data.targetId === "string" && event.data.setId.length > 0 && event.data.setId.length <= 200 && event.data.targetId.length > 0 && event.data.targetId.length <= 200) {
        void (async () => {
          if (await prepareLeave()) onOpenTemplate(site, { setId: event.data.setId, targetId: event.data.targetId, scope: "global" });
        })();
      }
      if (event.data.action === "leave-result" && pending.current && event.data.requestId === pending.current.id && typeof event.data.accepted === "boolean") {
        const request = pending.current; pending.current = null; if (request.timeout) clearTimeout(request.timeout);
        if (!event.data.accepted) setFeedback(`The ${targetName} draft could not be safely saved. Resolve its saving problem before leaving the editor.`);
        request.resolve(event.data.accepted);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [site, documentId, onEditing, onReopenPanes, onOpenTemplate, prepareLeave, showTemplate, targetName, onSaveStatus]);
  useEffect(() => () => {
    if (pending.current) {
      if (pending.current.timeout) clearTimeout(pending.current.timeout);
      pending.current.resolve(false); pending.current = null;
    }
  }, [site, documentId]);
  const src = documentId ? hostedPageHref(site, documentId) : hostedHomeHref(site);
  return <div className="site-editor-home-host" style={viewportWidth ? { width: `min(${viewportWidth}px, 100%)`, marginInline: "auto" } : undefined}>
    {feedback ? <p role="status">{feedback}</p> : null}<iframe ref={frame} title={`${site === "test" ? "Test" : "Test2"} page preview${documentTitle ? `: ${documentTitle}` : ""}`} src={src} />
  </div>;
}
