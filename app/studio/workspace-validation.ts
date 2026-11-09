import { containsGeneralTemplatePart } from "./reference-template-parts-contract";
import { containsSiteTitle } from "./site-title-contract";
import { containsWebsiteFont, isWebsiteFontId } from "../content/website-fonts";
import { containsBoxSideOverrides } from "../content/box-lengths";
import { containsPullquote } from "../content/pullquote-block";
import { containsButtonsAlignment } from "../content/buttons-alignment";
import { containsAuthoredAuthorDuotone, containsAuthoredFeaturedImageDuotone, containsAuthoredImageDuotone, validImageDuotone } from "../content/image-duotone";
import { containsAuthoredFeaturedImageOverlay, validFeaturedImageOverlay } from "../content/featured-image-overlay";
import { containsImageResolution, validImageResolution } from "../content/image-resolution";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop, validImageCropEdit } from "../content/image-edit";
import { containsAuthorBlockPresentation, validAuthorProfileImageSource, validAuthorProfileUrl } from "../content/author-profile-presentation";
import { containsExtendedGroupShadow, containsExtraBlackAppearance, containsGroupHeadingStyles, containsQuotePresentation } from "../content/quote-presentation";
import { containsDetailsPresentation, validDetailsPresentation } from "../content/details-block";
import { containsExtendedImageAspectRatio, isImageAspectRatio } from "../content/image-aspect-ratios";
import { containsTableCellAlignment } from "../content/table-cell-metadata";
import { containsResponsiveStyles, RESPONSIVE_STYLE_FIELDS } from "../content/responsive-styles";
import { hasTemplateContentButtonStyle } from "../content/template-content-button-style";
import { validRichTextRuns as validRuns } from "../content/rich-text-validation";
import { containsPostDateTimeOverride, validDocumentDisplay, validPostDateTime } from "../content/document-metadata";
import { containsRichTextInlineObjects, containsExtendedLanguage } from "../content/rich-text-contract";
import { validCodeRuns } from "../content/code-runs";
import { containsCodeRuns, containsCodeMonospaceFont } from "../content/code-runs";
import { containsCoreSocialLink, isCoreSocialService } from "../content/social-services";
import { containsCoverBlock, containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource, isCoverContentPosition, validCoverVideoBackground, validNativeCoverVideoSource } from "../content/cover-block";
import { migrateLegacyFootnoteBlocks } from "../content/footnote-blocks";
import type { LocallyPublishedArticle } from "../content/local-publishing";
import { tableRowSections, validTableRowSections } from "../content/table-row-sections";
import { validBlockEditorial } from "../content/block-editorial";
import { containsVideoBlock } from "../content/video-block";
import { validVideoBlock } from "../content/video-block";
import { GROUP_ALLOWED_BLOCK_TYPES, migrateLegacyBlockTypeNames, validListStart, type ContentBlock, type RichTextRun } from "../content/model";
import { blockAlignmentOptions } from "../content/block-alignment";
import { blockAlignmentSupport } from "../content/block-alignment";
import { validBackgroundGradient } from "../content/background-gradient";
import { validBoxLengths } from "../content/box-lengths";
import { validWebsiteBoxLengths } from "../content/reference-spacing";
import { plainTextFromRuns } from "../content/rich-text";
import { validCustomFontSize } from "../content/font-size";
import { containsColumnWidthUnit } from "../content/columns";
import { validSpacerSize } from "../content/spacer";
import { containsGridItemSizing } from "../content/grid-child-sizing";
import { validGridItemSizing } from "../content/grid-child-sizing";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing, containsScopedFlexItemSizing, containsGroupLayoutExtensions, validLayoutOptions, validLayoutLength } from "../content/layout";
import { createDocumentShellBlocks, createPostStarterBlocks, type StudioWorkspace } from "./editor-model";
import { listItemSupportedStyleFields } from "./blocks/capability-profiles";

export const PUBLICATION_VERSION = 56 as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const optionalString = (value: unknown) => value === undefined || typeof value === "string";
const optionalBoolean = (value: unknown) => value === undefined || typeof value === "boolean";
const validPasswordProtection = (value: unknown) => value === undefined || value === null || (isRecord(value)
  && typeof value.salt === "string" && /^[A-Za-z0-9+/]{20,32}={0,2}$/.test(value.salt)
  && typeof value.hash === "string" && /^[A-Za-z0-9+/]{40,48}={0,2}$/.test(value.hash));
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const uniqueIds = (records: Record<string, unknown>[]) => records.every((item) => typeof item.id === "string" && item.id.length > 0)
  && new Set(records.map((item) => item.id)).size === records.length;
const optionalParagraphLength = (value: unknown) => value === undefined || (typeof value === "string" && /^(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|ch|vw|vh)?)$/.test(value));
const optionalCustomFontSize = validCustomFontSize;
const optionalSignedParagraphLength = (value: unknown) => value === undefined || (typeof value === "string" && /^-?(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|ch|vw|vh)?)$/.test(value));
const optionalParagraphColour = (value: unknown) => value === undefined || (typeof value === "string" && /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i.test(value));
const optionalParagraphAnchor = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z][a-z0-9_-]*$/i.test(value));
const optionalParagraphClasses = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z0-9 _-]*$/i.test(value));
const listItemStyleFields = new Set(listItemSupportedStyleFields);
const optionalMediaId = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(value) && !["__proto__", "prototype", "constructor"].includes(value));

function collectBlockIds(blocks: ContentBlock[], ids = new Set<string>()) {
  for (const block of blocks) {
    ids.add(block.id);
    if (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || (block.type === "quote" || block.type === "pullquote") || block.type === "buttons" || block.type === "social-icons" || block.type === "cover" || block.type === "query-loop" || block.type === "post-template" || block.type === "no-results") collectBlockIds(block.children ?? [], ids);
    if (block.type === "list") for (const item of block.items) if (typeof item !== "string") for (const child of item.children ?? []) collectBlockIds([child], ids);
  }
  return ids;
}

function uniqueBlockId(base: string, ids: Set<string>) {
  let candidate = base;
  let suffix = 2;
  while (ids.has(candidate)) candidate = `${base}-${suffix++}`;
  ids.add(candidate);
  return candidate;
}

function withUniqueBlockIds(block: ContentBlock, ids: Set<string>): ContentBlock {
  const id = uniqueBlockId(block.id, ids);
  if (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || (block.type === "quote" || block.type === "pullquote") || block.type === "buttons" || block.type === "social-icons" || block.type === "cover" || block.type === "query-loop" || block.type === "post-template" || block.type === "no-results") {
    const children = (block.children ?? []).map(child => withUniqueBlockIds(child, ids));
    return block.type === "columns" ? { ...block, id, children: children as Extract<ContentBlock, { type: "column" }>[] } : { ...block, id, children } as ContentBlock;
  }
  if (block.type === "list") return { ...block, id, items: block.items.map(item => typeof item === "string" ? item : { ...item, children: item.children?.map(child => withUniqueBlockIds(child, ids) as Extract<ContentBlock, { type: "list" }>) }) };
  return { ...block, id };
}

