import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(await readFile(new URL("../app/content/list-item-text.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { listItemWithTextRuns } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("typing and toolbar formatting retain List Item style, anchor and nested children", () => {
  const children = [{ id: "child", type: "list", style: "unordered", items: ["Nested item"] }];
  const style = { backgroundColor: "#d1e7dd", anchor: "item-anchor", className: "item-class" };
  const item = Object.freeze({ text: "before", children, style });
  const runs = [{ text: "after", marks: ["bold"] }];
  const next = listItemWithTextRuns(item, "after", runs);
  assert.equal(next.style, style);
  assert.equal(next.children, children);
  assert.equal(next.runs, runs);
  assert.equal(next.text, "after");
  assert.equal(item.text, "before");
  const cleared = listItemWithTextRuns(next, "plain", [{ text: "plain" }]);
  assert.equal(cleared.runs, undefined);
  assert.equal(cleared.style.anchor, "item-anchor");
  assert.equal(cleared.children, children);
});

test("an unstyled plain List Item remains a string; an inline object retains runs", () => {
  assert.equal(listItemWithTextRuns("before", "after", [{ text: "after" }]), "after");
  const runs = [{ text: "\uFFFC", inline: { type: "footnote", id: "note" } }];
  assert.deepEqual(listItemWithTextRuns("", "\uFFFC", runs), { text: "\uFFFC", runs });
});

test("styled empty items remain editable records without stale text formatting", () => {
  const item = { text: "before", runs: [{ text: "before", marks: ["bold"] }], style: { textColor: "#123456" } };
  const next = listItemWithTextRuns(item, "", []);
  assert.equal(next.text, "");
  assert.equal(next.runs, undefined);
  assert.equal(next.style, item.style);
});

test("the two actual Canvas update paths consume the same List Item contract", async () => {
  const canvas = readStudioSource("app/studio/studio-canvas.tsx");
  assert.match(canvas, /return updateListItem\(block, listId, itemIndex, item => listItemWithTextRuns\(item, text, runs\)\)/);
  assert.match(canvas, /onChange\(updateListItem\(block, list.id, index, item => listItemWithTextRuns\(item, value, runs\)\)\)/);
  assert.match(canvas, /nextItems\[index\] = listItemWithTextRuns\(item, plainTextFromRuns\(beforeRuns\), beforeRuns\)/);
  assert.doesNotMatch(canvas, /\bitemWithText\(/);
  assert.match(canvas, /const hasMarks = nextCellRuns.some\(\(row\) => row.some\(\(cellRuns\) => cellRuns.some\(\(run\) => run.inline \|\| run.marks\?\.length\)\)\)/);
});
