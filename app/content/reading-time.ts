import type { ContentBlock } from "./model";

/** Editorial estimate: 220 words per minute, rounded up to at least one minute. */
export function readingTimeMinutes(blocks: ContentBlock[]): number {
  const words = readingTimeText(blocks).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function readingTimeText(blocks: ContentBlock[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
      case "heading": return block.text;
      case "quote": return `${block.text} ${block.attribution ?? ""}`;
      case "list": return block.items.join(" ");
      case "table": return block.rows.flat().join(" ");
      case "code": return block.code;
      case "button": return block.label;
      case "embed": return block.title;
      case "image": return block.caption ?? "";
      case "divider": return "";
      case "reading-time":
      case "post-author":
      case "post-date": return "";
      case "section":
      case "group":
      case "component": return readingTimeText(block.children ?? []);
    }
  }).join(" ");
}

export function readingTimeLabel(blocks: ContentBlock[]): string {
  const minutes = readingTimeMinutes(blocks);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
