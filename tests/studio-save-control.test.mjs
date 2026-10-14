import test from "node:test";
import assert from "node:assert/strict";
import { studioSaveControlState } from "../app/studio/studio-save-control.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { StudioHeader } = await loadProductionModule(new URL("../app/studio/studio-header.tsx", import.meta.url));
const noop = () => {};
function header(kind, status, siteId, overrides = {}) {
  return renderToStaticMarkup(createElement(StudioHeader, {
    studioSection: "content", hasContentDocuments: true,
    activeDocument: { kind, status, title: "Fixture", slug: "fixture" },
    saveLabel: "Saved locally", templateSession: { saveLabel: "Saved locally" },
    canRetryEditing: false, retryEditing: noop, previewWindow: false,
    viewViewport: "desktop", setViewViewport: noop, showTemplate: true, hasTemplate: false,
    setShowTemplate: noop, switchStudioMode: noop, publishing: { publish: noop },
    writable: true, onSaveDocument: noop, onExportDocument: noop,
    siteContext: siteId ? { siteId, writable: true, onSave: noop, onPublish: noop, publishing: false } : undefined,
    ...overrides,
  }));
}

test("header Save and Publish use the same shared button sizing in Drafts, Test and Test2", () => {
  for (const siteId of [undefined, "test", "test2"]) for (const kind of ["page", "post"]) {
    const saved = header(kind, "published", siteId);
    assert.match(saved, /<button[^>]*class="acm-button studio-save-button studio-header-action"[^>]*>Save<\/button>/);
    const draft = header(kind, "draft", siteId);
    assert.match(draft, /<button[^>]*class="[^"]*studio-save-button studio-header-action"[^>]*>Save Draft<\/button>/);
    if (siteId || kind === "post") assert.match(draft, /<button[^>]*class="acm-button studio-header-action"[^>]*>Publish<\/button>/);
    assert.doesNotMatch(draft, /class="button-primary"[^>]*>Publish<\/button>/);
  }
});

test("shared sizing retains save and publish disabled states and longer in-progress labels", () => {
  const saving = header("page", "draft", "test", {
    saveLabel: "Saving…", siteContext: { siteId: "test", writable: true, onSave: noop, onPublish: noop, publishing: true },
  });
  assert.match(saving, /<button[^>]*disabled=""[^>]*class="[^"]*studio-header-action"[^>]*>Saving…<\/button>/);
  assert.match(saving, /<button[^>]*disabled=""[^>]*class="acm-button studio-header-action"[^>]*>Publishing…<\/button>/);
  const unavailable = header("post", "draft", "test2", {
    siteContext: { siteId: "test2", writable: false, onSave: noop, onPublish: noop, publishing: false },
  });
  assert.match(unavailable, /<button[^>]*disabled=""[^>]*class="acm-button studio-header-action"[^>]*>Publish<\/button>/);
});

test("save control reflects the actual persistence status without treating failures as saved", () => {
  assert.equal(studioSaveControlState("Unsaved changes"), "draft");
  assert.equal(studioSaveControlState("Could not save locally"), "draft");
  assert.equal(studioSaveControlState("QuotaExceededError: storage is full"), "draft");
  assert.equal(studioSaveControlState("Saving…"), "saving");
  assert.equal(studioSaveControlState("Saved locally 09:42"), "saved");
  assert.equal(studioSaveControlState("Published locally just now"), "saved");
  assert.equal(studioSaveControlState("Draft saved locally"), "saved");
  assert.equal(studioSaveControlState("Post scheduled locally"), "saved");
  assert.equal(studioSaveControlState("Synced with another Test2 tab"), "saved");
  assert.equal(studioSaveControlState("Waiting for Test save handover…"), "unavailable");
  assert.equal(studioSaveControlState("Local saving unavailable — editing is paused"), "unavailable");
  assert.equal(studioSaveControlState("Preparing local workspace…"), "unavailable");
});
