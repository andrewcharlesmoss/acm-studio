import type { ContentBlock } from "../content/model";
import { blockAlignmentOptions, contentBlockAlignment } from "../content/block-alignment";
import { validBoxLengths } from "../content/box-lengths";
import { safeMathMLMarkup } from "../content/mathml";
import { safeImageSource } from "../content/rich-text";
import { validCustomFontSize } from "../content/font-size";
import { validSpacerSize } from "../content/spacer";
import { validLayoutOptions } from "../content/layout";
import { createDocumentShellBlocks, createPostStarterBlocks, type StudioWorkspace } from "./editor-model";

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

function collectBlockIds(blocks: ContentBlock[], ids = new Set<string>()) {
  for (const block of blocks) {
    ids.add(block.id);
    if (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "social-icons") collectBlockIds(block.children ?? [], ids);
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
  if (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "social-icons") {
    const children = (block.children ?? []).map(child => withUniqueBlockIds(child, ids));
    return block.type === "columns" ? { ...block, id, children: children as Extract<ContentBlock, { type: "column" }>[] } : { ...block, id, children } as ContentBlock;
  }
  return { ...block, id };
}

export function validParagraphStyle(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (value.fontFamily === undefined || ["inter", "helvetica-neue", "helvetica", "arial"].includes(value.fontFamily as string))
    && (value.fontSize === undefined || ["small", "medium", "large", "x-large", "xx-large"].includes(value.fontSize as string))
    && optionalCustomFontSize(value.fontSizeCustom)
    && (value.appearance === undefined || ["thin", "extra-light", "light", "regular", "medium", "semi-bold", "bold", "extra-bold", "black", "thin-italic", "extra-light-italic", "light-italic", "italic", "medium-italic", "semi-bold-italic", "bold-italic", "extra-bold-italic", "black-italic"].includes(value.appearance as string))
    && (value.textTransform === undefined || ["none", "uppercase", "lowercase", "capitalize"].includes(value.textTransform as string))
    && (value.textDecoration === undefined || ["none", "underline", "line-through"].includes(value.textDecoration as string))
    && (value.borderStyle === undefined || ["none", "solid", "dashed", "dotted"].includes(value.borderStyle as string))
    && (value.shadow === undefined || ["none", "soft", "strong"].includes(value.shadow as string))
    && (value.textShadow === undefined || ["none", "soft", "strong"].includes(value.textShadow as string))
    && (value.backgroundGradient === undefined || ["sunrise", "ocean", "forest", "violet"].includes(value.backgroundGradient as string))
    && optionalParagraphLength(value.lineHeight) && optionalSignedParagraphLength(value.letterSpacing)
    && optionalSignedParagraphLength(value.textIndent)
    && optionalParagraphLength(value.minHeight) && optionalParagraphLength(value.minWidth)
    && (value.textColumns === undefined || (Number.isInteger(value.textColumns) && (value.textColumns as number) >= 1 && (value.textColumns as number) <= 4))
    && (value.dropCap === undefined || typeof value.dropCap === "boolean")
    && (value.fitText === undefined || typeof value.fitText === "boolean")
    && (value.orientation === undefined || ["horizontal-tb", "vertical-rl"].includes(value.orientation as string))
    && optionalParagraphColour(value.textColor) && optionalParagraphColour(value.backgroundColor) && optionalParagraphColour(value.linkColor)
    && validBoxLengths(value.padding) && validBoxLengths(value.margin, true) && validBoxLengths(value.borderWidth) && validBoxLengths(value.borderRadius)
    && optionalParagraphColour(value.borderColor) && optionalParagraphAnchor(value.anchor) && optionalParagraphClasses(value.className);
}

function validRuns(value: unknown) {
  const validMark = (mark: unknown) => ["bold", "italic", "strikethrough", "inline-code", "subscript", "superscript", "keyboard"].includes(mark as string)
    || (isRecord(mark) && (
      (mark.type === "link" && typeof mark.url === "string" && optionalBoolean(mark.opensInNewTab))
      || (mark.type === "highlight" && optionalParagraphColour(mark.textColor) && optionalParagraphColour(mark.backgroundColor))
      || (mark.type === "language" && typeof mark.language === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(mark.language) && ["ltr", "rtl"].includes(mark.direction as string))
      || (mark.type === "math" && optionalString(mark.latex) && optionalString(mark.mathml) && typeof mark.alternativeText === "string" && mark.alternativeText.length <= 500 && (Boolean(mark.latex) !== Boolean(mark.mathml)) && (mark.latex === undefined || mark.latex.length <= 12000) && (mark.mathml === undefined || Boolean(safeMathMLMarkup(mark.mathml))))
      || (mark.type === "inline-image" && optionalString(mark.mediaId) && optionalString(mark.src) && Boolean(mark.mediaId || mark.src) && (mark.src === undefined || Boolean(safeImageSource(mark.src))) && typeof mark.alt === "string" && mark.alt.length <= 1000 && (mark.width === undefined || (typeof mark.width === "number" && Number.isInteger(mark.width) && mark.width >= 1 && mark.width <= 2400)))
      || (mark.type === "footnote" && typeof mark.id === "string" && mark.id.length > 0 && mark.id.length <= 160)
    ));
  return value === undefined || (Array.isArray(value) && value.every((run) => isRecord(run) && typeof run.text === "string"
    && (run.marks === undefined || (Array.isArray(run.marks) && run.marks.every(validMark)))));
}

const COMPONENT_NAMES = ["mini-golf-account", "mini-golf-setup", "mini-golf-scorecard", "mini-golf-leaderboard", "mini-golf-share"];

function validContentBlock(block: Record<string, unknown>, ids: Set<string>, depth: number, parentType?: string): boolean {
  if (typeof block.id !== "string" || block.id.length === 0 || ids.has(block.id) || depth > 8) return false;
  if (block.siteRole !== undefined && !["logo", "title", "eyebrow", "status", "progress", "table-size", "auto-resize", "new-game", "holes", "players", "reset-scores", "export-excel", "export-image", "export-html", "metric-average", "metric-deviation", "metric-holes", "player-name", "score-value", "score-label", "metric-label", "metric-value", "footer-name", "copyright", "social-icon", "social-action"].includes(block.siteRole as string)) return false;
  if (!validParagraphStyle(block.visualStyle)) return false;
  const blockAlignment = contentBlockAlignment(block);
  if (blockAlignment !== undefined && !blockAlignmentOptions(block.type).includes(blockAlignment)) return false;
  ids.add(block.id);
    if (block.align !== undefined && !["left", "centre", "right"].includes(block.align as string)) return false;
    switch (block.type) {
      case "paragraph": return typeof block.text === "string" && validRuns(block.runs) && validParagraphStyle(block.style);
      case "heading": return typeof block.text === "string" && validRuns(block.runs) && [1, 2, 3, 4, 5, 6].includes(block.level as number);
      case "quote": return typeof block.text === "string" && validRuns(block.runs) && optionalString(block.attribution)
        && (block.quoteStyle === undefined || ["default", "plain"].includes(block.quoteStyle as string));
      case "list": return ["ordered", "unordered"].includes(block.style as string) && Array.isArray(block.items)
        && block.items.every((item) => typeof item === "string" || (isRecord(item) && typeof item.text === "string" && validRuns(item.runs)))
        && (block.marker === undefined || ["1", "A", "a", "I", "i"].includes(block.marker as string))
        && (block.start === undefined || (typeof block.start === "number" && Number.isInteger(block.start) && block.start >= 1 && block.start <= 100000))
        && optionalBoolean(block.reversed);
      case "table": {
        if (!Array.isArray(block.rows) || !block.rows.length || !block.rows.every(strings)) return false;
        const columns = block.rows[0].length;
        const dimensions = (sizes: unknown, count: number) => sizes === undefined || (Array.isArray(sizes) && sizes.length === count
          && sizes.every((size) => typeof size === "number" && Number.isFinite(size) && size > 0));
        return columns > 0 && block.rows.every((row) => row.length === columns)
          && optionalBoolean(block.hasHeader) && optionalBoolean(block.hasFooter) && optionalBoolean(block.fixedWidth)
          && (block.tableStyle === undefined || ["default", "stripes"].includes(block.tableStyle as string)) && optionalString(block.caption)
          && dimensions(block.columnWidths, columns) && dimensions(block.rowHeights, block.rows.length)
          && (block.columnAlignments === undefined || (Array.isArray(block.columnAlignments) && block.columnAlignments.length === columns && block.columnAlignments.every((alignment) => ["left", "centre", "right"].includes(alignment as string))));
      }
      case "code": return typeof block.code === "string" && optionalString(block.language);
      case "image": return typeof block.src === "string" && typeof block.alt === "string" && optionalString(block.mediaId)
        && optionalString(block.caption) && optionalBoolean(block.wide) && optionalBoolean(block.decorative) && optionalString(block.title) && optionalString(block.linkUrl) && optionalBoolean(block.opensInNewTab)
        && (block.linkDestination === undefined || ["none", "custom", "media", "lightbox"].includes(block.linkDestination as string))
        && (block.imageStyle === undefined || ["default", "rounded"].includes(block.imageStyle as string))
        && (block.aspectRatio === undefined || ["original", "square", "portrait", "landscape", "wide"].includes(block.aspectRatio as string))
        && (block.scale === undefined || ["cover", "contain"].includes(block.scale as string))
        && [block.displayWidth, block.displayHeight].every((value) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 32 && value <= 2400))
        && [block.focalX, block.focalY].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100));
      case "embed": return typeof block.url === "string" && typeof block.title === "string" && (block.caption === undefined || typeof block.caption === "string");
      case "button": return typeof block.label === "string" && typeof block.url === "string" && ["primary", "secondary"].includes(block.style as string) && optionalBoolean(block.opensInNewTab)
        && optionalString(block.title) && optionalString(block.rel)
        && (block.width === undefined || [25, 50, 75, 100].includes(block.width as number));
      case "field": return ["text", "select"].includes(block.control as string) && typeof block.label === "string" && typeof block.value === "string"
        && (block.options === undefined || strings(block.options));
      case "divider": return (block.style === undefined || ["default", "wide", "dots"].includes(block.style as string))
        && (block.tagName === undefined || ["hr", "div"].includes(block.tagName as string));
      case "footnotes": return Array.isArray(block.notes) && block.notes.length <= 1000 && block.notes.every((note) => isRecord(note) && typeof note.id === "string" && note.id.length > 0 && note.id.length <= 160 && typeof note.text === "string" && note.text.length <= 10000);
      case "spacer": return validSpacerSize(block.height, block.heightUnit, true) && validSpacerSize(block.width, block.widthUnit);
      case "document-title": return (block.level === undefined || [1, 2, 3, 4, 5, 6].includes(block.level as number))
        && optionalBoolean(block.isLink) && (block.linkTarget === undefined || ["_self", "_blank"].includes(block.linkTarget as string)) && optionalString(block.rel);
      case "document-subtitle":
        return true;
      case "cover-image": return optionalBoolean(block.isLink)
        && (block.linkTarget === undefined || ["_self", "_blank"].includes(block.linkTarget as string)) && optionalString(block.rel)
        && (block.aspectRatio === undefined || ["original", "square", "portrait", "landscape", "wide"].includes(block.aspectRatio as string))
        && (block.scale === undefined || ["cover", "contain"].includes(block.scale as string))
        && [block.displayWidth, block.displayHeight].every((value) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 32 && value <= 2400))
        && [block.focalX, block.focalY].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100));
      case "reading-time": return optionalString(block.prefix)
        && (block.presentation === undefined || ["badge", "plain"].includes(block.presentation as string));
      case "post-author": return optionalString(block.prefix) && optionalBoolean(block.avatar);
      case "post-date": return (block.format === undefined || ["long", "short", "iso"].includes(block.format as string)) && optionalBoolean(block.showIcon) && optionalBoolean(block.isLink);
      case "social-icons": return (block.justification === undefined || ["left", "centre", "right", "space-between"].includes(block.justification as string))
        && (block.orientation === undefined || ["horizontal", "vertical"].includes(block.orientation as string))
        && optionalBoolean(block.allowWrap)
        && (block.iconSize === undefined || ["small", "normal", "large"].includes(block.iconSize as string))
        && (block.socialStyle === undefined || ["default", "logos-only", "pill-shape"].includes(block.socialStyle as string))
        && [block.horizontalGap, block.verticalGap].every((value) => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 120))
        && optionalBoolean(block.showLabels) && optionalBoolean(block.openInNewTab)
        && Array.isArray(block.children) && block.children.length <= 100
        && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1, "social-icons"));
      case "social-linkedin":
      case "social-tiktok": return parentType === "social-icons" && typeof block.url === "string" && block.url.length <= 2000
        && (block.label === undefined || (typeof block.label === "string" && block.label.length <= 160))
        && optionalString(block.rel);
      case "section":
        return ["stack", "row", "columns"].includes(block.layout as string)
          && validLayoutOptions(block)
          && (block.role === undefined || ["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(block.role as string))
          && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
          && (!(block.data && typeof block.data.holes === "number") || (Number.isInteger(block.data.holes) && block.data.holes >= 1 && block.data.holes <= 18))
          && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
          && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1));
      case "group": return ["stack", "row", "columns"].includes(block.layout as string)
        && validLayoutOptions(block)
        && (block.tagName === undefined || ["div", "main", "section", "article", "aside", "header", "footer", "nav"].includes(block.tagName as string))
        && optionalString(block.ariaLabel)
        && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
        && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
        && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1));
      case "columns": return validLayoutOptions(block) && validParagraphStyle(block.style)
        && Array.isArray(block.children) && block.children.length >= 1 && block.children.length <= 6
        && block.children.every((child) => isRecord(child) && child.type === "column" && validContentBlock(child, ids, depth + 1, "columns"));
      case "column": return parentType === "columns"
        && validLayoutOptions(block)
        && (block.width === undefined || (typeof block.width === "number" && Number.isFinite(block.width) && block.width >= 5 && block.width <= 100))
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
      if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "social-icons") && block.children && !collectFootnoteIds(block.children)) return false;
    }
    return true;
  }
  return collectFootnoteIds(value as ContentBlock[]);
}

