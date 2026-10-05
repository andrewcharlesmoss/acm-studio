import type { ContentBlock, Footnote } from "../content/model";
import { childContentBlocks, findContentBlock } from "../content/block-tree";
import { validFootnoteId } from "../content/footnote-runs";
import { editBlockSiblings } from "./block-sibling-operations";

/** Build one document transaction; the caller validates and commits it once. */
export function addDocumentFootnote(blocks: ContentBlock[], source: ContentBlock, noteId: string, newNotesBlockId: string): { blocks: ContentBlock[]; notesBlockId: string } | null {
  return addDocumentFootnotes(blocks, source, [{ id: noteId, text: "" }], newNotesBlockId);
}

/** Clipboard imports and caret insertion share the document's visible notes owner. */
export function addDocumentFootnotes(blocks: ContentBlock[], source: ContentBlock, notes: Footnote[], newNotesBlockId: string): { blocks: ContentBlock[]; notesBlockId: string } | null {
  const noteIds = new Set(notes.map(note => note.id));
  if (!findContentBlock(blocks, source.id) || !notes.length || noteIds.size !== notes.length
    || notes.some(note => !validFootnoteId(note.id) || typeof note.text !== "string")) return null;
  const queue = blocks.map(block => ({ block, hidden: false }));
  let notesBlock: Extract<ContentBlock, { type: "footnotes" }> | undefined;
  while (queue.length) {
    const entry = queue.shift()!;
    const block = entry.block;
    const hidden = entry.hidden || Boolean(block.editorial?.hidden);
    if (block.type === "footnotes" && block.notes.some(note => noteIds.has(note.id))) return null;
    if (!hidden && block.type === "footnotes" && !notesBlock) notesBlock = block;
    queue.push(...childContentBlocks(block).map(child => ({ block: child, hidden })));
  }
  if (!notesBlock && (!newNotesBlockId || findContentBlock(blocks, newNotesBlockId))) return null;
  const replaced = editBlockSiblings(blocks, source.id, (siblings, index) => siblings.map((block, position) => position === index ? source : block));
  if (notesBlock) {
    const id = notesBlock.id;
    return { blocks: editBlockSiblings(replaced, id, (siblings, index) => siblings.map((block, position) => position === index ? { ...notesBlock!, notes: [...notesBlock!.notes, ...notes] } : block)), notesBlockId: id };
  }
  return { blocks: [...replaced, { id: newNotesBlockId, type: "footnotes", notes }], notesBlockId: newNotesBlockId };
}
