import type { Article, ContentBlock } from "./model";
import type { StudioDocument } from "../studio/editor-model";

export const LOCAL_WORKSPACE_KEY = "acm-studio-workspace-v2";
export const LOCAL_PUBLICATIONS_KEY = "acm-studio-publications-v1";

export type LocallyPublishedArticle = Article & {
  localDocumentId: string;
  mediaIds: string[];
};

type LocalPublicationStore = {
  version: 1;
  posts: LocallyPublishedArticle[];
};

function countWords(blocks: ContentBlock[]) {
  const text = blocks.map((block) => {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return block.text;
    if (block.type === "list") return block.items.join(" ");
    if (block.type === "code") return block.code;
    if (block.type === "button") return block.label;
    if (block.type === "embed") return block.title;
    return block.type === "image" ? `${block.alt} ${block.caption ?? ""}` : "";
  }).join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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
  if (!document.blocks.some((block) => {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return Boolean(block.text.trim());
    if (block.type === "list") return block.items.some((item) => item.trim());
    return true;
  })) return "Add some post content before publishing.";
  return null;
}

export function toLocallyPublishedArticle(document: StudioDocument): LocallyPublishedArticle {
  const publishedAt = document.publishedAt ?? document.updatedAt;
  const wordCount = countWords(document.blocks);
  const mediaIds = document.blocks
    .filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image" && Boolean(block.mediaId))
    .map((block) => block.mediaId as string)
    .filter((id, index, ids) => ids.indexOf(id) === index);
  return {
    localDocumentId: document.id,
    slug: normalisePostSlug(document.slug),
    title: document.title,
    subtitle: document.subtitle?.trim() || undefined,
    summary: document.excerpt,
    publishedAt: publishedAt.slice(0, 10),
    displayDate: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(publishedAt)),
    readingTime: `${Math.max(1, Math.ceil(wordCount / 220))} minute read`,
    section: document.category ?? "Technology",
    blocks: document.blocks,
    mediaIds,
  };
}

export function parseLocallyPublishedArticles(serialisedPublications: string | null) {
  if (!serialisedPublications) return [];
  try {
    const publications = JSON.parse(serialisedPublications) as LocalPublicationStore;
    if (publications?.version !== 1 || !Array.isArray(publications.posts)) return [];
    return publications.posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } catch {
    return [];
  }
}

export function publishDocumentLocally(document: StudioDocument) {
  const article = toLocallyPublishedArticle(document);
  const existing = parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const posts = [article, ...existing.filter((item) => item.localDocumentId !== article.localDocumentId && item.slug !== article.slug)];
  const store: LocalPublicationStore = { version: 1, posts };
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(store));
  return article;
}

export function unpublishDocumentLocally(documentId: string) {
  const existing = parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
  const store: LocalPublicationStore = { version: 1, posts: existing.filter((item) => item.localDocumentId !== documentId) };
  window.localStorage.setItem(LOCAL_PUBLICATIONS_KEY, JSON.stringify(store));
}