/** Upgrade a v2 workspace without mutating the saved value in place. */
export function migrateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (!isRecord(value) || ![2, 3, 4, 5, 6, 7, 8, 9].includes(value.version as number) || !Array.isArray(value.documents)) return invalid();
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
  return migrated as StudioWorkspace;
}

export function validateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (!isRecord(value) || ![2, 3, 4, 5, 6, 7, 8, 9].includes(value.version as number) || !Array.isArray(value.documents)
    || !value.documents.every(isRecord) || !Array.isArray(value.bin) || value.bin.length > 10000) return invalid();
  const categories = value.categories === undefined && typeof value.version === "number" && value.version < 7 ? [] : value.categories;
  const binnedDocuments = value.bin.map(item => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.deletedAt !== "string" || !date(item.deletedAt) || !isRecord(item.document)) return invalid();
    if (item.assignment !== undefined && (!isRecord(item.assignment) || item.assignment.documentId !== item.document.id)) return invalid();
    if (item.publication !== undefined && (!isRecord(item.publication) || item.publication.localDocumentId !== item.document.id)) return invalid();
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
      || !validPasswordProtection(document.passwordProtection)
      || !optionalBoolean(document.sticky)
      || (document.publishAt !== undefined && !date(document.publishAt))
      || (document.publishedAt !== undefined && !date(document.publishedAt))
      || (document.category !== undefined && (typeof document.category !== "string" || document.category.length > 200))
      || (document.templateOverrides !== undefined && (!isRecord(document.templateOverrides) || !optionalBoolean(document.templateOverrides.author) || !optionalBoolean(document.templateOverrides.category) || !optionalBoolean(document.templateOverrides.tags) || !optionalBoolean(document.templateOverrides.parentPageId)))
      || (document.displayOverrides !== undefined && (!isRecord(document.displayOverrides) || Object.entries(document.displayOverrides).some(([key, candidate]) => !["title", "subtitle", "coverImage", "author", "publicationDate", "readingTime"].includes(key) || !["show", "hide"].includes(candidate as string))))
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
  return { ...value, version: 9, bin: value.bin, categories } as StudioWorkspace;
}

export function validatePublicationSnapshot(value: unknown): void {
  if (!isRecord(value) || ![1, 2, 3, 4].includes(value.version as number) || !Array.isArray(value.posts)) throw new Error("The published-post snapshot is invalid.");
  const ids = new Set();
  for (const post of value.posts) {
    if (!isRecord(post) || !["localDocumentId", "slug", "title", "summary", "displayDate", "readingTime"].every((field) => typeof post[field] === "string")
      || !date(post.publishedAt) || !validContentBlocks(post.blocks) || !strings(post.mediaIds)
      || !optionalString(post.subtitle) || !optionalString(post.projectSlug)
      || !optionalString(post.author)
      || !validPasswordProtection(post.passwordProtection)
      || !optionalBoolean(post.sticky) || !optionalString(post.scheduledAt)
      || (post.scheduledAt !== undefined && !date(post.scheduledAt))
      || (post.metadataBlocksVersion !== undefined && post.metadataBlocksVersion !== 2)
      || typeof post.section !== "string" || post.section.length > 200 || ids.has(post.localDocumentId)) {
      throw new Error("The published-post snapshot is invalid.");
    }
    ids.add(post.localDocumentId);
  }
}
