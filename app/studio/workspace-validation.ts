import type { ContentBlock } from "../content/model";
import type { StudioWorkspace } from "./editor-model";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const optionalString = (value: unknown) => value === undefined || typeof value === "string";
const optionalBoolean = (value: unknown) => value === undefined || typeof value === "boolean";
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const uniqueIds = (records: Record<string, unknown>[]) => records.every((item) => typeof item.id === "string" && item.id.length > 0)
  && new Set(records.map((item) => item.id)).size === records.length;
const optionalParagraphLength = (value: unknown) => value === undefined || (typeof value === "string" && /^(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|ch|vw|vh)?)$/.test(value));
const optionalParagraphColour = (value: unknown) => value === undefined || (typeof value === "string" && /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i.test(value));
const optionalParagraphAnchor = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z][a-z0-9_-]*$/i.test(value));
const optionalParagraphClasses = (value: unknown) => value === undefined || (typeof value === "string" && /^[a-z0-9 _-]*$/i.test(value));

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
      case "section":
        return ["stack", "row", "columns"].includes(block.layout as string)
          && (block.role === undefined || ["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(block.role as string))
          && (block.data === undefined || (isRecord(block.data) && Object.values(block.data).every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || strings(item))))
          && (!(block.data && typeof block.data.holes === "number") || (Number.isInteger(block.data.holes) && block.data.holes >= 1 && block.data.holes <= 18))
          && (block.source === undefined || (isRecord(block.source) && typeof block.source.module === "string" && typeof block.source.exportName === "string" && typeof block.source.revision === "string"))
          && Array.isArray(block.children) && block.children.every((child) => isRecord(child) && validContentBlock(child, ids, depth + 1));
      case "group": return ["stack", "row", "columns"].includes(block.layout as string)
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

export function validateStudioWorkspace(value: unknown): StudioWorkspace {
  const invalid = () => { throw new Error("The saved workspace is invalid or uses an unsupported version."); };
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.documents) || !value.documents.length
    || !value.documents.every(isRecord) || !uniqueIds(value.documents)) return invalid();
  if (typeof value.activeDocumentId !== "string" || !value.documents.some((item) => item.id === value.activeDocumentId)) return invalid();
  for (const document of value.documents) {
    if (!["page", "post"].includes(document.kind as string) || !["draft", "pending", "private", "published"].includes(document.status as string)
      || !["title", "slug", "excerpt", "seoTitle", "seoDescription"].every((field) => typeof document[field] === "string")
      || !date(document.updatedAt) || !strings(document.tags) || !validContentBlocks(document.blocks)
      || ![document.subtitle, document.publishedSlug, document.parentPageId].every(optionalString)
      || (document.publishAt !== undefined && !date(document.publishAt))
      || (document.publishedAt !== undefined && !date(document.publishedAt))
      || (document.category !== undefined && !["Technology", "Excel", "Personal"].includes(document.category as string))
      || (document.template !== undefined && !["default", "wide", "landing"].includes(document.template as string))) return invalid();
    const cover = document.coverImage;
    if (cover !== undefined && cover !== null && (!isRecord(cover) || typeof cover.src !== "string"
      || typeof cover.alt !== "string" || !optionalString(cover.mediaId))) return invalid();
  }
  return value as StudioWorkspace;
}

export function validatePublicationSnapshot(value: unknown): void {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.posts)) throw new Error("The published-post snapshot is invalid.");
  const ids = new Set();
  for (const post of value.posts) {
    if (!isRecord(post) || !["localDocumentId", "slug", "title", "summary", "displayDate", "readingTime"].every((field) => typeof post[field] === "string")
      || !date(post.publishedAt) || !validContentBlocks(post.blocks) || !strings(post.mediaIds)
      || !optionalString(post.subtitle) || !optionalString(post.projectSlug)
      || !["Technology", "Excel", "Personal"].includes(post.section as string) || ids.has(post.localDocumentId)) {
      throw new Error("The published-post snapshot is invalid.");
    }
    ids.add(post.localDocumentId);
  }
}
