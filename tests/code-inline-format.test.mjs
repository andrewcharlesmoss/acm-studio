import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withHtmlDom } from "./html-dom-fixture.mjs";
import { loadProductionModule } from "./production-module.mjs";
import { legacyGlobalTemplateLibrary } from "./helpers/legacy-global-template-library.mjs";

const codeRuns = await loadProductionModule(new URL("../app/content/code-runs.ts", import.meta.url));
const { CodeContent } = await loadProductionModule(new URL("../app/components/blocks/code-content.tsx", import.meta.url));
const { CodePresentationContext } = await loadProductionModule(new URL("../app/components/blocks/code-presentation-context.tsx", import.meta.url));
const validation = await loadProductionModule(new URL("../app/studio/workspace-validation.ts", import.meta.url));
const html = await loadProductionModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url));
const templates = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const { validateTemplatePackage } = await loadProductionModule(new URL("../app/studio/template-package.ts", import.meta.url));
const { validateStudioBackup } = await loadProductionModule(new URL("../app/studio/backup-store.ts", import.meta.url));
const globalTemplates = await loadProductionModule(new URL("../app/studio/global-template-contract.ts", import.meta.url));
const clipboard = await loadProductionModule(new URL("../app/studio/block-clipboard.ts", import.meta.url));
const fixtureContract = await loadProductionModule(new URL("../app/studio/test-site/contract.ts", import.meta.url));
const editorModel = await loadProductionModule(new URL("../app/studio/editor-model.ts", import.meta.url));
test("Code runs validate text-only Gutenberg marks plus safe links while preserving exact source", () => {
  const runs = [{ text: "const", marks: ["bold"] }, { text: " value = 1;\n", marks: [{ type: "link", url: "https://example.com" }] }];
  assert.equal(codeRuns.validCodeRuns("const value = 1;\n", runs), true);
  assert.equal(codeRuns.validCodeRuns("const value = 1;\n ", runs), false);
  const textMarks = ["strikethrough", "inline-code", "subscript", "superscript", "keyboard", { type: "highlight", backgroundColor: "#ffee00" }, { type: "language", language: "fr", direction: "ltr" }];
  assert.equal(codeRuns.validCodeRuns("const value = 1;\n", [{ text: "const", marks: textMarks }, runs[1]]), true);
  assert.equal(codeRuns.validCodeRuns("x", [{ text: "x", marks: [{ type: "footnote", id: "note" }] }]), false);
  assert.equal(codeRuns.validCodeRuns("x", [{ text: "x", marks: [{ type: "math", alternativeText: "x" }] }]), false);
  assert.equal(codeRuns.validCodeRuns("x", [{ text: "x", marks: [{ type: "inline-image", alt: "x", src: "/x.png" }] }]), false);
  assert.equal(codeRuns.validCodeRuns("x", [{ text: "x", marks: [{ type: "link", url: "javascript:alert(1)" }] }]), false);
  assert.equal(codeRuns.validCodeRuns("x", [{ text: "x", inline: { type: "image", alt: "x" } }]), false);
  assert.equal(validation.validContentBlocks([{ id: "code", type: "code", code: "const x = 1", runs: [{ text: "const", marks: ["bold"] }, { text: " x = 1" }] }]), true);
  assert.equal(validation.validContentBlocks([{ id: "code", type: "code", code: "const x = 1", runs: [{ text: "const x = 1 " }] }]), false);
});

test("Code edits preserve unaffected marks and exact whitespace", () => {
  const previous = "\tconst name = 1;\n\n";
  const runs = [{ text: "\tconst ", marks: ["bold"] }, { text: "name", marks: ["italic"] }, { text: " = 1;\n\n" }];
  const next = "\tconst value = 1;\n\n";
  const reconciled = codeRuns.reconcileCodeRuns(previous, runs, next);
  assert.equal(reconciled.map(run => run.text).join(""), next);
  assert.ok(reconciled[0].marks.includes("bold"));
  assert.ok(reconciled.some(run => run.text.includes(" = 1;\n\n")));
});

