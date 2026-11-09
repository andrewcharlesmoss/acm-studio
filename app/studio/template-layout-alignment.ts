import type { ContentBlock } from "../content/model";
import { groupBlockCanAlign } from "./blocks/group-layout-contract";

/** Preserve authored alignment, even when the current parent does not offer it. */
export function templateGroupCanAlign(block: ContentBlock, parent: ContentBlock | null, isHeaderRoot: boolean): boolean {
  return groupBlockCanAlign(block, parent, !isHeaderRoot);
}
