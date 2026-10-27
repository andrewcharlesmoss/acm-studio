"use client";
import { SelectControl } from "./controls/native-fields";
import type { LocalFixtureSiteId } from "./test-site/sites";
import { testDocumentHref, type CurrentTestSiteCollection } from "./test-site/contract";
import { useTemplates } from "./use-templates";
import { useStudioHistoryRouter } from "./use-studio-history-router";
import { updateDocumentWithHistory } from "./document-update-history";
import { resolveTemplate, templateMediaIds, type TemplateSnapshot } from "./template-model";
import { documentFieldUsage, resolveDocumentDisplay, resolveDocumentFields } from "./document-fields";
import { useTemplateMedia } from "./use-template-media";
import { TemplateDocument } from "./template-renderer";
import { DocumentTemplateControls } from "./document-template-controls";
import { createWorkspacePreviewDocument } from "./editor-model";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { StudioPresentation } from "./studio-presentation";
import { sharedHeaderReference, templateContainsHeader, type GlobalTemplateLibrary } from "./global-template-contract";
import { TestSiteNavigation } from "./test-site/navigation";
import { draftGlobalTemplateBindings, draftGlobalTemplates, globalDraftSnapshot, recoverDraftTemplateAssignment, retainDraftTemplateChanges } from "./draft-global-templates";

const emptyWorkspaceDocument = createWorkspacePreviewDocument("page");