test("Code edit selection disambiguates repeated-character deletion and replacement", () => {
  const previous = "aaaa\n";
  const runs = [{ text: "aa", marks: ["bold"] }, { text: "aa\n" }];
  const deleted = codeRuns.reconcileCodeRuns(previous, runs, "aaa\n", { start: 0, end: 1, inputType: "deleteContentForward" });
  assert.deepEqual(deleted, [{ text: "a", marks: ["bold"] }, { text: "aa\n", marks: undefined }]);
  const replaced = codeRuns.reconcileCodeRuns(previous, runs, "baaa\n", { start: 0, end: 1, inputType: "insertText" });
  assert.deepEqual(replaced, [{ text: "ba", marks: ["bold"] }, { text: "aa\n", marks: undefined }]);
  assert.equal(deleted.map(run => run.text).join(""), "aaa\n");
  assert.equal(replaced.map(run => run.text).join(""), "baaa\n");
});

test("Code backward deletion uses captured caret offsets without changing newline fidelity", () => {
  const previous = "x\n\n";
  const runs = [{ text: "x\n", marks: ["italic"] }, { text: "\n" }];
  const deleted = codeRuns.reconcileCodeRuns(previous, runs, "x\n", { start: 2, end: 2, inputType: "deleteContentBackward" });
  assert.deepEqual(deleted, [{ text: "x", marks: ["italic"] }, { text: "\n", marks: undefined }]);
  assert.equal(deleted.map(run => run.text).join(""), "x\n");
});

test("Code caret Bold and Italic formats persist across successive typed characters", () => {
  let code = "ab";
  let runs = [{ text: code }];
  let pending = { offset: 2, marks: ["bold", "italic"] };
  for (const character of ["X", "Y"]) {
    const nextCode = `${code}${character}`;
    const result = codeRuns.applyCodeEdit(code, runs, nextCode, { start: code.length, end: code.length, inputType: "insertText" }, pending);
    code = nextCode;
    runs = result.runs;
    pending = result.pending;
  }
  assert.equal(code, "abXY");
  assert.deepEqual(runs, [{ text: "ab", marks: undefined }, { text: "XY", marks: ["bold", "italic"] }]);
  assert.deepEqual(pending, { offset: 4, marks: ["bold", "italic"] });
});

test("Code HTML inspection round-trips text-only Gutenberg marks, links and literal line breaks", () => withHtmlDom(() => {
  const block = { id: "source", type: "code", language: "javascript", code: "const x = 1;\n\n", visualStyle: { fontFamily: "monospace" }, runs: [{ text: "const", marks: ["bold", "strikethrough", "inline-code", "keyboard", "subscript", "superscript", { type: "highlight", backgroundColor: "#ffee00" }, { type: "language", language: "fr", direction: "ltr" }] }, { text: " x = 1;\n\n", marks: ["italic", { type: "link", url: "https://example.com" }] }] };
  const source = html.blockToHtml(block);
  assert.match(source, /data-code-font-family="monospace"/);
  assert.match(source, /<strong>const<\/strong>/);
  assert.match(source, /<bdo lang="fr" dir="ltr"><mark[^>]*><sup><sub><kbd><code><s><strong>/);
  assert.match(source, /<mark style="color:inherit;background-color:#ffee00">/);
  assert.match(source, /<bdo lang="fr" dir="ltr">/);
  assert.match(source, /<a href="https:\/\/example\.com"><em> x = 1;/);
  const parsed = html.parseHtmlToBlock(source, block);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.block.code, block.code);
  assert.equal(parsed.block.visualStyle.fontFamily, "monospace");
  assert.equal(parsed.block.runs.map(run => run.text).join(""), block.code);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.block.runs[0])), { ...block.runs[0], marks: [...block.runs[0].marks].reverse() });
  assert.deepEqual(parsed.block.runs[1].marks?.map(mark => typeof mark === "string" ? mark : { type: mark.type, url: mark.url }), [{ type: "link", url: "https://example.com" }, "italic"]);
}));

