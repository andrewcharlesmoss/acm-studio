import type { ContentBlock } from "../content/model";
import { createDocumentShellBlocks, createPostStarterBlocks, type StudioWorkspace } from "./editor-model";

const LAYOUT_VALUE_LIMITS = { gap: [0, 120], padding: [0, 160], columns: [1, 6], spacer: [4, 320] } as const;
function validLayoutOptions(value: Record<string, unknown>): boolean {
  const finiteWithin = (candidate: unknown, min: number, max: number) => candidate === undefined || (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  return (value.horizontalAlign === undefined || ["left", "centre", "right", "stretch"].includes(value.horizontalAlign as string))
    && (value.verticalAlign === undefined || ["top", "centre", "bottom", "stretch"].includes(value.verticalAlign as string))
    && finiteWithin(value.gap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.paddingX, ...LAYOUT_VALUE_LIMITS.padding)
    && finiteWithin(value.paddingY, ...LAYOUT_VALUE_LIMITS.padding)
    && (value.contentWidth === undefined || ["full", "constrained"].includes(value.contentWidth as string))
    && (value.columns === undefined || (typeof value.columns === "number" && Number.isInteger(value.columns) && value.columns >= LAYOUT_VALUE_LIMITS.columns[0] && value.columns <= LAYOUT_VALUE_LIMITS.columns[1]))
    && (value.stackAt === undefined || ["tablet", "mobile", "never"].includes(value.stackAt as string));
}

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
const optionalParagraphColour = (value: unknown) => value === undefined || (typeof value === "string" && /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i.test(value));
const optionalParagraphAnchor = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z][a-z0-9_-]*$/i.test(value));
const optionalParagraphClasses = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z0-9 _-]*$/i.test(value));

function collectBlockIds(blocks: ContentBlock[], ids = new Set<string>()) {
  for (const block of blocks) {
    ids.add(block.id);
    if (block.type === "section" || block.type === "group" || block.type === "component") collectBlockIds(block.children ?? [], ids);
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
  if (block.type === "section" || block.type === "group" || block.type === "component") {
    return { ...block, id, children: (block.children ?? []).map(child => withUniqueBlockIds(child, ids)) };
  }
  return { ...block, id };
}

function validParagraphStyle(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (value.fontSize === undefined || ["small", "medium", "large", "x-large", "xx-large"].includes(value.fontSize as string))
    && (value.appearance === undefined || ["regular", "italic", "bold", "bold-italic"].includes(value.appearance as string))
    && (value.borderStyle === undefined || ["none", "solid", "dashed"].includes(value.borderStyle as string))
    && optionalParagraphLength(value.lineHeight) && optionalParagraphLength(value.letterSpacing)
    && optionalParagraphColour(value.textColor) && optionalParagraphColour(value.backgroundColor) && optionalParagraphColour(value.linkColor)
    && optionalParagraphLength(value.padding) && optionalParagraphLength(value.margin) && optionalParagraphLength(value.borderWidth) && optionalParagraphLength(value.borderRadius)
    && optionalParagraphColour(value.borderColor) && optionalParagraphAnchor(value.anchor) && optionalParagraphClasses(value.className);
}

function validRuns(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.every((run) => isRecord(run) && typeof run.text === "string"
    && (run.marks === undefined || (Array.isArray(run.marks) && run.marks.every((mark: unknown) => mark === "bold" || mark === "italic"
      || (isRecord(mark) && mark.type === "link" && typeof mark.url === "string" && optionalBoolean(mark.opensInNewTab)))))));
}

const COMPONENT_NAMES = ["mini-golf-account", "mini-golf-setup", "mini-golf-scorecard", "mini-golf-leaderboard", "mini-golf-share"];

