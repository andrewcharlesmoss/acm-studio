import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { readStudioSource } from "./studio-module-source.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const image = await load("../app/content/inline-image.ts");
const rich = await load("../app/content/rich-text.ts");
const math = await load("../app/content/math-runs.ts");
const validation = await load("../app/content/rich-text-validation.ts");
const media = await load("../app/content/media-references.ts");
const workspace = await load("../app/studio/workspace-validation.ts");
const templates = await load("../app/studio/template-model.ts");
const packages = await load("../app/studio/template-package.ts");
const html = await load("../app/studio/studio-html-editor.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { renderText } = await load("../app/components/content.tsx");
const { contentWordCount } = await load("../app/content/reading-time.ts");
const { readableRichText } = await load("../app/content/footnote-runs.ts");
const { containsRichTextInlineObjects } = await load("../app/content/rich-text-contract.ts");
const descriptor = { type: "image", mediaId: "source-image", alt: "", width: 120 };
const atom = image.inlineImageRun(descriptor);
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const paragraph = { id: "image-p", type: "paragraph", text: "before\uFFFCafter", runs: [{ text: "before" }, atom, { text: "after" }] };

test("Image is exactly one mark-free logical slot with a bounded safe descriptor", () => {
  assert.equal(validation.validRichTextRun(atom), true);
  assert.equal(rich.plainTextFromRuns([atom]), "\uFFFC");
  assert.equal(readableRichText("\uFFFC", [atom]), "");
  const invalid = [null, { ...descriptor, extra: 1 }, { ...descriptor, mediaId: "" }, { ...descriptor, mediaId: " " }, { ...descriptor, mediaId: "x".repeat(161) }, { ...descriptor, alt: "x".repeat(1001) }, ...[0, -1, 2401, 1.5, NaN, "20"].map(width => ({ ...descriptor, width })), ...["javascript:alert(1)", "data:image/png;base64,x", "blob:temporary", "//example.com/image.png"].map(src => ({ ...descriptor, src }))];
  for (const value of invalid) assert.equal(validation.validRichTextRun(image.inlineImageRun(value)), false, JSON.stringify(value));
  for (const value of [{ ...descriptor, width: undefined }, { type: "image", src: "/image.png", alt: "" }, { type: "image", src: "https://example.com/image.png", alt: "Image" }]) assert.equal(validation.validRichTextRun(image.inlineImageRun(value)), true);
  assert.equal(validation.validRichTextRun({ ...atom, text: "selected prose" }), false);
  assert.equal(validation.validRichTextRun({ ...atom, marks: ["bold"] }), false);
});

test("insertion replaces the selected range immutably; only one selected slot is active", () => {
  const source = freeze([{ text: "abcd", marks: ["bold"] }]);
  for (let at = 0; at <= 4; at++) assert.equal(rich.plainTextFromRuns(image.insertInlineImage(source, at, at, descriptor)), "abcd".slice(0, at) + "\uFFFC" + "abcd".slice(at));
  const next = image.insertInlineImage(source, 1, 3, descriptor);
  assert.equal(rich.plainTextFromRuns(next), "a\uFFFCd");
  assert.deepEqual(image.inlineImageAtRange(next, 1, 2).image, descriptor);
  for (const range of [[1, 1], [2, 2], [0, 2], [-1, 0], [NaN, NaN]]) assert.equal(image.inlineImageAtRange(next, ...range), null);
  for (const range of [[-1, 0], [0, 5], [2, 1], [NaN, 1]]) assert.equal(image.insertInlineImage(source, ...range, descriptor), null);
  assert.equal(image.insertInlineImage(source, 0, 0, { ...descriptor, width: 0 }), null);
  assert.equal(source[0].text, "abcd");
  assert.deepEqual(rich.updateTextMark(next, 0, 3, "italic")[1], { ...atom, marks: undefined });
});

test("HTML escapes descriptors, keeps blank alt, ignores unsafe resolved URLs and renders missing files", () => {
  const value = { ...descriptor, alt: '\"<img onerror=x>&' };
  const markup = image.inlineImageHtml(value, { "source-image": "blob:resolved-file" }, true);
  assert.match(markup, /contenteditable="false"/);
  assert.match(markup, /alt="&quot;&lt;img onerror=x&gt;&amp;"/);
  assert.match(markup, /width="120"/);
  assert.doesNotMatch(markup, /\uFFFC/);
  assert.deepEqual(image.inlineImageFromData(JSON.stringify(value)), value);
  assert.equal(image.inlineImageFromData('{"type":"image"}'), null);
  assert.equal(image.inlineImageFromData("x".repeat(80001)), null);
  const decorative = image.inlineImageHtml(descriptor, { "source-image": "blob:resolved" });
  assert.match(decorative, /alt=""/);
  assert.match(image.inlineImageHtml(descriptor), /Image unavailable/);
  assert.doesNotMatch(image.inlineImageHtml(descriptor, { "source-image": "javascript:alert(1)" }), /src=/);
  assert.match(image.inlineImageHtml({ ...descriptor, src: "/fallback.png", width: undefined }, { "source-image": "blob:resolved" }), /src="blob:resolved"/);
  assert.match(image.inlineImageHtml({ ...descriptor, src: "/fallback.png" }), /src="\/fallback.png"/);
  const preview = renderToStaticMarkup(createElement("p", null, renderText(paragraph.text, paragraph.runs, { "source-image": "blob:resolved" })));
  assert.match(preview, /before.*<img.*after/);
  assert.doesNotMatch(preview, /\uFFFC/);
  const portable = html.blockToHtml(paragraph);
  assert.match(portable, /data-image-object=/);
  assert.doesNotMatch(portable, /blob:|\uFFFC/);
});

test("every bounded descriptor round-trips and inherited media properties remain missing files", () => {
  const value = { type: "image", src: "https://example.com/" + '"'.repeat(11980), alt: "\u0000".repeat(1000), mediaId: "\u0000".repeat(160), width: 2400 };
  assert.equal(validation.validRichTextRun(image.inlineImageRun(value)), true);
  assert.deepEqual(image.inlineImageFromData(JSON.stringify(value)), value);
  for (const mediaId of ["__proto__", "constructor", "toString"]) assert.match(image.inlineImageHtml({ ...descriptor, mediaId }), /Image unavailable/);
  for (const url of [null, {}, 12, true]) assert.match(image.inlineImageHtml(descriptor, { "source-image": url }), /Image unavailable/);
});

test("all rich fields retain image objects and canonical media references", () => {
  const plain = { text: "\uFFFC", runs: [atom] };
  const blocks = [paragraph, { id: "h", type: "heading", level: 2, ...plain }, { id: "b", type: "button", label: plain.text, labelRuns: plain.runs, url: "/", style: "primary" }, { id: "l", type: "list", style: "unordered", items: [plain] }, { id: "q", type: "quote", ...plain, children: [], attribution: plain.text, attributionRuns: plain.runs }, { id: "t", type: "table", rows: [[plain.text]], cellRuns: [[plain.runs]], caption: plain.text, captionRuns: plain.runs }, { id: "i", type: "image", src: "/image.png", alt: "", caption: plain.text, captionRuns: plain.runs }, { id: "e", type: "embed", url: "https://example.com", title: "Example", caption: plain.text, captionRuns: plain.runs }];
  for (const block of blocks) assert.equal(workspace.validContentBlocks([block]), true, block.type);
  assert.equal(media.contentMediaIds(freeze(blocks)).length, 10);
  assert.deepEqual(media.historicalContentMediaIds(blocks), []);
  assert.equal(contentWordCount([{ id: "b", type: "button", label: "\uFFFC", labelRuns: [atom], url: "/", style: "primary" }]), 0);
});

test("current storage gates accept image objects and predecessor envelopes reject them", () => {
  const document = { ...initialStudioWorkspace.documents[0], blocks: [paragraph] };
  const value = { ...initialStudioWorkspace, activeDocumentId: document.id, documents: [document] };
  for (const read of [workspace.validateStudioWorkspace, workspace.migrateStudioWorkspace]) {
    assert.equal(read({ ...value, version: 24 }).version, 24);
    for (const version of [22, 23]) assert.throws(() => read({ ...value, version }));
  }
  const set = templates.createTemplateSet(); set.parts[0].nodes = [paragraph];
  assert.equal(templates.validateTemplateStore({ ...templates.emptyTemplateStore(), sets: [set] }).version, "0.26.0");
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: "0.24.0", sets: [set] }));
  const snapshot = { version: "0.25.0", set, templateId: set.templates.find(entry => entry.kind === "post").id };
  assert.equal(templates.validateTemplateSnapshot(snapshot).version, "0.26.0");
  assert.throws(() => templates.validateTemplateSnapshot({ ...snapshot, version: "0.24.0" }));
  assert.equal(containsRichTextInlineObjects({ bin: [{ nested: paragraph }] }, "image"), true);
});

