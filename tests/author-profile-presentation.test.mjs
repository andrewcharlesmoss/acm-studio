import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileProductionModule, loadProductionModule } from "./production-module.mjs";
import { withHtmlDom } from "./html-dom-fixture.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const validation = await load("../app/studio/workspace-validation.ts");
const editor = await load("../app/studio/editor-model.ts");
const publication = await load("../app/content/local-publishing.ts");
const templates = await load("../app/studio/template-model.ts");
const templatePackages = await load("../app/studio/template-package.ts");
const globalTemplateContract = await load("../app/studio/global-template-contract.ts");
const imageDuotone = await load("../app/content/image-duotone.ts");
const fixtureContract = await load("../app/studio/test-site/contract.ts");
const mediaReferences = await load("../app/content/media-references.ts");
const clipboard = await load("../app/studio/block-clipboard.ts");
const html = await load("../app/studio/studio-html-editor.ts");
const backup = await load("../app/studio/backup-store.ts");
const { BlockRenderer } = await import(await compileProductionModule(new URL("../app/components/content.tsx", import.meta.url)));

const profileImage = { src: "/media/acm-6dd0a46e-46b6-4e5a-a180-c3e054365b3a-" + "a".repeat(64) + ".png", alt: "Portrait of Ada Lovelace" };
const author = { id: "author", type: "author-name", prefix: "Written by", avatarSize: 128, profileImage, biography: "Mathematician and writer.", profileUrl: "https://example.com/ada", openInNewTab: true };
const duotone = { dark: "#17202a", light: "#f7dc6f" };

test("Author profile fields validate, reject unsafe links and require managed image sources", () => {
  assert.equal(validation.validContentBlocks([{ id: "legacy", type: "post-author" }]), false);
  assert.equal(validation.validContentBlocks([author]), true);
  assert.equal(validation.validContentBlocks([{ ...author, avatarSize: 513 }]), false);
  assert.equal(validation.validContentBlocks([{ ...author, profileUrl: "javascript:alert(1)" }]), false);
  assert.equal(validation.validContentBlocks([{ ...author, profileImage: { src: "https://remote.example/avatar.png", alt: "Portrait" } }]), false);
  assert.equal(validation.validContentBlocks([{ ...author, profileImage: { src: "", mediaId: "media-1", alt: "Portrait" } }]), true);
});

test("Author profile data renders in local publication output and preserves the legacy fallback", () => {
  const markup = renderToStaticMarkup(createElement(BlockRenderer, {
    blocks: [author], variant: "article", document: { author: "Ada Lovelace", kind: "post", slug: "ada" },
  }));
  assert.match(markup, /Ada Lovelace/);
  assert.match(markup, /Portrait of Ada Lovelace/);
  assert.match(markup, /width="128" height="128"/);
  assert.match(markup, /href="https:\/\/example\.com\/ada" target="_blank" rel="noopener noreferrer"/);
  assert.match(markup, /Mathematician and writer\./);

  const post = structuredClone(editor.initialStudioWorkspace.documents.find(item => item.kind === "post"));
  post.author = "Ada Lovelace";
  post.blocks = [author];
  const captured = publication.toLocallyPublishedArticle(post);
  assert.equal(captured.blocks[0].biography, author.biography);
  assert.equal(captured.blocks[0].profileImage.src, profileImage.src);
  assert.equal(validation.PUBLICATION_VERSION, 50);
  assert.throws(() => validation.validatePublicationSnapshot({ version: 38, posts: [captured] }), /Author profile presentation/);
  assert.equal(validation.validatePublicationSnapshot({ version: 39, posts: [captured] }).posts[0].blocks[0].profileUrl, author.profileUrl);
});

