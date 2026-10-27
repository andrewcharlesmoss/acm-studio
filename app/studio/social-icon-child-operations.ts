import type { ContentBlock, SocialIconBlock } from "../content/model";
import { parentOfNestedBlock } from "./block-inserter-options";
import { moveBlockAmongSiblings } from "./block-sibling-operations";
import { findBlockById } from "./studio-command-operations.mjs";

type SocialIconsBlock = Extract<ContentBlock, { type: "social-icons" }>;
type SocialIconType = SocialIconBlock["type"];

/** Return the owning Social Icons block only for an actual direct child. */
export function socialIconsParentForChild(blocks: ContentBlock[], parentId: string, childId: string, childType: SocialIconType): SocialIconsBlock | null {
  const child = findBlockById(blocks, childId);
  const parent = findBlockById(blocks, parentId);
  const directParent = parentOfNestedBlock(blocks, childId);
  if (child?.type !== childType || parent?.type !== "social-icons" || directParent?.id !== parentId
    || !parent.children.some(candidate => candidate.id === childId && candidate.type === childType)) return null;
  return parent;
}

/** Guard a parent-owned edit with the child's current direct-parent relationship. */
export function updateSocialIconsParentForChild(
  blocks: ContentBlock[],
  currentParent: ContentBlock,
  parentId: string,
  childId: string,
  childType: SocialIconType,
  update: (parent: SocialIconsBlock) => SocialIconsBlock,
): SocialIconsBlock | null {
  if (currentParent.type !== "social-icons" || currentParent.id !== parentId) return null;
  const parent = socialIconsParentForChild(blocks, parentId, childId, childType);
  if (!parent) return null;
  return update(parent);
}

/** Move a child within its own Social Icons sibling list, rejecting stale ownership. */
export function moveSocialIconChild(blocks: ContentBlock[], parentId: string, childId: string, childType: SocialIconType, direction: -1 | 1): ContentBlock[] {
  if (!socialIconsParentForChild(blocks, parentId, childId, childType)) return blocks;
  const next = moveBlockAmongSiblings(blocks, childId, direction);
  return socialIconsParentForChild(next, parentId, childId, childType) ? next : blocks;
}
