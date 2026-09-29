import type { ContentBlock } from "./model";

export function contentMediaIds(blocks: ContentBlock[]): string[] {
  return blocks.flatMap(block => {
    const inlineMediaIds = ("runs" in block ? block.runs ?? [] : []).flatMap(run => (run.marks ?? []).flatMap(mark => typeof mark !== "string" && mark.type === "inline-image" && mark.mediaId ? [mark.mediaId] : []));
    const style = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style : block.visualStyle;
    const backgroundMediaIds = style?.backgroundImageMediaId ? [style.backgroundImageMediaId] : [];
    const blockMediaIds = block.type === "image" && block.mediaId ? [block.mediaId] : [];
    const nestedMediaIds = (block.type === "group" || block.type === "section" || block.type === "columns" || block.type === "column" || block.type === "component") && block.children
      ? contentMediaIds(block.children)
      : [];
    return [...inlineMediaIds, ...blockMediaIds, ...backgroundMediaIds, ...nestedMediaIds];
  });
}
