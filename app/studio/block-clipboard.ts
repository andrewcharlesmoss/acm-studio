import { containsButtonsAlignment } from "../content/buttons-alignment";
import { containsCoreSocialLink } from "../content/social-services";
import { containsCodeRuns, containsCodeMonospaceFont } from "../content/code-runs";
import { containsCoverBlock, containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource } from "../content/cover-block";
import { containsVideoBlock } from "../content/video-block";
import { containsDetailsPresentation } from "../content/details-block";
import { containsAuthoredAuthorDuotone, containsAuthoredFeaturedImageDuotone, containsAuthoredImageDuotone } from "../content/image-duotone";
import { containsAuthoredFeaturedImageOverlay } from "../content/featured-image-overlay";
import { containsImageResolution } from "../content/image-resolution";
import { containsAuthorBlockPresentation } from "../content/author-profile-presentation";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop } from "../content/image-edit";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing } from "../content/layout";
import { containsGridItemSizing } from "../content/grid-child-sizing";
import { containsColumnWidthUnit } from "../content/columns";
import { containsTemplateContentButtonStyle } from "../content/template-content-button-style";
import { containsQuotePresentation } from "../content/quote-presentation";
import { containsExtendedImageAspectRatio } from "../content/image-aspect-ratios";
import { containsPostDateTimeOverride } from "../content/document-metadata";
import { containsTableCellAlignment } from "../content/table-cell-metadata";
import { containsResponsiveStyles } from "../content/responsive-styles";
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
  const payload = JSON.stringify({ format: "acm-studio-blocks", version: 33, ...content });
  const escaped = payload.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const portable = content.footnotes.length ? [...blocks, companionBlock(content)] : blocks;
  return `<div ${marker}="${escaped}">${blocksToHtml(portable)}</div>`;
}

export function readBlockClipboardPayload(html: string): BlockClipboardPayload | null {
  if (html.length > maximumClipboardLength || !html.includes(marker)) return null;
  const element = new DOMParser().parseFromString(html, "text/html").querySelector(`[${marker}]`);
  try {
    const value = JSON.parse(element?.getAttribute(marker) ?? "null");
    if (value?.version < 33 && containsNativeCoverVideoSource(value)) return null;
    if (value?.version < 32 && containsVideoBlock(value)) return null;
    if (value?.version < 27 && containsCoreSocialLink(value)) return null;
    if (value?.version < 22 && containsCodeMonospaceFont(value)) return null;
    if (value?.version < 23 && containsCoverBlock(value)) return null;
    if (value?.version < 31 && containsCoverVideoBackground(value)) return null;
    if (value?.version < 30 && containsAuthoredCoverCrop(value)) return null;
    if (value?.version < 29 && containsCoverInnerContentWidth(value)) return null;
    if (value?.version < 28 && containsCoverContentPosition(value)) return null;
    if (value?.version < 25 && containsAuthorBlockPresentation(value)) return null;
    if (value?.version < 26 && containsAuthoredAuthorDuotone(value)) return null;
    if (value?.version < 24 && containsAuthoredImageCrop(value)) return null;
    if (value?.version < 21 && containsCodeRuns(value)) return null;
    if (value?.format !== "acm-studio-blocks" || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version)
      || value.version < 20 && containsGridItemSizing(value)
      || value.version < 17 && containsPostDateTimeOverride(value)
      || value.version < 16 && containsColumnWidthUnit(value)
      || value.version < 10 && containsButtonsAlignment(value)
      || value.version < 12 && containsImageResolution(value)
      || value.version < 13 && containsGroupGridFillAvailableSpace(value)
      || value.version < 15 && containsFlexItemSizing(value)
      || value.version < 14 && containsTemplateContentButtonStyle(value)
      || ![5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version) && containsResponsiveStyles(value)
      || ![6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version) && containsTableCellAlignment(value)
      || ![7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version) && containsExtendedImageAspectRatio(value)
      || ![8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version) && containsQuotePresentation(value)
      || value.version < 9 && containsAuthoredImageDuotone(value)
      || value.version < 11 && containsAuthoredFeaturedImageDuotone(value)
      || value.version < 19 && containsDetailsPresentation(value)
      || value.version < 18 && containsAuthoredFeaturedImageOverlay(value)
      || value.version === 1 && containsRichTextInlineObjects(value.blocks)
      || ![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(value.version) && (containsRichTextInlineObjects(value.blocks, "math") || containsRichTextInlineObjects(value.blocks, "image") || containsExtendedLanguage(value.blocks))
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
