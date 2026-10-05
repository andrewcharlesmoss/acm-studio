import assert from "node:assert/strict";
import test from "node:test";
import { focusOutlineVisible, installStudioFocusPolicy } from "../app/studio/focus-outline-policy.mjs";

function documentFixture(initial = []) {
  const attributes = new Map(initial);
  const listeners = new Map();
  const document = {
    documentElement: { getAttribute: name => attributes.get(name) ?? null, setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name) },
    addEventListener: (name, callback, capture) => { assert.equal(capture, true); listeners.set(name, callback); },
    removeEventListener: (name, callback, capture) => { assert.equal(capture, true); if (listeners.get(name) === callback) listeners.delete(name); },
  };
  return { document, attributes, listeners };
}

test("focus outline modes change visibility, not keyboard navigation", () => {
  for (const modality of ["pointer", "keyboard"]) {
    assert.equal(focusOutlineVisible("on", modality), true);
    assert.equal(focusOutlineVisible("off", modality), false);
    assert.equal(focusOutlineVisible("keyboard", modality), modality === "keyboard");
  }
});

test("keyboard-only mode follows keyboard and pointer usage including native input focus", () => {
  const { document, attributes, listeners } = documentFixture();
  const policy = installStudioFocusPolicy(document);
  assert.equal(attributes.get("data-studio-focus-visible"), "false");
  listeners.get("keydown")({ key: "Shift" });
  assert.equal(attributes.get("data-studio-focus-visible"), "false");
  listeners.get("keydown")({ key: "Tab" });
  assert.equal(attributes.get("data-studio-focus-visible"), "true");
  listeners.get("pointerdown")({ target: { tagName: "INPUT", matches: () => true } });
  assert.equal(attributes.get("data-studio-focus-visible"), "false");
  listeners.get("keydown")({ key: "a" });
  assert.equal(attributes.get("data-studio-focus-visible"), "true");
  policy.dispose();
});

test("mode changes apply immediately and preserve the current modality for open portals", () => {
  const { document, attributes, listeners } = documentFixture();
  const policy = installStudioFocusPolicy(document);
  listeners.get("keydown")({ key: "ArrowDown" });
  policy.setMode("off");
  assert.equal(attributes.get("data-studio-focus-visible"), "false");
  policy.setMode("keyboard");
  assert.equal(attributes.get("data-studio-focus-visible"), "true");
  listeners.get("pointerdown")({});
  policy.setMode("on");
  assert.equal(attributes.get("data-studio-focus-visible"), "true");
  policy.dispose();
});

test("leaving Studio removes listeners and restores prior document attributes", () => {
  const { document, attributes, listeners } = documentFixture([["data-studio-focus-mode", "prior"]]);
  const policy = installStudioFocusPolicy(document);
  policy.setMode("off");
  policy.dispose();
  assert.equal(attributes.get("data-studio-focus-mode"), "prior");
  assert.equal(attributes.has("data-studio-focus-visible"), false);
  assert.equal(listeners.size, 0);
});

// Focus preferences preserve preset/action state; selection shading has its own owner.
test("global focus CSS hides composite rings and preserves semantic selection states", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../app/studio/focus-outline.css", import.meta.url), "utf8");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
  for (const selector of [".inspector-colour-control", ".post-tags-input-area", ".password-protection-input"]) {
    assert.ok(rules.some(([, head, body]) => head.includes('[data-studio-focus-visible="false"]') && head.includes(selector) && head.includes(":focus-within") && body.includes("outline: none !important")));
  }
  for (const selector of ['.paragraph-gradient-options button[aria-pressed="true"]:focus', '.design-canvas-heading-actions']) {
    assert.ok(rules.some(([, head, body]) => head.includes('[data-studio-focus-visible="false"]') && head.includes(selector) && /outline: 2px solid/.test(body)));
  }
  assert.ok(rules.some(([, head, body]) => head.includes('[data-studio-focus-visible="false"]') && head.includes('[data-studio-multi-selected="true"]:focus') && body.includes("outline: none !important")));
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /outline: 2px solid Highlight !important/);
});
