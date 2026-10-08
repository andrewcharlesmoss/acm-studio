import type { ListBlock } from "../content/model";
import { findListBlock, updateListItem } from "./list-structure";

/** Item indices can change while a picker is open; retain the captured owner. */
export type ListItemBackgroundTarget = { listId: string; itemIndex: number; baseline: string };

export function setListItemBackgroundImage(root: ListBlock, target: ListItemBackgroundTarget, mediaId: string): ListBlock | null {
  const list = findListBlock(root, target.listId);
  if (!list || !Number.isInteger(target.itemIndex) || target.itemIndex < 0) return null;
  const item = list.items[target.itemIndex] ?? (!list.items.length && target.itemIndex === 0 ? "" : undefined);
  if (item === undefined || JSON.stringify(list.items) !== target.baseline) return null;
  return updateListItem(root, list.id, target.itemIndex, current => {
    const value = typeof current === "string" ? { text: current } : current;
    return { ...value, style: { ...value.style, backgroundImageMediaId: mediaId } };
  });
}
