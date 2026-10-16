"use client";
import { localPublicationHref } from "../content/publication-address";
import { flushSitesDisclosureSaves } from "./sites-disclosure-repository.mjs";
import { SitesDisclosureProvider } from "./project-local-links";
import { ResponsiveStyleProvider } from "./responsive-style-context";
import { reorderLibraryDocuments, reorderLibraryTemplates } from "./library-reordering";
import { existingSitePresentation } from "./test-site/existing-presentation";
import { DocumentRevisionsControl } from "./document-revisions-control";
import { revisionDocument, restoreDocumentRevision, type DocumentRevision } from "./document-revisions";
import { browserWorkspaceRepository, withSavedDocumentRevisions } from "./workspace-repository";
import { validateStudioWorkspace } from "./workspace-validation";
import { useNavigationEditing, useNavigationEditSelection } from "./use-navigation-editing";
import { useGlobalTemplates } from "./use-global-templates";
import type { GlobalTemplatePreviewSite } from "./global-template-preview";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BackupManager } from "./backup-manager";
import { MediaManager } from "./media-manager";
import { StudioEditor, useStudioDocumentCounts } from "./studio-editor";
import { useStudioCanvasActions } from "./use-studio-canvas-actions";
import { useStudioCategories } from "./use-studio-categories";
import { studioContextPath, useStudioScreenNavigation, writeStudioNavigation, type StudioTemplateTarget, type StudioLibraryKind } from "./use-studio-screen-navigation";
import { useStudioDocumentActions } from "./use-studio-document-actions";
import { StudioDocumentDialogs } from "./studio-document-dialogs";
import { StudioDesignMediaHandoff } from "./studio-design-media-handoff";
import { StudioSitePreview } from "./studio-site-preview";
import { StudioHeader, type StudioBreadcrumbTarget } from "./studio-header";
import { StudioNavigationPane } from "./studio-navigation-pane";
import { StudioIcon } from "./studio-icons";
import { viewportWidthFor, type StudioViewport, type StudioViewMode } from "./studio-view-menu";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { findBlockById } from "./studio-command-operations.mjs";
import { useStudioDocumentCommands } from "./use-studio-document-commands";
import { useStudioMedia } from "./use-studio-media";
import { portableFeaturedImage, siteImagePreviewUrls } from "./test-site/featured-images";
import { useStudioPublishing } from "./use-studio-publishing";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useDocumentTemplates } from "./use-document-templates";
import { useTemplateDependencies, useTemplateDependencySelection } from "./use-template-dependencies";
import { TemplateWorkspacePanel } from "./template-workspace";
import { studioConflictDetails } from "./studio-sync-description";
import {
  blockCatalogue,
  type StudioDocument,
  type StudioDocumentKind,
} from "./editor-model";
import { StudioBin } from "./studio-bin";
import { exportStudioJson as exportJson } from "./studio-json-export";
import { insertDesignMedia } from "./design-media-handoff-command";
import { loadStoredInlineImages } from "./inline-image-library";
import { useTestSite } from "./test-site/use-test-site";
import { importBrowserTestContent, testDocumentHref } from "./test-site/contract";
import { TestSiteBackup } from "./test-site/test-site-backup";
import { useTestSiteContext } from "./test-site/use-test-site-context";
import { testSiteCss } from "./test-site/style";
import { withTestSiteNavigation } from "./test-site/navigation";
type StudioInitialView = {
  site?: LocalFixtureSiteId | null;
  libraryKind?: StudioLibraryKind;
  preview: boolean;
  documentId: string | null;
  viewport: StudioViewport;
  showTemplate: boolean;
};

