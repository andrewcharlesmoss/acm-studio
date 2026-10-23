import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const visibilityGuard = ':where(html:not([data-studio-focus-visible="false"]) *)';

function declarations(rule) {
  return Object.fromEntries(rule.nodes
    .filter(node => node.type === "decl")
    .map(node => [node.prop, node]));
}

test("code editor uses one shared edge for its syntax layer and focus state", async () => {
  const [studioSource, focusSource] = await Promise.all([
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/focus-outline.css", import.meta.url), "utf8"),
  ]);
  const studio = postcss.parse(studioSource);
  const focus = postcss.parse(focusSource);
  const studioRules = [];
  const focusRules = [];
  studio.walkRules(rule => studioRules.push(rule));
  focus.walkRules(rule => focusRules.push(rule));

  const sourceRule = studioRules.find(rule => rule.selector === ".studio-code-source");
  const sharedBorderRule = studioRules.find(rule => rule.selector.includes(".studio-code-source, .studio-code-highlight"));
  const highlightRule = studioRules.find(rule => rule.selector === ".studio-code-highlight");
  assert.equal(declarations(sharedBorderRule).border?.value, "1px solid #8d8d8d");
  assert.equal(declarations(sourceRule).border?.value, undefined);
  assert.equal(declarations(highlightRule)["border-color"]?.value, "transparent");

  const focusEdgeRule = focusRules.find(rule => rule.selector.includes(visibilityGuard)
    && rule.selector.includes(".studio-code-source:focus"));
  assert.equal(declarations(focusEdgeRule)["border-color"]?.value, "var(--focus-ring-colour, #5c5e5c)");
  assert.equal(declarations(focusEdgeRule)["border-color"]?.important, true);

  const textareaOutlineRule = focusRules.find(rule => rule.selector === ".studio-code-editor .studio-code-source-wrap .studio-code-source:focus");
  assert.equal(declarations(textareaOutlineRule).outline?.value, "none");
  assert.equal(declarations(textareaOutlineRule).outline?.important, true);

  let forcedColoursEdge;
  focus.walkAtRules("media", atRule => {
    if (atRule.params !== "(forced-colors: active)") return;
    atRule.walkRules(rule => {
      if (rule.selector.includes(".studio-code-source:focus")) {
        forcedColoursEdge = declarations(rule)["border-color"];
      }
    });
  });
  assert.equal(forcedColoursEdge?.value, "Highlight");
  assert.equal(forcedColoursEdge?.important, true);
});