export function validParagraphStyle(value: unknown, options: { allowCodeMonospace?: boolean; allowGroupSpacing?: boolean } = {}) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const validSpacing = options.allowGroupSpacing ? validWebsiteBoxLengths : validBoxLengths;
  if (value.responsive !== undefined && (!isRecord(value.responsive) || Object.keys(value.responsive).some(key => key !== "tablet" && key !== "mobile") || !Object.values(value.responsive).every(override => isRecord(override) && Object.keys(override).length > 0 && Object.keys(override).every(key => RESPONSIVE_STYLE_FIELDS.includes(key as typeof RESPONSIVE_STYLE_FIELDS[number])) && validParagraphStyle(override, options)))) return false;
  if (value.flexItemSizing !== undefined && (!isRecord(value.flexItemSizing)
    || Object.keys(value.flexItemSizing).some(key => key !== "mode" && key !== "size")
    || !["fit", "grow", "max", "fixed"].includes(value.flexItemSizing.mode as string)
    || (value.flexItemSizing.size !== undefined && (!validLayoutLength(value.flexItemSizing.size) || value.flexItemSizing.mode !== "max" && value.flexItemSizing.mode !== "fixed")))) return false;
  if (value.flexItemSizingActive !== undefined && value.flexItemSizingActive !== true) return false;
  if (value.gridItemSizing !== undefined && !validGridItemSizing(value.gridItemSizing)) return false;
  return (value.fontFamily === undefined || ["inter", "helvetica-neue", "helvetica", "arial"].includes(value.fontFamily as string) || options.allowCodeMonospace === true && value.fontFamily === "monospace" || isWebsiteFontId(value.fontFamily))
    && (value.fontSize === undefined || ["small", "medium", "large", "x-large", "xx-large"].includes(value.fontSize as string))
    && optionalCustomFontSize(value.fontSizeCustom)
    && (value.appearance === undefined || ["thin", "extra-light", "light", "regular", "medium", "semi-bold", "bold", "extra-bold", "black", "extra-black", "thin-italic", "extra-light-italic", "light-italic", "italic", "medium-italic", "semi-bold-italic", "bold-italic", "extra-bold-italic", "black-italic", "extra-black-italic"].includes(value.appearance as string))
    && (value.textTransform === undefined || ["none", "uppercase", "lowercase", "capitalize"].includes(value.textTransform as string))
    && (value.textDecoration === undefined || ["none", "underline", "line-through"].includes(value.textDecoration as string))
    && (value.borderStyle === undefined || ["none", "solid", "dashed", "dotted"].includes(value.borderStyle as string))
    && (value.shadow === undefined || ["none", "soft", "strong", "natural", "deep", "sharp", "outlined", "crisp"].includes(value.shadow as string))
    && (value.textShadow === undefined || ["none", "soft", "strong"].includes(value.textShadow as string))
    && (value.backgroundGradient === undefined || validBackgroundGradient(value.backgroundGradient))
    && optionalMediaId(value.backgroundImageMediaId) && (value.backgroundSize === undefined || ["cover", "contain", "fixed"].includes(value.backgroundSize as string))
    && (value.backgroundRepeat === undefined || ["repeat", "no-repeat"].includes(value.backgroundRepeat as string))
    && (value.backgroundFixedSize === undefined || (typeof value.backgroundFixedSize === "number" && Number.isFinite(value.backgroundFixedSize) && value.backgroundFixedSize >= 50 && value.backgroundFixedSize <= 2000))
    && [value.backgroundPositionX, value.backgroundPositionY].every(position => position === undefined || (typeof position === "number" && Number.isFinite(position) && position >= 0 && position <= 100))
    && optionalParagraphLength(value.lineHeight) && optionalSignedParagraphLength(value.letterSpacing)
    && optionalSignedParagraphLength(value.textIndent)
    && (value.blockGap === undefined || typeof value.blockGap === "string" && /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|%|vw|vh|ch))$/.test(value.blockGap) && optionalParagraphLength(value.blockGap))
    && optionalParagraphColour(value.headingColor) && optionalParagraphColour(value.headingBackgroundColor)
    && (value.headingBackgroundGradient === undefined || validBackgroundGradient(value.headingBackgroundGradient))
    && (value.headingColors === undefined || isRecord(value.headingColors) && Object.keys(value.headingColors).length > 0 && Object.entries(value.headingColors).every(([level, colour]) => ["1", "2", "3", "4", "5", "6"].includes(level) && optionalParagraphColour(colour)))
    && (value.headingBackgrounds === undefined || isRecord(value.headingBackgrounds) && Object.keys(value.headingBackgrounds).length > 0 && Object.entries(value.headingBackgrounds).every(([level, surface]) => ["1", "2", "3", "4", "5", "6"].includes(level) && isRecord(surface) && Object.keys(surface).length > 0 && Object.keys(surface).every(key => ["backgroundColor", "backgroundGradient"].includes(key)) && optionalParagraphColour(surface.backgroundColor) && (surface.backgroundGradient === undefined || validBackgroundGradient(surface.backgroundGradient)) && (surface.backgroundColor === undefined || surface.backgroundGradient === undefined)))
    && optionalParagraphColour(value.buttonTextColor) && optionalParagraphColour(value.buttonBackgroundColor)
    && (value.buttonBackgroundGradient === undefined || validBackgroundGradient(value.buttonBackgroundGradient))
    && optionalParagraphLength(value.minHeight) && optionalParagraphLength(value.minWidth)
    && (value.textColumns === undefined || (Number.isInteger(value.textColumns) && (value.textColumns as number) >= 1 && (value.textColumns as number) <= 4))
    && (value.dropCap === undefined || typeof value.dropCap === "boolean")
    && (value.fitText === undefined || typeof value.fitText === "boolean")
    && (value.orientation === undefined || ["horizontal-tb", "vertical-rl"].includes(value.orientation as string))
    && optionalParagraphColour(value.textColor) && optionalParagraphColour(value.backgroundColor) && optionalParagraphColour(value.linkColor) && optionalParagraphColour(value.linkHoverColor)
    && (value.paddingSides === undefined || isRecord(value.paddingSides) && Object.keys(value.paddingSides).length > 0 && Object.entries(value.paddingSides).every(([side, length]) => ["top", "right", "bottom", "left"].includes(side) && typeof length === "string" && !/\s/.test(length) && validSpacing(length)))
    && (value.marginSides === undefined || isRecord(value.marginSides) && Object.keys(value.marginSides).length > 0 && Object.entries(value.marginSides).every(([side, length]) => ["top", "right", "bottom", "left"].includes(side) && typeof length === "string" && !/\s/.test(length) && validSpacing(length, true)))
    && (value.borderWidthSides === undefined || isRecord(value.borderWidthSides) && Object.keys(value.borderWidthSides).length > 0 && Object.entries(value.borderWidthSides).every(([side, length]) => ["top", "right", "bottom", "left"].includes(side) && typeof length === "string" && !/\s/.test(length) && validBoxLengths(length)))
    && (value.borderRadiusCorners === undefined || isRecord(value.borderRadiusCorners) && Object.keys(value.borderRadiusCorners).length > 0 && Object.entries(value.borderRadiusCorners).every(([side, length]) => ["topLeft", "topRight", "bottomRight", "bottomLeft"].includes(side) && typeof length === "string" && !/\s/.test(length) && validBoxLengths(length)))
    && validSpacing(value.padding) && validSpacing(value.margin, true) && validBoxLengths(value.borderWidth) && validBoxLengths(value.borderRadius)
    && optionalParagraphColour(value.borderColor) && optionalParagraphAnchor(value.anchor) && optionalParagraphClasses(value.className)
    && (value.additionalCss === undefined || (typeof value.additionalCss === "string" && value.additionalCss.length <= 6000));
}

const buttonInteractionStyleFields = new Set([
  "fontFamily", "fontSize", "fontSizeCustom", "appearance", "textTransform", "textDecoration", "lineHeight", "letterSpacing",
  "textColor", "backgroundColor", "backgroundGradient", "padding", "margin", "width", "borderStyle", "borderWidth", "borderColor", "borderRadius", "shadow",
]);

export function validButtonInteractionStyles(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value) || Object.keys(value).some(state => !["hover", "focus", "active"].includes(state))) return false;
  return Object.values(value).every(style => isRecord(style)
    && Object.keys(style).length > 0
    && Object.keys(style).every(field => buttonInteractionStyleFields.has(field))
    && (style.width === undefined || [25, 50, 75, 100].includes(style.width as number))
    && validParagraphStyle(style));
}

export function validListItemStyle(value: unknown) {
  return validParagraphStyle(value) && (value === undefined || (isRecord(value) && Object.keys(value).every(field => listItemStyleFields.has(field)) && (value.responsive === undefined || isRecord(value.responsive) && Object.values(value.responsive).every(override => isRecord(override) && Object.keys(override).every(field => listItemStyleFields.has(field))))));
}


function validCaptionRuns(caption: unknown, runs: unknown) {
  if (!validRuns(runs)) return false;
  return runs === undefined || (typeof caption === "string" && plainTextFromRuns(runs as RichTextRun[]) === caption);
}

