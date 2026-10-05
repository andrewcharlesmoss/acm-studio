import { listItemText, type ContentBlock, type ListBlock } from "../content/model";
import { transformBlock } from "./block-transforms";
import { editBlockSiblings } from "./block-sibling-operations";

type Line = { listId: string; itemIndex: number; offset: number; hidden: boolean };

function listLines(list: ListBlock, hidden = false): Line[] {
  return (list.items.length ? list.items : [""]).flatMap((item, itemIndex) => [
    { listId: list.id, itemIndex, offset: listItemText(item).length, hidden: hidden || Boolean(list.editorial?.hidden) },
    ...(typeof item === "string" ? [] : (item.children ?? []).flatMap(child => listLines(child, hidden || Boolean(list.editorial?.hidden)))),
  ]);
}

/** Final Delete appends the following block's items, rather than joining text. */
export function appendFollowingListItems(blocks: ContentBlock[], root: ListBlock, listId: string, itemIndex: number): { blocks: ContentBlock[]; focus: Line } | null {
  const terminal = listLines(root).at(-1);
  if (!terminal || terminal.hidden || terminal.listId !== listId || terminal.itemIndex !== itemIndex) return null;
  let changed = false;
  const proposed = editBlockSiblings(blocks, root.id, (siblings, index) => {
    if (JSON.stringify(siblings[index]) !== JSON.stringify(root)) return siblings;
    const following = siblings[index + 1];
    if (!following || following.editorial?.hidden || following.siteRole
      || following.editorial?.name || following.editorial?.note
      || following.editorial?.lock?.remove) return siblings;
    if (!["list", "paragraph", "heading"].includes(following.type)) return siblings;
    // A removed wrapper cannot retain its own block-level appearance or identity.
    // List markers deliberately adopt the surviving outer List, as in Gutenberg.
    if (following.type === "list") {
      if (following.visualStyle && JSON.stringify(following.visualStyle) !== JSON.stringify(root.visualStyle)) return siblings;
      if (following.blockAlign && following.blockAlign !== root.blockAlign) return siblings;
    } else if ("align" in following && following.align && following.align !== "left") return siblings;
    const converted = following.type === "list" ? following : transformBlock(following, { id: "list", label: "List", icon: "list", target: "list" });
    if (converted.type !== "list") return siblings;
    // Existing zero-length legacy atoms are not safe to normalise in a transform.
    if ("runs" in following && following.runs?.some(run => !run.text && run.marks?.some(mark => typeof mark !== "string" && ["footnote", "math", "inline-image"].includes(mark.type)))) return siblings;
    const items = converted.items.map((item, position) => {
      if (following.type === "list" || !converted.visualStyle) return item;
      const style = { ...converted.visualStyle };
      if (position) delete style.anchor;
      return { ...(typeof item === "string" ? { text: item } : item), style };
    });
    changed = true;
    return [...siblings.slice(0, index), { ...root, items: [...(root.items.length ? root.items : [""]), ...items] }, ...siblings.slice(index + 2)];
  });
  return changed ? { blocks: proposed, focus: terminal } : null;
}
