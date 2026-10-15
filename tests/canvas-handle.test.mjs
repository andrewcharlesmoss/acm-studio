import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { CanvasHandle } = await loadProductionModule(new URL("../app/studio/controls/canvas-handle.tsx", import.meta.url));
test("circular targets preserve screen size and accessible geometry across zoom levels", () => {
  for (const zoom of [50, 100, 200]) {
    const html = renderToStaticMarkup(createElement(CanvasHandle, {
      cx: 100, cy: 80, controlScale: 100 / zoom, cursor: "crosshair",
      "aria-label": "Resize arrow from end point", onPointerDown() {},
    }));
    assert.match(html, /role="button" tabindex="0" aria-label="Resize arrow from end point"/);
    assert.ok(html.includes(`cx="100" cy="80" r="${8 * 100 / zoom}"`));
    assert.match(html, /style="cursor:crosshair"/);
  }
});

test("the shared target forwards input only when enabled and exposes disabled semantics", () => {
  let pointer = 0, keyboard = 0;
  const props = { cx: 10, cy: 20, controlScale: 1, cursor: "crosshair", "aria-label": "Resize example", onPointerDown: () => pointer++, onKeyDown: () => keyboard++ };
  for (const disabled of [false, true]) {
    const target = CanvasHandle({ ...props, disabled });
    target.props.onPointerDown({}); target.props.onKeyDown({});
    assert.equal(target.props.tabIndex, disabled ? -1 : 0);
    assert.equal(target.props["aria-disabled"], disabled || undefined);
  }
  assert.equal(pointer, 1); assert.equal(keyboard, 1);
});
