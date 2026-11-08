import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { paragraphStyleToCss, visualStyleClassName, headingElementOwnStyle } = await load("../app/content/paragraph-styles.ts");
const { styleForViewport, replaceViewportStyle, responsiveBlockCss } = await load("../app/content/responsive-styles.ts");
const { containsExtendedGroupShadow, containsExtraBlackAppearance, containsQuotePresentation, containsGroupHeadingStyles } = await load("../app/content/quote-presentation.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { validContentBlocks, validParagraphStyle, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { toLocallyPublishedArticle } = await load("../app/content/local-publishing.ts");
const { createTemplateSet, emptyTemplateStore, TEMPLATE_VERSION, validateTemplateStore, validateTemplateSnapshot } = await load("../app/studio/template-model.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { BLOCK_CLIPBOARD_VERSION, blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load("../app/studio/test-site/contract.ts");
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load("../app/studio/global-template-contract.ts");
const { validateStudioBackup } = await load("../app/studio/backup-store.ts");
const { projectedStyle } = await load("../app/studio/site-editor/blocks-preview-model.ts");
const { projectWebsiteDesignBlocks } = await load("../app/studio/site-editor/website-design-surface.tsx");
const { rebaseWebsiteDesignEdit } = await load("../app/studio/site-editor/website-design-edit.ts");
const { availableBlockTransformsInDocument, transformQuoteBlocks } = await load("../app/studio/block-transforms.ts");
const { BlockRenderer } = await load("../app/components/content.tsx");

const gradient = { type: "linear", angle: 90, stops: [{ colour: "#ffffff", position: 0 }, { colour: "#000000", position: 100 }] };
const presentation = { blockGap: "12px", headingColor: "#123456", headingBackgroundGradient: gradient };
const quote = { id: "quote", type: "quote", text: "", visualStyle: presentation, children: [{ id: "heading", type: "heading", level: 2, text: "Quote heading" }, { id: "paragraph", type: "paragraph", text: "Quote body" }], attribution: "Source", attributionRuns: [{ text: "Source", marks: ["italic"] }] };
const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "published", updatedAt: "2026-10-22T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
const set = createTemplateSet("Original");
const nav = { ...structuredClone(set), id: "navigation", templates: [], parts: [{ id: "nav", kind: "header", name: "Navigation", nodes: [{ id: "menu", type: "element", element: "navigation" }] }] };
const legacyFixture = { format: "acm-test-site", version: 9, siteId: "test", documents: [page], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: { ...emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: "navigation", partId: "nav" }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
const plain = value => JSON.parse(JSON.stringify(value));
const withoutV73TemplateFeatures = value => {
  if (Array.isArray(value)) return value.map(withoutV73TemplateFeatures).filter(item => item !== undefined);
  if (!value || typeof value !== "object") return value;
  if (value.kind === "general" || value.type === "part" || value.type === "query-loop" || value.type === "element" && ["site-tagline", "site-credit", "site-logo", "site-title"].includes(value.element) || value.type === "group" && value.data?.templateElement === "site-logo") return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withoutV73TemplateFeatures(item)]).filter(([, item]) => item !== undefined));
};
const legacyGlobalLibrary = value => {
  const library = withoutV73TemplateFeatures(value);
  library.version = 5;
  delete library.websiteDesignDefaults;
  for (const collection of [library.templates, ...Object.values(library.migrations).map(item => ({ sets: item.bases }))]) {
    if (!Array.isArray(collection.sets)) continue;
    collection.sets = collection.sets.filter(item => item.id !== "studio-twenty-twenty-five-parts");
  }
  return library;
};

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
  assert.equal(testSiteWorkspace(fixture).version, initialStudioWorkspace.version);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: "test2" } });
  const changed = structuredClone(library); changed.migrations.test.bases[0].parts[0].nodes = [quote];
  assert.equal(validateGlobalTemplateLibrary(changed).version, library.version);
  const historicalQuote = legacyGlobalLibrary(library);
  historicalQuote.migrations.test.bases[0].parts[0].nodes = [quote];
  assert.throws(() => validateGlobalTemplateLibrary(historicalQuote), /Quote presentation requires global template library v6/);
  const historicalDefaults = legacyGlobalLibrary(library);
  historicalDefaults.websiteDesignDefaults = { identity: {}, styles: { blockStyles: { quote: { blockGap: "40px", headingColor: "#ff0000" } } } };
  assert.doesNotThrow(() => validateGlobalTemplateLibrary(historicalDefaults));
  const image = { id: "image", type: "image", src: "/image.png", alt: "Example", aspectRatio: "classic" };
  const imageDoc = { ...doc, blocks: [image] };
  assert.doesNotThrow(() => validateStudioWorkspace({ ...workspace, version: 30, documents: [imageDoc] }));
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 22, posts: [toLocallyPublishedArticle(imageDoc)] }));
  const imageSet = structuredClone(set); imageSet.parts[0].nodes = [image];
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.34.0", sets: [imageSet] }));
  const imageFixture = testSiteCollection(structuredClone(legacyFixture)); imageFixture.documents[0].blocks = [image];
  assert.equal(validTestSiteDocument({ ...imageFixture, version: 13 }), true);
  assert.equal(testSiteCollection({ ...imageFixture, version: 13 }).version, imageFixture.version);
  const imageLibrary = legacyGlobalLibrary(library); imageLibrary.migrations.test.bases[0].parts[0].nodes = [image];
  assert.doesNotThrow(() => validateGlobalTemplateLibrary(imageLibrary));
});

