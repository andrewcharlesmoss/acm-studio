"use client";
import { useState } from "react";
import { createTemplateSet, type TemplateSnapshot } from "./template-model";
import { cloneTemplateIntoSet } from "./template-cloning";
import { templateLibraryContext } from "./template-library";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import type { useStudioDocumentCommands, DocumentTemplateSession } from "./use-studio-document-commands";

export type SaveTemplateDraft = {
  // Older dialog consumers may still pass this field; authoring no longer uses it.
  destination?: string;
  name: string; includeAuthor: boolean; includeCategory: boolean;
  includeTags: boolean; includeParentPage: boolean;
};
export function useStudioDocumentActions({ workspace, activeDocument, resolvedDocument, templateSnapshot,
  templateSession, templateAuthoringSession, templateAuthoringSnapshot, documentCommands, writable, codeEditorDirty, confirmCodeEditorDiscard,
  onDocumentCreated, onDocumentDuplicated, onDocumentRemoved, feedback,
}: {
  workspace: StudioWorkspace; activeDocument: StudioDocument; resolvedDocument: StudioDocument;
  templateSnapshot?: TemplateSnapshot; templateSession: DocumentTemplateSession;
  templateAuthoringSession?: DocumentTemplateSession; templateAuthoringSnapshot?: TemplateSnapshot;
  documentCommands: ReturnType<typeof useStudioDocumentCommands>; writable: boolean; codeEditorDirty: boolean;
  confirmCodeEditorDiscard: () => boolean; onDocumentCreated: (kind: StudioDocumentKind) => void;
  onDocumentDuplicated: () => void; onDocumentRemoved: (documentId: string) => void;
  feedback: (message: string) => void;
}) {
  const authoringTemplates = templateAuthoringSession ?? templateSession;
  const authoringSnapshot = templateAuthoringSession ? templateAuthoringSnapshot : templateSnapshot;
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
    if (!writable || !authoringTemplates.writable || !confirmCodeEditorDiscard()) return;
    setActionError("");
    setSaveTemplateDialog({ name: `${activeDocument.kind === "post" ? "Post" : "Page"} template`, includeAuthor: false, includeCategory: false, includeTags: false, includeParentPage: false });
  }
  function commitSaveAsTemplate(draft: SaveTemplateDraft) {
    if (!writable || !authoringTemplates.writable || !draft.name.trim()) return;
    try {
      const saved = authoringTemplates.commit(store => {
        const destination = authoringSnapshot
          ? store.sets.find(item => item.id === authoringSnapshot.set.id)
          : templateLibraryContext(store);
        if (!destination) throw new Error("The source template is no longer available.");
        const source = authoringSnapshot?.set ?? createTemplateSet();
        const assigned = source.templates.find(item => item.id === authoringSnapshot?.templateId);
        const fallback = source.templates.find(item => item.kind === activeDocument.kind)!;
        const sourceTemplate = assigned ?? { ...fallback, nodes: fallback.nodes.filter(node => node.type !== "element" || node.element !== "post-metadata") };
        const { template, parts } = cloneTemplateIntoSet(source, sourceTemplate, destination, draft.name.trim());
        const defaults = { ...(draft.includeAuthor ? { author: resolvedDocument.author } : {}), ...(draft.includeCategory ? { category: resolvedDocument.category } : {}), ...(draft.includeTags ? { tags: [...resolvedDocument.tags] } : {}), ...(draft.includeParentPage ? { parentPageId: resolvedDocument.parentPageId } : {}) };
        const nextSet = { ...destination, templates: [...destination.templates, { ...template, defaults, isDefault: false }], parts: [...destination.parts, ...parts] };
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
    onDocumentRemoved(documentId);
  }
  return { saveTemplateDialog, setSaveTemplateDialog, newTemplateChoice, setNewTemplateChoice, renameDocumentDialog,
    setRenameDocumentDialog, actionError, addDocument, addDocumentFromTemplate, commitNewDocumentFromTemplate,
    saveAsTemplate, commitSaveAsTemplate, duplicateDocument, requestRenameDocument, confirmRenameDocument, requestDeleteDocument };
}