function validButtonLabel(label: unknown, runs: unknown) {
  return typeof label === "string" && validCaptionRuns(label, runs)
    && (runs === undefined || (runs as RichTextRun[]).every(run => run.inline?.type !== "footnote" && (run.marks ?? []).every(mark => typeof mark === "string" || mark.type !== "link" && mark.type !== "footnote")));
}

function validTableCellRuns(rows: string[][], value: unknown) {
  if (value === undefined) return true;
  return Array.isArray(value) && value.length === rows.length && value.every((row, rowIndex) => Array.isArray(row)
    && row.length === rows[rowIndex].length && row.every((runs, columnIndex) => Array.isArray(runs) && validRuns(runs)
      && plainTextFromRuns(runs as RichTextRun[]) === rows[rowIndex][columnIndex]));
}

function validTableCellMetadata(rows: string[][], value: unknown, headerRowCount: number) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length !== rows.length) return false;
  return value.every((row, rowIndex) => Array.isArray(row) && row.length === rows[rowIndex].length && row.every((metadata) => {
    if (metadata === null) return true;
    if (!isRecord(metadata) || Object.keys(metadata).length === 0 || Object.keys(metadata).some(key => key !== "tag" && key !== "scope" && key !== "textAlign" && key !== "verticalAlign")) return false;
    if (metadata.tag !== undefined && metadata.tag !== "th" && metadata.tag !== "td") return false;
    if (metadata.textAlign !== undefined && !["left", "centre", "right"].includes(metadata.textAlign as string)) return false;
    if (metadata.verticalAlign !== undefined && !["top", "middle", "bottom"].includes(metadata.verticalAlign as string)) return false;
    const defaultTag = rowIndex < headerRowCount ? "th" : "td";
    const effectiveTag = metadata.tag ?? defaultTag;
    if (metadata.scope !== undefined && metadata.scope !== null && !["row", "col", "rowgroup", "colgroup"].includes(metadata.scope as string)) return false;
    return (metadata.scope === undefined || effectiveTag === "th") && (metadata.scope !== null || effectiveTag === "th");
  }));
}

const COMPONENT_NAMES = ["mini-golf-account", "mini-golf-setup", "mini-golf-scorecard", "mini-golf-leaderboard", "mini-golf-share"];

export function containsQueryLoop(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (!Array.isArray(current) && (current as Record<string, unknown>).type === "query-loop") return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return false;
}

function containsNestedQueryWrapper(value: unknown): boolean {
  const pending: unknown[] = isRecord(value) && Array.isArray(value.children) ? [...value.children] : [];
  const seen = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (!Array.isArray(current) && ["query-loop", "post-template", "no-results"].includes((current as Record<string, unknown>).type as string)) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return false;
}

