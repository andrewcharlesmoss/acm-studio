"use client";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BackupManager } from "./backup-manager";
import { MediaManager } from "./media-manager";
import { StudioEditor, useStudioDocumentCounts } from "./studio-editor";
import { useStudioCanvasActions } from "./use-studio-canvas-actions";
import { useStudioCategories } from "./use-studio-categories";
import { useStudioScreenNavigation, writeStudioNavigation, type StudioTemplateTarget } from "./use-studio-screen-navigation";
import { useStudioDocumentActions } from "./use-studio-document-actions";
import { StudioDocumentDialogs } from "./studio-document-dialogs";
import { StudioDesignMediaHandoff } from "./studio-design-media-handoff";
import { StudioHeader } from "./studio-header";
import { StudioNavigationPane } from "./studio-navigation-pane";
import { StudioIcon } from "./studio-icons";
import { viewportWidthFor, type StudioViewport } from "./studio-view-menu";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { findBlockById } from "./studio-command-operations.mjs";
import { useStudioDocumentCommands } from "./use-studio-document-commands";
import { useStudioMedia } from "./use-studio-media";
import { useStudioPublishing } from "./use-studio-publishing";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useDocumentTemplates } from "./use-document-templates";
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
import { testDocumentFromEditor, testDocumentToEditor } from "./test-site/contract";
import { testSiteCss } from "./test-site/style";
import type { StudioPresentation } from "./studio-presentation";
const testPresentation: StudioPresentation = { renderHeader: () => <></>, renderFooter: () => <></>, renderDocument: (context, content) => <div className="test-site-page" data-test-mode={context.mode}>{content}</div>, showPublicationDetails: false, allowCoverImage: false, hideDividers: false };
type StudioInitialView = {
  site?: "test" | null;
  preview: boolean;
  documentId: string | null;
  viewport: StudioViewport;
  showTemplate: boolean;
};

