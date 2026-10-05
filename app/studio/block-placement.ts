import type { ContentBlock } from "../content/model";
import { findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import { groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { editBlockSiblings } from "./block-sibling-operations";
import { validContentBlocks } from "./workspace-validation";

/** Index is a boundary in the destination's children before removing the source. */
export type BlockInsertionTarget = { parentId: string | null; index: number };

function targetChildren(blocks: ContentBlock[], target: BlockInsertionTarget) {
  if (target.parentId === null) return blocks;
  const parent = findContentBlock(blocks, target.parentId);
  return parent?.type === "column" ? parent.children : null;
}

export function insertBlockAtTarget(blocks: ContentBlock[], block: ContentBlock, target: BlockInsertionTarget): ContentBlock[] {
  const children = targetChildren(blocks, target);
  const parent = target.parentId ? findContentBlock(blocks, target.parentId) : null;
  if (!children || !Number.isInteger(target.index) || target.index < 0 || target.index > children.length
    || findContentBlock(blocks, block.id) || ["column", "social-linkedin", "social-tiktok"].includes(block.type) || parent && !groupAllowsChild(parent, block.type)) return blocks;
  const inserted = [...children.slice(0, target.index), block, ...children.slice(target.index)];
  const next = target.parentId === null ? inserted : editBlockSiblings(blocks, target.parentId, (siblings, index) => siblings.map((item, position) => position === index && item.type === "column" ? { ...item, children: inserted } : item));
  return validContentBlocks(next) ? next : blocks;
}

/** Root/Column placement preserves identity and changes both parents atomically. */
export function moveBlockToTarget(blocks: ContentBlock[], id: string, target: BlockInsertionTarget): ContentBlock[] {
  const source = findContentBlock(blocks, id);
  const children = targetChildren(blocks, target);
  if (!source || ["column", "social-linkedin", "social-tiktok"].includes(source.type) || !children || !Number.isInteger(target.index) || target.index < 0 || target.index > children.length
    || target.parentId === id || target.parentId && findContentBlock([source], target.parentId)) return blocks;
  const oldParent = parentOfNestedBlock(blocks, id);
  const sameParent = (oldParent?.id ?? null) === target.parentId;
  const oldIndex = children.findIndex(item => item.id === id);
  if (sameParent && (target.index === oldIndex || target.index === oldIndex + 1)) return blocks;
  const index = sameParent && oldIndex < target.index ? target.index - 1 : target.index;
  const removed = editBlockSiblings(blocks, id, (siblings, position) => [...siblings.slice(0, position), ...siblings.slice(position + 1)]);
  const next = insertBlockAtTarget(removed, source, { ...target, index });
  // A rejected destination must never leave the source removed.
  if (next === removed || !permitsBlockTreeChanges(blocks, next) || !preservesBlockLocks(blocks, next)) return blocks;
  return next;
}
