import { testSiteVersion } from "./test-site-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const responsive = await loadProductionModule(new URL("../app/content/responsive-styles.ts", import.meta.url));
const styles = await loadProductionModule(new URL("../app/content/paragraph-styles.ts", import.meta.url));
const validation = await loadProductionModule(new URL("../app/studio/workspace-validation.ts", import.meta.url));
const model = await loadProductionModule(new URL("../app/studio/editor-model.ts", import.meta.url));
const templates = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const image = await loadProductionModule(new URL("../app/content/image-style.ts", import.meta.url));
const table = await loadProductionModule(new URL("../app/content/table-presentation.ts", import.meta.url));
const renderer = await loadProductionModule(new URL("../app/components/blocks/block-renderer.tsx", import.meta.url));

const design = { fontSizeCustom: "24px", textColor: "#111111", responsive: { tablet: { fontSizeCustom: "20px", padding: "8px" }, mobile: { fontSizeCustom: "16px" } } };
const paragraph = { id: "responsive-paragraph", type: "paragraph", text: "Responsive text", style: design };
function workspace(blocks = [paragraph]) {
  const document = { ...structuredClone(model.initialStudioWorkspace.documents[0]), blocks };
  return { version: 26, documents: [document], activeDocumentId: document.id, categories: [], bin: [] };
}

test("scoped editing, reset and switching off preserve independent overrides", () => {
  let style = responsive.replaceViewportStyle({ fontSizeCustom: "24px" }, "tablet", { fontSizeCustom: "20px" });
  style = responsive.replaceViewportStyle(style, "mobile", { padding: "8px" });
  assert.equal(responsive.styleForViewport(style, "mobile").fontSizeCustom, "24px");
  assert.equal(responsive.styleForViewport(style, "tablet").padding, undefined);
  style = responsive.replaceViewportStyle(style, "desktop", { fontSizeCustom: "28px", textColor: "#000000" });
  assert.equal(responsive.styleForViewport(style, "tablet").fontSizeCustom, "20px");
  assert.equal(responsive.styleForViewport(style, "mobile").fontSizeCustom, "28px");
  style = responsive.replaceViewportStyle(style, "tablet", {});
  assert.equal(style.responsive.tablet, undefined);
  assert.deepEqual(style.responsive.mobile, { padding: "8px" });
  assert.equal(responsive.styleForViewport(style, "tablet").fontSizeCustom, "28px");
});

test("responsive override validation rejects recursion, assets, arbitrary viewport and CSS", () => {
  assert.equal(validation.validParagraphStyle(design), true);
  for (const responsive of [{ desktop: { padding: "2px" } }, { tablet: { responsive: { mobile: { padding: "2px" } } } }, { mobile: { backgroundImageMediaId: "image-id" } }, { mobile: { additionalCss: "display:none" } }, { tablet: {} }, { tablet: { fontSizeCustom: "url(x)" } }, { mobile: null }]) assert.equal(validation.validParagraphStyle({ responsive }), false);
});

test("older workspace readers gate responsive data, while old source upgrades before editing", () => {
  const legacy = { ...workspace([{ ...paragraph, style: { fontSizeCustom: "24px" } }]), version: 25 };
  const current = validation.migrateStudioWorkspace(legacy);
  assert.equal(current.version, 30);
  current.documents[0].blocks[0].style = design;
  assert.equal(validation.validateStudioWorkspace(current).documents[0].blocks[0].style.responsive.mobile.fontSizeCustom, "16px");
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace(), version: 25 }));
  const document = workspace().documents[0];
  const revision = { id: "revision-1", document: { ...document }, savedAt: document.updatedAt };
  assert.equal(validation.validateStudioWorkspace({ ...workspace(), documentRevisions: [revision] }).documentRevisions[0].document.blocks[0].style.responsive.tablet.padding, "8px");
});