test("Author Duotone affects only the managed avatar and preserves explicit None", () => {
  const block = { ...author, duotone };
  assert.equal(validation.validContentBlocks([block]), true);
  const markup = renderToStaticMarkup(createElement(BlockRenderer, {
    blocks: [block], variant: "article", document: { author: "Ada Lovelace", kind: "post", slug: "ada" },
  }));
  assert.match(markup, /id="author-duotone-author"/);
  assert.match(markup, /class="article-author-avatar"[^>]+filter:url\(&quot;#author-duotone-author&quot;\)/);
  assert.match(markup, /class="article-author-biography"[^>]*>Mathematician/);
  assert.equal(validation.validContentBlocks([{ ...block, duotone: null }]), true);
  assert.equal(validation.validContentBlocks([{ ...block, duotone: { dark: "red", light: "#ffffff" } }]), false);
});

test("Author profile fields survive workspace, template, clipboard, backup and HTML versioned boundaries", () => {
  const workspace = structuredClone(editor.initialStudioWorkspace);
  const post = workspace.documents.find(item => item.kind === "post");
  post.blocks = [author];
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 47 }), /invalid|unsupported/i);
  assert.equal(validation.validateStudioWorkspace(workspace).documents.find(item => item.id === post.id).blocks[0].biography, author.biography);

  const set = templates.createTemplateSet("Author profile");
  set.parts[0].nodes = [author];
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: "0.58.0", sets: [set] }), /Author profile presentation/);
  assert.equal(templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: templates.TEMPLATE_VERSION, sets: [set] }).sets[0].parts[0].nodes[0].profileImage.src, profileImage.src);

  const copied = clipboard.blockClipboardHtml([author]);
  assert.match(copied, /&quot;version&quot;:36/);
  withHtmlDom(() => {
    assert.deepEqual(clipboard.readBlockClipboardPayload(copied).blocks[0], author);
    const source = html.blockToHtml(author);
    const parsed = html.parseHtmlToBlock(source, author);
    assert.equal("error" in parsed, false);
    assert.deepEqual(parsed.block.profileImage, profileImage);
    assert.equal(parsed.block.biography, author.biography);
    assert.equal(parsed.block.openInNewTab, true);
  });

  const backupInput = { format: "acm-studio-backup", version: 25, exportedAt: "2026-10-29T00:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => backup.validateStudioBackup({ ...backupInput, version: 24 }), /Author profile presentation/);
  assert.equal(backup.validateStudioBackup(backupInput).version, 25);
});

