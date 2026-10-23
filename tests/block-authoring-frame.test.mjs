import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import test from "node:test";

const source = process.env.STUDIO_FRAME_CSS || new URL("../app/studio/studio.css", import.meta.url);
const sheet = postcss.parse(readFileSync(source, "utf8"));
const rules = [];
sheet.walkRules(rule => rules.push(rule));
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));

// These are structural CSS contracts; actual pointer/selection geometry is also
// checked in the browser because Node has no layout engine.
test("hover and selection share a square, non-interactive authoring frame", () => {
  const frame = rules.find(rule => rule.selector.includes(".sg-block-selection-specimen::before") && declarations(rule)["border-radius"] === "0");
  assert.ok(frame);
  assert.match(frame.selector, /\.canvas-block\.is-selected/);
  assert.match(frame.selector, /:is\(\.canvas-block, \.studio-nested-block, \[data-studio-selected\]\)/);
  assert.match(frame.selector, /:is\(:hover, \[data-studio-hovered="true"\]\)::before/);
  const values = declarations(frame);
  assert.equal(values.border, "1px solid var(--acm-ui-color-block-selection, #FF383C)");
  assert.equal(values.inset, "0");
  assert.equal(values["pointer-events"], "none");
  assert.equal(values.position, "absolute");
  assert.equal(values["box-sizing"], "border-box");
  const hover = rules.find(rule => rule.selector.endsWith('::before') && rule.selector.includes('[data-studio-hovered="true"]') && declarations(rule)["border-color"] === "var(--acm-ui-color-selection, #0088FF)");
  assert.ok(hover, "hover paints with interface selection blue independently of the selected block colour");
  assert.match(hover.selector, /\.block-editor:not\(\.is-block-dragging\)/);
  assert.match(hover.selector, /:not\(\.is-selected, \[data-studio-selected="true"\], \[data-studio-multi-selected="true"\]\)/);
  assert.match(hover.selector, /:not\(:has\(\.template-node-selectable:hover\)\)/);
  assert.ok(rules.some(rule => rule.parent.type === "atrule" && rule.parent.params === "(forced-colors: active)" && rule.selector.includes(hover.selector) && declarations(rule)["border-color"] === "Highlight"));
});

test("selected block toolbars paint above the frame and heading editors allow descenders to overflow", () => {
  const toolbar = rules.find(rule => rule.selector === ".canvas-block.is-selected > .canvas-block-toolbar, .studio-nested-block[data-studio-selected=\"true\"] > .canvas-block-toolbar");
  assert.ok(toolbar, "selected root and nested blocks share the same toolbar layer");
  assert.equal(declarations(toolbar)["z-index"], "6");

  const headingEditor = rules.find(rule => rule.selector === ".rich-text-editor.heading-field");
  assert.ok(headingEditor, "editable headings have a dedicated glyph-overflow rule");
  assert.equal(declarations(headingEditor).overflow, "visible");
});

test("hover does not flatten painted surfaces or leave a rounded host outline", () => {
  const host = rules.find(rule => rule.selector === ".canvas-block, .studio-block-preview > .content-block");
  assert.equal(declarations(host)["border-radius"], "6px");
  const hoverHosts = rules.filter(rule => rule.selector.includes(".canvas-block") && rule.selector.includes(":hover") && !rule.selector.includes("::before"));
  for (const rule of hoverHosts) {
    const values = declarations(rule);
    assert.equal(values["border-radius"], undefined);
    assert.notEqual(values.outline, "1px solid #8f8f8f");
    assert.notEqual(values["border-color"], "#8f8f8f");
  }
});
