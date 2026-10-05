import type { ContentBlock } from "./model";

/** Read immediate block children, including Lists owned by individual List Items. */
export function childContentBlocks(block: ContentBlock): ContentBlock[] {
  if (block.type === "list") return block.items.flatMap(item => typeof item === "string" ? [] : item.children ?? []);
  if (block.type === "group" || block.type === "section" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "quote" || block.type === "buttons" || block.type === "social-icons") return block.children ?? [];
  return [];
}

export function findContentBlock(blocks: ContentBlock[], id: string): ContentBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    const child = findContentBlock(childContentBlocks(block), id);
    if (child) return child;
  }
  return null;
}