export function StudioPrototype({ initialView }: { initialView: StudioInitialView }) {
  const [previewWindow] = useState(initialView.preview);
  const [previewDocumentId] = useState(initialView.documentId);
  const studioSession = useStudioWorkspace(undefined, undefined, undefined, undefined, undefined, { readOnly: previewWindow, activeDocumentId: previewDocumentId ?? undefined });
  const [selectedSite, setSelectedSite] = useState<"test" | null>(initialView.site ?? null);
  const [switchingSite, setSwitchingSite] = useState(false);
  const selectedSiteRef = useRef(selectedSite);
  const [siteFeedback, setSiteFeedback] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(previewWindow);
  const [viewViewport, setViewViewport] = useState<StudioViewport>(initialView.viewport);
  const [showTemplate, setShowTemplate] = useState(initialView.showTemplate);
  const [studioSection, setStudioSection] = useState<"content" | "templates" | "files" | "backup" | "bin">("content");
  const [templateTarget, setTemplateTarget] = useState<StudioTemplateTarget>({ setId: null, targetId: null });
  const [libraryKind, setLibraryKind] = useState<StudioDocumentKind | "templates">("page");
  const openTemplateTarget = (setId: string, targetId: string) => {
    if (!confirmCodeEditorDiscard()) return;
    setTemplateTarget({ setId, targetId });
    setLibraryKind("templates");
    setStudioSection("templates"); setPreviewing(false);
    if (!previewWindow) writeStudioNavigation("templates", { setId, targetId });
  };
  const { workspace, ownershipGeneration, writable, exclusiveWritable, syncConflict, syncResolutionError, resolveSyncConflict, canRetryEditing, retryEditing, saveLabel, setSaveLabel, commit, undo, redo, canUndo, canRedo, updateActiveDocument: updateWorkspaceDocument, setActiveDocument, templateSession, templateControls, templatePresentation, hasTemplate, resolvedDocument, fieldUsage, setFieldOverride, templateSnapshot } = useDocumentTemplates(studioSession, openTemplateTarget);
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
  const workspaceDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0] ?? resolvedDocument;
  const testSite = useTestSite(selectedSite === "test", studioSession.ready && exclusiveWritable && !previewWindow);
  const activeDocument = selectedSite && testSite.draft ? testDocumentToEditor(testSite.draft) : workspaceDocument;
  const displayedDocument = selectedSite ? activeDocument : resolvedDocument;
  const editorWritable = selectedSite ? testSite.writable && !switchingSite : writable;
  const updateActiveDocument = (update: (document: StudioDocument) => StudioDocument) => {
    if (!selectedSite) { updateWorkspaceDocument(update); return; }
    const next = testDocumentFromEditor(update(activeDocument));
    if (!next || !testSite.installDraft(next)) { setSiteFeedback("This change cannot be saved to Test. Browser-managed media needs a portable URL; your current draft has been preserved."); return; }
    setSiteFeedback(null);
  };
  const updateActiveField = <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => updateActiveDocument(document => ({ ...document, [field]: value }));
  async function leaveTest(action: () => boolean | void) {
    if (selectedSite) {
      if (switchingSite || !confirmCodeEditorDiscard()) return false;
      setSwitchingSite(true);
      try { await testSite.flush(); } catch { setSwitchingSite(false); return false; }
      if (testSite.failure) { setSwitchingSite(false); return false; }
      selectedSiteRef.current = null;
      setSelectedSite(null); setSelectedBlockId(null); setDocumentFieldSelection(null);
      window.history.replaceState(window.history.state, "", "/studio");
      setSwitchingSite(false);
    }
    return action() !== false;
  }
  function selectTest() {
    if (!confirmCodeEditorDiscard()) return;
    selectedSiteRef.current = "test";
    setSelectedSite("test"); setStudioSection("content"); setPreviewing(false); setSelectedBlockId(null); setInspectorTab("block"); setShowInserter(false);
    window.history.replaceState(window.history.state, "", "/studio?site=test");
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
    documents: workspace.documents,
    activeDocument,
    updateActiveDocument,
    updateBlock: blockCommands.updateBlock,
    onSelectBlock: setSelectedBlockId,
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
  const documentCommands = useStudioDocumentCommands({ workspace, activeDocument: workspaceDocument, commit, setActiveDocument, writable, exclusiveWritable, templates: templateSession, feedback: publishing.setPublishFeedback });
  const documentActions = useStudioDocumentActions({ workspace, activeDocument: workspaceDocument, resolvedDocument, templateSnapshot, templateSession, documentCommands, writable, codeEditorDirty,
    confirmCodeEditorDiscard, feedback: publishing.setPublishFeedback,
    onDocumentCreated: kind => { setCodeEditorDirty(false); setLibraryKind(kind); setDocumentFieldSelection(null); setSelectedBlockId(null); setInspectorTab("document"); setStudioSection("content"); setPreviewing(false); if (!previewWindow) writeStudioNavigation("content"); },
    onDocumentDuplicated: () => setSelectedBlockId(null),
    onDocumentRemoved: (documentId, kind) => { if (documentId !== activeDocument.id) return; if (kind) setLibraryKind(kind); setDocumentFieldSelection(null); setSelectedBlockId(null); setCodeEditorDirty(false); },
  });
  const { addDocument, addDocumentFromTemplate, saveAsTemplate, duplicateDocument, requestRenameDocument, requestDeleteDocument } = documentActions;
  const { canDeleteDocument } = documentCommands;
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
  useStudioHistoryShortcuts(studioSection === "templates" ? templateSession.undo : undoStudio, studioSection === "templates" ? templateSession.redo : redoStudio, (studioSection === "content" || studioSection === "templates") && !previewWindow);

  function switchStudioMode(mode: "content" | "templates" | "bin", contentTabOverride?: "document" | "studio" | "block" | "styles") {
    if (!confirmCodeEditorDiscard()) return false;
    if (mode === "content" && studioSection === "templates") {
      setInspectorTab(contentTabOverride ?? (templateInspectorTab === "styles" ? "styles" : templateInspectorTab === "block" && (selectedBlockId || documentFieldSelection) ? "block" : "document"));
    }
    setStudioSection(mode); setPreviewing(false); if (mode === "templates") setShowInserter(false);
    if (mode === "content" && libraryKind === "templates") setLibraryKind(activeDocument.kind);
    if (!previewWindow) {
      if (selectedSiteRef.current && mode === "content") { window.history.replaceState(window.history.state, "", "/studio?site=test"); window.dispatchEvent(new Event("studio-navigation")); }
      else writeStudioNavigation(mode, mode === "templates" ? templateTarget : undefined);
    }
    return true;
  }
  function selectLibraryKind(kind: StudioDocumentKind | "templates") {
    if (switchStudioMode(kind === "templates" ? "templates" : "content")) setLibraryKind(kind);
  }
  function selectDocument(document: StudioDocument) {
    if (!switchStudioMode("content", inspectorTab === "block" ? "document" : undefined)) return false;
    documentCommands.selectDocument(document);
    setCodeEditorDirty(false);
    setLibraryKind(document.kind);
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
    if (inspectorTab === "block") setInspectorTab("document");
    return true;
  }

  function savePageDraft() {
    if (selectedSite || !writable || activeDocument.kind !== "page") return;
    updateActiveField("status", "draft");
    studioSession.requestSave();
  }

  const { insertBlock: insertCanvasBlock, duplicateBlock, removeBlock, openInserter } = useStudioCanvasActions({ blockCommands, writable: editorWritable, insertAfterIndex,
    setPendingColumnsLayoutBlockId, setDocumentFieldSelection, setSelectedBlockId, setInspectorTab,
    setInsertAfterIndex, setShowInserter, setInserterQuery });

  const insertBlock: typeof insertCanvasBlock = (type, parentId, afterIndex, keepOpen, parentIndex) => {
    const main = selectedSite ? activeDocument.blocks.find(block => block.type === "group" && block.tagName === "main") : null;
    return insertCanvasBlock(type, parentId ?? main?.id, afterIndex, keepOpen, parentIndex);
  };
  function openTool(section: "backup" | "bin") {
    if (!confirmCodeEditorDiscard()) return;
    if (selectedSite && section === "bin") { void leaveTest(() => { setStudioSection(section); setPreviewing(false); writeStudioNavigation("bin"); }); return; }
    setStudioSection(section); setPreviewing(false);
    if (!previewWindow) writeStudioNavigation(section === "bin" ? "bin" : "content");
  }

  function openMediaLibrary(targetBlockId: string | null = null) {
    if (!confirmCodeEditorDiscard()) return;
    media.targetBlock(targetBlockId);
    setStudioSection("files");
    setPreviewing(false);
  }

  function openBackgroundMediaLibrary(targetBlockId: string) {
    if (!confirmCodeEditorDiscard()) return;
    media.targetBlockBackground(targetBlockId);
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
    setDocumentFieldSelection, setSelectedBlockId, previewWindow, studioSection, activeDocument: workspaceDocument, publishing: selectedSite ? { publish: () => {} } : publishing, confirmCodeEditorDiscard: () => { if (selectedSite) { void leaveTest(() => {}); return false; } return confirmCodeEditorDiscard(); } });

  if (previewWindow && !selectedSite && !studioSession.ready) return <main className="studio-preview-unavailable" role="status">Loading preview…</main>;
  if (previewWindow && !selectedSite && (studioSession.loadError || !previewDocumentId || !workspace.documents.some(document => document.id === previewDocumentId))) {
    return <main className="studio-preview-unavailable" role="alert"><h1>Document unavailable</h1><p>This document could not be found in the local Studio workspace. Return to Studio and open its preview again.</p></main>;
  }

  return (
    <div className={`studio-shell studio-desktop-only${selectedSite ? " studio-test-context" : ""}${previewWindow ? " studio-preview-window" : ""}`} onBeforeInputCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if ((!editorWritable || previewWindow) && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      {selectedSite ? <style>{testSiteCss}</style> : null}
      <StudioHeader siteContext={selectedSite ? { writable: testSite.writable, onSave: () => void testSite.flush().catch(() => {}) } : undefined} studioSection={studioSection} hasContentDocuments={hasContentDocuments || Boolean(selectedSite)} activeDocument={activeDocument} saveLabel={selectedSite ? testSite.label : saveLabel} templateSession={templateSession}
        canRetryEditing={canRetryEditing} retryEditing={retryEditing} previewWindow={previewWindow} viewViewport={viewViewport} setViewViewport={setViewViewport}
        showTemplate={showTemplate} hasTemplate={!selectedSite && hasTemplate} setShowTemplate={setShowTemplate} switchStudioMode={mode => { if (mode === "content") switchStudioMode(mode); else void leaveTest(() => switchStudioMode(mode)); }} publishing={publishing} writable={writable && !selectedSite}
        savePageDraft={savePageDraft} onExportDocument={() => selectedSite ? testSite.exportDraft() : exportJson(activeDocument, `${activeDocument.slug}.json`)} />
      {selectedSite && (testSite.failure || siteFeedback || testSite.syncStatus === "disconnected" || testSite.syncConflict) ? <div className="studio-test-notices">
      {selectedSite && (testSite.failure || siteFeedback || testSite.syncStatus === "disconnected") ? <div className="design-notice" role="alert">{testSite.failure || siteFeedback || "Test sync is paused while its saving tab is unavailable. Your draft remains in this tab."} <button type="button" onClick={testSite.exportDraft}>Export Draft</button><button type="button" onClick={() => void testSite.reconnect()}>Reconnect</button></div> : null}
      {selectedSite && testSite.syncConflict ? <div className="design-notice" role="alert"><span>Two tabs changed the same content in Test. Choose which change to keep. Your changes remain in this tab.</span> <button type="button" onClick={() => void testSite.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void testSite.resolveSyncConflict("mine")}>Use My Change</button><button type="button" onClick={() => void testSite.exportDraft()}>Export Draft</button>{testSite.syncResolutionError ? <span>{testSite.syncResolutionError}</span> : null}</div> : null}
      </div> : null}
      {syncConflict ? <div className="design-notice" role="alert"><span>{syncConflict.conflicts.length || 1} overlapping change{(syncConflict.conflicts.length || 1) === 1 ? " needs" : "s need"} review. {studioConflictDetails(syncConflict)} Your changes remain in this tab. Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</span> <button type="button" onClick={() => void resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void resolveSyncConflict("mine")}>Use My Change</button>{syncResolutionError ? <span> {syncResolutionError}</span> : null}</div> : null}
      <div className="studio-notice" role="note">{selectedSite ? <><strong>Local Test website.</strong> Saved changes are stored on this workstation and update its local preview. The live website is unchanged.</> : <><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</>}</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection === "files" || studioSection === "backup" || studioSection === "bin" ? " is-tool" : ""}${studioSection === "templates" ? " template-workspace" : ""}`} style={{ "--studio-library-width": `${libraryPaneCollapsed ? 0 : libraryPaneWidth}px`, "--studio-inspector-width": `${inspectorPaneCollapsed ? 0 : inspectorPaneWidth}px` } as CSSProperties}>
      {studioSection === "templates" ? <TemplateWorkspacePanel workspace={studioSession} templates={templateSession} selection={templateTarget} onSelectionChange={setTemplateTarget} libraryKind={libraryKind} onSelectLibraryKind={kind => void leaveTest(() => selectLibraryKind(kind))} onSelectDocument={(documentId) => { const document = workspace.documents.find(item => item.id === documentId); if (document) selectDocument(document); }} inspectorTab={templateInspectorTab} onInspectorTabChange={tab => { setInspectorTab(tab === "template" ? "document" : tab); }} libraryPaneWidth={libraryPaneWidth} onLibraryPaneWidthChange={setLibraryPaneWidth} libraryPaneCollapsed={libraryPaneCollapsed} onLibraryPaneCollapsedChange={setLibraryPaneCollapsed} inspectorPaneWidth={inspectorPaneWidth} onInspectorPaneWidthChange={setInspectorPaneWidth} inspectorPaneCollapsed={inspectorPaneCollapsed} onInspectorPaneCollapsedChange={setInspectorPaneCollapsed} manageHistoryShortcuts={false} onBackToContent={() => switchStudioMode("content")} onOpenFiles={() => openMediaLibrary()} onOpenBackup={() => openTool("backup")} onExportContent={() => exportJson(workspace, "acm-studio-content.json")} /> : <>
        <StudioNavigationPane onSelectTest={selectTest} workspace={workspace} activeDocument={workspaceDocument} templateSession={templateSession} templateTarget={templateTarget}
          libraryKind={libraryKind} libraryPaneWidth={libraryPaneWidth} libraryPaneCollapsed={libraryPaneCollapsed} setLibraryPaneWidth={setLibraryPaneWidth} setLibraryPaneCollapsed={setLibraryPaneCollapsed}
          studioSection={studioSection} writable={writable} exclusiveWritable={exclusiveWritable} codeEditorDirty={codeEditorDirty}
          addDocument={kind => void leaveTest(() => addDocument(kind))} addDocumentFromTemplate={() => void leaveTest(addDocumentFromTemplate)} openMediaLibrary={openMediaLibrary} selectDocument={document => selectedSiteRef.current ? leaveTest(() => selectDocument(document)) : selectDocument(document)}
          canDeleteDocument={canDeleteDocument} requestRenameDocument={requestRenameDocument} duplicateDocument={duplicateDocument} requestDeleteDocument={requestDeleteDocument}
          onOpenBackup={() => openTool("backup")} onOpenBin={() => openTool("bin")} onOpenTemplates={() => void leaveTest(() => switchStudioMode("templates"))}
          onSelectLibraryKind={kind => void leaveTest(() => selectLibraryKind(kind))}
          onSelectTemplate={(setId, targetId) => void leaveTest(() => openTemplateTarget(setId, targetId))}
          onExportContent={() => exportJson(workspace, "acm-studio-content.json")} />

        {studioSection === "bin" ? <StudioBin workspace={studioSession} templates={templateSession} /> : studioSection === "content" && !hasContentDocuments && !selectedSite ? <section className="studio-empty-workspace" aria-labelledby="studio-empty-title">
          <span className="studio-empty-icon" aria-hidden="true"><StudioIcon name="archive" size={24} /></span>
          <h1 id="studio-empty-title">{libraryKind === "templates" ? "No content yet" : `No ${libraryKind === "page" ? "pages" : "posts"} yet`}</h1>
          <p>Create a page or post when you’re ready. Your content stays in this browser.</p>
          <div className="studio-empty-actions">
            <button className="button-primary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "post" : "page")}>Create {libraryKind === "post" ? "post" : "page"}</button>
            <button className="button-secondary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "page" : "post")}>Create {libraryKind === "post" ? "page" : "post"}</button>
          </div>
        </section> : studioSection === "content" && selectedSite && !testSite.draft ? <section className="studio-empty-workspace" role="status">{testSite.failure || "Loading Test…"}</section> : studioSection === "content" ? <StudioEditor writable={editorWritable && !previewWindow} onUndo={undoStudio} onRedo={redoStudio} canUndo={selectedSite ? testSite.canUndo : canUndo} canRedo={selectedSite ? testSite.canRedo : canRedo}
          canvas={{
            activeDocument: displayedDocument,
            className: selectedSite ? "test-site-editor-surface" : hasTemplate && showTemplate ? "template-editing" : undefined,
            presentation: selectedSite ? testPresentation : showTemplate ? templatePresentation(media.blockUrls, openCoverMediaLibrary, media.removeCoverImage) : undefined,
            viewportWidth: viewportWidthFor(viewViewport),
            viewportWidthCanOverflow: true,
            previewing,
            onPreviewChange: setPreviewing,
            wordCount,
            characterCount,
            linkTargets: workspace.documents.map((document) => ({ id: document.id, title: document.title, href: document.kind === "page" ? `/${document.slug}` : `/writing/${document.publishedSlug ?? document.slug}`, kind: document.kind })),
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
            paneWidth: inspectorPaneWidth,
            onPaneWidthChange: setInspectorPaneWidth,
            paneCollapsed: inspectorPaneCollapsed,
            onPaneCollapsedChange: setInspectorPaneCollapsed,
            documentControls: selectedSite ? undefined : templateControls,
            inspectorTab,
            selectedBlock,
            selectedDocumentField,
            activeDocument,
            categories: workspace.categories,
            tagSuggestions,
            pages: selectedSite ? [] : workspace.documents.filter((item) => item.kind === "page"),
            siteContext: Boolean(selectedSite),
            writable: selectedSite ? editorWritable : undefined,
            canDelete: !selectedSite && canDeleteDocument(activeDocument),
            canDuplicate: !selectedSite && writable && !codeEditorDirty,
            onSelectTab: setInspectorTab,
            onDocumentChange: (field, value) => { if (field === "author" || field === "category" || field === "tags" || field === "parentPageId") if (!selectedSite) setFieldOverride(field, false); updateActiveField(field, value); },
            onCategorySelectionChange: selectedSite ? ids => updateActiveField("categoryIds", ids) : categories.selectCategories,
            onAddCategory: selectedSite ? () => setSiteFeedback("Categories belong to the browser workspace; Test category text can be edited in its metadata.") : categories.addCategory,
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onColumnWidthChange: blockCommands.updateColumnWidth,
            onColumnCountChange: blockCommands.updateColumnCount,
            onOpenFiles: () => openMediaLibrary(selectedBlock?.id ?? null),
            onOpenBackgroundMedia: openBackgroundMediaLibrary,
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            onRemoveCoverImage: media.removeCoverImage,
            onPublish: () => { if (!selectedSite) publishing.publish(); },
            onUnpublish: () => { if (!selectedSite) publishing.unpublish(); },
            onDuplicate: duplicateDocument,
            onDelete: () => requestDeleteDocument(),
            resolvedDocument: displayedDocument,
            hasTemplate: !selectedSite && hasTemplate,
            fieldUsage,
            onFieldOverride: selectedSite ? undefined : setFieldOverride,
            onSaveAsTemplate: () => { if (!selectedSite) saveAsTemplate(); },
          }}
        /> : studioSection === "files" ? <MediaManager
          key={ownershipGeneration}
          writable={exclusiveWritable}
          targetLabel={media.targetCover ? "Cover image" : media.targetBackground ? "Background image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : media.targetBackground ? "background" : "block"}
          onInsertImage={(asset, _objectUrl, altText) => {
            media.insertImage(asset, media.targetBackground ? { target: "background" } : undefined, altText);
          }}
        /> : <BackupManager workspace={workspace} />}
        </>}
      </main>
      <StudioDocumentDialogs actions={documentActions} workspace={workspace} templates={templateSession.store} writable={writable} templateWritable={templateSession.writable} />
      {!selectedSite ? <StudioDesignMediaHandoff key={`${activeDocument.id}:${writable}`} documentId={activeDocument.id} writable={writable} media={media}
        onInsert={(documentId, asset, target, alt) => insertDesignMedia({ workspace, writable, commit, onSelectBlock: setSelectedBlockId, onInspectorTab: setInspectorTab, onClearDocumentField: () => setDocumentFieldSelection(null) }, documentId, asset, target, alt)} /> : null}
    </div>
  );
}
