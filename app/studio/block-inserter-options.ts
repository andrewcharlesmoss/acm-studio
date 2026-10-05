import type { ContentBlock, GroupAllowedBlockType } from "../content/model";
import type { BlockLibraryItemType } from "./editor-model";
import { childContentBlocks } from "../content/block-tree.ts";

type BlockOption = { type: BlockLibraryItemType; label: string; description: string };

/** A Content slot stays unique even when its enclosing layout is duplicated. */
export function containsTemplateContent(block: ContentBlock): boolean {
  return block.type === "group" && block.data?.templateElement === "content" || childContentBlocks(block).some(containsTemplateContent);
}

export function parentOfNestedBlock(blocks: ContentBlock[], childId: string): ContentBlock | null {
  for (const block of blocks) {
    const children = childContentBlocks(block);
    if (children.some(child => child.id === childId)) return block;
    const parent = parentOfNestedBlock(children, childId);
    if (parent) return parent;
  }
  return null;
}

export function groupAllowsChild(parent: ContentBlock, childType: string): boolean {
  if (parent.type === "buttons") return childType === "button";
  if (parent.type === "columns") return childType === "column";
  if (parent.type === "social-icons") return childType === "social-linkedin" || childType === "social-tiktok";
  if (parent.type === "list") return childType === "list";
  if (parent.type === "quote") return ["paragraph", "heading", "list", "quote", "image"].includes(childType);
  const storedType = childType === "template-content" ? "group" : childType === "button" ? "buttons" : childType === "social-linkedin" || childType === "social-tiktok" ? "social-icons" : childType;
  return (parent.type !== "group" && parent.type !== "column") || parent.allowedBlocks === undefined
    || parent.allowedBlocks.includes(storedType as GroupAllowedBlockType) || childType === "button" && parent.allowedBlocks.includes("button");
}

/** Retain existing children when a policy narrows, but enforce it on new children and transforms. */
export function permitsBlockTreeChanges(previous: ContentBlock[], next: ContentBlock[]): boolean {
  const previousParents = new Map<string, ContentBlock>();
  function index(blocks: ContentBlock[]) {
    for (const block of blocks) { previousParents.set(block.id, block); index(childContentBlocks(block)); }
  }
  index(previous);
  function permitted(blocks: ContentBlock[]): boolean {
    return blocks.every(parent => {
      const previousParent = previousParents.get(parent.id);
      const oldChildren = new Map((previousParent ? childContentBlocks(previousParent) : []).map(child => [child.id, child.type]));
      const children = childContentBlocks(parent);
      return children.every(child => oldChildren.get(child.id) === child.type || groupAllowsChild(parent, child.type)) && permitted(children);
    });
  }
  return permitted(next);
}

export function blockInserterOptions<T extends BlockOption>(items: T[], parent: ContentBlock | undefined, query: string, socialItems: T[] = [], options: { allowTemplateContent?: boolean } = {}): T[] {
  const source = parent?.type === "social-icons" ? socialItems : items;
  return source.filter(item => ((item.type !== "template-content" || options.allowTemplateContent && (!parent || (parent.type === "group" && !parent.data?.templateElement && !parent.data?.templatePart || parent.type === "column" || parent.type === "section")))
    && (item.type !== "button" || parent?.type === "buttons")
    && !((parent?.type === "group" || parent?.type === "column") && (item.type === "social-linkedin" || item.type === "social-tiktok"))
    && (!parent || groupAllowsChild(parent, item.type)))
    && `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
}
