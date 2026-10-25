import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { isCaretAtVerticalEditorEdge, verticalTargetFallbackOffset } = await loadProductionModule(new URL("../app/studio/blocks/editors/rich-text-navigation.ts", import.meta.url));

const rect = (top, bottom, left = 0) => ({ top, bottom, left, height: bottom - top });

test("empty rich-text blocks hand vertical arrows to adjacent blocks without caret geometry", () => {
  const noCaret = rect(0, 0);
  const noLines = [];
  const emptyEditor = rect(100, 124);

  assert.equal(isCaretAtVerticalEditorEdge("ArrowUp", noCaret, noLines, emptyEditor, true, 24), true);
  assert.equal(isCaretAtVerticalEditorEdge("ArrowDown", noCaret, noLines, emptyEditor, true, 24), true);
});

test("vertical navigation stays native inside a populated editor and crosses at its visual edges", () => {
  const lines = [rect(100, 124), rect(124, 148)];
  const editor = rect(100, 148);

  assert.equal(isCaretAtVerticalEditorEdge("ArrowUp", rect(100, 124), lines, editor, false, 24), true);
  assert.equal(isCaretAtVerticalEditorEdge("ArrowDown", rect(124, 148), lines, editor, false, 24), true);
  assert.equal(isCaretAtVerticalEditorEdge("ArrowDown", rect(100, 124), lines, editor, false, 24), false);
  assert.equal(isCaretAtVerticalEditorEdge("ArrowUp", rect(124, 148), lines, editor, false, 24), false);
});

test("browser caret hit-test fallback keeps Up at the end and Down at the start", () => {
  assert.equal(verticalTargetFallbackOffset("ArrowUp", 18), 18);
  assert.equal(verticalTargetFallbackOffset("ArrowDown", 18), 0);
  assert.equal(verticalTargetFallbackOffset("ArrowDown", 0), 0);
});

test('writing flow retains non-text leaves between editable fields and omits layout wrappers', async () => {
  const { writingFlowTargets } = await loadProductionModule(new URL('../app/studio/blocks/editors/rich-text-navigation.ts', import.meta.url));
  const target = (rich, child = null, visible = true) => ({
    classList: { contains: () => rich }, isContentEditable: rich,
    getClientRects: () => visible ? [{}] : [], querySelector: () => child,
  });
  const paragraph = target(true), image = target(false), heading = target(true);
  const group = target(false, paragraph), hidden = target(false, null, false);
  const root = { querySelectorAll: () => [group, paragraph, image, heading, hidden] };
  assert.deepEqual(writingFlowTargets(root), [paragraph, image, heading]);
});