test("Code edit and preview render the supported text-only marks safely over syntax highlighting", () => {
  const code = "const value";
  const runs = [
    { text: "const", marks: ["bold", "strikethrough", "inline-code", "keyboard", "subscript", "superscript", { type: "highlight", backgroundColor: "#ffee00" }, { type: "language", language: "fr", direction: "ltr" }] },
    { text: " value", marks: [{ type: "link", url: "https://example.com" }] },
  ];
  const context = createElement(CodePresentationContext.Provider, { value: {} }, createElement(CodeContent, { code, runs, editing: true }));
  const markup = renderToStaticMarkup(context);
  assert.match(markup, /<bdo lang="fr" dir="ltr"><mark style="color:inherit;background-color:#ffee00"><sup><sub><kbd><code><s><strong>const<\/strong><\/s><\/code><\/kbd><\/sub><\/sup><\/mark><\/bdo>/);
  assert.match(markup, /<a href="https:\/\/example\.com"> value<\/a>/);
  assert.match(markup, /aria-hidden="true"/);
});

test("Code transforms preserve inline marks when converting to paragraph or Preformatted", async () => {
  const { transformBlock } = await loadProductionModule(new URL("../app/studio/block-transforms.ts", import.meta.url));
  const block = { id: "source", type: "code", code: "bold and linked", runs: [{ text: "bold", marks: ["bold"] }, { text: " and " }, { text: "linked", marks: [{ type: "link", url: "https://example.com" }] }] };
  const paragraph = transformBlock(block, { id: "paragraph", target: "paragraph" });
  const preformatted = transformBlock(block, { id: "code-to-preformatted", target: "paragraph" });
  for (const converted of [paragraph, preformatted]) {
    assert.equal(converted.runs.map(run => run.text).join(""), block.code);
    assert.deepEqual(converted.runs.filter(run => run.marks?.length), [block.runs[0], block.runs[2]]);
  }
  assert.equal(paragraph.runs.map(run => run.text).join(""), block.code);
  const codeFromParagraph = transformBlock({ id: "paragraph", type: "paragraph", text: block.code, runs: block.runs }, { id: "paragraph-to-code", target: "code" });
  assert.equal(codeFromParagraph.code, block.code);
  assert.deepEqual(codeFromParagraph.runs, block.runs);
  const monospace = transformBlock({ ...block, visualStyle: { fontFamily: "monospace" } }, { id: "code-to-paragraph", target: "paragraph" });
  assert.equal(monospace.style?.fontFamily, undefined);
  const responsiveMonospace = transformBlock({ ...block, visualStyle: { fontFamily: "monospace", margin: "8px 0", responsive: { tablet: { fontFamily: "monospace", textColor: "#123456" }, mobile: { fontFamily: "monospace", fontSizeCustom: "18px" } } } }, { id: "code-to-paragraph", target: "paragraph" });
  assert.equal(responsiveMonospace.style?.fontFamily, undefined);
  assert.deepEqual(responsiveMonospace.style?.responsive, { tablet: { textColor: "#123456" }, mobile: { fontSizeCustom: "18px" } });
  assert.equal(responsiveMonospace.style?.margin, "8px 0");
} );

