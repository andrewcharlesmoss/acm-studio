import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { imageReplacementTarget, replaceImageMedia } = await loadProductionModule(new URL("../app/studio/image-replacement.ts", import.meta.url));
const { commitTemplateImageReplacement, replaceTemplateImage, templateImageTarget } = await loadProductionModule(new URL("../app/studio/template-image-replacement.ts", import.meta.url));
const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old description", decorative: true,
  caption: "Authored caption", captionRuns: [{ text: "Authored caption", marks: ["bold"] }],
  title: "Title", aspectRatio: "wide", displayWidth: 400, focalX: 20, linkDestination: "custom", linkUrl: "https://example.com", opensInNewTab: true,
  visualStyle: { borderRadius: "8px" }, editorial: { note: "Keep" } };
const asset = { id: "new", name: "flower.png", altText: "Media description", caption: "" };

test("replacing media preserves authored fields and a rich caption when the new caption is empty", () => {
  const target = imageReplacementTarget(image);
  const result = replaceImageMedia(image, target, asset, "");
  assert.deepEqual(result, { ...image, mediaId: "new", alt: "" });
  assert.notEqual(result, image);
  assert.deepEqual(image.captionRuns, [{ text: "Authored caption", marks: ["bold"] }]);
});

test("a nonempty media caption replaces both caption projections", () => {
  const result = replaceImageMedia(image, imageReplacementTarget(image), { ...asset, caption: "New caption" });
  assert.equal(result.caption, "New caption");
  assert.equal(result.captionRuns, undefined);
  assert.equal(result.alt, "Media description");
});

test("source guards reject deleted, retyped, or independently replaced images and preserve unrelated edits", () => {
  const target = imageReplacementTarget(image);
  assert.equal(replaceImageMedia(null, target, asset), null);
  assert.equal(replaceImageMedia({ id: "image", type: "paragraph", text: "Other" }, target, asset), null);
  assert.equal(replaceImageMedia({ ...image, mediaId: "other" }, target, asset), null);
  assert.equal(replaceImageMedia({ ...image, src: "/different.png" }, target, asset), null);
  const changed = { ...image, title: "Edited while picker was open" };
  assert.equal(replaceImageMedia(changed, target, asset).title, changed.title);
});

test("a replacement with identical source and metadata is a no-op", () => {
  const same = { ...image, mediaId: "new", alt: "Media description" };
  assert.equal(replaceImageMedia(same, imageReplacementTarget(same), asset), same);
});

test("a changed image source clears its size choice, but the same source retains it", () => {
  const pin = { key: "medium", sourceDigest: "a".repeat(64), renditionDigest: "b".repeat(64) };
  const original = { ...image, imageResolution: pin };
  const target = imageReplacementTarget(original);
  const replacement = replaceImageMedia(original, target, asset);
  assert.equal(replacement.imageResolution, undefined);
  assert.equal(original.imageResolution, pin, "the prior version remains recoverable");
  const same = replaceImageMedia(original, target, { ...asset, id: "old" });
  assert.equal(same.imageResolution, pin);
  assert.equal(replaceImageMedia({ ...original, mediaId: "other" }, target, asset), null);
});

test("template replacement rebases on the current nested entry and rejects stale or missing owners", () => {
  const store = { version: "0.33.0", sets: [{ id: "set", templates: [{ id: "page", kind: "page", nodes: [{ id: "group", type: "group", layout: "flow", children: [image] }] }], parts: [], name: "Set" }] };
  const snapshot = templateImageTarget(store.sets[0].templates[0].nodes, "image");
  const owner = { setId: "set", targetId: "page", image: snapshot };
  const latest = structuredClone(store);
  latest.sets[0].templates[0].nodes[0].children[0].title = "Concurrent title";
  const result = replaceTemplateImage(latest, owner, asset);
  assert.equal(result.status, "changed");
  assert.equal(result.store.sets[0].templates[0].nodes[0].children[0].title, "Concurrent title");
  assert.equal(result.store.sets[0].templates[0].nodes[0].children[0].mediaId, "new");
  assert.equal(latest.sets[0].templates[0].nodes[0].children[0].mediaId, "old");
  latest.sets[0].templates[0].nodes[0].children[0].mediaId = "other";
  assert.equal(replaceTemplateImage(latest, owner, asset).status, "stale");
  assert.equal(replaceTemplateImage(store, { ...owner, targetId: "missing" }, asset).status, "stale");
  assert.equal(replaceTemplateImage(store, { ...owner, setId: "missing" }, asset).status, "stale");
  const removed = structuredClone(store); removed.sets[0].templates[0].nodes[0].children = [];
  assert.equal(replaceTemplateImage(removed, owner, asset).status, "stale");
});

test("template image commit rechecks the owner at the commit boundary and keeps no-op history", () => {
  let current = { version: "0.33.0", sets: [{ id: "set", templates: [{ id: "page", kind: "page", nodes: [structuredClone(image)] }], parts: [], name: "Set" }] };
  const owner = { setId: "set", targetId: "page", image: templateImageTarget(current.sets[0].templates[0].nodes, "image") };
  let history = []; let allowed = true; let options;
  const commit = (update, received) => {
    options = received;
    if (!allowed) return false;
    try {
      const next = update(structuredClone(current));
      if (JSON.stringify(next) !== JSON.stringify(current)) { history.push(current); current = next; }
      return true;
    } catch { return false; }
  };
  assert.equal(commitTemplateImageReplacement(commit, owner, asset), true);
  assert.equal(options.skipUnchanged, true);
  assert.equal(history.length, 1);
  assert.equal(current.sets[0].templates[0].nodes[0].mediaId, "new");
  const unchangedOwner = { ...owner, image: templateImageTarget(current.sets[0].templates[0].nodes, "image") };
  assert.equal(commitTemplateImageReplacement(commit, unchangedOwner, asset), true);
  assert.equal(history.length, 1);
  current = history.pop();
  current.sets[0].templates[0].nodes[0].mediaId = "another";
  assert.equal(commitTemplateImageReplacement(commit, owner, asset), false);
  assert.equal(history.length, 0);
  allowed = false;
  assert.equal(commitTemplateImageReplacement(commit, owner, asset), false);
  allowed = true;
  const signal = new AbortController(); signal.abort();
  assert.equal(commitTemplateImageReplacement(commit, owner, asset, undefined, signal.signal), false);
});