test("Group heading maps are versioned, responsive, and accepted in current nested envelopes", () => {
  const group = { id: "group-heading", type: "group", layout: "flow", children: [{ id: "h2", type: "heading", level: 2, text: "Heading" }], visualStyle: { headingColors: { 2: "#123456" }, responsive: { mobile: { headingBackgrounds: { 2: { backgroundGradient: gradient } } } } } };
  assert.equal(containsGroupHeadingStyles(group), true);
  assert.match(visualStyleClassName(group.visualStyle), /has-group-heading-colour/);
  assert.match(visualStyleClassName(group.visualStyle), /has-group-heading-background/);
  const h1Only = visualStyleClassName({ headingColors: { 1: "#123456" } });
  assert.match(h1Only, /has-group-heading-colour-h1/);
  assert.doesNotMatch(h1Only, /has-group-heading-colour-h2/);
  const mobileH2Only = visualStyleClassName({ responsive: { mobile: { headingColors: { 2: "#abcdef" } } } });
  assert.match(mobileH2Only, /has-group-heading-colour-mobile-h2/);
  assert.doesNotMatch(mobileH2Only, /has-group-heading-colour-h2(?:\s|$)/);
  assert.match(responsiveBlockCss, /is-style-section-1\{background-color:var\(--site-palette-theme-6,#FBFAF3\);color:var\(--site-palette-theme-1,#111111\)/);
  assert.match(responsiveBlockCss, /is-style-section-5\{[^}]*--button-base-color:var\(--site-palette-theme-1,#111111\)/);
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "page"), blocks: [group] };
  const workspace = { ...initialStudioWorkspace, version: 63, documents: [document], activeDocumentId: document.id, bin: [] };
  assert.doesNotThrow(() => validateStudioWorkspace(workspace));
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 62 }));
  const revisionWorkspace = { ...workspace, documentRevisions: [{ id: "revision", savedAt: "2026-11-07T00:00:00.000Z", document }] };
  assert.doesNotThrow(() => validateStudioWorkspace(revisionWorkspace));
  assert.throws(() => validateStudioWorkspace({ ...revisionWorkspace, version: 62 }));
  const publication = toLocallyPublishedArticle(document);
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 54, posts: [publication] }));
  assert.throws(() => validatePublicationSnapshot({ version: 53, posts: [publication] }));
  const binnedDocument = { ...document, id: "binned-page-document", slug: "binned-page" };
  const binned = { ...workspace, bin: [{ id: "bin-page", deletedAt: "2026-11-07T00:00:00.000Z", document: binnedDocument }] };
  assert.doesNotThrow(() => validateStudioWorkspace(binned));
  assert.throws(() => validateStudioWorkspace({ ...binned, version: 62 }));
  assert.equal(validContentBlocks([group]), true);
  assert.equal(validContentBlocks([{ ...group, visualStyle: { buttonTextColor: "#123456" } }]), true);
  assert.equal(validContentBlocks([{ ...group, type: "quote", visualStyle: { buttonTextColor: "#123456" } }]), false);

  const template = structuredClone(set);
  const pageListNode = {
    id: "navigation-parent", type: "element", element: "navigation",
    pageListBlock: { id: "page-list-child", type: "navigation-page-list", position: 1, parentPageId: "parent-page", visualStyle: { textColor: "#123456" } },
  };
  template.parts[0].nodes = [group, pageListNode];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.deepEqual(validateTemplateStore(store).sets[0].parts[0].nodes, [group, pageListNode]);
  assert.equal(validateTemplateStore(store).version, TEMPLATE_VERSION);
  assert.deepEqual(validateTemplateStore({ ...store, version: "0.74.0" }).sets[0].parts[0].nodes, [group, pageListNode]);
  assert.equal(validateTemplateStore({ ...store, version: "0.74.0" }).version, TEMPLATE_VERSION);
  assert.deepEqual(validateTemplateSnapshot({ version: "0.74.0", set: template, templateId: template.templates[0].id }).set.parts[0].nodes, [group, pageListNode]);
  assert.equal(validateTemplateSnapshot({ version: "0.74.0", set: template, templateId: template.templates[0].id }).version, TEMPLATE_VERSION);
  assert.throws(() => validateTemplateStore({ ...store, version: "0.73.0" }), /Per-level Group heading styles/);
  assert.doesNotThrow(() => validateTemplatePackage({ format: "acm-studio-template-set", version: TEMPLATE_VERSION, set: template, media: [] }));
  assert.deepEqual(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.74.0", set: template, media: [] }).set.parts[0].nodes, [group, pageListNode]);
  assert.equal(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.74.0", set: template, media: [] }).version, TEMPLATE_VERSION);
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.73.0", set: template, media: [] }), /Page List blocks require template v0.74.0/);
  const groupOnlyTemplate = structuredClone(template);
  groupOnlyTemplate.parts[0].nodes = [group];
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.73.0", set: groupOnlyTemplate, media: [] }), /Per-level Group heading styles/);
  const buttonGroupSet = structuredClone(set); buttonGroupSet.parts[0].nodes = [{ ...group, visualStyle: { buttonTextColor: "#123456", buttonBackgroundColor: "#eeeeee" } }];
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), sets: [buttonGroupSet] }));

  const fixture = testSiteCollection(structuredClone(legacyFixture));
  fixture.documents[0].blocks = [group];
  fixture.templates.version = "0.74.0";
  fixture.templates.sets[0].parts[0].nodes = [group, pageListNode];
  fixture.version = 53;
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 52 }), false);
  const upgradedFixture = testSiteCollection(fixture);
  assert.equal(upgradedFixture.version, 54);
  assert.equal(upgradedFixture.templates.version, TEMPLATE_VERSION);
  assert.deepEqual(upgradedFixture.templates.sets[0].parts[0].nodes, [group, pageListNode]);
  const library = createGlobalTemplateLibrary({ test: fixture, test2: { ...fixture, siteId: "test2" } });
  const changed = structuredClone(library);
  changed.templates.version = "0.74.0";
  changed.migrations.test.bases[0].parts[0].nodes = [group, pageListNode];
  assert.equal(validateGlobalTemplateLibrary(changed).version, library.version);
  const upgradedGlobal = validateGlobalTemplateLibrary({ ...changed, version: 45 });
  assert.equal(upgradedGlobal.version, 46);
  assert.equal(upgradedGlobal.templates.version, TEMPLATE_VERSION);
  assert.deepEqual(upgradedGlobal.migrations.test.bases[0].parts[0].nodes, [group, pageListNode]);
  assert.throws(() => validateGlobalTemplateLibrary({ ...changed, version: 44 }), /Page List blocks require global template library v45/);
  const groupOnlyFixture = testSiteCollection(structuredClone(legacyFixture));
  groupOnlyFixture.version = 53;
  groupOnlyFixture.templates.version = "0.74.0";
  groupOnlyFixture.templates.sets[0].parts[0].nodes = [group];
  const groupOnlyLibrary = createGlobalTemplateLibrary({ test: groupOnlyFixture, test2: { ...groupOnlyFixture, siteId: "test2" } });
  groupOnlyLibrary.migrations.test.bases[0].parts[0].nodes = [group];
  assert.throws(() => validateGlobalTemplateLibrary({ ...groupOnlyLibrary, version: 44 }), /Per-level Group heading styles/);
  const backup = { format: "acm-studio-backup", version: 42, exportedAt: "2026-11-07T00:00:00Z", workspace, templates: { ...store, version: "0.74.0" }, publications: null, media: { folders: [], assets: [] } };
  const upgradedBackup = validateStudioBackup(backup);
  assert.deepEqual(upgradedBackup.templates.sets[0].parts[0].nodes, [group, pageListNode]);
  assert.equal(upgradedBackup.templates.version, TEMPLATE_VERSION);
  assert.throws(() => validateStudioBackup({ ...backup, version: 41 }), /Page List blocks require backup v42/);
  assert.throws(() => validateStudioBackup({ ...backup, version: 41, templates: { ...store, version: "0.74.0", sets: [{ ...template, parts: [{ ...template.parts[0], nodes: [group] }] }] } }), /Per-level Group heading styles require backup v42/);

  const html = blockClipboardHtml([group]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const original = globalThis.DOMParser;
  try {
    let payload = encoded;
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.equal(readBlockClipboardPayload(html).blocks[0].id, group.id);
    payload = JSON.stringify({ ...JSON.parse(encoded), version: BLOCK_CLIPBOARD_VERSION - 1 });
    assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = original; }
});

