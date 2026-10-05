import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const publications = await load("../app/content/local-publishing.ts");
const { studioWriteOwnership } = await load("../app/studio/write-ownership.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { createTemplateSet, TEMPLATE_VERSION, validateTemplatePublicationSnapshot } = await load("../app/studio/template-model.ts");
const { DOCUMENT_DISPLAY_FIELDS, validDocumentDisplay, documentFieldVisible } = await load("../app/content/document-metadata.ts");
const { BlockRenderer } = await load("../app/components/content.tsx");
const { TemplateDocument } = await load("../app/studio/template-renderer.tsx");
const { ArticleByline, PageFrame } = await load("../app/components/site-shell.tsx");
const { readingTimeLabel } = await load("../app/content/reading-time.ts");
const { safeImageSource } = await load("../app/content/rich-text.ts");

const policy = mode => Object.fromEntries(DOCUMENT_DISPLAY_FIELDS.map(field => [field, mode]));
function documentFixture() {
  return {
    ...structuredClone(initialStudioWorkspace.documents.find(document => document.kind === "post")),
    id: "visibility-post", slug: "visibility-post", title: "Visibility title", subtitle: "Visibility subtitle",
    author: "Visibility author", publishedAt: "2026-10-05T12:00:00Z", updatedAt: "2026-10-05T12:00:00Z",
    coverImage: { src: "https://example.com/cover.png", alt: "Visibility cover" },
    blocks: [
      { id: "title", type: "document-title", level: 2 },
      { id: "subtitle", type: "document-subtitle" },
      { id: "cover", type: "cover-image" },
      { id: "author", type: "post-author", prefix: "Written by", avatar: true },
      { id: "date", type: "post-date", format: "iso", showIcon: false },
      { id: "reading", type: "reading-time", prefix: "Read:", presentation: "plain" },
      { id: "body", type: "paragraph", text: "Authored body survives publication.", editorial: { name: "Private name", note: "Private note" } },
    ],
  };
}
function templateFixture() {
  const set = createTemplateSet();
  const template = set.templates.find(template => template.kind === "post");
  template.nodes = [
    { id: "template-title", type: "element", element: "document-title" },
    { id: "template-subtitle", type: "element", element: "subtitle" },
    { id: "template-cover", type: "element", element: "cover-image" },
    { id: "template-author", type: "post-author", prefix: "Written by", avatar: true },
    { id: "template-date", type: "post-date", format: "iso", showIcon: false },
    { id: "template-reading", type: "reading-time", prefix: "Read:", presentation: "plain" },
    { id: "template-content", type: "element", element: "content" },
  ];
  return { version: TEMPLATE_VERSION, set, templateId: template.id };
}

async function withStorage(run) {
  const previousWindow = globalThis.window;
  const bytes = new Map();
  let writes = 0;
  globalThis.window = { localStorage: { getItem: key => bytes.get(key) ?? null, setItem: (key, value) => { writes++; bytes.set(key, value); } } };
  const release = studioWriteOwnership.acquire(token => studioWriteOwnership.loaded(token, true), {
    request: async (_name, options, callback) => { assert.equal(options.ifAvailable, true); return callback({ name: "test" }); },
  });
  await Promise.resolve();
  assert.equal(studioWriteOwnership.canWrite(), true);
  try { await run({ bytes, writes: () => writes }); }
  finally { release(); await Promise.resolve(); globalThis.window = previousWindow; }
}

// Execute the production page's presentation branches with its loaded article.
// Effects are withheld here; an actual browser load remains separate evidence.
const pageSource = await readFile(new URL("../app/writing/[slug]/local-article-page.tsx", import.meta.url), "utf8");
const pageTree = ts.createSourceFile("local-article-page.tsx", pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const pageFunction = pageTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "LocalArticlePage");
const compiledPage = ts.transpileModule(pageFunction.getText(pageTree).replace(/^export /, ""), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function pageHtml(article) {
  let hook = 0;
  const page = runInNewContext(`${compiledPage}\nLocalArticlePage`, {
    exports: {},
    require: name => { assert.equal(name, "react/jsx-runtime"); return jsxRuntime; },
    useState: initial => [hook++ === 0 ? article : typeof initial === "function" ? initial() : initial, () => {}],
    useRef: current => ({ current }), useEffect() {},
    ...publications, BlockRenderer, TemplateDocument, ArticleByline, PageFrame, readingTimeLabel, safeImageSource, documentFieldVisible,
  });
  return renderToStaticMarkup(page({ slug: article.slug }));
}

for (const withTemplate of [false, true]) test(`owned publish → JSON reader → actual page honours all display fields, template=${withTemplate}`, async () => {
  await withStorage(({ bytes }) => {
    const document = documentFixture();
    document.displayOverrides = policy("hide");
    const template = withTemplate ? templateFixture() : undefined;
    const before = JSON.stringify(document);
    publications.publishDocumentLocally(document, template);
    const serialised = bytes.get(publications.LOCAL_PUBLICATIONS_KEY);
    assert.equal(JSON.parse(serialised).version, 18);
    const article = publications.parseLocallyPublishedArticles(serialised)[0];
    assert.deepEqual(article.displayOverrides, policy("hide"));
    assert.equal(JSON.stringify(document), before);
    assert.equal(article.blocks.find(block => block.id === "body").text, "Authored body survives publication.");
    assert.equal(article.blocks.find(block => block.id === "body").editorial, undefined);
    const hidden = pageHtml(article);
    assert.match(hidden, /Authored body survives publication/);
    assert.doesNotMatch(hidden, /Visibility title|Visibility subtitle|Visibility cover|Visibility author|Written by|Read:|2026-10-05/);
    document.displayOverrides = policy("show");
    publications.publishDocumentLocally(document, template);
    const shown = pageHtml(publications.parseLocallyPublishedArticles(bytes.get(publications.LOCAL_PUBLICATIONS_KEY))[0]);
    assert.match(shown, /Visibility title/);
    for (const text of ["Visibility subtitle", "Visibility cover", "Visibility author", "2026-10-05", "Read:"]) assert.ok(shown.includes(text), text);
  });
});

test("direct publication freezes exact template defaults and document overrides until Update", async () => {
  await withStorage(({ bytes }) => {
    const document = documentFixture();
    const template = templateFixture();
    const selected = template.set.templates.find(item => item.id === template.templateId);
    template.set.templates.find(item => item.id !== template.templateId).displayDefaults = policy("show");
    selected.displayDefaults = policy("hide");
    document.displayOverrides = { author: "show" };
    const published = publications.publishDocumentLocally(document, () => template);
    assert.deepEqual(published.displayOverrides, { ...policy("hide"), author: "show" });
    const saved = bytes.get(publications.LOCAL_PUBLICATIONS_KEY);
    selected.displayDefaults = policy("show");
    document.displayOverrides.author = "hide";
    assert.equal(bytes.get(publications.LOCAL_PUBLICATIONS_KEY), saved);
    const reloaded = publications.parseLocallyPublishedArticles(saved)[0];
    assert.deepEqual(reloaded.displayOverrides, { ...policy("hide"), author: "show" });
    assert.deepEqual(publications.locallyPublishedDocument(reloaded).displayOverrides, reloaded.displayOverrides);
    publications.publishDocumentLocally(document, template);
    assert.deepEqual(publications.parseLocallyPublishedArticles(bytes.get(publications.LOCAL_PUBLICATIONS_KEY))[0].displayOverrides, { ...policy("show"), author: "hide" });
  });
});

for (const invalid of [null, [], "hide", { author: "inherit" }, { unknown: "hide" }, { author: false }]) test(`malformed visibility preserves stored bytes: ${JSON.stringify(invalid)}`, async () => {
  await withStorage(({ bytes, writes }) => {
    const document = documentFixture();
    const invalidStore = JSON.stringify({ version: 18, posts: [{ ...publications.toLocallyPublishedArticle(document), displayOverrides: invalid }] });
    bytes.set(publications.LOCAL_PUBLICATIONS_KEY, invalidStore);
    assert.equal(validDocumentDisplay(invalid), false);
    assert.throws(() => validateTemplatePublicationSnapshot(JSON.parse(invalidStore)));
    assert.deepEqual(publications.parseLocallyPublishedArticles(invalidStore), []);
    for (const mutate of [() => publications.publishDocumentLocally(document), () => publications.unpublishDocumentLocally(document.id), () => publications.restoreLocallyPublishedArticle(publications.toLocallyPublishedArticle(document))]) {
      assert.throws(mutate, publications.UnreadablePublicationsError);
    }
    assert.equal(bytes.get(publications.LOCAL_PUBLICATIONS_KEY), invalidStore);
    assert.equal(writes(), 0);
  });
});

for (const invalid of [{ author: "inherit" }, { unknown: "hide" }, null, []]) test(`invalid draft visibility is rejected before a publication write: ${JSON.stringify(invalid)}`, async () => {
  await withStorage(({ bytes, writes }) => {
    const document = documentFixture();
    publications.publishDocumentLocally(document);
    const saved = bytes.get(publications.LOCAL_PUBLICATIONS_KEY);
    document.displayOverrides = invalid;
    assert.throws(() => publications.publishDocumentLocally(document));
    assert.equal(bytes.get(publications.LOCAL_PUBLICATIONS_KEY), saved);
    assert.equal(writes(), 1);
  });
});

test("legacy publications retain Show defaults without consulting a changed template", () => {
  const article = publications.toLocallyPublishedArticle(documentFixture(), templateFixture());
  delete article.displayOverrides;
  article.templateSnapshot.set.templates.find(item => item.id === article.templateSnapshot.templateId).displayDefaults = policy("hide");
  for (const version of Array.from({ length: 17 }, (_, index) => index + 1)) {
    const reloaded = publications.parseLocallyPublishedArticles(JSON.stringify({ version, posts: [article] }))[0];
    assert.ok(reloaded);
    assert.equal(reloaded.displayOverrides, undefined);
    assert.equal(publications.locallyPublishedDocument(reloaded).displayOverrides, undefined);
    const shown = pageHtml(reloaded);
    assert.match(shown, /Visibility subtitle/);
    assert.match(shown, /Visibility author/);
    assert.match(shown, /Read:/);
  }
});

test("unpublish and Bin restore retain the current publication policy", async () => {
  await withStorage(({ bytes }) => {
    const document = documentFixture();
    document.displayOverrides = { author: "hide", publicationDate: "hide" };
    publications.publishDocumentLocally(document);
    const recoverable = publications.getLocallyPublishedArticle(document.id);
    publications.unpublishDocumentLocally(document.id);
    assert.equal(JSON.parse(bytes.get(publications.LOCAL_PUBLICATIONS_KEY)).version, 18);
    publications.restoreLocallyPublishedArticle(recoverable);
    assert.deepEqual(publications.parseLocallyPublishedArticles(bytes.get(publications.LOCAL_PUBLICATIONS_KEY))[0].displayOverrides, recoverable.displayOverrides);
  });
});

test("legacy byline supports independently hidden author and date with unchanged defaults", () => {
  const article = publications.toLocallyPublishedArticle(documentFixture());
  const render = props => renderToStaticMarkup(createElement(ArticleByline, { article, ...props }));
  assert.match(render({}), /Andrew Moss/);
  assert.match(render({ showAuthor: false }), /<time/);
  assert.doesNotMatch(render({ showAuthor: false }), /Andrew Moss/);
  assert.match(render({ showDate: false }), /Andrew Moss/);
  assert.doesNotMatch(render({ showDate: false }), /<time/);
  assert.equal(render({ showAuthor: false, showDate: false }), "");
});
