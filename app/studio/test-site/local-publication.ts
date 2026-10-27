import { testSiteCollection, type CurrentTestSiteCollection, type TestSiteCollection } from "./contract";
import { resolveTemplate, type TemplateStore } from "../template-model";
import { parsePublicationDate } from "../publication-date";

export const LOCAL_SITE_STATUSES = ["draft", "pending", "private", "scheduled", "published"] as const;
export type LocalSiteStatus = typeof LOCAL_SITE_STATUSES[number];
/** Publication commands are separate from ordinary editorial draft saves. */
export function changeLocalSiteStatus(input: TestSiteCollection, documentId: string, status: LocalSiteStatus, templates: TemplateStore, now = new Date().toISOString(), captureScheduled = true): CurrentTestSiteCollection {
  const source = testSiteCollection(input);
  if (!LOCAL_SITE_STATUSES.includes(status)) throw new Error("This status is not supported by the local site.");
  const document = source.documents.find(item => item.id === documentId);
  if (!document) throw new Error("The document is unavailable. The site was kept.");
  if (status !== "published" && (status !== "scheduled" || !captureScheduled)) {
    const selectedDate = parsePublicationDate(document.publishAt);
    const publishAt = selectedDate && selectedDate.getTime() > Date.parse(now) ? selectedDate.toISOString() : new Date(Date.parse(now) + 60 * 60 * 1000).toISOString();
    return { ...source, version: 17, documents: source.documents.map(item => item.id === documentId ? { ...item, status, ...(status === "scheduled" ? { publishAt } : {}), updatedAt: now } : item), publications: source.publications.filter(item => item.document.id !== documentId) };
  }
  if (!document.title.trim()) throw new Error("Add a title before publishing.");
  const selected = document.publishAt ?? document.publishedAt;
  const date = selected ? parsePublicationDate(selected) : parsePublicationDate(now);
  if (!date || (status === "scheduled" ? date.getTime() <= Date.parse(now) : date.getTime() > Date.parse(now))) {
    throw new Error(status === "scheduled" ? "Choose a future publication date before scheduling." : "Choose a past or current publication date, or select Scheduled for a future date.");
  }
  const published = { ...document, status, publishAt: status === "scheduled" ? date.toISOString() : undefined, publishedAt: date.toISOString(), updatedAt: now };
  const presentation = resolveTemplate(templates, published);
  const publication = { document: structuredClone(published), ...(presentation ? { assignment: { documentId, kind: published.kind, setId: presentation.set.id, templateId: presentation.templateId } } : {}) };
  return { ...source, version: 17, documents: source.documents.map(item => item.id === documentId ? published : item), publications: [...source.publications.filter(item => item.document.id !== documentId), publication] };
}

/** Older previews rendered every retained snapshot; preserve that published output on upgrade. */
export function localSitePublicationSnapshots(input: TestSiteCollection) {
  return testSiteCollection(input).publications;
}
