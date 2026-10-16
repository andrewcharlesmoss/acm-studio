import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { mediaModules, mediaDatabase, mediaWindow } from "./support/media-browser-fixture.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { contentMediaIds } = await load("../app/content/media-references.ts");
const { toLocallyPublishedArticle } = await load("../app/content/local-publishing.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { createTemplateSet, templateMediaIds, validateTemplatePublicationSnapshot, validateWorkspacePublicationTemplates, validateTemplateStore } = await load("../app/studio/template-model.ts");
const { migrateStudioWorkspace, validContentBlocks, PUBLICATION_VERSION } = await load("../app/studio/workspace-validation.ts");
const { childContentBlocks, findContentBlock } = await load("../app/content/block-tree.ts");
const { parseLocallyPublishedArticles } = await load("../app/content/local-publishing.ts");
const imageRuns = mediaId => [{ text: "source", marks: [{ type: "inline-image", mediaId, alt: "Illustration" }] }];
const paragraph = (id, mediaId) => ({ id, type: "paragraph", text: "source", runs: imageRuns(mediaId) });
const table = { id: "table", type: "table", rows: [["source", "source"], ["source", "source"]], cellRuns: [[imageRuns("cell-a"), imageRuns("cell-b")], [imageRuns("cell-c"), imageRuns("cell-d")]], caption: "source", captionRuns: imageRuns("table-caption") };
const quote = { id: "quote", type: "quote", text: "source", runs: imageRuns("quote-recovery"), attribution: "source", attributionRuns: imageRuns("citation"), children: [paragraph("quote-child", "quote-child-image")] };
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test("every Table cell and caption retain their owned image files", () => {
  assert.deepEqual(contentMediaIds([table]), ["cell-a", "cell-b", "cell-c", "cell-d", "table-caption"]);
});

test("Quote recovery text, child content and citation all retain their files", () => {
  assert.deepEqual(contentMediaIds([quote]), ["quote-recovery", "quote-child-image", "citation"]);
});

test("shared rich-field and child walks cover containers, nested Lists and item backgrounds", () => {
  const blocks = freeze([{ id: "component", type: "component", component: "card", children: [{ id: "group", type: "group", layout: "stack", visualStyle: { backgroundImageMediaId: "group-background" }, children: [
    { id: "columns", type: "columns", style: { backgroundImageMediaId: "columns-background" }, children: [{ id: "column", type: "column", style: { backgroundImageMediaId: "column-background" }, children: [table] }] },
    { id: "buttons", type: "buttons", children: [{ id: "button", type: "button", label: "source", labelRuns: imageRuns("label"), url: "" }] },
    { id: "list", type: "list", style: "unordered", visualStyle: { backgroundImageMediaId: "list-background" }, items: ["Plain", { text: "source", runs: imageRuns("item"), style: { backgroundImageMediaId: "item-background" }, children: [{ id: "child-list", type: "list", style: "ordered", visualStyle: { backgroundImageMediaId: "child-background" }, items: [{ text: "source", runs: imageRuns("nested-item") }] }] }] },
    { id: "image", type: "image", src: "", alt: "", mediaId: "block-image", caption: "source", captionRuns: imageRuns("image-caption") },
    { id: "embed", type: "embed", url: "https://www.youtube.com/watch?v=abcdefghijk", title: "Video", caption: "source", captionRuns: imageRuns("embed-caption") },
    paragraph("paragraph", "paragraph-image"),
  ] }] }]);
  const before = JSON.stringify(blocks);
  assert.deepEqual(new Set(contentMediaIds(blocks)), new Set(["cell-a", "cell-b", "cell-c", "cell-d", "table-caption", "label", "item", "nested-item", "image-caption", "embed-caption", "paragraph-image", "group-background", "columns-background", "column-background", "list-background", "item-background", "child-background", "block-image"]));
  assert.equal(JSON.stringify(blocks), before);
  assert.equal(blocks[0].children[0].children[2].items[0], "Plain");
});

test("plain records stay untouched; external sources own no local file and duplicates remain visible", () => {
  const blocks = freeze([{ id: "plain", type: "paragraph", text: "Plain" }, { id: "list", type: "list", style: "unordered", items: ["Plain"] }, { id: "external", type: "heading", level: 2, text: "source", runs: [{ text: "source", marks: [{ type: "inline-image", src: "/external.svg", alt: "External" }] }] }, paragraph("duplicate-a", "same"), paragraph("duplicate-b", "same")]);
  const before = JSON.stringify(blocks);
  assert.deepEqual(contentMediaIds(blocks), ["same", "same"]);
  assert.equal(JSON.stringify(blocks), before);
});

test("accepted extra root properties cannot shadow item-owned List descendants", () => {
  const nested = { id: "nested", type: "list", style: "unordered", items: ["Child"], visualStyle: { backgroundImageMediaId: "nested-background" } };
  const list = freeze({ id: "root", type: "list", style: "unordered", items: [{ text: "Parent", children: [nested] }], children: [] });
  assert.equal(validContentBlocks([list]), true);
  assert.deepEqual(childContentBlocks(list), [nested]);
  assert.equal(findContentBlock([list], "nested"), nested);
  assert.deepEqual(contentMediaIds([list]), ["nested-background"]);
  assert.deepEqual(list.children, []);
});

test("reader-valid unknown children metadata never acquires content ownership", () => {
  for (const children of [{}, "retained metadata", [{ id: "unowned-image", type: "image", src: "", alt: "", mediaId: "unowned-file" }]]) {
    const paragraph = freeze({ id: "plain", type: "paragraph", text: "Text", children });
    assert.equal(validContentBlocks([paragraph]), true);
    assert.deepEqual(childContentBlocks(paragraph), []);
    assert.equal(findContentBlock([paragraph], "unowned-image"), null);
    assert.deepEqual(contentMediaIds([paragraph]), []);
    assert.equal(paragraph.children, children);
  }
});

test("actual publication and template consumers include Table and dormant Quote image IDs", () => {
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [table, quote] };
  const article = toLocallyPublishedArticle(document);
  const expected = contentMediaIds(document.blocks);
  assert.deepEqual(article.mediaIds, [...new Set(expected)]);
  const set = createTemplateSet();
  set.templates.find(template => template.kind === "post").nodes = [table, quote];
  assert.deepEqual(new Set(templateMediaIds(set)), new Set(expected));
});

