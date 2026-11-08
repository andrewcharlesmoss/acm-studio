import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { GroupLayoutControls } = await loadProductionModule(new URL("../app/studio/blocks/group-layout-controls.tsx", import.meta.url));

function renderRow(changes = {}, navigation = false) {
  return renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "row", type: "group", layout: "row", children: [], ...changes },
    navigation,
    onChange() {},
  }));
}

function renderFlow(changes = {}) {
  return renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "flow", type: "group", layout: "flow", contentWidth: "constrained", inheritLayout: true, children: [], ...changes },
    onChange() {},
  }));
}

test("Row layout shows the default controls without exposing optional settings", () => {
  const html = renderRow({ verticalAlign: "centre" });
  assert.match(html, /aria-label="Justification"/);
  assert.match(html, /aria-label="Orientation"/);
  assert.doesNotMatch(html, /aria-label="Alignment"/);
  assert.doesNotMatch(html, /Allow sizing on children/);
});

test("authored Row settings remain visible and Navigation retains its sizing control", () => {
  const authored = renderRow({ verticalAlign: "bottom", allowSizingOnChildren: true });
  assert.match(authored, /aria-label="Alignment"/);
  assert.match(authored, /Allow sizing on children/);
  assert.match(authored, /<input type="checkbox" checked=""/);
  assert.match(renderRow({}, true), /Allow sizing on children/);
});

test("flow Justification stays optional and appears once when enabled or authored", () => {
  assert.equal((renderFlow().match(/<legend>Justification<\/legend>/g) ?? []).length, 0);
  assert.equal((renderFlow({ horizontalAlign: "centre" }).match(/<legend>Justification<\/legend>/g) ?? []).length, 1);
});
