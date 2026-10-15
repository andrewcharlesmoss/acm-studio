import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { zoomToTrack, trackToZoom, zoomFromRangeKey } from "../app/studio/controls/zoom-range-scale.ts";
import { loadProductionModule } from "./production-module.mjs";
const { ZoomRangeControl } = await loadProductionModule(new URL("../app/studio/controls/zoom-range-control.tsx", import.meta.url));

test("zoom retains both endpoints and puts 100% exactly halfway along the track", () => {
  assert.equal(zoomToTrack(10), 0);
  assert.equal(zoomToTrack(100), 500);
  assert.equal(zoomToTrack(500), 1000);
  assert.equal(trackToZoom(0), 10);
  assert.equal(trackToZoom(500), 100);
  assert.equal(trackToZoom(1000), 500);
  let previous = -1;
  for (let zoom = 10; zoom <= 500; zoom++) {
    const track = zoomToTrack(zoom);
    assert.ok(track > previous); previous = track;
    assert.equal(trackToZoom(Math.round(track)), zoom);
  }
  assert.equal(trackToZoom(-1), 10);
  assert.equal(trackToZoom(1100), 500);
});

test("zoom keyboard steps operate in actual percentages on both halves", () => {
  for (const value of [50, 99, 100, 101, 260]) {
    assert.equal(zoomFromRangeKey(value, "ArrowRight"), value + 1);
    assert.equal(zoomFromRangeKey(value, "ArrowLeft"), value - 1);
    assert.equal(zoomFromRangeKey(value, "PageUp"), value + 49);
  }
  assert.equal(zoomFromRangeKey(10, "ArrowLeft"), 10);
  assert.equal(zoomFromRangeKey(500, "ArrowUp"), 500);
  assert.equal(zoomFromRangeKey(260, "Home"), 10);
  assert.equal(zoomFromRangeKey(260, "End"), 500);
  assert.equal(zoomFromRangeKey(260, "Tab"), null);
});

test("the production adapter maps input and accessibility to zoom rather than track positions", () => {
  const changes = [];
  const slider = ZoomRangeControl({ id: "zoom", value: 100, onChange: value => changes.push(value) });
  slider.props.onChange({ target: { value: "500" } });
  let prevented = false;
  slider.props.onKeyDown({ key: "ArrowRight", preventDefault() { prevented = true; }, stopPropagation() {} });
  assert.deepEqual(changes, [100, 101]); assert.ok(prevented);
  slider.props.onKeyDown({ key: "ArrowRight", metaKey: true });
  assert.deepEqual(changes, [100, 101]);
  const html = renderToStaticMarkup(createElement(ZoomRangeControl, { id: "zoom", value: 100, onChange() {} }));
  assert.match(html, /aria-valuemin="10" aria-valuemax="500" aria-valuenow="100" aria-valuetext="100%"/);
  assert.match(html, /data-tooltip-placement="above"/);
  assert.match(html, /value="500"/);
});
