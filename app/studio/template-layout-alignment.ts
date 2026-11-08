import type { ContentBlock } from "../content/model";
import { groupUsesContentWidth } from "./blocks/group-layout-alignment";

/** Preserve authored alignment, even when the current parent does not offer it. */
export function templateGroupCanAlign(block: ContentBlock, parent: ContentBlock | null, isHeaderRoot: boolean): boolean {
  if (block.type !== "group" || block.blockAlign) return true;
  if (isHeaderRoot) return false;
  return !(parent?.type === "group" && parent.layout === "flow" && !groupUsesContentWidth(parent));
}