test("Author Duotone is round-tripped only by carriers with the new format gates", () => {
  const block = { ...author, duotone };
  const workspace = structuredClone(editor.initialStudioWorkspace);
  workspace.documents.find(item => item.kind === "post").blocks = [block];
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 48 }), /invalid|unsupported/i);
  assert.deepEqual(validation.validateStudioWorkspace(workspace).documents.find(item => item.kind === "post").blocks[0].duotone, duotone);

  const post = structuredClone(editor.initialStudioWorkspace.documents.find(item => item.kind === "post"));
  post.blocks = [block];
  const captured = publication.toLocallyPublishedArticle(post);
  assert.throws(() => validation.validatePublicationSnapshot({ version: 39, posts: [captured] }), /Author Duotone/);
  assert.deepEqual(validation.validatePublicationSnapshot({ version: 40, posts: [captured] }).posts[0].blocks[0].duotone, duotone);

  const set = templates.createTemplateSet("Author Duotone");
  set.parts[0].nodes = [block];
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: "0.59.0", sets: [set] }), /Author Duotone/);
  assert.deepEqual(templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: templates.TEMPLATE_VERSION, sets: [set] }).sets[0].parts[0].nodes[0].duotone, duotone);
  const snapshot = { version: templates.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  assert.throws(() => templates.validateTemplateSnapshot({ ...snapshot, version: "0.59.0" }), /Author Duotone/);
  assert.deepEqual(templates.validateTemplateSnapshot(snapshot).set.parts[0].nodes[0].duotone, duotone);
  assert.throws(() => templatePackages.validateTemplatePackage({ format: "acm-studio-template-set", version: "0.59.0", set, media: [] }), /Author Duotone/);
  assert.deepEqual(templatePackages.validateTemplatePackage({ format: "acm-studio-template-set", version: templates.TEMPLATE_VERSION, set, media: [] }).set.parts[0].nodes[0].duotone, duotone);

  const copied = clipboard.blockClipboardHtml([block]);
  withHtmlDom(() => {
    assert.equal(clipboard.readBlockClipboardPayload(copied.replaceAll("&quot;version&quot;:36", "&quot;version&quot;:25")), null);
    assert.equal(clipboard.readBlockClipboardPayload(copied).blocks[0].duotone.dark, duotone.dark);
    const parsed = html.parseHtmlToBlock(html.blockToHtml(block), block);
    assert.equal("error" in parsed, false);
    assert.deepEqual(parsed.block.duotone, duotone);
  });

  const backupInput = { format: "acm-studio-backup", version: 26, exportedAt: "2026-10-29T00:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => backup.validateStudioBackup({ ...backupInput, version: 25 }), /Author Duotone/);
  assert.equal(backup.validateStudioBackup(backupInput).version, 26);

  const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "published", updatedAt: "2026-10-29T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
  const legacySet = templates.createTemplateSet("Local");
  const navigationSet = { ...templates.createTemplateSet("Navigation"), id: "navigation", templates: [], parts: [{ id: "navigation-part", kind: "header", name: "Navigation", nodes: [{ id: "navigation-node", type: "element", element: "navigation" }] }] };
  const site = { templates: { ...templates.emptyTemplateStore(), sets: [legacySet, navigationSet] }, siteNavigation: { setId: "navigation", partId: "navigation-part" } };
  const library = globalTemplateContract.createGlobalTemplateLibrary({ test: site, test2: site });
  library.migrations.test.bases.find(item => item.id === legacySet.id).parts[0].nodes = [block];
  assert.throws(() => globalTemplateContract.validateGlobalTemplateLibrary({ ...library, version: 29 }), /Author Duotone/);
  assert.equal(globalTemplateContract.validateGlobalTemplateLibrary(library).version, 41);

  const fixtureBase = { format: "acm-test-site", version: 9, siteId: "test", documents: [page], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: { ...templates.emptyTemplateStore(), sets: [legacySet, navigationSet] }, siteNavigation: { setId: "navigation", partId: "navigation-part" }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
  const fixture = fixtureContract.testSiteCollection(fixtureBase);
  fixture.documents[0].blocks = [block];
  assert.equal(fixture.version, 49);
  assert.equal(fixtureContract.validTestSiteDocument(fixture), true);
  assert.equal(fixtureContract.testSiteWorkspace(fixture).version, 59);
  assert.equal(fixtureContract.validTestSiteDocument({ ...fixture, version: 37 }), false);
});

test("global-template Author Duotone overrides are detected from the matching base node ID", () => {
  const base = templates.createTemplateSet("Author override");
  const part = base.parts[0];
  part.nodes = [{ id: "author-node", type: "author-name" }];
  const overrideOnly = {
    migrations: {
      test: {
        bases: [base],
        bindings: [{
          setId: base.id,
          overrides: [{ path: ["parts", `@${part.id}`, "nodes", "@author-node", "duotone"], value: duotone }],
        }],
      },
    },
  };

  assert.equal(imageDuotone.containsAuthoredAuthorDuotone(overrideOnly), true);
  assert.equal(imageDuotone.containsAuthoredAuthorDuotone({
    migrations: {
      test: {
        bases: [{ ...base, parts: [{ ...part, nodes: [{ id: "image-node", type: "image" }] }] }],
        bindings: [{
          setId: base.id,
          overrides: [{ path: ["parts", `@${part.id}`, "nodes", "@image-node", "duotone"], value: duotone }],
        }],
      },
    },
  }), false);

  const navigationSet = { ...templates.createTemplateSet("Navigation"), id: "navigation", templates: [], parts: [{ id: "navigation-part", kind: "header", name: "Navigation", nodes: [{ id: "navigation-node", type: "element", element: "navigation" }] }] };
  const site = { templates: { ...templates.emptyTemplateStore(), sets: [base, navigationSet] }, siteNavigation: { setId: "navigation", partId: "navigation-part" } };
  const library = globalTemplateContract.createGlobalTemplateLibrary({ test: site, test2: site });
  library.migrations.test.bases.find(item => item.id === base.id).parts[0].nodes = [{ id: "author-node", type: "author-name" }];
  library.migrations.test.bindings.find(item => item.setId === base.id).overrides = overrideOnly.migrations.test.bindings[0].overrides;
  assert.throws(() => globalTemplateContract.validateGlobalTemplateLibrary({ ...library, version: 29 }), /Author Duotone/);
});

test("managed profile image references travel through template, publication, global and fixture owners", () => {
  const managed = { ...author, profileImage: { src: "", mediaId: "avatar-media", alt: "Portrait of Ada Lovelace" } };
  assert.deepEqual(mediaReferences.contentMediaIds([managed]), ["avatar-media"]);

  const post = structuredClone(editor.initialStudioWorkspace.documents.find(item => item.kind === "post"));
  post.blocks = [managed];
  assert.ok(publication.toLocallyPublishedArticle(post).mediaIds.includes("avatar-media"));

  const set = templates.createTemplateSet("Author image");
  set.parts[0].nodes = [managed];
  assert.deepEqual(templates.templateMediaIds(set), ["avatar-media"]);

  const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "published", updatedAt: "2026-10-29T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
  const legacySet = templates.createTemplateSet("Local");
  const navigationSet = { ...templates.createTemplateSet("Navigation"), id: "navigation", templates: [], parts: [{ id: "navigation-part", kind: "header", name: "Navigation", nodes: [{ id: "navigation-node", type: "element", element: "navigation" }] }] };
  const source = { format: "acm-test-site", version: 9, siteId: "test", documents: [page], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: { ...templates.emptyTemplateStore(), sets: [legacySet, navigationSet] }, siteNavigation: { setId: "navigation", partId: "navigation-part" }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
  const fixture = fixtureContract.testSiteCollection(source);
  fixture.documents[0].blocks = [author];
  assert.equal(fixture.version, 49);
  assert.equal(fixtureContract.validTestSiteDocument(fixture), true);
  assert.equal(fixtureContract.validTestSiteDocument({ ...fixture, version: 37 }), true);

  const site = { templates: { ...templates.emptyTemplateStore(), sets: [legacySet, navigationSet] }, siteNavigation: { setId: "navigation", partId: "navigation-part" } };
  const library = globalTemplateContract.createGlobalTemplateLibrary({ test: site, test2: site });
  library.migrations.test.bases.find(item => item.id === legacySet.id).parts[0].nodes = [managed];
  assert.throws(() => globalTemplateContract.validateGlobalTemplateLibrary({ ...library, version: 28 }), /Author profile presentation/);
  assert.equal(globalTemplateContract.validateGlobalTemplateLibrary(library).version, 41);
});

test("legacy Author clipboard payloads migrate while preserving version gates", () => {
  const legacy = { ...author, type: "post-author" };
  const copied = clipboard.blockClipboardHtml([legacy]);
  withHtmlDom(() => {
    assert.deepEqual(clipboard.readBlockClipboardPayload(copied).blocks[0], author);
    assert.equal(clipboard.readBlockClipboardPayload(copied.replaceAll("&quot;version&quot;:36", "&quot;version&quot;:24")), null);
    assert.deepEqual(clipboard.readBlockClipboardPayload(copied.replaceAll("&quot;version&quot;:36", "&quot;version&quot;:25")).blocks[0], author);
  });
});

test("legacy Author profile data cannot bypass backup version gates", () => {
  const workspace = structuredClone(editor.initialStudioWorkspace);
  workspace.documents.find(item => item.kind === "post").blocks = [{ ...author, type: "post-author" }];
  const input = { format: "acm-studio-backup", version: 24, exportedAt: "2026-10-29T12:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => backup.validateStudioBackup(input), /Author profile/);
  assert.equal(backup.validateStudioBackup({ ...input, version: 25 }).version, 25);
});

test("legacy Author profile data cannot bypass global template version gates", () => {
  const set = templates.createTemplateSet("Legacy author");
  const navigation = { ...templates.createTemplateSet("Navigation"), id: "navigation", templates: [], parts: [{ id: "nav", kind: "header", name: "Navigation", nodes: [{ id: "menu", type: "element", element: "navigation" }] }] };
  const site = { templates: { ...templates.emptyTemplateStore(), sets: [set, navigation] }, siteNavigation: { setId: "navigation", partId: "nav" } };
  const library = globalTemplateContract.createGlobalTemplateLibrary({ test: site, test2: site });
  library.migrations.test.bases.find(item => item.id === set.id).parts[0].nodes = [{ ...author, type: "post-author" }];
  assert.throws(() => globalTemplateContract.validateGlobalTemplateLibrary({ ...library, version: 28 }), /Author profile/);
  assert.equal(globalTemplateContract.validateGlobalTemplateLibrary({ ...library, version: 29 }).version, 41);
});
