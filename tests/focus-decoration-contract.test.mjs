import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const focus = /:focus(?:-visible|-within)?(?![\w-])/g;
const visibilityGuard = ':where(html:not([data-studio-focus-visible="false"]) *)';
const decoration = /^(?:outline(?:-.+)?|border(?:-.+)?|box-shadow|filter|stroke(?:-.+)?)$/;

function forcedColours(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && parent.name === "media" && /forced-colors:\s*active/.test(parent.params)) return true;
  }
  return false;
}

// This is a stylesheet architecture check; real browser checks cover the cascade.
// Focus paint must consult the route-wide flag, including parents and siblings.
test("all application focus decorations respect Studio visibility or an explicit policy exception", async () => {
  const app = new URL("../app/", import.meta.url);
  const files = (await readdir(app, { recursive: true })).filter(name => name.endsWith(".css") && !/ \d+\.css$/.test(name));
  const failures = [];
  for (const file of files) {
    const root = postcss.parse(await readFile(new URL(file, app), "utf8"));
    root.walkRules(rule => {
      if (!rule.nodes.some(node => node.type === "decl" && decoration.test(node.prop)) || !rule.selector.includes(":focus")) return;
      if (forcedColours(rule)) return;
      // Explicit policy selectors are limited to the canonical policy and
      // the toggle-track adapter; the shared root rule uses the same flag.
      if (rule.selector.includes("data-studio-focus-visible") && !rule.selector.includes(visibilityGuard)) {
        assert.ok(["studio/focus-outline.css", "studio/controls/inspector-controls.css"].includes(file) || rule.selector.startsWith('html:not([data-studio-focus-visible="false"])'), `${file}: unexpected focus policy exception`);
        return;
      }
      // Authored content Button focus states are content, not interface rings.
      if (rule.selector.includes(".content-button.has-button-interaction-styles")) return;
      // A rule whose only decoration clears the native outline needs no gate.
      const paint = rule.nodes.filter(node => node.type === "decl" && decoration.test(node.prop));
      if (paint.every(node => /^(?:none|0)(?:\s|$)/.test(node.value))) return;
      for (const match of rule.selector.matchAll(focus)) {
        if (rule.selector.slice(match.index + match[0].length).startsWith(visibilityGuard)) continue;
        failures.push(`${file}:${rule.source.start.line} ${rule.selector}`);
        break;
      }
    });
  }
  assert.deepEqual(failures, []);
});

test("shared Ribbon focus-only borders and tab marks have Studio consumer overrides", async () => {
  const css = postcss.parse(await readFile(new URL("../app/studio/focus-outline.css", import.meta.url), "utf8"));
  for (const [selector, property] of [[".acm-ribbon-button", "border-color"], [".acm-ribbon-tabs > button", "background"]]) {
    const rules = [];
    css.walkRules(rule => { if (rule.selector.includes(selector) && rule.selector.includes('[data-studio-focus-visible="false"]')) rules.push(rule); });
    assert.equal(rules.length, 1);
    assert.match(rules[0].selector, /:focus:not\(:hover\):not\(\.is-active\)/);
    assert.ok(rules[0].nodes.some(node => node.type === "decl" && node.prop === property && node.value === "transparent"));
  }
});
