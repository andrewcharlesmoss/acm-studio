import type { ContentBlock, GroupAllowedBlockType } from "../content/model";
import type { BlockLibraryItemType } from "./editor-model";
import { childContentBlocks } from "../content/block-tree.ts";
import { socialServiceFromInsertType } from "../content/social-services";

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
  if (parent.type === "group" && parent.data?.templateElement === "navigation") return childType === "page-link";
  const isSocialLink = childType === "social-link" || Boolean(socialServiceFromInsertType(childType));
  if (isSocialLink && parent.type !== "social-icons") return false;
  if (childType === "page-link") return false;
  if (parent.type === "buttons") return childType === "button";
  if (parent.type === "columns") return childType === "column";
  if (parent.type === "social-icons") return childType === "social-link" || childType === "social-linkedin" || childType === "social-tiktok" || Boolean(socialServiceFromInsertType(childType));
  if (parent.type === "list") return childType === "list";
  if ((parent.type === "quote" || parent.type === "pullquote")) return ["paragraph", "heading", "list", "quote", "pullquote", "image"].includes(childType);
  if (parent.type === "group" && parent.allowedBlocks !== undefined) {
    const storedType: GroupAllowedBlockType = childType === "template-content" || childType === "navigation" || childType === "site-title"
      || childType === "row" || childType === "stack" || childType === "grid"
      ? "group"
      : childType as GroupAllowedBlockType;
    return parent.allowedBlocks.includes(storedType);
  }
  return true;
}

/** Preserve existing children while enforcing structural rules on new children and transforms. */
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
      const retainingImportedGroupContents = parent.type === "group" && !previousParent;
      return children.every(child => oldChildren.get(child.id) === child.type || retainingImportedGroupContents || groupAllowsChild(parent, child.type)) && permitted(children);
    });
  }
  return permitted(next);
}

export function blockInserterOptions<T extends BlockOption>(items: T[], parent: ContentBlock | undefined, query: string, socialItems: T[] = [], options: { allowTemplateContent?: boolean; allowTemplateNavigation?: boolean; allowTemplateSiteTitle?: boolean; allowTemplatePageLink?: boolean } = {}): T[] {
  const source = parent?.type === "social-icons" ? socialItems : items;
  return source.filter(item => ((item.type !== "template-content" || options.allowTemplateContent && (!parent || (parent.type === "group" && !parent.data?.templateElement && !parent.data?.templatePart || parent.type === "column" || parent.type === "section")))
    && (item.type !== "navigation" || options.allowTemplateNavigation && (!parent || (parent.type === "group" && !parent.data?.templateElement && !parent.data?.templatePart || parent.type === "column" || parent.type === "section")))
    && (item.type !== "site-title" || options.allowTemplateSiteTitle && (!parent || (parent.type === "group" && !parent.data?.templateElement && !parent.data?.templatePart || parent.type === "column" || parent.type === "section")))
    && (item.type !== "page-link" || options.allowTemplatePageLink && (!parent || parent.type === "group" && parent.data?.templateElement === "navigation"))
    && (item.type !== "button" || parent?.type === "buttons")
    && !((parent?.type === "group" || parent?.type === "column") && (item.type === "social-linkedin" || item.type === "social-tiktok" || Boolean(socialServiceFromInsertType(item.type))))
    && (!parent || groupAllowsChild(parent, socialServiceFromInsertType(item.type) ? "social-link" : item.type)))
    && `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
}