test("portable carriers accept current Code runs and reject them in older envelopes", () => {
  const code = { id: "code", type: "code", code: "x", runs: [{ text: "x", marks: ["bold"] }] };
  const templateSet = templates.createTemplateSet("Code carrier");
  templateSet.templates[0].nodes.push(code);
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: "0.54.0", sets: [templateSet] }), /Code inline formatting/);
  assert.doesNotThrow(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), sets: [templateSet] }));
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.54.0", set: templateSet, media: [] }), /Code inline formatting/);
  assert.throws(() => validateStudioBackup({ format: "acm-studio-backup", version: 20, workspace: { blocks: [code] } }), /Code inline formatting/);
  const workspace = structuredClone(editorModel.initialStudioWorkspace);
  const backupDocument = workspace.documents.find(item => item.kind === "post");
  backupDocument.blocks.push(code);
  const currentBackup = validateStudioBackup({ format: "acm-studio-backup", version: 22, exportedAt: "2026-10-28T12:00:00.000Z", workspace, publications: null, media: { folders: [], assets: [] } });
  assert.deepEqual(currentBackup.workspace.documents.find(item => item.id === backupDocument.id).blocks.at(-1).runs, code.runs);
  const document = { id: "page", kind: "page", title: "Page", slug: "page", excerpt: "", status: "draft", updatedAt: "2026-01-01T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [{ ...code, visualStyle: { fontFamily: "monospace" } }] };
  const fixture = { format: "acm-test-site", version: 34, siteId: "test", documents: [document], categories: [], bin: [], activeDocumentId: "page", homeDocumentId: "page", browserImportComplete: true, templates: { ...templates.emptyTemplateStore(), sets: [templateSet] }, siteNavigation: { setId: templateSet.id, partId: templateSet.parts[0].id }, globalTemplates: [], publications: [], navigationMenus: [{ id: "navigation", name: "Navigation", links: [] }], defaultNavigationMenuId: "navigation", navigationAssignments: [] };
  assert.equal(fixtureContract.validTestSiteDocument({ ...fixture, version: 33 }), false);
  assert.equal(fixtureContract.validTestSiteDocument(fixture), true);
  assert.equal(fixtureContract.testSiteCollection(fixture).version, 54);
  const previousParser = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class {
      parseFromString(markup) {
        const attribute = markup.match(/data-acm-studio-blocks="([^"]*)"/)?.[1] ?? "";
        return { querySelector: () => ({ getAttribute: () => attribute.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">") }) };
      }
    };
    const current = clipboard.blockClipboardHtml([code]);
    assert.equal(clipboard.readBlockClipboardPayload(current).blocks[0].runs[0].marks[0], "bold");
    const old = current.replace(/&quot;version&quot;:\d+/, "&quot;version&quot;:20");
    assert.equal(clipboard.readBlockClipboardPayload(old), null);
  } finally { globalThis.DOMParser = previousParser; }
});

