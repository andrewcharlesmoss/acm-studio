import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { paragraphStyleToCss, visualStyleClassName, headingElementOwnStyle } = await load("../app/content/paragraph-styles.ts");
const { styleForViewport, replaceViewportStyle } = await load("../app/content/responsive-styles.ts");
const { containsQuotePresentation } = await load("../app/content/quote-presentation.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { validParagraphStyle, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { toLocallyPublishedArticle } = await load("../app/content/local-publishing.ts");
const { createTemplateSet, emptyTemplateStore, validateTemplateStore, validateTemplateSnapshot } = await load("../app/studio/template-model.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load("../app/studio/test-site/contract.ts");
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load("../app/studio/global-template-contract.ts");
const { projectedStyle } = await load("../app/studio/site-editor/blocks-preview-model.ts");
const { projectWebsiteDesignBlocks } = await load("../app/studio/site-editor/website-design-surface.tsx");
const { rebaseWebsiteDesignEdit } = await load("../app/studio/site-editor/website-design-edit.ts");
const { availableBlockTransformsInDocument } = await load("../app/studio/block-transforms.ts");
const { BlockRenderer } = await load("../app/components/content.tsx");

const gradient = { type: "linear", angle: 90, stops: [{ colour: "#ffffff", position: 0 }, { colour: "#000000", position: 100 }] };
const presentation = { blockGap: "12px", headingColor: "#123456", headingBackgroundGradient: gradient };
const quote = { id: "quote", type: "quote", text: "", visualStyle: presentation, children: [{ id: "heading", type: "heading", level: 2, text: "Quote heading" }, { id: "paragraph", type: "paragraph", text: "Quote body" }], attribution: "Source", attributionRuns: [{ text: "Source", marks: ["italic"] }] };
const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "published", updatedAt: "2026-10-22T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
const set = createTemplateSet("Original");
const nav = { ...structuredClone(set), id: "navigation", templates: [], parts: [{ id: "nav", kind: "header", name: "Navigation", nodes: [{ id: "menu", type: "element", element: "navigation" }] }] };
const legacyFixture = { format: "acm-test-site", version: 9, siteId: "test", documents: [page], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: { ...emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: "navigation", partId: "nav" }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
const plain = value => JSON.parse(JSON.stringify(value));

test("Quote presentation validates values and maps portable and device-specific CSS", () => {
  assert.equal(validParagraphStyle(presentation), true);
  assert.equal(validParagraphStyle({ blockGap: "2ch" }), true);
  assert.equal(paragraphStyleToCss(presentation)["--studio-quote-block-gap"], "12px");
  assert.equal(paragraphStyleToCss(presentation)["--studio-quote-heading-color"], "#123456");
  assert.match(paragraphStyleToCss(presentation)["--studio-quote-heading-background-image"], /^linear-gradient\(90deg/);
  assert.equal(paragraphStyleToCss({ blockGap: "0" })["--studio-quote-block-gap"], "0");
  for (const blockGap of ["-1px", "12", "url(/image)", "calc(1px + 2px)", {}, 2]) assert.equal(validParagraphStyle({ blockGap }), false, String(blockGap));
  for (const style of [{ headingColor: 1 }, { headingColor: "url(/image)" }, { headingBackgroundColor: [] }, { headingBackgroundGradient: { type: "url" } }]) assert.equal(validParagraphStyle(style), false);
  const style = { ...presentation, responsive: { mobile: { blockGap: "0", headingColor: "#abcdef", headingBackgroundColor: "#ff0000" } } };
  const css = paragraphStyleToCss(style);
  assert.equal(css["--studio-rs-mobile-studio-quote-block-gap"], "0");
  assert.equal(css["--studio-rs-mobile-studio-quote-heading-background-image"], "none");
  assert.match(visualStyleClassName(style), /has-quote-mobile-heading-colour/);
  assert.equal(styleForViewport(style, "mobile").headingBackgroundGradient, undefined);
  const inverse = { headingBackgroundColor: "#ff0000", responsive: { mobile: { headingBackgroundGradient: gradient } } };
  assert.equal(styleForViewport(inverse, "mobile").headingBackgroundColor, undefined);
  const reset = replaceViewportStyle(style, "mobile", {});
  assert.deepEqual(plain(styleForViewport(reset, "mobile")), presentation);
});

test("Heading ownership follows canonical Additional CSS precedence at every viewport", () => {
  const style = { additionalCss: "color: #abcdef;", responsive: { mobile: { textColor: "#123456" } } };
  const own = headingElementOwnStyle(style);
  assert.equal(own["--studio-heading-own-color"], "#abcdef");
  assert.equal(own["--studio-rs-mobile-studio-heading-own-color"], undefined);
  const projected = projectWebsiteDesignBlocks([{ id: "own-heading", type: "heading", level: 2, text: "Own", visualStyle: { textColor: "#123456" } }], { blockStyles: { heading: { textColor: "#ff0000", responsive: { mobile: { textColor: "#00ff00" } } } } })[0].visualStyle;
  assert.equal(headingElementOwnStyle(projected)["--studio-heading-own-color"], "#123456");
  assert.equal(headingElementOwnStyle(projected)["--studio-rs-mobile-studio-heading-own-color"], undefined);
  const themeOnly = projectWebsiteDesignBlocks([{ id: "theme-heading", type: "heading", level: 2, text: "Theme" }], { blockStyles: { heading: { textColor: "#ff0000" } } })[0].visualStyle;
  assert.deepEqual(headingElementOwnStyle(themeOnly), {});
});

test("Quote fields are gated in all portable envelopes while previous image-ratio envelopes remain readable", () => {
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [quote] };
  const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
  assert.deepEqual(plain(validateStudioWorkspace(workspace).documents[0].blocks[0]), quote);
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) assert.throws(() => validate({ ...workspace, version: 30 }));
  const post = toLocallyPublishedArticle(doc);
  assert.equal(validatePublicationSnapshot({ version: 23, posts: [post] }).posts[0].blocks[0].visualStyle.blockGap, "12px");
  assert.throws(() => validatePublicationSnapshot({ version: 22, posts: [post] }));
  const template = structuredClone(set); template.parts[0].nodes = [quote];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.equal(validateTemplateStore(store).sets[0].parts[0].nodes[0].visualStyle.blockGap, "12px");
  assert.throws(() => validateTemplateStore({ ...store, version: "0.34.0" }));
  const snapshot = { version: "0.35.0", set: template, templateId: template.templates[0].id };
  assert.doesNotThrow(() => validateTemplateSnapshot(snapshot));
  assert.throws(() => validateTemplateSnapshot({ ...snapshot, version: "0.34.0" }));
  assert.doesNotThrow(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.35.0", set: template, media: [] }));
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.34.0", set: template, media: [] }));
  const fixture = testSiteCollection(structuredClone(legacyFixture));
  fixture.documents[0].blocks = [quote];
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 13 }), false);
  assert.equal(testSiteCollection(fixture).documents[0].blocks[0].visualStyle.blockGap, "12px");
  assert.equal(testSiteWorkspace(fixture).version, 35);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: "test2" } });
  const changed = structuredClone(library); changed.migrations.test.bases[0].parts[0].nodes = [quote];
  assert.equal(validateGlobalTemplateLibrary(changed).version, 10);
  assert.throws(() => validateGlobalTemplateLibrary({ ...changed, version: 5 }), /Quote presentation/);
  assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...library, version: 5, websiteDesignDefaults: { identity: {}, styles: { blockStyles: { quote: { blockGap: "40px", headingColor: "#ff0000" } } } } }));
  const image = { id: "image", type: "image", src: "/image.png", alt: "Example", aspectRatio: "classic" };
  const imageDoc = { ...doc, blocks: [image] };
  assert.doesNotThrow(() => validateStudioWorkspace({ ...workspace, version: 30, documents: [imageDoc] }));
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 22, posts: [toLocallyPublishedArticle(imageDoc)] }));
  const imageSet = structuredClone(set); imageSet.parts[0].nodes = [image];
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.34.0", sets: [imageSet] }));
  const imageFixture = testSiteCollection(structuredClone(legacyFixture)); imageFixture.documents[0].blocks = [image];
  assert.equal(validTestSiteDocument({ ...imageFixture, version: 13 }), true);
  assert.equal(testSiteCollection({ ...imageFixture, version: 13 }).version, 18);
  const imageLibrary = structuredClone(library); imageLibrary.migrations.test.bases[0].parts[0].nodes = [image];
  assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...imageLibrary, version: 5 }));
});

