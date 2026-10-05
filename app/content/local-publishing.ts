import { readableRichText } from "./footnote-runs";
import { visibleListText } from "./block-editorial";
import { publicationBlocks } from "./block-editorial";
import { studioWriteOwnership } from "../studio/write-ownership";
import { type Article, type ContentBlock } from "./model";
import type { StudioDocument, StudioPasswordProtection } from "../studio/editor-model";
import { readingTimeLabel } from "./reading-time";
import { contentMediaIds } from "./media-references";
import { safeTextLink } from "./rich-text";
import { copyTemplateData, templateMediaIds, validateTemplatePublicationSnapshot as validatePublicationSnapshot, type TemplateSnapshot } from "../studio/template-model";
import { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY } from "./local-storage-keys";
import { resolveDocumentDisplay } from "../studio/document-fields";
import { validDocumentDisplay } from "./document-metadata";
import { PUBLICATION_VERSION } from "../studio/workspace-validation";

// Preserve the established acm-studio-workspace-v2 and acm-studio-publications-v1
// public exports while the key definitions stay independent of repositories.
export { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY };

export type LocallyPublishedArticle = Article & {
  templateSnapshot?: TemplateSnapshot;
  localDocumentId: string;
  mediaIds: string[];
  coverImage?: { src: string; mediaId?: string; alt: string } | null;
  metadataBlocksVersion?: 2;
  displayOverrides?: StudioDocument["displayOverrides"];
  passwordProtection?: StudioPasswordProtection;
  sticky?: boolean;
  scheduledAt?: string;
};

type StoredWorkspaceDocument = {
  id?: unknown;
  kind?: unknown;
  coverImage?: unknown;
};

function isCoverImage(value: unknown): value is { src: string; mediaId?: string; alt: string } {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return typeof image.src === "string" && typeof image.alt === "string" && (image.mediaId === undefined || typeof image.mediaId === "string");
}

// Publications written before cover metadata was added need a one-time
// in-memory bridge to the matching workspace document. New publications keep
// their own snapshot and never use this fallback.
export function restoreLegacyPublicationCover(article: LocallyPublishedArticle, serialisedWorkspace: string | null) {
  if (article.coverImage !== undefined || !serialisedWorkspace) return article;
  try {
    const workspace = JSON.parse(serialisedWorkspace) as { documents?: unknown };
    if (!Array.isArray(workspace.documents)) return article;
    const document = workspace.documents.find((item): item is StoredWorkspaceDocument => Boolean(item) && typeof item === "object" && (item as StoredWorkspaceDocument).id === article.localDocumentId && (item as StoredWorkspaceDocument).kind === "post");
    if (!document) return article;
    const coverImage = document.coverImage === null
      ? null
      : isCoverImage(document.coverImage) ? document.coverImage : { src: "", alt: "Mock cover image" };
    const mediaIds = [...article.mediaIds, coverImage?.mediaId].filter((id): id is string => Boolean(id)).filter((id, index, ids) => ids.indexOf(id) === index);
    return { ...article, coverImage, mediaIds };
  } catch {
    return article;
  }
}

type LocalPublicationStore = {
  version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
  posts: LocallyPublishedArticle[];
};

export function normalisePostSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function postSummaryText(blocks: ContentBlock[]): string {
  return blocks.flatMap((block) => {
    if (block.editorial?.hidden) return [];
    switch (block.type) {
      case "paragraph":
      case "heading": return [readableRichText(block.text, block.runs)];
      case "quote": return [block.children ? postSummaryText(block.children) : readableRichText(block.text, block.runs), readableRichText(block.attribution, block.attributionRuns)];
      case "list": return [visibleListText(block.items)];
      case "table": return [readableRichText(block.caption, block.captionRuns), ...block.rows.flatMap((row, r) => row.map((cell, c) => readableRichText(cell, block.cellRuns?.[r]?.[c])))];
      case "image": return block.caption ? [readableRichText(block.caption, block.captionRuns)] : [];
      case "embed": return [block.title, readableRichText(block.caption, block.captionRuns)];
      case "buttons":
      case "section":
      case "group":
      case "component": return postSummaryText(block.children ?? []);
      default: return [];
    }
  }).join(" ").replace(/\s+/g, " ").trim();
}

