import { useSyncExternalStore } from "react";
import { MEDIA_COMMAND_PROTOCOL, MEDIA_RENDITION_CAPABILITY, MEDIA_REQUEST_LIFETIME_MS, MediaCommandError, mediaId, mediaRecord, validateMediaCommand, validateMediaRequest, type MediaCommand, type MediaRequest } from "./media-command";
import { applyMediaRequest, MEDIA_STORE_CHANGED } from "./media-store";
import { studioWriteOwnership } from "./write-ownership";

const ROOM = MEDIA_COMMAND_PROTOCOL;
const listeners = new Set<() => void>();
let revision = 0;
let error = "";
let ready = false;
let renditionSupport = false;
let generation = "";
let channel: BroadcastChannel | null = null;
let ownerId = "";
let lastSeen = 0;
const pending = new Map<string, { request: MediaRequest; resolve: () => void; reject: (error: Error) => void }>();
const notify = () => listeners.forEach(listener => listener());
const changed = () => { revision++; notify(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => `${ready ? "ready" : "waiting"}:${revision}:${error}`;

export function useMediaSession() {
  const state = useSyncExternalStore(subscribe, snapshot, () => "waiting:0");
  return { ready: state.startsWith("ready:"), revision: Number(state.split(":")[1]), error: state.split(":").slice(2).join(":"), supportsImageRenditions: state.startsWith("ready:") && renditionSupport };
}

function renditionUnavailable(uncertain = false) {
  return new MediaCommandError(uncertain
    ? "The image size save could not be confirmed. Refresh the Files owner and check the current image before trying again."
    : "Image sizes are unavailable in the current Files owner. Refresh the tab that owns Files and try again.", "unavailable");
}

export function startMediaClient() {
  if (typeof BroadcastChannel !== "function") { error = "This browser cannot coordinate Files saving. Browsing and downloads remain available."; notify(); return () => {}; }
  const client = new BroadcastChannel(ROOM);
  const clientId = crypto.randomUUID();
  currentClientId = clientId;
  channel = client;
  const send = (request: MediaRequest) => client.postMessage({ protocol: ROOM, kind: "request", clientId, ownerId, request });
  client.onmessage = event => {
    const message: unknown = event.data;
    if (!mediaRecord(message) || message.protocol !== ROOM || !mediaId(message.ownerId)) return;
    if (message.kind === "available" && mediaId(message.generation)) {
      error = "";
      const newOwner = ownerId !== message.ownerId;
      const newGeneration = generation !== message.generation;
      const wasReady = ready;
      const supported = Array.isArray(message.capabilities) && message.capabilities.length <= 16 && message.capabilities.includes(MEDIA_RENDITION_CAPABILITY);
      const supportChanged = supported !== renditionSupport;
      renditionSupport = supported;
      ownerId = message.ownerId; generation = message.generation; lastSeen = Date.now(); ready = true;
      if (newGeneration || !wasReady || supportChanged) changed();
      if (newOwner || newGeneration || !wasReady || supportChanged) for (const [id, item] of pending) {
        if (item.request.generation !== generation) {
          pending.delete(id); item.reject(new MediaCommandError("The library was restored or replaced. Your change was kept for review.", "replaced"));
        } else if (item.request.command.kind === "generate-image-renditions" && !supported) {
          pending.delete(id); item.reject(renditionUnavailable(true));
        } else if (newOwner || !wasReady) send(item.request);
      }
    } else if (message.kind === "unavailable" && typeof message.error === "string") {
      error = message.error.slice(0, 500); ready = false; notify();
    } else if (message.ownerId === ownerId && message.kind === "paused") {
      ready = false; notify();
    } else if (message.ownerId === ownerId && message.kind === "changed") {
      changed();
    } else if (message.ownerId === ownerId && message.kind === "result" && message.clientId === clientId && mediaId(message.id) && typeof message.ok === "boolean") {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      if (message.ok) { changed(); item.resolve(); }
      else {
        const code = ["conflict", "replaced", "unavailable", "invalid"].includes(String(message.code)) ? message.code as MediaCommandError["code"] : "invalid";
        item.reject(new MediaCommandError(typeof message.error === "string" ? message.error.slice(0, 500) : "The file action could not be saved.", code));
      }
    }
  };
  const tick = () => {
    if (ready && Date.now() - lastSeen > 3500) { ready = false; notify(); }
    for (const [id, item] of pending) if (Date.now() - Date.parse(item.request.submittedAt) > MEDIA_REQUEST_LIFETIME_MS) {
      pending.delete(id); item.reject(new MediaCommandError("Saving could not be confirmed. Check the latest files before trying again.", "unavailable"));
    }
    client.postMessage({ protocol: ROOM, kind: "hello", clientId });
  };
  tick();
  const timer = window.setInterval(tick, 1000);
  // The owner also observes its own direct Design and restore writes.
  window.addEventListener(MEDIA_STORE_CHANGED, changed);
  return () => {
    window.clearInterval(timer); window.removeEventListener(MEDIA_STORE_CHANGED, changed);
    client.close(); if (channel === client) channel = null;
    ready = false; renditionSupport = false; ownerId = ""; notify();
    for (const item of pending.values()) item.reject(new MediaCommandError("Files reconnecting. Your unsaved change was kept.", "unavailable"));
    pending.clear();
  };
}

export function submitMediaCommand(command: MediaCommand): Promise<void> {
  if (!channel || !ready) return Promise.reject(new MediaCommandError("Files are reconnecting. Your change has not been saved yet.", "unavailable"));
  if (pending.size >= 64) return Promise.reject(new MediaCommandError("Wait for the current file actions to finish.", "unavailable"));
  let captured: MediaCommand;
  try {
    if (!validateMediaCommand(command)) throw new Error("Invalid command");
    captured = structuredClone(command);
  } catch { return Promise.reject(new MediaCommandError("The file action is invalid or exceeds the local upload limit.")); }
  if (captured.kind === "generate-image-renditions" && !renditionSupport) return Promise.reject(renditionUnavailable());
  const request: MediaRequest = { id: crypto.randomUUID(), generation, submittedAt: new Date().toISOString(), command: captured };
  if (!validateMediaRequest(request)) return Promise.reject(new MediaCommandError("The file action is invalid or exceeds the local upload limit."));
  return new Promise((resolve, reject) => {
    pending.set(request.id, { request, resolve, reject });
    channel!.postMessage({ protocol: ROOM, kind: "request", clientId: currentClientId, ownerId, request });
  });
}

// Kept separate from the saving owner: even its own Files UI uses the protocol.
let currentClientId = "";

export function reportMediaUnavailable() {
  error = "Files could not load for saving. Retrying automatically; browsing and downloads remain available.";
  ready = false; notify();
  const notice = new BroadcastChannel(ROOM);
  notice.postMessage({ protocol: ROOM, kind: "unavailable", ownerId: crypto.randomUUID(), error });
  notice.close();
}

export type MediaHostAdapter = {
  ownership: Pick<typeof studioWriteOwnership, "canWrite">;
  applyMediaRequest: typeof applyMediaRequest;
  supportsImageRenditions: () => boolean;
};

export function createMediaHost(hostGeneration: string, adapter?: MediaHostAdapter) {
  const ownership = adapter?.ownership ?? studioWriteOwnership;
  const applyRequest = adapter?.applyMediaRequest ?? applyMediaRequest;
  const supportsRenditions = adapter?.supportsImageRenditions ?? (() => false);
  const host = new BroadcastChannel(ROOM);
  const id = crypto.randomUUID();
  let closed = false;
  let queued = 0;
  let queue = Promise.resolve();
  const available = () => {
    if (!closed && ownership.canWrite()) host.postMessage({ protocol: ROOM, kind: "available", ownerId: id, generation: hostGeneration, ...(supportsRenditions() ? { capabilities: [MEDIA_RENDITION_CAPABILITY] } : {}) });
  };
  host.onmessage = event => {
    const message: unknown = event.data;
    if (!mediaRecord(message) || message.protocol !== ROOM || !mediaId(message.clientId)) return;
    if (message.kind === "hello") { available(); return; }
    if (message.kind !== "request" || message.ownerId !== id || !validateMediaRequest(message.request)) return;
    const request = message.request;
    const clientId = message.clientId;
    const result = (ok: boolean, error?: unknown) => {
      if (!closed) host.postMessage({ protocol: ROOM, kind: "result", ownerId: id, clientId, id: request.id, ok, error: error instanceof Error ? error.message.slice(0, 500) : undefined, code: error instanceof MediaCommandError ? error.code : "invalid" });
    };
    // Capability is deliberately not advertised until storage and backup
    // support are available. Reject forged or stale requests explicitly.
    if (request.command.kind === "generate-image-renditions" && !supportsRenditions()) { result(false, renditionUnavailable()); return; }
    if (closed || !ownership.canWrite() || queued >= 64) { result(false, new MediaCommandError("Files saving is paused. Try again when it reconnects.", "unavailable")); return; }
    queued++;
    queue = queue.then(async () => {
      try {
        if (closed || !ownership.canWrite()) throw new MediaCommandError("Files saving is paused.", "unavailable");
        await applyRequest(request); result(true);
      } catch (error) { result(false, error); }
      finally { queued--; }
    });
  };
  const broadcast = () => { if (!closed) host.postMessage({ protocol: ROOM, kind: "changed", ownerId: id }); };
  window.addEventListener(MEDIA_STORE_CHANGED, broadcast);
  const timer = window.setInterval(available, 1000);
  available();
  return () => {
    host.postMessage({ protocol: ROOM, kind: "paused", ownerId: id });
    closed = true; window.clearInterval(timer); window.removeEventListener(MEDIA_STORE_CHANGED, broadcast); host.close();
  };
}