test("Pullquote uses workspace v35 and published-post v27 without rewriting legacy data", () => {
  const pullquote = { id: "pullquote", type: "pullquote", text: "A prominent quotation", align: "centre", quoteStyle: "plain" };
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [pullquote] };
  const workspace = { ...initialStudioWorkspace, version: 35, documents: [doc], activeDocumentId: doc.id, bin: [] };
  assert.deepEqual(plain(validateStudioWorkspace(workspace).documents[0].blocks[0]), pullquote);
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) {
    assert.throws(() => validate({ ...workspace, version: 34 }), /unsupported version/);
  }
  const legacy = { ...workspace, version: 34, documents: [{ ...doc, blocks: [quote] }] };
  assert.equal(migrateStudioWorkspace(legacy).version, 35);
  const publication = toLocallyPublishedArticle(doc);
  assert.deepEqual(plain(validatePublicationSnapshot({ version: 27, posts: [publication] }).posts[0].blocks[0]), pullquote);
  assert.throws(() => validatePublicationSnapshot({ version: 26, posts: [publication] }), /v27/);
});

test("content style recovery and responsive fields are detected without gating website defaults", () => {
  assert.equal(containsQuotePresentation({ type: "unrelated-domain", id: "retained", style: presentation }), false);
  assert.equal(containsQuotePresentation({ websiteDesignDefaults: { styles: { blockStyles: { quote: presentation } } } }), false);
  assert.equal(containsQuotePresentation({ type: "quote", id: "responsive", visualStyle: { responsive: { mobile: { headingColor: "#123456" } } } }), true);
  assert.equal(containsQuotePresentation({ path: ["templates", "@page", "nodes", "@quote", "visualStyle", "headingColor"], value: "#123456" }), true);
  assert.equal(containsQuotePresentation({ path: ["parts", "@header", "nodes", "@quote", "visualStyle"], value: { responsive: { mobile: { blockGap: "0" } } } }), true);
  assert.equal(containsQuotePresentation({ path: ["websiteDesign", "styles", "blockStyles", "quote", "headingColor"], value: "#123456" }), false);
});

