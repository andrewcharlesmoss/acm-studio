import { changeGroupLayout, groupVariations, groupVariationFor } from "./blocks/group-variations";
import { listTextLines, type ContentBlock, type HeadingLevel, type ListItem, type RichTextRun, type TextAlignment } from "../content/model";
import { blockAlignmentOptions } from "../content/block-alignment";
import { normaliseTextRuns } from "../content/rich-text";
import type { StudioIconName } from "./studio-icons";
import { groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { editBlockSiblings } from "./block-sibling-operations";
import { validContentBlocks } from "./workspace-validation";
import { findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import { setTextStyleVariation, textStyleVariation, TEXT_STYLE_VARIATIONS, type TextStyleVariation } from "../content/text-style-variations";

export type BlockTransform = { id: string; label: string; icon: StudioIconName; target: "heading" | "list" | "paragraph" | "quote" | "group" | "table" | "divider" | "spacer" | "columns"; layout?: "flow" | "row" | "stack" | "grid"; level?: HeadingLevel; tableStyle?: "default" | "stripes"; quoteStyle?: "default" | "plain"; separatorStyle?: "default" | "wide" | "dots"; textStyle?: TextStyleVariation };

type QuoteBlock = Extract<ContentBlock, { type: "quote" }>;

// Some old records retain recovery text alongside their active children. A
// conversion cannot discard that dormant content or decide which copy to keep.
function hasDormantQuoteContent(block: QuoteBlock) {
  if (!block.children || (!block.text && !block.runs?.length)) return false;
  const child = block.children.length === 1 ? block.children[0] : undefined;
  return !(child?.type === "paragraph" && child.text === block.text
    && JSON.stringify(child.runs ?? []) === JSON.stringify(block.runs ?? []));
}

function quoteHasLockedDescendant(block: ContentBlock): boolean {
  if (block.editorial?.lock?.move || block.editorial?.lock?.remove) return true;
  if ("children" in block && block.children?.some(quoteHasLockedDescendant)) return true;
  if (block.type === "list") return block.items.some(item => typeof item !== "string" && item.children?.some(quoteHasLockedDescendant));
  return false;
}

function canUnwrapQuote(block: QuoteBlock) {
  // Quote-owned appearance and editorial data cannot be represented on a set
  // of sibling paragraphs without overwriting a child's own attributes.
  return !hasDormantQuoteContent(block) && !quoteHasLockedDescendant(block)
    && !block.visualStyle && !block.editorial && !block.siteRole && !block.align && !block.blockAlign
    && (!block.children || block.children.every(child => child.type === "paragraph" || (child.type === "heading" && !child.blockAlign)))
    && Boolean(block.children?.length || block.text || block.runs?.length || block.attribution || block.attributionRuns?.length);
}

function canGroupQuote(block: QuoteBlock) {
  return !hasDormantQuoteContent(block) && !quoteHasLockedDescendant(block) && !block.align
    && (!block.blockAlign || blockAlignmentOptions("group").includes(block.blockAlign))
    && (block.children?.length ?? 1) + (block.attribution || block.attributionRuns?.length ? 1 : 0) <= 100;
}

/** Expand a Quote into real blocks without flattening children or citation. */
export function transformQuoteBlocks(block: QuoteBlock, transform: BlockTransform, makeId: () => string = () => `paragraph-${crypto.randomUUID()}`): ContentBlock[] | null {
  if (transform.id === "wrap-columns" && transform.target === "columns") return quoteHasLockedDescendant(block) ? null : [transformBlock(block, transform, makeId)];
  if (transform.id === "quote-to-paragraph" && !canUnwrapQuote(block)) return null;
  if (transform.id === "quote-to-group" && !canGroupQuote(block)) return null;
  if (transform.id !== "quote-to-paragraph" && transform.id !== "quote-to-group") return null;
  const children: ContentBlock[] = block.children ? [...block.children] : [{ id: makeId(), type: "paragraph", text: block.text, runs: block.runs }];
  if (block.attribution || block.attributionRuns?.length) children.push({ id: makeId(), type: "paragraph", text: block.attribution ?? "", runs: block.attributionRuns });
  if (transform.id === "quote-to-paragraph") return children.map(child => child.type === "heading"
    ? { ...transformBlock(child, { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }), runs: child.runs }
    : child);
  return [{ id: block.id, type: "group", layout: "flow", children, editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle, blockAlign: block.blockAlign }];
}

type ListBlock = Extract<ContentBlock, { type: "list" }>;

function canExpandList(block: ListBlock): boolean {
  // Container presentation, identity roles and editorial attributes have no
  // unambiguous owner after expansion into siblings. Item styles do.
  return !block.visualStyle && !block.editorial && !block.siteRole && !block.blockAlign
    && block.items.length > 0 && block.items.every(item => typeof item === "string"
      || ((!item.runs?.length || item.runs.map(run => run.text).join("") === item.text)
        && (item.children ?? []).every(canExpandList)));
}

/** Gutenberg's parent List conversion emits one text block per item, depth first. */
export function transformListBlocks(block: ListBlock, transform: BlockTransform, makeId: () => string = () => crypto.randomUUID()): ContentBlock[] | null {
  if ((transform.target !== "paragraph" && transform.target !== "heading") || !canExpandList(block)) return null;
  const result: ContentBlock[] = [];
  const append = (list: ListBlock) => {
    for (const item of list.items) {
      const text = typeof item === "string" ? item : item.text;
      const runs = typeof item === "string" ? undefined : item.runs;
      const style = typeof item === "string" ? undefined : item.style;
      result.push(transform.target === "heading"
        ? { id: makeId(), type: "heading", level: transform.level ?? 2, text, runs: runs && structuredClone(runs), visualStyle: style && structuredClone(style) }
        : { id: makeId(), type: "paragraph", text, runs: runs && structuredClone(runs), style: style && structuredClone(style) });
      if (typeof item !== "string") item.children?.forEach(append);
    }
  };
  append(block);
  return result;
}

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

function textCanBecomeList(block: Extract<ContentBlock, { type: "heading" | "paragraph" }>) {
  return !block.align && (!block.runs?.length || block.runs.map(run => run.text).join("") === block.text)
    // A legacy atom encoded on a line separator cannot move into a List item
    // without either losing its reference or inventing a duplicate object.
    && !block.runs?.some(run => /[\r\n]/.test(run.text) && run.marks?.some(mark => typeof mark !== "string" && ["footnote", "math", "inline-image"].includes(mark.type)));
}

function textBlockTransforms(block: ContentBlock): BlockTransform[] {
  if (block.type === "heading") {
    const choices: BlockTransform[] = [...headingTransforms(block.level), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
    // Lists have no text-alignment field or dormant text fallback. Never drop
    // either when converting an older Heading record.
    if (textCanBecomeList(block)) choices.push({ id: "list", label: "List", icon: "list", target: "list" });
    if (!block.editorial?.lock?.move && !block.editorial?.lock?.remove) choices.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }, { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    choices.push(...[{ id: "default", label: "Default" }, ...TEXT_STYLE_VARIATIONS].map(choice => ({ id: `heading-style-${choice.id}`, label: choice.label, icon: "heading" as const, target: "heading" as const, textStyle: choice.id as TextStyleVariation })));
    return choices;
  }
  if (block.type === "list") {
    const choices: BlockTransform[] = canExpandList(block) ? [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }] : [];
    if (!quoteHasLockedDescendant(block)) choices.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }, { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    return choices;
  }
  if (block.type === "paragraph") {
    const transforms: BlockTransform[] = [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
    if (block.type === "paragraph" && !block.editorial?.lock?.move && !block.editorial?.lock?.remove) transforms.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    return transforms.filter(transform => transform.target !== block.type && !(block.type === "paragraph" && transform.target === "list" && !textCanBecomeList(block)));
  }
  if (block.type === "code" || block.type === "button") return [{ id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }];
  return [];
}

/** A transform must remain a valid child of its current container. */
export function availableBlockTransforms(block: ContentBlock, parent?: ContentBlock | null): BlockTransform[] {
  if (block.type === "group" && !block.data?.templateElement && !block.data?.templatePart) return groupVariations.filter(variation => variation.type !== groupVariationFor(block).type).map(variation => ({ id: variation.type, label: variation.label, target: "group", icon: "block", layout: variation.layout as "flow" | "row" | "stack" | "grid" }));
  if (block.type === "quote") {
    const conversions: BlockTransform[] = [];
    if (canUnwrapQuote(block) && (!parent || groupAllowsChild(parent, "paragraph"))) conversions.push({ id: "quote-to-paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" });
    if (canGroupQuote(block) && (!parent || groupAllowsChild(parent, "group"))) conversions.push({ id: "quote-to-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (!quoteHasLockedDescendant(block) && (!parent || groupAllowsChild(parent, "columns"))) conversions.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    return [...conversions, { id: "quote-style-default", label: "Default", icon: "quote", target: "quote", quoteStyle: "default" }, { id: "quote-style-plain", label: "Plain", icon: "quote", target: "quote", quoteStyle: "plain" }];
  }
  if (block.type === "table") {
    const wrap: BlockTransform[] = !block.editorial?.lock?.move && !block.editorial?.lock?.remove && (!parent || groupAllowsChild(parent, "group"))
      ? [{ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }] : [];
    return [...wrap, { id: "table-style-default", label: "Default", icon: "block", target: "table", tableStyle: "default" }, { id: "table-style-stripes", label: "Stripes", icon: "block", target: "table", tableStyle: "stripes" }];
  }
  if (block.type === "image") return !block.editorial?.lock?.move && !block.editorial?.lock?.remove && (!parent || groupAllowsChild(parent, "group"))
    ? [{ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }] : [];
  if (block.type === "divider" || block.type === "spacer") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const target = block.type === "divider" ? "spacer" : "divider";
    // Spacer cannot represent a Separator's authored alignment. Keep that
    // choice recoverable until the alignment is explicitly cleared.
    const canConvert = block.type !== "divider" || !block.blockAlign;
    const conversions: BlockTransform[] = unlocked && canConvert && (!parent || groupAllowsChild(parent, target))
      ? [{ id: `convert-to-${target}`, label: target === "divider" ? "Separator" : "Spacer", icon: "block", target }] : [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) conversions.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) conversions.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    return block.type === "divider" ? [...conversions,
      { id: "separator-style-default", label: "Default", icon: "block", target: "divider", separatorStyle: "default" },
      { id: "separator-style-wide", label: "Wide Line", icon: "block", target: "divider", separatorStyle: "wide" },
      { id: "separator-style-dots", label: "Dots", icon: "block", target: "divider", separatorStyle: "dots" }] : conversions;
  }
  return textBlockTransforms(block).filter(transform => !parent || groupAllowsChild(parent, transform.target));
}

/** Hide structural conversions that cannot be applied to the complete current tree. */
export function availableBlockTransformsInDocument(block: ContentBlock, blocks: ContentBlock[]): BlockTransform[] {
  const choices = availableBlockTransforms(block, parentOfNestedBlock(blocks, block.id));
  if (block.type !== "list" && block.type !== "quote" && block.type !== "image" && block.type !== "spacer" && block.type !== "divider" && block.type !== "heading" && block.type !== "paragraph") return choices;
  return choices.filter(choice => {
    if (block.type !== "list" && block.type !== "heading" && block.type !== "paragraph" && !choice.id.startsWith("quote-to-") && choice.id !== "wrap-group" && choice.id !== "wrap-columns" && !choice.id.startsWith("convert-to-")) return true;
    let index = 0;
    const generated = new Set<string>();
    const previewId = () => {
      let id: string;
      do { id = `quote-transform-preview-${index++}`; } while (generated.has(id) || findContentBlock(blocks, id));
      generated.add(id);
      return id;
    };
    const replacement = block.type === "quote" ? transformQuoteBlocks(block, choice, previewId)
      : block.type === "list" && (choice.target === "paragraph" || choice.target === "heading") ? transformListBlocks(block, choice, previewId) : [transformBlock(block, choice, previewId)];
    if (!replacement?.length) return false;
    const proposed = editBlockSiblings(blocks, block.id, (siblings, position) => [...siblings.slice(0, position), ...replacement, ...siblings.slice(position + 1)]);
    return proposed !== blocks && validContentBlocks(proposed) && permitsBlockTreeChanges(blocks, proposed) && preservesBlockLocks(blocks, proposed);
  });
}

// Split runs at line boundaries without discarding inline marks, including
// marks that span multiple list items. Empty lines remain empty items.
function listItemsFromRuns(runs: RichTextRun[], preserveRuns = false): ListItem[] {
  const lines: RichTextRun[][] = [[]];
  let previousEndedWithCarriageReturn = false;
  for (const run of runs) {
    const text = previousEndedWithCarriageReturn && run.text.startsWith("\n") ? run.text.slice(1) : run.text;
    if (run.text.length) previousEndedWithCarriageReturn = run.text.endsWith("\r");
    text.split(/\r\n|\r|\n/).forEach((text, index) => {
      if (index > 0) lines.push([]);
      if (text || preserveRuns && run.text === "") lines[lines.length - 1].push({ ...run, text });
    });
  }
  return lines.map(line => {
    const runs = preserveRuns ? line : normaliseTextRuns(line);
    const text = runs.map(run => run.text).join("");
    return runs.some(run => run.inline || run.marks?.length) ? { text, runs } : text;
  });
}

export function transformBlock(block: ContentBlock, transform: BlockTransform, makeId: () => string = () => crypto.randomUUID()): ContentBlock {
  if (block.type === "group" && transform.target === "group" && transform.layout) return changeGroupLayout(block, transform.layout);
  if ((block.type === "quote" || block.type === "list" || block.type === "heading" || block.type === "spacer" || block.type === "divider") && transform.id === "wrap-columns" && transform.target === "columns") {
    return { id: makeId(), type: "columns", children: [{ id: makeId(), type: "column", width: 100, children: [block] }],
      ...("blockAlign" in block && (block.blockAlign === "wide" || block.blockAlign === "full") ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "quote") {
    if (transform.target === "quote" && transform.quoteStyle) return (block.quoteStyle ?? "default") === transform.quoteStyle ? block : { ...block, quoteStyle: transform.quoteStyle };
    // Quote conversions are one-to-many and must use transformQuoteBlocks.
    return block;
  }
  if ((block.type === "list" || block.type === "paragraph" || block.type === "heading" || block.type === "table" || block.type === "image" || block.type === "spacer" || block.type === "divider") && transform.id === "wrap-group" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", children: [block],
      ...("blockAlign" in block && (block.blockAlign === "wide" || block.blockAlign === "full") ? { blockAlign: block.blockAlign } : {}) };
  }

  if (block.type === "heading") {
    if (transform.target === "heading") {
      if (transform.textStyle) return textStyleVariation(block.visualStyle) === transform.textStyle ? block : { ...block, visualStyle: setTextStyleVariation(block.visualStyle, transform.textStyle) };
      return !transform.level || transform.level === block.level ? block : { ...block, level: transform.level };
    }
    const { level: _level, ...content } = block;
    if (transform.target === "paragraph" || transform.target === "quote") return { ...content, type: transform.target };
    if (transform.target === "list" && textCanBecomeList(block)) {
      const { text: _text, runs: _runs, align: _align, ...common } = content;
      return { ...common, type: "list", style: "unordered", items: listItemsFromRuns(block.runs?.length ? block.runs : [{ text: block.text }], true) };
    }
    return block;
  }
  if (block.type === "divider" && transform.id === "convert-to-spacer" && transform.target === "spacer") return { id: block.id, type: "spacer", height: 100, editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle };
  if (block.type === "spacer" && transform.id === "convert-to-divider" && transform.target === "divider") return { id: block.id, type: "divider", editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle };
  if (block.type === "divider" && transform.target === "divider" && transform.separatorStyle) return (block.style ?? "default") === transform.separatorStyle ? block : { ...block, style: transform.separatorStyle };
  if (block.type === "table" && transform.target === "table" && transform.tableStyle) {
    if ((block.tableStyle ?? "default") === transform.tableStyle) return block;
    return { ...block, tableStyle: transform.tableStyle };
  }
  if (block.type === "paragraph") {
    // Paragraph's inner style takes precedence over its optional outer style.
    // The other text blocks hold that same presentation in visualStyle.
    const mergedStyle = { ...block.visualStyle, ...block.style };
    const visualStyle = Object.keys(mergedStyle).length ? structuredClone(mergedStyle) : undefined;
    const { style: _style, ...content } = block;
    if (transform.target === "heading") return { ...content, type: "heading", level: transform.level ?? 2, visualStyle };
    if (transform.target === "quote") return { ...content, type: "quote", visualStyle };
    if (transform.target === "list" && textCanBecomeList(block)) {
      const { text: _text, runs: _runs, align: _align, ...common } = content;
      return { ...common, type: "list", style: "unordered", items: listItemsFromRuns(block.runs?.length ? block.runs : [{ text: block.text }], true), visualStyle };
    }
    return block;
  }
  // A List expansion cannot be represented by this single-block API.
  if (block.type === "list") return block;
  const text = textFromBlock(block);
  const sourceRuns = block.type === "button" && block.labelRuns?.length ? block.labelRuns
    : [{ text }];
  const runs = normaliseTextRuns(sourceRuns);
  const style = block.visualStyle;
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
  if (transform.target === "quote") return { ...common, type: "quote", text, runs, align, visualStyle };
  return { ...common, type: "paragraph", text, runs, align, style: visualStyle };
}
