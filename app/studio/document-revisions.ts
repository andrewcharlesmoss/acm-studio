import type { StudioDocument, StudioWorkspace } from "./editor-model";

export type DocumentRevision = { id: string; savedAt: string; document: StudioDocument; confirmed?: boolean };
// Editorial content only. Publication state, taxonomy and template assignments stay current.
const fields = ["title", "subtitle", "slug", "excerpt", "author", "tags", "seoTitle", "seoDescription", "blocks", "coverImage", "metadataBlocksVersion", "documentShellVersion", "displayOverrides"] as const;
export function revisionContent(document: StudioDocument) {
  return Object.fromEntries(fields.map(field => [field, document[field]]));
}
export function revisionDocument(document: StudioDocument): StudioDocument {
  return { id: document.id, kind: document.kind, status: "draft", updatedAt: document.updatedAt, ...structuredClone(revisionContent(document)) } as StudioDocument;
}
export function restoreDocumentRevision(current: StudioDocument, saved: StudioDocument): StudioDocument {
  if (current.id !== saved.id || current.kind !== saved.kind) throw new Error("This revision belongs to another document.");
  return { ...current, ...structuredClone(revisionContent(saved)), updatedAt: new Date().toISOString() };
}
/** Keep history with the successful owning workspace write, independent of Undo snapshots. */
export function savedDocumentRevisions(previous: StudioWorkspace | null, next: StudioWorkspace): DocumentRevision[] {
  const retainedIds = new Set([...next.documents, ...next.bin.map(item => item.document)].map(item => item.id));
  const history = [...(previous?.documentRevisions ?? next.documentRevisions ?? [])].filter(item => retainedIds.has(item.document.id));
  const append = (document: StudioDocument, savedAt: string) => {
    const last = history.findLast(item => item.document.id === document.id);
    if (last && JSON.stringify(revisionContent(last.document)) === JSON.stringify(revisionContent(document))) return;
    history.push({ id: crypto.randomUUID(), savedAt, document: revisionDocument(document) });
  };
  for (const document of next.documents) {
    const before = previous?.documents.find(item => item.id === document.id);
    if (before && !history.some(item => item.document.id === document.id)) append(before, before.updatedAt);
  }
  for (const item of next.documentRevisions ?? []) {
    if (retainedIds.has(item.document.id) && !history.some(saved => saved.id === item.id)) history.push(item);
  }
  // Undo snapshots and backup imports can contain older archives. Order their
  // records before applying the budget so stale entries cannot evict newer saves.
  history.sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
  for (const document of next.documents) {
    append(document, new Date().toISOString());
  }
  // Bound browser storage; retain the newest saved versions when its budget is reached.
  while (history.length > 100 || JSON.stringify(history).length > 2 * 1024 * 1024) history.shift();
  return history;
}