function validContentBlock(block: Record<string, unknown>, ids: Set<string>, depth: number, parentType?: string): boolean {
  if (typeof block.id !== "string" || block.id.length === 0 || ids.has(block.id) || depth > 8) return false;
  if (block.siteRole !== undefined && !["logo", "title", "eyebrow", "status", "progress", "table-size", "auto-resize", "new-game", "holes", "players", "reset-scores", "export-excel", "export-image", "export-html", "metric-average", "metric-deviation", "metric-holes", "player-name", "score-value", "score-label", "metric-label", "metric-value", "footer-name", "copyright", "social-icon", "social-action"].includes(block.siteRole as string)) return false;
  if (!validBlockEditorial(block.editorial)) return false;
  if (!validParagraphStyle(block.visualStyle, { allowCodeMonospace: block.type === "code", allowGroupSpacing: block.type === "group" })) return false;
  const hasContentButtonElementStyle = [block.visualStyle, block.style].some(hasTemplateContentButtonStyle);
  if (hasContentButtonElementStyle && block.type !== "group") return false;
  const blockAlignment = typeof block.blockAlign === "string" ? block.blockAlign : block.type === "image" && block.wide === true ? "wide" : undefined;
  if (blockAlignment !== undefined) {
    const alignmentOptions = typeof block.type === "string" && Object.hasOwn(blockAlignmentSupport, block.type)
      ? blockAlignmentOptions(block.type as ContentBlock["type"])
      : [];
    if (!alignmentOptions.includes(blockAlignment as (typeof alignmentOptions)[number])) return false;
  }
  ids.add(block.id);
    if (block.align !== undefined && !["left", "centre", "right"].includes(block.align as string)) return false;
    switch (block.type) {
      case "paragraph": return typeof block.text === "string" && validRuns(block.runs) && validParagraphStyle(block.style);
      case "heading": return typeof block.text === "string" && validRuns(block.runs) && [1, 2, 3, 4, 5, 6].includes(block.level as number);
      case "quote": case "pullquote": return typeof block.text === "string" && validRuns(block.runs) && optionalString(block.attribution) && validCaptionRuns(block.attribution, block.attributionRuns)
        && (block.children === undefined || (Array.isArray(block.children) && block.children.length <= 100 && block.children.every(child => isRecord(child) && ["paragraph", "heading", "list", "quote", "pullquote", "image"].includes(child.type as string) && validContentBlock(child, ids, depth + 1, "quote"))))
        && (block.quoteStyle === undefined || ["default", "plain"].includes(block.quoteStyle as string));
      case "list": return ["ordered", "unordered"].includes(block.style as string) && Array.isArray(block.items)
        && block.items.every((item) => validListItem(item, ids, depth))
        && (block.marker === undefined || ["1", "A", "a", "I", "i"].includes(block.marker as string))
        && (block.start === undefined || validListStart(block.start))
        && optionalBoolean(block.reversed);
      case "table": {
        if (!Array.isArray(block.rows) || !block.rows.every(strings)) return false;
        const columns = block.rows[0]?.length ?? 0;
        const dimensions = (sizes: unknown, count: number) => sizes === undefined || (Array.isArray(sizes) && sizes.length === count
          && sizes.every((size) => typeof size === "number" && Number.isFinite(size) && size > 0));
        return (!block.rows.length || columns > 0) && block.rows.every((row) => row.length === columns)
          && optionalBoolean(block.hasHeader) && optionalBoolean(block.hasFooter) && optionalBoolean(block.fixedWidth)
          && validTableRowSections(block as unknown as Extract<ContentBlock, { type: "table" }>)
          && (block.tableStyle === undefined || ["default", "stripes"].includes(block.tableStyle as string)) && optionalString(block.caption) && validCaptionRuns(block.caption, block.captionRuns) && validTableCellRuns(block.rows, block.cellRuns) && validTableCellMetadata(block.rows, block.cellMetadata, tableRowSections(block as unknown as Extract<ContentBlock, { type: "table" }>).headerRowCount)
          && (block.columnStyles === undefined || Array.isArray(block.columnStyles) && block.columnStyles.length === columns && block.columnStyles.every(style => isRecord(style)
            && Object.keys(style).every(key => key === "textAlign" || key === "verticalAlign")
            && (style.textAlign === undefined || ["left", "centre", "right"].includes(style.textAlign as string))
            && (style.verticalAlign === undefined || ["top", "middle", "bottom"].includes(style.verticalAlign as string))))
          && dimensions(block.columnWidths, columns) && dimensions(block.rowHeights, block.rows.length)
          && (block.columnAlignments === undefined || (Array.isArray(block.columnAlignments) && block.columnAlignments.length === columns && block.columnAlignments.every((alignment) => ["left", "centre", "right"].includes(alignment as string))));
      }
      case "code": return typeof block.code === "string" && optionalString(block.language) && validCodeRuns(block.code, block.runs);
      case "image": return validImageResolution(block.imageResolution) && (block.imageResolution === undefined || typeof block.mediaId === "string") && typeof block.src === "string" && typeof block.alt === "string" && optionalString(block.mediaId) && validImageDuotone(block.duotone) && (block.imageEdit === undefined || validImageCropEdit(block.imageEdit))
        && optionalString(block.caption) && validCaptionRuns(block.caption, block.captionRuns) && optionalBoolean(block.wide) && optionalBoolean(block.decorative) && optionalString(block.title) && optionalString(block.linkUrl) && optionalBoolean(block.opensInNewTab)
        && (block.linkDestination === undefined || ["none", "custom", "media", "lightbox"].includes(block.linkDestination as string))
        && (block.imageStyle === undefined || ["default", "rounded"].includes(block.imageStyle as string))
        && (block.aspectRatio === undefined || isImageAspectRatio(block.aspectRatio))
        && (block.scale === undefined || ["cover", "contain"].includes(block.scale as string))
        && [block.displayWidth, block.displayHeight].every((value) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 32 && value <= 2400))
        && [block.focalX, block.focalY].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100));
      case "video": return validVideoBlock(block) && validCaptionRuns(block.caption, block.captionRuns);
      case "cover": return typeof block.src === "string" && typeof block.alt === "string" && optionalString(block.mediaId) && optionalBoolean(block.innerContentWidth) && (block.videoBackground === undefined || validCoverVideoBackground(block.videoBackground)) && (block.nativeVideoUrl === undefined || validNativeCoverVideoSource(block.nativeVideoUrl)) && !(block.videoBackground !== undefined && block.nativeVideoUrl !== undefined) && (block.imageEdit === undefined || validImageCropEdit(block.imageEdit))
        && (block.contentPosition === undefined || isCoverContentPosition(block.contentPosition))
        && validImageResolution(block.imageResolution) && (block.imageResolution === undefined || typeof block.mediaId === "string")
        && validImageDuotone(block.duotone) && typeof block.dimRatio === "number" && Number.isInteger(block.dimRatio) && block.dimRatio >= 0 && block.dimRatio <= 100
        && optionalBoolean(block.wide) && optionalBoolean(block.decorative) && optionalString(block.title) && optionalString(block.linkUrl) && optionalBoolean(block.opensInNewTab)
        && (block.linkDestination === undefined || ["none", "custom", "media", "lightbox"].includes(block.linkDestination as string))
        && (block.imageStyle === undefined || ["default", "rounded"].includes(block.imageStyle as string))
        && (block.aspectRatio === undefined || isImageAspectRatio(block.aspectRatio))
        && (block.scale === undefined || ["cover", "contain"].includes(block.scale as string))
        && [block.displayWidth, block.displayHeight].every((value) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 32 && value <= 2400))
        && [block.focalX, block.focalY].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100))
        && Array.isArray(block.children) && block.children.length <= 100 && block.children.every(child => isRecord(child) && validContentBlock(child, ids, depth + 1, "cover"));
      case "embed": return typeof block.url === "string" && typeof block.title === "string" && optionalString(block.caption) && validCaptionRuns(block.caption, block.captionRuns);
      case "buttons": return Array.isArray(block.children) && block.children.length <= 100 && block.children.every(child => isRecord(child) && child.type === "button" && validContentBlock(child, ids, depth + 1, "buttons"))
        && (block.justification === undefined || ["left", "centre", "right", "stretch", "space-between"].includes(block.justification as string))
        && (block.verticalAlign === undefined || ["top", "centre", "bottom", "stretch", "space-between"].includes(block.verticalAlign as string))
        && (block.orientation === undefined || ["horizontal", "vertical"].includes(block.orientation as string)) && optionalBoolean(block.allowWrap)
        && [block.horizontalGap, block.verticalGap].every(value => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 120));
      case "button": return validButtonLabel(block.label, block.labelRuns) && typeof block.url === "string" && ["primary", "secondary"].includes(block.style as string) && optionalBoolean(block.opensInNewTab)
        && optionalString(block.title) && optionalString(block.rel)
        && (block.width === undefined || [25, 50, 75, 100].includes(block.width as number))
        && validButtonInteractionStyles(block.interactionStyles);
      case "field": return ["text", "select"].includes(block.control as string) && typeof block.label === "string" && typeof block.value === "string"
        && (block.options === undefined || strings(block.options));
      case "separator": return (block.style === undefined || ["default", "wide", "dots"].includes(block.style as string))
        && (block.tagName === undefined || ["hr", "div"].includes(block.tagName as string));
      case "footnotes": return Array.isArray(block.notes) && block.notes.length <= 1000 && block.notes.every((note) => isRecord(note) && typeof note.id === "string" && note.id.length > 0 && note.id.length <= 160 && typeof note.text === "string" && note.text.length <= 10000);
      case "spacer": return validSpacerSize(block.height, block.heightUnit, true) && validSpacerSize(block.width, block.widthUnit);
      case "navigation-page-list": return parentType === "navigation" && optionalString(block.parentPageId) && (block.position === undefined || typeof block.position === "number" && Number.isInteger(block.position) && block.position >= 0 && block.position <= 100) && validParagraphStyle(block.visualStyle);
      case "title": return (block.level === undefined || [0, 1, 2, 3, 4, 5, 6].includes(block.level as number))
        && optionalBoolean(block.isLink) && (block.linkTarget === undefined || ["_self", "_blank"].includes(block.linkTarget as string)) && optionalString(block.rel);
      case "subtitle": return true;
      case "cover-image": return validImageDuotone(block.duotone) && validFeaturedImageOverlay(block.overlay) && optionalBoolean(block.isLink)
        && (block.linkTarget === undefined || ["_self", "_blank"].includes(block.linkTarget as string)) && optionalString(block.rel)
        && (block.aspectRatio === undefined || isImageAspectRatio(block.aspectRatio))
        && (block.scale === undefined || ["cover", "contain", "fill"].includes(block.scale as string))
        && [block.displayWidth, block.displayHeight].every((value) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 32 && value <= 2400))
        && [block.focalX, block.focalY].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100));
      case "time-to-read": return optionalString(block.prefix) && optionalBoolean(block.showRange) && (block.mode === undefined || ["time", "words"].includes(block.mode as string))
        && (block.presentation === undefined || ["badge", "plain"].includes(block.presentation as string));
      case "author-name": return validImageDuotone(block.duotone) && optionalString(block.prefix) && optionalBoolean(block.avatar)
        && (block.avatarSize === undefined || (typeof block.avatarSize === "number" && Number.isInteger(block.avatarSize) && block.avatarSize >= 16 && block.avatarSize <= 512))
        && (block.profileImage === undefined || (isRecord(block.profileImage) && Object.keys(block.profileImage).every(key => ["src", "mediaId", "alt"].includes(key))
          && validAuthorProfileImageSource(block.profileImage.src, block.profileImage.mediaId)
          && optionalString(block.profileImage.mediaId) && (block.profileImage.mediaId === undefined || optionalMediaId(block.profileImage.mediaId))
          && typeof block.profileImage.alt === "string" && block.profileImage.alt.length <= 500))
        && optionalString(block.biography) && (block.biography === undefined || block.biography.length <= 5000)
        && validAuthorProfileUrl(block.profileUrl) && optionalBoolean(block.openInNewTab);
      case "post-date": return (block.format === undefined || ["long", "short", "iso", "custom"].includes(block.format as string)) && (block.datetime === undefined || validPostDateTime(block.datetime)) && optionalString(block.customFormat) && (block.customFormat === undefined || (block.customFormat as string).length <= 128) && (block.dateSource === undefined || ["published", "modified"].includes(block.dateSource as string)) && optionalBoolean(block.showIcon) && optionalBoolean(block.isLink);
      case "query-loop": return parentType !== "query-loop" && parentType !== "post-template" && parentType !== "no-results"
        && Number.isInteger(block.count) && (block.count as number) >= 1 && (block.count as number) <= 100
        && ["asc", "desc"].includes(block.order as string) && optionalBoolean(block.stickyFirst)
        && Array.isArray(block.children) && block.children.length === 2
        && isRecord(block.children[0]) && block.children[0].type === "post-template"
        && isRecord(block.children[1]) && block.children[1].type === "no-results"
        && validContentBlock(block.children[0], ids, depth + 1, "query-loop")
        && validContentBlock(block.children[1], ids, depth + 1, "query-loop");
      case "post-template": return parentType === "query-loop" && Array.isArray(block.children) && block.children.length > 0 && block.children.length <= 100
        && !containsNestedQueryWrapper(block)
        && block.children.every(child => isRecord(child) && ["title", "post-date", "paragraph", "spacer", "group"].includes(child.type as string)
          && validContentBlock(child, ids, depth + 1, "post-template"));
      case "no-results": return parentType === "query-loop" && Array.isArray(block.children) && block.children.length <= 100
        && !containsNestedQueryWrapper(block)
        && block.children.every(child => isRecord(child) && child.type !== "query-loop" && child.type !== "post-template" && child.type !== "no-results" && validContentBlock(child, ids, depth + 1, "no-results"));
      case "social-icons": return (block.justification === undefined || ["left", "centre", "right", "stretch", "space-between"].includes(block.justification as string))
        && (block.verticalAlign === undefined || ["top", "centre", "bottom", "stretch", "space-between"].includes(block.verticalAlign as string))
        && (block.orientation === undefined || ["horizontal", "vertical"].includes(block.orientation as string))
        && optionalBoolean(block.allowWrap)
        && (block.iconSize === undefined || ["small", "normal", "large", "huge"].includes(block.iconSize as string))
        && (block.socialStyle === undefined || ["default", "logos-only", "pill-shape"].includes(block.socialStyle as string))
        && [block.horizontalGap, block.verticalGap].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 120))
        && optionalBoolean(block.showLabels) && optionalBoolean(block.openInNewTab)
        && Array.isArray(block.children) && block.children.length <= 100
        && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1, "social-icons"));
      case "social-link": return parentType === "social-icons" && isCoreSocialService(block.service)
        && typeof block.url === "string" && block.url.length <= 2000
        && (block.label === undefined || (typeof block.label === "string" && block.label.length <= 160))
        && optionalString(block.rel) && validParagraphStyle(block.visualStyle);
      case "social-linkedin":
      case "social-tiktok": return parentType === "social-icons" && typeof block.url === "string" && block.url.length <= 2000
        && (block.label === undefined || (typeof block.label === "string" && block.label.length <= 160))
        && optionalString(block.rel);
      case "section":
        return block.position === undefined
          && ["flow", "stack", "row", "columns", "grid"].includes(block.layout as string)
          && validLayoutOptions(block)
          && (block.role === undefined || ["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(block.role as string))
          && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
          && (!(block.data && typeof block.data.holes === "number") || (Number.isInteger(block.data.holes) && block.data.holes >= 1 && block.data.holes <= 18))
          && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
          && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1));
      case "group": return (block.position === undefined || block.position === "sticky")
        && ["flow", "stack", "row", "columns", "grid"].includes(block.layout as string)
        && validLayoutOptions(block, true)
        && (block.allowedBlocks === undefined || (Array.isArray(block.allowedBlocks) && block.allowedBlocks.length <= GROUP_ALLOWED_BLOCK_TYPES.length && new Set(block.allowedBlocks).size === block.allowedBlocks.length && block.allowedBlocks.every((type) => GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number]))))
        && (block.tagName === undefined || ["div", "main", "section", "article", "aside", "header", "footer", "nav", "details"].includes(block.tagName as string))
        && validDetailsPresentation(block)
        && optionalString(block.ariaLabel)
        && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
        && validParagraphStyle(block.searchVisualStyle)
        && (block.searchVisualStyle === undefined || isRecord(block.data) && block.data.templateElement === "navigation" && block.data.searchEnabled === true)
        && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
          && Array.isArray(block.children) && block.children.every((child) => isRecord(child)
          && (parentType !== "post-template" || ["title", "post-date", "paragraph", "spacer", "group"].includes(child.type as string))
          && validContentBlock(child, ids, depth + 1, isRecord(block.data) && block.data.templateElement === "navigation" ? "navigation" : parentType === "post-template" || parentType === "no-results" ? parentType : undefined));
      case "columns": return block.minColumnWidth === undefined && validLayoutOptions(block) && validParagraphStyle(block.style)
        && Array.isArray(block.children) && block.children.length >= 1 && block.children.length <= 6
        && block.children.every((child) => isRecord(child) && child.type === "column" && validContentBlock(child, ids, depth + 1, "columns"));
      case "column": return parentType === "columns"
        && (block.allowedBlocks === undefined || (Array.isArray(block.allowedBlocks) && block.allowedBlocks.length <= GROUP_ALLOWED_BLOCK_TYPES.length && new Set(block.allowedBlocks).size === block.allowedBlocks.length && block.allowedBlocks.every((type) => GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number]))))
        && block.minColumnWidth === undefined && validLayoutOptions(block)
        && (block.width === undefined || (typeof block.width === "number" && Number.isFinite(block.width) && block.width >= (block.widthUnit === undefined ? 5 : 1) && block.width <= (block.widthUnit === undefined ? 100 : 2000)))
        && (block.widthUnit === undefined || ["px", "em", "rem", "vw", "vh"].includes(block.widthUnit as string))
        && (block.verticalAlign === undefined || ["top", "centre", "bottom", "stretch"].includes(block.verticalAlign as string))
        && validParagraphStyle(block.style)
        && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1, "column"));
      case "component": {
        if (!COMPONENT_NAMES.includes(block.component as string)) return false;
        if (block.data !== undefined && (!isRecord(block.data) || !Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item)))) return false;
        const holes = block.data && typeof block.data.holes === "number" ? block.data.holes : 9;
        if (!Number.isInteger(holes) || holes < 1 || holes > 18) return false;
        if (block.source !== undefined && (!isRecord(block.source) || typeof block.source.module !== "string" || typeof block.source.exportName !== "string" || typeof block.source.revision !== "string")) return false;
        return block.children === undefined || (Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1)));
      }
      default: return false;
    }
}

