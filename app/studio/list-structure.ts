import { listNumber, type ListBlock, type ListItem, type RichTextRun } from "../content/model";

type ListItemUpdate = (item: ListItem) => ListItem;

export function listItemAfterSplit(item: ListItem, text: string, runs: RichTextRun[]): ListItem {
  const formattedRuns = runs.some(run => run.marks?.length) ? runs : undefined;
  const sourceStyle = typeof item === "string" ? undefined : item.style;
  const style = sourceStyle ? { ...sourceStyle } : undefined;
  if (style) delete style.anchor;
  return formattedRuns?.length || (style && Object.keys(style).length)
    ? { text, ...(formattedRuns ? { runs: formattedRuns } : {}), ...(style && Object.keys(style).length ? { style } : {}) }
    : text;
}

function mapList(list: ListBlock, targetId: string, update: (list: ListBlock) => ListBlock): ListBlock {
  if (list.id === targetId) return update(list);
  const items = list.items.map(item => {
    if (typeof item === "string" || !item.children?.length) return item;
    const children = item.children.map(child => mapList(child, targetId, update));
    return children.some((child, index) => child !== item.children?.[index]) ? { ...item, children } : item;
  });
  return items.some((item, index) => item !== list.items[index]) ? { ...list, items } : list;
}

export function updateListItem(root: ListBlock, listId: string, itemIndex: number, update: ListItemUpdate): ListBlock {
  return mapList(root, listId, list => {
    if (itemIndex < 0 || itemIndex > list.items.length || (itemIndex === list.items.length && list.items.length > 0)) return list;
    const items = [...list.items];
    items[itemIndex] = update(items[itemIndex] ?? "");
    return { ...list, items };
  });
}

export function replaceListItems(root: ListBlock, listId: string, items: ListItem[]): ListBlock {
  return mapList(root, listId, list => ({ ...list, items }));
}

export function removeListItem(root: ListBlock, listId: string, itemIndex: number): ListBlock {
  return mapList(root, listId, list => ({ ...list, items: list.items.filter((_, index) => index !== itemIndex) }));
}

type NestedListOwner = { parentList: ListBlock; parentItemIndex: number; nestedListIndex: number; nestedList: ListBlock };

function findNestedListOwner(list: ListBlock, targetId: string): NestedListOwner | null {
  for (let parentItemIndex = 0; parentItemIndex < list.items.length; parentItemIndex += 1) {
    const item = list.items[parentItemIndex];
    if (typeof item === "string" || !item.children) continue;
    for (let nestedListIndex = 0; nestedListIndex < item.children.length; nestedListIndex += 1) {
      const nestedList = item.children[nestedListIndex];
      if (nestedList.id === targetId) return { parentList: list, parentItemIndex, nestedListIndex, nestedList };
      const descendant = findNestedListOwner(nestedList, targetId);
      if (descendant) return descendant;
    }
  }
  return null;
}

function removeItemAt(list: ListBlock, itemIndex: number): ListBlock {
  return { ...list, items: list.items.filter((_, index) => index !== itemIndex) };
}

function removeEmptyNestedList(root: ListBlock, owner: NestedListOwner): ListBlock {
  return updateListItem(root, owner.parentList.id, owner.parentItemIndex, item => {
    const itemRecord = typeof item === "string" ? { text: item } : item;
    const children = [...(itemRecord.children ?? [])];
    children.splice(owner.nestedListIndex, 1);
    const content = { ...itemRecord };
    delete content.children;
    return children.length ? { ...content, children } : content;
  });
}

function insertAfter(root: ListBlock, listId: string, itemIndex: number, item: ListItem): ListBlock {
  return mapList(root, listId, list => {
    const items = [...list.items];
    items.splice(itemIndex + 1, 0, item);
    return { ...list, items };
  });
}

function hasCompatibleListMarkers(first: ListBlock, second: ListBlock, nextNumber: number | undefined): boolean {
  if (first.style !== second.style) return false;
  if (first.style === "unordered") return true;
  return nextNumber !== undefined
    && (first.marker ?? "1") === (second.marker ?? "1")
    && Boolean(first.reversed) === Boolean(second.reversed)
    && listNumber(first, first.items.length) === nextNumber;
}

export function indentListItem(root: ListBlock, listId: string, itemIndex: number, createId: () => string): { block: ListBlock; listId: string; itemIndex: number } | null {
  const list = findListBlock(root, listId);
  if (!list || itemIndex <= 0 || itemIndex >= list.items.length) return null;
  const item = list.items[itemIndex];
  const itemNumber = list.style === "ordered" ? listNumber(list, itemIndex) : undefined;
  let next = mapList(root, listId, current => removeItemAt(current, itemIndex));
  let nestedListId = "";
  next = updateListItem(next, list.id, itemIndex - 1, current => {
    const parentItem = typeof current === "string" ? { text: current } : current;
    const children = [...(parentItem.children ?? [])];
    const last = children.at(-1);
    if (last && hasCompatibleListMarkers(last, list, itemNumber)) {
      nestedListId = last.id;
      children[children.length - 1] = { ...last, items: [...last.items, item] };
      return { ...parentItem, children };
    }
    const nested: ListBlock = {
      id: createId(), type: "list", style: list.style,
      items: [item],
      ...(list.marker ? { marker: list.marker } : {}),
      ...(itemNumber !== undefined ? { start: itemNumber } : {}),
      ...(list.reversed ? { reversed: true } : {}),
      ...(list.blockAlign ? { blockAlign: list.blockAlign } : {}),
    };
    nestedListId = nested.id;
    children.push(nested);
    return { ...parentItem, children };
  });
  return { block: next, listId: nestedListId, itemIndex: 0 };
}

export function outdentListItem(root: ListBlock, listId: string, itemIndex: number): { block: ListBlock; listId: string; itemIndex: number } | null {
  const owner = findNestedListOwner(root, listId);
  if (!owner || itemIndex < 0 || itemIndex >= owner.nestedList.items.length) return null;
  const moved = owner.nestedList.items[itemIndex];
  let next = mapList(root, listId, list => removeItemAt(list, itemIndex));
  if (!nextListHasItems(next, listId)) next = removeEmptyNestedList(next, owner);
  next = insertAfter(next, owner.parentList.id, owner.parentItemIndex, moved);
  return { block: next, listId: owner.parentList.id, itemIndex: owner.parentItemIndex + 1 };
}

export function findListBlock(root: ListBlock, targetId: string): ListBlock | null {
  if (root.id === targetId) return root;
  for (const item of root.items) {
    if (typeof item === "string") continue;
    for (const child of item.children ?? []) {
      const found = findListBlock(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

function nextListHasItems(root: ListBlock, listId: string) {
  return (findListBlock(root, listId)?.items.length ?? 0) > 0;
}
