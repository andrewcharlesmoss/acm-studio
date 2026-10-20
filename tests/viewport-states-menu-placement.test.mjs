import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { anchoredMenuPosition } from "../app/studio/overlays/anchored-menu-position.mjs";
import { loadProductionModule } from "./production-module.mjs";

const { ViewportStatesMenu } = await loadProductionModule(new URL("../app/studio/controls/viewport-states-menu.tsx", import.meta.url));

test("viewport States remains end-aligned to its trigger instead of using pane-edge placement", () => {
  const source = readFileSync(new URL("../app/studio/controls/viewport-states-menu.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('className="studio-viewport-states-menu" anchor={() => trigger.current} align="end"'));
  assert.doesNotMatch(source, /StudioAnchoredMenu[^\n]*\binspectorPlacement\b/);

  const menu = anchoredMenuPosition({
    anchor: { left: 1505, right: 1630, top: 260, bottom: 296 },
    width: 240,
    height: 300,
    viewportWidth: 1752,
    viewportHeight: 560,
    align: "end",
  });
  assert.equal(menu.left, 1390);
  assert.equal(menu.left + 240, 1630);
  assert.equal(menu.top, 304);
  assert.ok(menu.top >= 8 && menu.top + Math.min(300, menu.maxHeight) <= 552);
});

test("viewport States shows the selected tablet or mobile label beneath the shared trigger", () => {
  const render = viewport => renderToStaticMarkup(createElement(ViewportStatesMenu, { viewport, onChange() {} }));
  const desktop = render("desktop");
  assert.doesNotMatch(desktop, /studio-viewport-states-current/);
  const tablet = render("tablet");
  assert.match(tablet, /studio-viewport-states-current[^>]*role="status"[^>]*>.*Tablet/s);
  const mobile = render("mobile");
  assert.match(mobile, /studio-viewport-states-current[^>]*role="status"[^>]*>.*Mobile/s);
  assert.match(tablet, /studio-viewport-states-current[^>]*>.*<svg[^>]*aria-hidden="true"/s);
});
