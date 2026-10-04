import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const richSource = ts.transpileModule(await readFile(new URL("../app/content/rich-text.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const richUrl = `data:text/javascript;base64,${Buffer.from(richSource).toString("base64")}`;
const rich = await import(richUrl);
const source = ts.transpileModule(await readFile(new URL("../app/studio/rich-text-dom.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"../content/rich-text"', JSON.stringify(richUrl));
const { richTextDomLength, richTextNodeLength, richTextOffset, richTextPointAtOffset } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

// Only the DOM interfaces used by the pure mapping are modelled. Real browser
// selection and editing remain a separate rendered acceptance requirement.
function node(tagName, children = [], dataset = {}) {
  const value = {
    nodeType: tagName === "#text" ? 3 : 1,
    nodeValue: tagName === "#text" ? children : null,
    tagName, dataset, style: {}, lang: "", dir: "", getAttribute() { return null; },
    get textContent() { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map(child => child.textContent).join(""); },
    childNodes: tagName === "#text" ? [] : children, parentNode: null,
    contains(candidate) { return candidate === this || this.childNodes.some(child => child.contains(candidate)); },
  };
  value.childNodes.forEach(child => { child.parentNode = value; });
  return value;
}
const text = value => node("#text", value);
const element = (tag, ...children) => node(tag, children);

function roundTrips(root, offsets = Array.from({ length: richTextDomLength(root) + 1 }, (_, index) => index)) {
  for (const offset of offsets) {
    const point = richTextPointAtOffset(root, offset);
    assert.equal(richTextOffset(root, point.node, point.offset), offset, `round trip at ${offset}`);
  }
}

test("formatted text, Unicode UTF-16 positions and empty editors use logical offsets", () => {
  const root = element("DIV", text("A😀"), element("STRONG", text("bold")), text("end"));
  assert.equal(richTextDomLength(root), 10);
  roundTrips(root);
  const empty = element("DIV");
  assert.deepEqual(richTextPointAtOffset(empty, 0), { node: empty, offset: 0 });
  roundTrips(empty);
});

test("footnote marker decorations do not shift later text selections", () => {
  const selected = text("source");
  const markerText = text("†");
  const marker = node("SUP", [markerText], { footnoteMarker: "true" });
  const reference = element("SPAN", selected, marker);
  const later = text("later");
  const root = element("DIV", reference, later);
  assert.equal(richTextNodeLength(marker), 0);
  assert.equal(richTextDomLength(root), 11);
  assert.equal(richTextOffset(root, later, 2), 8);
  assert.equal(richTextOffset(root, markerText, 1), 6);
  assert.equal(richTextOffset(root, reference, 2), 6);
  roundTrips(root);
  for (let offset = 0; offset <= 11; offset++) assert.equal(marker.contains(richTextPointAtOffset(root, offset).node), false);
  assert.deepEqual(richTextPointAtOffset(root, 6), { node: later, offset: 0 }, "caret and range start exclude the preceding visible marker");
  assert.deepEqual(richTextPointAtOffset(root, 6, "backward"), { node: selected, offset: 6 }, "range end excludes the following visible marker");
});

test("adjacent zero-length decorations preserve range start/end affinity", () => {
  const first = node("SUP", [text("†")], { footnoteMarker: "true" });
  const second = node("SUP", [text("†")], { footnoteMarker: "true" });
  const before = text("before");
  const after = text("after");
  const root = element("DIV", before, first, second, after);
  assert.deepEqual(richTextPointAtOffset(root, 6), { node: after, offset: 0 });
  assert.deepEqual(richTextPointAtOffset(root, 6, "backward"), { node: before, offset: 6 });
  roundTrips(root);
  for (let offset = 0; offset <= 11; offset++) {
    const point = richTextPointAtOffset(root, offset, "backward");
    assert.equal(richTextOffset(root, point.node, point.offset), offset);
    assert.equal(first.contains(point.node) || second.contains(point.node), false);
  }
});

test("legacy inline images count their source projection once and keep carets outside", () => {
  const image = node("SPAN", [element("IMG"), text("Example"), text("source")], { inlineImage: "true", inlineText: "source", mediaId: "image" });
  const later = text("after");
  const root = element("DIV", text("before"), image, later);
  assert.equal(richTextDomLength(root), 17);
  assert.equal(richTextOffset(root, later, 1), 13);
  roundTrips(root, [0, 6, 12, 17]);
  for (let offset = 6; offset <= 12; offset++) assert.equal(image.contains(richTextPointAtOffset(root, offset).node), false);
});

test("line breaks and paragraph separators share the parser's logical projection", () => {
  const br = element("BR");
  const first = element("P", text("one"), br, text("two"));
  const empty = element("P");
  const last = element("DIV", element("EM", text("three")));
  const root = element("DIV", first, empty, last);
  assert.equal(richTextDomLength(root), 14);
  assert.equal(richTextOffset(root, first, 2), 4);
  assert.equal(richTextOffset(root, empty, 0), 8);
  roundTrips(root);
});

test("offset lookup rejects another editor and malformed positions", () => {
  const root = element("DIV", text("text"));
  const other = element("DIV", text("other"));
  for (const offset of [-1, 0.5, NaN, Infinity]) assert.equal(richTextOffset(root, root, offset), null);
  assert.equal(richTextOffset(root, other.childNodes[0], 0), null);
  assert.equal(richTextOffset(root, root.childNodes[0], 99), 4);
  assert.equal(richTextOffset(root, root, 99), 4);
});

test("restoring an unavailable position clamps to a valid editor boundary", () => {
  const root = element("DIV", text("one"), element("BR"));
  for (const offset of [-1, NaN, Infinity]) assert.equal(richTextOffset(root, ...Object.values(richTextPointAtOffset(root, offset))), 0);
  assert.equal(richTextOffset(root, ...Object.values(richTextPointAtOffset(root, 99))), 3);
});

// Exercise the production parser body, not a second interpretation of it.
const canvas = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const parserStart = canvas.indexOf("function editorToRuns(editor: HTMLElement)");
const parserBody = ts.transpileModule(canvas.slice(parserStart, canvas.indexOf("\nfunction AlignmentIcon", parserStart)), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
class FixtureElement { static [Symbol.hasInstance](value) { return value.nodeType === 1; } }
const editorToRuns = new Function("normaliseTextRuns", "safeImageSource", "safeTextLink", "HTMLElement", "Node", `${parserBody}; return editorToRuns;`)(rich.normaliseTextRuns, rich.safeImageSource, rich.safeTextLink, FixtureElement, { TEXT_NODE: 3, ELEMENT_NODE: 1 });

test("DOM length and root-end caret agree with the actual production parser", () => {
  const marker = node("SUP", [text("†")], { footnoteMarker: "true" });
  const fixtures = [
    element("DIV", element("P", text("one"))),
    element("DIV", element("P", text("one")), element("P", text("two"))),
    element("DIV", text("one"), element("BR")),
    element("DIV", text("one\n")),
    element("DIV", element("STRONG", text("one\n"))),
    element("DIV", element("P")),
    element("DIV", element("P", text("one")), element("P")),
    element("DIV", text("one"), element("BR"), element("BR")),
    element("DIV", node("SPAN", [text("source"), marker], { footnoteRef: "note" }), text("after")),
    element("DIV", node("SPAN", [text("ignored")], { inlineImage: "true", inlineText: "source", mediaId: "image" }), text("after")),
    element("DIV", node("SPAN", [text("ignored")], { inlineImage: "true", inlineText: "source\n", mediaId: "image" })),
    element("DIV", node("SPAN", [text("ignored")], { inlineImage: "true", inlineText: "source", imageSrc: "javascript:alert(1)" }), text("after")),
  ];
  for (const root of fixtures) {
    const typedLength = rich.plainTextFromRuns(editorToRuns(root)).length;
    assert.equal(richTextDomLength(root), typedLength);
    assert.equal(richTextOffset(root, root, root.childNodes.length), typedLength);
    // Legacy images may project several source characters, but browsers only
    // permit carets before/after the non-editable image, not between them.
    if (!root.childNodes.some(child => child.dataset?.inlineImage === "true")) roundTrips(root);
    else roundTrips(root, [0, typedLength]);
  }
});
