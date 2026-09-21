import type { DocumentRenderContext, PostDateFormat } from "./model";

export function documentPublicationDate(document: DocumentRenderContext) {
  const value = document.publishAt ?? document.publishedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDocumentDate(document: DocumentRenderContext, format: PostDateFormat = "long") {
  const date = documentPublicationDate(document);
  if (!date) return null;
  if (format === "iso") return date.toISOString().slice(0, 10);
  if (format === "short") return new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(date);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function documentAuthor(document: DocumentRenderContext) {
  const author = document.author?.trim();
  return author || null;
}

export function documentFieldVisible(document: DocumentRenderContext | undefined, field: "title" | "subtitle" | "coverImage" | "author" | "publicationDate" | "readingTime") {
  return document?.displayOverrides?.[field] !== "hide";
}

export function authorInitials(author: string) {
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "?";
}