/** Keeps document/template orchestration out of the screen coordinator. */
export function useDocumentTemplates(browserSession: ReturnType<typeof useStudioWorkspace>, onEditPart?: (setId: string, targetId: string) => void, siteContext?: { siteId: LocalFixtureSiteId; session: ReturnType<typeof useStudioWorkspace>; templates: ReturnType<typeof useTemplates>; collection: CurrentTestSiteCollection | null; commitContent: (update: (workspace: ReturnType<typeof useStudioWorkspace>["workspace"], templates: ReturnType<typeof useTemplates>["store"]) => { workspace: ReturnType<typeof useStudioWorkspace>["workspace"]; templates: ReturnType<typeof useTemplates>["store"] }) => boolean }, globals?: { library: GlobalTemplateLibrary | null; session: ReturnType<typeof useTemplates>; initialised: boolean }) {
  const session = siteContext?.session ?? browserSession;
  const { workspace, ownershipGeneration, writable: contentWritable } = session;
  const savedDocument = workspace.documents.find(item => item.id === workspace.activeDocumentId) ?? workspace.documents[0];
  const document = savedDocument ?? emptyWorkspaceDocument;
  const browserTemplates = useTemplates(ownershipGeneration, browserSession.writable);
  let projectionError: string | null = null;
  let projectedStore = browserTemplates.store;
  if (globals?.library && browserTemplates.ready) {
    try { projectedStore = draftGlobalTemplates(browserTemplates.store, globals.library); }
    catch (reason) { projectionError = reason instanceof Error ? reason.message : "Shared templates are unavailable. Recovery copies were kept."; }
  }
  const sharedReady = Boolean(globals?.library && globals.session.ready && browserTemplates.ready);
  const projectedTemplates: ReturnType<typeof useTemplates> = globals ? {
    ...browserTemplates, store: projectedStore, ready: sharedReady,
    writable: browserTemplates.writable && sharedReady && globals.initialised && globals.session.writable && !projectionError,
    exclusiveWritable: browserTemplates.exclusiveWritable && sharedReady && globals.initialised && globals.session.writable && !projectionError,
    error: browserTemplates.error ?? projectionError ?? globals.session.error,
    retryConnection: () => { browserTemplates.retryConnection(); globals.session.retryConnection(); },
    commit: update => {
      if (!globals.library || !globals.initialised || !globals.session.writable || projectionError) return false;
      return browserTemplates.commit(source => retainDraftTemplateChanges(source, update(draftGlobalTemplates(source, globals.library!)), globals.library!));
    },
  } : browserTemplates;
  const templates = siteContext?.templates ?? projectedTemplates;
  const writable = contentWritable && templates.ready && !templates.error;
  const browserHistory = useStudioHistoryRouter(browserSession, browserTemplates, ownershipGeneration);
  const history = siteContext ? { ...siteContext.session, record: () => {} } : browserHistory;
  const commit: typeof session.commit = update => { if (!writable) return false; history.record("document"); return session.commit(update); };
  const updateActiveDocument: typeof session.updateActiveDocument = update => updateDocumentWithHistory(writable, session.updateActiveDocument, () => history.record("document"), update);
  const updateActiveField: typeof session.updateActiveField = (field, value) => { if (!writable) return; history.record("document"); session.updateActiveField(field, value); };
  let snapshot: TemplateSnapshot | undefined;
  let templateAuthoringSnapshot: TemplateSnapshot | undefined;
  let resolutionError: string | null = null;
  try {
    if (templates.ready && savedDocument) snapshot = resolveTemplate(templates.store, savedDocument);
    if (globals?.library && snapshot) templateAuthoringSnapshot = globalDraftSnapshot(snapshot, siteContext?.templates.store ?? browserTemplates.store, globals.library);
  }
  catch (error) { resolutionError = error instanceof Error ? error.message : "Template unavailable."; }
  const fallbackHeader = !siteContext && !projectionError && sharedReady && globals?.library ? sharedHeaderReference(templates.store, globals.library, draftGlobalTemplateBindings(browserTemplates.store, globals.library)) : undefined;
  const fallbackSet = templates.store.sets.find(set => set.id === fallbackHeader?.setId);
  const media = useTemplateMedia([...new Set([...(snapshot ? templateMediaIds(snapshot.set) : []), ...(fallbackSet ? templateMediaIds(fallbackSet) : [])])]);
  const selectedTemplate = snapshot?.set.templates.find(item => item.id === snapshot.templateId);
  const resolvedFields = document ? resolveDocumentFields(document, snapshot?.set, selectedTemplate?.defaults) : undefined;
  const resolvedDocument = document && resolvedFields ? { ...document, author: resolvedFields.author, category: resolvedFields.category, tags: resolvedFields.tags, parentPageId: resolvedFields.parentPageId, displayOverrides: resolveDocumentDisplay(document, selectedTemplate) } : document;
  const fieldUsage = document ? documentFieldUsage(document, snapshot?.set, snapshot?.templateId) : undefined;
  const templateControls = <><DocumentTemplateControls siteId={siteContext?.siteId} document={document} store={templates.store} writable={templates.writable} error={templates.error ?? resolutionError ?? media.error} onChange={assignment => {
    const previous = templates.store.assignments.find(item => item.documentId === document.id);
    if (!templates.writable || !writable) return;
    if (siteContext) {
      const previousSnapshot = !assignment && previous ? resolveTemplate(templates.store, document) : undefined;
      const previousTemplate = previousSnapshot?.set.templates.find(item => item.id === previousSnapshot.templateId);
      const values = resolveDocumentFields(document, previousSnapshot?.set, previousTemplate?.defaults);
      siteContext.commitContent((current, store) => ({
        templates: { ...store, assignments: [...store.assignments.filter(item => item.documentId !== document.id), ...(assignment ? [assignment] : [])] },
        workspace: { ...current, documents: current.documents.map(item => item.id !== document.id ? item : !assignment && previous
          ? { ...item, ...values, templateOverrides: { author: true, category: true, tags: true, parentPageId: true } }
          : { ...item, templateOverrides: item.templateOverrides ?? { author: true, category: true, tags: true, parentPageId: true } }) },
      }));
      return;
    }
    const assignmentSaved = templates.commit(store => ({ ...store, assignments: [...store.assignments.filter(item => item.documentId !== document.id), ...(assignment ? [assignment] : [])] }));
    if (!assignmentSaved) return;
    if (!assignment && previous) {
      const previousSnapshot = resolveTemplate(templates.store, document);
      const previousTemplate = previousSnapshot?.set.templates.find(item => item.id === previousSnapshot.templateId);
      const values = resolveDocumentFields(document, previousSnapshot?.set, previousTemplate?.defaults);
      updateActiveDocument(current => ({ ...current, author: values.author, category: values.category, tags: values.tags, parentPageId: values.parentPageId, templateOverrides: { author: true, category: true, tags: true, parentPageId: true } }));
    } else if (assignment) {
      updateActiveDocument(current => ({ ...current, templateOverrides: current.templateOverrides ?? { author: true, category: true, tags: true, parentPageId: true } }));
    }
    history.record("template");
  }} />{projectionError && !siteContext && globals?.library && browserTemplates.store.assignments.some(item => item.documentId === document.id) ? <div role="alert"><p>{projectionError}</p><label>Resolve this document’s template<SelectControl aria-label="Resolve shared template assignment" defaultValue="keep" disabled={!browserTemplates.writable || !globals.session.writable} onChange={event => {
    if (event.target.value === "keep") return;
    const [setId, templateId] = event.target.value.split("/");
    const saved = browserTemplates.commit(source => recoverDraftTemplateAssignment(source, document.id, setId ? { documentId: document.id, kind: document.kind, setId, templateId } : undefined, globals.library!));
    if (saved) history.record("template");
  }}><option value="keep">Keep recovery assignment</option><option value="">Existing Presentation</option>{globals.library.templates.sets.flatMap(set => set.templates.filter(item => item.kind === document.kind).map(item => <option key={`${set.id}/${item.id}`} value={`${set.id}/${item.id}`}>{item.name}</option>))}</SelectControl></label></div> : null}</>;
  function templatePresentation(blockUrls: Record<string, string>, onChangeCover: () => void, onRemoveCover: () => void, showAssigned = true): StudioPresentation | undefined {
    const header = fallbackHeader;
    if (!snapshot || !showAssigned) return header ? { renderDocument: (context, content) => <><TestSiteNavigation site={{ templates: templates.store, siteNavigation: header, documents: workspace.documents }} mediaUrls={media.urls} headerReference={header} document={context.document} editing={context.mode === "edit"} onEdit={onEditPart} />{content}</> } : undefined;
    const resolved = snapshot;
    return {
      renderHeader: () => <></>, allowCoverImage: false, showPublicationDetails: false, hideDividers: false,
      renderDocument: (context, content) => <>{header && !templateContainsHeader(resolved.set.templates.find(item => item.id === resolved.templateId)!.nodes, resolved.set) ? <TestSiteNavigation site={{ templates: templates.store, siteNavigation: header, documents: workspace.documents }} mediaUrls={media.urls} headerReference={header} document={context.document} editing={context.mode === "edit"} onEdit={onEditPart} /> : null}<TemplateDocument documentHref={siteContext ? testDocumentHref(document.id) : undefined} snapshot={resolved} document={resolvedDocument ?? document} content={content} mediaUrls={{ ...blockUrls, ...media.urls }} navigationMenuLinks={siteContext?.collection ? node => {
        const menuId = siteContext.collection?.navigationAssignments.find(item => item.navigationId === node.id)?.menuId ?? siteContext.collection?.defaultNavigationMenuId;
        return siteContext.collection?.navigationMenus.find(menu => menu.id === menuId)?.links ?? resolved.set.navigation;
      } : undefined} editingDocument={context.mode === "edit" && writable} editorCanvas={context.mode === "edit"} selectedDocumentField={context.selectedDocumentField} onFocusDocumentField={context.onFocusDocumentField} onDocumentChange={updateActiveField} onChangeCover={onChangeCover} onRemoveCoverImage={onRemoveCover} onEditPart={context.mode === "edit" && onEditPart ? partId => onEditPart(resolved.set.id, partId) : undefined} /></>,
    };
  }
  function setFieldOverride(field: "author" | "category" | "tags" | "parentPageId", useTemplate: boolean) {
    updateActiveDocument(current => ({
      ...current,
      ...(field === "category" && useTemplate ? { category: undefined, categoryIds: undefined } : {}),
      templateOverrides: { ...current.templateOverrides, [field]: !useTemplate },
    }));
  }
  return {
    ...session, writable, commit, updateActiveDocument, updateActiveField,
    canRetryEditing: session.canRetryEditing || templates.syncStatus === "disconnected",
    retryEditing: () => { session.retryEditing(); templates.retryConnection(); },
    undo: history.undo, redo: history.redo, canUndo: writable && history.canUndo, canRedo: writable && history.canRedo,
    templateSession: templates, browserTemplateSession: browserTemplates,
    templateControls, templatePresentation, hasTemplate: Boolean(snapshot), resolvedDocument: resolvedDocument ?? document, fieldUsage, templateSnapshot: snapshot, templateAuthoringSnapshot, setFieldOverride,
    saveLabel: templates.error ? "Templates need attention" : templates.saveLabel === "Saving…" && !session.saveLabel.startsWith("Could not") ? templates.saveLabel : session.saveLabel,
  };
}
