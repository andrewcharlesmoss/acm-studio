import { childContentBlocks } from "../content/block-tree.ts";

/**
 * Document order and ancestry keep ranges independent of block types or DOM.
 * @param {import("../content/model").ContentBlock[]} blocks
 * @param {string[]} ancestors
 * @returns {{id: string, ancestors: string[]}[]}
 */
export function orderedBlockEntries(blocks, ancestors = []) {
  return blocks.flatMap(block => [
    { id: block.id, ancestors },
    ...orderedBlockEntries(childContentBlocks(block), [...ancestors, block.id]),
  ]);
}

export function blockSelectionRange(blocks, anchorId, focusId) {
  const entries = orderedBlockEntries(blocks);
  // null denotes the empty appender's virtual document-end boundary. It is
  // never a block ID and cannot be written into the content model.
  const start = anchorId === null ? entries.length : entries.findIndex(entry => entry.id === anchorId);
  const end = focusId === null ? entries.length : entries.findIndex(entry => entry.id === focusId);
  if (start < 0 || end < 0) return [];
  // Starting in a child and crossing another container selects its children,
  // not an ancestor which would also remove content outside the drawn range.
  const endpointAncestors = new Set([...(entries[start]?.ancestors ?? []), ...(entries[end]?.ancestors ?? [])]);
  return entries.slice(Math.min(start, end), Math.max(start, end) + 1)
    .filter(entry => !endpointAncestors.has(entry.id)).map(entry => entry.id);
}

export function normaliseBlockSelection(blocks, ids) {
  const selected = new Set(ids);
  return orderedBlockEntries(blocks)
    .filter(entry => selected.has(entry.id) && !entry.ancestors.some(id => selected.has(id)))
    .map(entry => entry.id);
}
