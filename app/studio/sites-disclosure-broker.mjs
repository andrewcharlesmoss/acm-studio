import { studioWriteOwnership } from "./write-ownership.ts";
import { readSitesDisclosure, sitesDisclosureKey, sitesDisclosureChangedEvent, validSitesDisclosure } from "./sites-disclosure-contract.mjs";

const channelName = "acm-studio-sites-disclosure-commands-v1";
const validId = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const validMessage = message => message && message.version === 1 && validId(message.id) && validSitesDisclosure(message.mode);

/** Fixed preference only: peers never receive a general storage-writing capability. */
export function startSitesDisclosureHost() {
  if (typeof BroadcastChannel !== "function") return () => {};
  const channel = new BroadcastChannel(channelName);
  const receipts = new Map();
  let active = true;
  channel.onmessage = event => {
    const message = event.data;
    if (!active || !validMessage(message) || message.type !== "save" || !Number.isFinite(message.expiresAt)
      || message.expiresAt < Date.now() || message.expiresAt > Date.now() + 6000 || !studioWriteOwnership.canWrite()) return;
    for (const [id, receipt] of receipts) if (receipt.expiresAt < Date.now()) receipts.delete(id);
    let receipt = receipts.get(message.id);
    if (receipt && receipt.mode !== message.mode) return;
    if (!receipt) {
      if (receipts.size >= 64) return;
      const result = studioWriteOwnership.write(async () => {
        if (!active || message.expiresAt < Date.now()) return { saved: false };
        readSitesDisclosure(window.localStorage);
        window.localStorage.setItem(sitesDisclosureKey, message.mode);
        return { saved: true };
      }).catch(() => ({ saved: false })).then(result => {
        if (result.saved) window.dispatchEvent(new Event(sitesDisclosureChangedEvent));
        return result;
      });
      receipt = { mode: message.mode, expiresAt: message.expiresAt, result };
      receipts.set(message.id, receipt);
    }
    void receipt.result.then(result => {
      if (active) channel.postMessage({ version: 1, type: "saved", id: message.id, mode: message.mode, saved: result.saved });
    });
  };
  return () => { active = false; channel.close(); };
}

export function saveSitesDisclosureThroughOwner(mode) {
  if (!validSitesDisclosure(mode) || typeof BroadcastChannel !== "function") return Promise.resolve({ saved: false, reason: "blocked" });
  return new Promise(resolve => {
    const channel = new BroadcastChannel(channelName);
    const id = crypto.randomUUID();
    const expiresAt = Date.now() + 5000;
    const finish = result => { clearInterval(retry); clearTimeout(timeout); channel.close(); resolve(result); };
    channel.onmessage = event => {
      const message = event.data;
      if (validMessage(message) && message.type === "saved" && message.id === id && message.mode === mode && typeof message.saved === "boolean") {
        finish(message.saved ? { saved: true } : { saved: false, reason: "storage" });
      }
    };
    const send = () => channel.postMessage({ version: 1, type: "save", id, mode, expiresAt });
    // Retry the same bounded command while an owning route finishes mounting.
    const retry = setInterval(send, 250);
    const timeout = setTimeout(() => finish({ saved: false, reason: "owner-unavailable" }), 5000);
    send();
  });
}