test("remapping is immutable, touches every owned rich field and does not chain colliding IDs", () => {
  const legacy = { text: "legacy prose", marks: ["bold", { type: "inline-image", mediaId: "source-image", alt: "", width: 24 }] };
  const source = freeze([{ id: "q", type: "quote", text: "\uFFFC", runs: [atom], attribution: "legacy prose", attributionRuns: [legacy], children: [{ id: "l", type: "list", style: "unordered", items: [{ text: "\uFFFC", runs: [atom], style: { backgroundImageMediaId: "source-image" }, children: [{ id: "nested", type: "list", style: "unordered", items: [{ text: "\uFFFC", runs: [atom] }] }] }] }] }]);
  const next = media.remapContentMediaIds(source, new Map([["source-image", "target-image"], ["target-image", "wrong-image"]]));
  assert.ok(media.contentMediaIds(next).every(id => id === "target-image"));
  assert.ok(media.contentMediaIds(source).every(id => id === "source-image"));
  assert.equal(next[0].attributionRuns[0].text, "legacy prose");
  assert.equal(media.remapContentMediaIds(source, new Map()), source);
});

test("template package import remaps atoms, legacy marks, fixed cover and layout backgrounds", () => {
  const set = templates.createTemplateSet();
  const legacy = { text: "authored", marks: [{ type: "inline-image", mediaId: "source-image", alt: "" }] };
  set.parts[0].nodes = [{ id: "package-columns", type: "columns", style: { backgroundImageMediaId: "source-image" }, children: [{ id: "package-column", type: "column", style: { backgroundImageMediaId: "source-image" }, children: [paragraph, { id: "package-list", type: "list", style: "unordered", items: [{ text: "authored", runs: [legacy] }] }] }] }];
  set.templates[0].nodes.find(node => node.type === "element" && node.element === "cover-image") ?? set.templates[0].nodes.push({ id: "fixed-cover", type: "element", element: "cover-image", fixedImage: { mediaId: "source-image", src: "", alt: "" } });
  const input = freeze({ format: "acm-studio-template-set", version: "0.25.0", set, media: [{ id: "source-image", name: "Source.png", type: "image/png", size: 1, createdAt: "2026-10-04T12:00:00Z", updatedAt: "2026-10-04T12:00:00Z", altText: "", caption: "", folderId: null, dataBase64: "AA==" }] });
  const previousWindow = globalThis.window;
  let imported;
  try { globalThis.window = { atob }; imported = packages.prepareTemplateImport(input); }
  finally { globalThis.window = previousWindow; }
  assert.notEqual(imported.assets[0].id, "source-image");
  assert.deepEqual(templates.templateMediaIds(imported.set), [imported.assets[0].id]);
  assert.deepEqual(templates.templateMediaIds(input.set), ["source-image"]);
  assert.equal(imported.set.parts[0].nodes[0].children[0].children[0].runs[1].inline.mediaId, imported.assets[0].id);
  assert.equal(imported.set.parts[0].nodes[0].children[0].children[1].items[0].runs[0].text, "authored");
});