function validListItem(item: unknown, ids: Set<string>, depth: number): boolean {
  if (typeof item === "string") return true;
  if (!isRecord(item) || typeof item.text !== "string" || !validRuns(item.runs) || !validListItemStyle(item.style)) return false;
  if (item.children === undefined) return true;
  return Array.isArray(item.children) && item.children.length > 0
    && item.children.every(child => isRecord(child) && child.type === "list" && validContentBlock(child, ids, depth + 1, "list-item"));
}

export function validContentBlocks(value: unknown): value is ContentBlock[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  if (!value.every((block) => isRecord(block) && validContentBlock(block, ids, 0))) return false;
  const footnoteIds = new Set<string>();
  function collectFootnoteIds(blocks: ContentBlock[]): boolean {
    for (const block of blocks) {
      if (block.type === "footnotes") {
        for (const note of block.notes) {
          if (footnoteIds.has(note.id)) return false;
          footnoteIds.add(note.id);
        }
      }
      if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || (block.type === "quote" || block.type === "pullquote") || block.type === "buttons" || block.type === "social-icons" || block.type === "cover") && block.children && !collectFootnoteIds(block.children)) return false;
      if (block.type === "list" && !block.items.every(item => typeof item === "string" || (item.children ?? []).every(child => collectFootnoteIds([child])))) return false;
    }
    return true;
  }
  return collectFootnoteIds(value as ContentBlock[]);
}