test("legacy and unchanged current publication indexes recover newly discovered references immutably", () => {
  for (const [version, templateVersion] of [[16, "0.24.0"], [17, "0.25.0"]]) {
    const set = createTemplateSet();
    set.templates.find(template => template.kind === "post").nodes = [table];
    const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [paragraph("body", "body-image")] };
    const article = toLocallyPublishedArticle(document, { version: templateVersion, set, templateId: set.templates.find(template => template.kind === "post").id });
    // The previous collector indexed the Table caption but missed its cells.
    const original = freeze({ version, posts: [{ ...article, mediaIds: ["body-image", "table-caption"] }] });
    const before = JSON.stringify(original);
    const repaired = validateTemplatePublicationSnapshot(original);
    assert.deepEqual(new Set(repaired.posts[0].mediaIds), new Set(["body-image", "table-caption", "cell-a", "cell-b", "cell-c", "cell-d"]));
    assert.equal(JSON.stringify(original), before);
    assert.deepEqual(validateTemplatePublicationSnapshot(repaired), repaired);
    assert.equal(parseLocallyPublishedArticles(JSON.stringify(original)).length, 1);
  }
});

test("committed v0.14 templates recover omitted inline references but still require their block assets", () => {
  const set = createTemplateSet();
  set.templates.find(template => template.kind === "post").nodes = [paragraph("template-text", "old-inline"), { id: "block-image", type: "image", mediaId: "required-image", src: "", alt: "" }];
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
  const article = toLocallyPublishedArticle(document, { version: "0.14.0", set, templateId: set.templates.find(template => template.kind === "post").id });
  const original = freeze({ version: 16, posts: [{ ...article, mediaIds: ["required-image"] }] });
  const repaired = validateTemplatePublicationSnapshot(original);
  assert.ok(repaired.posts[0].mediaIds.includes("old-inline"));
  assert.throws(() => validateTemplatePublicationSnapshot({ ...original, posts: [{ ...original.posts[0], mediaIds: [] }] }), /media references are incomplete/);
});

test("body-only publications and Bin projections recover references without changing their sources", () => {
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [table, quote] };
  const publication = { ...toLocallyPublishedArticle(document), mediaIds: [] };
  const store = freeze({ version: 16, posts: [publication] });
  const repaired = validateTemplatePublicationSnapshot(store);
  assert.deepEqual(new Set(repaired.posts[0].mediaIds), new Set(contentMediaIds(document.blocks)));
  const workspace = freeze({ ...initialStudioWorkspace, bin: [{ id: "binned", document, publication }] });
  const recovered = validateWorkspacePublicationTemplates(workspace);
  assert.deepEqual(recovered.bin[0].publication.mediaIds, repaired.posts[0].mediaIds);
  assert.equal(workspace.bin[0].publication.mediaIds.length, 0);
});