test("ignored legacy style fields do not become content presentation owners", () => {
  const heading = { id: "legacy-heading", type: "heading", level: 2, text: "Legacy heading", style: { headingColor: "#123456" } };
  assert.equal(containsQuotePresentation(heading), false);
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [heading] };
  assert.doesNotThrow(() => validateStudioWorkspace({ ...initialStudioWorkspace, version: 30, documents: [doc], activeDocumentId: doc.id }));
  const source = testSiteCollection(structuredClone(legacyFixture));
  const library = createGlobalTemplateLibrary({ test: source, test2: { ...source, siteId: "test2" } });
  const retained = structuredClone(library); retained.migrations.test.bases[0].parts[0].nodes = [heading];
  assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...retained, version: 5 }));
  assert.equal(containsQuotePresentation({ id: "subtitle", type: "element", element: "subtitle", style: { headingColor: "#123456" } }), true);
});

test("clipboard preserves Quote presentation and rejects older envelope tags", () => {
  const html = blockClipboardHtml([quote]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const original = globalThis.DOMParser;
  try {
    let payload = encoded;
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.deepEqual(plain(readBlockClipboardPayload(html).blocks[0]), quote);
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 7 });
    assert.equal(readBlockClipboardPayload(html), null);
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 7, blocks: [{ id: "image", type: "image", src: "/image.png", alt: "Example", aspectRatio: "classic" }] });
    assert.equal(readBlockClipboardPayload(html).blocks[0].aspectRatio, "classic");
  } finally { globalThis.DOMParser = original; }
});