test("current Test site source normalisation is idempotent and preserves imported documents", () => {
  const current = testSiteCollection(structuredClone(legacyFixture));
  current.documents = Array.from({ length: 15 }, (_, index) => ({
    ...structuredClone(page),
    id: `document-${index}`,
    title: `Document ${index}`,
    kind: index < 10 ? "post" : "page",
  }));
  current.homeDocumentId = "document-10";
  current.activeDocumentId = "document-10";
  current.publications = current.documents.map(document => ({ document: structuredClone(document) }));
  current.browserImportComplete = true;
  current.version = 51;

  const migrated = testSiteCollection(current);
  assert.equal(migrated.version, 54);
  assert.equal(migrated.documents.length, 15);
  assert.equal(migrated.browserImportComplete, true);
  assert.equal(migrated.homeDocumentId, "document-10");
  assert.equal(migrated.defaultNavigationMenuId, current.defaultNavigationMenuId);
  assert.deepEqual(migrated.navigationMenus, current.navigationMenus);

  assert.equal(testSiteCollection(migrated), migrated);
  assert.equal(testSiteCollection(migrated).documents.length, 15);
  assert.equal(testSiteCollection(migrated).browserImportComplete, true);
});

test("content style recovery and responsive fields are detected without gating website defaults", () => {
  assert.equal(containsQuotePresentation({ type: "unrelated-domain", id: "retained", style: presentation }), false);
  assert.equal(containsQuotePresentation({ websiteDesignDefaults: { styles: { blockStyles: { quote: presentation } } } }), false);
  assert.equal(containsQuotePresentation({ type: "quote", id: "responsive", visualStyle: { responsive: { mobile: { headingColor: "#123456" } } } }), true);
  assert.equal(containsQuotePresentation({ path: ["templates", "@page", "nodes", "@quote", "visualStyle", "headingColor"], value: "#123456" }), true);
  assert.equal(containsQuotePresentation({ path: ["parts", "@header", "nodes", "@quote", "visualStyle"], value: { responsive: { mobile: { blockGap: "0" } } } }), true);
  assert.equal(containsQuotePresentation({ path: ["websiteDesign", "styles", "blockStyles", "quote", "headingColor"], value: "#123456" }), false);
  assert.equal(containsExtraBlackAppearance({ path: ["templates", "@page", "nodes", "@paragraph", "style", "appearance"], value: "extra-black" }), true);
});

