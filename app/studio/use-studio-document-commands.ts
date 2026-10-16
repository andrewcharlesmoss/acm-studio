"use client";

import { studioWriteOwnership } from "./write-ownership";
import { getLocallyPublishedArticle, restoreLocallyPublishedArticle, unpublishDocumentLocally } from "../content/local-publishing";
import { createDocument, createDocumentFromTemplate, type StudioDocument, type StudioDocumentKind, type StudioWorkspace } from "./editor-model";
import { addDocumentToWorkspace, duplicateDocumentWithIds } from "./studio-command-operations.mjs";
import { templateId, type TemplateAssignment, type TemplateStore } from "./template-model";

export type CommitWorkspace = (update: (current: StudioWorkspace) => StudioWorkspace) => boolean | void;
export type DocumentTemplateSession = {
  store: TemplateStore;
  writable: boolean;
  commit: (update: (current: TemplateStore) => TemplateStore) => boolean;
};
export const browserDocumentPublications = {
  capture: getLocallyPublishedArticle,
  unpublish: unpublishDocumentLocally,
  restore: restoreLocallyPublishedArticle,
};
type DocumentPublications = typeof browserDocumentPublications;

/** The screen supplies its one history-wrapped workspace and template sessions. */
export function useStudioDocumentCommands({ workspace, activeDocument, commit, setActiveDocument,
  writable, exclusiveWritable, templates, feedback, publications = browserDocumentPublications, commitWithTemplates,
}: {
  workspace: StudioWorkspace; activeDocument: StudioDocument; commit: CommitWorkspace;
  setActiveDocument: (documentId: string) => void; writable: boolean; exclusiveWritable: boolean;
  templates: DocumentTemplateSession; feedback: (message: string) => void;
  publications?: DocumentPublications;
  commitWithTemplates?: (update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) => boolean;
}) {
  function selectDocument(document: StudioDocument) {
    setActiveDocument(document.id);
  }
  function restoreAssignment(assignment: TemplateAssignment) {
    try {
      return templates.commit(store => ({ ...store, assignments: [...store.assignments.filter(item => item.documentId !== assignment.documentId), assignment] }));
    } catch { return false; }
  }
  function addDocument(kind: StudioDocumentKind, choice?: { setId: string; templateId: string }) {
    if (!writable || (choice && !templates.writable)) return null;
    const document = choice ? createDocumentFromTemplate(kind, `${kind}-${crypto.randomUUID()}`) : createDocument(kind);
    if (commitWithTemplates) {
      const saved = commitWithTemplates((current, store) => ({ workspace: addDocumentToWorkspace(current, document),
        templates: choice ? { ...store, assignments: [...store.assignments, { documentId: document.id, kind, ...choice }] } : store }));
      if (saved) { setActiveDocument(document.id); return document; }
      return null;
    }
    let assigned = false;
    try {
      if (choice) {
        assigned = templates.commit(store => ({ ...store, assignments: [...store.assignments, { documentId: document.id, kind, ...choice }] }));
        if (!assigned) return null;
      }
      if (commit(current => addDocumentToWorkspace(current, document)) !== false) return document;
    } catch { /* Compensate the assignment before reporting the rejected create. */ }
    const removed = !assigned || (() => {
      try { return templates.commit(store => ({ ...store, assignments: store.assignments.filter(item => item.documentId !== document.id) })); }
      catch { return false; }
    })();
    feedback(removed ? "The document could not be created. Try again." : "The document could not be created and its template assignment could not be restored. Keep this page open and export a Backup.");
    return null;
  }
  function duplicateDocument(documentId = activeDocument.id) {
    const source = workspace.documents.find(item => item.id === documentId);
    if (!writable || !source) return null;
    const uniqueId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
    const copy = duplicateDocumentWithIds(source, uniqueId, uniqueId) as StudioDocument;
    return commit(current => addDocumentToWorkspace(current, copy)) === false ? null : copy;
  }
  function renameDocument(documentId: string, title: string) {
    const source = workspace.documents.find(item => item.id === documentId);
    if (!writable || !source || !title.trim()) return false;
    if (source.title === title.trim()) return true;
    return commit(current => ({ ...current, documents: current.documents.map(document => document.id === documentId
      ? { ...document, title: title.trim(), updatedAt: new Date().toISOString() } : document) })) !== false;
  }
  function canDeleteDocument(document: StudioDocument | null | undefined) {
    if (!writable || !document || !workspace.documents.some(item => item.id === document.id)) return false;
    const published = document.status === "published" || document.status === "scheduled";
    const assignment = templates.store.assignments.some(item => item.documentId === document.id);
    return (!published || exclusiveWritable) && (!assignment || templates.writable);
  }
  function moveDocumentToBin(documentId = activeDocument.id) {
    const document = workspace.documents.find(item => item.id === documentId);
    if (!canDeleteDocument(document) || !document) return false;
    const assignment = templates.store.assignments.find(item => item.documentId === documentId);
    const remainingActiveDocumentId = (current: StudioWorkspace) => {
      if (current.activeDocumentId !== documentId) return current.activeDocumentId;
      const remaining = current.documents.filter(item => item.id !== documentId);
      return (remaining.find(item => item.kind === document.kind) ?? remaining[0])?.id ?? "";
    };
    if (commitWithTemplates) {
      let nextActiveDocumentId = workspace.activeDocumentId;
      const saved = commitWithTemplates((current, store) => ({
        workspace: { ...current, documents: current.documents.filter(item => item.id !== documentId),
          bin: [...current.bin, { id: templateId(), deletedAt: new Date().toISOString(), document, ...(assignment ? { assignment } : {}) }],
          activeDocumentId: nextActiveDocumentId = remainingActiveDocumentId(current) },
        templates: { ...store, assignments: store.assignments.filter(item => item.documentId !== documentId) },
      }));
      if (saved && workspace.activeDocumentId === documentId) setActiveDocument(nextActiveDocumentId);
      return saved;
    }
    let publication: ReturnType<DocumentPublications["capture"]> = undefined;
    let assignmentRemoved = false;
    let publicationRemoved = false;
    try {
      publication = publications.capture(documentId);
      if (publication && (!exclusiveWritable || (publications === browserDocumentPublications && !studioWriteOwnership.canWrite()))) return false;
      if (assignment) {
        assignmentRemoved = templates.commit(store => ({ ...store, assignments: store.assignments.filter(item => item.documentId !== documentId) }));
        if (!assignmentRemoved) {
          feedback("The template assignment could not be removed, so the document was not moved to the Bin.");
          return false;
        }
      }
      if (publication) { publicationRemoved = true; publications.unpublish(documentId); }
      const moved = commit(current => ({
        ...current, documents: current.documents.filter(item => item.id !== documentId),
        bin: [...current.bin, { id: templateId(), deletedAt: new Date().toISOString(), document,
          ...(assignment ? { assignment } : {}), ...(publication ? { publication } : {}) }],
        activeDocumentId: remainingActiveDocumentId(current),
      }));
      if (moved !== false) return true;
    } catch { /* Restore both stores when any part of the Bin transaction fails. */ }
    let recovered = true;
    if (publicationRemoved && publication) {
      try { publications.restore(publication); } catch { recovered = false; }
    }
    if (assignmentRemoved && assignment && !restoreAssignment(assignment)) recovered = false;
    feedback(recovered ? "The document could not be moved to the Bin. Try again." : "The document could not be moved to the Bin and its publication or template assignment could not be restored. Keep this page open and export a Backup.");
    return false;
  }
  return { selectDocument, addDocument, duplicateDocument, renameDocument, canDeleteDocument, moveDocumentToBin };
}
