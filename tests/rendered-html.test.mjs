import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the ACM Studio control centre at the root route", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>ACM Studio — Andrew Charles Moss<\/title>/i);
  assert.match(html, /Everything underneath one roof/);
  assert.match(html, /Your sites/);
  assert.match(html, /Andrew Moss/);
  assert.match(html, /Content Studio/);
  assert.match(html, /Integration boundary to define/);
  assert.doesNotMatch(html, /Projects with a purpose/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders representative project and article detail routes with their own metadata", async () => {
  const [projectResponse, articleResponse] = await Promise.all([
    render("/projects/lid-angle"),
    render("/writing/find-exact-angle-macbook-lid"),
  ]);
  assert.equal(projectResponse.status, 200);
  assert.equal(articleResponse.status, 200);
  const [projectHtml, articleHtml] = await Promise.all([projectResponse.text(), articleResponse.text()]);
  assert.match(projectHtml, /<title>Lid Angle — Andrew Charles Moss<\/title>/i);
  assert.match(projectHtml, /Live angle measurement/);
  assert.match(articleHtml, /<title>Find out the exact angle of your MacBook lid — Andrew Charles Moss<\/title>/i);
  assert.match(articleHtml, /From observation to utility/);
  assert.doesNotMatch(articleHtml, /og\.png/);
});

test("keeps an unknown writing URL available for a browser-local publication", async () => {
  const response = await render("/writing/local-browser-post");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Loading locally published post/);
  assert.match(html, /Browser-local publication/);
});

test("renders the clearly labelled page and post block editor", async () => {
  const response = await render("/studio");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Studio block editor — Andrew Charles Moss<\/title>/i);
  assert.match(html, /Local-only Studio/);
  assert.match(html, /nothing is connected to hosted storage or published online/i);
  assert.match(html, /New post/);
  assert.match(html, /New page/);
  assert.match(html, /Files/);
  assert.match(html, /Images and documents/);
  assert.match(html, /Backup/);
  assert.match(html, /Export and restore/);
  assert.match(html, /Add block/);
  assert.match(html, /Document/);
  assert.match(html, /Preview/);
});

test("keeps hosted database, login and starter-preview surfaces out of the foundation", async () => {
  const [hosting, packageJson, model, editorModel, studio, blockCommands, documentCommands, studioMedia, workspaceRepository, mediaStore, mediaManager, backupStore, backupManager, localPublishing, publishingHook, archive, localArticle] = await Promise.all([
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/content/model.ts", root), "utf8"),
    readFile(new URL("app/studio/editor-model.ts", root), "utf8"),
    readFile(new URL("app/studio/studio-prototype.tsx", root), "utf8"),
    readFile(new URL("app/studio/use-studio-block-commands.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-document-commands.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-media.ts", root), "utf8"),
    readFile(new URL("app/studio/workspace-repository.ts", root), "utf8"),
    readFile(new URL("app/studio/media-store.ts", root), "utf8"),
    readFile(new URL("app/studio/media-manager.tsx", root), "utf8"),
    readFile(new URL("app/studio/backup-store.ts", root), "utf8"),
    readFile(new URL("app/studio/backup-manager.tsx", root), "utf8"),
    readFile(new URL("app/content/local-publishing.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-publishing.ts", root), "utf8"),
    readFile(new URL("app/writing/writing-archive-list.tsx", root), "utf8"),
    readFile(new URL("app/writing/[slug]/local-article-page.tsx", root), "utf8"),
  ]);

  const hostingConfig = JSON.parse(hosting);
  assert.equal(hostingConfig.d1, null);
  assert.equal(hostingConfig.r2, null);
  assert.equal(typeof hostingConfig.project_id, "string");
  assert.doesNotMatch(packageJson, /drizzle|react-loading-skeleton|db:generate/);
  assert.match(model, /type Project/);
  assert.match(model, /type Article/);
  assert.match(model, /type ContentBlock/);
  assert.match(editorModel, /StudioDocumentKind = "post" \| "page"/);
  assert.match(editorModel, /blockCatalogue/);
  assert.match(editorModel, /type: "button"/);
  assert.match(editorModel, /type: "divider"/);
  assert.match(workspaceRepository, /window\.localStorage/);
  assert.match(studio, /application\/json/);
  assert.match(blockCommands, /function moveBlock/);
  assert.match(documentCommands, /function duplicateDocument/);
  assert.match(studio, /function insertBlock/);
  assert.match(studioMedia, /mediaId/);
  assert.match(mediaStore, /indexedDB\.open/);
  assert.match(mediaStore, /addMediaFiles/);
  assert.match(mediaStore, /createMediaFolder/);
  assert.match(mediaStore, /deleteMediaAsset/);
  assert.match(mediaStore, /replaceMediaLibrary/);
  assert.match(mediaManager, /Search files and folders/);
  assert.match(mediaManager, /Insert into/);
  assert.match(backupStore, /acm-studio-backup/);
  assert.match(backupStore, /validateStudioBackup/);
  assert.match(backupStore, /dataBase64/);
  assert.match(backupStore, /previousLibrary/);
  assert.match(backupManager, /Download complete backup/);
  assert.match(backupManager, /Restore checked backup/);
  assert.match(backupManager, /I understand that this will replace/);
  assert.match(publishingHook, /function publish/);
  assert.match(publishingHook, /function unpublish/);
  assert.match(localPublishing, /acm-studio-workspace-v2/);
  assert.match(localPublishing, /acm-studio-publications-v1/);
  assert.match(localPublishing, /validatePostForPublication/);
  assert.match(localPublishing, /publishDocumentLocally/);
  assert.match(archive, /parseLocallyPublishedArticles/);
  assert.match(localArticle, /BlockRenderer/);

  await Promise.all([
    assert.rejects(access(new URL("app/chatgpt-auth.ts", root))),
    assert.rejects(access(new URL("app/_sites-preview", root))),
    assert.rejects(access(new URL("db", root))),
    assert.rejects(access(new URL("drizzle.config.ts", root))),
  ]);
});