test("duplicate legacy IDs cannot conceal a newly discovered body-only reference", () => {
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [paragraph("one", "a"), paragraph("two", "b")] };
  const original = freeze({ version: 16, posts: [{ ...toLocallyPublishedArticle(document), mediaIds: ["a", "a"] }] });
  assert.deepEqual(validateTemplatePublicationSnapshot(original).posts[0].mediaIds, ["a", "b"]);
  assert.deepEqual(original.posts[0].mediaIds, ["a", "a"]);
});

test("required caption, Image and identity-logo omissions remain invalid in recent template snapshots", () => {
  for (const node of [table, { id: "block-image", type: "image", mediaId: "required-image", src: "", alt: "" }]) {
    const set = createTemplateSet(); set.templates.find(template => template.kind === "post").nodes = [node];
    set.identity.logo = { src: "", alt: "Logo", mediaId: "required-logo" };
    const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
    const article = toLocallyPublishedArticle(document, { version: "0.24.0", set, templateId: set.templates.find(template => template.kind === "post").id });
    for (const mediaIds of [[], article.mediaIds.filter(id => id !== "required-logo"), article.mediaIds.filter(id => id !== (node.type === "table" ? "table-caption" : "required-image"))]) {
      assert.throws(() => validateTemplatePublicationSnapshot({ version: 16, posts: [{ ...article, mediaIds }] }), /media references are incomplete/);
    }
  }
});

test("older template background indexes recover non-Group styles and column style fields", () => {
  const set = createTemplateSet();
  set.templates.find(template => template.kind === "post").nodes = [{ id: "heading", type: "heading", level: 2, text: "Heading", visualStyle: { backgroundImageMediaId: "heading-background" } }, { id: "columns", type: "columns", style: { backgroundImageMediaId: "columns-background" }, children: [{ id: "column", type: "column", style: { backgroundImageMediaId: "column-background" }, children: [] }] }];
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
  const article = toLocallyPublishedArticle(document, { version: "0.14.0", set, templateId: set.templates.find(template => template.kind === "post").id });
  const repaired = validateTemplatePublicationSnapshot({ version: 16, posts: [{ ...article, mediaIds: [] }] });
  assert.deepEqual(new Set(repaired.posts[0].mediaIds), new Set(["heading-background", "columns-background", "column-background"]));
});