test("ignored legacy style fields do not become content presentation owners", () => {
  const heading = { id: "legacy-heading", type: "heading", level: 2, text: "Legacy heading", style: { headingColor: "#123456" } };
  assert.equal(containsQuotePresentation(heading), false);
  const ignoredAppearance = { ...heading, style: { appearance: "extra-black" } };
  assert.equal(containsExtraBlackAppearance(ignoredAppearance), false);
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [heading] };
  assert.doesNotThrow(() => validateStudioWorkspace({ ...initialStudioWorkspace, version: 30, documents: [doc], activeDocumentId: doc.id }));
  assert.doesNotThrow(() => validateStudioWorkspace({ ...initialStudioWorkspace, version: 62, documents: [{ ...doc, blocks: [ignoredAppearance] }], activeDocumentId: doc.id }));
  assert.equal(containsExtraBlackAppearance({ websiteDesignDefaults: { styles: { blockStyles: { group: { websiteWeight: 1000 } } } } }), false);
  assert.equal(containsExtraBlackAppearance({ styles: { blockStyles: { group: { appearance: "extra-black" } } } }), true);
  const source = testSiteCollection(structuredClone(legacyFixture));
  const library = createGlobalTemplateLibrary({ test: source, test2: { ...source, siteId: "test2" } });
  const retained = legacyGlobalLibrary(library); retained.migrations.test.bases[0].parts[0].nodes = [heading];
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
  const defaults = { blockGap: "40px", headingColor: "#ff0000", headingColors: { 2: "#123456" }, headingBackgrounds: { 2: { background: "#eeeeee" } }, responsive: { mobile: { blockGap: "20px", headingColor: "#0000ff", headingColors: { 3: "#00ff00" }, headingBackgrounds: { 3: { gradient } } } } };
  const projected = projectedStyle(defaults, {});
  assert.equal(projected.blockGap, undefined);
  assert.equal(projected.headingColor, undefined);
  assert.equal(projected.headingColors, undefined);
  assert.equal(projected.headingBackgrounds, undefined);
  assert.equal(projected.responsive?.mobile?.headingColors, undefined);
  assert.equal(projected.responsive?.mobile?.headingBackgrounds, undefined);
  assert.equal(paragraphStyleToCss(projected)["--studio-quote-heading-color"], undefined);
  assert.equal(projectedStyle(defaults, presentation).headingColor, "#123456");
  const original = { ...quote, visualStyle: undefined };
  const renderProjection = projectWebsiteDesignBlocks([original], { blockStyles: { quote: defaults } })[0];
  const edited = { ...renderProjection, attribution: "New source" };
  assert.deepEqual(plain(rebaseWebsiteDesignEdit(original, renderProjection, edited)), { ...plain(original), attribution: "New source" });
});

