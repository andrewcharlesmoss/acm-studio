"use client";

import { studioWriteOwnership } from "./write-ownership";
import { browserPublishingRepository, type PublishingRepository } from "../content/publishing-repository";
import { createDocument, type StudioDocument, type StudioDocumentKind, type StudioWorkspace } from "./editor-model";
import { addDocumentToWorkspace, deleteDocumentFromWorkspace, duplicateDocumentWithIds } from "./studio-command-operations.mjs";

type CommitWorkspace = (update: (current: StudioWorkspace) => StudioWorkspace) => boolean | void;

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

  function deleteDocument(documentId = activeDocument.id) {
    const document = workspace.documents.find((item) => item.id === documentId);
    if (!document || workspace.documents.length === 1) return false;
    if (document.kind === "post" && document.status === "published") {
      if (publishingRepository === browserPublishingRepository && !studioWriteOwnership.canWrite()) return false;
      publishingRepository.unpublish(document.id);
    }
    return commit((current) => deleteDocumentFromWorkspace(current, document.id)) !== false;
  }

  return { selectDocument, addDocument, duplicateDocument, deleteDocument };
}
