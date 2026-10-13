import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm, unlink, symlink, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
import { checkedSiteImages } from "../scripts/test-site-featured-images.mjs";
import { siteImageName, siteImageNames, SITE_IMAGE_MAX_BYTES } from "../app/content/site-featured-image.mjs";
import { loadProductionModule } from "./production-module.mjs";

const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=", "base64");
const id = "b7f9d7c0-86a0-466d-9672-12e56898e441";
const digest = createHash("sha256").update(bytes).digest("hex");
const name = siteImageName(id, digest, "image/png");
const image = { src: `/media/${name}`, alt: "A selected featured image" };
const attachment = { name, dataBase64: bytes.toString("base64") };
async function fixture(siteId, extra = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-featured-image-")));
  const document = { siteId, text: "Original", coverImage: null };
  const render = (value, revision) => `<meta name="acm-test-revision" content="${revision}"><img src="${value.coverImage?.src ?? ""}">`;
  await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
  await writeFile(path.join(root, "content/site.json"), JSON.stringify(document));
  await writeFile(path.join(root, "dist/index.html"), render(document, revisionOf(document)));
  const options = { root, siteId, render, validate: value => typeof value.text === "string", ...extra };
  const raw = createTestSiteStore(options);
  const store = { ...raw, handle: (token, input) => raw.handle(token, { siteId, ...input }) };
  const session = await store.connect(); await store.handle(session.token, { action: "claim" });
  return { root, document, store, session, options, async close() { await store.close(); await rm(root, { recursive: true, force: true }); } };
}

for (const siteId of ["test", "test2"]) {
  test(`${siteId} imports an immutable featured image through the owned save and repairs missing preview copies`, async () => {
    const f = await fixture(siteId);
    try {
      const document = { ...f.document, coverImage: image };
      const saved = await f.store.handle(f.session.token, { action: "save", baseRevision: f.session.revision, document, featuredImages: [attachment] });
      assert.equal(saved.document.coverImage.src, image.src);
      assert.deepEqual(await readFile(path.join(f.root, "content/media", name)), bytes);
      assert.deepEqual(await readFile(path.join(f.root, "dist/media", name)), bytes);
      assert.match(await readFile(path.join(f.root, "dist/index.html"), "utf8"), new RegExp(image.src));
      await unlink(path.join(f.root, "dist/media", name));
      await f.store.handle(f.session.token, { action: "save", baseRevision: saved.revision, document });
      assert.deepEqual(await readFile(path.join(f.root, "dist/media", name)), bytes);
      const removed = { ...document, coverImage: null, publications: [{ coverImage: image }] };
      await f.store.handle(f.session.token, { action: "save", baseRevision: saved.revision, document: removed });
      assert.deepEqual(await readFile(path.join(f.root, "content/media", name)), bytes);
    } finally { await f.close(); }
  });
}

test("unowned or stale imports do not write files or change the source", async () => {
  const f = await fixture("test");
  try {
    const peer = await f.store.connect();
    const input = { action: "save", baseRevision: f.session.revision, document: { ...f.document, coverImage: image }, featuredImages: [attachment] };
    await assert.rejects(f.store.handle(peer.token, input), /owns Test editing/);
    await assert.rejects(f.store.handle(f.session.token, { ...input, baseRevision: "stale" }), /newer changes/);
    assert.deepEqual(JSON.parse(await readFile(path.join(f.root, "content/site.json"), "utf8")), f.document);
    await assert.rejects(readFile(path.join(f.root, "content/media", name)), { code: "ENOENT" });
  } finally { await f.close(); }
});