test("expanded Group shadow presets are gated by every content envelope version", () => {
  const group = { id: "shadow-group", type: "group", layout: "flow", children: [], visualStyle: { shadow: "deep" } };
  assert.equal(containsExtendedGroupShadow(group), true);
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [group] };
  const currentWorkspace = { ...initialStudioWorkspace, version: 63, documents: [document], activeDocumentId: document.id, bin: [] };
  assert.doesNotThrow(() => validateStudioWorkspace(currentWorkspace));
  assert.throws(() => validateStudioWorkspace({ ...currentWorkspace, version: 62 }));
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 54, posts: [toLocallyPublishedArticle(document)] }));
  assert.throws(() => validatePublicationSnapshot({ version: 53, posts: [toLocallyPublishedArticle(document)] }));
  const template = structuredClone(set); template.parts[0].nodes = [group];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.doesNotThrow(() => validateTemplateStore(store));
  assert.throws(() => validateTemplateStore({ ...store, version: "0.73.0" }));
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.73.0", set: template, media: [] }));
  const fixture = testSiteCollection(structuredClone(legacyFixture));
  fixture.documents[0].blocks = [group];
  fixture.version = 53;
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 52 }), false);
  const library = createGlobalTemplateLibrary({ test: fixture, test2: { ...fixture, siteId: "test2" } });
  const changedLibrary = structuredClone(library);
  changedLibrary.migrations.test.bases[0].parts[0].nodes = [group];
  assert.throws(() => validateGlobalTemplateLibrary({ ...changedLibrary, version: 44 }), /Expanded Group shadow presets/);
  const backup = { format: "acm-studio-backup", version: 42, exportedAt: "2026-11-07T00:00:00Z", workspace: currentWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.doesNotThrow(() => validateStudioBackup(backup));
  assert.throws(() => validateStudioBackup({ ...backup, version: 41 }), /Expanded Group shadow presets/);
  const html = blockClipboardHtml([group]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const original = globalThis.DOMParser;
  try {
    let payload = encoded;
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 39 });
    assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = original; }
});

