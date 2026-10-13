import { createDesignSync, type DesignSyncChannel, type DesignSyncSession } from "./design-sync";
import { loadDesigns, saveDesign } from "./design-store";
import type { DesignProject } from "./design-model";

export const DESIGN_BROKER_DISCOVERY = "acm-studio-design-brokers-v1";

export function requestDesignBroker(designId: string) {
  if (typeof BroadcastChannel !== "function") return;
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(DESIGN_BROKER_DISCOVERY);
    channel.postMessage({ version: 1, kind: "request", designId });
  } catch { /* Saving remains paused if the browser cannot open a channel. */ }
  finally { channel?.close(); }
}

/** Every lifetime writer serves design rooms, independently of its visible route. */
export function createDesignBrokerHost({ load = loadDesigns, persist = saveDesign,
  canWrite, channelFactory = name => new BroadcastChannel(name) as unknown as DesignSyncChannel,
}: { load?: () => DesignProject[]; persist?: (snapshot: DesignProject) => Promise<void>;
  canWrite: () => boolean; channelFactory?: (name: string) => DesignSyncChannel | null }) {
  const sessions = new Map<string, DesignSyncSession>();
  let closed = false;
  let discovery: DesignSyncChannel | null = null;
  try { discovery = channelFactory(DESIGN_BROKER_DISCOVERY); } catch { /* Design clients remain read-only. */ }
  function refresh() {
    if (closed || !canWrite()) return;
    const designs = load();
    for (const design of designs) {
      if (sessions.has(design.id)) continue;
      sessions.set(design.id, createDesignSync({ designId: design.id, initialSnapshot: design,
        role: "primary", channelFactory, loadAuthoritative: () => {
          const current = load().find(item => item.id === design.id);
          if (!current) throw new Error("This saved design is no longer available.");
          return current;
        }, onSnapshot: () => {}, persistPrimary: async snapshot => {
          if (closed || !canWrite()) throw new Error("Design saving ownership changed.");
          await persist(snapshot);
        } }));
    }
    for (const [id, session] of sessions) if (!designs.some(item => item.id === id)) { session.close(); sessions.delete(id); }
  }
  const onRequest = (event: { data: unknown }) => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    const value = message as Record<string, unknown>;
    if (Object.keys(value).sort().join(",") !== "designId,kind,version" || value.version !== 1 || value.kind !== "request" || typeof value.designId !== "string" || !value.designId.length || value.designId.length > 180) return;
    try { refresh(); } catch { /* Invalid stored data remains recoverable; no broker can save it. */ }
  };
  discovery?.addEventListener("message", onRequest);
  try { refresh(); } catch { /* The editor reports its own storage error. */ }
  return { refresh, close() { closed = true; sessions.forEach(session => session.close()); sessions.clear(); discovery?.removeEventListener("message", onRequest); discovery?.close(); } };
}
