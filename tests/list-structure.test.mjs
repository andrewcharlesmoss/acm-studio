import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function compileModule(url) {
  let output = ts.transpileModule(await readFile(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  for (const match of [...output.matchAll(/from "([^\"]+)"/g)]) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;
    const dependency = await compileModule(new URL(`${specifier}.ts`, url));
    output = output.replace(match[0], `from "${dependency}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

const { indentListItem, listItemAfterSplit, outdentListItem, updateListItem } = await import(await compileModule(new URL("../app/studio/list-structure.ts", import.meta.url)));

const list = (items, id = "root", style = "unordered") => ({ id, type: "list", style, items });

test("List item editing updates nested content without replacing sibling lists", () => {
  const original = list([
    { text: "Parent", children: [list(["Existing child"], "nested-a")] },
    "Another parent",
  ]);
  const updated = updateListItem(original, "nested-a", 0, item => `${item} updated`);
  assert.equal(updated.items[0].children[0].items[0], "Existing child updated");
  assert.equal(original.items[0].children[0].items[0], "Existing child");
  assert.equal(updated.items[1], "Another parent");
});

test("typing into an empty List creates its first editable item", () => {
  const updated = updateListItem(list([]), "root", 0, item => `${item}First item`);
  assert.deepEqual(updated.items, ["First item"]);
});

test("splitting a List Item keeps its appearance but does not duplicate its HTML anchor", () => {
  const original = { text: "First second", style: { anchor: "unique-link", backgroundColor: "#fff", fontSize: "large" } };
  const next = listItemAfterSplit(original, "second", [{ text: "second" }]);
  assert.deepEqual(next, { text: "second", style: { backgroundColor: "#fff", fontSize: "large" } });
  assert.equal(original.style.anchor, "unique-link", "the source item keeps its anchor");
});

test("text transforms retain nested List text and inline formatting", async () => {
  const { transformBlock } = await import(await compileModule(new URL("../app/studio/block-transforms.ts", import.meta.url)));
  const source = list([
    { text: "Parent", runs: [{ text: "Parent", marks: ["bold"] }], children: [list([
      { text: "Nested", runs: [{ text: "Nested", marks: ["italic"] }] },
    ], "nested")] },
  ]);
  const transformed = transformBlock(source, { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" });
  assert.equal(transformed.type, "paragraph");
  assert.equal(transformed.text, "Parent\nNested");
  assert.equal(transformed.runs.map(run => run.text).join(""), transformed.text);
  assert.deepEqual(transformed.runs[0].marks, ["bold"]);
  assert.deepEqual(transformed.runs.at(-1).marks, ["italic"]);
});

test("indenting a list item nests it beneath its previous sibling", () => {
  const original = list(["First", { text: "Second", runs: [{ text: "Second" }] }, "Third"]);
  const moved = indentListItem(original, "root", 1, () => "child-list");
  assert.ok(moved);
  assert.equal(moved.block.items[0].text, "First");
  assert.equal(moved.block.items[1], "Third");
  assert.deepEqual(moved.block.items[0].children, [list([{ text: "Second", runs: [{ text: "Second" }] }], "child-list")]);
  assert.deepEqual({ listId: moved.listId, itemIndex: moved.itemIndex }, { listId: "child-list", itemIndex: 0 });
});

test("indenting appends to the last child list with the same list style", () => {
  const original = list([{ text: "Parent", children: [list(["Child"], "child-list")] }, "Next"]);
  const moved = indentListItem(original, "root", 1, () => "unused");
  assert.ok(moved);
  assert.equal(moved.block.items[0].children[0].id, "child-list");
  assert.deepEqual(moved.block.items[0].children[0].items, ["Child", "Next"]);
});

test("indenting preserves the moved item's ordered number and distinct marker semantics", () => {
  const original = list([
    { text: "Parent", children: [{ ...list(["Lowercase child"], "lowercase", "ordered"), marker: "a", start: 3 }] },
    { text: "Next", runs: [{ text: "Next" }] },
  ], "root", "ordered");
  original.marker = "I";
  original.start = 7;
  original.reversed = true;
  const moved = indentListItem(original, "root", 1, () => "uppercase-child");
  assert.ok(moved);
  const children = moved.block.items[0].children;
  assert.equal(children.length, 2);
  assert.deepEqual(children[0], { ...list(["Lowercase child"], "lowercase", "ordered"), marker: "a", start: 3 });
  assert.deepEqual(children[1], {
    ...list([{ text: "Next", runs: [{ text: "Next" }] }], "uppercase-child", "ordered"),
    marker: "I", start: 6, reversed: true,
  });
});

test("indenting consecutive reversed-list items continues their original sequence", () => {
  const original = list(["Parent", "Second", "Third"], "root", "ordered");
  original.reversed = true;
  const first = indentListItem(original, "root", 1, () => "reversed-child");
  assert.ok(first);
  assert.equal(first.block.items[0].children[0].start, 2);
  const nextItem = first.block.items.findIndex(item => item === "Third");
  const second = indentListItem(first.block, "root", nextItem, () => "unused");
  assert.ok(second);
  assert.equal(second.block.items[0].children.length, 1);
  assert.deepEqual(second.block.items[0].children[0].items, ["Second", "Third"]);
  assert.equal(second.block.items[0].children[0].start, 2);
  assert.equal(second.block.items[0].children[0].reversed, true);
});

test("outdenting a nested item inserts it after its owning item and removes empty list wrappers", () => {
  const original = list([{ text: "Parent", children: [list(["First", "Second"], "child-list")] }, "Sibling"]);
  const moved = outdentListItem(original, "child-list", 0);
  assert.ok(moved);
  assert.deepEqual(moved.block.items, [
    { text: "Parent", children: [list(["Second"], "child-list")] },
    "First",
    "Sibling",
  ]);
  assert.deepEqual({ listId: moved.listId, itemIndex: moved.itemIndex }, { listId: "root", itemIndex: 1 });
  const emptied = outdentListItem(list([{ text: "Parent", children: [list(["Only child"], "child-list")] }]), "child-list", 0);
  assert.deepEqual(emptied.block.items, [{ text: "Parent" }, "Only child"]);
});

test("root list items cannot be outdented and the first item cannot be indented", () => {
  const original = list(["First", "Second"]);
  assert.equal(indentListItem(original, "root", 0, () => "unused"), null);
  assert.equal(outdentListItem(original, "root", 0), null);
});
