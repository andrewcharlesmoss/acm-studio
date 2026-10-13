import type { TestSiteCollection } from "./contract";
import { resolveTemplate, type TemplateStore } from "../template-model";
import { parsePublicationDate } from "../publication-date";

export const LOCAL_SITE_STATUSES = ["draft", "pending", "published"] as const;
export type LocalSiteStatus = typeof LOCAL_SITE_STATUSES[number];
type PublishedCollection = Extract<TestSiteCollection, { version: 6 }>;

/** Publication commands are separate from ordinary editorial draft saves. */
export function changeLocalSiteStatus(source: PublishedCollection, documentId: string, status: LocalSiteStatus, templates: TemplateStore, now = new Date().toISOString()): PublishedCollection {
  if (!LOCAL_SITE_STATUSES.includes(status)) throw new Error("This status is not supported by the local site.");
  const document = source.documents.find(item => item.id === documentId);
  if (!document) throw new Error("The document is unavailable. The site was kept.");
  if (status !== "published" && documentId === source.homeDocumentId) throw new Error("The home page must remain published in the local site preview.");
  if (status !== "published") {
    return { ...source, documents: source.documents.map(item => item.id === documentId ? { ...item, status, updatedAt: now } : item), publications: source.publications.filter(item => item.document.id !== documentId) };
  }
  if (!document.title.trim()) throw new Error("Add a title before publishing.");
  const selected = document.publishAt ?? document.publishedAt;
  const date = selected ? parsePublicationDate(selected) : parsePublicationDate(now);
  if (!date || date.getTime() > new Date(now).getTime()) throw new Error("Choose a past or current publication date. Automatic scheduling is unavailable for this local site.");
  const published = { ...document, status, publishAt: undefined, publishedAt: date.toISOString(), updatedAt: now };
  const presentation = resolveTemplate(templates, published);
  const publication = { document: structuredClone(published), ...(presentation ? { assignment: { documentId, kind: published.kind, setId: presentation.set.id, templateId: presentation.templateId } } : {}) };
  return { ...source, documents: source.documents.map(item => item.id === documentId ? published : item), publications: [...source.publications.filter(item => item.document.id !== documentId), publication] };
}