test("website defaults stay out of content presentation and unrelated edits do not materialise them", () => {
  const defaults = { blockGap: "40px", headingColor: "#ff0000", responsive: { mobile: { blockGap: "20px", headingColor: "#0000ff" } } };
  const projected = projectedStyle(defaults, {});
  assert.equal(projected.blockGap, undefined);
  assert.equal(projected.headingColor, undefined);
  assert.equal(paragraphStyleToCss(projected)["--studio-quote-heading-color"], undefined);
  assert.equal(projectedStyle(defaults, presentation).headingColor, "#123456");
  const original = { ...quote, visualStyle: undefined };
  const renderProjection = projectWebsiteDesignBlocks([original], { blockStyles: { quote: defaults } })[0];
  const edited = { ...renderProjection, attribution: "New source" };
  assert.deepEqual(plain(rebaseWebsiteDesignEdit(original, renderProjection, edited)), { ...plain(original), attribution: "New source" });
});

test("both render variants preserve rich citation and expose authored owner classes without mutating content", () => {
  const before = structuredClone(quote);
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [quote], variant }));
    assert.match(html, /has-quote-block-gap/);
    assert.match(html, /--studio-quote-block-gap:12px/);
    assert.match(html, /<em>Source<\/em>/);
    assert.match(html, /quote-body-block/);
  }
  const legacy = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{ ...quote, visualStyle: undefined }], variant: "article" }));
  assert.doesNotMatch(legacy, /has-quote-/);
  assert.deepEqual(quote, before);
});


test("Quote Group conversion withholds own element presentation but retains intact styled descendants", () => {
  const base = { id: "group-quote", type: "quote", text: "", children: [{ id: "body", type: "paragraph", text: "Body" }] };
  const ids = block => availableBlockTransformsInDocument(block, [block]).map(item => item.id);
  assert.ok(ids(base).includes("quote-to-group"));
  for (const visualStyle of [{ blockGap: "0" }, { headingColor: "#123456" }, { headingBackgroundColor: "#123456" }, { headingBackgroundGradient: gradient }, { responsive: { mobile: { blockGap: "12px" } } }]) {
    const current = { ...base, visualStyle };
    assert.ok(!ids(current).includes("quote-to-group"));
    assert.ok(ids(current).includes("wrap-columns"));
  }
  const descendant = { ...base, children: [{ ...quote, id: "nested-quote" }] };
  assert.ok(ids(descendant).includes("quote-to-group"));
});

 test("Pullquote retains its distinct identity across portable templates, fixtures, library and rendering", () => {
  const block = { id: "pullquote-portable", type: "pullquote", text: "A prominent quotation", attribution: "Source", align: "centre", quoteStyle: "plain" };
  const template = structuredClone(set); template.parts[0].nodes = [block];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.equal(validateTemplateStore(store).sets[0].parts[0].nodes[0].type, "pullquote");
  assert.throws(() => validateTemplateStore({ ...store, version: "0.38.0" }));
  assert.equal(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.39.0", set: template, media: [] }).set.parts[0].nodes[0].type, "pullquote");
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.38.0", set: template, media: [] }));
  const fixture = testSiteCollection(structuredClone(legacyFixture)); fixture.documents[0].blocks = [block];
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 17 }), false);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: "test2" } });
  library.migrations.test.bases[0].parts[0].nodes = [block];
  assert.equal(validateGlobalTemplateLibrary(library).version, 10);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 9 }));
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(html, /is-pullquote/); assert.match(html, /A prominent quotation/); assert.match(html, /Source/);
  }
});

