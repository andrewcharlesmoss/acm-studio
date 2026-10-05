import { listItemText, type ContentBlock, type ListBlock } from "../content/model";
import { childContentBlocks } from "../content/block-tree";
import { editBlockSiblings } from "./block-sibling-operations";
import { extractFirstListItem, listItemIsEmpty } from "./list-structure";

type Focus = { blockId: string; listItemIndex?: number; offset?: number };

function focusInBlock(block: ContentBlock, edge: "start" | "end"): Focus | null {
  if (block.editorial?.hidden) return null;
  if (block.type === "list") {
    const index = edge === "start" ? 0 : Math.max(0, block.items.length - 1);
    const item = block.items[index] ?? "";
    if (edge === "end" && typeof item !== "string") {
      const child = item.children?.slice().reverse().map(child => focusInBlock(child, edge)).find(Boolean);
      if (child) return child;
    }
    return { blockId: block.id, listItemIndex: index, offset: edge === "end" ? listItemText(item).length : 0 };
  }
  const children = childContentBlocks(block);
  const child = (edge === "end" ? children.slice().reverse() : children).map(child => focusInBlock(child, edge)).find(Boolean);
  if (child) return child;
  // Conditional Embed captions and plain controls cannot receive the deferred
  // rich-text caret. Continue to a neighbour with a mounted editor instead.
  if (!["paragraph", "heading", "quote", "button", "table", "image"].includes(block.type)) return null;
  return { blockId: block.id, offset: edge === "end" && "text" in block ? block.text.length : 0 };
}

function neighbouringFocus(siblings: ContentBlock[], index: number, fallback: string): Focus {
  return siblings.slice(0, index).reverse().map(block => focusInBlock(block, "end")).find(Boolean)
    ?? siblings.slice(index + 1).map(block => focusInBlock(block, "start")).find(Boolean)
    ?? { blockId: fallback };
}

function plainWrapper(list: ListBlock): boolean {
  // Outdent removes the nested wrapper. Its authored metadata needs a separate
  // owner, so do not flatten an annotated wrapper into the parent List.
  return Object.entries(list).every(([key, value]) => value === undefined
    || ["id", "type", "items", "style", "marker", "start", "reversed"].includes(key));
}

/** Backspace at the first root line is different from Return in an empty line. */
export function backspaceFirstListItem(blocks: ContentBlock[], source: Extract<ContentBlock, { type: "list" }>, createId: (type: string) => string): { blocks: ContentBlock[]; focus: Focus } | null {
  if (source.editorial?.hidden) return null;
  let focus: Focus | undefined;
  const proposed = editBlockSiblings(blocks, source.id, (siblings, index) => {
    const item = source.items[0] ?? "";
    const children = typeof item === "string" ? [] : item.children ?? [];
    const plainEmpty = listItemIsEmpty(item) && (typeof item === "string" || !Object.keys(item.style ?? {}).length);
    if (plainEmpty && children.length) {
      if (children.every(plainWrapper)) {
        const promoted = { ...source, items: [...children.flatMap(child => child.items), ...source.items.slice(1)] };
        focus = { blockId: source.id, listItemIndex: 0 };
        return [...siblings.slice(0, index), promoted, ...siblings.slice(index + 1)];
      }
      // ACM child wrappers may own colours, anchors and notes. Promote those
      // owners intact, at the same indentation, instead of erasing their data.
      if (source.items.length <= 1 && !plainWrapper(source)) return siblings;
      const extracted = extractFirstListItem(source, createId, blocks);
      if (!extracted) return siblings;
      const promoted = extracted.blocks.slice(1);
      focus = promoted.map(block => focusInBlock(block, "start")).find(Boolean)
        ?? neighbouringFocus(siblings, index, source.id);
      return [...siblings.slice(0, index), ...promoted, ...siblings.slice(index + 1)];
    }
    if (plainEmpty && source.items.length <= 1 && !source.editorial?.note && !source.editorial?.name && !source.siteRole) {
      focus = neighbouringFocus(siblings, index, source.id);
      return [...siblings.slice(0, index), ...siblings.slice(index + 1)];
    }
    const extracted = extractFirstListItem(source, createId, blocks);
    if (!extracted) return siblings;
    focus = { blockId: extracted.paragraphId };
    return [...siblings.slice(0, index), ...extracted.blocks, ...siblings.slice(index + 1)];
  });
  return proposed !== blocks && focus ? { blocks: proposed, focus } : null;
}
