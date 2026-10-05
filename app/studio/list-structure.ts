import { listItemText, listNumber, validListStart, type ContentBlock, type ListBlock, type ListItem, type RichTextRun } from "../content/model";
import { findContentBlock } from "../content/block-tree";

type ListItemUpdate = (item: ListItem) => ListItem;

export function listItemIsEmpty(item: ListItem): boolean {
  return !listItemText(item) && (typeof item === "string" || !item.runs?.some(run => run.text || run.inline
    || run.marks?.some(mark => typeof mark !== "string" && ["footnote", "inline-image", "math"].includes(mark.type))));
}

export function listItemAfterSplit(item: ListItem, text: string, runs: RichTextRun[]): ListItem {
  const formattedRuns = runs.some(run => run.inline || run.marks?.length) ? runs : undefined;
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

export function outdentListItem(root: ListBlock, listId: string, itemIndex: number, contextBlocks: ContentBlock[] = [root]): { block: ListBlock; listId: string; itemIndex: number } | null {
  const owner = findNestedListOwner(root, listId);
  if (!owner || itemIndex < 0 || itemIndex >= Math.max(1, owner.nestedList.items.length)) return null;
  const moved = owner.nestedList.items[itemIndex] ?? "";
  const precedingItems = owner.nestedList.items.slice(0, itemIndex);
  const followingItems = owner.nestedList.items.slice(itemIndex + 1);
  const prefixStart = owner.nestedList.style === "ordered" ? listNumber(owner.nestedList, 0) : undefined;
  const tailStart = owner.nestedList.style === "ordered" ? listNumber(owner.nestedList, itemIndex + 1) : undefined;
  // Refuse numbering that the persisted content contract cannot represent.
  if ((precedingItems.length && prefixStart !== undefined && !validListStart(prefixStart))
    || (followingItems.length && tailStart !== undefined && !validListStart(tailStart))) return null;
  const parentItem = owner.parentList.items[owner.parentItemIndex];
  const parentChildren = typeof parentItem === "string" ? [] : parentItem.children ?? [];
  const followingLists = parentChildren.slice(owner.nestedListIndex + 1);
  const movedChildren = typeof moved === "string" ? [] : moved.children ?? [];
  const children = [...movedChildren];

  // Following items travel with the outdented item, preserving reading order.
  // ACM may also have later child Lists on the parent; carry those after the
  // source tail instead of leaving them above the moved item.
  if (followingItems.length) {
    if (precedingItems.length) {
      let suffix = 1;
      let tailId = `${listId}-outdent-${suffix}`;
      while (findContentBlock(contextBlocks, tailId) || findListBlock(root, tailId)) tailId = `${listId}-outdent-${++suffix}`;
      const visualStyle = owner.nestedList.visualStyle ? { ...owner.nestedList.visualStyle } : undefined;
      if (visualStyle) delete visualStyle.anchor;
      const tail = { ...owner.nestedList, id: tailId, items: followingItems };
      delete tail.editorial;
      if (visualStyle) tail.visualStyle = visualStyle;
      if (tailStart !== undefined) tail.start = tailStart;
      children.push(tail);
    } else {
      children.push({ ...owner.nestedList, items: followingItems,
        ...(tailStart !== undefined ? { start: tailStart } : {}),
      });
    }
  }
  children.push(...followingLists);
  const movedItem = children.length ? { ...(typeof moved === "string" ? { text: moved } : moved), children } : moved;
  let next = updateListItem(root, owner.parentList.id, owner.parentItemIndex, item => {
    const retainedChildren = parentChildren.slice(0, owner.nestedListIndex);
    if (precedingItems.length) retainedChildren.push({ ...owner.nestedList, items: precedingItems,
      ...(prefixStart !== undefined ? { start: prefixStart } : {}),
    });
    const record = { ...(typeof item === "string" ? { text: item } : item) };
    if (retainedChildren.length) record.children = retainedChildren;
    else delete record.children;
    return record;
  });
  next = insertAfter(next, owner.parentList.id, owner.parentItemIndex, movedItem);
  return { block: next, listId: owner.parentList.id, itemIndex: owner.parentItemIndex + 1 };
}

/** Exit an originally empty item without discarding its nested List owners. */
export function exitEmptyListItem(source: Extract<ContentBlock, { type: "list" }>, itemIndex: number, createId: (type: string) => string, contextBlocks: ContentBlock[] = [source]): { blocks: ContentBlock[]; paragraphId: string } | null {
  if (!listItemIsEmpty(source.items[itemIndex] ?? "")) return null;
  return extractListItem(source, itemIndex, createId, contextBlocks);
}

/** Extract the first line on Backspace without normalising away inline objects. */
export function extractFirstListItem(source: Extract<ContentBlock, { type: "list" }>, createId: (type: string) => string, contextBlocks: ContentBlock[] = [source]): { blocks: ContentBlock[]; paragraphId: string } | null {
  return extractListItem(source, 0, createId, contextBlocks);
}

function extractListItem(source: Extract<ContentBlock, { type: "list" }>, itemIndex: number, createId: (type: string) => string, contextBlocks: ContentBlock[]): { blocks: ContentBlock[]; paragraphId: string } | null {
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= Math.max(1, source.items.length)) return null;
  const item = source.items[itemIndex] ?? "";
  const prefix = source.items.slice(0, itemIndex);
  const suffix = source.items.slice(itemIndex + 1);
  const prefixStart = source.style === "ordered" ? listNumber(source, 0) : undefined;
  const suffixStart = source.style === "ordered" ? listNumber(source, itemIndex + 1) : undefined;
  if ((prefix.length && prefixStart !== undefined && !validListStart(prefixStart))
    || (suffix.length && suffixStart !== undefined && !validListStart(suffixStart))) return null;
  const allocated = new Set<string>();
  function allocate(type: string) {
    const candidate = createId(type);
    let id = candidate, sequence = 1;
    while (findContentBlock(contextBlocks, id) || allocated.has(id)) id = `${candidate}-${sequence++}`;
    allocated.add(id);
    return id;
  }
  const retainsListOwner = Boolean(prefix.length || suffix.length);
  const itemStyle = typeof item === "string" ? undefined : item.style;
  // Two distinct anchors cannot be represented by the sole remaining Paragraph.
  if (!retainsListOwner && source.visualStyle?.anchor && itemStyle?.anchor && source.visualStyle.anchor !== itemStyle.anchor) return null;
  const paragraph: ContentBlock = { id: retainsListOwner ? allocate("paragraph") : source.id, type: "paragraph", text: listItemText(item),
    ...(typeof item !== "string" && item.runs ? { runs: item.runs } : {}),
    ...(!retainsListOwner && source.blockAlign ? { blockAlign: source.blockAlign } : {}),
    ...(!retainsListOwner && source.siteRole ? { siteRole: source.siteRole } : {}),
    ...(!retainsListOwner && source.editorial ? { editorial: source.editorial } : {}),
    ...((!retainsListOwner && source.visualStyle) || itemStyle ? { style: { ...(!retainsListOwner ? source.visualStyle : undefined), ...itemStyle } } : {}),
  };
  const blocks: ContentBlock[] = [];
  if (prefix.length) blocks.push({ ...source, items: prefix, ...(prefixStart !== undefined ? { start: prefixStart } : {}) });
  blocks.push(paragraph);
  // Gutenberg promotes its one child List's items into the tail. ACM permits
  // several differently styled/annotated child owners: promote intact wrappers.
  if (typeof item !== "string") blocks.push(...(item.children ?? []));
  if (suffix.length) {
    const tail = { ...source, id: prefix.length ? allocate("list") : source.id, items: suffix,
      ...(suffixStart !== undefined ? { start: suffixStart } : {}),
    };
    if (prefix.length) {
      delete tail.editorial;
      if (tail.visualStyle) { tail.visualStyle = { ...tail.visualStyle }; delete tail.visualStyle.anchor; }
    }
    blocks.push(tail);
  }
  return { blocks, paragraphId: paragraph.id };
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
