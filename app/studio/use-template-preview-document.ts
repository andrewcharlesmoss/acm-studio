import { useState } from "react";
import { createWorkspacePreviewDocument, type StudioDocument } from "./editor-model";

/** Scope transient selection to its content source, even when document IDs overlap. */
export function useTemplatePreviewDocument(documents: StudioDocument[], kind: string, source: string) {
  const candidates = documents.filter(document => kind === "page" || kind === "post" ? document.kind === kind : true);
  const [selection, setSelection] = useState({ source, id: candidates[0]?.id });
  if (selection.source !== source) setSelection({ source, id: candidates[0]?.id });
  const sample = candidates.find(document => document.id === (selection.source === source ? selection.id : undefined)) ?? candidates[0] ?? documents[0]
    ?? createWorkspacePreviewDocument(kind === "post" ? "post" : "page");
  return { candidates, sample, selectSample: (id: string) => setSelection({ source, id }) };
}
