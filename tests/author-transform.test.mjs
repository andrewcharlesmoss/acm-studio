import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load("../app/studio/block-transforms.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { findContentBlock } = await load("../app/content/block-tree.ts");

const author = {
  id: "author-block",
  type: "post-author",
  prefix: "Written by",
  avatar: true,
  avatarSize: 128,
  profileImage: { src: "", mediaId: "author-portrait", alt: "Portrait" },
  biography: "Author biography",
  profileUrl: "https://example.com/author",
  openInNewTab: true,
  duotone: { dark: "#17202a", light: "#f7dc6f" },
  align: "centre",
};

const choices = (block, blocks = [block]) => availableBlockTransformsInDocument(block, blocks).map(choice => choice.id);

for (const wrapper of ["group", "columns"]) test(`Author wraps intact in ${wrapper}`, () => {
  const source = structuredClone(author);
  const choice = availableBlockTransformsInDocument(author, [author]).find(item => item.id === `wrap-${wrapper}`);
  assert.ok(choice, `${wrapper} transform is available`);

  let sequence = 0;
  const transformed = transformBlock(author, choice, () => `generated-${++sequence}`);
  const nestedAuthor = wrapper === "group" ? transformed.children[0] : transformed.children[0].children[0];
  assert.equal(transformed.type, wrapper);
  assert.deepEqual(nestedAuthor, source, "the original Author node and every field are preserved");
  assert.equal(findContentBlock([transformed], author.id), nestedAuthor);
  assert.equal(validContentBlocks([transformed]), true);
  assert.deepEqual(author, source, "the transform does not mutate the source node");
});

test("Author wrappers respect movement locks and the parent allowlist", () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) {
    assert.deepEqual(choices({ ...author, editorial: { lock } }), []);
  }

  const parent = { id: "parent", type: "group", layout: "flow", allowedBlocks: ["post-author"], children: [author] };
  assert.deepEqual(choices(author, [parent]), [], "a parent that allows Author but not wrappers withholds both transforms");
  const groupParent = { ...parent, allowedBlocks: ["post-author", "group"] };
  assert.deepEqual(choices(author, [groupParent]), ["wrap-group"]);
  const columnsParent = { ...parent, allowedBlocks: ["post-author", "columns"] };
  assert.deepEqual(choices(author, [columnsParent]), ["wrap-columns"]);
  assert.deepEqual(availableBlockTransforms(author, { ...parent, allowedBlocks: ["post-author"] }), []);
});

test("Author wrapping is withheld when the complete tree would exceed nesting limits", () => {
  let nearLimit = author;
  for (let depth = 0; depth < 7; depth++) nearLimit = { id: `near-${depth}`, type: "group", layout: "flow", children: [nearLimit] };
  assert.deepEqual(choices(author, [nearLimit]), ["wrap-group"], "Group adds one level; Columns adds two");

  let atLimit = author;
  for (let depth = 0; depth < 8; depth++) atLimit = { id: `deep-${depth}`, type: "group", layout: "flow", children: [atLimit] };
  assert.deepEqual(choices(author, [atLimit]), []);
});
