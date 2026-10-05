import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const structure = await load("../app/studio/list-structure.ts");
const { useStudioBlockCommands: createBlockCommands } = await load("../app/studio/use-studio-block-commands.ts");
const { blockCommandFocusId, scheduleBlockCommandFocus } = await load("../app/studio/block-command-focus.ts");
const rich = await load("../app/content/rich-text.ts");
const itemText = await load("../app/content/list-item-text.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const list = (items, id = "list") => ({ id, type: "list", style: "unordered", items });
const canvas = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("canvas.tsx", canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let listField, keyHandler;
function find(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "ListField") listField = node;
  if (ts.isFunctionDeclaration(node) && node.name?.text === "RichTextEditor") {
    function inside(child) {
      if (ts.isFunctionDeclaration(child) && child.name?.text === "handleKeyDown") keyHandler = child;
      ts.forEachChild(child, inside);
    }
    inside(node);
  }
  ts.forEachChild(node, find);
}
find(tree);
let split;
function findSplit(node) {
  if (ts.isJsxAttribute(node) && node.name.text === "onSplitParagraph") split = node.initializer.expression;
  ts.forEachChild(node, findSplit);
}
findSplit(listField);
assert.ok(split && keyHandler, "actual production handlers exist");
const compiledSplit = ts.transpileModule(`globalThis.split = (${split.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function commandFixture(source, parent) {
  const original = { id: "document", kind: "post", title: "Fixture", blocks: parent ? [{ ...parent, children: [source] }] : [source] };
  let history = { workspace: original, history: [], future: [] };
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument(update) {
    const next = update(history.workspace);
    if (next !== history.workspace) history = { ...commitHistory(history.workspace, history.history), workspace: next };
  } });
  return { command, original, history: () => history, blocks: () => history.workspace.blocks };
}
function splitFixture(root, listId, index, depth = 0) {
  const source = structure.findListBlock(root, listId), items = source.items.length ? source.items : [""];
  const calls = [], focuses = [], exits = [];
  const scope = { ...structure, ...rich, ...itemText, block: root, rootBlocks: [root], list: source, index, depth,
    item: items[index], items, onChange: block => calls.push(block), focusItem: (...args) => focuses.push(args),
    onExitList: (...args) => { exits.push(args); return "paragraph-target"; },
  };
  runInNewContext(compiledSplit, scope);
  return { split: scope.split, calls, focuses, exits };
}

test("Return with all nonempty text selected splits rather than exits", () => {
  const child = list(["Nested"], "child");
  const source = list([{ text: "Selected", runs: [{ text: "Selected", marks: ["bold"] }], style: { anchor: "item", textColor: "#123456" }, children: [child] }]);
  const h = splitFixture(source, source.id, 0);
  assert.equal(h.split([], []), null);
  assert.equal(h.exits.length, 0);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].items[0].children, [child]);
  assert.equal(h.calls[0].items[0].style.anchor, "item");
  assert.deepEqual(h.calls[0].items[1], { text: "", style: { textColor: "#123456" } });
  assert.deepEqual(h.focuses, [[source.id, 1]]);
  assert.equal(source.items[0].text, "Selected");
});

test("empty root with children invokes the document exit command", () => {
  const source = list([{ text: "", children: [list(["Kept"], "child")] }]);
  const h = splitFixture(source, source.id, 0);
  assert.equal(h.split([], []), "paragraph-target");
  assert.deepEqual(h.exits, [[source.id, 0]]);
  assert.equal(h.calls.length, 0);
});

for (const items of [[], [""]]) test(`Return in ${items.length ? "stored" : "virtual"} empty nested item outdents once`, () => {
  const nested = list(items, "nested"), root = list([{ text: "Parent", children: [nested] }, "Next"]);
  const h = splitFixture(root, nested.id, 0, 1);
  h.split([], []);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].items, [{ text: "Parent" }, "", "Next"]);
  assert.deepEqual(h.focuses, [[root.id, 1]]);
  assert.equal(h.exits.length, 0);
});

test("empty nested item carries its own children and following source items", () => {
  const own = list(["Own child"], "own"), nested = list(["Before", { text: "", children: [own] }, "After"], "nested");
  const root = list([{ text: "Parent", children: [nested] }, "Next"]);
  const h = splitFixture(root, nested.id, 1, 1);
  h.split([], []);
  assert.deepEqual(h.calls[0].items[0].children[0].items, ["Before"]);
  assert.equal(h.calls[0].items[1].text, "");
  assert.deepEqual(h.calls[0].items[1].children[0], own);
  assert.deepEqual(h.calls[0].items[1].children[1].items, ["After"]);
});

for (const index of [0, 1, 2]) test(`root empty Return at position ${index} retains one source owner`, () => {
  const items = ["First", "Middle", "Last"]; items[index] = "";
  const source = { ...list(items), visualStyle: { anchor: "source", backgroundColor: "#abcabc" }, editorial: { note: "Keep note" } };
  const h = commandFixture(source);
  const paragraphId = blockCommandFocusId(h.command.exitList(source.id, index));
  assert.ok(paragraphId);
  assert.equal(h.blocks().find(block => block.id === paragraphId).type, "paragraph");
  const owners = h.blocks().filter(block => block.id === source.id);
  assert.equal(owners.length, 1);
  assert.deepEqual(owners[0].editorial, source.editorial);
  assert.equal(owners[0].visualStyle.anchor, "source");
  assert.equal(h.blocks().filter(block => block.visualStyle?.anchor === "source").length, 1);
  assert.deepEqual(h.blocks().filter(block => block.type === "list").flatMap(block => block.items), items.filter((_, itemIndex) => itemIndex !== index));
  assert.equal(h.history().history.length, 1);
});

for (const items of [[], [""]]) test(`root ${items.length ? "stored" : "virtual"} empty converts its single metadata owner to Paragraph`, () => {
  const source = { ...list(items), editorial: { note: "Keep", lock: { remove: true } }, visualStyle: { anchor: "source" } };
  const h = commandFixture(source);
  assert.equal(blockCommandFocusId(h.command.exitList(source.id, 0)), source.id);
  assert.deepEqual(h.blocks(), [{ id: source.id, type: "paragraph", text: "", editorial: source.editorial, style: source.visualStyle }]);
});

test("root exit promotes every child wrapper intact, with history", () => {
  const children = [{ ...list([{ text: "A", runs: [{ text: "A", marks: ["italic"] }] }], "child-a"), style: "ordered", marker: "a", start: 7, visualStyle: { anchor: "child" }, editorial: { note: "Child note" } }, { ...list(["Hidden"], "child-b"), editorial: { hidden: true } }];
  const source = list(["Before", { text: "", children }, "After"]), h = commandFixture(source);
  const paragraphId = blockCommandFocusId(h.command.exitList(source.id, 1));
  assert.ok(paragraphId);
  assert.deepEqual(h.blocks().slice(2, 4), children);
  assert.equal(h.blocks()[4].items[0], "After");
  const state = h.history(), undone = undoHistory(state.workspace, state.history, state.future);
  assert.deepEqual(undone.workspace, h.original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, state.workspace);
  assert.equal(source.items[1].children, children);
});

test("ordered root exit freezes implicit reversed prefix and suffix numbers", () => {
  const source = { ...list(["First", "", "Last"]), style: "ordered", reversed: true };
  const h = commandFixture(source);
  assert.ok(h.command.exitList(source.id, 1));
  assert.equal(h.blocks()[0].start, 3);
  assert.equal(h.blocks()[2].start, 1);
});

for (const [start, reversed] of [[100000, false], [-100000, true]]) test(`root exit refuses out-of-contract derived start ${start}`, () => {
  const source = { ...list(["", "Kept"]), style: "ordered", start, reversed }, h = commandFixture(source);
  assert.equal(h.command.exitList(source.id, 0), null);
  assert.equal(h.blocks(), h.original.blocks);
  assert.equal(h.history().history.length, 0);
});

for (const lock of [{ move: true }, { remove: true, move: true }]) test(`root exit refuses child movement protected by ${JSON.stringify(lock)}`, () => {
  const child = { ...list(["Kept"], "child"), editorial: { lock } }, source = list([{ text: "", children: [child] }]), h = commandFixture(source);
  assert.equal(h.command.exitList(source.id, 0), null);
  assert.equal(h.blocks(), h.original.blocks);
});

test("restricted parent refuses Paragraph placement without focus or history", () => {
  const h = commandFixture(list([""]), { id: "group", type: "group", layout: "flow", allowedBlocks: ["list"] });
  assert.equal(h.command.exitList("list", 0), null);
  assert.equal(h.history().history.length, 0);
});

test("narrowed parent policy refuses newly promoted child Lists", () => {
  const source = list([{ text: "", children: [list(["Kept"], "child")] }]);
  const h = commandFixture(source, { id: "group", type: "group", layout: "flow", allowedBlocks: ["paragraph"] });
  assert.equal(h.command.exitList(source.id, 0), null);
  assert.equal(h.blocks(), h.original.blocks);
  assert.equal(h.history().history.length, 0);
});

test("sole empty List conversion retains supported block alignment", () => {
  const h = commandFixture({ ...list([""]), blockAlign: "wide" });
  assert.equal(blockCommandFocusId(h.command.exitList("list", 0)), "list");
  assert.equal(h.blocks()[0].blockAlign, "wide");
});

test("sole conversion retains the authored site role", () => {
  const source = { ...list([""]), siteRole: "players" };
  assert.equal(validContentBlocks([source]), true);
  const exit = structure.exitEmptyListItem(source, 0, () => "unused");
  assert.equal(exit.blocks[0].siteRole, source.siteRole);
});

test("generated exit owners avoid all document IDs and each other", () => {
  const source = list(["Before", "", "After"]);
  const exit = structure.exitEmptyListItem(source, 1, () => "occupied", [source, { id: "occupied", type: "paragraph", text: "" }]);
  assert.deepEqual(exit.blocks.map(block => block.id), ["list", "occupied-1", "occupied-2"]);
});

test("nonempty content and inline atoms cannot exit; conflicting anchors refuse loss", () => {
  assert.equal(structure.exitEmptyListItem(list(["Text"]), 0, () => "unused"), null);
  assert.equal(structure.listItemIsEmpty({ text: "", runs: [{ text: "", inline: { type: "footnote", id: "note" } }] }), false);
  assert.equal(structure.exitEmptyListItem({ ...list([{ text: "", style: { anchor: "item" } }]), visualStyle: { anchor: "list" } }, 0, () => "unused"), null);
});

for (const mark of [{ type: "footnote", id: "note" }, { type: "inline-image", src: "https://example.com/image.png", alt: "Retain image" }, { type: "math", latex: "x", alternativeText: "Retain equation" }]) test(`legacy empty ${mark.type} mark remains owned content`, () => {
  const source = list([{ text: "", runs: [{ text: "", marks: [mark] }] }]);
  const original = { id: "document", kind: "post", title: "Fixture", blocks: [source, { id: "notes", type: "footnotes", notes: [{ id: "note", text: "Retain note" }] }] };
  assert.equal(validContentBlocks(original.blocks), true);
  let document = original;
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument: update => { document = update(document); } });
  assert.equal(command.exitList(source.id, 0), null);
  assert.equal(document, original);
  const h = splitFixture(source, source.id, 0);
  h.split([], []);
  assert.equal(h.exits.length, 0, "legacy content is a normal selection split, not an empty exit");
});

test("exit compares logical content rather than references when the owner supplies a clone", () => {
  const original = { id: "document", kind: "post", title: "Fixture", blocks: [list([""])] };
  let document = JSON.parse(JSON.stringify(original));
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument: update => { document = update(document); } });
  assert.equal(blockCommandFocusId(command.exitList("list", 0)), "list");
  assert.equal(document.blocks[0].type, "paragraph");
});

for (const stale of [false, true]) test(`deferred owner update ${stale ? "refuses stale focus" : "enables focus after acceptance"}`, () => {
  const original = { id: "document", kind: "post", title: "Fixture", blocks: [list([""])] };
  let update;
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument: callback => { update = callback; } });
  const target = command.exitList("list", 0);
  assert.ok(target);
  assert.equal(blockCommandFocusId(target), null, "no focus before the owner runs its update");
  const current = stale ? { ...original, blocks: [list(["Intervening edit"])] } : JSON.parse(JSON.stringify(original));
  const changed = update(current);
  assert.equal(blockCommandFocusId(target), stale ? null : "list");
  if (stale) assert.equal(changed, current);
  else assert.equal(changed.blocks[0].type, "paragraph");
});

test("synchronous stale owner refusal returns no focus target", () => {
  const original = { id: "document", kind: "post", title: "Fixture", blocks: [list([""])] };
  const current = { ...original, blocks: [list(["Intervening edit"])] };
  let result;
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument: update => { result = update(current); } });
  assert.equal(command.exitList("list", 0), null);
  assert.equal(result, current);
});

for (const interruption of [null, "pointerdown", "keydown", "focusin", "document-change", "owner-removed", "rejected"]) test(`scheduled focus respects ${interruption ?? "accepted original owner"}`, () => {
  const listeners = new Map(), focused = [], id = 'quoted"\\id';
  let callback, ownerId = "original", connected = true;
  const candidate = { isConnected: true, dataset: { studioBlockId: id }, classList: { contains: () => false } };
  const owner = { get isConnected() { return connected; }, getAttribute: () => ownerId, querySelectorAll: () => [candidate] };
  const document = { addEventListener: (name, handle) => listeners.set(name, handle), removeEventListener: name => listeners.delete(name) };
  const source = { ownerDocument: document, closest: () => owner };
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = handle => { callback = handle; };
  try {
    scheduleBlockCommandFocus(source, { blockId: id, isAccepted: () => interruption !== "rejected" }, document, target => focused.push(target));
    if (listeners.has(interruption)) listeners.get(interruption)({ target: {} });
    if (interruption === "document-change") ownerId = "new-document";
    if (interruption === "owner-removed") connected = false;
    callback();
    assert.deepEqual(focused, interruption === null ? [candidate] : []);
    assert.equal(listeners.size, 0, "temporary input observers are removed");
  } finally {
    if (previous === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previous;
  }
});

test("actual rich-text key handler ignores composition, read-only and already handled events", () => {
  const compiled = ts.transpileModule(`${keyHandler.getText(tree)}\nglobalThis.handle = handleKeyDown;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [editable, defaultPrevented, isComposing] of [[false, false, false], [true, true, false], [true, false, true]]) {
    const calls = [], scope = { editable, onKeyDownProp: () => calls.push("list handler") };
    runInNewContext(compiled, scope);
    scope.handle({ key: "Enter", defaultPrevented, nativeEvent: { isComposing } });
    assert.deepEqual(calls, []);
  }
});
