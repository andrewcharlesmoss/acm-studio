import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleCache = new Map();
async function compileModule(url) {
  if (moduleCache.has(url.href)) return moduleCache.get(url.href);
  const result = compileUncached(url);
  moduleCache.set(url.href, result);
  return result;
}
async function compileUncached(url) {
  const source = await readFile(url, "utf8").catch(error => {
    if (error.code !== "ENOENT" || !url.pathname.endsWith(".ts")) throw error;
    url = new URL(`${url.href}x`);
    return readFile(url, "utf8");
  });
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replace(/import ["'][^"']+\.css["'];?/g, "");
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    let resolved;
    if (specifier.startsWith(".")) {
      resolved = specifier.endsWith(".mjs")
        ? new URL(specifier, url).href
        : await compileModule(new URL(/\.tsx?$/.test(specifier) ? specifier : `${specifier}.ts`, url));
    } else {
      resolved = import.meta.resolve(specifier);
    }
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(`${outputText}\n//# sourceURL=${url.pathname}`).toString("base64")}`;
}


const load = path => compileModule(new URL(path, import.meta.url)).then(url => import(url));
const rich = await load("../app/content/rich-text.ts");
const caret = await load("../app/content/caret-formatting.ts");
const highlight = await load("../app/content/text-highlight.ts");
const footnote = await load("../app/content/footnote-runs.ts");
const { INLINE_OBJECT_CHARACTER: atom, footnoteReferenceRun: reference, validFootnoteReference, insertFootnoteReference, footnoteReferenceAtRange, migrateLegacyFootnoteRuns, readableTextFromFootnoteRuns } = footnote;

function deepFreeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }
function references(runs) { return runs.filter(run => run.inline).map(run => run.inline.id); }

test("a footnote reference has one logical slot and no visible prose", () => {
  const run = reference("fn-note");
  assert.equal(validFootnoteReference(run), true);
  assert.equal(rich.plainTextFromRuns([run]), atom);
  assert.equal(readableTextFromFootnoteRuns([{ text: "before" }, run, { text: "after" }]), "beforeafter");
  for (const candidate of [reference(""), reference("x".repeat(161)), { ...run, text: "note" }, { ...run, marks: ["bold"] }]) assert.equal(validFootnoteReference(candidate), false);
});

test("normalisation retains distinct adjacent references and does not mutate input", () => {
  const source = deepFreeze([{ text: "a" }, { text: "b" }, reference("one"), reference("two"), { text: "c" }]);
  const next = rich.normaliseTextRuns(source);
  assert.deepEqual(references(next), ["one", "two"]);
  assert.equal(next[0].text, "ab");
  assert.notEqual(next[1].inline, source[2].inline);
  assert.equal(rich.plainTextFromRuns(next), `ab${atom}${atom}c`);
});

test("caret insertion supports every text boundary including empty and UTF-16 text", () => {
  const source = deepFreeze([{ text: "A😀", marks: ["bold"] }, { text: "end", marks: ["italic"] }]);
  const text = rich.plainTextFromRuns(source);
  for (let offset = 0; offset <= text.length; offset++) {
    const next = insertFootnoteReference(source, offset, "note");
    assert.equal(rich.plainTextFromRuns(next), text.slice(0, offset) + atom + text.slice(offset));
    assert.deepEqual(references(next), ["note"]);
    assert.equal(next.find(run => run.inline).marks, undefined);
  }
  assert.deepEqual(insertFootnoteReference([], 0, "note"), [{ ...reference("note"), marks: undefined }]);
});

test("selection-end insertion retains selected words and their formats", () => {
  const source = deepFreeze([{ text: "selected", marks: ["bold", { type: "highlight", textColor: "#123456" }] }, { text: " trailing" }]);
  const next = insertFootnoteReference(source, 8, "note");
  assert.deepEqual(next[0], source[0]);
  assert.equal(rich.plainTextFromRuns(next), `selected${atom} trailing`);
});

test("new references insert before, between and after existing objects", () => {
  const source = deepFreeze([reference("one"), reference("two")]);
  for (let offset = 0; offset <= 2; offset++) {
    const expected = ["one", "two"]; expected.splice(offset, 0, "new");
    assert.deepEqual(references(insertFootnoteReference(source, offset, "new")), expected);
  }
});

test("invalid insertion positions, identities and source atoms fail without mutation", () => {
  const source = deepFreeze([{ text: "text" }]);
  for (const offset of [-1, 5, NaN, Infinity, 0.5]) assert.equal(insertFootnoteReference(source, offset, "note"), null);
  for (const id of ["", "x".repeat(161)]) assert.equal(insertFootnoteReference(source, 0, id), null);
  assert.equal(insertFootnoteReference([{ text: "many", inline: { type: "footnote", id: "old" } }], 1, "new"), null);
  assert.equal(insertFootnoteReference([{ text: "", inline: { type: "footnote", id: "old" } }], 0, "new"), null);
});

test("active-reference lookup distinguishes the object slot from adjacent text", () => {
  const source = [{ text: "a" }, reference("note"), { text: "b" }];
  assert.deepEqual(footnoteReferenceAtRange(source, 1, 1), { id: "note", offset: 1 });
  assert.deepEqual(footnoteReferenceAtRange(source, 1, 2), { id: "note", offset: 1 });
  for (const [start, end] of [[0, 0], [2, 2], [0, 2], [1, 3], [-1, 0], [1.5, 2], [NaN, 2], [1, 4]]) assert.equal(footnoteReferenceAtRange(source, start, end), null);
});

test("selected formatting preserves references and toggles only editable text", () => {
  const source = deepFreeze([{ text: "a", marks: ["bold"] }, reference("note"), { text: "b", marks: ["bold"] }]);
  const toggled = rich.updateTextMark(source, 0, 3, "bold");
  assert.deepEqual(toggled, [{ text: "a", marks: undefined }, { ...reference("note"), marks: undefined }, { text: "b", marks: undefined }]);
  for (const mode of ["set", "remove", "toggle"]) assert.deepEqual(references(rich.updateTextMark(source, 1, 2, "italic", mode)), ["note"]);
  assert.equal(rich.updateTextMark(source, 1, 2, "italic")[1].marks, undefined);
});

test("text insertion beside an object and replacement across it preserve correct identities", () => {
  const source = deepFreeze([{ text: "a" }, reference("note"), { text: "b" }]);
  for (let offset = 0; offset <= 3; offset++) {
    const next = rich.replaceTextRange(source, offset, offset, "x");
    assert.deepEqual(references(next), ["note"]);
    assert.equal(rich.plainTextFromRuns(next), `a${atom}b`.slice(0, offset) + "x" + `a${atom}b`.slice(offset));
  }
  assert.deepEqual(references(rich.replaceTextRange(source, 0, 1, "x")), ["note"]);
  assert.deepEqual(references(rich.replaceTextRange(source, 2, 3, "x")), ["note"]);
  assert.deepEqual(references(rich.replaceTextRange(source, 1, 2, "")), []);
  assert.equal(rich.plainTextFromRuns(rich.replaceTextRange(source, 1, 2, "x")), "axb");
});

test("legacy migration preserves text, split formats and one contiguous reference", () => {
  const mark = { type: "footnote", id: "note" };
  const source = deepFreeze([{ text: "before " }, { text: "first", marks: [mark, "bold"] }, { text: "second", marks: [mark, "italic"] }, { text: " after" }]);
  const next = migrateLegacyFootnoteRuns(source);
  assert.equal(rich.plainTextFromRuns(next), `before firstsecond${atom} after`);
  assert.deepEqual(references(next), ["note"]);
  assert.deepEqual(next[1].marks, ["bold"]);
  assert.deepEqual(next[2].marks, ["italic"]);
  assert.equal(next.some(run => run.marks?.some(mark => mark.type === "footnote")), false);
  assert.deepEqual(migrateLegacyFootnoteRuns(next), next);
});

test("legacy separate occurrences, overlapping IDs and existing atoms remain recoverable", () => {
  const old = id => ({ type: "footnote", id });
  const source = deepFreeze([{ text: "one", marks: [old("same")] }, { text: " middle " }, { text: "two", marks: [old("same")] }, { text: "both", marks: [old("a"), old("b")] }, reference("existing")]);
  const next = migrateLegacyFootnoteRuns(source);
  assert.deepEqual(references(next), ["same", "same", "a", "b", "existing"]);
  assert.equal(readableTextFromFootnoteRuns(next), "one middle twoboth");
  assert.deepEqual(migrateLegacyFootnoteRuns(next), next);
});

test("overlapping legacy references each migrate once at their own contiguous range end", () => {
  const mark = id => ({ type: "footnote", id });
  const next = migrateLegacyFootnoteRuns(deepFreeze([{ text: "first", marks: [mark("a")] }, { text: "both", marks: [mark("a"), mark("b")] }, { text: "last", marks: [mark("b")] }]));
  assert.deepEqual(references(next), ["a", "b"]);
  assert.equal(rich.plainTextFromRuns(next), `firstboth${atom}last${atom}`);
  const reordered = migrateLegacyFootnoteRuns([{ text: "first", marks: [mark("a"), mark("b")] }, { text: "last", marks: [mark("b"), mark("a")] }]);
  assert.deepEqual(references(reordered), ["a", "b"]);
  assert.equal(rich.plainTextFromRuns(reordered), `firstlast${atom}${atom}`);
  assert.deepEqual(migrateLegacyFootnoteRuns(next), next);
});

test("Button labels remove interactive atoms while retaining legacy visible text", () => {
  const next = rich.withoutInteractiveTextMarks([{ text: "a", marks: [{ type: "footnote", id: "old" }, "bold"] }, reference("note"), { text: "b", marks: [{ type: "link", url: "/path" }] }]);
  assert.equal(rich.plainTextFromRuns(next), "ab");
  assert.equal(next[0].marks[0], "bold");
  assert.deepEqual(references(next), []);
});

test("Highlight and pending caret formats retain adjacent references without formatting them", () => {
  const source = deepFreeze([{ text: "a", marks: [{ type: "highlight", textColor: "#123456" }] }, reference("note"), { text: "b", marks: [{ type: "highlight", textColor: "#123456" }] }]);
  const colours = highlight.highlightColoursAtRange(source, 0, 3);
  assert.equal(colours.textColor.value, "#123456");
  assert.equal(colours.textColor.mixed, false);
  const next = highlight.updateHighlightColour(source, 0, 3, "backgroundColor", "#abcdef");
  assert.deepEqual(references(next), ["note"]);
  assert.equal(next[1].marks, undefined);
  assert.equal(highlight.highlightRangeAtCaret(source, 1), null);
  assert.equal(highlight.highlightRangeAtCaret(source, 2), null);
  assert.deepEqual(caret.marksAtCaret(source, 1), []);
  const inserted = caret.formatCaretInsertion(`a${atom}b`, [{ text: "ax" }, reference("note"), { text: "b" }], 1, ["bold"]);
  assert.deepEqual(references(inserted.runs), ["note"]);
  assert.equal(inserted.runs.find(run => run.inline).marks, undefined);
  assert.deepEqual(inserted.runs.find(run => run.text === "x").marks, ["bold"]);
});
