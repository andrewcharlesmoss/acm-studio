import { readFileSync } from "node:fs";
import postcss from "postcss";
import assert from "node:assert/strict";
import test from "node:test";
import { blockInsertionGap } from "../app/studio/block-insertion-gap.ts";

test("insertion hit areas stay entirely inside actual block gaps", () => {
  for (const gap of [0, 5, 20, 30, 80]) {
    const result = blockInsertionGap(100, 100 + gap, 100);
    assert.ok(result.top >= 0);
    assert.ok(result.top + result.height <= gap);
    assert.ok(result.height <= 30);
    assert.equal(result.top + result.height / 2, gap / 2);
  }
});

test("touching and overlapping blocks have no pointer hit area", () => {
  assert.equal(blockInsertionGap(100, 100, 100).height, 0);
  assert.equal(blockInsertionGap(110, 100, 100).height, 0);
});

test("zoom preserves the same gap in CSS coordinates", () => {
  assert.deepEqual(blockInsertionGap(200, 240, 200, 2), blockInsertionGap(100, 120, 100));
});

test("toolbar spacing and centred grid tracks use the actual gap rather than wrapper origin", () => {
  const result = blockInsertionGap(100, 158, 138);
  assert.equal(138 + result.top, 114);
  assert.equal(138 + result.top + result.height, 144);
});


test("nested zero-gap boundaries retain a compact hit area without changing root gaps", () => {
  assert.deepEqual(blockInsertionGap(100, 100, 100, 1, 6), { top: -3, height: 6 });
  assert.deepEqual(blockInsertionGap(200, 200, 200, 2, 6), { top: -3, height: 6 });
  assert.deepEqual(blockInsertionGap(100, 100, 100), { top: 0, height: 0 });
});


test("nested insertion controls do not inherit root sibling offsets and hidden controls stay hidden", () => {
  const css = postcss.parse(readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8"));
  let nested, end, hidden;
  css.walkRules(rule => {
    const values = Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
    if (rule.selector === ".nested-between-blocks") nested = values;
    if (rule.selector === ".nested-end-inserter") end = values;
    if (rule.selector === ".between-blocks[hidden]") hidden = values;
    if (rule.selector.includes(".block-position") && values.top !== undefined && rule.selector.includes(".between-blocks")) {
      assert.ok(rule.selector.includes(".block-position > .between-blocks"), rule.selector);
    }
  });
  assert.equal(nested.top, "-12px");
  assert.equal(nested.height, "24px");
  assert.equal(end.position, "absolute");
  assert.equal(hidden.display, "none");
});


test("painted insertion cue matches Gutenberg sizing and centre-out motion respects reduced motion", () => {
  const css = postcss.parse(readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8"));
  let isolated = false, portal = false, animations = 0, lineThickness, plusSize, lineReveal;
  css.walkRules(rule => {
    const values = Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
    if (rule.selector === ".block-editor" && values.isolation === "isolate") isolated = true;
    if (rule.selector === ".canvas-insertion-cue") portal = values.position === "fixed" && Number(values["z-index"]) > 15;
    if (rule.selector === ".between-blocks::before") lineThickness = values.height;
    if (rule.selector === ".between-blocks > span") plusSize = [values.width, values.height];
    if (rule.selector.includes(".canvas-insertion-cue") && values.animation) {
      assert.equal(rule.parent.name, "media");
      assert.equal(rule.parent.params, "(prefers-reduced-motion: no-preference)");
      animations++;
    }
    if (rule.parent?.name === "keyframes" && rule.parent.params === "studio-insertion-line-enter" && rule.selector === "from") lineReveal = values.transform;
  });
  assert.equal(isolated, true); assert.equal(portal, true); assert.equal(animations, 2);
  assert.equal(lineThickness, "4px");
  assert.deepEqual(plusSize, ["24px", "24px"]);
  assert.equal(lineReveal, "translateY(-50%) scaleX(0)");
});
