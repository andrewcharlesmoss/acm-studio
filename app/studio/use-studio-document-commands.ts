"use client";

import { studioWriteOwnership } from "./write-ownership";
import { browserPublishingRepository, type PublishingRepository } from "../content/publishing-repository";
import { createDocument, type StudioDocument, type StudioDocumentKind, type StudioWorkspace } from "./editor-model";
import { addDocumentToWorkspace, deleteDocumentFromWorkspace, duplicateDocumentWithIds } from "./studio-command-operations.mjs";

type CommitWorkspace = (update: (current: StudioWorkspace) => StudioWorkspace) => void;

function createUniqueId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function useStudioDocumentCommands({
  workspace,
  activeDocument,
  commit,
  setActiveDocument,
  publishingRepository = browserPublishingRepository,
}: {
  workspace: StudioWorkspace;
  activeDocument: StudioDocument;
  commit: CommitWorkspace;
  setActiveDocument: (documentId: string) => void;
  publishingRepository?: PublishingRepository;
}) {
  function selectDocument(document: StudioDocument) {
    setActiveDocument(document.id);
  }

  function addDocument(kind: StudioDocumentKind) {
    const document = createDocument(kind);
    commit((current) => addDocumentToWorkspace(current, document));
    return document;
  }

  function duplicateDocument() {
    const copy = duplicateDocumentWithIds(activeDocument, createUniqueId, createUniqueId) as StudioDocument;
    commit((current) => addDocumentToWorkspace(current, copy));
    return copy;
  }

  function deleteDocument() {
    if (publishingRepository === browserPublishingRepository && !studioWriteOwnership.canWrite()) return false;
    if (workspace.documents.length === 1) return false;
    if (activeDocument.kind === "post" && activeDocument.status === "published") {
      publishingRepository.unpublish(activeDocument.id);
    }
    commit((current) => deleteDocumentFromWorkspace(current, activeDocument.id));
    return true;
  }

  return { selectDocument, addDocument, duplicateDocument, deleteDocument };
}
