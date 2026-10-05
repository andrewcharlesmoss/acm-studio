import type { ContentBlock } from "../content/model";
import { findContentBlock } from "../content/block-tree";
import { editBlockSiblings } from "./block-sibling-operations";
import { pasteBlockAppearance } from "./block-appearance";

/** Resolve the actual sibling owner, including an individual List Item's children. */
export function blockMenuSiblingSelection(blocks: ContentBlock[], selected: ContentBlock[]): ContentBlock[] | null {
  if (!selected.length) return null;
  const ids = new Set(selected.map(block => block.id));
  if (ids.size !== selected.length) return null;
  let owned: ContentBlock[] | null = null;
  editBlockSiblings(blocks, selected[0].id, siblings => {
    const matches = siblings.filter(block => ids.has(block.id));
    if (matches.length === ids.size) owned = matches;
    return siblings;
  });
  return owned;
}

/** Insert one batch at the selection's outer edge without moving authored siblings. */
export function insertAtBlockSelectionEdge(blocks: ContentBlock[], selected: ContentBlock[], added: ContentBlock[], after: boolean): ContentBlock[] {
  const owned = blockMenuSiblingSelection(blocks, selected);
  if (!owned || !added.length) return blocks;
  const edge = after ? owned.at(-1)! : owned[0];
  return editBlockSiblings(blocks, edge.id, (siblings, index) => {
    const insertion = index + Number(after);
    return [...siblings.slice(0, insertion), ...added, ...siblings.slice(insertion)];
  });
}

/** All destinations share one history transaction; content and unique anchors stay theirs. */
export function pasteBlockSelectionAppearance(blocks: ContentBlock[], selected: ContentBlock[], source: ContentBlock): ContentBlock[] {
  if (!selected.length || selected.some(block => !findContentBlock(blocks, block.id))) return blocks;
  return selected.reduce((next, block) => editBlockSiblings(next, block.id, (siblings, index) => {
    const pasted = pasteBlockAppearance(siblings[index], source);
    return JSON.stringify(pasted) === JSON.stringify(siblings[index]) ? siblings : siblings.map((item, position) => position === index ? pasted : item);
  }), blocks);
}
