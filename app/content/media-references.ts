import type { ContentBlock } from "./model";

export function contentMediaIds(blocks: ContentBlock[]): string[] {
  return blocks.flatMap(block => {
    const inlineMediaIds = ("runs" in block ? block.runs ?? [] : []).flatMap(run => (run.marks ?? []).flatMap(mark => typeof mark !== "string" && mark.type === "inline-image" && mark.mediaId ? [mark.mediaId] : []));
    if (block.type === "image" && block.mediaId) return [block.mediaId, ...inlineMediaIds];
    if ((block.type === "group" || block.type === "section" || block.type === "component") && block.children) return [...inlineMediaIds, ...contentMediaIds(block.children)];
    return inlineMediaIds;
  });
}
