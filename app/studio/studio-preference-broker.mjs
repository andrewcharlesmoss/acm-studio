import { dashboardSiteIds, dashboardToolIds, dashboardOrderKeys, validDashboardOrder } from "./dashboard-order-contract.mjs";
import { readSiteOrder } from "./site-order-repository.mjs";
import { studioWriteOwnership } from "./write-ownership.ts";
import { sitesDisclosureKey, sitesDisclosureChangedEvent, validSitesDisclosure } from "./sites-disclosure-contract.mjs";

import { templatePartViewKeys, templatePartViewChangedEvent, validTemplatePartCanvasView } from "./template-part-view-contract.mjs";
import { pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode } from "./site-editor/pages-preferences-contract.mjs";
import { studioNavigationVisibilityChangedEvent, studioNavigationVisibilityItems, studioNavigationVisibilityKey, validStudioNavigationHiddenTools } from "./studio-navigation-visibility-contract.mjs";

const channelName = "acm-studio-sites-disclosure-commands-v1";
const preferences = {
  dashboardSites: { key: dashboardOrderKeys.sites, ids: dashboardSiteIds, validate: value => validDashboardOrder(value, dashboardSiteIds), event: "acm-studio-dashboard-sites-order-saved" },
  dashboardTools: { key: dashboardOrderKeys.tools, ids: dashboardToolIds, validate: value => validDashboardOrder(value, dashboardToolIds), event: "acm-studio-dashboard-tools-order-saved" },
  toolbarSpacing: { key: "acm-studio-toolbar-spacing-v1", validate: value => value === "on" || value === "off", event: "acm-studio-toolbar-spacing-saved" },
  blockSelectionOutline: { key: "acm-studio-block-selection-outline-v1", validate: value => ["toolbar-hover", "always", "off"].includes(value), event: "acm-studio-block-selection-outline-saved" },
  localNotice: { key: "acm-studio-local-website-notice-dismissed-v1", validate: value => value === "true", event: "acm-studio-local-website-notice-saved" },
  sites: { key: sitesDisclosureKey, validate: validSitesDisclosure, event: sitesDisclosureChangedEvent },
  header: { key: templatePartViewKeys.header, validate: validTemplatePartCanvasView, event: templatePartViewChangedEvent },
  footer: { key: templatePartViewKeys.footer, validate: validTemplatePartCanvasView, event: templatePartViewChangedEvent },
  pages: { key: pagesPreferenceKey, validate: validPagesPreferenceMode, event: pagesPreferenceChangedEvent },
  navigationVisibility: { key: studioNavigationVisibilityKey, validate: validStudioNavigationHiddenTools, event: studioNavigationVisibilityChangedEvent },
};
const preferenceOf = message => message.preference ?? "sites"; // Existing disclosure clients remain compatible.
const definition = preference => Object.hasOwn(preferences, preference) ? preferences[preference] : null;
const validId = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const validMessage = message => message && message.version === 1 && validId(message.id) && (
  message.type === "save" && definition(preferenceOf(message))?.validate(message.mode)
  || message.type === "visibility-update" && preferenceOf(message) === "navigationVisibility"
    && studioNavigationVisibilityItems.some(item => item.id === message.itemId) && typeof message.visible === "boolean"
);
const validSavedMessage = message => message && message.version === 1 && message.type === "saved" && validId(message.id) && (
  definition(preferenceOf(message))?.validate(message.mode)
  || preferenceOf(message) === "navigationVisibility" && message.commandType === "visibility-update"
    && studioNavigationVisibilityItems.some(item => item.id === message.itemId) && typeof message.visible === "boolean"
);

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
    if (!active || !validMessage(message) || !["save", "visibility-update"].includes(message.type) || !Number.isFinite(message.expiresAt)
      || message.expiresAt < Date.now() || message.expiresAt > Date.now() + 6000 || !ownership.canWrite()) return;
    for (const [id, receipt] of receipts) if (receipt.expiresAt < Date.now()) receipts.delete(id);
    const preference = preferenceOf(message);
    const contract = definition(preference);
    let receipt = receipts.get(message.id);
    const command = JSON.stringify({ type: message.type, mode: message.mode, itemId: message.itemId, visible: message.visible });
    if (receipt && (receipt.command !== command || receipt.preference !== preference)) return;
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
          if (message.type === "visibility-update") {
            let hidden = [];
            try {
              const parsed = latest ? JSON.parse(latest) : [];
              if (validStudioNavigationHiddenTools(JSON.stringify(parsed))) hidden = parsed;
            } catch { hidden = []; }
            hidden = message.visible
              ? hidden.filter(id => id !== message.itemId)
              : hidden.includes(message.itemId) ? hidden : [...hidden, message.itemId];
            nextMode = JSON.stringify(hidden);
          }
          if (contract.ids) {
            const incoming = JSON.parse(message.mode);
            const current = readSiteOrder(targetStorage, contract.ids, contract.key);
            if (JSON.stringify(current) !== JSON.stringify(incoming.baseline)) return { saved: false };
            nextMode = JSON.stringify(incoming.order);
          }
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
      receipt = { preference, mode: message.mode, command, expiresAt: message.expiresAt, result };
      receipts.set(message.id, receipt);
    }
    void receipt.result.then(result => {
      if (active) channel.postMessage({ version: 1, type: "saved", id: message.id, preference, mode: message.mode, itemId: message.itemId, visible: message.visible, commandType: message.type, saved: result.saved });
    });
  };
  return () => { active = false; channel.close(); };
}

export function updateStudioNavigationVisibilityThroughOwner(itemId, visible, { createChannel = name => new BroadcastChannel(name), timeoutMs = 5000 } = {}) {
  if (!studioNavigationVisibilityItems.some(item => item.id === itemId) || typeof visible !== "boolean" || typeof BroadcastChannel !== "function") return Promise.resolve({ saved: false, reason: "blocked" });
  return new Promise(resolve => {
    const channel = createChannel(channelName);
    const id = crypto.randomUUID();
    const expiresAt = Date.now() + timeoutMs;
    let finished = false;
    const finish = result => { if (finished) return; finished = true; clearInterval(retry); clearTimeout(timeout); channel.close(); resolve(result); };
    channel.onmessage = event => {
      const message = event.data;
      if (message?.version === 1 && message.type === "saved" && message.id === id && message.preference === "navigationVisibility" && message.commandType === "visibility-update" && message.itemId === itemId && message.visible === visible && typeof message.saved === "boolean") {
        finish(message.saved ? { saved: true } : { saved: false, reason: "storage" });
      }
    };
    const send = () => channel.postMessage({ version: 1, type: "visibility-update", id, preference: "navigationVisibility", itemId, visible, expiresAt });
    const retry = setInterval(send, 250);
    const timeout = setTimeout(() => finish({ saved: false, reason: "owner-unavailable" }), timeoutMs);
    send();
  });
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
      if (validSavedMessage(message) && message.id === id && preferenceOf(message) === preference && message.mode === mode && typeof message.saved === "boolean") {
        finish(message.saved ? { saved: true } : { saved: false, reason: "storage" });
      }
    };
    const send = () => channel.postMessage({ version: 1, type: "save", id, preference, mode, expiresAt });
    const retry = setInterval(send, 250);
    const timeout = setTimeout(() => finish({ saved: false, reason: "owner-unavailable" }), timeoutMs);
    send();
  });
}