// Run both production parsers against explicit DOM boundary fixtures. Native
// browser parsing and interaction are a separate rendered acceptance gate.
async function parser(path, name, bindings) {
  const source = path.endsWith("studio-canvas.tsx") ? readStudioSource("app/studio/studio-canvas.tsx") : await readFile(new URL(path, import.meta.url), "utf8");
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(tree).replace(/^export\s+/, "") + `\nglobalThis.actual = ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const scope = { ...image, ...rich, Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 }, HTMLElement: class {}, ...bindings };
  runInNewContext(code, scope);
  return scope.actual;
}
test("production editor and portable parsers read the descriptor and reject invalid typed metadata", async () => {
  const root = { childNodes: [{ nodeType: 1, tagName: "SPAN", dataset: { imageObject: JSON.stringify(descriptor) }, childNodes: [{ nodeType: 3, textContent: "ignored rendering" }] }] };
  for (const [path, name] of [["../app/studio/studio-canvas.tsx", "editorToRuns"], ["../app/studio/studio-html-editor.ts", "parseRuns"]]) {
    const bindings = name === "editorToRuns" ? {
      ...await loadProductionModule(new URL("../app/studio/rich-text-line-break.ts", import.meta.url)),
      ...await loadProductionModule(new URL("../app/studio/rich-text-dom.ts", import.meta.url)),
    } : {};
    const read = await parser(path, name, bindings);
    assert.deepEqual(JSON.parse(JSON.stringify(read(root))), [atom]);
    const invalid = { childNodes: [{ ...root.childNodes[0], dataset: { imageObject: '{"type":"image","src":"javascript:x","alt":""}' } }] };
    assert.throws(() => read(invalid), /Original content has been retained/);
  }
});