test("older workspace and publication envelopes reject Code runs rather than dropping them", () => {
  const document = { id: "page", kind: "page", title: "Page", slug: "page", blocks: [{ id: "code", type: "code", code: "x", runs: [{ text: "x", marks: ["bold"] }] }] };
  assert.throws(() => validation.migrateStudioWorkspace({ version: 42, documents: [document], categories: [], bin: [], activeDocumentId: "page" }), /unsupported version/);
  assert.throws(() => validation.validatePublicationSnapshot({ version: 34, posts: [{ localDocumentId: "page", slug: "page", title: "Page", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", blocks: document.blocks, mediaIds: [], section: "" }] }), /Code inline formatting/);
});

test("Code Monospace is Code-only and round-trips through current versioned carriers", async () => {
  const code = { id: "code", type: "code", code: "x", visualStyle: { fontFamily: "monospace" } };
  const paragraph = { id: "paragraph", type: "paragraph", text: "x", visualStyle: { fontFamily: "monospace" } };
  const styleModule = await loadProductionModule(new URL("../app/content/paragraph-styles.ts", import.meta.url));
  const fontSetting = await loadProductionModule(new URL("../app/studio/controls/font-family-setting.tsx", import.meta.url));
  assert.equal(styleModule.paragraphStyleToCss(code.visualStyle).fontFamily, styleModule.PARAGRAPH_FONT_FAMILIES.monospace.css);
  assert.equal(validation.validContentBlocks([code]), true);
  assert.equal(validation.validContentBlocks([paragraph]), false);
  assert.equal(validation.validContentBlocks([{ ...code, visualStyle: { responsive: { tablet: { fontFamily: "monospace" } } } }]), true);
  assert.equal(validation.validContentBlocks([{ ...paragraph, visualStyle: { responsive: { tablet: { fontFamily: "monospace" } } } }]), false);
  const codeFontMarkup = renderToStaticMarkup(createElement(fontSetting.FontFamilySetting, { value: "monospace", families: ["monospace"], onChange() {} }));
  assert.match(codeFontMarkup, /<option value="monospace" selected="">Monospace<\/option>/);
  assert.doesNotMatch(codeFontMarkup, /Arial|Helvetica/);
  const generalFontMarkup = renderToStaticMarkup(createElement(fontSetting.FontFamilySetting, { onChange() {} }));
  assert.doesNotMatch(generalFontMarkup, /<option value="monospace">/);

  const workspace = structuredClone(editorModel.initialStudioWorkspace);
  workspace.documents[0].blocks = [code];
  assert.equal(validation.validateStudioWorkspace({ ...workspace, version: 44 }).version, editorModel.initialStudioWorkspace.version);
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 43 }), /unsupported version/);
  const document = { localDocumentId: "p", kind: "post", slug: "p", title: "P", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", blocks: [code], mediaIds: [], section: "" };
  assert.equal(validation.validatePublicationSnapshot({ version: 36, posts: [document] }).version, validation.PUBLICATION_VERSION);
  assert.throws(() => validation.validatePublicationSnapshot({ version: 35, posts: [document] }), /Code monospace font/);

  const set = templates.createTemplateSet("Monospace Code");
  set.templates[0].nodes.push(code);
  assert.equal(templates.validateTemplateStore({ ...templates.emptyTemplateStore(), sets: [set] }).version, templates.TEMPLATE_VERSION);
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: "0.55.0", sets: [set] }), /Code monospace font/);
  assert.equal(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.56.0", set, media: [] }).version, templates.TEMPLATE_VERSION);
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.55.0", set, media: [] }), /Code monospace font/);

  const oldBackup = { format: "acm-studio-backup", version: 21, exportedAt: "2026-10-28T12:00:00.000Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup(oldBackup), /Code monospace font/);
  const newBackup = validateStudioBackup({ ...oldBackup, version: 22 });
  assert.equal(newBackup.workspace.version, editorModel.initialStudioWorkspace.version);

  const publication = { version: 36, posts: [document] };
  assert.equal(validation.validatePublicationSnapshot(publication).posts[0].blocks[0].visualStyle.fontFamily, "monospace");

  const fixture = { format: "acm-test-site", version: 34, siteId: "test", documents: [workspace.documents[0]], categories: workspace.categories, bin: [], activeDocumentId: "page-home", homeDocumentId: "page-home", browserImportComplete: true, templates: { ...templates.emptyTemplateStore(), sets: [set] }, siteNavigation: { setId: set.id, partId: set.parts[0].id }, globalTemplates: [], publications: [], navigationMenus: [{ id: "navigation", name: "Navigation", links: [] }], defaultNavigationMenuId: "navigation", navigationAssignments: [] };
  assert.equal(fixtureContract.validTestSiteDocument({ ...fixture, version: 33 }), false);
  assert.equal(fixtureContract.validTestSiteDocument(fixture), true);
  assert.equal(fixtureContract.testSiteCollection(fixture).version, 54);

  const makeGlobalSite = siteId => {
    const librarySet = structuredClone(set);
    const navigationSet = { ...structuredClone(set), id: `${siteId}-navigation`, name: "Navigation", templates: [], parts: [{ id: `${siteId}-navigation-part`, name: "Navigation", kind: "header", nodes: [{ id: `${siteId}-navigation-node`, type: "element", element: "navigation" }] }], navigation: [] };
    return { templates: { ...templates.emptyTemplateStore(), sets: [librarySet, navigationSet] }, siteNavigation: { setId: navigationSet.id, partId: navigationSet.parts[0].id } };
  };
  const global = legacyGlobalTemplateLibrary(globalTemplates.createGlobalTemplateLibrary({ test: makeGlobalSite("test"), test2: makeGlobalSite("test2") }));
  assert.equal(global.version, 46);
  assert.throws(() => globalTemplates.validateGlobalTemplateLibrary({ ...global, version: 26 }), /Code monospace font/);
  assert.equal(globalTemplates.validateGlobalTemplateLibrary(global).version, global.version);

  await withHtmlDom(() => {
    const clipboardHtml = clipboard.blockClipboardHtml([code]);
    assert.equal(clipboard.readBlockClipboardPayload(clipboardHtml).blocks[0].visualStyle.fontFamily, "monospace");
    const old = clipboardHtml.replace(/&quot;version&quot;:\d+/, "&quot;version&quot;:21");
    assert.equal(clipboard.readBlockClipboardPayload(old), null);
  });
});