function validContentBlock(block: Record<string, unknown>, ids: Set<string>, depth: number): boolean {
  if (typeof block.id !== "string" || block.id.length === 0 || ids.has(block.id) || depth > 8) return false;
  if (block.siteRole !== undefined && !["logo", "title", "eyebrow", "status", "progress", "table-size", "auto-resize", "new-game", "holes", "players", "reset-scores", "export-excel", "export-image", "export-html", "metric-average", "metric-deviation", "metric-holes", "player-name", "score-value", "score-label", "metric-label", "metric-value", "footer-name", "copyright", "social-icon", "social-action"].includes(block.siteRole as string)) return false;
  ids.add(block.id);
    if (block.align !== undefined && !["left", "centre", "right"].includes(block.align as string)) return false;
    switch (block.type) {
      case "paragraph": return typeof block.text === "string" && validRuns(block.runs) && validParagraphStyle(block.style);
      case "heading": return typeof block.text === "string" && validRuns(block.runs) && [1, 2, 3, 4, 5, 6].includes(block.level as number);
      case "quote": return typeof block.text === "string" && validRuns(block.runs) && optionalString(block.attribution);
      case "list": return ["ordered", "unordered"].includes(block.style as string) && strings(block.items);
      case "table": {
        if (!Array.isArray(block.rows) || !block.rows.length || !block.rows.every(strings)) return false;
        const columns = block.rows[0].length;
        const dimensions = (sizes: unknown, count: number) => sizes === undefined || (Array.isArray(sizes) && sizes.length === count
          && sizes.every((size) => typeof size === "number" && Number.isFinite(size) && size > 0));
        return columns > 0 && block.rows.every((row) => row.length === columns)
          && optionalBoolean(block.hasHeader) && optionalBoolean(block.hasFooter)
          && dimensions(block.columnWidths, columns) && dimensions(block.rowHeights, block.rows.length);
      }
      case "code": return typeof block.code === "string" && optionalString(block.language);
      case "image": return typeof block.src === "string" && typeof block.alt === "string" && optionalString(block.mediaId)
        && optionalString(block.caption) && optionalBoolean(block.wide);
      case "embed": return typeof block.url === "string" && typeof block.title === "string";
      case "button": return typeof block.label === "string" && typeof block.url === "string" && ["primary", "secondary"].includes(block.style as string);
      case "field": return ["text", "select"].includes(block.control as string) && typeof block.label === "string" && typeof block.value === "string"
        && (block.options === undefined || strings(block.options));
      case "divider": return true;
      case "spacer": return typeof block.height === "number" && Number.isFinite(block.height) && block.height >= LAYOUT_VALUE_LIMITS.spacer[0] && block.height <= LAYOUT_VALUE_LIMITS.spacer[1];
      case "document-title":
      case "document-subtitle":
      case "cover-image": return true;
      case "reading-time": return optionalString(block.prefix)
        && (block.presentation === undefined || ["badge", "plain"].includes(block.presentation as string));
      case "post-author": return optionalString(block.prefix) && optionalBoolean(block.avatar);
      case "post-date": return (block.format === undefined || ["long", "short", "iso"].includes(block.format as string)) && optionalBoolean(block.showIcon);
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
        && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
        && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
        && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1));
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
  return value.every((block) => isRecord(block) && validContentBlock(block, ids, 0));
}

/** Upgrade a v2 workspace without mutating the saved value in place. */
export function migrateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (!isRecord(value) || ![2, 3, 4, 5, 6].includes(value.version as number) || !Array.isArray(value.documents)) return invalid();
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
  return migrated as StudioWorkspace;
}

export function validateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (!isRecord(value) || ![2, 3, 4, 5, 6].includes(value.version as number) || !Array.isArray(value.documents)
    || !value.documents.every(isRecord) || !Array.isArray(value.bin) || value.bin.length > 10000) return invalid();
  const binnedDocuments = value.bin.map(item => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.deletedAt !== "string" || !date(item.deletedAt) || !isRecord(item.document)) return invalid();
    if (item.assignment !== undefined && (!isRecord(item.assignment) || item.assignment.documentId !== item.document.id)) return invalid();
    if (item.publication !== undefined && (!isRecord(item.publication) || item.publication.localDocumentId !== item.document.id)) return invalid();
    return item.document;
  });
  if (!uniqueIds(value.bin as Record<string, unknown>[])) return invalid();
  const allDocuments = [...value.documents, ...binnedDocuments];
  if (!uniqueIds(allDocuments)) return invalid();
  if (typeof value.activeDocumentId !== "string"
    || (value.documents.length > 0 && !value.documents.some((item) => item.id === value.activeDocumentId))
    || (value.documents.length === 0 && value.activeDocumentId !== "")) return invalid();
  for (const document of allDocuments) {
    if (!["page", "post"].includes(document.kind as string) || !["draft", "pending", "private", "published"].includes(document.status as string)
      || !["title", "slug", "excerpt", "seoTitle", "seoDescription"].every((field) => typeof document[field] === "string")
      || !date(document.updatedAt) || !strings(document.tags) || !validContentBlocks(document.blocks)
      || !optionalString(document.author)
      || (document.metadataBlocksVersion !== undefined && document.metadataBlocksVersion !== 2)
      || (document.documentShellVersion !== undefined && document.documentShellVersion !== 1)
      || ![document.subtitle, document.publishedSlug, document.parentPageId].every(optionalString)
      || !validPasswordProtection(document.passwordProtection)
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
  return { ...value, version: 6, bin: value.bin } as StudioWorkspace;
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
      || (post.metadataBlocksVersion !== undefined && post.metadataBlocksVersion !== 2)
      || !["", "Technology", "Excel", "Personal"].includes(post.section as string) || ids.has(post.localDocumentId)) {
      throw new Error("The published-post snapshot is invalid.");
    }
    ids.add(post.localDocumentId);
  }
}
