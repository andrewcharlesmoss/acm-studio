"use client";
import { useState } from "react";
import { createTemplateSet, type TemplateSnapshot } from "./template-model";
import { cloneTemplateIntoSet } from "./template-cloning";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import type { useStudioDocumentCommands, DocumentTemplateSession } from "./use-studio-document-commands";

export type SaveTemplateDraft = {
  name: string; destination: string; includeAuthor: boolean; includeCategory: boolean;
  includeTags: boolean; includeParentPage: boolean;
};
export function useStudioDocumentActions({ workspace, activeDocument, resolvedDocument, templateSnapshot,
  templateSession, documentCommands, writable, codeEditorDirty, confirmCodeEditorDiscard,
  onDocumentCreated, onDocumentDuplicated, onDocumentRemoved, feedback,
}: {
  workspace: StudioWorkspace; activeDocument: StudioDocument; resolvedDocument: StudioDocument;
  templateSnapshot?: TemplateSnapshot; templateSession: DocumentTemplateSession;
  documentCommands: ReturnType<typeof useStudioDocumentCommands>; writable: boolean; codeEditorDirty: boolean;
  confirmCodeEditorDiscard: () => boolean; onDocumentCreated: (kind: StudioDocumentKind) => void;
  onDocumentDuplicated: () => void; onDocumentRemoved: (documentId: string, kind?: StudioDocumentKind) => void;
  feedback: (message: string) => void;
}) {
  const [saveTemplateDialog, setSaveTemplateDialog] = useState<SaveTemplateDraft>();
  const [newTemplateChoice, setNewTemplateChoice] = useState<string>();
  const [renameDocumentDialog, setRenameDocumentDialog] = useState<{ documentId: string; name: string; opener: HTMLElement | null } | null>(null);
  const [actionError, setActionError] = useState("");
  function fail(message: string) { setActionError(message); feedback(message); }
  function addDocument(kind: StudioDocumentKind) {
    if (!confirmCodeEditorDiscard()) return;
    const choice = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template }))).find(item => item.template.kind === kind && item.template.isDefault);
    const created = documentCommands.addDocument(kind, choice ? { setId: choice.set.id, templateId: choice.template.id } : undefined);
    if (created) onDocumentCreated(created.kind);
  }
  function addDocumentFromTemplate() {
    if (!confirmCodeEditorDiscard() || !writable || !templateSession.writable) return;
    const first = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template })))[0];
    if (!first) { addDocument("page"); return; }
    setActionError(""); setNewTemplateChoice(`${first.set.id}/${first.template.id}`);
  }
  function commitNewDocumentFromTemplate() {
    if (!newTemplateChoice || !writable || !templateSession.writable) return;
    const [setId, templateId] = newTemplateChoice.split("/");
    const choice = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template }))).find(item => item.set.id === setId && item.template.id === templateId);
    if (!choice) { fail("This template is no longer available. Choose another template."); return; }
    if (!documentCommands.addDocument(choice.template.kind, { setId, templateId })) { setActionError("The document could not be created. Check the editing status and try again."); return; }
    setNewTemplateChoice(undefined); onDocumentCreated(choice.template.kind);
  }
  function saveAsTemplate() {
    if (!writable || !templateSession.writable || !confirmCodeEditorDiscard()) return;
    setActionError("");
    setSaveTemplateDialog({ name: `${activeDocument.kind === "post" ? "Post" : "Page"} template`, destination: templateSnapshot?.set.name ?? templateSession.store.sets[0]?.name ?? "New template set", includeAuthor: false, includeCategory: false, includeTags: false, includeParentPage: false });
  }
  function commitSaveAsTemplate(draft: SaveTemplateDraft) {
    if (!writable || !templateSession.writable || !draft.name.trim() || !draft.destination.trim()) return;
    try {
      const saved = templateSession.commit(store => {
        const destination = store.sets.find(item => item.name === draft.destination.trim()) ?? createTemplateSet(draft.destination.trim());
        const source = templateSnapshot?.set ?? createTemplateSet();
        const assigned = source.templates.find(item => item.id === templateSnapshot?.templateId);
        const fallback = source.templates.find(item => item.kind === activeDocument.kind)!;
        const sourceTemplate = assigned ?? { ...fallback, nodes: fallback.nodes.filter(node => node.type !== "element" || node.element !== "post-metadata") };
        const { template, parts } = cloneTemplateIntoSet(source, sourceTemplate, destination, draft.name.trim());
        const defaults = { ...(draft.includeAuthor ? { author: resolvedDocument.author } : {}), ...(draft.includeCategory ? { category: resolvedDocument.category } : {}), ...(draft.includeTags ? { tags: [...resolvedDocument.tags] } : {}), ...(draft.includeParentPage ? { parentPageId: resolvedDocument.parentPageId } : {}) };
        const nextSet = { ...destination, templates: [...destination.templates, { ...template, defaults }], parts: [...destination.parts, ...parts] };
        return { ...store, sets: store.sets.some(item => item.id === nextSet.id) ? store.sets.map(item => item.id === nextSet.id ? nextSet : item) : [...store.sets, nextSet] };
      });
      if (saved) { setSaveTemplateDialog(undefined); return; }
    } catch { /* Leave the draft visible so the failed save remains reviewable. */ }
    fail("The template could not be saved. Check the editing status and try again.");
  }
  function duplicateDocument(documentId = activeDocument.id) {
    if (codeEditorDirty) { feedback("Apply the code editor changes before duplicating this document."); return; }
    if (documentCommands.duplicateDocument(documentId)) onDocumentDuplicated();
  }
  function requestRenameDocument(documentId: string, opener: HTMLElement | null = null) {
    const target = workspace.documents.find(item => item.id === documentId);
    if (!writable || !target) return;
    setActionError(""); setRenameDocumentDialog({ documentId, name: target.title, opener });
  }
  function confirmRenameDocument() {
    if (!renameDocumentDialog) return;
    if (documentCommands.renameDocument(renameDocumentDialog.documentId, renameDocumentDialog.name)) setRenameDocumentDialog(null);
    else fail("The document could not be renamed. Check the editing status and try again.");
  }
  function requestDeleteDocument(documentId = activeDocument.id) {
    if (codeEditorDirty) { feedback("Apply or discard the code editor changes before moving this document to the Bin."); return; }
    if (!documentCommands.moveDocumentToBin(documentId)) return;
    const remaining = workspace.documents.filter(item => item.id !== documentId);
    const index = workspace.documents.findIndex(item => item.id === documentId);
    onDocumentRemoved(documentId, remaining[Math.min(index, remaining.length - 1)]?.kind);
  }
  return { saveTemplateDialog, setSaveTemplateDialog, newTemplateChoice, setNewTemplateChoice, renameDocumentDialog,
    setRenameDocumentDialog, actionError, addDocument, addDocumentFromTemplate, commitNewDocumentFromTemplate,
    saveAsTemplate, commitSaveAsTemplate, duplicateDocument, requestRenameDocument, confirmRenameDocument, requestDeleteDocument };
}
