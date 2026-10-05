import { containsRichTextInlineObjects, containsExtendedLanguage } from "../content/rich-text-contract";
import { footnoteReferenceIds, migrateLegacyFootnoteBlocks } from "../content/footnote-blocks";
import { childContentBlocks, findContentBlock } from "../content/block-tree";
import type { ContentBlock, Footnote } from "../content/model";
import { validContentBlocks } from "./workspace-validation";
import { blocksToHtml } from "./studio-html-editor";
import { cloneBlocksForInsertion, copiedBlocksForParent } from "./block-copy";

const marker = "data-acm-studio-blocks";
const maximumClipboardLength = 2 * 1024 * 1024;

export type BlockClipboardPayload = { blocks: ContentBlock[]; footnotes: Footnote[] };

function notesInBlocks(blocks: ContentBlock[]): Map<string, Footnote> {
  const notes = new Map<string, Footnote>();
  function visit(items: ContentBlock[]) {
    for (const block of items) {
      if (block.type === "footnotes") for (const note of block.notes) notes.set(note.id, note);
      visit(childContentBlocks(block));
    }
  }
  visit(blocks);
  return notes;
}

/** Only referenced notes outside the selection travel as document-owned companions. */
export function createBlockClipboardPayload(blocks: ContentBlock[], documentBlocks: ContentBlock[] = blocks): BlockClipboardPayload {
  const ownedNotes = notesInBlocks(blocks);
  const sourceNotes = notesInBlocks(documentBlocks);
  const footnotes = [...new Set(footnoteReferenceIds(blocks, true))]
    .filter(id => !ownedNotes.has(id)).flatMap(id => sourceNotes.has(id) ? [sourceNotes.get(id)!] : []);
  return { blocks, footnotes };
}

function companionBlock(payload: BlockClipboardPayload): Extract<ContentBlock, { type: "footnotes" }> {
  let id = "clipboard-footnotes";
  while (findContentBlock(payload.blocks, id)) id += "-owner";
  return { id, type: "footnotes", notes: payload.footnotes };
}

export function blockClipboardHtml(blocks: ContentBlock[], documentBlocks: ContentBlock[] = blocks) {
  const content = createBlockClipboardPayload(blocks, documentBlocks);
  const payload = JSON.stringify({ format: "acm-studio-blocks", version: 4, ...content });
  const escaped = payload.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const portable = content.footnotes.length ? [...blocks, companionBlock(content)] : blocks;
  return `<div ${marker}="${escaped}">${blocksToHtml(portable)}</div>`;
}

export function readBlockClipboardPayload(html: string): BlockClipboardPayload | null {
  if (html.length > maximumClipboardLength || !html.includes(marker)) return null;
  const element = new DOMParser().parseFromString(html, "text/html").querySelector(`[${marker}]`);
  try {
    const value = JSON.parse(element?.getAttribute(marker) ?? "null");
    if (value?.format !== "acm-studio-blocks" || ![1, 2, 3, 4].includes(value.version)
      || value.version === 1 && containsRichTextInlineObjects(value.blocks)
      || value.version !== 4 && (containsRichTextInlineObjects(value.blocks, "math") || containsRichTextInlineObjects(value.blocks, "image") || containsExtendedLanguage(value.blocks))
      || !Array.isArray(value.blocks) || !value.blocks.length || value.blocks.length > 1000
      || value.blocks.some((block: unknown) => block === null || typeof block !== "object")) return null;
    const footnotes = value.version >= 3 ? value.footnotes : [];
    if (!Array.isArray(footnotes) || footnotes.length > 1000) return null;
    const payload = { blocks: value.blocks, footnotes };
    const complete = [...copiedBlocksForParent(payload.blocks), ...(footnotes.length ? [companionBlock(payload)] : [])];
    if (!validContentBlocks(complete)) return null;
    const owned = notesInBlocks(payload.blocks);
    const references = new Set(footnoteReferenceIds(payload.blocks, true));
    if (footnotes.some(note => owned.has(note.id) || !references.has(note.id))) return null;
    return { blocks: migrateLegacyFootnoteBlocks(payload.blocks), footnotes };
  } catch { return null; }
}

/** Legacy consumers receive a self-contained block list. Canvas retains companion placement. */
export function readBlockClipboard(html: string): ContentBlock[] | null {
  const payload = readBlockClipboardPayload(html);
  return payload ? payload.footnotes.length ? [...payload.blocks, companionBlock(payload)] : payload.blocks : null;
}

export function cloneClipboardPayloadForInsertion(payload: BlockClipboardPayload, createId: (prefix: string) => string = () => crypto.randomUUID()): BlockClipboardPayload {
  const complete = [...payload.blocks, ...(payload.footnotes.length ? [companionBlock(payload)] : [])];
  const copies = cloneBlocksForInsertion(complete, createId, true);
  const companion = payload.footnotes.length ? copies.pop() as Extract<ContentBlock, { type: "footnotes" }> : null;
  return { blocks: copies, footnotes: companion?.notes ?? [] };
}

// Compatibility API for clipboard consumers; duplication shares the pure clone contract.
export { cloneBlocksForInsertion as cloneClipboardBlocks } from "./block-copy";

export async function writeBlockClipboard(blocks: ContentBlock[], documentBlocks: ContentBlock[] = blocks) {
  const html = blockClipboardHtml(blocks, documentBlocks);
  // A successful Cut must leave a payload that our own paste boundary accepts.
  if (!readBlockClipboardPayload(html)) throw new Error("The block selection exceeds the supported clipboard contract.");
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([html], { type: "text/plain" }) })]);
  } else await navigator.clipboard.writeText(html);
}
