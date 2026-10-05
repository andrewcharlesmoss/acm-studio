import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const rich = await load("../app/content/rich-text.ts");
const footnote = await load("../app/content/footnote-runs.ts");
const math = await load("../app/content/math-runs.ts");
const image = await load("../app/content/inline-image.ts");
const { richTextDomLength, richTextNodeLength, richTextOffset, richTextPointAtOffset, richTextTrailingSeparatorLength } = await load("../app/studio/rich-text-dom.ts");
const { isRichTextLineBreakFiller } = await load("../app/studio/rich-text-line-break.ts");

// Only the DOM interfaces used by the pure mapping are modelled. Real browser
// selection and editing remain a separate rendered acceptance requirement.
function node(tagName, children = [], dataset = {}) {
  const value = {
    nodeType: tagName === "#text" ? 3 : 1,
    nodeValue: tagName === "#text" ? children : null,
    tagName, dataset, style: {}, lang: "", dir: "", getAttribute() { return null; }, hasAttribute() { return false; },
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
  assert.equal(richTextOffset(root, ...Object.values(richTextPointAtOffset(root, 99))), 4);
});

// Exercise the production parser body, not a second interpretation of it.
const canvas = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const parserStart = canvas.indexOf("function editorToRuns(editor: HTMLElement)");
const parserBody = ts.transpileModule(canvas.slice(parserStart, canvas.indexOf("\nfunction AlignmentIcon", parserStart)), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
class FixtureElement { static [Symbol.hasInstance](value) { return value.nodeType === 1; } }
const editorToRuns = new Function("normaliseTextRuns", "safeImageSource", "safeTextLink", "HTMLElement", "Node", "validFootnoteId", "footnoteReferenceRun", "mathObjectFromData", "legacyMathFromData", "mathRun", "inlineImageFromData", "inlineImageRun", "isRichTextLineBreakFiller", "richTextTrailingSeparatorLength", `${parserBody}; return editorToRuns;`)(rich.normaliseTextRuns, rich.safeImageSource, rich.safeTextLink, FixtureElement, { TEXT_NODE: 3, ELEMENT_NODE: 1 }, footnote.validFootnoteId, footnote.footnoteReferenceRun, math.mathObjectFromData, math.legacyMathFromData, math.mathRun, image.inlineImageFromData, image.inlineImageRun, isRichTextLineBreakFiller, richTextTrailingSeparatorLength);

for (const authored of ["", "\n", "a\n", "a\n\n", "a\nb"]) test(`authored soft breaks retain expected content ${JSON.stringify(authored)}`, () => {
  const children = authored.split("\n").flatMap((part, index) => [...(index ? [node("BR", [], { studioLineBreak: "true" })] : []), ...(part ? [text(part)] : [])]);
  if (authored.endsWith("\n")) children.push(node("BR", [], { studioLineBreakFiller: "true" }));
  const root = element("DIV", ...children);
  root.classList = { contains: name => name === "rich-text-editor" };
  assert.equal(rich.plainTextFromRuns(editorToRuns(root)), authored);
  assert.equal(richTextDomLength(root), authored.length);
  roundTrips(root);
  roundTrips(root, [authored.length]);
  if (authored.endsWith("\n")) assert.deepEqual(richTextPointAtOffset(root, authored.length), { node: root, offset: children.length - 1 }, "terminal caret precedes filler");
});

test("editable native filler and detached clipboard BRs have distinct projections", () => {
  const root = element("DIV", text("one"), element("BR"));
  assert.equal(rich.plainTextFromRuns(editorToRuns(root)), "one\n", "pasted terminal BR is content");
  root.classList = { contains: name => name === "rich-text-editor" };
  assert.equal(rich.plainTextFromRuns(editorToRuns(root)), "one", "unmarked native terminal BR is filler");
  assert.equal(richTextDomLength(root), 3);
  roundTrips(root);
});

test("literal terminal newline and formatted BR marks survive parsing", () => {
  const root = element("DIV", element("STRONG", text("one\n"), node("BR", [], { studioLineBreak: "true" })), node("BR", [], { studioLineBreakFiller: "true" }));
  root.classList = { contains: name => name === "rich-text-editor" };
  assert.deepEqual(editorToRuns(root), [{ text: "one\n\n", marks: ["bold"] }]);
  assert.equal(richTextDomLength(root), 5);
  roundTrips(root);
});

test("DOM length and root-end caret agree with the actual production parser", () => {
  const marker = node("SUP", [text("†")], { footnoteMarker: "true" });
  const fixtures = [
    element("DIV", text("a"), node("SUP", [element("A", text("123"))], { footnoteObject: "note" }), text("b")),
    element("DIV", node("SUP", [text("123")], { footnoteObject: "note" })),
    element("DIV", node("SUP", [text("invalid")], { footnoteObject: "" })),
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

test("atomic footnotes count one slot and preserve both sides of adjacent objects", () => {
  const first = node("SUP", [element("A", text("12"))], { footnoteObject: "one" });
  const second = node("SUP", [text("999")], { footnoteObject: "two" });
  const root = element("DIV", text("a"), first, second, text("b"));
  assert.equal(richTextNodeLength(first), 1);
  assert.equal(richTextDomLength(root), 4);
  for (const affinity of ["forward", "backward"]) for (let offset = 0; offset <= 4; offset++) {
    const point = richTextPointAtOffset(root, offset, affinity);
    assert.equal(richTextOffset(root, point.node, point.offset), offset);
    assert.equal(first.contains(point.node) || second.contains(point.node), false);
  }
  const parsed = editorToRuns(root);
  assert.deepEqual(parsed.filter(run => run.inline).map(run => run.inline.id), ["one", "two"]);
  assert.equal(rich.plainTextFromRuns(parsed), `a${footnote.INLINE_OBJECT_CHARACTER}${footnote.INLINE_OBJECT_CHARACTER}b`);
});

test("Math descendants have one logical slot and the actual parser retains typed source", () => {
  const object = { type: "math", latex: "x^2", alternativeText: "square", sourceRuns: [{ text: "x^2", marks: ["bold"] }] };
  const root = element("DIV", text("a"), node("SPAN", [element("SPAN", text("generated equation")), element("MATH", text("duplicate source"))], { mathObject: JSON.stringify(object) }), text("b"));
  assert.equal(richTextDomLength(root), 3);
  roundTrips(root);
  assert.deepEqual(editorToRuns(root), [{ text: "a", marks: undefined }, { text: "\uFFFC", inline: object, marks: undefined }, { text: "b", marks: undefined }]);
});

test("typed image descendants and missing-file labels own exactly one logical slot", () => {
  const descriptor = { type: "image", mediaId: "missing-file", alt: "Missing image", width: 120 };
  for (const tag of ["IMG", "SPAN"]) {
    const object = node(tag, tag === "SPAN" ? [text("Missing image")] : [], { imageObject: JSON.stringify(descriptor) });
    const root = element("DIV", text("a"), object, text("b"));
    assert.equal(richTextDomLength(root), 3); roundTrips(root);
    assert.deepEqual(editorToRuns(root), [{ text: "a", marks: undefined }, { ...image.inlineImageRun(descriptor), marks: undefined }, { text: "b", marks: undefined }]);
    for (let offset = 0; offset <= 3; offset++) assert.equal(object.contains(richTextPointAtOffset(root, offset).node), false);
  }
});
test("legacy equation descendants preserve long original text and split formats", () => {
  const mark = { type: "math", latex: "x^2", alternativeText: "square" };
  const source = [{ text: "a".repeat(12001), marks: ["bold", mark] }, { text: "b", marks: ["italic", mark] }];
  const wrapper = node("SPAN", [element("SPAN", text("generated"))], { mathLegacy: JSON.stringify(source), inlineText: source.map(run => run.text).join("") });
  const root = element("DIV", text("start"), wrapper, text("end"));
  assert.equal(richTextDomLength(root), 12010);
  assert.deepEqual(editorToRuns(root).slice(1, 3), source);
  roundTrips(root, [0, 5, 12007, 12010]);
});

const { readMathClipboardRuns } = await load("../app/studio/math-clipboard.ts");
test("native image clipboard retains descriptors and refuses malformed objects before insertion", () => {
  const previous = globalThis.DOMParser;
  const descriptor = { type: "image", mediaId: "image", alt: "", width: 120 };
  const object = node("IMG", [], { imageObject: JSON.stringify(descriptor) });
  const root = element("DIV", text("before"), object, text("after"));
  root.querySelector = selector => selector.startsWith("[data-") ? object : null;
  try {
    globalThis.DOMParser = class { parseFromString() { return { body: root }; } };
    const decoded = readMathClipboardRuns('<img data-image-object="typed" />', editorToRuns);
    assert.deepEqual(decoded, { handled: true, runs: [{ text: "before", marks: undefined }, { ...image.inlineImageRun(descriptor), marks: undefined }, { text: "after", marks: undefined }] });
    object.dataset.imageObject = JSON.stringify({ ...descriptor, width: 0 });
    assert.equal("error" in readMathClipboardRuns('<img data-image-object="typed" />', editorToRuns), true);
  } finally { globalThis.DOMParser = previous; }
});
test("Math native clipboard decodes actual typed objects rather than generated descendants", () => {
  const previous = globalThis.DOMParser;
  const expression = { type: "math", latex: "x^2", alternativeText: "x squared", sourceRuns: [{ text: "x^2", marks: ["bold"] }] };
  const root = element("DIV", text("before "), node("SPAN", [text("generated KaTeX descendants")], { mathObject: JSON.stringify(expression) }), text(" after"));
  root.querySelector = selector => selector.startsWith("[data-") ? root.childNodes[1] : null;
  try {
    globalThis.DOMParser = class { parseFromString(html) { return { body: html.startsWith("<code>") || html.startsWith("<!--") ? { querySelector: () => null } : root }; } };
    const decoded = readMathClipboardRuns('<span data-math-object="typed">display</span>', editorToRuns);
    assert.deepEqual(decoded, { handled: true, runs: [{ text: "before ", marks: undefined }, { ...math.mathRun(expression), marks: undefined }, { text: " after", marks: undefined }] });
    root.childNodes[1].dataset.mathObject = '{"type":"math","latex":"x","alternativeText":"","extra":true}';
    assert.equal("error" in readMathClipboardRuns('<span data-math-object="typed"></span>', editorToRuns), true);
    root.childNodes[1].dataset = { mathLegacy: JSON.stringify([{ text: "authored prose", marks: ["bold", { type: "math", latex: "y^3", alternativeText: "" }] }]) };
    assert.equal(readMathClipboardRuns('<span data-math-legacy="typed"></span>', editorToRuns).runs[1].text, "authored prose");
    root.querySelector = () => ({ tagName: "SCRIPT" });
    assert.equal("error" in readMathClipboardRuns('<span data-math-object="typed"><script></script></span>', editorToRuns), true);
    assert.equal("error" in readMathClipboardRuns('data-math-object="' + "x".repeat(1000000), editorToRuns), true);
    assert.deepEqual(readMathClipboardRuns("<b>ordinary text</b>", editorToRuns), { handled: false });
    assert.deepEqual(readMathClipboardRuns('<code>&lt;span data-math-object="example"&gt;</code>', editorToRuns), { handled: false });
    assert.deepEqual(readMathClipboardRuns('<!-- data-math-object="example" -->', editorToRuns), { handled: false });
  } finally { globalThis.DOMParser = previous; }
});


test("actual editor parser reads legacy span Language and direction-only bdo", () => {
  const legacy = element("SPAN", text("ancien")); legacy.lang = "fr"; legacy.dir = "ltr";
  const direction = element("BDO", text("direction")); direction.dir = "rtl"; direction.hasAttribute = name => name === "dir";
  assert.deepEqual(editorToRuns(element("DIV", legacy, direction)), [{ text: "ancien", marks: [{ type: "language", language: "fr", direction: "ltr" }] }, { text: "direction", marks: [{ type: "language", language: "", direction: "rtl" }] }]);
});