export function StudioPrototype({ initialView }: { initialView: StudioInitialView }) {
  const [previewWindow] = useState(initialView.preview);
  const [previewDocumentId] = useState(initialView.documentId);
  const studioSession = useStudioWorkspace(undefined, undefined, undefined, undefined, undefined, { readOnly: previewWindow, activeDocumentId: previewDocumentId ?? undefined });
  const [selectedSite] = useState<LocalFixtureSiteId | null>(initialView.site ?? null);
  const [switchingSite, setSwitchingSite] = useState(false);
  const selectedSiteRef = useRef(selectedSite);
  const { editingSiteNavigation, setEditingSiteNavigation, navigationEditTarget } = useNavigationEditSelection(selectedSite);
  const [siteFeedback, setSiteFeedback] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(previewWindow);
  const [viewMode, setViewMode] = useState<StudioViewMode>("editing");
  const [viewViewport, setViewViewport] = useState<StudioViewport>(initialView.viewport);
  const [showTemplate, setShowTemplate] = useState(initialView.showTemplate);
  const [studioSection, setStudioSection] = useState<"content" | "templates" | "files" | "backup" | "bin">("content");
  const [dependencyTarget, setDependencyTarget] = useTemplateDependencySelection(); const [templateCanvasVisible, setTemplateCanvasVisible] = useState(false);
  const [templateViewport, setTemplateViewport] = useState<StudioViewport>("desktop");
  const [templateTarget, setTemplateTarget] = useState<StudioTemplateTarget>({ setId: null, targetId: null });
  const [templatePreviewSite, setTemplatePreviewSite] = useState<GlobalTemplatePreviewSite>("neutral");
  const [libraryKind, setLibraryKind] = useState<StudioLibraryKind>(initialView.libraryKind ?? "page");
  const openTemplateTarget = (setId: string, targetId: string) => {
    if (!confirmCodeEditorDiscard()) return false;
    setTemplateTarget({ setId, targetId, scope: "global" });
    setLibraryKind("templates");
    setStudioSection("templates"); setPreviewing(false);
    if (!previewWindow) writeStudioNavigation("templates", { setId, targetId, scope: "global" });
    return true;
  };
  const canOwnSite = studioSession.ready && studioSession.exclusiveWritable && !previewWindow;
  // The global writer must broker either fixture, even when it displays the other site.
  const firstSite = useTestSite(Boolean(dependencyTarget) || selectedSite !== "test2" || studioSection === "templates" && navigationEditTarget === "test", canOwnSite, "test", studioSection === "templates");
  const secondSite = useTestSite(Boolean(dependencyTarget) || selectedSite === "test2" || studioSection === "templates" && navigationEditTarget === "test2", canOwnSite, "test2", studioSection === "templates");
  const testSite = selectedSite === "test2" ? secondSite : firstSite;
  const siteName = localFixtureName(selectedSite ?? "test");
  const pauseFirstSite = firstSite.pauseEditing;
  const pauseSecondSite = secondSite.pauseEditing;
  useEffect(() => {
    // Ownership and site hooks reconnect against fresh source on pageshow while
    // retaining pending input. A forced reload here would discard that draft.
    const refreshCachedPage = (event: PageTransitionEvent) => {
      if (event.persisted) { setSwitchingSite(false); pauseFirstSite(false); pauseSecondSite(false); }
    };
    window.addEventListener("pageshow", refreshCachedPage);
    return () => window.removeEventListener("pageshow", refreshCachedPage);
  }, [pauseFirstSite, pauseSecondSite]);
  const globalTemplates = useGlobalTemplates(testSite, true, canOwnSite, previewWindow);
  useEffect(() => {
    if (!globalTemplates.library || !templateTarget.setId || !templateTarget.targetId) return;
    const binding = (selectedSite ? globalTemplates.library.migrations[selectedSite].bindings : [...globalTemplates.library.migrations.test.bindings, ...globalTemplates.library.migrations.test2.bindings]).find(item => item.setId === templateTarget.setId);
    const canonical = binding ? { setId: binding.globalSetId, targetId: Object.entries(binding.ids).find(([, id]) => id === templateTarget.targetId)?.[0] ?? templateTarget.targetId, scope: "global" as const } : { ...templateTarget, scope: "global" as const };
    if (canonical.setId === templateTarget.setId && canonical.targetId === templateTarget.targetId && templateTarget.scope === "global") return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setTemplateTarget(canonical); if (!previewWindow) writeStudioNavigation("templates", canonical); } });
    return () => { cancelled = true; };
  }, [globalTemplates.library, templateTarget, selectedSite, previewWindow]);
  const testContext = useTestSiteContext(testSite, studioSession, previewDocumentId, globalTemplates.library, globalTemplates.initialised);
  const { workspace, writable, exclusiveWritable, syncConflict, syncResolutionError, resolveSyncConflict, canRetryEditing, retryEditing, saveLabel, setSaveLabel, commit, undo, redo, canUndo, canRedo, updateActiveDocument: updateWorkspaceDocument, setActiveDocument, templateSession, templateControls, templatePresentation, hasTemplate, resolvedDocument, fieldUsage, setFieldOverride, templateSnapshot, templateAuthoringSnapshot, browserTemplateSession } = useDocumentTemplates(studioSession, openTemplateTarget, selectedSite ? testContext : undefined, globalTemplates);
  const navigationEditing = useNavigationEditing({ target: navigationEditTarget, editing: editingSiteNavigation, onEditingChange: setEditingSiteNavigation,
    browserTemplates: browserTemplateSession, globals: globalTemplates, fixture: navigationEditTarget === "test2" ? secondSite : firstSite,
    browserSession: studioSession });
  const { prepareLeave: prepareNavigationLeave, afterNavigation } = navigationEditing;
  const dependencies = useTemplateDependencies({ target: dependencyTarget, onTargetChange: setDependencyTarget, globals: globalTemplates, browser: studioSession, browserTemplates: browserTemplateSession, firstSite, secondSite, beforeOpen: prepareNavigationLeave, onOpenTemplate: openTemplateTarget }); const currentWorkspaceSession = selectedSite ? testContext.session : studioSession;
  const importAttempt = useRef(false);
  useEffect(() => {
    if (previewWindow || !selectedSite || !testSite.writable || !testSite.draft || !studioSession.ready || !browserTemplateSession.ready || importAttempt.current || (testSite.draft.version === 3 || testSite.draft.version === 4 || (testSite.draft.version === 5 || testSite.draft.version === 6 || (testSite.draft.version === 7 || testSite.draft.version === 8))) && testSite.draft.browserImportComplete) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || importAttempt.current) return;
      importAttempt.current = true;
      try {
        const imported = importBrowserTestContent(testSite.draft!, studioSession.workspace, browserTemplateSession.store);
        if (!testSite.installDraft(imported, false)) throw new Error(`${siteName}’s saving session is unavailable. The browser originals were kept.`);
        void testSite.flush().catch(() => {});
      } catch (error) { setSiteFeedback(error instanceof Error ? error.message : `${siteName} could not import the browser drafts. All originals were kept.`); }
    });
    return () => { cancelled = true; };
  }, [previewWindow, selectedSite, testSite, studioSession, browserTemplateSession, siteName]);
  const [libraryPaneCollapsed, setLibraryPaneCollapsed] = useState(false);
  const [libraryPaneWidth, setLibraryPaneWidth] = useState(290);
  const [inspectorPaneCollapsed, setInspectorPaneCollapsed] = useState(false);
  const [inspectorPaneWidth, setInspectorPaneWidth] = useState(300);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pendingColumnsLayoutBlockId, setPendingColumnsLayoutBlockId] = useState<string | null>(null);
  const [documentFieldSelection, setDocumentFieldSelection] = useState<{ documentId: string; field: "title" | "subtitle" } | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "studio" | "block" | "styles">("document");
  const templateInspectorTab = inspectorTab === "block" || inspectorTab === "styles" ? inspectorTab : "template";
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [codeEditorDirty, setCodeEditorDirty] = useState(false);
  const codeEditorDirtyRef = useRef(codeEditorDirty);
  useLayoutEffect(() => { codeEditorDirtyRef.current = codeEditorDirty; }, [codeEditorDirty]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  function confirmCodeEditorDiscard() {
    if (!codeEditorDirtyRef.current) return true;
    if (!window.confirm("Discard unsaved code changes?")) return false;
    codeEditorDirtyRef.current = false; setCodeEditorDirty(false);
    return true;
  }
  function changeViewMode(mode: StudioViewMode) {
    if (mode === viewMode) return;
    if (!confirmCodeEditorDiscard()) return;
    setViewMode(mode);
  }
  function changeViewport(viewport: StudioViewport) {
    setViewViewport(viewport);
    if (viewMode === "full") setViewMode("website");
  }
  const websiteView = Boolean(selectedSite && studioSection === "content" && !previewWindow && viewMode !== "editing");
  const workspaceDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0] ?? resolvedDocument;
  const activeDocument = workspaceDocument;
  const displayedDocument = resolvedDocument;
  const editorWritable = selectedSite ? testSite.writable && !switchingSite : writable;
  const updateActiveDocument = (update: (document: StudioDocument) => StudioDocument) => {
    if (!editorWritable) return false;
    if (!selectedSite) { updateWorkspaceDocument(update); return true; }
    const saved = testContext.updateDocument(activeDocument.id, update);
    if (!saved) { setSiteFeedback(`This change cannot be saved to ${siteName}. Browser-managed media needs a portable URL; your current draft has been preserved.`); return false; }
    setSiteFeedback(null);
    return true;
  };
  const updateActiveField = <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => updateActiveDocument(document => ({ ...document, [field]: value }));
  async function leaveTest(action: () => boolean | void) {
    if (!await flushSitesDisclosureSaves()) return false;
    if (!await prepareNavigationLeave()) return false;
    if (selectedSite) {
      if (switchingSite || !confirmCodeEditorDiscard()) return false;
      setSwitchingSite(true);
      testSite.pauseEditing(true);
      try { await testSite.flush(); } catch { testSite.pauseEditing(false); setSwitchingSite(false); return false; }
      if (testSite.failure) { testSite.pauseEditing(false); setSwitchingSite(false); return false; }
      window.location.assign(studioContextPath(null, libraryKind, templateTarget));
      return true;
    }
    setSiteFeedback(null);
    return action() !== false;
  }
  async function selectSite(siteId: LocalFixtureSiteId) {
    if (!await flushSitesDisclosureSaves()) return;
    if (!await prepareNavigationLeave()) return;
    if (switchingSite || !confirmCodeEditorDiscard()) return;
    if (selectedSite && selectedSite !== siteId) {
      setSwitchingSite(true); testSite.pauseEditing(true);
      try { await testSite.flush(); } catch { testSite.pauseEditing(false); setSwitchingSite(false); return; }
      if (testSite.failure) { testSite.pauseEditing(false); setSwitchingSite(false); return; }
    }
    if (selectedSite !== siteId) { window.location.assign(studioContextPath(siteId, libraryKind, templateTarget)); return; }
    setStudioSection(libraryKind === "templates" ? "templates" : "content"); setPreviewing(false); setSelectedBlockId(null); setInspectorTab("block"); setShowInserter(false);
    window.history.replaceState(window.history.state, "", studioContextPath(siteId, libraryKind, templateTarget));
    window.dispatchEvent(new Event("studio-navigation"));
  }
  const categories = useStudioCategories({ workspace, activeDocument: workspaceDocument, commit });
  const { tagSuggestions } = categories;
  const selectedDocumentField = documentFieldSelection?.documentId === activeDocument.id ? documentFieldSelection.field : null;
  const hasContentDocuments = workspace.documents.length > 0;
  const selectedBlock = activeDocument && selectedBlockId ? findBlockById(activeDocument.blocks, selectedBlockId) : null;
  const showCoverImage = activeDocument ? (activeDocument.coverImage === undefined ? activeDocument.kind === "post" : activeDocument.coverImage !== null) : false;
  const blockCommands = useStudioBlockCommands({ activeDocument, updateActiveDocument });
  const media = useStudioMedia({
    writable: editorWritable,
    prepareFeaturedImage: selectedSite ? portableFeaturedImage : undefined,
    saveFeaturedImage: selectedSite ? testSite.flush : undefined,
    sourceUrls: selectedSite ? siteImagePreviewUrls(workspace, selectedSite) : undefined,
    documents: workspace.documents,
    activeDocument,
    updateActiveDocument,
    updateBlock: blockCommands.updateBlock,
    onSelectBlock: setSelectedBlockId,
    onFeedback: message => publishing.setPublishFeedback(message),
    onReturnToDocument: (target) => {
      setInspectorTab(target);
      setStudioSection("content");
    },
  });
  const publishing = useStudioPublishing({
    activeDocument: workspaceDocument,
    resolvedDocument,
    workspace,
    updateActiveDocument: updateWorkspaceDocument,
    setSaveLabel,
    publishingWritable: exclusiveWritable && !selectedSite,
  });
  const documentCommands = useStudioDocumentCommands({ workspace, activeDocument: workspaceDocument, commit, setActiveDocument, writable, exclusiveWritable, templates: templateSession, feedback: publishing.setPublishFeedback,
    ...(selectedSite ? { commitWithTemplates: testContext.commitContent, publications: { capture: () => undefined, unpublish: () => {}, restore: () => {} } } : {}) });
  const documentActions = useStudioDocumentActions({ workspace, activeDocument: workspaceDocument, resolvedDocument, templateSnapshot, templateAuthoringSnapshot, templateAuthoringSession: selectedSite ? undefined : globalTemplates.session, templateSession, documentCommands, writable, codeEditorDirty,
    confirmCodeEditorDiscard, feedback: publishing.setPublishFeedback,
    onDocumentCreated: kind => { setCodeEditorDirty(false); setLibraryKind(kind); setDocumentFieldSelection(null); setSelectedBlockId(null); setInspectorTab("document"); setStudioSection("content"); setPreviewing(false); if (!previewWindow) writeStudioNavigation("content", undefined, kind); },
    onDocumentDuplicated: () => setSelectedBlockId(null),
    onDocumentRemoved: documentId => { if (documentId !== activeDocument.id) return; setDocumentFieldSelection(null); setSelectedBlockId(null); setCodeEditorDirty(false); },
  });
  const { addDocument, addDocumentFromTemplate, saveAsTemplate, duplicateDocument, requestRenameDocument, requestDeleteDocument: deleteDocumentAction } = documentActions;
  const requestDeleteDocument = (id = activeDocument.id) => { if (selectedSite && id === testContext.homeDocumentId) { setSiteFeedback(`The home page must remain in ${siteName}. Edit its content instead.`); return; } deleteDocumentAction(id); };
  const canDeleteDocument = (document: StudioDocument | undefined) => (!selectedSite || document?.id !== testContext.homeDocumentId) && documentCommands.canDeleteDocument(document);
  const { wordCount, characterCount } = useStudioDocumentCounts(activeDocument);
  const filteredBlocks = useMemo(() => {
    const query = inserterQuery.trim().toLowerCase();
    if (!query) return blockCatalogue;
    return blockCatalogue.filter((item) => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query));
  }, [inserterQuery]);
  function undoStudio() {
    if (selectedSite) testSite.undo(); else undo();
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
  }
  function redoStudio() {
    if (selectedSite) testSite.redo(); else redo();
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
  }
  const editingTemplates = editingSiteNavigation ? navigationEditing.templates : globalTemplates.session;
  useStudioHistoryShortcuts(studioSection === "templates" ? editingTemplates.undo : undoStudio, studioSection === "templates" ? editingTemplates.redo : redoStudio, (studioSection === "content" || studioSection === "templates") && !previewWindow);

  function switchStudioMode(mode: "content" | "templates" | "bin", contentTabOverride?: "document" | "studio" | "block" | "styles", libraryOverride?: StudioLibraryKind) {
    if (!confirmCodeEditorDiscard()) return false;
    if (mode === "content" && studioSection === "templates") {
      setInspectorTab(contentTabOverride ?? (templateInspectorTab === "styles" ? "styles" : templateInspectorTab === "block" && (selectedBlockId || documentFieldSelection) ? "block" : "document"));
    }
    setEditingSiteNavigation(false);
    setStudioSection(mode); setPreviewing(false); if (mode === "templates") { setShowInserter(false); setTemplateTarget({ setId: null, targetId: null, scope: "global" }); }
    const contentKind = libraryOverride && libraryOverride !== "templates" ? libraryOverride : libraryKind === "templates" ? activeDocument.kind : libraryKind;
    if (mode === "content") setLibraryKind(contentKind);
    if (!previewWindow) {
      if (selectedSiteRef.current && mode === "content") { window.history.replaceState(window.history.state, "", studioContextPath(selectedSiteRef.current, contentKind)); window.dispatchEvent(new Event("studio-navigation")); }
      else writeStudioNavigation(mode, mode === "templates" ? { setId: null, targetId: null, scope: "global" } : undefined, mode === "content" ? contentKind : undefined);
    }
    return true;
  }
  function selectLibraryKind(kind: StudioDocumentKind | "templates") {
    if (switchStudioMode(kind === "templates" ? "templates" : "content", undefined, kind)) setLibraryKind(kind);
  }
  async function navigateBreadcrumb(target: StudioBreadcrumbTarget) {
    if (!await prepareNavigationLeave()) return;
    if (target === "sites") {
      if (switchingSite || !confirmCodeEditorDiscard()) return;
      setSwitchingSite(true);
      if (selectedSite) testSite.pauseEditing(true);
      try {
        if (selectedSite || currentWorkspaceSession.writable) await currentWorkspaceSession.flush();
        if (selectedSite && testSite.failure) throw new Error(testSite.failure);
        window.location.assign("/");
      } catch {
        if (selectedSite) testSite.pauseEditing(false);
        setSwitchingSite(false);
      }
      return;
    }
    const kind = target === "site" || target === "content" ? libraryKind === "templates" ? activeDocument.kind : libraryKind : target;
    if (!switchStudioMode(kind === "templates" ? "templates" : "content", undefined, kind)) return;
    setLibraryKind(kind);
    setLibraryPaneCollapsed(false);
    setViewMode("editing");
  }
  function selectDocument(document: StudioDocument) {
    if (!switchStudioMode("content", inspectorTab === "block" ? "document" : undefined, document.kind)) return false;
    documentCommands.selectDocument(document);
    setCodeEditorDirty(false);
    setLibraryKind(document.kind);
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
    if (inspectorTab === "block") setInspectorTab("document");
    return true;
  }

  const [publishingLocalSite, setPublishingLocalSite] = useState(false);
  async function publishLocalDocument() {
    if (!selectedSite || publishingLocalSite || previewWindow || !testSite.writable) return;
    if (codeEditorDirtyRef.current) { setSiteFeedback("Apply or discard code edits before publishing."); return; }
    setPublishingLocalSite(true);
    try {
      await testContext.publishDocument(activeDocument.id);
      setSiteFeedback(null);
    } catch (error) { setSiteFeedback(error instanceof Error ? error.message : "Local publishing failed. Your draft was kept."); }
    finally { setPublishingLocalSite(false); }
  }
  async function changeSitePublicationStatus(status: string) {
    if (!selectedSite || publishingLocalSite || !testSite.writable || previewWindow) return;
    if (status !== "draft" && status !== "pending" && status !== "private" && status !== "scheduled" && status !== "published") return;
    if (codeEditorDirtyRef.current) { setSiteFeedback("Apply or discard code edits before changing publication status."); return; }
    setPublishingLocalSite(true);
    try {
      await testContext.changePublicationStatus(activeDocument.id, status, status !== "scheduled");
      setSiteFeedback(null);
    } catch (error) { setSiteFeedback(error instanceof Error ? error.message : "The status could not be saved. Your draft was kept."); }
    finally { setPublishingLocalSite(false); }
  }
  function publishCurrentDocument() {
    if (codeEditorDirtyRef.current) {
      const message = "Apply or discard code edits before publishing.";
      if (selectedSite) setSiteFeedback(message); else publishing.setPublishFeedback(message);
      return;
    }
    if (selectedSite) void publishLocalDocument();
    else publishing.publish();
  }
  function saveCurrentDocument() {
    if (activeDocument.status === "published") {
      if (codeEditorDirtyRef.current) {
        const message = "Apply or discard code edits before saving the publication.";
        if (selectedSite) setSiteFeedback(message); else publishing.setPublishFeedback(message);
        return;
      }
      if (selectedSite) void publishLocalDocument();
      else if (writable) publishing.publish();
      return;
    }
    if (selectedSite) {
      if (testSite.writable && !switchingSite) void testSite.flush().catch(() => {});
      return;
    }
    if (writable) studioSession.requestSave();
  }

  const testPresentation = existingSitePresentation(displayedDocument, media.blockUrls, editorWritable, openCoverMediaLibrary, media.removeCoverImage);

  const { insertBlock: insertCanvasBlock, duplicateBlock, removeBlock, openInserter } = useStudioCanvasActions({ blockCommands, writable: editorWritable, insertAfterIndex,
    setPendingColumnsLayoutBlockId, setDocumentFieldSelection, setSelectedBlockId, setInspectorTab,
    setInsertAfterIndex, setShowInserter, setInserterQuery });

  const insertBlock: typeof insertCanvasBlock = (type, parentId, afterIndex, keepOpen, parentIndex) => {
    const main = selectedSite ? activeDocument.blocks.find(block => block.type === "group" && block.tagName === "main") : null;
    return insertCanvasBlock(type, parentId ?? main?.id, afterIndex, keepOpen, parentIndex);
  };
  function openTool(section: "backup" | "bin") {
    if (!confirmCodeEditorDiscard()) return;
    setStudioSection(section); setPreviewing(false);
    if (!previewWindow) writeStudioNavigation(section === "bin" ? "bin" : "content");
  }

  function openMediaLibrary(targetBlockId: string | null = null) {
    if (!confirmCodeEditorDiscard()) return;
    media.targetBlock(targetBlockId);
    setStudioSection("files");
    setPreviewing(false);
  }

  function openBackgroundMediaLibrary(targetBlockId: string, item?: import("./list-item-background").ListItemBackgroundTarget) {
    if (!confirmCodeEditorDiscard()) return;
    media.targetBlockBackground(targetBlockId, item);
    setStudioSection("files");
    setPreviewing(false);
  }

  function openCoverMediaLibrary() {
    if (!confirmCodeEditorDiscard()) return;
    media.targetCoverImage();
    setStudioSection("files");
    setPreviewing(false);
  }

  useStudioScreenNavigation({ setStudioSection, setLibraryKind, setPreviewing, setTemplateTarget, setShowInserter,
    setDocumentFieldSelection, setSelectedBlockId, previewWindow, workspaceReady: currentWorkspaceSession.ready, studioSection, activeDocument: workspaceDocument,
    saveDocument: saveCurrentDocument,
    confirmCodeEditorDiscard: () => navigationEditing.canLeaveViaHistory() && confirmCodeEditorDiscard() });

  if (previewWindow && selectedSite && testSite.draft && (!previewDocumentId || !workspace.documents.some(document => document.id === previewDocumentId))) {
    return <main className="studio-preview-unavailable" role="alert"><h1>Document unavailable</h1><p>This document could not be found in {siteName}. Return to {siteName} and open its preview again.</p></main>;
  }
  if (previewWindow && !selectedSite && !studioSession.ready) return <main className="studio-preview-unavailable" role="status">Loading preview…</main>;
  if (previewWindow && !selectedSite && (studioSession.loadError || !previewDocumentId || !workspace.documents.some(document => document.id === previewDocumentId))) {
    return <main className="studio-preview-unavailable" role="alert"><h1>Document unavailable</h1><p>This document could not be found in the local Studio workspace. Return to Studio and open its preview again.</p></main>;
  }

  return (
    <SitesDisclosureProvider><ResponsiveStyleProvider viewport={studioSection === "templates" ? templateViewport : viewViewport}><div className={`studio-shell studio-desktop-only${selectedSite ? " studio-test-context" : ""}${previewWindow ? " studio-preview-window" : ""}${websiteView ? ` studio-website-view${viewMode === "full" ? " studio-full-preview" : ""}` : ""}`} onClickCapture={navigationEditing.guardNavigationLink} onBeforeInputCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      {selectedSite ? <style>{testSiteCss}</style> : null}
      <StudioHeader libraryKind={libraryKind} onBreadcrumbNavigate={target => { void navigateBreadcrumb(target); }} templateViewport={templateViewport} onTemplateViewportChange={templateCanvasVisible ? setTemplateViewport : undefined} viewMode={viewMode} onViewModeChange={selectedSite ? changeViewMode : undefined} siteContext={selectedSite ? { siteId: selectedSite, writable: testSite.writable, onSave: saveCurrentDocument, onPublish: () => { void publishLocalDocument(); }, publishing: publishingLocalSite } : undefined} studioSection={studioSection} hasContentDocuments={hasContentDocuments || Boolean(selectedSite)} activeDocument={activeDocument} saveLabel={selectedSite ? testSite.label : saveLabel} templateSession={editingTemplates}
        canRetryEditing={canRetryEditing} retryEditing={retryEditing} previewWindow={previewWindow} viewViewport={viewViewport} setViewViewport={changeViewport}
        showTemplate={showTemplate} hasTemplate={hasTemplate} setShowTemplate={setShowTemplate} switchStudioMode={mode => { void afterNavigation(() => switchStudioMode(mode)); }} publishing={{ publish: publishCurrentDocument }} writable={writable && !selectedSite}
        onSaveDocument={saveCurrentDocument} onExportDocument={() => selectedSite ? testSite.exportDraft() : exportJson(activeDocument, `${activeDocument.slug}.json`)} />
      {selectedSite && (testSite.failure || siteFeedback || testSite.syncStatus === "disconnected" || testSite.syncConflict || testSite.syncResolutionError) ? <div className="studio-test-notices">
      {selectedSite && (testSite.failure || siteFeedback || testSite.syncStatus === "disconnected") ? <div className="design-notice" role="alert">{testSite.failure || siteFeedback || `${siteName} sync is paused while its saving tab is unavailable. Your draft remains in this tab.`} <button type="button" onClick={testSite.exportDraft}>Export Draft</button><button type="button" onClick={() => void testSite.reconnect()}>Reconnect</button></div> : null}
      {selectedSite && testSite.syncConflict ? <div className="design-notice" role="alert"><span>Two tabs changed the same content in {siteName}. Choose which change to keep. Your changes remain in this tab.</span> <button type="button" onClick={() => void testSite.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void testSite.resolveSyncConflict("mine")}>Use My Change</button><button type="button" onClick={() => void testSite.exportDraft()}>Export Draft</button>{testSite.syncResolutionError ? <span>{testSite.syncResolutionError}</span> : null}</div> : null}
      {testSite.syncResolutionError && !testSite.syncConflict ? <div className="design-notice" role="alert">{testSite.syncResolutionError}</div> : null}
      </div> : null}
      {syncConflict ? <div className="design-notice" role="alert"><span>{syncConflict.conflicts.length || 1} overlapping change{(syncConflict.conflicts.length || 1) === 1 ? " needs" : "s need"} review. {studioConflictDetails(syncConflict)} Your changes remain in this tab. Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</span> <button type="button" onClick={() => void resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void resolveSyncConflict("mine")}>Use My Change</button>{syncResolutionError ? <span> {syncResolutionError}</span> : null}</div> : null}
      {dependencies.dialog}{dependencies.feedback ? <div className="design-notice" role="status">{dependencies.feedback}</div> : null}{navigationEditing.feedback ? <div className="design-notice" role="alert">{navigationEditing.feedback}</div> : null}
      <div className="studio-notice" role="note">{selectedSite ? <><strong>Local {siteName} website.</strong> Saved changes are stored on this workstation and update its local preview.{selectedSite === "test" ? " The live website is unchanged." : ""}</> : <><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</>}</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection === "files" || studioSection === "backup" || studioSection === "bin" ? " is-tool" : ""}${studioSection === "templates" ? " template-workspace" : ""}`} style={{ "--studio-library-width": `${libraryPaneCollapsed ? 0 : libraryPaneWidth}px`, "--studio-inspector-width": `${inspectorPaneCollapsed ? 0 : inspectorPaneWidth}px` } as CSSProperties}>
      {studioSection === "templates" ? <TemplateWorkspacePanel dependencyActions={dependencies} viewControls={{ viewport: templateViewport, onViewportChange: setTemplateViewport }} onCanvasVisibilityChange={setTemplateCanvasVisible} navigationControls={navigationEditing.controls} siteNavigationEditor={navigationEditing.editor} siteNavigation={selectedSite ? testContext.siteNavigation : undefined} onSelectSite={siteId => void selectSite(siteId)} siteId={selectedSite ?? undefined} editingScope="global" previewSite={templatePreviewSite} onPreviewSiteChange={setTemplatePreviewSite} previewSources={{ test: { document: firstSite.draft, error: firstSite.failure }, test2: { document: secondSite.draft, error: secondSite.failure } }} globalLibrary={globalTemplates.library} workspace={currentWorkspaceSession} templates={globalTemplates.session} selection={templateTarget} onSelectionChange={next => afterNavigation(() => setTemplateTarget({ ...next, scope: "global" }))} libraryKind={libraryKind} onSelectLibraryKind={kind => afterNavigation(() => selectLibraryKind(kind))} onReorderDocuments={(kind, move) => writable && !codeEditorDirty && commit(current => reorderLibraryDocuments(current, kind, move))} onSelectDocument={(documentId) => { const document = workspace.documents.find(item => item.id === documentId); if (document) afterNavigation(() => { selectDocument(document); }); }} inspectorTab={templateInspectorTab} onInspectorTabChange={tab => { setInspectorTab(tab === "template" ? "document" : tab); }} libraryPaneWidth={libraryPaneWidth} onLibraryPaneWidthChange={setLibraryPaneWidth} libraryPaneCollapsed={libraryPaneCollapsed} onLibraryPaneCollapsedChange={setLibraryPaneCollapsed} inspectorPaneWidth={inspectorPaneWidth} onInspectorPaneWidthChange={setInspectorPaneWidth} inspectorPaneCollapsed={inspectorPaneCollapsed} onInspectorPaneCollapsedChange={setInspectorPaneCollapsed} manageHistoryShortcuts={false} contentWritable={writable} contentTemplateWritable={templateSession.writable} onNewDocument={kind => afterNavigation(() => addDocument(kind))} onNewFromTemplate={() => afterNavigation(addDocumentFromTemplate)} onOpenBin={() => afterNavigation(() => openTool("bin"))} onSelectWorkspace={() => void leaveTest(() => { setStudioSection(libraryKind === "templates" ? "templates" : "content"); })} onBackToContent={() => afterNavigation(() => switchStudioMode("content"))} onOpenFiles={() => afterNavigation(() => openMediaLibrary())} onOpenBackup={() => afterNavigation(() => openTool("backup"))} onExportContent={() => selectedSite ? testSite.exportDraft() : exportJson(withSavedDocumentRevisions(workspace), "acm-studio-content.json")} /> : <>
        <StudioNavigationPane selectedSite={selectedSite} onSelectWorkspace={() => void leaveTest(() => { setStudioSection(libraryKind === "templates" ? "templates" : "content"); })} onSelectSite={siteId => void selectSite(siteId)} workspace={workspace} activeDocument={workspaceDocument} templateSession={templateSession} templateLibrarySession={globalTemplates.session} onReorderDocuments={(kind, move) => writable && !codeEditorDirty && commit(current => reorderLibraryDocuments(current, kind, move))} onReorderTemplates={move => globalTemplates.session.writable && globalTemplates.session.commit(store => reorderLibraryTemplates(store, move))} templateCount={globalTemplates.session.ready ? globalTemplates.session.store.sets.reduce((count, set) => count + set.templates.length + set.parts.length, 0) : null} templateTarget={templateTarget}
          libraryKind={libraryKind} libraryPaneWidth={libraryPaneWidth} libraryPaneCollapsed={libraryPaneCollapsed} setLibraryPaneWidth={setLibraryPaneWidth} setLibraryPaneCollapsed={setLibraryPaneCollapsed}
          studioSection={studioSection} writable={writable} exclusiveWritable={exclusiveWritable} codeEditorDirty={codeEditorDirty}
          addDocument={addDocument} addDocumentFromTemplate={addDocumentFromTemplate} openMediaLibrary={openMediaLibrary} selectDocument={selectDocument}
          canDeleteDocument={canDeleteDocument} requestRenameDocument={requestRenameDocument} duplicateDocument={duplicateDocument} requestDeleteDocument={requestDeleteDocument}
          onOpenBackup={() => openTool("backup")} onOpenBin={() => openTool("bin")} onOpenTemplates={() => switchStudioMode("templates")}
          onSelectLibraryKind={selectLibraryKind}
          onSelectTemplate={openTemplateTarget}
          onExportContent={() => selectedSite ? testSite.exportDraft() : exportJson(withSavedDocumentRevisions(workspace), "acm-studio-content.json")} />

        {studioSection === "bin" ? <StudioBin globals={globalTemplates.session} templateRecoveryOnly={!selectedSite} commitContent={selectedSite ? testContext.commitContent : undefined} siteId={selectedSite ?? undefined} workspace={currentWorkspaceSession} templates={templateSession} /> : studioSection === "content" && !hasContentDocuments && !selectedSite ? <section className="studio-empty-workspace" aria-labelledby="studio-empty-title">
          <span className="studio-empty-icon" aria-hidden="true"><StudioIcon name="archive" size={24} /></span>
          <h1 id="studio-empty-title">{libraryKind === "templates" ? "No content yet" : `No ${libraryKind === "page" ? "pages" : "posts"} yet`}</h1>
          <p>Create a page or post when you’re ready. Your content stays in this browser.</p>
          <div className="studio-empty-actions">
            <button className="button-primary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "post" : "page")}>Create {libraryKind === "post" ? "post" : "page"}</button>
            <button className="button-secondary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "page" : "post")}>Create {libraryKind === "post" ? "page" : "post"}</button>
          </div>
        </section> : studioSection === "content" && selectedSite && !testSite.draft ? <section className="studio-empty-workspace" role="status">{testSite.failure || `Loading ${siteName}…`}</section> : websiteView && testSite.draft ? <StudioSitePreview globalTemplates={globalTemplates.library} document={testSite.draft} documentId={activeDocument.id} viewport={viewViewport} onViewportChange={changeViewport} mode={viewMode === "full" ? "full" : "website"} onModeChange={changeViewMode} /> : studioSection === "content" ? <StudioEditor writable={editorWritable && !previewWindow} onUndo={undoStudio} onRedo={redoStudio} canUndo={selectedSite ? testSite.canUndo : canUndo} canRedo={selectedSite ? testSite.canRedo : canRedo}
          canvas={{
            activeDocument: displayedDocument,
            className: selectedSite ? "test-site-editor-surface" : hasTemplate && showTemplate ? "template-editing" : undefined,
            presentation: selectedSite && testContext.collection ? withTestSiteNavigation(
              showTemplate && hasTemplate ? templatePresentation(media.blockUrls, openCoverMediaLibrary, media.removeCoverImage) ?? testPresentation : testPresentation,
              testContext.collection, selectDocument, (setId, partId) => { if (openTemplateTarget(setId, partId)) setInspectorTab("block"); }, testContext.headerReference, showTemplate ? undefined : { ...testContext.collection.templates, assignments: [], defaultTemplateIds: {} },
            ) : templatePresentation(media.blockUrls, openCoverMediaLibrary, media.removeCoverImage, showTemplate),
            viewportWidth: viewportWidthFor(viewViewport),
            viewportWidthCanOverflow: true,
            previewing,
            onPreviewChange: setPreviewing,
            wordCount,
            characterCount,
            linkTargets: workspace.documents.map((document) => ({ id: document.id, title: document.title, href: selectedSite ? testDocumentHref(document.id) : localPublicationHref({ ...document, slug: document.publishedSlug ?? document.slug }), kind: document.kind })),
            showCoverImage: selectedSite ? false : showCoverImage,
            coverImageUrl: media.coverImageUrl,
            mediaBlockUrls: media.blockUrls,
            selectedBlockId,
            pendingColumnsLayoutBlockId,
            onColumnsLayoutSelected: () => setPendingColumnsLayoutBlockId(null),
            dragOverIndex,
            showInserter,
            inserterQuery,
            filteredBlocks,
            publishFeedback: publishing.publishFeedback,
            onOpenInserter: openInserter,
            onSetPublishFeedback: publishing.setPublishFeedback,
            onDocumentFieldChange: (field, value) => { updateActiveField(field, value); },
            onApplyDocumentCode: (blocks) => updateActiveDocument((document) => ({ ...document, blocks })),
            onCodeEditorDirtyChange: dirty => { codeEditorDirtyRef.current = dirty; setCodeEditorDirty(dirty); },
            selectedDocumentField,
            onFocusDocumentField: (field) => { setSelectedBlockId(null); setDocumentFieldSelection(field ? { documentId: activeDocument.id, field } : null); setInspectorTab(field ? "block" : "document"); },
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            loadInlineImages: loadStoredInlineImages,
            onRemoveCoverImage: media.removeCoverImage,
            onSelectBlock: (blockId) => { setDocumentFieldSelection(null); setSelectedBlockId(blockId); setInspectorTab("block"); },
            onClearBlockSelection: () => { setDocumentFieldSelection(null); setSelectedBlockId(null); setInspectorTab("document"); },
            onSetDragOverIndex: setDragOverIndex,
            onMoveBlockTo: blockCommands.moveBlockTo,
            onMoveBlock: blockCommands.moveBlock,
            onDuplicateBlock: duplicateBlock,
            onRemoveBlock: removeBlock,
            onRemoveBlocks: blockCommands.removeBlocks,
            onUpdateBlock: (id, update) => { blockCommands.updateBlock(id, update); },
            onSplitParagraph: (id, beforeRuns, afterRuns) => {
              const nextId = blockCommands.splitParagraph(id, beforeRuns, afterRuns);
              if (nextId) { setDocumentFieldSelection(null); setSelectedBlockId(nextId); setInspectorTab("block"); }
              return nextId;
            },
            onMergeParagraphBackward: (id) => {
              const merged = blockCommands.mergeParagraphBackward(id);
              if (merged) { setDocumentFieldSelection(null); setSelectedBlockId(merged.blockId); setInspectorTab("block"); }
              return merged;
            },
            onSplitParagraphs: (id, paragraphs) => blockCommands.splitParagraphs(id, paragraphs),
            onExitList: (id, index, operation, listId) => blockCommands.exitList(id, index, operation, listId),
            onInsertBlock: (type, parentId, options) => insertBlock(type, parentId, insertAfterIndex, options?.keepInserterOpen),
            onInsertBlockAt: (type, insertionIndex, parentId) => insertBlock(type, parentId, insertionIndex - 1, true, parentId ? insertionIndex : undefined),
            onSetShowInserter: setShowInserter,
            onSetInserterQuery: setInserterQuery,
          }}
          inspector={{
            coverImageUrl: media.coverImageUrl,
            paneWidth: inspectorPaneWidth,
            onPaneWidthChange: setInspectorPaneWidth,
            paneCollapsed: inspectorPaneCollapsed,
            onPaneCollapsedChange: setInspectorPaneCollapsed,
            documentControls: templateControls,
            revisionsControl: <DocumentRevisionsControl key={`${selectedSite ?? "browser"}:${activeDocument.id}`} document={activeDocument} writable={editorWritable && !codeEditorDirty && !previewWindow} refreshKey={selectedSite ? testSite.snapshot : workspace} refreshStatus={saveLabel}
              load={async () => {
                if (!selectedSite) return (browserWorkspaceRepository.load()?.documentRevisions ?? []).filter(item => item.document.id === activeDocument.id && item.document.kind === activeDocument.kind);
                const result = await testSite.loadDocumentRevisions(activeDocument.id);
                if (!Array.isArray(result.revisions) || result.revisions.length > 201) throw new Error("The revision history is invalid.");
                return result.revisions.map((item: DocumentRevision) => {
                  if (!item || typeof item.id !== "string" || !/^[a-f0-9]{64}$/.test(item.id) || !Number.isFinite(Date.parse(item.savedAt)) || typeof item.confirmed !== "boolean" || item.document?.id !== activeDocument.id || item.document.kind !== activeDocument.kind) throw new Error("The revision history is invalid.");
                  const document = revisionDocument(item.document);
                  validateStudioWorkspace({ version: 26, documents: [document], activeDocumentId: document.id, categories: [], bin: [] });
                  return { ...item, document };
                });
              }}
              restore={async (revision, expected) => {
                if (!editorWritable || codeEditorDirtyRef.current || previewWindow) throw new Error("Editing is unavailable. Your draft was preserved.");
                await currentWorkspaceSession.flush();
                let changed = false;
                const restored = commit(current => {
                  const document = current.documents.find(item => item.id === expected.id);
                  if (!document || current.activeDocumentId !== expected.id || JSON.stringify({ ...document, updatedAt: expected.updatedAt }) !== JSON.stringify(expected)) throw new Error("The document changed while revisions were open. Close and reopen Revisions; your draft was preserved.");
                  const next = restoreDocumentRevision(document, revision);
                  const workspace = validateStudioWorkspace({ ...current, documents: current.documents.map(item => item.id === document.id ? next : item) });
                  changed = true; return workspace;
                });
                if (!restored || !changed) throw new Error("The revision could not be restored. Your draft was preserved.");
                setSelectedBlockId(null); setDocumentFieldSelection(null);
                await currentWorkspaceSession.flush();
              }} />,
            inspectorTab,
            selectedBlock,
            selectedDocumentField,
            activeDocument,
            categories: workspace.categories,
            tagSuggestions,
            pages: workspace.documents.filter((item) => item.kind === "page"),
            calendarPosts: workspace.documents.filter((item) => item.kind === "post"),
            siteContext: Boolean(selectedSite),
            allowedStatuses: selectedSite ? ["draft", "pending", "private", "scheduled", "published"] : undefined,
            onStatusChange: selectedSite ? status => { void changeSitePublicationStatus(status); } : undefined,
            localPublication: selectedSite ? { ...testContext.publicationFor(activeDocument.id), busy: publishingLocalSite } : undefined,
            writable: selectedSite ? editorWritable : undefined,
            canDelete: canDeleteDocument(activeDocument),
            canDuplicate: writable && !codeEditorDirty,
            onSelectTab: setInspectorTab,
            onDocumentChange: (field, value) => updateActiveDocument(document => ({ ...document, [field]: value, ...(["author", "category", "tags", "parentPageId"].includes(field) ? { templateOverrides: { ...document.templateOverrides, [field]: true } } : {}) })),
            onCategorySelectionChange: categories.selectCategories,
            onAddCategory: categories.addCategory,
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onColumnWidthChange: blockCommands.updateColumnWidth,
            onColumnCountChange: blockCommands.updateColumnCount,
            onOpenFiles: () => openMediaLibrary(selectedBlock?.id ?? null),
            onOpenBackgroundMedia: openBackgroundMediaLibrary,
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            onRemoveCoverImage: media.removeCoverImage,
            onUnpublish: () => { if (selectedSite) void changeSitePublicationStatus("draft"); else return publishing.unpublish(); },
            onDuplicate: duplicateDocument,
            onDelete: () => requestDeleteDocument(),
            resolvedDocument: displayedDocument,
            hasTemplate,
            fieldUsage,
            onFieldOverride: selectedSite ? (field, useTemplate) => { if (useTemplate) setFieldOverride(field, true); } : setFieldOverride,
            onSaveAsTemplate: saveAsTemplate,
          }}
        /> : studioSection === "files" ? <MediaManager
          writable={editorWritable}
          targetOwnerId={`${activeDocument.id}/${media.targetBlockId ?? ""}`}
          targetLabel={media.targetCover ? "Featured image" : media.targetBackground ? "Background image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : media.targetBackground ? "background" : "block"}
          onInsertImage={(asset, _objectUrl, altText, signal) => {
            return media.insertImage(asset, media.targetBackground ? { target: "background" } : undefined, altText, signal);
          }}
        /> : selectedSite ? <TestSiteBackup globalTemplates={globalTemplates.library} site={testSite} /> : <BackupManager workspace={workspace} globalTemplates={globalTemplates.library} />}
        </>}
      </main>
      <StudioDocumentDialogs actions={documentActions} workspace={workspace} templates={templateSession.store} writable={writable} templateWritable={templateSession.writable} />
      {!selectedSite ? <StudioDesignMediaHandoff key={`${activeDocument.id}:${writable}`} documentId={activeDocument.id} writable={writable} media={media}
        onInsert={(documentId, asset, target, alt) => insertDesignMedia({ workspace, writable, commit, onSelectBlock: setSelectedBlockId, onInspectorTab: setInspectorTab, onClearDocumentField: () => setDocumentFieldSelection(null) }, documentId, asset, target, alt)} /> : null}
    </div></ResponsiveStyleProvider></SitesDisclosureProvider>
  );
}
