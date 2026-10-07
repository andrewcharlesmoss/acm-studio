import { changeGroupLayout, groupVariations, groupVariationFor } from "./blocks/group-variations";
import { listTextLines, listTextRuns, type ContentBlock, type HeadingLevel, type ListItem, type RichTextRun, type TextAlignment } from "../content/model";
import { blockAlignmentOptions } from "../content/block-alignment";
import { normaliseTextRuns } from "../content/rich-text";
import type { StudioIconName } from "./studio-icons";
import { groupAllowsChild } from "./block-inserter-options";

export type BlockTransform = { id: string; label: string; icon: StudioIconName; target: "heading" | "list" | "paragraph" | "quote" | "group"; layout?: "flow" | "row" | "stack" | "grid"; level?: HeadingLevel };

function textFromBlock(block: ContentBlock): string {
  if (block.type === "quote" && block.children) return block.children.map(textFromBlock).join("\n");
  if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return block.text;
  if (block.type === "list") return listTextLines(block.items).join("\n");
  if (block.type === "code") return block.code;
  if (block.type === "button") return block.label;
  return "";
}

function headingTransforms(excludeLevel?: HeadingLevel): BlockTransform[] {
  return ([1, 2, 3, 4, 5, 6] as HeadingLevel[]).filter((level) => level !== excludeLevel).map((level) => ({ id: `heading-${level}`, label: `Heading ${level}`, icon: "heading", target: "heading", level }));
}

function textBlockTransforms(block: ContentBlock): BlockTransform[] {
  if (block.type === "heading") return [...headingTransforms(block.level), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
  if (block.type === "quote" && block.children?.some(child => !["paragraph", "heading", "list"].includes(child.type))) return [];
  if (block.type === "paragraph" || block.type === "quote" || block.type === "list") {
    const transforms: BlockTransform[] = [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
    return transforms.filter((transform) => transform.target !== block.type);
  }
  if (block.type === "code" || block.type === "button") return [{ id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }];
  return [];
}

/** A transform must remain a valid child of its current container. */
export function availableBlockTransforms(block: ContentBlock, parent?: ContentBlock | null): BlockTransform[] {
  if (block.type === "group" && !block.data?.templateElement && !block.data?.templatePart) return groupVariations.filter(variation => variation.type !== groupVariationFor(block).type).map(variation => ({ id: variation.type, label: variation.label, target: "group", icon: "block", layout: variation.layout as "flow" | "row" | "stack" | "grid" }));
  return textBlockTransforms(block).filter(transform => !parent || groupAllowsChild(parent, transform.target));
}

// Split runs at line boundaries without discarding inline marks, including
// marks that span multiple list items. Empty lines remain empty items.
function listItemsFromRuns(runs: RichTextRun[]): ListItem[] {
  const lines: RichTextRun[][] = [[]];
  let previousEndedWithCarriageReturn = false;
  for (const run of runs) {
    const text = previousEndedWithCarriageReturn && run.text.startsWith("\n") ? run.text.slice(1) : run.text;
    previousEndedWithCarriageReturn = run.text.endsWith("\r");
    text.split(/\r\n|\r|\n/).forEach((text, index) => {
      if (index > 0) lines.push([]);
      if (text) lines[lines.length - 1].push({ ...run, text });
    });
  }
  return lines.map(line => {
    const runs = normaliseTextRuns(line);
    const text = runs.map(run => run.text).join("");
    return runs.some(run => run.inline || run.marks?.length) ? { text, runs } : text;
  });
}

export function transformBlock(block: ContentBlock, transform: BlockTransform): ContentBlock {
  if (block.type === "group" && transform.target === "group" && transform.layout) return changeGroupLayout(block, transform.layout);
  const text = textFromBlock(block);
  const sourceRuns = block.type === "quote" && block.children ? block.children.flatMap((child, index) => [...(index ? [{ text: "\n" }] : []), ...(child.type === "list" ? listTextRuns(child.items) : "runs" in child && child.runs?.length ? child.runs : [{ text: textFromBlock(child) }])])
    : block.type === "list" ? listTextRuns(block.items)
    : block.type === "button" && block.labelRuns?.length ? block.labelRuns
    : "runs" in block && block.runs?.length ? block.runs : [{ text }];
  const runs = normaliseTextRuns(sourceRuns);
  // Paragraph's inner style takes precedence over its optional outer style.
  // Other text blocks store the same presentation in visualStyle.
  const style = block.type === "paragraph"
    ? { ...block.visualStyle, ...block.style } : block.visualStyle;
  const visualStyle = style && Object.keys(style).length ? structuredClone(style) : undefined;
  const align: TextAlignment | undefined = "align" in block ? block.align : undefined;
  const common = {
    id: block.id,
    siteRole: block.siteRole,
    editorial: block.editorial,
    ...("blockAlign" in block && block.blockAlign && blockAlignmentOptions(transform.target).includes(block.blockAlign) ? { blockAlign: block.blockAlign } : {}),
  };
  if (transform.target === "heading") return { ...common, type: "heading", level: transform.level ?? 2, text, runs, align, visualStyle };
  if (transform.target === "list") return { ...common, type: "list", style: "unordered", items: listItemsFromRuns(runs), visualStyle };
  if (transform.target === "quote") return { ...common, type: "quote", text, runs, align, visualStyle,
    ...(block.type === "quote" ? { attribution: block.attribution, quoteStyle: block.quoteStyle } : {}) };
  return { ...common, type: "paragraph", text, runs, align, style: visualStyle };
}