test("Pullquote inserts with its own block identity, toolbar, inspector and Library entry", async () => {
  const { createBlock, contentEditorBlockCatalogue } = await load("../app/studio/editor-model.ts");
  const { blockToolbarDefinitionFor } = await load("../app/studio/blocks/toolbar-registry.ts");
  const { capabilityProfileFor } = await load("../app/studio/blocks/capability-profiles.ts");
  const { blockLibraryEntryByType } = await load("../app/studio/blocks/library-catalogue.ts");
  const { blocksToHtml } = await load("../app/studio/studio-html-editor.ts");
  const { groupAllowsChild } = await load("../app/studio/block-inserter-options.ts");
  const pullquote = createBlock("pullquote", "pullquote-insert");
  assert.equal(pullquote.type, "pullquote");
  assert.equal(createBlock("quote", "quote-insert").type, "quote");
  assert.ok(contentEditorBlockCatalogue.some(entry => entry.type === "pullquote"));
  assert.equal(blockToolbarDefinitionFor("pullquote").label, "Pullquote");
  assert.equal(capabilityProfileFor("pullquote").label, "Pullquote");
  assert.equal(blockLibraryEntryByType.pullquote.href, "/studio/ui/blocks/pullquote");
  assert.equal(blockLibraryEntryByType.pullquote.profile.type, "pullquote");
  assert.match(blocksToHtml([pullquote]), /data-block-type="pullquote"/);
  assert.equal(groupAllowsChild({ id: "owner", type: "group", layout: "flow", children: [], allowedBlocks: ["pullquote"] }, "pullquote"), true);
  assert.equal(groupAllowsChild({ id: "owner", type: "group", layout: "flow", children: [], allowedBlocks: ["quote"] }, "pullquote"), false);
});

test("Pullquote HTML and clipboard round trips retain identity and old clipboard tags reject it", async () => {
  const { withHtmlDom } = await import("./html-dom-fixture.mjs");
  const { blockToHtml, parseHtmlToBlock } = await load("../app/studio/studio-html-editor.ts");
  const block = { id: "pullquote-html", type: "pullquote", text: "A quotation", attribution: "Source", align: "centre", quoteStyle: "plain" };
  withHtmlDom(() => {
    const result = parseHtmlToBlock(blockToHtml(block), block);
    assert.equal(result.block.type, "pullquote");
    assert.equal(result.block.attribution, "Source");
  });
  const html = blockClipboardHtml([block]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const previous = globalThis.DOMParser;
  let payload = encoded;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.equal(JSON.parse(encoded).version, 12);
    assert.equal(readBlockClipboardPayload(html).blocks[0].type, "pullquote");
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 11 });
    assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = previous; }
});

test("generated fixture HTML includes the canonical Pullquote surface and its styles", async () => {
  const { renderTestSite } = await load("../app/studio/test-site/render.tsx");
  const fixture = testSiteCollection(structuredClone(legacyFixture));
  fixture.documents[0].blocks = [{ id: "static-pullquote", type: "pullquote", text: "Published Pullquote", attribution: "Source", align: "centre", quoteStyle: "plain" }];
  fixture.publications = [{ document: fixture.documents[0] }];
  const html = renderTestSite(fixture, "pullquote-static");
  assert.match(html, /is-pullquote > blockquote/);
  assert.match(html, /Published Pullquote/);
  assert.match(html, /class="[^"]*is-pullquote/);
});

test("Pullquote allowlists require the new envelopes even before a child is inserted", () => {
  const group = { id: "pullquote-owner", type: "group", layout: "flow", allowedBlocks: ["pullquote"], children: [] };
  const doc = { ...page, blocks: [group] };
  const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
  assert.doesNotThrow(() => validateStudioWorkspace(workspace));
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 34 }));
  const post = toLocallyPublishedArticle(doc);
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 27, posts: [post] }));
  assert.throws(() => validatePublicationSnapshot({ version: 26, posts: [post] }));
  const template = structuredClone(set); template.parts[0].nodes = [group];
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), sets: [template] }));
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.38.0", sets: [template] }));
  const fixture = testSiteCollection(structuredClone(legacyFixture)); fixture.documents[0].blocks = [group];
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 17 }), false);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: "test2" } });
  library.migrations.test.bases[0].parts[0].nodes = [group];
  assert.doesNotThrow(() => validateGlobalTemplateLibrary(library));
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 9 }));
});
