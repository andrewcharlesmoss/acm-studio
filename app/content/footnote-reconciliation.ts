import { childContentBlocks } from "./block-tree.ts";
import { footnoteReferenceIds } from "./footnote-blocks.ts";
import { visitRichTextFields } from "./rich-text-fields.ts";
import type { ContentBlock } from "./model";

function notesById(blocks: ContentBlock[]) {
  const notes = new Set<string>();
  function visit(items: ContentBlock[]) {
    for (const block of items) {
      if (block.type === "footnotes") for (const note of block.notes) notes.add(note.id);
      visit(childContentBlocks(block));
    }
  }
  visit(blocks);
  return notes;
}

/** A note belongs to its references; deleting its host must not strand them. */
export function preservesReferencedFootnotes(before: ContentBlock[], after: ContentBlock[]): boolean {
  const previousNotes = notesById(before);
  const nextNotes = notesById(after);
  return footnoteReferenceIds(after, true).every(id => !previousNotes.has(id) || nextNotes.has(id));
}

/** Include hidden content and nested owners when checking a complete selection. */
export function canRemoveFootnoteOwners(blocks: ContentBlock[], removedIds: string[]): boolean {
  const removed = new Set(removedIds);
  const removedOwners = new Set<string>();
  const removedNotes = new Set<string>();
  function visit(items: ContentBlock[], removing = false) {
    for (const block of items) {
      const removingBlock = removing || removed.has(block.id);
      if (removingBlock) {
        removedOwners.add(block.id);
        if (block.type === "footnotes") for (const note of block.notes) removedNotes.add(note.id);
      }
      visit(childContentBlocks(block), removingBlock);
    }
  }
  visit(blocks);
  if (!removedNotes.size) return true;
  // Rich-field owners include List Items and caption/cell fields without
  // assigning them synthetic block IDs.
  let canRemove = true;
  visitRichTextFields(blocks, (runs, field) => {
    if (removedOwners.has(field.blockId)) return;
    for (const run of runs) {
      const ids = run.inline?.type === "footnote" ? [run.inline.id] : (run.marks ?? []).flatMap(mark => typeof mark !== "string" && mark.type === "footnote" ? [mark.id] : []);
      if (ids.some(id => removedNotes.has(id))) canRemove = false;
    }
  });
  return canRemove;
}

/** Reconcile within the caller's single transaction, before history/save. */
export function reconcileFootnoteBlocks(before: ContentBlock[], after: ContentBlock[]): ContentBlock[] | null {
  if (before === after) return after;
  if (!preservesReferencedFootnotes(before, after)) return null;
  const remaining = new Set(footnoteReferenceIds(after, true));
  const removed = new Set(footnoteReferenceIds(before).filter(id => !remaining.has(id)));
  if (!removed.size) return after;
  function reconcile(blocks: ContentBlock[]): ContentBlock[] {
    let changed = false;
    const next = blocks.map(original => {
      let block = original;
      if (block.type === "footnotes") {
        const notes = block.notes.filter(note => !removed.has(note.id));
        if (notes.length !== block.notes.length) block = { ...block, notes };
      }
      if ("children" in block && block.children) {
        const children = reconcile(block.children);
        if (children !== block.children) block = { ...block, children } as ContentBlock;
      }
      if (block.type === "list") {
        const previousItems = block.items;
        const items = previousItems.map(item => {
          if (typeof item === "string" || !item.children) return item;
          const children = reconcile(item.children) as typeof item.children;
          return children === item.children ? item : { ...item, children };
        });
        if (items.some((item, index) => item !== previousItems[index])) block = { ...block, items };
      }
      changed ||= block !== original;
      return block;
    });
    return changed ? next : blocks;
  }
  return reconcile(after);
}
