import type { ContentBlock } from "../content/model";
import { childContentBlocks } from "../content/block-tree.ts";

/** Operate on the target's actual sibling list, preserving unrelated branches. */
export function editBlockSiblings(blocks: ContentBlock[], id: string, edit: (siblings: ContentBlock[], index: number) => ContentBlock[]): ContentBlock[] {
  const index = blocks.findIndex(block => block.id === id);
  if (index >= 0) return edit(blocks, index);
  let changed = false;
  const next = blocks.map(block => {
    const ownedChildren = block.type === "list" ? [] : childContentBlocks(block);
    if (ownedChildren.length) {
      const children = editBlockSiblings(ownedChildren, id, edit);
      if (children !== ownedChildren) { changed = true; return { ...block, children } as ContentBlock; }
    }
    if (block.type === "list") {
      const items = block.items.map(item => {
        if (typeof item === "string" || !item.children) return item;
        const children = editBlockSiblings(item.children, id, edit);
        if (children === item.children) return item;
        changed = true;
        return { ...item, children: children.length ? children as typeof item.children : undefined };
      });
      if (items.some((item, index) => item !== block.items[index])) return { ...block, items };
    }
    return block;
  });
  return changed ? next : blocks;
}

export function moveBlockAmongSiblings(blocks: ContentBlock[], id: string, direction: -1 | 1): ContentBlock[] {
  return editBlockSiblings(blocks, id, (siblings, index) => {
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return siblings;
    const next = [...siblings];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
}

/** Dragging stays within the owning container; parent changes need a transform. */
export function reorderBlockAmongSiblings(blocks: ContentBlock[], id: string, targetId: string, after: boolean): ContentBlock[] {
  if (id === targetId) return blocks;
  return editBlockSiblings(blocks, id, (siblings, index) => {
    const target = siblings.findIndex(block => block.id === targetId);
    if (target < 0) return siblings;
    const next = [...siblings];
    const [moved] = next.splice(index, 1);
    const insertion = next.findIndex(block => block.id === targetId) + (after ? 1 : 0);
    next.splice(insertion, 0, moved);
    return next.every((block, position) => block === siblings[position]) ? siblings : next;
  });
}