test("actual backup validator requires recovered template and Bin image bytes", async () => {
  const source = await readFile(new URL("../app/studio/backup-store.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("backup-store.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "validateStudioBackup");
  const compiled = ts.transpileModule(declaration.getText(ast).replace(/^export /, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const scope = { isRecord: value => Boolean(value) && typeof value === "object" && !Array.isArray(value), migrateStudioWorkspace, validateWorkspacePublicationTemplates, validateTemplateStore, validatePublicationSnapshot: validateTemplatePublicationSnapshot, templateMediaIds, MAX_BACKUP_BYTES: 1000000 };
  const validate = vm.runInNewContext(`${compiled}\nvalidateStudioBackup`, scope);
  const set = createTemplateSet();
  set.templates.find(template => template.kind === "post").nodes = [{ id: "one-cell", type: "table", rows: [["source"]], cellRuns: [[imageRuns("recoverable-file")]] }];
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
  const publication = { ...toLocallyPublishedArticle(document, { version: "0.24.0", set, templateId: set.templates.find(template => template.kind === "post").id }), mediaIds: [] };
  const workspace = { ...initialStudioWorkspace, activeDocumentId: document.id, documents: [document], bin: [] };
  const backup = { format: "acm-studio-backup", version: 4, exportedAt: "2026-10-04T00:00:00Z", workspace, publications: JSON.stringify({ version: 16, posts: [publication] }), media: { folders: [], assets: [] } };
  assert.throws(() => validate(backup), /published-post snapshot is invalid/);
  const asset = { id: "recoverable-file", name: "Fixture.png", type: "image/png", altText: "", caption: "", createdAt: backup.exportedAt, updatedAt: backup.exportedAt, folderId: null, size: 1, dataBase64: "AA==" };
  const repaired = validate({ ...backup, media: { folders: [], assets: [asset] } });
  assert.deepEqual(JSON.parse(repaired.publications).posts[0].mediaIds, ["recoverable-file"]);
  const binned = { ...backup, publications: null, workspace: { ...workspace, activeDocumentId: "", documents: [], bin: [{ id: "bin", deletedAt: backup.exportedAt, document, publication }] } };
  assert.throws(() => validate(binned), /binned published post is missing/);
  assert.equal(validate({ ...binned, media: { folders: [], assets: [asset] } }).workspace.bin[0].publication.mediaIds[0], "recoverable-file");
});

test("actual media deletion guard rejects files owned by Table cells and recovery fields, including Bin", async () => {
  let workspace = { documents: [{ blocks: [table, quote] }], bin: [] };
  const database = mediaDatabase();
  const window = mediaWindow(database.indexedDB);
  window.localStorage.getItem = () => JSON.stringify(workspace);
  const modules = mediaModules({ window }, {
    "./write-ownership": { studioWriteOwnership: { write: operation => operation() } },
    "./template-store": { assertTemplateMediaCanBeDeleted() {} },
    "./template-model": { validateWorkspacePublicationTemplates },
    "./workspace-validation": { validateStudioWorkspace: value => value, migrateStudioWorkspace: value => value },
  });
  const store = modules("app/studio/media-store.ts");
  const sample = { id: "unreferenced", name: "Unused", folderId: null, type: "image/png", size: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), altText: "", caption: "", blob: new Blob(["x"]) };
  await store.replaceMediaLibrary([sample], []);
  const remove = store.deleteMediaAsset;
  for (const id of ["cell-a", "cell-d", "table-caption", "quote-recovery", "quote-child-image", "citation"]) await assert.rejects(remove(id), /used by a page, post/);
  workspace = { documents: [], bin: [{ document: { blocks: [table, quote] } }] };
  await assert.rejects(remove("cell-b"), /saved revision or item in the Bin/);
  assert.equal(database.rows("assets").length, 1);
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [table] };
  workspace = { documents: [], bin: [{ document: { blocks: [] }, publication: { ...toLocallyPublishedArticle(document), mediaIds: [] } }] };
  await assert.rejects(remove("cell-b"), /published copy in the Bin/);
  assert.equal(database.rows("assets").length, 1);
  await remove("unreferenced");
  assert.equal(database.rows("assets").length, 0);
});

test("actual live-publication deletion guard uses recovered references after drafts remove them", async () => {
  const source = await readFile(new URL("../app/studio/template-store.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("template-store.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "assertTemplateMediaCanBeDeleted");
  const compiled = ts.transpileModule(declaration.getText(ast).replace(/^export /, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const set = createTemplateSet(); set.templates.find(template => template.kind === "post").nodes = [table];
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post"), coverImage: null, blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
  let snapshot = { version: 16, posts: [{ ...toLocallyPublishedArticle(document, { version: "0.24.0", set, templateId: set.templates.find(template => template.kind === "post").id }), mediaIds: ["table-caption"] }] };
  const context = { loadTemplates: () => ({ sets: [], bin: [] }), templateMediaIds, validateTemplatePublicationSnapshot, window: { localStorage: { getItem: () => JSON.stringify(snapshot) } }, LOCAL_PUBLICATIONS_KEY: "publications" };
  const assertUnused = vm.runInNewContext(`${compiled}\nassertTemplateMediaCanBeDeleted`, context);
  assert.throws(() => assertUnused("cell-a"), /published template snapshot/);
  assertUnused("unreferenced");
  snapshot = { version: 16, posts: [{ ...toLocallyPublishedArticle({ ...document, blocks: [table] }), mediaIds: [] }] };
  assert.throws(() => assertUnused("cell-d"), /published copy/);
});


test("publication rejects a template for another document kind", () => {
  const set = createTemplateSet();
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === "post") };
  const post = set.templates.find(template => template.kind === "post");
  const publication = toLocallyPublishedArticle(document, { version: "0.24.0", set, templateId: post.id });
  assert.doesNotThrow(() => validateTemplatePublicationSnapshot({ version: PUBLICATION_VERSION, posts: [publication] }));
  const page = set.templates.find(template => template.kind === "page");
  assert.throws(() => validateTemplatePublicationSnapshot({ version: PUBLICATION_VERSION, posts: [{ ...publication, templateSnapshot: { ...publication.templateSnapshot, templateId: page.id } }] }), /does not match its document kind/);
});