function generatedPostSummary(blocks: ContentBlock[]): string {
  const text = postSummaryText(blocks);
  if (text.length <= 160) return text;
  const excerpt = text.slice(0, 160);
  const wordBoundary = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, wordBoundary >= 120 ? wordBoundary : 160).trimEnd()}…`;
}

export function validatePostForPublication(document: StudioDocument, documents: StudioDocument[], reservedSlugs: string[]) {
  if (document.kind !== "post") return "Only posts can be published in this version.";
  if (!document.title.trim()) return "Add a post title before publishing.";
  const slug = normalisePostSlug(document.slug);
  if (!slug) return "Add a valid post address before publishing.";
  if (reservedSlugs.includes(slug)) return "That post address is already used by an existing article.";
  if (documents.some((item) => item.id !== document.id && item.kind === "post" && normalisePostSlug(item.slug) === slug)) return "Another local post already uses that address.";
  if (document.status === "scheduled" && (!document.publishAt || Date.parse(document.publishAt) <= Date.now())) return "Choose a future publish date and time before scheduling this post.";
  const hasContent = (blocks: StudioDocument["blocks"]): boolean => blocks.some((block) => {
    if (block.editorial?.hidden) return false;
    if (block.type === "paragraph" || block.type === "heading") return Boolean(block.text.trim());
    if (block.type === "quote") return block.children ? hasContent(block.children) : Boolean(block.text.trim());
    if (block.type === "list") return Boolean(visibleListText(block.items).trim());
    if (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "buttons") return hasContent(block.children ?? []);
    if (block.type === "social-icons") return block.children.some(child => Boolean(safeTextLink(child.url)));
    if (block.type === "reading-time" || block.type === "post-author" || block.type === "post-date" || block.type === "spacer" || block.type === "divider") return false;
    return true;
  });
  if (!hasContent(document.blocks)) return "Add some post content before publishing.";
  return null;
}

export function toLocallyPublishedArticle(document: StudioDocument, templateSnapshot?: TemplateSnapshot): LocallyPublishedArticle {
  if (document.displayOverrides !== undefined && !validDocumentDisplay(document.displayOverrides)) throw new Error("The document display settings are invalid.");
  const selectedTemplate = templateSnapshot?.set.templates.find(template => template.id === templateSnapshot.templateId);
  const scheduledAt = document.status === "scheduled" ? document.publishAt : undefined;
  const publishedAt = scheduledAt ?? document.publishedAt ?? document.updatedAt;
  // Posts show the Studio's generated cover treatment until a real cover is
  // selected. Preserve that same presentation in the browser-local article.
  const coverImage = document.coverImage === undefined && document.kind === "post"
    ? { src: "", alt: "Mock cover image" }
    : document.coverImage === null ? null : document.coverImage;
  const mediaIds = Array.from(new Set([...contentMediaIds(document.blocks), ...(templateSnapshot ? templateMediaIds(templateSnapshot.set) : []), coverImage?.mediaId].filter((id): id is string => Boolean(id))));
  return {
    localDocumentId: document.id,
    slug: normalisePostSlug(document.slug),
    title: document.title,
    subtitle: document.subtitle?.trim() || undefined,
    summary: document.excerpt.trim() || generatedPostSummary(document.blocks) || document.title.trim(),
    publishedAt: publishedAt.slice(0, 10),
    updatedAt: document.updatedAt,
    displayDate: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(publishedAt)),
    readingTime: readingTimeLabel(document.blocks),
    author: document.author?.trim() || undefined,
    metadataBlocksVersion: 2,
    // Freeze the effective policy from this publication's template, never the
    // live draft or a later template assignment.
    displayOverrides: resolveDocumentDisplay(document, selectedTemplate),
    ...(document.passwordProtection ? { passwordProtection: document.passwordProtection } : {}),
    ...(document.kind === "post" && document.sticky ? { sticky: true } : {}),
    ...(scheduledAt ? { scheduledAt } : {}),
    section: document.templateOverrides?.category === true ? (document.category ?? "") : (document.category ?? "Technology"),
    blocks: publicationBlocks(copyTemplateData(document.blocks)),
    ...(templateSnapshot ? { templateSnapshot: publicationTemplateSnapshot(templateSnapshot) } : {}),
    mediaIds,
    coverImage,
  };
}

export function locallyPublishedDocument(article: LocallyPublishedArticle): StudioDocument {
  return {
    id: article.localDocumentId, kind: "post", title: article.title, subtitle: article.subtitle,
    slug: article.slug, excerpt: article.summary, status: "published", author: article.author,
    metadataBlocksVersion: article.metadataBlocksVersion,
    displayOverrides: article.displayOverrides ? { ...article.displayOverrides } : undefined,
    publishedAt: article.publishedAt, updatedAt: article.updatedAt ?? "", blocks: article.blocks,
    tags: [], category: article.section || undefined, coverImage: article.coverImage,
    seoTitle: article.title, seoDescription: article.summary,
  };
}

export function parseLocallyPublishedArticles(serialisedPublications: string | null) {
  if (!serialisedPublications) return [];
  try {
    const publications = validatePublicationSnapshot(JSON.parse(serialisedPublications));
    return publications.posts.sort((a, b) => Number(Boolean(b.sticky)) - Number(Boolean(a.sticky)) || b.publishedAt.localeCompare(a.publishedAt));
  } catch {
    return [];
  }
}

export class UnreadablePublicationsError extends Error {
  constructor() {
    super("Your saved publications could not be read. Restore a valid backup before changing them.");
    this.name = "UnreadablePublicationsError";
  }
}

// Display readers may omit unreadable publications, but mutations must never
// mistake present, invalid data for an empty store and overwrite recovery data.
function readPublicationsForMutation(serialisedPublications: string | null): LocallyPublishedArticle[] {
  if (serialisedPublications === null) return [];
  try {
    return validatePublicationSnapshot(JSON.parse(serialisedPublications)).posts;
  } catch {
    throw new UnreadablePublicationsError();
  }
}

export function publishDocumentLocally(document: StudioDocument, template?: TemplateSnapshot | (() => TemplateSnapshot | undefined)) {
  studioWriteOwnership.assertWritable();
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const article = toLocallyPublishedArticle(document, typeof template === "function" ? template() : template);
  const posts = [article, ...existing.filter((item) => item.localDocumentId !== article.localDocumentId && item.slug !== article.slug)];
  const store: LocalPublicationStore = { version: PUBLICATION_VERSION, posts };
  const canonical = validatePublicationSnapshot(store);
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(canonical));
  return canonical.posts[0];
}

export function unpublishDocumentLocally(documentId: string) {
  studioWriteOwnership.assertWritable();
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const store: LocalPublicationStore = { version: PUBLICATION_VERSION, posts: existing.filter((item) => item.localDocumentId !== documentId) };
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(store));
}

export function getLocallyPublishedArticle(documentId: string) {
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const article = existing.find((item) => item.localDocumentId === documentId);
  return article ? copyTemplateData(article) : undefined;
}

export function restoreLocallyPublishedArticle(article: LocallyPublishedArticle) {
  studioWriteOwnership.assertWritable();
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  if (existing.some((item) => item.localDocumentId !== article.localDocumentId && item.slug === article.slug)) {
    throw new Error(`The address “${article.slug}” is now used by another published post.`);
  }
  const store: LocalPublicationStore = { version: PUBLICATION_VERSION, posts: [article, ...existing.filter((item) => item.localDocumentId !== article.localDocumentId)] };
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(validatePublicationSnapshot(store)));
}

function publicationTemplateSnapshot(snapshot: TemplateSnapshot): TemplateSnapshot {
  const copy = copyTemplateData(snapshot);
  function strip(nodes: import("../studio/template-model").TemplateNode[]) {
    for (const node of nodes) {
      node.editorial = node.editorial?.hidden ? { hidden: true } : undefined;
      if ("children" in node && node.children) strip(node.children as import("../studio/template-model").TemplateNode[]);
      if (node.type === "list") for (const item of node.items) if (typeof item !== "string" && item.children) strip(item.children as import("../studio/template-model").TemplateNode[]);
    }
  }
  for (const item of [...copy.set.templates, ...copy.set.parts]) strip(item.nodes);
  return copy;
}