test("CSS rendering preserves base styles and independent device deltas without parent variable fallback", () => {
  const css = styles.paragraphStyleToCss(design);
  assert.equal(css.fontSize, "24px");
  assert.equal(css["--studio-rs-tablet-font-size"], "20px");
  assert.equal(css["--studio-rs-mobile-font-size"], "16px");
  assert.equal(css["--studio-rs-tablet-padding"], "8px");
  assert.equal(css["--studio-rs-mobile-padding"], undefined);
  const child = styles.paragraphStyleToCss({ responsive: { mobile: { padding: "4px" } } });
  assert.equal(child.padding, undefined);
  assert.equal(child["--studio-rs-tablet-padding"], undefined);
  assert.equal(child["--studio-rs-mobile-padding"], "4px");
  assert.match(responsive.responsiveBlockCss, /@container studio-document \(max-width:480px\)/);
  assert.match(responsive.responsiveBlockCss, /min-width:480\.01px.*max-width:782px/);
  assert.match(responsive.responsiveBlockCss, /:not\(\.studio-responsive-container \*\)/);
  assert.doesNotMatch(responsive.responsiveBlockCss, /--studio-rs-base/);
  const html = renderToStaticMarkup(createElement(renderer.BlockRenderer, { blocks: [paragraph], variant: "studio" }));
  assert.match(html, /font-size:24px/);
  assert.match(html, /--studio-rs-mobile-font-size:16px/);
});

test("image frames and table spacing keep responsive declarations on their canonical surfaces", () => {
  const block = { visualStyle: { responsive: { mobile: { padding: "8px", borderRadius: "6px" } } } };
  const wrapper = image.imageWrapperStyle(block);
  const frame = image.imageDisplayStyle(block);
  assert.equal(wrapper["--studio-rs-mobile-padding"], "8px");
  assert.equal(wrapper["--studio-rs-mobile-border-radius"], undefined);
  assert.equal(frame["--studio-rs-mobile-border-radius"], "6px");
  assert.equal(frame["--studio-rs-mobile-padding"], undefined);
  const presentation = table.tablePresentation(block.visualStyle);
  assert.equal(presentation.wrapper["--studio-rs-mobile-padding"], "8px");
  assert.equal(presentation.table["--studio-rs-mobile-padding"], undefined);
  assert.equal(presentation.table["--studio-rs-mobile-border-radius"], "6px");
});

test("shared button interaction states retain precedence over responsive default state", () => {
  const css = styles.buttonVisualCss(design, { hover: { fontSizeCustom: "32px" } });
  assert.equal(css["--button-hover-font-size"], "32px");
  assert.equal(css["--button-base-font-size"], "24px");
  assert.equal(css["--studio-rs-mobile-font-size"], "16px");
  assert.match(responsive.responsiveBlockCss, /--button-base-font-size:var\(--studio-rs-mobile-font-size\)/);
});

test("template projection, current snapshots and legacy package compatibility retain responsive designs", () => {
  const nodes = [{ id: "title-rs", type: "element", element: "document-title", visualStyle: design }, paragraph];
  const projected = templates.templateEditorBlocks(nodes);
  const restored = templates.templateNodesFromBlocks(projected, nodes);
  assert.deepEqual(restored[0].visualStyle.responsive, design.responsive);
  assert.deepEqual(restored[1].style.responsive, design.responsive);
  const set = templates.createTemplateSet();
  set.templates[0].nodes = restored;
  const current = { version: templates.TEMPLATE_VERSION, sets: [set], assignments: [], bin: [], defaultTemplateIds: {}, libraryOrder: [] };
  assert.equal(templates.validateTemplateStore(current).sets[0].templates[0].nodes[1].style.responsive.mobile.fontSizeCustom, "16px");
  assert.throws(() => templates.validateTemplateStore({ ...current, version: "0.31.0" }), /Responsive styles/);
  const old = templates.createTemplateSet();
  assert.equal(templates.validateTemplateStore({ ...current, version: "0.31.0", sets: [old] }).version, "0.34.0");
  const snapshot = { version: templates.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  assert.deepEqual(templates.validateTemplateSnapshot(snapshot).set.templates[0].nodes[0].visualStyle.responsive, design.responsive);
});

test("publication capture freezes responsive values and old snapshots gate the new fields", async () => {
  const publishing = await loadProductionModule(new URL("../app/content/local-publishing.ts", import.meta.url));
  const article = publishing.toLocallyPublishedArticle({ ...workspace().documents[0], kind: "post", slug: "responsive-text", author: "Example author" });
  assert.equal(validation.validatePublicationSnapshot({ version: 19, posts: [article] }).posts[0].blocks[0].style.responsive.tablet.fontSizeCustom, "20px");
  assert.throws(() => validation.validatePublicationSnapshot({ version: 18, posts: [article] }), /Responsive styles/);
  const changed = responsive.replaceViewportStyle(design, "tablet", { fontSizeCustom: "18px" });
  assert.equal(article.blocks[0].style.responsive.tablet.fontSizeCustom, "20px");
  assert.equal(changed.responsive.tablet.fontSizeCustom, "18px");
});

test("typed clipboard and HTML inspection preserve responsive maps and reject old responsive envelopes", async () => {
  const clipboard = await loadProductionModule(new URL("../app/studio/block-clipboard.ts", import.meta.url));
  const htmlEditor = await loadProductionModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url));
  const originalParser = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString(html) { return { querySelector() { const value = /data-acm-studio-blocks="([^"]*)"/.exec(html)?.[1]; return value ? { getAttribute() { return value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&"); } } : null; } }; }
  };
  try {
    const html = clipboard.blockClipboardHtml([paragraph]);
    assert.match(html, /data-responsive-styles=/);
    assert.match(htmlEditor.blocksToHtml([paragraph]), /data-responsive-styles=/);
    const payload = clipboard.readBlockClipboardPayload(html);
    assert.deepEqual(payload.blocks[0].style.responsive, design.responsive);
    assert.equal(clipboard.readBlockClipboardPayload(html.replace('&quot;version&quot;:7', '&quot;version&quot;:4')), null);
  } finally { globalThis.DOMParser = originalParser; }
});

