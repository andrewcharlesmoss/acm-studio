import { studioWriteOwnership } from "../studio/write-ownership";
import type { Article } from "./model";
import type { StudioDocument, StudioPasswordProtection } from "../studio/editor-model";
import { readingTimeLabel } from "./reading-time";
import { contentMediaIds } from "./media-references";
import { copyTemplateData, templateMediaIds, validateTemplatePublicationSnapshot as validatePublicationSnapshot, type TemplateSnapshot } from "../studio/template-model";
import { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY } from "./local-storage-keys";

// Preserve the established acm-studio-workspace-v2 and acm-studio-publications-v1
// public exports while the key definitions stay independent of repositories.
export { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY };

export type LocallyPublishedArticle = Article & {
  templateSnapshot?: TemplateSnapshot;
  localDocumentId: string;
  mediaIds: string[];
  coverImage?: { src: string; mediaId?: string; alt: string } | null;
  metadataBlocksVersion?: 2;
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
  version: 2 | 3 | 4;
  posts: LocallyPublishedArticle[];
};

export function normalisePostSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function validatePostForPublication(document: StudioDocument, documents: StudioDocument[], reservedSlugs: string[]) {
  if (document.kind !== "post") return "Only posts can be published in this version.";
  if (!document.title.trim()) return "Add a post title before publishing.";
  if (!document.excerpt.trim()) return "Add an excerpt before publishing.";
  const slug = normalisePostSlug(document.slug);
  if (!slug) return "Add a valid post address before publishing.";
  if (reservedSlugs.includes(slug)) return "That post address is already used by an existing article.";
  if (documents.some((item) => item.id !== document.id && item.kind === "post" && normalisePostSlug(item.slug) === slug)) return "Another local post already uses that address.";
  if (document.status === "scheduled" && (!document.publishAt || Date.parse(document.publishAt) <= Date.now())) return "Choose a future publish date and time before scheduling this post.";
  const hasContent = (blocks: StudioDocument["blocks"]): boolean => blocks.some((block) => {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return Boolean(block.text.trim());
    if (block.type === "list") return block.items.some((item) => item.trim());
    if (block.type === "section" || block.type === "group" || block.type === "component") return hasContent(block.children ?? []);
    if (block.type === "reading-time" || block.type === "post-author" || block.type === "post-date" || block.type === "spacer" || block.type === "divider") return false;
    return true;
  });
  if (!hasContent(document.blocks)) return "Add some post content before publishing.";
  return null;
}

export function toLocallyPublishedArticle(document: StudioDocument, templateSnapshot?: TemplateSnapshot): LocallyPublishedArticle {
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
    summary: document.excerpt,
    publishedAt: publishedAt.slice(0, 10),
    displayDate: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(publishedAt)),
    readingTime: readingTimeLabel(document.blocks),
    author: document.author?.trim() || undefined,
    metadataBlocksVersion: 2,
    ...(document.passwordProtection ? { passwordProtection: document.passwordProtection } : {}),
    ...(document.kind === "post" && document.sticky ? { sticky: true } : {}),
    ...(scheduledAt ? { scheduledAt } : {}),
    section: document.templateOverrides?.category === true ? (document.category ?? "") : (document.category ?? "Technology"),
    blocks: copyTemplateData(document.blocks),
    ...(templateSnapshot ? { templateSnapshot: copyTemplateData(templateSnapshot) } : {}),
    mediaIds,
    coverImage,
  };
}

export function parseLocallyPublishedArticles(serialisedPublications: string | null) {
  if (!serialisedPublications) return [];
  try {
    const publications = JSON.parse(serialisedPublications) as LocalPublicationStore;
    validatePublicationSnapshot(publications);
    if (![1, 2, 3, 4].includes(publications?.version) || !Array.isArray(publications.posts)) return [];
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
    const store: unknown = JSON.parse(serialisedPublications);
    validatePublicationSnapshot(store);
    return (store as LocalPublicationStore).posts;
  } catch {
    throw new UnreadablePublicationsError();
  }
}

export function publishDocumentLocally(document: StudioDocument, template?: TemplateSnapshot | (() => TemplateSnapshot | undefined)) {
  studioWriteOwnership.assertWritable();
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const article = toLocallyPublishedArticle(document, typeof template === "function" ? template() : template);
  const posts = [article, ...existing.filter((item) => item.localDocumentId !== article.localDocumentId && item.slug !== article.slug)];
  const store: LocalPublicationStore = { version: 4, posts };
  validatePublicationSnapshot(store);
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(store));
  return article;
}

export function unpublishDocumentLocally(documentId: string) {
  studioWriteOwnership.assertWritable();
  const existing = readPublicationsForMutation(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const store: LocalPublicationStore = { version: 4, posts: existing.filter((item) => item.localDocumentId !== documentId) };
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
  const store: LocalPublicationStore = { version: 4, posts: [article, ...existing.filter((item) => item.localDocumentId !== article.localDocumentId)] };
  validatePublicationSnapshot(store);
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(store));
}
