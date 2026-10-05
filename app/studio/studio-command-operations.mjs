import { preservesBlockLocks } from "../content/block-editorial.ts";
import { findContentBlock } from "../content/block-tree.ts";
import { editBlockSiblings } from "./block-sibling-operations.ts";
import { cloneBlocksForInsertion } from "./block-copy.ts";
/** @typedef {import("../content/model").ContentBlock} ContentBlock */
/** @typedef {import("./editor-model").StudioDocument} StudioDocument */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {StudioDocument} document
 * @param {(blocks: ContentBlock[]) => ContentBlock[]} update
 * @returns {StudioDocument}
 */
export function updateDocumentBlocks(document, update) {
  return { ...document, blocks: update(document.blocks) };
}

export function updateBlockById(document, blockId, update) {
  const blocks = editBlockSiblings(document.blocks, blockId, (siblings, index) => {
    const next = update(siblings[index]);
    return next === siblings[index] ? siblings : siblings.map((block, position) => position === index ? next : block);
  });
  return blocks === document.blocks || !preservesBlockLocks(document.blocks, blocks) ? document : { ...document, blocks };
}

export function removeNestedBlockById(document, blockId) {
  return removeBlocksByIds(document, [blockId]);
}

/** Remove a selection in one document update, including mixed nested blocks. */
export function removeBlocksByIds(document, blockIds) {
  const selected = new Set(blockIds);
  function remove(blocks) {
    let changed = false;
    const next = [];
    for (const block of blocks) {
      if (selected.has(block.id)) { changed = true; continue; }
      if (Array.isArray(block.children)) {
        const children = remove(block.children);
        if (children !== block.children) {
          changed = true;
          // Columns must contain at least one column. Removing every column
          // therefore removes the empty layout, rather than saving invalid data.
          if (block.type === "columns" && children.length === 0) continue;
          next.push({ ...block, children });
          continue;
        }
      }
      if (block.type === "list") {
        const items = block.items.map(item => {
          if (typeof item === "string" || !item.children) return item;
          const children = remove(item.children);
          if (children === item.children) return item;
          return { ...item, children: children.length ? children : undefined };
        });
        if (items.some((item, index) => item !== block.items[index])) {
          changed = true;
          next.push({ ...block, items });
          continue;
        }
      }
      next.push(block);
    }
    return changed ? next : blocks;
  }
  const blocks = remove(document.blocks);
  return blocks === document.blocks || !preservesBlockLocks(document.blocks, blocks) ? document : { ...document, blocks };
}

/** Compatibility API for editor consumers; traversal belongs to the typed block tree. */
export function findBlockById(blocks, blockId) {
  return findContentBlock(blocks, blockId);
}

export function duplicateNestedBlockById(document, blockId, createBlockId) {
  const blocks = editBlockSiblings(document.blocks, blockId, (siblings, index) => {
    const copies = cloneBlocksForInsertion([siblings[index]], createBlockId);
    return [...siblings.slice(0, index + 1), ...copies, ...siblings.slice(index + 1)];
  });
  return blocks === document.blocks || !preservesBlockLocks(document.blocks, blocks) ? document : { ...document, blocks };
}

export function insertBlockAt(document, block, afterIndex) {
  const blocks = [...document.blocks];
  const index = afterIndex === null ? blocks.length : afterIndex + 1;
  blocks.splice(index, 0, block);
  return { ...document, blocks };
}

export function moveBlockAt(document, from, to) {
  if (from === to || from < 0 || to < 0 || from >= document.blocks.length || to >= document.blocks.length) return document;
  const blocks = [...document.blocks];
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return preservesBlockLocks(document.blocks, blocks) ? { ...document, blocks } : document;
}

export function duplicateBlockAt(document, blockIndex, createBlockId) {
  const source = document.blocks[blockIndex];
  if (!source) return document;
  const [copy] = cloneBlocksForInsertion([source], createBlockId);
  return insertBlockAt(document, copy, blockIndex);
}

export function removeBlockById(document, blockId) {
  return removeNestedBlockById(document, blockId);
}

export function duplicateDocumentWithIds(document, createDocumentId, createBlockId) {
  return {
    ...clone(document),
    id: createDocumentId(document.kind),
    title: `${document.title} copy`,
    slug: `${document.slug}-copy`,
    status: "draft",
    publishAt: undefined,
    publishedAt: undefined,
    publishedSlug: undefined,
    updatedAt: new Date().toISOString(),
    blocks: cloneBlocksForInsertion(document.blocks, createBlockId),
  };
}

export function addDocumentToWorkspace(workspace, document) {
  return { ...workspace, activeDocumentId: document.id, documents: [...workspace.documents, document] };
}

export function deleteDocumentFromWorkspace(workspace, documentId) {
  const documents = workspace.documents.filter((document) => document.id !== documentId);
  if (!documents.length) return { ...workspace, documents, activeDocumentId: "" };
  if (workspace.activeDocumentId !== documentId) return { ...workspace, documents };
  const deletedIndex = workspace.documents.findIndex((document) => document.id === documentId);
  const fallback = documents[Math.min(deletedIndex, documents.length - 1)];
  return { ...workspace, documents, activeDocumentId: fallback?.id ?? workspace.activeDocumentId };
}

export function commitHistory(current, history, maxHistory = 60) {
  return {
    history: [...history.slice(-(maxHistory - 1)), clone(current)],
    future: [],
  };
}

export function undoHistory(current, history, future, maxHistory = 60) {
  const previous = history.at(-1);
  if (!previous) return null;
  return {
    workspace: previous,
    history: history.slice(0, -1),
    future: [clone(current), ...future].slice(0, maxHistory),
  };
}

export function redoHistory(current, history, future, maxHistory = 60) {
  const next = future[0];
  if (!next) return null;
  return {
    workspace: next,
    history: [...history, clone(current)].slice(-maxHistory),
    future: future.slice(1),
  };
}
