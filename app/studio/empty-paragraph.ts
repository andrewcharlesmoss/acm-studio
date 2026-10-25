import type { ContentBlock } from "../content/model";

export function isEmptyParagraph(block: ContentBlock | undefined): block is Extract<ContentBlock, { type: "paragraph" }> {
  return block?.type === "paragraph"
    && block.text.length === 0
    && !(block.runs?.some(run => run.text.length > 0 || run.inline));
}
