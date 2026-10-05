import type { DocumentDisplayField, DocumentDisplayMode, DocumentRenderContext, PostDateFormat } from "./model";

export const DOCUMENT_DISPLAY_FIELDS: readonly DocumentDisplayField[] = ["title", "subtitle", "coverImage", "author", "publicationDate", "readingTime"];

export function validDocumentDisplay(value: unknown): value is Partial<Record<DocumentDisplayField, DocumentDisplayMode>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value).every(([field, mode]) => DOCUMENT_DISPLAY_FIELDS.includes(field as DocumentDisplayField) && (mode === "show" || mode === "hide"));
}

export function documentPublicationDate(document: DocumentRenderContext, source: "published" | "modified" = "published") {
  const value = source === "modified" ? document.updatedAt : document.publishAt ?? document.publishedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDocumentDate(document: DocumentRenderContext, format: PostDateFormat = "long", options: { dateSource?: "published" | "modified"; customFormat?: string } = {}) {
  const date = documentPublicationDate(document, options.dateSource);
  if (!date) return null;
  if (format === "custom") return formatCustomDocumentDate(date, options.customFormat ?? "j F Y");
  if (format === "iso") return date.toISOString().slice(0, 10);
  if (format === "short") return new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(date);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function documentAuthor(document: DocumentRenderContext) {
  const author = document.author?.trim();
  return author || null;
}

export function documentFieldVisible(document: DocumentRenderContext | undefined, field: DocumentDisplayField) {
  return document?.displayOverrides?.[field] !== "hide";
}

export function authorInitials(author: string) {
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "?";
}

/** A bounded subset of WordPress date tokens; escaped characters remain literal. */
function formatCustomDocumentDate(date: Date, format: string) {
  const pad = (number: number) => String(number).padStart(2, "0");
  const named = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", options).format(date);
  const hours = date.getHours();
  const tokens: Record<string, string> = {
    Y: String(date.getFullYear()), y: String(date.getFullYear()).slice(-2),
    m: pad(date.getMonth() + 1), n: String(date.getMonth() + 1), F: named({ month: "long" }), M: named({ month: "short" }),
    d: pad(date.getDate()), j: String(date.getDate()), l: named({ weekday: "long" }), D: named({ weekday: "short" }),
    H: pad(hours), G: String(hours), h: pad(hours % 12 || 12), g: String(hours % 12 || 12),
    i: pad(date.getMinutes()), s: pad(date.getSeconds()), a: hours < 12 ? "am" : "pm", A: hours < 12 ? "AM" : "PM",
  };
  let escaped = false;
  let result = "";
  for (const character of format.slice(0, 128)) {
    if (escaped) { result += character; escaped = false; }
    else if (character === "\\") escaped = true;
    else result += tokens[character] ?? character;
  }
  return result;
}
