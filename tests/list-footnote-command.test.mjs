import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const rich = await load("../app/content/rich-text.ts");
const footnotes = await load("../app/content/footnote-runs.ts");
const commands = await load("../app/studio/footnote-command.ts");
const lists = await load("../app/studio/list-structure.ts");
const itemText = await load("../app/content/list-item-text.ts");
const model = await load("../app/content/model.ts");
const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
function collect(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
  ts.forEachChild(node, collect);
}
collect(tree);
const names = ["richTextContent", "withRichTextContent", "insertFootnote"];
const compiled = ts.transpileModule(names.map(name => {
  assert.ok(functions.has(name), `production ${name} exists`);
  return functions.get(name).getText(tree);
}).join("\n") + "\nglobalThis.command = insertFootnote;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture(nested = false, existing = false) {
  const item = { text: "target", runs: [{ text: "target", marks: ["italic"] }], style: { anchor: "item-anchor", textColor: "#123456" }, children: [{ id: "deeper", type: "list", style: "ordered", items: ["retained child"] }] };
  if (existing) {
    item.runs = [{ text: "target" }, footnotes.footnoteReferenceRun("existing-note")];
    item.text = rich.plainTextFromRuns(item.runs);
  }
  const target = { id: "nested-list", type: "list", style: "ordered", items: ["unchanged sibling", item] };
  const root = nested ? { id: "root-list", type: "list", style: "unordered", items: [{ text: "parent", style: { anchor: "parent-anchor" }, children: [target] }, "root sibling"] } : target;
  const group = { id: "restricted", type: "group", layout: "flow", allowedBlocks: ["list"], children: [root] };
  const blocks = [group];
  if (existing) blocks.push({ id: "notes", type: "footnotes", notes: [{ id: "existing-note", text: "existing note" }] });
  return { root, target, item, document: { id: "doc", kind: "post", title: "Fixture", blocks } };
}

function harness({ nested = false, existing = false, writable = true, acrossItems = false, selection = undefined, rejected = false } = {}) {
  const current = fixture(nested, existing);
  let sequence = 0;
  let history = { workspace: current.document, history: [], future: [] };
  const writes = [], focused = [], feedback = [], requested = [];
  const scope = {
    ...rich, ...footnotes, ...commands, ...lists, ...itemText,
    listItemText: model.listItemText,
    writable, activeDocument: current.document,
    crypto: { randomUUID: () => `00000000-0000-0000-0000-${String(++sequence).padStart(12, "0")}` },
    currentListTextRange: () => acrossItems ? { rootId: current.root.id } : null,
    formattingTarget: block => block,
    activeListContext: () => ({ listId: current.target.id, itemIndex: 1 }),
    activeTableCell: () => undefined,
    currentTextSelection: (...args) => {
      requested.push(args);
      const offset = rich.plainTextFromRuns(current.item.runs).length;
      return selection === undefined ? { start: offset, end: offset } : selection;
    },
    onSetPublishFeedback: message => feedback.push(message),
    focusFootnote: (...args) => focused.push(args),
    applyBlockList: blocks => {
      if (rejected) return false;
      writes.push(blocks);
      history = { ...commitHistory(history.workspace, history.history), workspace: { ...current.document, blocks } };
      return true;
    },
  };
  runInNewContext(compiled, scope);
  return { current, scope, writes, focused, feedback, requested, history: () => history };
}

for (const nested of [false, true]) test(`Footnote insertion preserves ${nested ? "nested" : "root"} List Item ownership and commits its note together`, () => {
  const h = harness({ nested });
  h.scope.command(h.current.root);
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.requested[0], [h.current.root.id, 1, h.current.target.id, undefined]);
  const changedRoot = h.writes[0][0].children[0];
  const changed = lists.findListBlock(changedRoot, h.current.target.id);
  assert.equal(changed.items[0], h.current.target.items[0]);
  assert.equal(changed.items[1].style, h.current.item.style);
  assert.equal(changed.items[1].children, h.current.item.children);
  assert.equal(changed.items[1].text, `target${footnotes.INLINE_OBJECT_CHARACTER}`);
  assert.deepEqual(changed.items[1].runs[0].marks, ["italic"]);
  const reference = changed.items[1].runs.at(-1).inline;
  assert.equal(reference.type, "footnote");
  assert.equal(h.writes[0][1].type, "footnotes");
  assert.equal(h.writes[0][1].notes[0].id, reference.id);
  assert.equal(h.focused[0][0], reference.id);
  assert.equal(h.history().history.length, 1);
  const history = h.history();
  const undone = undoHistory(history.workspace, history.history, history.future);
  assert.deepEqual(undone.workspace, h.current.document);
  // History uses the production JSON clone, which omits optional undefined fields.
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace.blocks, JSON.parse(JSON.stringify(h.writes[0])));
  assert.equal(h.current.item.text, "target");
});

test("an existing List reference focuses its note without a second insertion", () => {
  const h = harness({ nested: true, existing: true, selection: { start: 6, end: 7 } });
  h.scope.command(h.current.root);
  assert.equal(h.writes.length, 0);
  assert.equal(h.focused[0][0], "existing-note");
  assert.equal(h.history().history.length, 0);
});

for (const [label, options] of [["read-only", { writable: false }], ["cross-item range", { acrossItems: true }], ["missing selection", { selection: null }], ["rejected transaction", { rejected: true }]]) test(`List Footnote insertion preserves content on ${label}`, () => {
  const h = harness(options);
  h.scope.command(h.current.root);
  assert.equal(h.writes.length, 0);
  assert.equal(h.focused.length, 0);
  assert.equal(h.history().history.length, 0);
  if (options.acrossItems) assert.match(h.feedback[0], /within one List Item/);
});
