import { readableRichText } from "./footnote-runs";
import { visibleFootnoteNumbers } from "./footnote-blocks";
import { visibleListText } from "./block-editorial";
import { type ContentBlock } from "./model";

/** Editorial estimate: 220 words per minute, rounded up to at least one minute. */
export function readingTimeMinutes(blocks: ContentBlock[]): number {
  const words = contentWordCount(blocks);
  return Math.max(1, Math.ceil(words / 220));
}

export function contentWordCount(blocks: ContentBlock[]): number {
  return readingTimeText(blocks).trim().split(/\s+/).filter(Boolean).length;
}

function readingTimeText(blocks: ContentBlock[], footnoteNumbers = visibleFootnoteNumbers(blocks)): string {
  return blocks.map((block) => {
    if (block.editorial?.hidden) return "";
    switch (block.type) {
      case "paragraph":
      case "heading": return readableRichText(block.text, block.runs);
      case "quote": return `${block.children ? readingTimeText(block.children, footnoteNumbers) : readableRichText(block.text, block.runs)} ${readableRichText(block.attribution, block.attributionRuns)}`;
      case "list": return visibleListText(block.items);
      case "table": return `${readableRichText(block.caption, block.captionRuns)} ${block.rows.flatMap((row, r) => row.map((cell, c) => readableRichText(cell, block.cellRuns?.[r]?.[c]))).join(" ")}`;
      case "code": return block.code;
      case "button": return readableRichText(block.label, block.labelRuns);
      case "embed": return `${block.title} ${readableRichText(block.caption, block.captionRuns)}`;
      case "image": return readableRichText(block.caption, block.captionRuns);
      case "field": return `${block.label} ${block.value}`;
      case "footnotes": return block.notes.filter(note => footnoteNumbers.has(note.id)).map(note => note.text).join(" ");
      case "social-icons":
      case "social-linkedin":
      case "social-tiktok":
      case "divider": return "";
      case "reading-time":
      case "post-author":
      case "post-date": return "";
      case "document-title":
      case "document-subtitle":
      case "cover-image": return "";
      case "buttons":
      case "section":
      case "group":
      case "columns":
      case "column":
      case "component": return readingTimeText(block.children ?? [], footnoteNumbers);
    }
  }).join(" ");
}

export function readingTimeLabel(blocks: ContentBlock[]): string {
  const minutes = readingTimeMinutes(blocks);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/** ACM estimate: preserve 220 wpm by default; range uses 200–250 wpm. */
export function readingTimeDisplay(blocks: ContentBlock[], options: { mode?: "time" | "words"; showRange?: boolean }) {
  const words = contentWordCount(blocks);
  if (options.mode === "words") return `${words} ${words === 1 ? "word" : "words"}`;
  if (!options.showRange) return readingTimeLabel(blocks);
  const lower = Math.max(1, Math.ceil(words / 250));
  const upper = Math.max(1, Math.ceil(words / 200));
  return lower === upper ? `${lower} ${lower === 1 ? "minute" : "minutes"}` : `${lower}–${upper} minutes`;
}
