import { listItemText, type ContentBlock, type ListBlock, type ListItem } from "../content/model";
import { normaliseTextRuns, textToRuns } from "../content/rich-text";
import { listItemWithTextRuns } from "../content/list-item-text";
import { preservesBlockLocks } from "../content/block-editorial";
import { findContentBlock } from "../content/block-tree";
import { editBlockSiblings } from "./block-sibling-operations";
import { permitsBlockTreeChanges } from "./block-inserter-options";
import { validContentBlocks } from "./workspace-validation";
import { findListBlock, replaceListItems, updateListItem } from "./list-structure";

type ItemLocation = { list: ListBlock; itemIndex: number; item: ListItem; hidden: boolean; owner?: ItemLocation; wrapperIndex?: number };
export type ListBoundaryMerge = { block: ListBlock; listId: string; itemIndex: number; offset: number };

function readingOrder(list: ListBlock, hidden = false, owner?: ItemLocation, wrapperIndex?: number): ItemLocation[] {
  return (list.items.length ? list.items : [""]).flatMap((item, itemIndex) => {
    const location: ItemLocation = { list, itemIndex, item, hidden: hidden || Boolean(list.editorial?.hidden), owner, wrapperIndex };
    const children = typeof item === "string" ? [] : item.children ?? [];
    return [location, ...children.flatMap((child, index) => readingOrder(child, location.hidden, location, index))];
  });
}

function childrenOf(item: ListItem): ListBlock[] {
  return typeof item === "string" ? [] : item.children ?? [];
}

function withChildren(item: ListItem, children: ListBlock[]): ListItem {
  if (!children.length) {
    if (typeof item === "string") return item;
    const next = { ...item };
    delete next.children;
    return next;
  }
  return { ...(typeof item === "string" ? { text: item } : item), children };
}

function removableEmptyWrapper(list: ListBlock & Pick<ContentBlock, "siteRole">): boolean {
  return !list.visualStyle?.anchor && !list.siteRole && !list.editorial?.name
    && !list.editorial?.note && !list.editorial?.hidden
    && !list.editorial?.lock?.move && !list.editorial?.lock?.remove;
}

/** Merge adjacent lines within one List tree; root/document boundaries are separate commands. */
export function mergeListItemBoundary(root: ListBlock, listId: string, itemIndex: number, direction: "backward" | "forward", contextBlocks: ContentBlock[] = [root]): ListBoundaryMerge | null {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return null;
  if (!validContentBlocks(contextBlocks)) return null;
  const contextRoot = findContentBlock(contextBlocks, root.id);
  if (!contextRoot || JSON.stringify(contextRoot) !== JSON.stringify(root)) return null;
  const fields = readingOrder(root);
  const current = fields.findIndex(field => field.list.id === listId && field.itemIndex === itemIndex);
  if (current < 0) return null;
  const first = fields[direction === "backward" ? current - 1 : current];
  const second = fields[direction === "backward" ? current : current + 1];
  if (!first || !second || first.hidden || second.hidden) return null;
  const firstAnchor = typeof first.item === "string" ? undefined : first.item.style?.anchor;
  const secondAnchor = typeof second.item === "string" ? undefined : second.item.style?.anchor;
  if (firstAnchor && secondAnchor && firstAnchor !== secondAnchor) return null;
  const descendants = childrenOf(second.item);
  const siblings = first.list.id === second.list.id;
  const parent = second.owner?.list.id === first.list.id && second.owner.itemIndex === first.itemIndex;

  // The removed line's descendants must precede its former following siblings.
  // Preserve complete wrappers instead of flattening their marker/style owners.
  let next = updateListItem(root, second.list.id, second.itemIndex, item => withChildren(item, []));
  const source = findListBlock(next, second.list.id);
  if (!source) return null;
  const remaining = source.items.filter((_, index) => index !== second.itemIndex);
  if (!remaining.length && second.owner) {
    if (!removableEmptyWrapper(source)) return null;
    next = updateListItem(next, second.owner.list.id, second.owner.itemIndex, item => withChildren(item, childrenOf(item).filter(child => child.id !== source.id)));
  } else {
    next = replaceListItems(next, source.id, remaining);
  }

  const firstRuns = typeof first.item === "string" ? textToRuns(first.item) : first.item.runs ?? textToRuns(first.item.text);
  const secondRuns = typeof second.item === "string" ? textToRuns(second.item) : second.item.runs ?? textToRuns(second.item.text);
  // Legacy zero-text objects have no editable slot. Normalisation would drop
  // their identity and could remove a companion note, so leave this edge intact.
  if ([...firstRuns, ...secondRuns].some(run => !run.text && run.marks?.some(mark =>
    typeof mark !== "string" && ["footnote", "inline-image", "math"].includes(mark.type)))) return null;
  const text = listItemText(first.item) + listItemText(second.item);
  const runs = normaliseTextRuns([...firstRuns, ...secondRuns]);
  next = updateListItem(next, first.list.id, first.itemIndex, item => {
    let merged = listItemWithTextRuns(item, text, runs);
    if (secondAnchor && !firstAnchor) merged = { ...(typeof merged === "string" ? { text: merged } : merged), style: { ...(typeof merged === "string" ? {} : merged.style), anchor: secondAnchor } };
    if (siblings) return withChildren(merged, [...childrenOf(merged), ...descendants]);
    if (parent && descendants.length) {
      const children = [...childrenOf(merged)];
      const retainedIndex = children.findIndex(child => child.id === second.list.id);
      children.splice(retainedIndex >= 0 ? retainedIndex : second.wrapperIndex ?? 0, 0, ...descendants);
      return withChildren(merged, children);
    }
    return merged;
  });

  if (!siblings && !parent && descendants.length) {
    // A preceding branch's trailing descendant receives the text. Promote the
    // removed line's child wrappers alongside that descendant's containing List
    // so their items keep Gutenberg's resulting indentation and reading order.
    const owner = first.owner;
    if (!owner || first.itemIndex !== Math.max(0, first.list.items.length - 1)) return null;
    let promoted = false;
    next = updateListItem(next, owner.list.id, owner.itemIndex, item => {
      const children = [...childrenOf(item)];
      const position = children.findIndex(child => child.id === first.list.id);
      if (position < 0) return item;
      children.splice(position + 1, 0, ...descendants);
      promoted = true;
      return withChildren(item, children);
    });
    if (!promoted) return null;
  }

  const proposed = editBlockSiblings(contextBlocks, root.id, siblings => siblings.map(block => block.id === root.id ? next : block));
  if (!validContentBlocks(proposed) || !preservesBlockLocks(contextBlocks, proposed) || !permitsBlockTreeChanges(contextBlocks, proposed)) return null;
  return { block: next, listId: first.list.id, itemIndex: first.itemIndex, offset: listItemText(first.item).length };
}