test("Test/Test2 legacy sources remain readable and responsive draft saves keep publications independent", async () => {
  const contract = await loadProductionModule(new URL("../app/studio/test-site/contract.ts", import.meta.url));
  const commands = await loadProductionModule(new URL("../app/studio/test-site/local-publication.ts", import.meta.url));
  for (const siteId of ["test", "test2"]) for (const kind of ["post", "page"]) {
    const home = { ...workspace().documents[0], id: "home", kind: "page", title: "Home", slug: "", status: "published", blocks: [{ id: "home-text", type: "paragraph", text: "Home" }] };
    const selected = { ...workspace().documents[0], id: "selected", kind, slug: "selected", status: "draft", blocks: [{ ...paragraph, style: { fontSizeCustom: "24px" } }] };
    const seed = contract.testSiteCollection({ format: "acm-test-site", version: 3, siteId, documents: [home, selected], activeDocumentId: home.id, homeDocumentId: home.id, categories: [], bin: [], browserImportComplete: true, templates: templates.emptyTemplateStore() });
    const old = testSiteVersion({ ...seed, globalTemplates: [], publications: [{ document: structuredClone(home) }] },7);
    assert.equal(contract.validTestSiteDocument(old), true);
    const draft = { ...old, version: 8, documents: [home, { ...selected, blocks: [paragraph] }] };
    assert.equal(contract.validTestSiteDocument(draft), true);
    assert.equal(contract.validTestSiteDocument({ ...draft, version: 7 }), false);
    assert.equal(draft.publications.some(item => item.document.id === selected.id), false);
    const captured = commands.changeLocalSiteStatus(draft, selected.id, "published", draft.templates);
    assert.equal(contract.validTestSiteDocument(captured), true);
    assert.equal(captured.publications.find(item => item.document.id === selected.id).document.blocks[0].style.responsive.mobile.fontSizeCustom, "16px");
    assert.equal(contract.testSiteWorkspace(captured).version, 30);
  }
});

