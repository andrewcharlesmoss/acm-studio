import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
async function moduleUrl(path) {
  const url = new URL(path, import.meta.url);
  if (modules.has(url.href)) return modules.get(url.href);
  let output = ts.transpileModule(await readFile(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const match of [...output.matchAll(/from "([^"]+)"/g)]) {
    if (!match[1].startsWith(".")) continue;
    output = output.replace(match[0], `from "${await moduleUrl(new URL(match[1].endsWith(".ts") ? match[1] : `${match[1]}.ts`, url))}"`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  modules.set(url.href, result);
  return result;
}
const { mapRichTextFields, visitRichTextFields } = await import(await moduleUrl("../app/content/rich-text-fields.ts"));
const { migrateLegacyFootnoteBlocks, footnoteReferenceIds, visibleFootnoteNumbers, orderedFootnoteEntries } = await import(await moduleUrl("../app/content/footnote-blocks.ts"));
const atom = "\uFFFC";
const marked = id => [{ text: "word", marks: ["bold", { type: "footnote", id }] }];
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function fixtures() {
  return [
    { id: "group", type: "group", children: [
      { id: "p", type: "paragraph", text: "word", runs: marked("paragraph"), style: { anchor: "anchor" } },
      { id: "h", type: "heading", level: 2, text: "word", runs: marked("heading") },
      { id: "quote", type: "quote", text: "word", runs: marked("quote"), children: [{ id: "inner", type: "paragraph", text: "word", runs: marked("inner") }], attribution: "word", attributionRuns: marked("citation") },
      { id: "table", type: "table", rows: [["word", "plain"], ["word", "word"]], cellRuns: [[marked("first-cell"), [{ text: "plain" }]], [marked("second-cell"), marked("third-cell")]], caption: "word", captionRuns: marked("table-caption"), cellMetadata: [[{ tag: "th" }, null], [null, null]], columnWidths: [100, 200] },
      { id: "image", type: "image", src: "/example.svg", alt: "Example", caption: "word", captionRuns: marked("image-caption") },
      { id: "embed", type: "embed", url: "https://example.test/", title: "Example", caption: "word", captionRuns: marked("embed-caption") },
      { id: "buttons", type: "buttons", children: [{ id: "button", type: "button", style: "primary", url: "/example", label: "word", labelRuns: [{ text: "word", marks: ["bold"] }] }] },
      { id: "list", type: "list", style: "unordered", items: ["plain", { text: "word", runs: marked("item"), style: { anchor: "item-anchor", backgroundColor: "#fff3cd" }, children: [{ id: "nested", type: "list", style: "ordered", start: 4, items: [{ text: "word", runs: marked("nested-item") }] }] }] },
    ] },
    { id: "notes", type: "footnotes", notes: [{ id: "paragraph", text: "Saved note" }, { id: "orphan", text: "Recoverable orphan" }] },
    { id: "plain", type: "paragraph", text: "Untouched" },
  ];
}

test("rich-field walk covers stored owners in content order and identifies dormant fields", () => {
  const source = freeze(fixtures());
  const fields = [];
  visitRichTextFields(source, (runs, field) => fields.push({ ...field, text: runs.map(run => run.text).join("") }));
  assert.deepEqual(fields.map(field => [field.blockId, field.kind]), [
    ["p", "text"], ["h", "text"], ["quote", "text"], ["inner", "text"], ["quote", "attribution"],
    ["table", "table-cell"], ["table", "table-cell"], ["table", "table-cell"], ["table", "table-cell"], ["table", "caption"],
    ["image", "caption"], ["embed", "caption"], ["button", "label"], ["list", "list-item"], ["nested", "list-item"],
  ]);
  assert.deepEqual(fields[8], { blockId: "table", kind: "table-cell", active: true, row: 1, column: 1, text: "word" });
  assert.equal(fields[2].active, false);
  assert.equal(fields[13].itemIndex, 1);
  assert.equal(mapRichTextFields(source, runs => runs), source);
});

test("legacy Footnote migration synchronises every plain projection and retains styles and notes", () => {
  const source = freeze(fixtures());
  const next = migrateLegacyFootnoteBlocks(source);
  const children = next[0].children;
  for (const block of children.slice(0, 3)) assert.equal(block.text, `word${atom}`);
  assert.equal(children[2].children[0].text, `word${atom}`);
  assert.equal(children[2].attribution, `word${atom}`);
  assert.deepEqual(children[3].rows, [[`word${atom}`, "plain"], [`word${atom}`, `word${atom}`]]);
  for (const block of children.slice(3, 6)) assert.equal(block.caption, `word${atom}`);
  assert.equal(children[7].items[1].text, `word${atom}`);
  assert.equal(children[7].items[1].children[0].items[0].text, `word${atom}`);
  assert.equal(children[7].items[1].style, source[0].children[7].items[1].style);
  assert.equal(children[3].cellMetadata, source[0].children[3].cellMetadata);
  assert.equal(children[3].columnWidths, source[0].children[3].columnWidths);
  assert.equal(next[1], source[1]);
  assert.equal(next[2], source[2]);
  assert.equal(children[6], source[0].children[6]);
  assert.equal(source[0].children[0].text, "word");
  const fields = [];
  visitRichTextFields(next, runs => fields.push(runs));
  for (const runs of fields.filter(runs => runs.some(run => run.inline))) {
    assert.deepEqual(runs[0].marks, ["bold"]);
    assert.equal(runs.at(-1).inline.type, "footnote");
  }
});

test("migrated references are ordered across all rich fields and a second migration is identity", () => {
  const next = migrateLegacyFootnoteBlocks(fixtures());
  assert.deepEqual(footnoteReferenceIds(next), ["paragraph", "heading", "inner", "citation", "first-cell", "second-cell", "third-cell", "table-caption", "image-caption", "embed-caption", "item", "nested-item"]);
  assert.equal(migrateLegacyFootnoteBlocks(next), next);
  assert.deepEqual(footnoteReferenceIds([{ id: "legacy", type: "paragraph", text: "word", runs: marked("old") }]), ["old"]);
});

test("active reference collection excludes dormant Quote bodies with empty or populated children", () => {
  const source = freeze([
    { id: "legacy", type: "quote", text: "word", runs: marked("legacy-body") },
    { id: "empty", type: "quote", text: "word", runs: marked("empty-dormant"), children: [], attribution: "word", attributionRuns: marked("empty-citation") },
    { id: "populated", type: "quote", text: "word", runs: marked("populated-dormant"), children: [{ id: "child", type: "paragraph", text: "word", runs: marked("active-child") }], attribution: "word", attributionRuns: marked("active-citation") },
  ]);
  const next = migrateLegacyFootnoteBlocks(source);
  assert.deepEqual(footnoteReferenceIds(source), ["legacy-body", "empty-citation", "active-child", "active-citation"]);
  assert.deepEqual(footnoteReferenceIds(next), ["legacy-body", "empty-citation", "active-child", "active-citation"]);
  assert.equal(next[1].runs.at(-1).inline.id, "empty-dormant");
  assert.equal(next[2].runs.at(-1).inline.id, "populated-dormant");
  assert.equal(next[0].children, undefined);
  assert.deepEqual(next[1].children, []);
  assert.equal(source[1].text, "word");
});

test("targeted rich updates preserve unrelated branches and update Button labels through the same contract", () => {
  const source = freeze(fixtures());
  const next = mapRichTextFields(source, (runs, field) => field.blockId === "button" ? [{ text: "New", marks: ["italic"] }] : runs);
  const children = next[0].children;
  assert.equal(children[6].children[0].label, "New");
  assert.deepEqual(children[6].children[0].labelRuns, [{ text: "New", marks: ["italic"] }]);
  assert.equal(children[0], source[0].children[0]);
  assert.equal(children[7], source[0].children[7]);
  assert.equal(next[1], source[1]);
});

test("plain-only blocks and absent fields stay untouched", () => {
  const blocks = freeze([{ id: "list", type: "list", style: "unordered", items: ["Plain"] }, { id: "quote", type: "quote", text: "Plain" }, { id: "table", type: "table", rows: [["Plain"]] }, { id: "image", type: "image", src: "/example.svg", alt: "Plain" }]);
  let visited = false;
  assert.equal(mapRichTextFields(blocks, () => { visited = true; return []; }), blocks);
  assert.equal(visited, false);
  assert.equal(migrateLegacyFootnoteBlocks(blocks), blocks);
});

test("visible numbering follows reference order across nested fields and preserves orphan text", () => {
  const source = freeze([
    { id: "hidden-group", type: "group", editorial: { hidden: true }, children: [{ id: "hidden-p", type: "paragraph", text: "word", runs: marked("hidden") }] },
    { id: "first", type: "paragraph", text: "word", runs: marked("second") },
    { id: "table", type: "table", rows: [[atom]], cellRuns: [[[{ text: atom, inline: { type: "footnote", id: "first" } }]]], caption: "word", captionRuns: marked("second") },
    { id: "dangling", type: "paragraph", text: "word", runs: marked("missing") },
    { id: "notes", type: "footnotes", notes: [{ id: "first", text: "First stored" }, { id: "orphan", text: "Keep orphan" }, { id: "second", text: "Second stored" }, { id: "hidden", text: "Keep hidden reference" }] },
  ]);
  const numbers = visibleFootnoteNumbers(source);
  assert.deepEqual([...numbers], [["second", 1], ["first", 2]]);
  const ordered = orderedFootnoteEntries(source[4].notes, numbers);
  assert.deepEqual(ordered.map(entry => [entry.note.id, entry.number]), [["second", 1], ["first", 2], ["orphan", undefined], ["hidden", undefined]]);
  assert.equal(ordered[2].note, source[4].notes[1]);
  assert.equal(source[4].notes[0].id, "first");
  assert.deepEqual([...visibleFootnoteNumbers([source[2], source[1], source[4]])], [["first", 1], ["second", 2]]);
});

test("dormant Quote body and hidden notes hosts cannot assign visible reference numbers", () => {
  const source = freeze([
    { id: "quote", type: "quote", text: "word", runs: marked("dormant"), children: [], attribution: "word", attributionRuns: marked("citation") },
    { id: "notes", type: "footnotes", notes: [{ id: "dormant", text: "Dormant" }, { id: "citation", text: "Citation" }] },
    { id: "hidden-owner", type: "group", editorial: { hidden: true }, children: [{ id: "hidden-notes", type: "footnotes", notes: [{ id: "hidden-note", text: "Hidden" }] }] },
    { id: "reference", type: "paragraph", text: "word", runs: marked("hidden-note") },
  ]);
  assert.deepEqual([...visibleFootnoteNumbers(source)], [["citation", 1]]);
});
