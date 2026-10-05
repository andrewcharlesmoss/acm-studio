import type { ContentBlock } from "../content/model";

/** Column and Social Link fragments need their owning container at document level. */
export function copiedBlocksForParent(blocks: ContentBlock[], parentType?: ContentBlock["type"], createId: (prefix: string) => string = () => crypto.randomUUID()): ContentBlock[] {
  if (blocks.length && blocks.every(block => block.type === "column") && parentType !== "columns") {
    return [{ id: createId("columns"), type: "columns", children: blocks as Extract<ContentBlock, { type: "column" }>[] }];
  }
  if (blocks.length && blocks.every(block => block.type === "social-linkedin" || block.type === "social-tiktok") && parentType !== "social-icons") {
    return [{ id: createId("social-icons"), type: "social-icons", children: blocks as Extract<ContentBlock, { type: "social-linkedin" | "social-tiktok" }>[] }];
  }
  return blocks;
}

/** New IDs and anchors prevent pasted blocks colliding with existing content. */
export function cloneBlocksForInsertion(blocks: ContentBlock[], createId: (prefix: string) => string = () => crypto.randomUUID(), remapUnownedFootnotes = false): ContentBlock[] {
  const copies = structuredClone(blocks);
  const noteIds = new Map<string, string>();
  function remapNotes(value: unknown, references = false) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (!references && record.type === "footnotes" && Array.isArray(record.notes)) for (const note of record.notes) {
      const previous = note.id; note.id = createId("footnote"); noteIds.set(previous, note.id);
    }
    if (references && record.type === "footnote" && typeof record.id === "string") {
      // A clipboard reference without recoverable note text must not bind to
      // an unrelated note in its destination. Local duplication retains its
      // existing document owner unless that owner is included in the copy.
      if (!noteIds.has(record.id) && remapUnownedFootnotes) noteIds.set(record.id, createId("footnote"));
      if (noteIds.has(record.id)) record.id = noteIds.get(record.id);
    }
    for (const child of Object.values(record)) if (child && typeof child === "object") remapNotes(child, references);
  }
  remapNotes(copies); remapNotes(copies, true);
  function clone(items: ContentBlock[]) {
    for (const block of items) {
      block.id = createId(block.type);
      if (block.visualStyle) delete block.visualStyle.anchor;
      if ("style" in block && block.style && typeof block.style === "object") delete block.style.anchor;
      if ("children" in block && block.children) clone(block.children);
      if (block.type === "list") for (const item of block.items) if (typeof item !== "string") { if (item.style) delete item.style.anchor; if (item.children) clone(item.children); }
    }
  }
  clone(copies);
  return copies;
}
