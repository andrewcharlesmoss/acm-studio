import { studioWriteOwnership } from "./write-ownership.ts";
import { sitesDisclosureKey, sitesDisclosureChangedEvent, validSitesDisclosure } from "./sites-disclosure-contract.mjs";

import { templatePartViewKeys, templatePartViewChangedEvent, validTemplatePartCanvasView } from "./template-part-view-contract.mjs";
import { pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode } from "./site-editor/pages-preferences-contract.mjs";

const channelName = "acm-studio-sites-disclosure-commands-v1";
const preferences = {
  sites: { key: sitesDisclosureKey, validate: validSitesDisclosure, event: sitesDisclosureChangedEvent },
  header: { key: templatePartViewKeys.header, validate: validTemplatePartCanvasView, event: templatePartViewChangedEvent },
  footer: { key: templatePartViewKeys.footer, validate: validTemplatePartCanvasView, event: templatePartViewChangedEvent },
  pages: { key: pagesPreferenceKey, validate: validPagesPreferenceMode, event: pagesPreferenceChangedEvent },
};
const preferenceOf = message => message.preference ?? "sites"; // Existing disclosure clients remain compatible.
const definition = preference => Object.hasOwn(preferences, preference) ? preferences[preference] : null;
const validId = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const validMessage = message => message && message.version === 1 && validId(message.id) && definition(preferenceOf(message))?.validate(message.mode);

/** Only these fixed preference commands can be submitted to Studio's lock owner. */
export function startStudioPreferenceHost({ ownership = studioWriteOwnership, storage,
  createChannel = name => new BroadcastChannel(name), notify = event => window.dispatchEvent(new Event(event)) } = {}) {
  if (typeof BroadcastChannel !== "function") return () => {};
  const channel = createChannel(channelName);
  const receipts = new Map();
  let queue = Promise.resolve();
  let active = true;
  channel.onmessage = event => {
    const message = event.data;
    if (!active || !validMessage(message) || message.type !== "save" || !Number.isFinite(message.expiresAt)
      || message.expiresAt < Date.now() || message.expiresAt > Date.now() + 6000 || !ownership.canWrite()) return;
    for (const [id, receipt] of receipts) if (receipt.expiresAt < Date.now()) receipts.delete(id);
    const preference = preferenceOf(message);
    const contract = definition(preference);
    let receipt = receipts.get(message.id);
    if (receipt && (receipt.mode !== message.mode || receipt.preference !== preference)) return;
    if (!receipt) {
      if (receipts.size >= 64) return;
      const token = ownership.captureWriteToken();
      const result = queue.then(() => {
        if (!active || !ownership.canWrite(token)) return { saved: false };
        return ownership.write(async () => {
          if (!active || !ownership.canWrite(token) || message.expiresAt < Date.now()) return { saved: false };
          const targetStorage = storage ?? globalThis.window?.localStorage;
          const latest = targetStorage.getItem(contract.key); // Load the latest preference while ownership is held.
          let nextMode = message.mode;
          if (preference === "pages") {
            const incoming = JSON.parse(message.mode);
            let current = {};
            try { current = latest ? JSON.parse(latest) : {}; } catch { current = {}; }
            nextMode = JSON.stringify({ ...current, [incoming.siteId]: incoming.view });
          }
          targetStorage.setItem(contract.key, nextMode);
          let saved = targetStorage.getItem(contract.key) === nextMode;
          if (preference === "pages" && saved) {
            const incoming = JSON.parse(message.mode);
            saved = JSON.stringify(JSON.parse(targetStorage.getItem(contract.key))[incoming.siteId]) === JSON.stringify(incoming.view);
          }
          if (saved) notify(contract.event);
          return { saved };
        });
      }).catch(() => ({ saved: false }));
      queue = result.then(() => undefined);
      receipt = { preference, mode: message.mode, expiresAt: message.expiresAt, result };
      receipts.set(message.id, receipt);
    }
    void receipt.result.then(result => {
      if (active) channel.postMessage({ version: 1, type: "saved", id: message.id, preference, mode: message.mode, saved: result.saved });
    });
  };
  return () => { active = false; channel.close(); };
}

export function saveStudioPreferenceThroughOwner(preference, mode, { createChannel = name => new BroadcastChannel(name), timeoutMs = 5000 } = {}) {
  if (!definition(preference)?.validate(mode) || typeof BroadcastChannel !== "function") return Promise.resolve({ saved: false, reason: "blocked" });
  return new Promise(resolve => {
    const channel = createChannel(channelName);
    const id = crypto.randomUUID();
    const expiresAt = Date.now() + timeoutMs;
    let finished = false;
    const finish = result => { if (finished) return; finished = true; clearInterval(retry); clearTimeout(timeout); channel.close(); resolve(result); };
    channel.onmessage = event => {
      const message = event.data;
      if (validMessage(message) && message.type === "saved" && message.id === id && preferenceOf(message) === preference && message.mode === mode && typeof message.saved === "boolean") {
        finish(message.saved ? { saved: true } : { saved: false, reason: "storage" });
      }
    };
    const send = () => channel.postMessage({ version: 1, type: "save", id, preference, mode, expiresAt });
    const retry = setInterval(send, 250);
    const timeout = setTimeout(() => finish({ saved: false, reason: "owner-unavailable" }), timeoutMs);
    send();
  });
}
