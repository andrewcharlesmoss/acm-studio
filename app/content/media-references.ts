import type { ContentBlock } from "./model";

export function contentMediaIds(blocks: ContentBlock[]): string[] {
  return blocks.flatMap(block => block.type === "image" && block.mediaId ? [block.mediaId] : (block.type === "group" || block.type === "section" || block.type === "component") && block.children ? contentMediaIds(block.children) : []);
}
