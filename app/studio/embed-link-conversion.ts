import type { ContentBlock, RichTextRun } from "../content/model";
import { findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import { normaliseTextRuns, plainTextFromRuns, safeTextLink, textToRuns } from "../content/rich-text";
import { blockAlignmentOptions } from "../content/block-alignment";
import { groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { editBlockSiblings } from "./block-sibling-operations";
import { validContentBlocks } from "./workspace-validation";

/** Project an unsupported Embed into the canonical text transform contract. */
export function embedLinkParagraph(block: Extract<ContentBlock, { type: "embed" }>, rootBlocks: ContentBlock[] = [block]): Extract<ContentBlock, { type: "paragraph" }> | null {
  const url = safeTextLink(block.url);
  const current = findContentBlock(rootBlocks, block.id);
  const parent = parentOfNestedBlock(rootBlocks, block.id);
  if (!url || !current || JSON.stringify(current) !== JSON.stringify(block) || parent && !groupAllowsChild(parent, "paragraph")) return null;
  const caption = block.captionRuns?.length ? block.captionRuns : textToRuns(block.caption ?? "");
  const runs: RichTextRun[] = normaliseTextRuns([
    { text: block.title || url, marks: [{ type: "link", url }] },
    ...(caption.length ? [{ text: "\n" }, ...caption] : []),
  ]);
  const paragraph: Extract<ContentBlock, { type: "paragraph" }> = {
    id: block.id, type: "paragraph", text: plainTextFromRuns(runs), runs,
    editorial: block.editorial, siteRole: block.siteRole,
    blockAlign: block.blockAlign && blockAlignmentOptions("paragraph").includes(block.blockAlign) ? block.blockAlign : undefined,
    style: block.visualStyle ? structuredClone(block.visualStyle) : undefined,
  };
  const proposed = editBlockSiblings(rootBlocks, block.id, (siblings, index) => siblings.map((item, position) => position === index ? paragraph : item));
  return validContentBlocks(proposed) && permitsBlockTreeChanges(rootBlocks, proposed) && preservesBlockLocks(rootBlocks, proposed) ? paragraph : null;
}