test("Extra Black appearance renders and is gated by every content envelope version", () => {
  const paragraph = { id: "extra-black", type: "paragraph", text: "Heavy", style: { appearance: "extra-black-italic" } };
  const buttonInteraction = { id: "extra-black-button", type: "button", label: "Search", url: "#search", style: "primary", interactionStyles: { hover: { appearance: "extra-black" } } };
  const navigationSearch = { id: "extra-black-search", type: "group", layout: "row", children: [], data: { templateElement: "navigation", searchEnabled: true }, searchVisualStyle: { appearance: "extra-black" } };
  assert.equal(containsExtraBlackAppearance(buttonInteraction), true);
  assert.equal(containsExtraBlackAppearance(navigationSearch), true);
  assert.equal(containsExtraBlackAppearance({ path: ["templates", "@header", "nodes", "@button", "interactionStyles", "hover", "appearance"], value: "extra-black" }), true);
  assert.equal(containsExtraBlackAppearance({ path: ["templates", "@header", "nodes", "@navigation", "searchVisualStyle", "appearance"], value: "extra-black" }), true);
  assert.equal(containsExtraBlackAppearance(paragraph), true);
  assert.equal(validParagraphStyle(paragraph.style), true);
  assert.equal(paragraphStyleToCss(paragraph.style).fontWeight, "1000");
  assert.equal(paragraphStyleToCss(paragraph.style).fontStyle, "italic");
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [paragraph] };
  const currentWorkspace = { ...initialStudioWorkspace, version: 63, documents: [document], activeDocumentId: document.id, bin: [] };
  assert.doesNotThrow(() => validateStudioWorkspace(currentWorkspace));
  assert.throws(() => validateStudioWorkspace({ ...currentWorkspace, version: 62 }));
  for (const ownerBlock of [buttonInteraction, navigationSearch]) {
    const ownerDocument = { ...document, blocks: [ownerBlock] };
    const ownerWorkspace = { ...currentWorkspace, documents: [ownerDocument] };
    assert.doesNotThrow(() => validateStudioWorkspace(ownerWorkspace));
    assert.throws(() => validateStudioWorkspace({ ...ownerWorkspace, version: 62 }));
    assert.doesNotThrow(() => validatePublicationSnapshot({ version: 54, posts: [toLocallyPublishedArticle(ownerDocument)] }));
    assert.throws(() => validatePublicationSnapshot({ version: 53, posts: [toLocallyPublishedArticle(ownerDocument)] }));
  }
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 54, posts: [toLocallyPublishedArticle(document)] }));
  assert.throws(() => validatePublicationSnapshot({ version: 53, posts: [toLocallyPublishedArticle(document)] }));

  const template = structuredClone(set); template.parts[0].nodes = [paragraph];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.doesNotThrow(() => validateTemplateStore(store));
  assert.throws(() => validateTemplateStore({ ...store, version: "0.73.0" }));
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.73.0", set: template, media: [] }));
  const navigationTemplate = structuredClone(nav);
  const navigationNode = navigationTemplate.parts.flatMap(part => part.nodes).find(node => node.type === "element" && node.element === "navigation");
  assert.ok(navigationNode, "template fixture contains Navigation");
  navigationNode.searchEnabled = true;
  navigationNode.searchVisualStyle = { appearance: "extra-black" };
  const navigationStore = { ...emptyTemplateStore(), sets: [navigationTemplate] };
  assert.doesNotThrow(() => validateTemplateStore(navigationStore));
  assert.throws(() => validateTemplateStore({ ...navigationStore, version: "0.73.0" }), /Extra Black font appearance/);

  const fixture = testSiteCollection(structuredClone(legacyFixture));
  fixture.documents[0].blocks = [paragraph]; fixture.version = 53;
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(validTestSiteDocument({ ...fixture, version: 52 }), false);
  const library = createGlobalTemplateLibrary({ test: fixture, test2: { ...fixture, siteId: "test2" } });
  const changedLibrary = structuredClone(library);
  changedLibrary.migrations.test.bases[0].parts[0].nodes = [paragraph];
  assert.throws(() => validateGlobalTemplateLibrary({ ...changedLibrary, version: 44 }), /Extra Black font appearance/);
  const websiteLibrary = { ...library, websiteDesignDefaults: { identity: {}, styles: { blockStyles: { group: { appearance: "extra-black" } } } } };
  assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...websiteLibrary, version: 45 }));
  assert.throws(() => validateGlobalTemplateLibrary({ ...websiteLibrary, version: 44 }), /Extra Black font appearance/);
  for (const scope of ["responsive", "previewResponsive", "variations", "interactionStates"]) {
    const scopedStyle = { [scope]: { [scope === "interactionStates" ? "hover" : scope === "variations" ? "section-1" : "mobile"]: { appearance: "extra-black" } } };
    assert.equal(containsExtraBlackAppearance({ styles: { blockStyles: { group: scopedStyle } } }), true, `${scope} website style is detected`);
    const scopedLibrary = { ...library, websiteDesignDefaults: { identity: {}, styles: { blockStyles: { group: scopedStyle } } } };
    assert.throws(() => validateGlobalTemplateLibrary({ ...scopedLibrary, version: 44 }), /Extra Black font appearance/, `${scope} website appearance is version gated`);
  }
  const legacyNumericWeight = { ...library, websiteDesignDefaults: { identity: {}, styles: { blockStyles: { group: { websiteWeight: 1000, websiteItalic: true } } } } };
  assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...legacyNumericWeight, version: 44 }));

  const backup = { format: "acm-studio-backup", version: 42, exportedAt: "2026-11-08T00:00:00Z", workspace: currentWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.doesNotThrow(() => validateStudioBackup(backup));
  assert.throws(() => validateStudioBackup({ ...backup, version: 41 }), /Extra Black font appearance/);
  const html = blockClipboardHtml([paragraph]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const original = globalThis.DOMParser;
  try {
    let payload = encoded;
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 39 });
    assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = original; }
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


test("Quote Group conversion retains presentation in an intact Quote when it cannot be flattened", () => {
  const base = { id: "group-quote", type: "quote", text: "", children: [{ id: "body", type: "paragraph", text: "Body" }] };
  const ids = block => availableBlockTransformsInDocument(block, [block]).map(item => item.id);
  assert.ok(ids(base).includes("quote-to-group"));
  for (const visualStyle of [{ blockGap: "0" }, { headingColor: "#123456" }, { headingBackgroundColor: "#123456" }, { headingBackgroundGradient: gradient }, { responsive: { mobile: { blockGap: "12px" } } }]) {
    const current = { ...base, visualStyle };
    const transform = availableBlockTransformsInDocument(current, [current]).find(item => item.id === "quote-to-group");
    assert.ok(transform);
    const result = transformQuoteBlocks(current, transform, () => "wrapper");
    assert.equal(result[0].type, "group");
    assert.deepEqual(plain(result[0].children), [current]);
    assert.ok(ids(current).includes("wrap-columns"));
  }
  const descendant = { ...base, children: [{ ...quote, id: "nested-quote" }] };
  assert.ok(ids(descendant).includes("quote-to-group"));
});