test("device-only Heading, metadata and Code styles keep Desktop markers unchanged and scope inner inheritance", () => {
  const deviceOnly = { responsive: { mobile: { fontSizeCustom: "19px", fontFamily: "arial", appearance: "bold", lineHeight: "1.6", textColor: "#123456", backgroundColor: "#EEEEEE" } } };
  const css = styles.paragraphStyleToCss(deviceOnly);
  assert.equal(css.fontSize, undefined);
  assert.equal(css.color, undefined);
  assert.equal(styles.visualStyleClassName(deviceOnly), "block-visual-style");
  assert.equal(css["--studio-rs-mobile-font-size"], "19px");
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-font-size:.*?\.metadata-block.*?font-size:inherit/s);
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-background-color:.*?\.code-editor-shell.*?background:transparent/s);
  assert.doesNotMatch(responsive.responsiveBlockCss, /font-size:inherit!important/);
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-font-size:.*?\.article-footnotes.*?\.footnotes-field textarea.*?font-size:inherit/s);
  const html = renderToStaticMarkup(createElement(renderer.BlockRenderer, { blocks: [{ id: "heading", type: "heading", level: 2, text: "Device-only heading", visualStyle: deviceOnly }], variant: "studio" }));
  assert.match(html, /--studio-rs-mobile-font-size:19px/);
  assert.doesNotMatch(html, /has-custom-font-size/);
});

test("Separator and Social Icons responsive colours reach their semantic surfaces", async () => {
  const divider = await loadProductionModule(new URL("../app/content/divider-style.ts", import.meta.url));
  const social = await loadProductionModule(new URL("../app/components/social-icons.tsx", import.meta.url));
  const visualStyle = { backgroundColor: "#FF0000", textColor: "#111111", responsive: { mobile: { backgroundColor: "#0000FF", textColor: "#00FF00" } } };
  const rule = divider.dividerRuleStyle(visualStyle);
  assert.equal(rule.borderTopColor, "#FF0000");
  assert.equal(rule["--studio-rs-mobile-border-top-color"], "#0000FF");
  assert.equal(rule["--studio-rs-mobile-color"], "#0000FF");
  const icons = social.socialIconsColourStyle({ id: "social", type: "social-icons", children: [], visualStyle });
  assert.equal(icons["--social-icon-colour"], "#111111");
  assert.equal(icons["--studio-rs-mobile-social-icon-colour"], "#00FF00");
  assert.equal(icons["--studio-rs-mobile-social-icon-background"], "#0000FF");
  const html = renderToStaticMarkup(createElement(renderer.BlockRenderer, { blocks: [{ id: "separator", type: "divider", visualStyle }], variant: "studio" }));
  assert.match(html, /--studio-rs-mobile-border-top-color:#0000FF/);
  assert.doesNotMatch(html, /--studio-rs-mobile-background-color/);
});

test("device-only Table borders and Featured Image radii receive scoped cell inheritance and clipping", () => {
  const visualStyle = { responsive: { mobile: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "6px" } } };
  const presentation = table.tablePresentation(visualStyle);
  assert.equal(presentation.hasBorder, false, "Desktop keeps its default table borders");
  assert.equal(presentation.table["--studio-rs-mobile-border-color"], "#123456");
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-border-color:.*?td.*?border-color:inherit/s);
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-border-width:.*?border-collapse:collapse/s);
  assert.match(responsive.responsiveBlockCss, /content-table-frame.*?has.*?--studio-rs-mobile-border-width:.*?border:0/s);
  assert.match(responsive.responsiveBlockCss, /cover-image-visual-style-frame.*?--studio-rs-mobile-border-radius:.*?overflow:hidden/s);
  assert.match(responsive.responsiveBlockCss, /--studio-rs-mobile-border-radius:.*?document-featured-placeholder.*?border-radius:0/s);
});

test("responsive Social Icons link foreground is scoped strongly enough for template links", () => {
  const block = { id: "responsive-social-links", type: "social-icons", children: [{ id: "linkedin-link", type: "social-linkedin", url: "https://example.com" }], visualStyle: { responsive: { mobile: { textColor: "#1C1C1E" } } } };
  const html = renderToStaticMarkup(createElement("div", { className: "template-surface" }, createElement(renderer.BlockRenderer, { blocks: [block], variant: "studio" })));
  assert.match(html, /<a class="social-icon-item is-linkedin" href="https:\/\/example.com"/);
  assert.match(html, /--studio-rs-mobile-social-icon-colour:#1C1C1E/);
  // A device-scoped attribute plus class is more specific than the template's
  // `.template-surface a` baseline; the rule is absent outside that device range.
  assert.match(responsive.responsiveBlockCss, /\[style\*="--studio-rs-mobile-social-icon-colour:"\] \.social-icon-item[^{}]*\{color:var\(--social-icon-colour\);\}/);
});