/** Upgrade a v2 workspace without mutating the saved value in place. */
export function migrateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (isRecord(value) && Array.isArray(value.documents) && (containsSiteTitle(value.documents) || containsGeneralTemplatePart(value.documents))) return invalid();
  if (isRecord(value) && (value.version as number) < 61 && containsGeneralTemplatePart(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 65 && containsGroupLayoutExtensions(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 64 && containsScopedFlexItemSizing(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 60 && containsSiteTitle(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 59 && containsWebsiteFont(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 58 && containsBoxSideOverrides(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 57 && containsPullquote(value)) return invalid();
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && (value.version as number) < 53 && containsAuthoredCoverCrop(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 55 && containsVideoBlock(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 56 && containsNativeCoverVideoSource(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 54 && containsCoverVideoBackground(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 52 && containsCoverInnerContentWidth(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 51 && containsCoverContentPosition(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 50 && containsCoreSocialLink(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 44 && containsCodeMonospaceFont(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 46 && containsCoverBlock(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 47 && containsAuthoredImageCrop(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 48 && containsAuthorBlockPresentation(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 49 && containsAuthoredAuthorDuotone(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 43 && containsCodeRuns(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 41 && containsDetailsPresentation(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 39 && containsPostDateTimeOverride(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 35 && containsImageResolution(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 36 && containsGroupGridFillAvailableSpace(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 38 && containsColumnWidthUnit(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 33 && containsButtonsAlignment(value)) return invalid();
  if (!isRecord(value) || ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].includes(value.version as number) || !Array.isArray(value.documents)) return invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsGroupHeadingStyles(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsExtendedGroupShadow(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsExtraBlackAppearance(value)) return invalid();
  if ((value.version as number) < 42 && containsGridItemSizing(value)) return invalid();
  if ((value.version as number) < 37 && containsFlexItemSizing(value)) return invalid();
  if (((value.version as number) < 23 && containsRichTextInlineObjects(value) || (value.version as number) < 24 && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) return invalid();
  if ((value.version as number) < 26 && containsResponsiveStyles(value)) return invalid();
  if ((value.version as number) < 28 && containsTableCellAlignment(value)) return invalid();
  if ((value.version as number) < 29 && hasPageOrder(value)) return invalid();
  if ((value.version as number) < 30 && containsExtendedImageAspectRatio(value)) return invalid();
  if ((value.version as number) < 32 && containsAuthoredImageDuotone(value)) return invalid();
  if ((value.version as number) < 34 && containsAuthoredFeaturedImageDuotone(value)) return invalid();
  if ((value.version as number) < 40 && containsAuthoredFeaturedImageOverlay(value)) return invalid();
  if ((value.version as number) < 31 && containsQuotePresentation(value)) return invalid();
  const migrated = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  if (migrated.version === 2) {
    migrated.version = 3;
    migrated.documents = (migrated.documents as unknown[]).map((candidate) => {
      if (!isRecord(candidate) || candidate.kind !== "post" || !Array.isArray(candidate.blocks)) return candidate;
      const blocks = candidate.blocks as ContentBlock[];
      const starter = createPostStarterBlocks(String(candidate.id));
      const ids = collectBlockIds(blocks);
      const metadata = starter.slice(0, 2).map(block => withUniqueBlockIds(block, ids));
      return { ...candidate, author: typeof candidate.author === "string" ? candidate.author : "Andrew Moss", blocks: [...metadata, ...blocks] };
    });
  }
  if (migrated.version === 3) migrated.version = 4;
  if (migrated.version === 4) migrated.version = 5;
  if (migrated.version === 5) migrated.version = 6;
  if (!Array.isArray(migrated.bin)) migrated.bin = [];
  if (typeof migrated.version === "number" && migrated.version < 7) {
    migrated.documents = (migrated.documents as unknown[]).map(candidate => {
      if (!isRecord(candidate)) return candidate;
      const next = { ...candidate };
      if (next.documentShellVersion !== 1 && Array.isArray(next.blocks)) {
        const blocks = next.blocks as ContentBlock[];
        const existingTypes = new Set(blocks.map(block => block.type));
        const ids = collectBlockIds(blocks);
        const shell = createDocumentShellBlocks(String(next.id)).filter(block => {
          if (existingTypes.has(block.type)) return false;
          return !ids.has(block.id);
        }).map(block => withUniqueBlockIds(block, ids));
        next.blocks = [...shell, ...blocks];
        next.documentShellVersion = 1;
      }
      if (next.templateOverrides !== undefined) return next;
      return { ...next, templateOverrides: { author: true, category: true, tags: true, parentPageId: true } };
    });
  }
  if (migrated.version === 6) {
    const binned = migrated.bin as unknown[];
    const allDocuments = [
      ...(migrated.documents as unknown[]),
      ...binned.flatMap(item => isRecord(item) && isRecord(item.document) ? [item.document] : []),
    ];
    const categories: Array<{ id: string; name: string }> = [{ id: "category-uncategorised", name: "Uncategorised" }];
    const idsByName = new Map<string, string>();
    idsByName.set("uncategorised", "category-uncategorised");
    for (const candidate of allDocuments) {
      if (!isRecord(candidate) || typeof candidate.category !== "string" || !candidate.category.trim()) continue;
      const name = candidate.category.trim();
      const key = name.toLocaleLowerCase("en-GB");
      if (idsByName.has(key)) continue;
      const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `term-${categories.length + 1}`;
      let id = `category-${slug}`;
      let suffix = 2;
      while (categories.some(category => category.id === id)) id = `category-${slug}-${suffix++}`;
      categories.push({ id, name });
      idsByName.set(key, id);
    }
    const migrateDocument = (candidate: unknown) => {
      if (!isRecord(candidate)) return candidate;
      if (isRecord(candidate.templateOverrides) && candidate.templateOverrides.category === false) return { ...candidate, categoryIds: undefined };
      const id = typeof candidate.category === "string" ? idsByName.get(candidate.category.trim().toLocaleLowerCase("en-GB")) : undefined;
      return { ...candidate, ...(id ? { categoryIds: [id] } : { categoryIds: [] }) };
    };
    migrated.documents = (migrated.documents as unknown[]).map(migrateDocument);
    migrated.bin = binned.map(item => isRecord(item) && isRecord(item.document) ? { ...item, document: migrateDocument(item.document) } : item);
    migrated.categories = categories;
    migrated.version = 7;
  }
  if (migrated.version === 7) migrated.version = 8;
  if (migrated.version === 8) migrated.version = 9;
  if (migrated.version === 9) migrated.version = 10;
  if (migrated.version === 10) migrated.version = 11;
  if (migrated.version === 11) migrated.version = 12;
  if (migrated.version === 12) migrated.version = 13;
  if (migrated.version === 13) migrated.version = 14;
  if (migrated.version === 14) migrated.version = 15;
  if (migrated.version === 15) migrated.version = 16;
  if (migrated.version === 16) migrated.version = 17;
  if (migrated.version === 17) migrated.version = 18;
  if (migrated.version === 18) migrated.version = 19;
  if (migrated.version === 19) migrated.version = 20;
  if (migrated.version === 20) migrated.version = 21;
  if (migrated.version === 21) migrated.version = 22;
  if (migrated.version === 22) migrated.version = 23;
  if (migrated.version === 28) migrated.version = 29;
  if (migrated.version === 29) migrated.version = 30;
  if (migrated.version === 30) migrated.version = 31;
  if (migrated.version === 31) migrated.version = 32;
  if (migrated.version === 32) migrated.version = 33;
  if (migrated.version === 33) migrated.version = 34;
  if (migrated.version === 34) migrated.version = 35;
  if (migrated.version === 39) migrated.version = 40;
  if (migrated.version === 40) migrated.version = 41;
  if (migrated.version === 47) migrated.version = 48;
  if (migrated.version === 48) migrated.version = 49;
  if (migrated.version === 49) migrated.version = 50;
  if (migrated.version === 54) migrated.version = 55;
  return validateStudioWorkspace(migrated);
}

function hasPageOrder(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasPageOrder);
  if (!isRecord(value)) return false;
  if (Object.hasOwn(value, "pageOrder")) return true;
  return Object.values(value).some(hasPageOrder);
}

export function validateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (isRecord(value) && (value.version as number) < 65 && containsGroupLayoutExtensions(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 64 && containsScopedFlexItemSizing(value)) invalid();
  if (isRecord(value) && (value.version as number) < 62 && containsQueryLoop(value)) invalid();
  if (isRecord(value) && Array.isArray(value.documents) && (containsSiteTitle(value.documents) || containsGeneralTemplatePart(value.documents))) return invalid();
  if (isRecord(value) && (value.version as number) < 61 && containsGeneralTemplatePart(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 60 && containsSiteTitle(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 59 && containsWebsiteFont(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 58 && containsBoxSideOverrides(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 57 && containsPullquote(value)) return invalid();
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && (value.version as number) < 55 && containsVideoBlock(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 56 && containsNativeCoverVideoSource(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 54 && containsCoverVideoBackground(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 53 && containsAuthoredCoverCrop(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 52 && containsCoverInnerContentWidth(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 51 && containsCoverContentPosition(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 50 && containsCoreSocialLink(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 44 && containsCodeMonospaceFont(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 46 && containsCoverBlock(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 47 && containsAuthoredImageCrop(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 42 && containsGridItemSizing(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 43 && containsCodeRuns(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 48 && containsAuthorBlockPresentation(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 49 && containsAuthoredAuthorDuotone(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 41 && containsDetailsPresentation(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 39 && containsPostDateTimeOverride(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 35 && containsImageResolution(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 36 && containsGroupGridFillAvailableSpace(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 38 && containsColumnWidthUnit(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 33 && containsButtonsAlignment(value)) return invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsGroupHeadingStyles(value)) invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsExtendedGroupShadow(value)) invalid();
  if (isRecord(value) && (value.version as number) < 63 && containsExtraBlackAppearance(value)) invalid();
  if (!isRecord(value) || ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].includes(value.version as number) || !Array.isArray(value.documents)
    || !value.documents.every(isRecord) || !Array.isArray(value.bin) || value.bin.length > 10000) return invalid();
    if ((value.version as number) < 37 && containsFlexItemSizing(value)) return invalid();
  if ((value.version as number) < 26 && containsResponsiveStyles(value)) return invalid();
  if ((value.version as number) < 28 && containsTableCellAlignment(value)) return invalid();
  if ((value.version as number) < 29 && hasPageOrder(value)) return invalid();
  if ((value.version as number) < 30 && containsExtendedImageAspectRatio(value)) return invalid();
  if (((value.version as number) < 23 && containsRichTextInlineObjects(value) || (value.version as number) < 24 && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) return invalid();
  if ((value.version as number) < 32 && containsAuthoredImageDuotone(value)) return invalid();
  if ((value.version as number) < 34 && containsAuthoredFeaturedImageDuotone(value)) return invalid();
  if ((value.version as number) < 40 && containsAuthoredFeaturedImageOverlay(value)) return invalid();
  if ((value.version as number) < 31 && containsQuotePresentation(value)) return invalid();
  if (value.documentRevisions !== undefined) {
    if (![25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].includes(value.version as number) || !Array.isArray(value.documentRevisions) || value.documentRevisions.length > 100
      || JSON.stringify(value.documentRevisions).length > 2 * 1024 * 1024 || !uniqueIds(value.documentRevisions)) return invalid();
    for (const revision of value.documentRevisions) {
      if (!isRecord(revision) || !date(revision.savedAt) || !isRecord(revision.document)
        || revision.confirmed !== undefined && typeof revision.confirmed !== "boolean") return invalid();
      validateStudioWorkspace({ version: 65, documents: [revision.document], activeDocumentId: revision.document.id, categories: [], bin: [] });
    }
  }
  const categories = value.categories === undefined && typeof value.version === "number" && value.version < 7 ? [] : value.categories;
  const binnedDocuments = value.bin.map(item => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.deletedAt !== "string" || !date(item.deletedAt) || !isRecord(item.document)) return invalid();
    if (item.assignment !== undefined && (!isRecord(item.assignment) || item.assignment.documentId !== item.document.id)) return invalid();
    if (item.publication !== undefined && (!isRecord(item.publication) || item.publication.localDocumentId !== item.document.id || (item.publication.kind ?? "post") !== item.document.kind || (item.publication.kind === "page" && ![27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].includes(value.version as number)))) return invalid();
    return item.document;
  });
  if (!uniqueIds(value.bin as Record<string, unknown>[]) || !Array.isArray(categories) || !categories.every(isRecord) || !uniqueIds(categories as Record<string, unknown>[])) return invalid();
  const categoryIds = new Set<string>();
  for (const category of categories) {
    if (typeof category.name !== "string" || !category.name.trim() || category.name.length > 200
      || !optionalString(category.parentId)) return invalid();
    categoryIds.add(category.id as string);
  }
  for (const category of categories) {
    if (typeof category.parentId === "string" && (!categoryIds.has(category.parentId) || category.parentId === category.id)) return invalid();
    const seen = new Set<string>([category.id as string]);
    let parentId = category.parentId;
    while (typeof parentId === "string") {
      if (seen.has(parentId)) return invalid();
      seen.add(parentId);
      parentId = (categories.find(item => item.id === parentId) as Record<string, unknown> | undefined)?.parentId;
    }
  }
  const allDocuments = [...value.documents, ...binnedDocuments];
  if (!uniqueIds(allDocuments)) return invalid();
  if (typeof value.activeDocumentId !== "string"
    || (value.documents.length > 0 && !value.documents.some((item) => item.id === value.activeDocumentId))
    || (value.documents.length === 0 && value.activeDocumentId !== "")) return invalid();
  for (const document of allDocuments) {
    if (!["page", "post"].includes(document.kind as string) || !["draft", "pending", "private", "scheduled", "published"].includes(document.status as string)
      || !["title", "slug", "excerpt", "seoTitle", "seoDescription"].every((field) => typeof document[field] === "string")
      || !date(document.updatedAt) || !strings(document.tags) || (document.categoryIds !== undefined && (!strings(document.categoryIds) || document.categoryIds.length > categories.length || new Set(document.categoryIds).size !== document.categoryIds.length)) || !validContentBlocks(document.blocks)
      || !optionalString(document.author)
      || (document.metadataBlocksVersion !== undefined && document.metadataBlocksVersion !== 2)
      || (document.documentShellVersion !== undefined && document.documentShellVersion !== 1)
      || ![document.subtitle, document.publishedSlug, document.parentPageId].every(optionalString)
      || (document.pageOrder !== undefined && ((value.version as number) < 29 || document.kind !== "page" || typeof document.pageOrder !== "number" || !Number.isInteger(document.pageOrder) || document.pageOrder < -2147483648 || document.pageOrder > 2147483647))
      || !validPasswordProtection(document.passwordProtection)
      || !optionalBoolean(document.sticky)
      || (document.publishAt !== undefined && !date(document.publishAt))
      || (document.publishedAt !== undefined && !date(document.publishedAt))
      || (document.category !== undefined && (typeof document.category !== "string" || document.category.length > 200))
      || (document.templateOverrides !== undefined && (!isRecord(document.templateOverrides) || !optionalBoolean(document.templateOverrides.author) || !optionalBoolean(document.templateOverrides.category) || !optionalBoolean(document.templateOverrides.tags) || !optionalBoolean(document.templateOverrides.parentPageId)))
      || (document.displayOverrides !== undefined && !validDocumentDisplay(document.displayOverrides))
      || (document.template !== undefined && !["default", "wide", "landing"].includes(document.template as string))) return invalid();
    const cover = document.coverImage;
    if (cover !== undefined && cover !== null && (!isRecord(cover) || typeof cover.src !== "string"
      || typeof cover.alt !== "string" || !optionalString(cover.mediaId))) return invalid();
  }
  for (const document of allDocuments) {
    if (Array.isArray(document.categoryIds) && document.categoryIds.some(id => !categoryIds.has(id))) return invalid();
  }
  const documentsById = new Map(allDocuments.map((document) => [document.id as string, document]));
  for (const document of allDocuments) {
    const seen = new Set<string>();
    let parentId = document.parentPageId;
    while (typeof parentId === "string" && parentId) {
      if (seen.has(parentId) || parentId === document.id || !documentsById.has(parentId)) return invalid();
      seen.add(parentId);
      parentId = documentsById.get(parentId)?.parentPageId;
    }
  }
  // Validate the complete original envelope before walking typed rich fields.
  // Reading upgrades only this returned projection, never the saved snapshot.
  const migrateDocument = (document: StudioWorkspace["documents"][number]) => {
    const blocks = migrateLegacyFootnoteBlocks(document.blocks);
    return blocks === document.blocks ? document : { ...document, blocks };
  };
  const source = value as unknown as StudioWorkspace;
  return { ...source, version: 65, categories: categories as StudioWorkspace["categories"],
    documents: source.documents.map(migrateDocument),
    bin: source.bin.map(item => ({ ...item, document: migrateDocument(item.document),
      ...(item.publication ? { publication: validatePublicationSnapshot({ version: PUBLICATION_VERSION, posts: [item.publication] }).posts[0] } : {}),
    })),
  };
}

export function validatePublicationSnapshot(value: unknown): { version: typeof PUBLICATION_VERSION; posts: LocallyPublishedArticle[] } {
  if (isRecord(value) && (value.version as number) < 56 && containsGroupLayoutExtensions(value)) throw new Error("Extended Group layout values require published-post snapshot v56.");
  if (isRecord(value) && (value.version as number) < 55 && containsScopedFlexItemSizing(value)) throw new Error("Scoped flex child sizing requires published-post snapshot v55.");
  if (isRecord(value) && (value.version as number) < 53 && containsQueryLoop(value)) throw new Error("Query Loops require published-post snapshot v53.");
  if (isRecord(value) && (value.version as number) < 52 && containsGeneralTemplatePart(value)) throw new Error("General template parts require publication v52.");
  if (isRecord(value) && (value.version as number) < 51 && containsSiteTitle(value)) throw new Error("Site Title requires published-post snapshot v51.");
  if (isRecord(value) && (value.version as number) < 50 && containsWebsiteFont(value)) throw new Error("Website fonts require published-post snapshot v50.");
  if (isRecord(value) && (value.version as number) < 49 && containsBoxSideOverrides(value)) throw new Error("Per-side spacing or border values require published-post snapshot v49.");
  if (isRecord(value) && (value.version as number) < 48 && containsPullquote(value)) throw new Error("Pullquote requires published-post snapshot v48.");
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && (value.version as number) < 47 && containsNativeCoverVideoSource(value)) throw new Error("Native Cover video sources require published-post snapshot v47.");
  if (isRecord(value) && (value.version as number) < 44 && containsAuthoredCoverCrop(value)) throw new Error("Cover crop edits require published-post snapshot v44.");
  if (isRecord(value) && (value.version as number) < 46 && containsVideoBlock(value)) throw new Error("Video blocks require published-post snapshot v46.");
  if (isRecord(value) && (value.version as number) < 45 && containsCoverVideoBackground(value)) throw new Error("Cover video backgrounds require published-post snapshot v45.");
  if (isRecord(value) && (value.version as number) < 43 && containsCoverInnerContentWidth(value)) throw new Error("Cover inner-content width requires published-post snapshot v43.");
  if (isRecord(value) && (value.version as number) < 41 && containsCoreSocialLink(value)) throw new Error("Social Link services require published-post snapshot v41.");
  if (isRecord(value) && (value.version as number) < 37 && containsCoverBlock(value)) throw new Error("Cover blocks require published-post snapshot v37.");
  if (isRecord(value) && (value.version as number) < 42 && containsCoverContentPosition(value)) throw new Error("Cover content position requires published-post snapshot v42.");
  if (isRecord(value) && (value.version as number) < 38 && containsAuthoredImageCrop(value)) throw new Error("Image crop edits require published-post snapshot v38.");
  if (isRecord(value) && (value.version as number) < 39 && containsAuthorBlockPresentation(value)) throw new Error("Author profile presentation requires published-post snapshot v39.");
  if (isRecord(value) && (value.version as number) < 40 && containsAuthoredAuthorDuotone(value)) throw new Error("Author Duotone requires published-post snapshot v40.");
  if (isRecord(value) && (value.version as number) < 36 && containsCodeMonospaceFont(value)) throw new Error("Code monospace font requires the current published-post snapshot.");
  if (isRecord(value) && (value.version as number) < 35 && containsCodeRuns(value)) throw new Error("Code inline formatting requires published-post snapshot v35.");
  if (isRecord(value) && (value.version as number) < 34 && containsGridItemSizing(value)) throw new Error("Grid child spans require published-post snapshot v34.");
  if (isRecord(value) && (value.version as number) < 33 && containsDetailsPresentation(value)) throw new Error("Details blocks require published-post snapshot v33.");
  if (isRecord(value) && (value.version as number) < 31 && containsPostDateTimeOverride(value)) throw new Error("Post Date overrides require published-post snapshot v31.");
  if (isRecord(value) && (value.version as number) < 25 && containsButtonsAlignment(value)) throw new Error("Buttons alignment requires published-post snapshot v25.");
  if (isRecord(value) && (value.version as number) < 27 && containsImageResolution(value)) throw new Error("Image size selections require published-post snapshot v27.");
  if (isRecord(value) && (value.version as number) < 28 && containsGroupGridFillAvailableSpace(value)) throw new Error("Grid Fill available space requires published-post snapshot v28.");
  if (isRecord(value) && (value.version as number) < 29 && containsFlexItemSizing(value)) throw new Error("Flex child sizing requires published-post snapshot v29.");
  if (isRecord(value) && (value.version as number) < 30 && containsColumnWidthUnit(value)) throw new Error("Column width units require published-post snapshot v30.");
  if (!isRecord(value) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56].includes(value.version as number) || !Array.isArray(value.posts)) throw new Error("The published-post snapshot is invalid.");
  if (isRecord(value) && (value.version as number) < 54 && containsGroupHeadingStyles(value)) throw new Error("Per-level Group heading styles require published-post snapshot v54.");
  if (isRecord(value) && (value.version as number) < 54 && containsExtendedGroupShadow(value)) throw new Error("Expanded Group shadow presets require published-post snapshot v54.");
  if (isRecord(value) && (value.version as number) < 54 && containsExtraBlackAppearance(value)) throw new Error("Extra Black font appearance requires published-post snapshot v54.");
  if ((value.version as number) < 22 && containsExtendedImageAspectRatio(value)) throw new Error("These aspect ratios require published-post snapshot v22.");
  if ((value.version as number) < 21 && containsTableCellAlignment(value)) throw new Error("Cell alignment requires published-post snapshot v21.");
  if ((value.version as number) < 19 && containsResponsiveStyles(value)) throw new Error("Responsive styles require the current published-post snapshot.");
  if (((value.version as number) < 16 && containsRichTextInlineObjects(value) || (value.version as number) < 17 && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) throw new Error("Inline objects require a current published-post snapshot.");
  if ((value.version as number) < 24 && containsAuthoredImageDuotone(value)) throw new Error("Image Duotone requires published-post snapshot v24.");
  if ((value.version as number) < 26 && containsAuthoredFeaturedImageDuotone(value)) throw new Error("Featured Image Duotone requires published-post snapshot v26.");
  if ((value.version as number) < 32 && containsAuthoredFeaturedImageOverlay(value)) throw new Error("Featured Image overlays require published-post snapshot v32.");
  if ((value.version as number) < 23 && containsQuotePresentation(value)) throw new Error("Quote presentation requires published-post snapshot v23.");
  const ids = new Set();
  for (const post of value.posts) {
    if (!isRecord(post) || !["localDocumentId", "slug", "title", "summary", "displayDate", "readingTime"].every((field) => typeof post[field] === "string")
      || !date(post.publishedAt) || (post.updatedAt !== undefined && !date(post.updatedAt)) || !validContentBlocks(post.blocks) || !strings(post.mediaIds)
      || !optionalString(post.subtitle) || !optionalString(post.projectSlug)
      || (post.kind !== undefined && post.kind !== "post" && post.kind !== "page")
      || (post.kind === "page" && ![20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56].includes(value.version as number))
      || !optionalString(post.author)
      || !validPasswordProtection(post.passwordProtection)
      || !optionalBoolean(post.sticky) || !optionalString(post.scheduledAt)
      || (post.scheduledAt !== undefined && !date(post.scheduledAt))
      || (post.metadataBlocksVersion !== undefined && post.metadataBlocksVersion !== 2)
      || (post.displayOverrides !== undefined && !validDocumentDisplay(post.displayOverrides))
      || typeof post.section !== "string" || post.section.length > 200 || ids.has(post.localDocumentId)) {
      throw new Error("The published-post snapshot is invalid.");
    }
    ids.add(post.localDocumentId);
  }
  const source = value as unknown as { version: number; posts: LocallyPublishedArticle[] };
  return { ...source, version: PUBLICATION_VERSION, posts: source.posts.map(post => {
    const blocks = migrateLegacyFootnoteBlocks(post.blocks);
    return blocks === post.blocks ? post : { ...post, blocks };
  }) };
}
