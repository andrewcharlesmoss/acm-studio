"use client";
import { useTemplates } from "./use-templates";
import { useStudioHistoryRouter } from "./use-studio-history-router";
import { resolveTemplate, templateMediaIds, type TemplateSnapshot } from "./template-model";
import { documentFieldUsage, resolveDocumentFields } from "./document-fields";
import { useTemplateMedia } from "./use-template-media";
import { TemplateDocument } from "./template-renderer";
import { DocumentTemplateControls } from "./document-template-controls";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { StudioPresentation } from "./studio-presentation";

/** Keeps document/template orchestration out of the screen coordinator. */
export function useDocumentTemplates(session: ReturnType<typeof useStudioWorkspace>) {
  const { workspace, ownershipGeneration, writable } = session;
  const document = workspace.documents.find(item => item.id === workspace.activeDocumentId) ?? workspace.documents[0];
  const templates = useTemplates(ownershipGeneration, writable);
  const history = useStudioHistoryRouter(session, templates, ownershipGeneration);
  const commit: typeof session.commit = update => { if (!writable) return; history.record("document"); session.commit(update); };
  const updateActiveDocument: typeof session.updateActiveDocument = update => { if (!writable) return; history.record("document"); session.updateActiveDocument(update); };
  const updateActiveField: typeof session.updateActiveField = (field, value) => { if (!writable) return; history.record("document"); session.updateActiveField(field, value); };
  let snapshot: TemplateSnapshot | undefined;
  let resolutionError: string | null = null;
  try { if (templates.ready && document) snapshot = resolveTemplate(templates.store, document); }
  catch (error) { resolutionError = error instanceof Error ? error.message : "Template unavailable."; }
  const media = useTemplateMedia(snapshot ? templateMediaIds(snapshot.set) : []);
  const selectedTemplate = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
  const resolvedFields = document ? resolveDocumentFields(document, snapshot?.set, selectedTemplate?.defaults) : undefined;
  const resolvedDocument = document && resolvedFields ? { ...document, author: resolvedFields.author, category: resolvedFields.category, tags: resolvedFields.tags } : document;
  const fieldUsage = document ? documentFieldUsage(document, snapshot?.set, snapshot?.templateId) : undefined;
  const templateControls = <DocumentTemplateControls document={document} store={templates.store} writable={templates.writable} error={templates.error ?? resolutionError ?? media.error} onDefaultsChange={defaults => {
    if (!snapshot) return;
    if (templates.commit(store => ({ ...store, sets: store.sets.map(set => set.id === snapshot.set.id ? { ...set, templates: set.templates.map(template => template.id === snapshot.templateId ? { ...template, defaults } : template) } : set) }))) history.record("template");
  }} onChange={assignment => {
    const previous = templates.store.assignments.find(item => item.documentId === document.id);
    if (!templates.writable || !writable) return;
    const assignmentSaved = templates.commit(store => ({ ...store, assignments: [...store.assignments.filter(item => item.documentId !== document.id), ...(assignment ? [assignment] : [])] }));
    if (!assignmentSaved) return;
    if (!assignment && previous) {
      const previousSnapshot = resolveTemplate(templates.store, document);
      const previousTemplate = previousSnapshot?.set.templates.find(item => item.id === previousSnapshot.templateId);
      const values = resolveDocumentFields(document, previousSnapshot?.set, previousTemplate?.defaults);
      updateActiveDocument(current => ({ ...current, author: values.author, category: values.category, tags: values.tags, templateOverrides: { author: true, category: true, tags: true } }));
    } else if (assignment) {
      updateActiveDocument(current => ({ ...current, templateOverrides: current.templateOverrides ?? { author: true, category: true, tags: true } }));
    }
    history.record("template");
  }} />;
  function templatePresentation(blockUrls: Record<string, string>, onChangeCover: () => void, onRemoveCover: () => void): StudioPresentation | undefined {
    if (!snapshot) return;
    const resolved = snapshot;
    return {
      renderHeader: () => <></>, allowCoverImage: false, showPublicationDetails: false, hideDividers: false,
      renderDocument: (context, content) => <TemplateDocument snapshot={resolved} document={resolvedDocument ?? document} content={content} mediaUrls={{ ...blockUrls, ...media.urls }} editingDocument={context.mode === "edit" && writable} onDocumentChange={updateActiveField} onChangeCover={onChangeCover} onRemoveCover={onRemoveCover} onEditPart={context.mode === "edit" ? partId => { window.location.assign(`/studio/templates?set=${encodeURIComponent(resolved.set.id)}&target=${encodeURIComponent(partId)}`); } : undefined} />,
    };
  }
  function setFieldOverride(field: "author" | "category" | "tags", useTemplate: boolean) {
    updateActiveDocument(current => ({ ...current, templateOverrides: { ...current.templateOverrides, [field]: !useTemplate } }));
  }
  return {
    ...session, commit, updateActiveDocument, updateActiveField,
    undo: history.undo, redo: history.redo, canUndo: writable && history.canUndo, canRedo: writable && history.canRedo,
    templateSession: templates,
    templateControls, templatePresentation, hasTemplate: Boolean(snapshot), resolvedDocument: resolvedDocument ?? document, fieldUsage, templateSnapshot: snapshot, setFieldOverride,
    saveLabel: templates.error ? "Templates need attention" : templates.saveLabel === "Saving…" && !session.saveLabel.startsWith("Could not") ? templates.saveLabel : session.saveLabel,
  };
}
