import { changeGroupLayout, groupVariations, groupVariationFor } from "./blocks/group-variations";
import { listTextLines, type ColumnBlock, type ContentBlock, type HeadingLevel, type ListItem, type ParagraphStyle, type RichTextRun, type TextAlignment } from "../content/model";
import { blockAlignmentOptions } from "../content/block-alignment";
import { normaliseTextRuns, plainTextFromRuns, safeTextLink, withoutInteractiveTextMarks } from "../content/rich-text";
import type { StudioIconName } from "./studio-icons";
import { groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { editBlockSiblings } from "./block-sibling-operations";
import { validContentBlocks } from "./workspace-validation";
import { findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import { setTextStyleVariation, textStyleVariation, TEXT_STYLE_VARIATIONS, type TextStyleVariation } from "../content/text-style-variations";
import { styleHasQuotePresentation } from "../content/quote-presentation";
import { safeVideoSource } from "../content/video-block";

export type BlockTransform = { id: string; label: string; icon: StudioIconName; target: "heading" | "list" | "paragraph" | "quote" | "pullquote" | "code" | "group" | "table" | "separator" | "spacer" | "columns" | "button" | "buttons" | "social-icons" | "cover" | "image" | "video"; buttonStyle?: "primary" | "secondary"; layout?: "flow" | "row" | "stack" | "grid"; level?: HeadingLevel; tableStyle?: "default" | "stripes"; quoteStyle?: "default" | "plain"; separatorStyle?: "default" | "wide" | "dots"; textStyle?: TextStyleVariation; paragraphPresentation?: "default" | "preformatted" | "poetry"; socialStyle?: "default" | "logos-only" | "pill-shape" };

type QuoteBlock = Extract<ContentBlock, { type: "quote" | "pullquote" }>;

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

function canQuoteBecomePoetry(block: QuoteBlock) {
  const children = block.children;
  return !hasDormantQuoteContent(block) && !quoteHasLockedDescendant(block)
    && !block.align && !block.blockAlign && !block.visualStyle && !block.editorial && !block.siteRole
    && !block.attribution && !block.attributionRuns?.length
    && Boolean(children?.length)
    && (children ?? []).every(child => child.type === "paragraph"
      && (!child.runs?.length || child.runs.map(run => run.text).join("") === child.text)
      && !child.align && !child.blockAlign && !child.style && !child.visualStyle && !child.editorial && !child.siteRole);
}

function canQuoteBecomePullquote(block: QuoteBlock) {
  return !hasDormantQuoteContent(block) && !quoteHasLockedDescendant(block)
    && (!block.children || block.children.every(child => child.type === "paragraph"));
}

function canGroupQuote(block: QuoteBlock) {
  return !hasDormantQuoteContent(block) && !quoteHasLockedDescendant(block) && !block.align
    && (block.quoteStyle ?? "default") === "default" && !styleHasQuotePresentation(block.visualStyle)
    && (!block.blockAlign || blockAlignmentOptions("group").includes(block.blockAlign))
    && (block.children?.length ?? 1) + (block.attribution || block.attributionRuns?.length ? 1 : 0) <= 100;
}

/** Match Gutenberg's no-URL case while keeping ACM's native and provider sources distinct. */
function canCoverBecomeEmptyVideo(block: Extract<ContentBlock, { type: "cover" }>) {
  return block.nativeVideoUrl === undefined && block.videoBackground === undefined
    && !block.src.trim() && !block.mediaId
    && block.visualStyle?.backgroundColor === undefined
    && block.visualStyle?.backgroundGradient === undefined;
}

/** Apply Quote conversions, retaining the original record when Group cannot represent its attributes. */
export function transformQuoteBlocks(block: QuoteBlock, transform: BlockTransform, makeId: () => string = () => `paragraph-${crypto.randomUUID()}`): ContentBlock[] | null {
  if (transform.id === "wrap-columns" && transform.target === "columns") return quoteHasLockedDescendant(block) ? null : [transformBlock(block, transform, makeId)];
  if (transform.id === "quote-to-paragraph" && !canUnwrapQuote(block)) return null;
  if ((transform.id === "quote-to-group" || transform.id === "quote-to-details") && quoteHasLockedDescendant(block)) return null;
  if (transform.id === "quote-to-poetry" && !canQuoteBecomePoetry(block)) return null;
  if (transform.id === "quote-to-pullquote") {
    if (!canQuoteBecomePullquote(block)) return null;
    return [{ ...block, type: "pullquote", quoteStyle: "plain", align: "centre" }];
  }
  if (transform.id === "quote-to-quote") return [{ ...block, type: "quote" }];
  if (transform.id === "quote-to-group") {
    if (canGroupQuote(block)) {
      const children: ContentBlock[] = block.children ? [...block.children] : [{ id: makeId(), type: "paragraph", text: block.text, runs: block.runs }];
      if (block.attribution || block.attributionRuns?.length) children.push({ id: makeId(), type: "paragraph", text: block.attribution ?? "", runs: block.attributionRuns });
      return [{ id: block.id, type: "group", layout: "flow", children, editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle,
        ...(block.blockAlign ? { blockAlign: block.blockAlign } : {}) }];
    }
    return [{ id: makeId(), type: "group", layout: "flow", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) }];
  }
  if (transform.id === "quote-to-details") {
    return [{ id: makeId(), type: "group", layout: "flow", tagName: "details", detailsSummary: "Details", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) }];
  }
  if (transform.id === "quote-to-poetry") {
    const runs = (block.children ?? []).flatMap((child, index) => [
      ...(index ? [{ text: "\n" }] : []),
      ...(child.type === "paragraph" && child.runs?.length ? child.runs : [{ text: child.type === "paragraph" ? child.text : "" }]),
    ]);
    const className = "is-poetry";
    return [{ id: block.id, type: "paragraph", text: runs.map(run => run.text).join(""), runs, visualStyle: { className } }];
  }
  if (transform.id !== "quote-to-paragraph") return null;
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
  if ((block.type === "quote" || block.type === "pullquote") && block.children) return block.children.map(textFromBlock).join("\n");
  if (block.type === "paragraph" || block.type === "heading" || (block.type === "quote" || block.type === "pullquote")) return block.text;
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

function textCanBecomeCode(block: Extract<ContentBlock, { type: "paragraph" }>) {
  return !block.align && (!block.runs?.length || block.runs.every(run => !run.inline
    && (run.marks ?? []).every(mark => typeof mark === "string" ? mark === "bold" || mark === "italic"
      : mark.type === "link" && safeTextLink(mark.url) === mark.url)
    && block.runs!.map(run => run.text).join("") === block.text));
}

const buttonGroupTextStyleFields = new Set(["fontFamily", "fontSize", "fontSizeCustom", "appearance", "textTransform", "textDecoration", "lineHeight", "letterSpacing", "textColor"]);

function paragraphButtonTransform(block: Extract<ContentBlock, { type: "paragraph" }>) {
  if (block.text.length > 30 || /[\r\n]/.test(block.text)) return null;
  const runs = block.runs ?? [{ text: block.text }];
  if (plainTextFromRuns(runs) !== block.text || runs.some(run => run.inline?.type === "footnote" || run.marks?.some(mark => typeof mark !== "string" && mark.type === "footnote"))) return null;
  if ([block.style, block.visualStyle].some(style => style && Object.keys(style).some(field => !buttonGroupTextStyleFields.has(field)))) return null;

  let link: Extract<NonNullable<RichTextRun["marks"]>[number], { type: "link" }> | undefined;
  let activeLink = "";
  let linkSegments = 0;
  for (const run of runs) {
    const runLinks = (run.marks ?? []).filter((mark): mark is Extract<NonNullable<RichTextRun["marks"]>[number], { type: "link" }> => typeof mark !== "string" && mark.type === "link");
    if (runLinks.length > 1) return null;
    const current = runLinks[0];
    const key = current ? `${current.url}\u0000${current.opensInNewTab === true}` : "";
    if (key && key !== activeLink) linkSegments += 1;
    activeLink = key;
    if (current) {
      if (link && (link.url !== current.url || link.opensInNewTab !== current.opensInNewTab)) return null;
      link = current;
    }
  }
  if (linkSegments > 1) return null;
  return { runs, link };
}

function textBlockTransforms(block: ContentBlock): BlockTransform[] {
  if (block.type === "heading") {
    const choices: BlockTransform[] = [...headingTransforms(block.level), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }, { id: "pullquote", label: "Pullquote", icon: "quote", target: "pullquote" }];
    // Lists have no text-alignment field or dormant text fallback. Never drop
    // either when converting an older Heading record.
    if (textCanBecomeList(block)) choices.push({ id: "list", label: "List", icon: "list", target: "list" });
    if (!block.editorial?.lock?.move && !block.editorial?.lock?.remove) choices.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }, { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" }, { id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    choices.push(...[{ id: "default", label: "Default" }, ...TEXT_STYLE_VARIATIONS].map(choice => ({ id: `heading-style-${choice.id}`, label: choice.label, icon: "heading" as const, target: "heading" as const, textStyle: choice.id as TextStyleVariation })));
    return choices;
  }
  if (block.type === "list") {
    const choices: BlockTransform[] = canExpandList(block) ? [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }] : [];
    if (!quoteHasLockedDescendant(block)) choices.push({ id: "quote", label: "Quote", icon: "quote", target: "quote" }, { id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" }, { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" }, { id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return choices;
  }
  if (block.type === "paragraph") {
    const transforms: BlockTransform[] = [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
    transforms.push(...([
      { id: "paragraph-presentation-default", label: "Default", paragraphPresentation: "default" },
      { id: "paragraph-presentation-preformatted", label: "Preformatted", paragraphPresentation: "preformatted" },
      { id: "paragraph-presentation-poetry", label: "Poetry", paragraphPresentation: "poetry" },
    ] as const).map(({ id, label, paragraphPresentation }) => ({ id, label, icon: "paragraph" as const, target: "paragraph" as const, paragraphPresentation })));
    transforms.push({ id: "pullquote", label: "Pullquote", icon: "quote", target: "pullquote" });
    if (paragraphButtonTransform(block)) transforms.push({ id: "buttons", label: "Buttons", icon: "button", target: "buttons" });
    if (textCanBecomeCode(block)) transforms.push({ id: "code", label: "Code", icon: "code", target: "code" });
    if (!block.editorial?.lock?.move && !block.editorial?.lock?.remove) transforms.push(
      { id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" },
      { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" },
      { id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" },
    );
    return transforms.filter(transform => (transform.target !== block.type || Boolean(transform.paragraphPresentation)) && !(transform.target === "list" && !textCanBecomeList(block)));
  }
  if (block.type === "code") {
    const choices: BlockTransform[] = [
      { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" },
      { id: "code-to-preformatted", label: "Preformatted", icon: "paragraph", target: "paragraph", paragraphPresentation: "preformatted" },
    ];
    if (!block.editorial?.lock?.move && !block.editorial?.lock?.remove) choices.push(
      { id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" },
      { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" },
      { id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" },
    );
    return choices;
  }
  if (block.type === "button") return [{ id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "button-fill", label: "Fill", icon: "button", target: "button", buttonStyle: "primary" }, { id: "button-outline", label: "Outline", icon: "button", target: "button", buttonStyle: "secondary" }];
  return [];
}

type ColumnsBlock = Extract<ContentBlock, { type: "columns" }>;

function hasStyle(value: unknown): value is ParagraphStyle {
  return Boolean(value && typeof value === "object" && Object.keys(value).length);
}

function mergedGroupStyle(style?: ParagraphStyle, visualStyle?: ParagraphStyle, flexItemSizing?: ParagraphStyle["flexItemSizing"]) {
  const merged = { ...(visualStyle ?? {}), ...(style ?? {}) };
  if (visualStyle?.className && style?.className) merged.className = `${visualStyle.className} ${style.className}`;
  if (visualStyle?.additionalCss && style?.additionalCss) merged.additionalCss = `${visualStyle.additionalCss}\n${style.additionalCss}`;
  if (flexItemSizing) merged.flexItemSizing = flexItemSizing;
  return Object.keys(merged).length ? merged : undefined;
}

function columnFlexSizing(column: ColumnBlock) {
  if (column.widthUnit) return { mode: "fixed" as const, size: `${column.width ?? 1}${column.widthUnit}` };
  if (column.width !== undefined) return { mode: "fixed" as const, size: `${column.width}%` };
  return { mode: "grow" as const };
}

/** Keep the Column identity and content while adapting its layout to a Group child. */
function transformColumn(column: Extract<ContentBlock, { type: "column" }>, preserveWidth: boolean): Extract<ContentBlock, { type: "group" }> {
  const style = hasStyle(column.style) ? structuredClone(column.style) : undefined;
  const visualStyle = hasStyle(column.visualStyle) ? structuredClone(column.visualStyle) : undefined;
  const sizing = preserveWidth ? columnFlexSizing(column) : undefined;
  const groupStyle = mergedGroupStyle(style, visualStyle, sizing);
  const layout = {
    ...(column.verticalAlign ? { verticalAlign: column.verticalAlign } : {}),
    ...(column.gap === undefined ? {} : { gap: column.gap }),
    ...(column.columnGap === undefined ? {} : { columnGap: column.columnGap }),
    ...(column.rowGap === undefined ? {} : { rowGap: column.rowGap }),
  };
  return {
    id: column.id,
    type: "group",
    layout: "stack",
    children: column.children,
    ...(column.allowedBlocks ? { allowedBlocks: column.allowedBlocks } : {}),
    ...(Object.keys(layout).length ? layout : {}),
    ...(column.editorial ? { editorial: column.editorial } : {}),
    ...(column.siteRole ? { siteRole: column.siteRole } : {}),
    ...(groupStyle ? { visualStyle: groupStyle } : {}),
  };
}

/** Convert Columns to an existing Group layout without flattening its Column content. */
function transformColumnsLayout(block: ColumnsBlock, transform: BlockTransform): Extract<ContentBlock, { type: "group" }> {
  const layout = transform.layout === "grid" ? "grid" : "row";
  const children = block.children.map(column => transformColumn(column, layout === "row"));
  const options = {
    ...(block.verticalAlign ? { verticalAlign: block.verticalAlign } : {}),
    ...(block.gap === undefined ? {} : { gap: block.gap }),
    ...(block.columnGap === undefined ? {} : { columnGap: block.columnGap }),
    ...(block.rowGap === undefined ? {} : { rowGap: block.rowGap }),
    ...(block.paddingX === undefined ? {} : { paddingX: block.paddingX }),
    ...(block.paddingY === undefined ? {} : { paddingY: block.paddingY }),
    ...(block.contentWidth === undefined ? {} : { contentWidth: block.contentWidth }),
    ...(block.stackAt === undefined ? {} : { stackAt: block.stackAt }),
  };
  const style = hasStyle(block.style) ? structuredClone(block.style) : undefined;
  const visualStyle = hasStyle(block.visualStyle) ? structuredClone(block.visualStyle) : undefined;
  const groupStyle = mergedGroupStyle(style, visualStyle);
  return {
    id: block.id,
    type: "group",
    layout,
    children,
    ...(groupStyle ? { visualStyle: groupStyle } : {}),
    ...(block.editorial ? { editorial: block.editorial } : {}),
    ...(block.siteRole ? { siteRole: block.siteRole } : {}),
    ...(block.blockAlign ? { blockAlign: block.blockAlign } : {}),
    ...options,
    ...(layout === "row" ? { allowSizingOnChildren: true, allowWrap: false } : { gridMode: "manual", columns: children.length }),
  };
}

/** A transform must remain a valid child of its current container. */
function baseBlockTransforms(block: ContentBlock, parent?: ContentBlock | null): BlockTransform[] {
  if (block.type === "cover") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const imageTransforms: BlockTransform[] = [];
    const canBecomeVideo = (Boolean(block.nativeVideoUrl && safeVideoSource(block.nativeVideoUrl))
      && block.videoBackground === undefined)
      || canCoverBecomeEmptyVideo(block);
    if (unlocked && canBecomeVideo && (!parent || groupAllowsChild(parent, "video"))) {
      imageTransforms.push({ id: "cover-to-video", label: "Video", icon: "video", target: "video" });
    }
    // WordPress offers Image and Media & Text conversions from Cover. Studio
    // exposes them only for a plain image Cover with no overlay or child
    // content, so the conversion cannot discard authored presentation.
    const canBecomeImage = Boolean(block.src.trim() || block.mediaId) && block.dimRatio === 0 && block.children.length === 0;
    if (unlocked && canBecomeImage && (!parent || groupAllowsChild(parent, "image"))) {
      imageTransforms.push({ id: "cover-to-image", label: "Image", icon: "image", target: "image" });
    }
    if (unlocked && canBecomeImage && (!block.blockAlign || block.blockAlign === "wide" || block.blockAlign === "full")
      && (!parent || groupAllowsChild(parent, "columns"))) {
      imageTransforms.push({ id: "cover-to-media-text-columns", label: "Media & Text (Columns)", icon: "image", target: "columns" });
    }
    const wrap: BlockTransform[] = [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return [...imageTransforms, ...wrap];
  }
  if (block.type === "columns") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove
      && block.children.every(column => !column.editorial?.lock?.move && !column.editorial?.lock?.remove);
    if (!unlocked || parent && !groupAllowsChild(parent, "group")) return [];
    return [
      { id: "columns-to-row", label: "Row", icon: "block", target: "group", layout: "row" },
      { id: "columns-to-grid", label: "Grid", icon: "block", target: "group", layout: "grid" },
    ];
  }
  if (block.type === "title") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const wrap: BlockTransform[] = [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return wrap;
  }
  if (block.type === "group" && block.data?.templateElement === "content") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const wrap: BlockTransform[] = [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return wrap;
  }
  if (block.type === "group" && block.tagName === "details") return [
    { id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" },
    { id: "wrap-columns", label: "Columns", icon: "block", target: "columns" },
  ];
  if (block.type === "group" && !block.data?.templateElement && !block.data?.templatePart) return groupVariations.filter(variation => variation.type !== groupVariationFor(block).type && variation.type !== "details").map(variation => ({ id: variation.type, label: variation.label, target: "group", icon: "block", layout: variation.layout as "flow" | "row" | "stack" | "grid" }));
  if ((block.type === "quote" || block.type === "pullquote")) {
    const conversions: BlockTransform[] = [];
    if (canUnwrapQuote(block) && (!parent || groupAllowsChild(parent, "paragraph"))) conversions.push({ id: "quote-to-paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" });
    if (!quoteHasLockedDescendant(block) && (!parent || groupAllowsChild(parent, "group"))) {
      conversions.push({ id: "quote-to-group", label: "Group", icon: "block", target: "group", layout: "flow" }, { id: "quote-to-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    }
    if (canQuoteBecomePoetry(block) && (!parent || groupAllowsChild(parent, "paragraph"))) conversions.push({ id: "quote-to-poetry", label: "Poetry", icon: "paragraph", target: "paragraph" });
    if (block.type === "quote" && canQuoteBecomePullquote(block) && (!parent || groupAllowsChild(parent, "pullquote"))) conversions.push({ id: "quote-to-pullquote", label: "Pullquote", icon: "quote", target: "pullquote" });
    if (block.type === "pullquote" && (!parent || groupAllowsChild(parent, "quote"))) conversions.push({ id: "quote-to-quote", label: "Quote", icon: "quote", target: "quote" });
    if (!quoteHasLockedDescendant(block) && (!parent || groupAllowsChild(parent, "columns"))) conversions.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    return block.type === "pullquote" ? conversions : [...conversions, { id: "quote-style-default", label: "Default", icon: "quote", target: "quote", quoteStyle: "default" }, { id: "quote-style-plain", label: "Plain", icon: "quote", target: "quote", quoteStyle: "plain" }];
  }
  if (block.type === "table") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const wrap: BlockTransform[] = [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return [...wrap, { id: "table-style-default", label: "Default", icon: "block", target: "table", tableStyle: "default" }, { id: "table-style-stripes", label: "Stripes", icon: "block", target: "table", tableStyle: "stripes" }];
  }
  if (block.type === "social-icons") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const wrap: BlockTransform[] = [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    return [...wrap,
      { id: "social-icons-style-default", label: "Default", icon: "block", target: "social-icons", socialStyle: "default" },
      { id: "social-icons-style-logos-only", label: "Logos Only", icon: "block", target: "social-icons", socialStyle: "logos-only" },
      { id: "social-icons-style-pill-shape", label: "Pill Shape", icon: "block", target: "social-icons", socialStyle: "pill-shape" },
    ];
  }
  if (block.type === "image" || block.type === "cover-image" || block.type === "time-to-read" || block.type === "author-name" || block.type === "post-date" || block.type === "buttons" || block.type === "embed") {
    const wrap: BlockTransform[] = [];
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) wrap.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if ((block.type === "time-to-read" || block.type === "embed" || block.type === "buttons") && unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    if (block.type === "image" && unlocked && (!parent || groupAllowsChild(parent, "group"))) wrap.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    if (block.type === "image" && unlocked && (!parent || groupAllowsChild(parent, "cover"))) wrap.push({ id: "image-to-cover", label: "Cover", icon: "image", target: "cover" });
    // Studio has no native Media & Text block. Offer a clearly labelled
    // adaptation using equal Columns, but only when the outer Columns can
    // faithfully carry the image's block alignment.
    if (block.type === "image" && unlocked && (!parent || groupAllowsChild(parent, "columns"))
      && (!block.blockAlign || block.blockAlign === "wide" || block.blockAlign === "full")) {
      wrap.push({ id: "image-to-media-text-columns", label: "Media & Text (Columns)", icon: "image", target: "columns" });
    }
    return wrap;
  }
  if (block.type === "separator" || block.type === "spacer") {
    const unlocked = !block.editorial?.lock?.move && !block.editorial?.lock?.remove;
    const target = block.type === "separator" ? "spacer" : "separator";
    // Spacer cannot represent a Separator's authored alignment. Keep that
    // choice recoverable until the alignment is explicitly cleared.
    const canConvert = block.type !== "separator" || !block.blockAlign;
    const conversions: BlockTransform[] = unlocked && canConvert && (!parent || groupAllowsChild(parent, target))
      ? [{ id: `convert-to-${target}`, label: target === "separator" ? "Separator" : "Spacer", icon: "block", target }] : [];
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) conversions.push({ id: "wrap-group", label: "Group", icon: "block", target: "group", layout: "flow" });
    if (unlocked && (!parent || groupAllowsChild(parent, "columns"))) conversions.push({ id: "wrap-columns", label: "Columns", icon: "block", target: "columns" });
    if (unlocked && (!parent || groupAllowsChild(parent, "group"))) conversions.push({ id: "wrap-details", label: "Details", icon: "block", target: "group", layout: "flow" });
    return block.type === "separator" ? [...conversions,
      { id: "separator-style-default", label: "Default", icon: "block", target: "separator", separatorStyle: "default" },
      { id: "separator-style-wide", label: "Wide Line", icon: "block", target: "separator", separatorStyle: "wide" },
      { id: "separator-style-dots", label: "Dots", icon: "block", target: "separator", separatorStyle: "dots" }] : conversions;
  }
  return textBlockTransforms(block).filter(transform => !parent || groupAllowsChild(parent, transform.target));
}

export function availableBlockTransforms(block: ContentBlock, parent?: ContentBlock | null): BlockTransform[] {
  return baseBlockTransforms(block, parent);
}

/** Hide structural conversions that cannot be applied to the complete current tree. */
export function availableBlockTransformsInDocument(block: ContentBlock, blocks: ContentBlock[]): BlockTransform[] {
  const choices = availableBlockTransforms(block, parentOfNestedBlock(blocks, block.id));
  if (block.type === "columns") return choices.filter(choice => {
    let index = 0;
    const generated = new Set<string>();
    const previewId = () => {
      let id: string;
      do { id = `columns-transform-preview-${index++}`; } while (generated.has(id) || findContentBlock(blocks, id));
      generated.add(id);
      return id;
    };
    const replacement = transformBlock(block, choice, previewId);
    const proposed = editBlockSiblings(blocks, block.id, (siblings, position) => [...siblings.slice(0, position), replacement, ...siblings.slice(position + 1)]);
    return proposed !== blocks && validContentBlocks(proposed) && permitsBlockTreeChanges(blocks, proposed) && preservesBlockLocks(blocks, proposed);
  });
  const contentSlot = block.type === "group" && block.data?.templateElement === "content";
  if (!contentSlot && !(block.type === "group" && block.tagName === "details") && block.type !== "title" && block.type !== "embed" && block.type !== "buttons" && block.type !== "time-to-read" && block.type !== "author-name" && block.type !== "post-date" && block.type !== "table" && block.type !== "code" && block.type !== "list" && (block.type !== "quote" && block.type !== "pullquote") && block.type !== "image" && block.type !== "cover" && block.type !== "cover-image" && block.type !== "social-icons" && block.type !== "spacer" && block.type !== "separator" && block.type !== "heading" && block.type !== "paragraph") return choices;
  return choices.filter(choice => {
    if (block.type !== "list" && block.type !== "heading" && block.type !== "paragraph" && block.type !== "author-name" && !contentSlot && !choice.id.startsWith("quote-to-") && choice.id !== "code-to-preformatted" && choice.id !== "wrap-group" && choice.id !== "wrap-columns" && choice.id !== "wrap-details" && choice.id !== "details" && choice.id !== "image-to-media-text-columns" && choice.id !== "cover-to-image" && choice.id !== "cover-to-video" && choice.id !== "cover-to-media-text-columns" && !choice.id.startsWith("convert-to-")) return true;
    let index = 0;
    const generated = new Set<string>();
    const previewId = () => {
      let id: string;
      do { id = `quote-transform-preview-${index++}`; } while (generated.has(id) || findContentBlock(blocks, id));
      generated.add(id);
      return id;
    };
    const replacement = (block.type === "quote" || block.type === "pullquote") ? transformQuoteBlocks(block, choice, previewId)
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
  const coverVideoSource = block.type === "cover" && transform.id === "cover-to-video" && transform.target === "video" && block.nativeVideoUrl
    ? safeVideoSource(block.nativeVideoUrl)
    : null;
  const emptyCoverVideo = block.type === "cover" && transform.id === "cover-to-video" && transform.target === "video"
    && !coverVideoSource && canCoverBecomeEmptyVideo(block);
  if (block.type === "cover" && (coverVideoSource || emptyCoverVideo)) {
    return { id: block.id, type: "video", src: coverVideoSource ?? "", ...(block.title ? { caption: block.title } : {}), ...(block.blockAlign ? { blockAlign: block.blockAlign } : {}), ...(block.editorial ? { editorial: structuredClone(block.editorial) } : {}), ...(block.siteRole ? { siteRole: block.siteRole } : {}) };
  }
  if (block.type === "cover" && transform.id === "cover-to-image" && transform.target === "image") {
    const { type: _type, dimRatio: _dimRatio, children: _children, contentPosition: _contentPosition, innerContentWidth: _innerContentWidth, ...image } = block;
    return { ...image, type: "image" };
  }
  if (block.type === "cover" && transform.id === "cover-to-media-text-columns" && transform.target === "columns") {
    const image = transformBlock(block, { id: "cover-to-image", label: "Image", icon: "image", target: "image" }, makeId);
    if (image.type !== "image") return block;
    const { blockAlign, wide, ...imageFields } = image;
    return {
      id: makeId(),
      type: "columns",
      children: [
        { id: makeId(), type: "column", width: 50, children: [{ ...imageFields, id: image.id, type: "image" }] },
        { id: makeId(), type: "column", width: 50, children: [{ id: makeId(), type: "paragraph", text: "" }] },
      ],
      ...(blockAlign ? { blockAlign } : wide ? { blockAlign: "wide" as const } : {}),
    };
  }
  if (block.type === "image" && transform.id === "image-to-media-text-columns" && transform.target === "columns") {
    const { blockAlign, wide, ...image } = block;
    return {
      id: makeId(),
      type: "columns",
      children: [
        { id: makeId(), type: "column", width: 50, children: [{ ...image }] },
        { id: makeId(), type: "column", width: 50, children: [{ id: makeId(), type: "paragraph", text: "" }] },
      ],
      ...(blockAlign ? { blockAlign } : wide ? { blockAlign: "wide" as const } : {}),
    };
  }
  if (block.type === "image" && transform.id === "image-to-cover" && transform.target === "cover") {
    const children: ContentBlock[] = block.caption ? [{ id: makeId(), type: "paragraph", text: block.caption,
      align: "centre", style: { fontSize: "large" }, ...(block.captionRuns?.length ? { runs: structuredClone(block.captionRuns) } : {}) }] : [];
    return {
      id: block.id,
      type: "cover",
      src: block.src,
      alt: block.alt,
      dimRatio: 50,
      children,
      ...(block.mediaId ? { mediaId: block.mediaId } : {}),
      ...(block.duotone !== undefined ? { duotone: block.duotone } : {}),
      ...(block.blockAlign ? { blockAlign: block.blockAlign } : {}),
      ...(block.wide ? { wide: true } : {}),
      ...(block.visualStyle ? { visualStyle: structuredClone(block.visualStyle) } : {}),
      ...(block.editorial ? { editorial: structuredClone(block.editorial) } : {}),
      ...(block.siteRole ? { siteRole: block.siteRole } : {}),
    };
  }
  if (block.type === "button" && transform.target === "button" && transform.buttonStyle) return block.style === transform.buttonStyle ? block : { ...block, style: transform.buttonStyle };
  if (block.type === "paragraph" && transform.id === "buttons" && transform.target === "buttons") {
    const content = paragraphButtonTransform(block);
    if (!content) return block;
    const visualStyle = { ...(block.visualStyle ?? {}), ...(block.style ?? {}) };
    const labelRuns = withoutInteractiveTextMarks(content.runs);
    return {
      id: block.id,
      type: "buttons",
      children: [{ id: makeId(), type: "button", label: block.text, ...(labelRuns.length ? { labelRuns } : {}), url: content.link?.url ?? "", style: "primary", ...(content.link?.opensInNewTab ? { opensInNewTab: true } : {}) }],
      ...(block.align ? { justification: block.align } : {}),
      ...(block.blockAlign ? { blockAlign: block.blockAlign } : {}),
      ...(Object.keys(visualStyle).length ? { visualStyle } : {}),
      ...(block.editorial ? { editorial: block.editorial } : {}),
      ...(block.siteRole ? { siteRole: block.siteRole } : {}),
    };
  }
  if ((block.type === "paragraph" || block.type === "heading" || block.type === "time-to-read" || block.type === "image" || block.type === "cover" || block.type === "embed" || block.type === "buttons" || block.type === "title" || block.type === "table" || block.type === "code" || block.type === "spacer" || block.type === "separator" || block.type === "list") && transform.id === "wrap-details" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", tagName: "details", detailsSummary: "Details", children: [block],
      ...("blockAlign" in block && (block.blockAlign === "wide" || block.blockAlign === "full") ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && block.tagName === "details" && transform.id === "wrap-group" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && block.tagName === "details" && transform.id === "wrap-columns" && transform.target === "columns") {
    return { id: makeId(), type: "columns", children: [{ id: makeId(), type: "column", width: 100, children: [block] }],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "columns" && transform.target === "group" && (transform.id === "columns-to-row" || transform.id === "columns-to-grid")) return transformColumnsLayout(block, transform);
  if (block.type === "title" && transform.id === "wrap-columns" && transform.target === "columns") {
    return { id: makeId(), type: "columns", children: [{ id: makeId(), type: "column", width: 100, children: [block] }],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "title" && transform.id === "wrap-group" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && block.data?.templateElement === "content" && transform.id === "wrap-columns" && transform.target === "columns") {
    return { id: makeId(), type: "columns", children: [{ id: makeId(), type: "column", width: 100, children: [block] }],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && block.data?.templateElement === "content" && transform.id === "wrap-group" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && block.data?.templateElement === "content" && transform.id === "wrap-details" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", tagName: "details", detailsSummary: "Details", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "group" && transform.target === "group" && transform.layout) return changeGroupLayout(block, transform.layout);
  if ((block.type === "embed" || block.type === "buttons" || block.type === "time-to-read" || block.type === "author-name" || block.type === "post-date" || block.type === "image" || block.type === "cover" || block.type === "cover-image" || block.type === "table" || block.type === "code" || (block.type === "quote" || block.type === "pullquote") || block.type === "list" || block.type === "heading" || block.type === "paragraph" || block.type === "spacer" || block.type === "separator" || block.type === "social-icons") && transform.id === "wrap-columns" && transform.target === "columns") {
    return { id: makeId(), type: "columns", children: [{ id: makeId(), type: "column", width: 100, children: [block] }],
      ...("blockAlign" in block && (block.blockAlign === "wide" || block.blockAlign === "full") ? { blockAlign: block.blockAlign } : {}) };
  }
  if (block.type === "social-icons" && transform.target === "social-icons" && transform.socialStyle) {
    return (block.socialStyle ?? "default") === transform.socialStyle ? block : { ...block, socialStyle: transform.socialStyle };
  }
  if ((block.type === "quote" || block.type === "pullquote")) {
    if (transform.target === "quote" && transform.quoteStyle) return (block.quoteStyle ?? "default") === transform.quoteStyle ? block : { ...block, quoteStyle: transform.quoteStyle };
    // Quote conversions are one-to-many and must use transformQuoteBlocks.
    return block;
  }
  if (block.type === "list" && transform.target === "quote" && !quoteHasLockedDescendant(block)) {
    return { id: makeId(), type: "quote", text: "", children: [block],
      ...(block.blockAlign === "wide" || block.blockAlign === "full" ? { blockAlign: block.blockAlign } : {}) };
  }
  if ((block.type === "embed" || block.type === "buttons" || block.type === "time-to-read" || block.type === "author-name" || block.type === "post-date" || block.type === "code" || block.type === "list" || block.type === "paragraph" || block.type === "heading" || block.type === "table" || block.type === "image" || block.type === "cover" || block.type === "cover-image" || block.type === "spacer" || block.type === "separator" || block.type === "social-icons") && transform.id === "wrap-group" && transform.target === "group") {
    return { id: makeId(), type: "group", layout: "flow", children: [block],
      ...("blockAlign" in block && (block.blockAlign === "wide" || block.blockAlign === "full") ? { blockAlign: block.blockAlign } : {}) };
  }

  if (block.type === "heading") {
    if (transform.target === "heading") {
      if (transform.textStyle) return textStyleVariation(block.visualStyle) === transform.textStyle ? block : { ...block, visualStyle: setTextStyleVariation(block.visualStyle, transform.textStyle) };
      return !transform.level || transform.level === block.level ? block : { ...block, level: transform.level };
    }
    const { level: _level, ...content } = block;
    if (transform.target === "paragraph") return { ...content, type: "paragraph" };
    if (transform.target === "pullquote") {
      return { ...content, type: "pullquote", quoteStyle: "plain", align: "centre", visualStyle: block.visualStyle };
    }
    if (transform.target === "quote") return { ...content, type: "quote" };
    if (transform.target === "list" && textCanBecomeList(block)) {
      const { text: _text, runs: _runs, align: _align, ...common } = content;
      return { ...common, type: "list", style: "unordered", items: listItemsFromRuns(block.runs?.length ? block.runs : [{ text: block.text }], true) };
    }
    return block;
  }
  if (block.type === "separator" && transform.id === "convert-to-spacer" && transform.target === "spacer") return { id: block.id, type: "spacer", height: 100, editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle };
  if (block.type === "spacer" && transform.id === "convert-to-divider" && transform.target === "separator") return { id: block.id, type: "separator", editorial: block.editorial, siteRole: block.siteRole, visualStyle: block.visualStyle };
  if (block.type === "separator" && transform.target === "separator" && transform.separatorStyle) return (block.style ?? "default") === transform.separatorStyle ? block : { ...block, style: transform.separatorStyle };
  if (block.type === "table" && transform.target === "table" && transform.tableStyle) {
    if ((block.tableStyle ?? "default") === transform.tableStyle) return block;
    return { ...block, tableStyle: transform.tableStyle };
  }
  if (block.type === "paragraph") {
    if (transform.target === "paragraph" && transform.paragraphPresentation) {
      const classes = (block.visualStyle?.className ?? "").split(/\s+/).filter(Boolean).filter(name => name !== "is-preformatted" && name !== "is-poetry");
      if (transform.paragraphPresentation !== "default") classes.push(`is-${transform.paragraphPresentation}`);
      const className = classes.join(" ") || undefined;
      if (className === block.visualStyle?.className) return block;
      const visualStyle = { ...(block.visualStyle ?? {}), className };
      if (Object.keys(visualStyle).every(key => key === "className") && !className) return { ...block, visualStyle: undefined };
      return { ...block, visualStyle: Object.keys(visualStyle).some(key => key !== "className") || className ? visualStyle : undefined };
    }
    // Paragraph's inner style takes precedence over its optional outer style.
    // The other text blocks hold that same presentation in visualStyle.
    const mergedStyle = { ...block.visualStyle, ...block.style };
    const visualStyle = Object.keys(mergedStyle).length ? structuredClone(mergedStyle) : undefined;
    const { style: _style, ...content } = block;
    if (transform.target === "heading") return { ...content, type: "heading", level: transform.level ?? 2, visualStyle };
    if (transform.target === "quote" || transform.target === "pullquote") {
      if (transform.target === "pullquote") {
        return { ...content, type: "pullquote", quoteStyle: "plain", align: "centre", visualStyle };
      }
      return { ...content, type: "quote", visualStyle };
    }
    if (transform.target === "code" && textCanBecomeCode(block)) {
      const runs = block.runs?.some(run => run.marks?.length) ? structuredClone(block.runs) : undefined;
      return { id: block.id, type: "code", code: block.text, runs, blockAlign: block.blockAlign, editorial: block.editorial, siteRole: block.siteRole, visualStyle };
    }
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
    : block.type === "code" && block.runs?.length ? block.runs
    : [{ text }];
  const runs = normaliseTextRuns(sourceRuns);
  const style = block.visualStyle;
  const visualStyle = style && Object.keys(style).length ? structuredClone(style) : undefined;
  if (block.type === "code" && visualStyle) {
    if (visualStyle.fontFamily === "monospace") delete visualStyle.fontFamily;
    if (visualStyle.responsive) {
      for (const viewport of ["tablet", "mobile"] as const) {
        if (visualStyle.responsive[viewport]?.fontFamily === "monospace") delete visualStyle.responsive[viewport]!.fontFamily;
        if (visualStyle.responsive[viewport] && Object.keys(visualStyle.responsive[viewport]!).length === 0) delete visualStyle.responsive[viewport];
      }
      if (Object.keys(visualStyle.responsive).length === 0) delete visualStyle.responsive;
    }
  }
  const align: TextAlignment | undefined = "align" in block ? block.align : undefined;
  const common = {
    id: block.id,
    siteRole: block.siteRole,
    editorial: block.editorial,
    ...("blockAlign" in block && block.blockAlign && blockAlignmentOptions(transform.target).includes(block.blockAlign) ? { blockAlign: block.blockAlign } : {}),
  };
  if (block.type === "code" && transform.id === "code-to-preformatted" && transform.target === "paragraph") {
    const classNames = (visualStyle?.className ?? "").split(/\s+/).filter(Boolean).filter(name => name !== "is-preformatted");
    classNames.push("is-preformatted");
    return { ...common, type: "paragraph", text, runs: block.runs?.length ? structuredClone(block.runs) : [{ text }], visualStyle: { ...visualStyle, className: classNames.join(" ") } };
  }
  if (transform.target === "heading") return { ...common, type: "heading", level: transform.level ?? 2, text, runs, align, visualStyle };
  if (transform.target === "list") return { ...common, type: "list", style: "unordered", items: listItemsFromRuns(runs), visualStyle };
  if (transform.target === "quote") return { ...common, type: "quote", text, runs, align, visualStyle };
  return { ...common, type: "paragraph", text, runs, align, style: visualStyle };
}