test("image transfers reject arbitrary names, unrelated bytes, SVG and excessive payloads", () => {
  const document = { coverImage: image };
  for (const input of [
    [{ ...attachment, name: "../../private.png" }],
    [{ ...attachment, name: name.replace(".png", ".svg") }],
    [{ ...attachment, dataBase64: Buffer.from("<svg/>").toString("base64") }],
    [{ ...attachment, dataBase64: Buffer.alloc(SITE_IMAGE_MAX_BYTES + 1).toString("base64") }],
    [attachment, attachment],
    [{ ...attachment, extra: true }],
  ]) assert.throws(() => checkedSiteImages(document, input));
  assert.throws(() => checkedSiteImages({}, [attachment]), /invalid/);
  assert.deepEqual(siteImageNames({ documents: [document], publications: [document], bin: [document] }), [name]);
});

test("image destinations cannot be symlinks or overwrite changed saved bytes", async () => {
  const f = await fixture("test");
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), "studio-featured-outside-"));
  try {
    await mkdir(path.join(f.root, "content/media"));
    await symlink(elsewhere, path.join(f.root, "dist/media"));
    const input = { action: "save", baseRevision: f.session.revision, document: { ...f.document, coverImage: image }, featuredImages: [attachment] };
    await assert.rejects(f.store.handle(f.session.token, input), /unsafe file path/);
    await assert.rejects(readFile(path.join(elsewhere, name)), { code: "ENOENT" });
    await unlink(path.join(f.root, "dist/media"));
    await writeFile(path.join(f.root, "content/media", name), "changed bytes");
    await assert.rejects(f.store.handle(f.session.token, input), /missing or changed/);
    assert.equal(await readFile(path.join(f.root, "content/media", name), "utf8"), "changed bytes");
    assert.deepEqual(JSON.parse(await readFile(path.join(f.root, "content/site.json"), "utf8")), f.document);
  } finally { await f.close(); await rm(elsewhere, { recursive: true, force: true }); }
});

test("portable selection and backup retain exact raster bytes and reject incomplete bundles", async () => {
  const { portableFeaturedImage, collectSiteImages, stageSiteImages, siteImagePreviewUrls } = await loadProductionModule(new URL("../app/studio/test-site/featured-images.ts", import.meta.url));
  const asset = { id, type: "image/png", blob: new Blob([bytes]), altText: "" };
  assert.deepEqual(await portableFeaturedImage(asset, image.alt), image);
  assert.equal(siteImagePreviewUrls({ coverImage: image }, "test2")[image.src], `/__studio/site-media/test2/${name}`);
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async () => new Response(bytes, { headers: { "Content-Length": String(bytes.length) } });
  try {
    assert.deepEqual(await collectSiteImages({ coverImage: image }, "test"), []);
    assert.deepEqual(await collectSiteImages({ coverImage: image }, "test", true), [attachment]);
    await assert.rejects(stageSiteImages([], { coverImage: image }), /every referenced/);
    await assert.rejects(stageSiteImages([{ ...attachment, dataBase64: "not image" }], { coverImage: image }), /invalid/);
    await assert.rejects(portableFeaturedImage({ ...asset, type: "image/svg+xml" }, ""), /PNG/);
  } finally { globalThis.fetch = fetchBefore; }
});


test("interrupted image writes never publish partial immutable files and the next save recovers", async () => {
  let interrupt = true;
  const f = await fixture("test", { writeImageFile: async (file, data, options) => {
    if (interrupt) { interrupt = false; await writeFile(file, data.subarray(0, 8), options); throw new Error("Interrupted copy"); }
    return writeFile(file, data, options);
  } });
  try {
    const input = { action: "save", baseRevision: f.session.revision, document: { ...f.document, coverImage: image }, featuredImages: [attachment] };
    await assert.rejects(f.store.handle(f.session.token, input), /Interrupted copy/);
    await assert.rejects(readFile(path.join(f.root, "content/media", name)), { code: "ENOENT" });
    assert.deepEqual(JSON.parse(await readFile(path.join(f.root, "content/site.json"), "utf8")), f.document);
    await f.store.handle(f.session.token, input);
    assert.deepEqual(await readFile(path.join(f.root, "content/media", name)), bytes);
    assert.deepEqual(await readFile(path.join(f.root, "dist/media", name)), bytes);
  } finally { await f.close(); }
});
