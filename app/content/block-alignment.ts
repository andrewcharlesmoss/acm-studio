import type { BlockAlignment, ContentBlock } from "./model";

const widthAlignments = ["wide", "full"] as const;
const floatedAlignments = ["left", "center", "right", "wide", "full"] as const;
const quoteAlignments = ["left", "right", "wide", "full"] as const;

export const blockAlignmentSupport = {
  paragraph: widthAlignments,
  heading: widthAlignments,
  quote: quoteAlignments,
  list: widthAlignments,
  table: floatedAlignments,
  code: ["wide"],
  image: floatedAlignments,
  embed: floatedAlignments,
  divider: ["center", "wide", "full"],
  group: widthAlignments,
  columns: widthAlignments,
  "document-title": widthAlignments,
  "cover-image": floatedAlignments,
} satisfies Partial<Record<ContentBlock["type"], readonly BlockAlignment[]>>;

export function blockAlignmentOptions(type: ContentBlock["type"]): readonly BlockAlignment[] {
  return blockAlignmentSupport[type as keyof typeof blockAlignmentSupport] ?? [];
}

export function contentBlockAlignment(block: ContentBlock): BlockAlignment | undefined {
  if ("blockAlign" in block && block.blockAlign) return block.blockAlign;
  return block.type === "image" && block.wide ? "wide" : undefined;
}

export function blockAlignmentClass(block: ContentBlock): string | undefined {
  const alignment = contentBlockAlignment(block);
  return alignment ? `align${alignment}` : undefined;
}
