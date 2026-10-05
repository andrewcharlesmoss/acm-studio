import { readableRichText } from "./footnote-runs.ts";
import type { ContentBlock, ListItem } from "./model";
import { childContentBlocks } from "./block-tree.ts";

export type BlockEditorial = {
  name?: string;
  note?: string;
  hidden?: boolean;
  lock?: { move?: boolean; remove?: boolean };
};

export function validBlockEditorial(value: unknown): value is BlockEditorial | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !["name", "note", "hidden", "lock"].includes(key))) return false;
  if (record.name !== undefined && (typeof record.name !== "string" || record.name.length > 100)) return false;
  if (record.note !== undefined && (typeof record.note !== "string" || record.note.length > 4000)) return false;
  if (record.hidden !== undefined && typeof record.hidden !== "boolean") return false;
  if (record.lock !== undefined) {
    if (!record.lock || typeof record.lock !== "object" || Array.isArray(record.lock)) return false;
    const lock = record.lock as Record<string, unknown>;
    if (Object.keys(lock).some(key => key !== "move" && key !== "remove") || Object.values(lock).some(value => typeof value !== "boolean")) return false;
  }
  return true;
}

/** Insertions may shift indices; movement means changing parent or relative sibling order. */
export function preservesBlockLocks(before: ContentBlock[], after: ContentBlock[]): boolean {
  type Position = { block: ContentBlock; parent: string | null; siblings: string[] };
  function index(blocks: ContentBlock[], parent: string | null = null, result = new Map<string, Position>()) {
    const siblings = blocks.map(block => block.id);
    for (const block of blocks) {
      result.set(block.id, { block, parent, siblings });
      if (block.type !== "list") index(childContentBlocks(block), block.id, result);
      if (block.type === "list") for (const [itemIndex, item] of block.items.entries()) if (typeof item !== "string" && item.children) index(item.children, `${block.id}:item:${itemIndex}`, result);
    }
    return result;
  }
  const oldPositions = index(before);
  const newPositions = index(after);
  for (const [id, old] of oldPositions) {
    const next = newPositions.get(id);
    if (old.block.editorial?.lock?.remove && !next) return false;
    if (!old.block.editorial?.lock?.move || !next) continue;
    if (old.parent !== next.parent) return false;
    const common = old.siblings.filter(sibling => next.siblings.includes(sibling));
    const oldIndex = common.indexOf(id);
    for (const sibling of common) {
      if ((common.indexOf(sibling) < oldIndex) !== (next.siblings.indexOf(sibling) < next.siblings.indexOf(id))) return false;
    }
  }
  return true;
}

/** Publication snapshots retain visibility, but contain no private authoring notes or names. */
export function publicationBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map(block => {
    const next = { ...block, editorial: block.editorial?.hidden ? { hidden: true } : undefined } as ContentBlock;
    if ("children" in next && next.children) next.children = publicationBlocks(next.children) as typeof next.children;
    if (next.type === "list") next.items = next.items.map(item => typeof item === "string" || !item.children ? item : { ...item, children: publicationBlocks(item.children) as typeof item.children });
    return next;
  });
}

export function visibleListText(items: ListItem[]): string {
  return items.map(item => typeof item === "string" ? item : `${readableRichText(item.text, item.runs)} ${(item.children ?? []).filter(list => !list.editorial?.hidden).map(list => visibleListText(list.items)).join(" ")}`).join(" ").trim();
}
