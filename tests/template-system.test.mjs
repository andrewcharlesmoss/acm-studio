import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
function environment(overrides = {}) {
  const cache = new Map(); const records = new Map();
  const library = { assets: [], folders: [] };
  let failKey = null; let failures = 0;
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => { if (key === failKey && failures-- > 0) throw new Error("Quota exceeded"); records.set(key, value); }, removeItem: key => records.delete(key) };
  const window = { localStorage: storage, atob: value => Buffer.from(value, "base64").toString("binary"), dispatchEvent() {} };
  class FileReader {
    readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`; this.onload(); }); }
  }
  function load(path) {
    const url = path instanceof URL ? path : new URL(`../app/${path}`, import.meta.url);
    if (cache.has(url.href)) return cache.get(url.href);
    const exports = {}; cache.set(url.href, exports);
    const source = readFileSync(url, "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(compiled, { exports, crypto: webcrypto, window, Blob, FileReader, Event, Date, Error, AggregateError, setTimeout, clearTimeout, queueMicrotask, console, require: name => {
      if (name in overrides) return overrides[name];
      if (name.endsWith("media-store")) return { listMediaLibrary: async () => ({ assets: [...library.assets], folders: [...library.folders] }), replaceMediaLibrary: async (assets, folders) => { library.assets = [...assets]; library.folders = [...folders]; } };
      if (name.endsWith("design-store")) return { loadDesigns: () => [] };
      if (name.startsWith(".")) {
        const target = new URL(name, url);
        if (name.endsWith(".mjs")) return require(target.pathname);
        for (const extension of ["", ".ts", ".tsx"]) { try { return load(new URL(target.href + extension)); } catch (error) { if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error; cache.delete(target.href + extension); } }
        throw new Error(`Missing ${name}`);
      }
      return require(name);
    } });
    return exports;
  }
  async function own() {
    const { studioWriteOwnership: owner } = load("studio/write-ownership.ts");
    const release = owner.acquire(token => owner.loaded(token, true), { request: async (_name, _options, callback) => callback({}) });
    await new Promise(resolve => setImmediate(resolve)); return { owner, release };
  }
  return { load, storage, records, library, own, fail: (key, count = 1) => { failKey = key; failures = count; } };
}

test("neutral templates validate and their editor projection round-trips without lost content", () => {
  const env = environment(); const m = env.load("studio/template-model.ts");
  const set = m.createTemplateSet(); m.validateTemplateSet(set);
  const post = set.templates.find(item => item.kind === "post");
  assert.deepEqual(plain(post.nodes.filter(node => node.type !== "part").map(node => node.type)), ["element", "element", "element", "group", "element"]);
  const metadata = post.nodes.find(node => node.type === "group");
  assert.deepEqual(plain(metadata.children.map(node => node.type)), ["post-author", "post-date", "reading-time"]);
  for (const item of [...set.templates, ...set.parts]) {
    const actual = m.templateNodesFromBlocks(m.templateEditorBlocks(item.nodes));
    const expected = plain(item.nodes);
    m.visitTemplateNodes(expected, node => { if (node.type === "element") node.align = "left"; });
    assert.deepEqual(plain(actual), expected);
  }
  set.parts[0].nodes[0].data = { templateElement: "content" };
  assert.throws(() => m.validateTemplateSet(set), /metadata/);
  // Even unvalidated projection input must not preserve reserved group metadata.
  assert.equal(m.templateEditorBlocks(set.parts[0].nodes)[0].data, undefined);
});

test("document fields resolve template defaults and report display ownership", () => {
  const env = environment(); const fields = env.load("studio/document-fields.ts"); const model = env.load("studio/editor-model.ts");
  const document = plain(model.initialStudioWorkspace.documents.find(item => item.kind === "post"));
  const set = env.load("studio/template-model.ts").createTemplateSet();
  set.defaults = { author: "Template Author", category: "Personal", tags: ["Template"] };
  document.templateOverrides = { author: false, category: false, tags: false };
  const resolved = fields.resolveDocumentFields(document, set);
  assert.equal(resolved.author, "Template Author"); assert.equal(resolved.category, "Personal"); assert.deepEqual(plain(resolved.tags), ["Template"]);
  const postTemplate = set.templates.find(item => item.kind === "post");
  postTemplate.defaults = { author: "Post Template Author", category: "Technology", tags: ["Post"] };
  postTemplate.displayDefaults = { subtitle: "hide", author: "show" };
  const templateResolved = fields.resolveDocumentFields(document, set, postTemplate.defaults);
  assert.equal(templateResolved.author, "Post Template Author"); assert.equal(templateResolved.category, "Technology"); assert.deepEqual(plain(templateResolved.tags), ["Post"]);
  assert.equal(fields.resolveDocumentDisplay(document, postTemplate).subtitle, "hide");
  document.displayOverrides = { subtitle: "show" };
  assert.equal(fields.resolveDocumentDisplay(document, postTemplate).subtitle, "show");
  delete document.displayOverrides.subtitle;
  assert.equal(fields.documentDisplaySource(document, "subtitle", true), "Template Default");
  assert.deepEqual(plain(fields.documentFieldUsage(document, set, postTemplate.id).author), { document: 1, template: 1, total: 2 });
  document.templateOverrides.author = true; document.author = "Document Author";
  assert.equal(fields.resolveDocumentFields(document, set).author, "Document Author");
  const nested = { id: "outer", type: "group", layout: "stack", children: [{ id: "inner", type: "group", layout: "row", children: [{ id: "author", type: "post-author", avatar: true }] }] };
  document.blocks = [nested]; const usage = fields.documentFieldUsage(document, set);
  assert.deepEqual(plain(usage.author), { document: 1, template: 1, total: 2 });
  assert.equal(fields.readingTimeSummary({ ...document, blocks: [{ id: "text", type: "paragraph", text: Array.from({ length: 221 }, () => "word").join(" ") }] }).minutes, 2);
});

test("legacy template stores migrate to inheritance-aware format without losing IDs", () => {
  const env = environment(); const model = env.load("studio/template-model.ts"); const editor = env.load("studio/editor-model.ts"); const set = model.createTemplateSet();
  delete set.defaults;
  const migrated = model.validateTemplateStore({ version: "0.1.0", sets: [set], assignments: [] });
  assert.equal(migrated.version, "0.3.0"); assert.deepEqual(plain(migrated.sets[0].defaults), {}); assert.equal(migrated.sets[0].id, set.id);
  assert.deepEqual(plain(editor.createDocumentFromTemplate("post").blocks), []);
});

test("responsive layout options and Spacer blocks validate and survive template projection", () => {
  const env = environment(); const validation = env.load("studio/workspace-validation.ts"); const templates = env.load("studio/template-model.ts"); const layout = env.load("content/layout.ts");
  const spacer = { id: "spacer-1", type: "spacer", height: 48 };
  const group = { id: "group-1", type: "group", layout: "columns", columns: 3, gap: 24, paddingX: 16, paddingY: 32, contentWidth: "constrained", stackAt: "tablet", horizontalAlign: "centre", verticalAlign: "centre", children: [spacer] };
  assert.equal(validation.validContentBlocks([group]), true);
  assert.equal(validation.validContentBlocks([{ ...spacer, height: 321 }]), false);
  assert.equal(layout.hasLayoutOptions({ layout: "stack" }), false);
  assert.equal(layout.hasLayoutOptions({ layout: "row" }), true);
  assert.equal(layout.hasLayoutOptions({ layout: "stack", gap: 24 }), true);
  const set = templates.createTemplateSet(); set.parts[0].nodes.push(group); templates.validateTemplateSet(set);
  assert.deepEqual(JSON.parse(JSON.stringify(templates.templateNodesFromBlocks(templates.templateEditorBlocks([group]))[0])), group);
});

test("HTML editing serialises layout options and Spacer through the executable block boundary", () => {
  const env = environment(); const html = env.load("studio/studio-html-editor.ts"); const validation = env.load("studio/workspace-validation.ts");
  const block = { id: "group-1", type: "group", layout: "columns", columns: 3, gap: 24, paddingX: 16, paddingY: 32, contentWidth: "constrained", stackAt: "tablet", children: [{ id: "spacer-1", type: "spacer", height: 48 }] };
  const serialised = html.blockToHtml(block);
  assert.match(serialised, /data-layout-gap="24"/);
  assert.match(serialised, /data-layout-padding-x="16"/);
  assert.match(serialised, /data-layout-stack-at="tablet"/);
  assert.match(serialised, /data-spacer-height="48"/);
  assert.equal(validation.validContentBlocks([block]), true);
});

test("invalid references, duplicate slots, cycles, duplicate IDs and unsafe URLs are rejected", () => {
  const { load } = environment(); const m = load("studio/template-model.ts");
  for (const mutate of [
    set => { set.templates[0].nodes.push({ id: m.templateId(), type: "element", element: "content" }); },
    set => { set.templates[0].nodes = set.templates[0].nodes.filter(n => n.element !== "content"); },
    set => { set.templates[0].nodes[0].partId = "missing"; },
    set => { set.parts[0].nodes.push({ id: m.templateId(), type: "part", partId: set.parts[0].id }); },
    set => { set.parts[0].nodes[0].id = set.parts[1].id; },
    set => { set.navigation.push({ id: m.templateId(), label: "Unsafe", url: "javascript:alert(1)" }); },
    set => { set.templates[0].nodes.push({ id: "__proto__", type: "divider" }); },
    set => { set.styles.spacing = Infinity; },
    set => { set.parts[0].nodes.push({ id: m.templateId(), type: "element", element: "content" }); },
  ]) { const set = m.createTemplateSet(); mutate(set); assert.throws(() => m.validateTemplateSet(set)); }
});

test("shared-part DAG expansion is bounded before it becomes exponential", () => {
  const m = environment().load("studio/template-model.ts"); const set = m.createTemplateSet();
  for (let depth = 0; depth < 7; depth++) {
    const previous = set.parts.at(-1).id;
    set.parts.push({ id: m.templateId(), name: `Nested ${depth}`, kind: "header", nodes: Array.from({ length: 20 }, () => ({ id: m.templateId(), type: "part", partId: previous })) });
  }
  assert.throws(() => m.validateTemplateSet(set), /too many elements/);
});

test("two assigned documents share a design while a duplicated set and published snapshot stay independent", () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const set = m.createTemplateSet();
  const copy = m.duplicateTemplateSet(set); const documents = env.load("studio/editor-model.ts").initialStudioWorkspace.documents;
  const store = { version: m.TEMPLATE_VERSION, sets: [set, copy], assignments: documents.map(d => ({ documentId: d.id, kind: d.kind, setId: set.id, templateId: set.templates.find(t => t.kind === d.kind).id })) };
  m.validateTemplateStore(store, documents);
  const snapshot = m.resolveTemplate(store, documents[0]);
  set.identity.name = "Updated Brand"; set.styles.spacing = 40;
  assert.equal(m.resolveTemplate(store, documents[0]).set.identity.name, "Updated Brand");
  assert.equal(m.resolveTemplate(store, documents[1]).set.styles.spacing, 40);
  assert.equal(snapshot.set.identity.name, "Your Site"); assert.equal(copy.identity.name, "Your Site");
  assert.notEqual(copy.parts[0].id, set.parts[0].id);
  assert.equal(copy.templates[0].nodes[0].partId, copy.parts[0].id);
  store.assignments[0].kind = "post"; m.validateTemplateStore(store);
});

test("ownership, unreadable storage and quota failures preserve original template records", async () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const s = env.load("studio/template-store.ts");
  const store = { version: m.TEMPLATE_VERSION, sets: [m.createTemplateSet()], assignments: [] };
  assert.throws(() => s.saveTemplates(store), /read-only/);
  const { release } = await env.own();
  env.storage.setItem(m.TEMPLATE_STORAGE_KEY, "not-json");
  assert.throws(() => s.saveTemplates(store), /Original data/); assert.equal(env.storage.getItem(m.TEMPLATE_STORAGE_KEY), "not-json");
  env.storage.removeItem(m.TEMPLATE_STORAGE_KEY); s.saveTemplates(store);
  const original = env.storage.getItem(m.TEMPLATE_STORAGE_KEY); store.sets[0].name = "Changed";
  env.fail(m.TEMPLATE_STORAGE_KEY); assert.throws(() => s.saveTemplates(store), /Quota/); assert.equal(env.storage.getItem(m.TEMPLATE_STORAGE_KEY), original); release();
});

function imageFixture(id = "image-source") {
  return { id, name: "image.png", type: "image/png", folderId: null, size: 3, altText: "Example", caption: "", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", dataBase64: "AQID" };
}
function packageFixture(env) {
  const m = env.load("studio/template-model.ts"); const set = m.createTemplateSet();
  set.identity.logo = { src: "", alt: "Logo", mediaId: "image-source" };
  set.parts[0].nodes[0].children.push({ id: m.templateId(), type: "image", src: "", alt: "Nested image", mediaId: "image-source" });
  return { format: "acm-studio-template-set", version: m.TEMPLATE_VERSION, set, media: [imageFixture()] };
}

test("portable imports remap all design/media IDs and reject missing media, wrong versions and malformed bytes", () => {
  const env = environment(); const p = env.load("studio/template-package.ts"); const input = packageFixture(env);
  const result = p.prepareTemplateImport(input);
  assert.notEqual(result.set.id, input.set.id); assert.notEqual(result.assets[0].id, "image-source");
  assert.equal(result.set.identity.logo.mediaId, result.assets[0].id);
  assert.equal(result.set.parts[0].nodes[0].children.at(-1).mediaId, result.assets[0].id);
  assert.throws(() => p.validateTemplatePackage({ ...input, media: [] }), /every referenced/);
  assert.throws(() => p.validateTemplatePackage({ ...input, version: "9.0.0" }), /supported/);
  input.media[0].size = 4; assert.throws(() => p.validateTemplatePackage(input), /invalid/);
});

test("template import transaction rolls media back on storage failure and pauses after success", async () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const p = env.load("studio/template-package.ts");
  const { owner, release } = await env.own();
  env.fail(m.TEMPLATE_STORAGE_KEY);
  await assert.rejects(p.importTemplatePackage(packageFixture(env)), /Quota/);
  assert.equal(env.library.assets.length, 0); assert.equal(env.storage.getItem(m.TEMPLATE_STORAGE_KEY), null); assert.equal(owner.getState(), "writable");
  const id = await p.importTemplatePackage(packageFixture(env));
  assert.equal(env.library.assets.length, 1); assert.equal(JSON.parse(env.storage.getItem(m.TEMPLATE_STORAGE_KEY)).sets[0].id, id); assert.equal(owner.getState(), "blocked"); release();
});

test("full backup includes templates and restores legacy absence, with template rollback on failure", async () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const b = env.load("studio/backup-store.ts");
  const documents = env.load("studio/editor-model.ts").initialStudioWorkspace;
  const store = { version: m.TEMPLATE_VERSION, sets: [m.createTemplateSet()], assignments: [] };
  env.storage.setItem(m.TEMPLATE_STORAGE_KEY, JSON.stringify(store));
  const backup = await b.createStudioBackup(documents); assert.equal(backup.templates.sets[0].id, store.sets[0].id);
  const { owner, release } = await env.own();
  env.fail(m.TEMPLATE_STORAGE_KEY);
  await assert.rejects(b.restoreStudioBackup(backup), /Quota/);
  assert.equal(JSON.parse(env.storage.getItem(m.TEMPLATE_STORAGE_KEY)).sets[0].id, store.sets[0].id); assert.equal(owner.getState(), "writable");
  delete backup.templates; await b.restoreStudioBackup(backup); assert.equal(env.storage.getItem(m.TEMPLATE_STORAGE_KEY), null); release();
});

test("local publication captures nested body/template media and does not consult changing template drafts on read", async () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const pub = env.load("content/local-publishing.ts");
  const repository = env.load("content/publishing-repository.ts").browserPublishingRepository;
  const doc = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents[2]); const set = packageFixture(env).set;
  doc.blocks.push({ id: "body-group", type: "group", layout: "stack", children: [{ id: "body-image", type: "image", src: "", alt: "Nested", mediaId: "nested-body-media" }] });
  const store = { version: m.TEMPLATE_VERSION, sets: [set], assignments: [{ documentId: doc.id, kind: "post", setId: set.id, templateId: set.templates[1].id }] };
  env.storage.setItem(m.TEMPLATE_STORAGE_KEY, JSON.stringify(store)); const { release } = await env.own();
  repository.publish(doc); let article = pub.parseLocallyPublishedArticles(env.storage.getItem(pub.LOCAL_PUBLICATIONS_KEY))[0];
  assert.ok(article.mediaIds.includes("nested-body-media")); assert.ok(article.mediaIds.includes("image-source"));
  store.sets[0].identity.name = "Changed Brand"; env.storage.setItem(m.TEMPLATE_STORAGE_KEY, JSON.stringify(store));
  article = pub.parseLocallyPublishedArticles(env.storage.getItem(pub.LOCAL_PUBLICATIONS_KEY))[0]; assert.equal(article.templateSnapshot.set.identity.name, "Your Site");
  repository.publish(doc); article = pub.parseLocallyPublishedArticles(env.storage.getItem(pub.LOCAL_PUBLICATIONS_KEY))[0]; assert.equal(article.templateSnapshot.set.identity.name, "Changed Brand"); release();
});

test("renderer shares structure/styles and dynamic content, preserves ordinary overrides, and escapes links/text", () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const renderer = env.load("studio/template-renderer.tsx");
  const set = m.createTemplateSet(); const doc = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents[0]);
  set.identity.name = "<script>unsafe</script>";
  set.parts[0].nodes.push({ id: m.templateId(), type: "paragraph", text: "Shared note", style: { textColor: "#ff0000" } });
  const snapshot = { version: m.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  const html = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot, document: doc }));
  assert.match(html, /template-header/); assert.match(html, /template-footer/); assert.match(html, /--template-font-size:1.0625rem/); assert.match(html, /color:#ff0000/); assert.match(html, /Shared note/); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /I make focused products/); assert.doesNotMatch(html, /Edit Header|template-node-select/);
  const edit = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot, document: doc, editingDocument: true, onDocumentChange() {}, content: createElement("textarea", { "aria-label": "Canonical body" }) }));
  assert.match(edit, /Canonical body/); assert.match(edit, /Document title/);
  const post = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents.find(document => document.kind === "post"));
  post.subtitle = "A supporting summary";
  const postHtml = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot: { ...snapshot, templateId: set.templates.find(template => template.kind === "post").id }, document: post }));
  assert.match(postHtml, /<h1>Building the publishing foundation<\/h1>/);
  assert.match(postHtml, /<p class="template-subtitle">A supporting summary<\/p>/);
  assert.match(postHtml, /is-post-author/);
  assert.match(postHtml, /is-reading-time/);
  assert.doesNotMatch(postHtml, /template-metadata/);
  const emptyPost = { ...post, author: undefined, publishAt: undefined, publishedAt: undefined };
  const emptyEdit = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot: { ...snapshot, templateId: set.templates.find(template => template.kind === "post").id }, document: emptyPost, editingDocument: true }));
  assert.match(emptyEdit, /Add an author in Document settings/);
  assert.match(emptyEdit, /Add a publication date in Document settings/);
  const emptyPreview = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot: { ...snapshot, templateId: set.templates.find(template => template.kind === "post").id }, document: emptyPost }));
  assert.doesNotMatch(emptyPreview, /Add an author in Document settings|Add a publication date in Document settings/);
});

test("stale asynchronous imports cannot write after ownership is reacquired", async () => {
  const env = environment(); const p = env.load("studio/template-package.ts");
  const first = await env.own(); const token = first.owner.captureWriteToken(); first.release();
  await new Promise(resolve => setImmediate(resolve)); const second = await env.own();
  await assert.rejects(p.importTemplatePackage(packageFixture(env), "Old import", token), /read-only/);
  assert.equal(env.library.assets.length, 0); second.release();
});

test("templated canvas previews show top-level and nested dividers like Content and published rendering", () => {
  const env = environment(); const model = env.load("studio/template-model.ts");
  const { StudioCanvas } = env.load("studio/studio-canvas.tsx");
  const { TemplateDocument } = env.load("studio/template-renderer.tsx");
  const document = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents[0]);
  document.blocks = [{ id: "top-divider", type: "divider" }, { id: "nested-group", type: "group", layout: "stack", children: [{ id: "nested-divider", type: "divider" }] }];
  const set = model.createTemplateSet();
  const snapshot = { version: model.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  const props = { activeDocument: document, previewing: true, wordCount: 0, characterCount: 0, mediaBlockUrls: {}, showCoverImage: false, linkTargets: [], filteredBlocks: [], selectedBlockId: null };
  const renderCanvas = presentation => renderToStaticMarkup(createElement(StudioCanvas, { ...props, presentation }));
  const compose = (_context, content) => createElement(TemplateDocument, { snapshot, document, content });
  const presentation = { hideDividers: false, renderHeader: () => null, renderDocument: compose };
  const countDividers = html => (html.match(/<hr class="content-divider"/g) ?? []).length;
  assert.equal(countDividers(renderCanvas(presentation)), 2);
  // Exercise both canvas preview branches, including template-editor fallbacks.
  assert.equal(countDividers(renderCanvas({ ...presentation, renderBlock: () => null })), 2);
  assert.equal(countDividers(renderToStaticMarkup(createElement(TemplateDocument, { snapshot, document }))), 2);
  assert.equal(countDividers(renderCanvas(undefined)), 1, "legacy untemplated preview remains unchanged");
  for (const file of ["use-document-templates.tsx", "template-editor.tsx"]) assert.match(readFileSync(new URL(`../app/studio/${file}`, import.meta.url), "utf8"), /hideDividers: false/);
});

test("standalone Header and Footer targets retain composed semantic regions in Edit and Preview", () => {
  const react = require("react");
  for (const previewing of [false, true]) {
    let stateIndex = 0;
    const env = environment({ react: { ...react, useState(initial) { return react.useState(stateIndex++ === 2 ? previewing : initial); } } });
    const model = env.load("studio/template-model.ts");
    const { TemplateEditor } = env.load("studio/template-editor.tsx");
    const { TemplateDocument } = env.load("studio/template-renderer.tsx");
    const set = model.createTemplateSet(); const documents = env.load("studio/editor-model.ts").initialStudioWorkspace.documents;
    const snapshot = { version: model.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
    const composed = renderToStaticMarkup(createElement(TemplateDocument, { snapshot, document: documents[0] }));
    for (const target of set.parts) {
      stateIndex = 0;
      const html = renderToStaticMarkup(createElement(TemplateEditor, { set, target, documents, mediaUrls: {}, writable: true, onChange: () => true, onEditPart() {}, onOpenMedia() {}, undo() {}, redo() {}, canUndo: false, canRedo: false }));
      const region = `<${target.kind} class="template-part template-${target.kind}" data-template-part="${target.id}">`;
      assert.ok(html.includes(region), `${target.kind} ${previewing ? "Preview" : "Edit"} uses shared region`);
      assert.ok(composed.includes(region));
      assert.match(html, /style="width:1200px(?:;zoom:1)?"/);
      assert.doesNotMatch(html, /width:1200px;max-width:100%/);
      if (target.kind === "footer") {
        assert.match(html, /template-copyright/); assert.match(html, /template-social/); assert.match(html, /layout-columns/);
      }
    }
  }
});

test("template edit nodes remain keyboard and pointer selectable without visible duplicate labels", () => {
  const react = require("react");
  const env = environment({ react });
  const model = env.load("studio/template-model.ts");
  const { TemplateEditor } = env.load("studio/template-editor.tsx");
  const set = model.createTemplateSet(); const documents = env.load("studio/editor-model.ts").initialStudioWorkspace.documents;
  const html = renderToStaticMarkup(createElement(TemplateEditor, { set, target: set.parts[0], documents, mediaUrls: {}, writable: true, onChange: () => true, onEditPart() {}, onOpenMedia() {}, undo() {}, redo() {}, canUndo: false, canRedo: false }));
  assert.doesNotMatch(html, /<button[^>]*class="template-node-select"/);
  assert.match(html, /class="template-node-selectable"[^>]*role="group"[^>]*aria-label="Template node: Group"[^>]*tabindex="0"/);
  assert.match(html, /aria-label="Template node: Site Identity"/);
  const source = readFileSync(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8");
  assert.match(source, /onPointerDown=\{event => \{ event\.stopPropagation\(\); setSelected\(node\.id\); \}\}/);
  assert.match(source, /onKeyDown=\{event => \{/);
});

test("template zoom shortcuts are bounded, workspace-scoped and leave native editing alone", () => {
  const env = environment(); const zoom = env.load("studio/template-zoom.ts");
  const plainTarget = { isContentEditable: false, closest: () => null };
  const inputTarget = { isContentEditable: false, closest: (selector) => selector.includes("input") ? {} : null };
  const event = (key, modifiers = {}, target = plainTarget) => ({ key, code: key === "+" ? "Equal" : key === "-" ? "Minus" : key === "0" ? "Digit0" : undefined, target, defaultPrevented: false, altKey: false, metaKey: false, ctrlKey: false, ...modifiers });
  assert.equal(zoom.templateZoomShortcut(event("+", { metaKey: true }), true), "in");
  assert.equal(zoom.templateZoomShortcut(event("=", { ctrlKey: true }), true), "in");
  assert.equal(zoom.templateZoomShortcut({ ...event("x", { ctrlKey: true }), code: "NumpadAdd" }, true), "in");
  assert.equal(zoom.templateZoomShortcut({ ...event("x", { ctrlKey: true }), code: "NumpadSubtract" }, true), "out");
  assert.equal(zoom.templateZoomShortcut({ ...event("x", { ctrlKey: true }), code: "Numpad0" }, true), "reset");
  assert.equal(zoom.templateZoomShortcut(event("+", { ctrlKey: true }, inputTarget), true), null);
  assert.equal(zoom.templateZoomShortcut(event("+", { ctrlKey: true }), false), null);
  assert.equal(zoom.changeTemplateZoom(zoom.TEMPLATE_ZOOM_MIN, "out"), zoom.TEMPLATE_ZOOM_MIN);
  assert.equal(zoom.changeTemplateZoom(zoom.TEMPLATE_ZOOM_MAX, "in"), zoom.TEMPLATE_ZOOM_MAX);
  assert.equal(zoom.changeTemplateZoom(130, "reset"), 100);
});

test("template zoom controls and canvas wiring apply consistently to Edit and Preview", () => {
  const env = environment(); const model = env.load("studio/template-model.ts"); const { TemplateEditor } = env.load("studio/template-editor.tsx");
  const set = model.createTemplateSet(); const documents = env.load("studio/editor-model.ts").initialStudioWorkspace.documents;
  const html = renderToStaticMarkup(createElement(TemplateEditor, { set, target: set.templates[0], documents, mediaUrls: {}, writable: true, onChange: () => true, onEditPart() {}, onOpenMedia() {}, undo() {}, redo() {}, canUndo: false, canRedo: false }));
  assert.match(html, /aria-label="Template canvas zoom"/);
  assert.match(html, /aria-label="Zoom out"/);
  assert.match(html, /aria-label="Reset template zoom to 100 percent \(currently 100 percent\)"/);
  assert.match(html, /aria-label="Zoom in"/);
  assert.match(html, /style="width:1200px;zoom:1"/);
  const editor = readFileSync(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(editor, /canvasZoom: zoom/);
  assert.match(editor, /document\.addEventListener\("keydown", onKeyDown, true\)/);
  assert.match(canvas, /canvasZoom\?: number/);
  assert.match(canvas, /zoom: canvasZoom \/ 100/);
  const css = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(css, /\.template-zoom-control/);
});

test("template shell keeps configurable brand semantics and documented responsive breakpoints", () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const renderer = env.load("studio/template-renderer.tsx");
  const set = m.createTemplateSet(); set.identity.name = "North Star Studio"; set.navigation = [{ id: m.templateId(), label: "About", url: "/about" }];
  set.socialLinks = [{ id: m.templateId(), label: "Support", url: "https://example.com/support" }];
  const document = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents[0]);
  const snapshot = { version: m.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  const html = renderToStaticMarkup(createElement(renderer.TemplateDocument, { snapshot, document }));
  assert.match(html, /template-brand-mark[^>]*>NS</); assert.match(html, /template-brand-name[^>]*>North Star Studio</);
  assert.match(html, /<nav aria-label="Site navigation" class="template-navigation">/);
  assert.match(html, /<nav class="template-social" aria-label="Social and support links">/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  const css = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(css, /Output breakpoints: 780px/); assert.match(css, /@container \(max-width: 780px\)/); assert.match(css, /@container \(max-width: 620px\)/);
  assert.match(css, /\.template-subtitle, \.template-subtitle-input \{ font: 1\.15em\/1\.45 var\(--template-font\); max-width: 42em;/);
  assert.match(css, /\.template-footer \.template-social \{ justify-content: flex-end; \}/); assert.match(css, /\.template-footer \.template-social \{ justify-content: center; \}/);
});

test("template narrow layout restores navigation, settings and save context rather than inheriting hidden panels", () => {
  const css = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  const narrow = css.slice(css.indexOf("@media (max-width: 1100px)"));
  assert.match(narrow, /\.template-workspace \{ display: block; height: auto/);
  for (const panel of ["studio-library", "studio-inspector"]) assert.match(narrow, new RegExp(`\\.template-workspace \\.${panel} \\{ display: flex;`));
  for (const context of ["studio-breadcrumbs", "studio-state", "studio-actions"]) assert.match(narrow, new RegExp(`\\.template-shell \\.${context} \\{ display: flex;`));
  assert.match(narrow, /\.template-toolbar select \{ min-width: 0; max-width: 100%;/);
  assert.match(readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8"), /studio-shell template-shell/);
});

test("template and publication image references prevent deletion until removed", async () => {
  const env = environment(); const m = env.load("studio/template-model.ts"); const store = env.load("studio/template-store.ts");
  const set = packageFixture(env).set;
  env.storage.setItem(m.TEMPLATE_STORAGE_KEY, JSON.stringify({ version: m.TEMPLATE_VERSION, sets: [set], assignments: [] }));
  assert.throws(() => store.assertTemplateMediaCanBeDeleted("image-source"), /used by a template/);
  const document = plain(env.load("studio/editor-model.ts").initialStudioWorkspace.documents[2]);
  const publications = env.load("content/local-publishing.ts"); const { release } = await env.own();
  publications.publishDocumentLocally(document, { version: m.TEMPLATE_VERSION, set, templateId: set.templates[1].id });
  env.storage.removeItem(m.TEMPLATE_STORAGE_KEY);
  assert.throws(() => store.assertTemplateMediaCanBeDeleted("image-source"), /published template snapshot/);
  publications.unpublishDocumentLocally(document.id);
  assert.doesNotThrow(() => store.assertTemplateMediaCanBeDeleted("image-source")); release();
});

function hooks() {
  const slots = []; const pending = []; let cursor = 0;
  const react = {
    useState(initial) { const id = cursor++; if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; },
    useRef(initial) { const id = cursor++; if (!(id in slots)) slots[id] = { current: initial }; return slots[id]; },
    useEffect(callback, dependencies) {
      const id = cursor++; const previous = slots[id];
      if (!previous || dependencies.some((value, index) => value !== previous.dependencies[index])) pending.push(() => { previous?.cleanup?.(); slots[id] = { dependencies, cleanup: callback() }; });
    },
  };
  return { react, render: callback => { cursor = 0; return callback(); }, flush: async () => { pending.splice(0).forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); } };
}

test("template hook reports Saving then Saved, supports undo/redo, and never hides quota errors", async () => {
  const h = hooks(); const env = environment({ react: h.react }); const m = env.load("studio/template-model.ts");
  const { useTemplates } = env.load("studio/use-templates.ts"); const { release } = await env.own();
  let generation = 1; const render = () => h.render(() => useTemplates(generation, true));
  render(); await h.flush(); let state = render(); assert.equal(state.ready, true);
  assert.equal(state.commit(store => ({ ...store, sets: [m.createTemplateSet()] })), true);
  state = render(); assert.equal(state.saveLabel, "Saving…"); assert.equal(state.canUndo, true);
  await new Promise(resolve => setTimeout(resolve, 520)); state = render(); assert.equal(state.saveLabel, "Saved locally");
  state.undo(); state = render(); assert.equal(state.store.sets.length, 0); assert.equal(state.canRedo, true);
  state.redo(); state = render(); assert.equal(state.store.sets.length, 1);
  env.fail(m.TEMPLATE_STORAGE_KEY); assert.equal(state.commit(store => ({ ...store, sets: [] })), false);
  state = render(); assert.equal(state.saveLabel, "Could not save locally"); assert.match(state.error, /Quota/); assert.equal(state.store.sets.length, 1);
  await new Promise(resolve => setTimeout(resolve, 520)); state = render(); assert.equal(state.saveLabel, "Could not save locally");
  const staleCommit = state.commit; generation = 2; render(); await h.flush(); state = render();
  assert.equal(staleCommit(store => ({ ...store, sets: [] })), false); assert.equal(state.store.sets.length, 1); release();
});

test("template remote updates clear local history and failed async saves never report success", async () => {
  const h = hooks(); let syncOptions; let fail = false;
  const env = environment({ react: h.react, "./studio-sync": {
    createStudioSync(options) {
      syncOptions = options;
      return { getStatus: () => "primary", isAvailable: () => true, isPrimary: () => true, commitPrimary: async () => { if (fail) throw new Error("Async quota"); }, close() {} };
    },
  } });
  const m = env.load("studio/template-model.ts"); const { useTemplates } = env.load("studio/use-templates.ts"); const { release } = await env.own();
  let generation = 1; const render = () => h.render(() => useTemplates(generation, true));
  render(); await h.flush(); let state = render(); await h.flush();
  assert.ok(syncOptions);
  assert.equal(state.commit(store => ({ ...store, sets: [m.createTemplateSet()] })), true);
  state = render(); assert.equal(state.canUndo, true);
  const remote = plain(state.store); remote.sets[0].name = "Remote change";
  syncOptions.onSnapshot(remote, "update"); state = render();
  assert.equal(state.store.sets[0].name, "Remote change"); assert.equal(state.canUndo, false); assert.equal(state.canRedo, false);
  fail = true;
  assert.equal(state.commit(store => ({ ...store, sets: [] })), true);
  state = render(); assert.equal(state.saveLabel, "Saving…");
  await new Promise(resolve => setImmediate(resolve)); state = render(); assert.equal(state.saveLabel, "Could not save locally");
  await new Promise(resolve => setTimeout(resolve, 520)); state = render(); assert.equal(state.saveLabel, "Could not save locally");
  release();
});

test("template sync session survives workspace editability changes without reconnecting", async () => {
  const h = hooks(); let sessions = 0; let closed = 0;
  const env = environment({ react: h.react, "./studio-sync": {
    createStudioSync() {
      sessions++;
      return { getStatus: () => "primary", isAvailable: () => true, isPrimary: () => true, commitPrimary: async () => {}, close() { closed++; } };
    },
  } });
  const { useTemplates } = env.load("studio/use-templates.ts"); const { release } = await env.own();
  let writable = true; const render = () => h.render(() => useTemplates(1, writable));
  render(); await h.flush(); render(); await h.flush();
  assert.equal(sessions, 1);
  writable = false; render(); await h.flush(); render();
  assert.equal(sessions, 1); assert.equal(closed, 0);
  release();
});

test("history routing undoes interleaved content and assignment changes in order", async () => {
  const h = hooks(); const env = environment({ react: h.react }); const { useStudioHistoryRouter } = env.load("studio/use-studio-history-router.ts");
  const calls = [];
  const document = { undo: () => calls.push("document undo"), redo: () => calls.push("document redo") };
  const template = { undo: () => calls.push("template undo"), redo: () => calls.push("template redo") };
  const render = () => h.render(() => useStudioHistoryRouter(document, template, 1));
  render(); await h.flush(); let history = render(); history.record("template"); history.record("document");
  history = render(); history.undo(); history.undo(); history.redo(); history.redo();
  assert.deepEqual(calls, ["document undo", "template undo", "template redo", "document redo"]);
});
