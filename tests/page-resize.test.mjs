import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resizePage, resizePageFromKey } from "../app/studio/page-resize.ts";
import { loadProductionModule } from "./production-module.mjs";

const page = { id: "fixture", width: 320, height: 180, content: "preserve" };
for (const [handle, dx, dy] of [["se", 32, 18], ["nw", -32, -18], ["e", 32, 0], ["w", -32, 0], ["n", 0, -18], ["s", 0, 18]]) {
  test(`${handle} page resizing shares proportional and free sizing in Design and the Library`, () => {
    const proportional = resizePage(page, handle, dx, dy, true);
    assert.equal(proportional.width, 352);
    assert.equal(proportional.height, 198);
    assert.equal(proportional.id, page.id);
    assert.equal(proportional.content, page.content);
    const free = resizePage(page, handle, dx, dy, false);
    assert.equal(free.width, page.width + Math.abs(dx));
    assert.equal(free.height, page.height + Math.abs(dy));
  });
}
test("page keyboard sizing preserves normal steps, Shift stretching, limits, and unrelated keys", () => {
  assert.deepEqual(resizePageFromKey(page, "e", "ArrowRight", false), resizePage(page, "e", 1, 0, true));
  assert.deepEqual(resizePageFromKey(page, "e", "ArrowRight", true), { ...page, width: 330 });
  assert.deepEqual(resizePageFromKey(page, "s", "ArrowDown", true), { ...page, height: 190 });
  assert.equal(resizePageFromKey(page, "s", "Tab", false), null);
  for (const keepRatio of [false, true]) {
    for (const delta of [-10000, 10000]) {
      const result = resizePage(page, "se", delta, delta, keepRatio);
      assert.ok(result.width >= 120 && result.width <= 4096);
      assert.ok(result.height >= 120 && result.height <= 4096);
    }
  }
});
test("the shared page handles expose all eight controls, the active control, and read-only state", async () => {
  const { PageResizeHandles } = await loadProductionModule(new URL("../app/studio/controls/page-resize-handles.tsx", import.meta.url));
  const html = renderToStaticMarkup(createElement("svg", null, createElement(PageResizeHandles, { page, controlScale: 1, disabled: true })));
  assert.equal((html.match(/role="button"/g) ?? []).length, 8);
  assert.equal((html.match(/aria-disabled="true"/g) ?? []).length, 8);
  const active = renderToStaticMarkup(createElement("svg", null, createElement(PageResizeHandles, { page, controlScale: 1, activeHandle: "nw" })));
  assert.equal((active.match(/role="button"/g) ?? []).length, 1);
  assert.match(active, /aria-label="Resize page from top left"/);
});
test("the existing resize specimen offers Page alongside Shape and Image, with a complete temporary page example", async () => {
  const { ResizeHandlesSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/resize-handles-specimen.tsx", import.meta.url));
  const { PageResizeSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/page-resize-specimen.tsx", import.meta.url));
  const root = renderToStaticMarkup(createElement(ResizeHandlesSpecimen));
  for (const label of ["Shape", "Image", "Page"]) assert.ok(root.includes(`>${label}</option>`));
  const example = renderToStaticMarkup(createElement(PageResizeSpecimen));
  assert.match(example, /Page size: 320 × 180/);
  assert.match(example, /aria-label="Temporary page resize canvas"/);
  assert.equal((example.match(/aria-label="Resize page from /g) ?? []).length, 8);
  assert.match(example, /Hold Shift to stretch/);
});
