import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
const { insertDesignMedia, loadAndInsertDesignMedia } = await loadProductionModule(new URL("../app/studio/design-media-handoff-command.ts", import.meta.url));
const image = { id: "asset", type: "image/png", name: "Example.png", altText: "Original", caption: "Caption" };
function fixture() {
  let workspace = { activeDocumentId: "one", documents: [{ id: "one", blocks: [] }, { id: "two", blocks: [] }] };
  return { get: () => workspace, commit(update) { workspace = update(workspace); return true; } };
}
test("loaded design image targets one document in one workspace commit", () => {
  const f = fixture(); assert.equal(insertDesignMedia({ workspace: f.get(), writable: true, commit: f.commit }, "one", image, "block", " Edited "), true);
  assert.equal(f.get().documents[0].blocks.length, 1); assert.equal(f.get().documents[0].blocks[0].alt, "Edited");
  assert.deepEqual(f.get().documents[1].blocks, []);
});
test("design cover retains authored blocks and metadata", () => {
  const f = fixture(); assert.equal(insertDesignMedia({ workspace: f.get(), writable: true, commit: f.commit }, "one", image, "cover", ""), true);
  assert.equal(f.get().documents[0].coverImage.alt, "Original"); assert.deepEqual(f.get().documents[0].blocks, []);
});
test("design insertion refuses missing, inactive, non-image and read-only targets", () => {
  const f = fixture(); const options = { workspace: f.get(), writable: true, commit: () => assert.fail("No commit") };
  for (const id of ["missing", "two"]) assert.equal(insertDesignMedia(options, id, image, "block", ""), false);
  assert.equal(insertDesignMedia({ ...options, writable: false }, "one", image, "block", ""), false);
  assert.equal(insertDesignMedia(options, "one", { ...image, type: "text/plain" }, "block", ""), false);
});
for (const scenario of ["cancel", "document switch", "ownership loss", "newer request"]) {
  test(`asset load rechecks ${scenario} before mutation`, async () => {
    let current = true, resolve; const pending = new Promise(done => { resolve = done; });
    const operation = loadAndInsertDesignMedia({ documentId: "one", mediaId: "asset", target: "block", altText: "", loadAsset: () => pending,
      isCurrent: () => current, insert: () => assert.fail("Stale mutation") });
    current = false; resolve(image); assert.equal(await operation, "cancelled");
  });
}
test("valid load invokes current insertion and rejected commits report unavailable", async () => {
  let calls = 0;
  const options = { documentId: "one", mediaId: "asset", target: "cover", altText: "Edited", loadAsset: async () => image, isCurrent: () => true,
    insert(id, asset, target, alt) { calls++; assert.equal(id, "one"); assert.equal(asset, image); assert.equal(target, "cover"); assert.equal(alt, "Edited"); return false; } };
  assert.equal(await loadAndInsertDesignMedia(options), "unavailable"); assert.equal(calls, 1);
  assert.equal(await loadAndInsertDesignMedia({ ...options, insert: () => true }), "accepted");
});
