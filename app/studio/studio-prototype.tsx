"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BackupManager } from "./backup-manager";
import { SiteNavigation } from "./site-navigation";
import { MediaManager } from "./media-manager";
import { StudioEditor, useStudioDocumentCounts } from "./studio-editor";
import { StudioIcon } from "./studio-icons";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { AcmIcon } from "@acm/icons/react";
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
import { StudioListContextMenu, type StudioListContextMenuTarget } from "./studio-list-context-menu";
import type { MediaAsset } from "./media-store";
import {
  blockCatalogue,
  createDocumentFromTemplate,
  type InsertableBlockType,
  type StudioDocument,
  type StudioDocumentKind,
  type StudioCategory,
} from "./editor-model";
import { addDocumentToWorkspace } from "./studio-command-operations.mjs";
import { copyTemplateData, createTemplateSet, templateId, type PageTemplate, type TemplateNode, type TemplatePart, type TemplateSet } from "./template-model";
import { getLocallyPublishedArticle, restoreLocallyPublishedArticle, unpublishDocumentLocally } from "../content/local-publishing";
import { StudioBin } from "./studio-bin";
import { plainTextFromRuns, textToRuns, updateTextMark } from "../content/rich-text";
import type { RichTextRun } from "../content/model";
function exportJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
export function StudioPrototype() {
  const studioSession = useStudioWorkspace();
  const [previewing, setPreviewing] = useState(false);
  const [studioSection, setStudioSection] = useState<"content" | "templates" | "files" | "backup" | "bin">("content");
  const [templateTarget, setTemplateTarget] = useState(() => {
    const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    return { setId: query.get("set"), targetId: query.get("target") };
  });
  const openTemplateTarget = (setId: string, targetId: string) => {
    setTemplateTarget({ setId, targetId });
    setLibraryKind("templates");
    setStudioSection("templates"); setPreviewing(false);
    window.history.pushState({}, "", `/studio?mode=templates&set=${encodeURIComponent(setId)}&target=${encodeURIComponent(targetId)}`);
  };
  const { workspace, ownershipGeneration, writable, exclusiveWritable, syncConflict, syncResolutionError, resolveSyncConflict, canRetryEditing, retryEditing, saveLabel, setSaveLabel, commit, undo, redo, canUndo, canRedo, updateActiveDocument, updateActiveField, setActiveDocument, templateSession, templateControls, templatePresentation, hasTemplate, resolvedDocument, fieldUsage, setFieldOverride, templateSnapshot } = useDocumentTemplates(studioSession, openTemplateTarget);
  const [libraryKind, setLibraryKind] = useState<StudioDocumentKind | "templates">(() => {
    const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    return query.get("mode") === "templates" ? "templates" : "page";
  });
  const [libraryPaneCollapsed, setLibraryPaneCollapsed] = useState(false);
  const libraryTabsId = useId();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inlineImageTarget, setInlineImageTarget] = useState<{ blockId: string; selection: { start: number; end: number } } | null>(null);
  const [documentFieldSelection, setDocumentFieldSelection] = useState<{ documentId: string; field: "title" | "subtitle" } | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "studio" | "block" | "styles">("document");
  const [templateInspectorTab, setTemplateInspectorTab] = useState<"template" | "block" | "styles">("template");
  useEffect(() => {
    setTemplateInspectorTab(inspectorTab === "block" || inspectorTab === "styles" ? inspectorTab : "template");
  }, [inspectorTab]);
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [codeEditorDirty, setCodeEditorDirty] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [designMediaPrompt, setDesignMediaPrompt] = useState<{ asset: MediaAsset; target: "block" | "cover" } | null>(null);
  const [designMediaAltText, setDesignMediaAltText] = useState(""); const designMediaDialogRef = useRef<HTMLDialogElement>(null);
  const [saveTemplateDialog, setSaveTemplateDialog] = useState<{ name: string; destination: string; includeAuthor: boolean; includeCategory: boolean; includeTags: boolean; includeParentPage: boolean }>();
  const saveTemplateDialogRef = useRef<HTMLDialogElement>(null);
  const [renameDocumentDialog, setRenameDocumentDialog] = useState<{ documentId: string; name: string } | null>(null);
  const renameDocumentId = renameDocumentDialog?.documentId;
  const renameDocumentDialogRef = useRef<HTMLDialogElement>(null);
  const renameDocumentOpenerRef = useRef<HTMLElement | null>(null);
  const [newTemplateChoice, setNewTemplateChoice] = useState<string>();
  const newTemplateDialogRef = useRef<HTMLDialogElement>(null);
  const documentContextMenuTriggerRef = useRef<HTMLElement | null>(null);
  function closeDocumentContextMenu() {
    setDocumentContextMenu(null);
    requestAnimationFrame(() => documentContextMenuTriggerRef.current?.isConnected && documentContextMenuTriggerRef.current.focus());
  }
  const [documentContextMenu, setDocumentContextMenu] = useState<(StudioListContextMenuTarget & { id: string }) | null>(null);
  function confirmCodeEditorDiscard() {
    if (!codeEditorDirty) return true;
    if (!window.confirm("Discard unsaved code changes?")) return false;
    setCodeEditorDirty(false);
    return true;
  }
  const activeDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0] ?? resolvedDocument;
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const post of workspace.documents.filter(item => item.kind === "post")) {
      for (const tag of post.tags) {
        const key = tag.trim().toLocaleLowerCase("en-GB");
        if (!key) continue;
        const previous = counts.get(key);
        counts.set(key, { label: previous?.label ?? tag.trim(), count: (previous?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, "en-GB")).slice(0, 16).map(item => item.label);
  }, [workspace.documents]);
  const selectedDocumentField = documentFieldSelection?.documentId === activeDocument.id ? documentFieldSelection.field : null;
  const hasContentDocuments = workspace.documents.length > 0;
  function canDeleteDocument(targetDocument: StudioDocument | null | undefined) {
    if (!targetDocument || !workspace.documents.some(item => item.id === targetDocument.id) || !writable) return false;
    const requiresExclusiveOwnership = targetDocument.kind === "post" && targetDocument.status === "published";
    const hasTemplateAssignment = templateSession.store.assignments.some((item) => item.documentId === targetDocument.id);
    return (!requiresExclusiveOwnership || exclusiveWritable) && (!hasTemplateAssignment || templateSession.writable);
  }
  const selectedBlock = activeDocument && selectedBlockId ? findBlockById(activeDocument.blocks, selectedBlockId) : null;
  const showCoverImage = activeDocument ? (activeDocument.coverImage === undefined ? activeDocument.kind === "post" : activeDocument.coverImage !== null) : false;
  const blockCommands = useStudioBlockCommands({ activeDocument, updateActiveDocument });
  const documentCommands = useStudioDocumentCommands({ workspace, activeDocument, commit, setActiveDocument });
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
    activeDocument,
    resolvedDocument,
    workspace,
    updateActiveDocument,
    setSaveLabel,
    publishingWritable: exclusiveWritable,
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaId = params.get("designMedia");
    const target = params.get("designTarget");
    if (!mediaId || !activeDocument) return;
    let cancelled = false;
    void media.loadAssetById(mediaId).then((asset) => {
      if (cancelled || !asset || !asset.type.startsWith("image/")) return;
      window.history.replaceState({}, "", window.location.pathname);
      setDesignMediaAltText(asset.altText || asset.name.replace(/\.[^.]+$/, ""));
      setDesignMediaPrompt({ asset, target: target === "cover" ? "cover" : "block" });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeDocument, activeDocument?.id, media]);
  useEffect(() => {
    const dialog = designMediaDialogRef.current; if (!designMediaPrompt || !dialog) return; if (!dialog.open) dialog.showModal();
    const input = dialog.querySelector<HTMLTextAreaElement>("textarea"); input?.focus(); input?.select();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dialog.close(); setDesignMediaPrompt(null); } };
    dialog.addEventListener("keydown", onKeyDown); return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [designMediaPrompt]);
  useEffect(() => {
    if (!saveTemplateDialog || !saveTemplateDialogRef.current) return;
    if (!saveTemplateDialogRef.current.open) saveTemplateDialogRef.current.showModal();
    saveTemplateDialogRef.current.querySelector<HTMLInputElement>("input")?.focus();
  }, [saveTemplateDialog]);
  useEffect(() => {
    if (!newTemplateChoice || !newTemplateDialogRef.current) return;
    if (!newTemplateDialogRef.current.open) newTemplateDialogRef.current.showModal();
  }, [newTemplateChoice]);
  useEffect(() => {
    if (!renameDocumentId || !renameDocumentDialogRef.current) return;
    if (!renameDocumentDialogRef.current.open) renameDocumentDialogRef.current.showModal();
    const input = renameDocumentDialogRef.current.querySelector<HTMLInputElement>("input");
    input?.focus();
    input?.select();
  }, [renameDocumentId]);
  async function insertDesignMedia() {
    if (!designMediaPrompt) return;
    const inserted = await media.insertImageById(designMediaPrompt.asset.id, { target: designMediaPrompt.target }, designMediaAltText.trim());
    if (inserted) window.history.replaceState({}, "", window.location.pathname);
    designMediaDialogRef.current?.close();
    setDesignMediaPrompt(null);
  }
  const { wordCount, characterCount } = useStudioDocumentCounts(activeDocument);
  const filteredBlocks = useMemo(() => {
    const query = inserterQuery.trim().toLowerCase();
    if (!query) return blockCatalogue;
    return blockCatalogue.filter((item) => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query));
  }, [inserterQuery]);
  function undoStudio() {
    undo();
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
  }
  function redoStudio() {
    redo();
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
  }
  useStudioHistoryShortcuts(studioSection === "templates" ? templateSession.undo : undoStudio, studioSection === "templates" ? templateSession.redo : redoStudio, studioSection === "content" || studioSection === "templates");

  function switchStudioMode(mode: "content" | "templates" | "bin", contentTabOverride?: "document" | "studio" | "block" | "styles") {
    if (!confirmCodeEditorDiscard()) return;
    if (mode === "content" && studioSection === "templates") {
      setInspectorTab(contentTabOverride ?? (templateInspectorTab === "styles" ? "styles" : templateInspectorTab === "block" && (selectedBlockId || documentFieldSelection) ? "block" : "document"));
    }
    setStudioSection(mode); setPreviewing(false); if (mode === "templates") setShowInserter(false);
    if (mode === "bin") {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath !== "/studio?mode=bin") window.history.pushState({}, "", "/studio?mode=bin");
    }
  }
  function selectDocument(document: StudioDocument) {
    if (!confirmCodeEditorDiscard()) return false;
    documentCommands.selectDocument(document);
    setCodeEditorDirty(false);
    setLibraryKind(document.kind);
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
    if (inspectorTab === "block") setInspectorTab("document");
    setPreviewing(false);
    switchStudioMode("content", inspectorTab === "block" ? "document" : undefined);
    return true;
  }

  function savePageDraft() {
    if (!writable || activeDocument.kind !== "page") return;
    updateActiveField("status", "draft");
  }

  function addDocument(kind: StudioDocumentKind) {
    if (!confirmCodeEditorDiscard()) return;
    const defaultChoice = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template }))).find(choice => choice.template.kind === kind && choice.template.isDefault);
    if (defaultChoice) {
      const document = createDocumentFromTemplate(kind);
      const assigned = templateSession.commit(store => ({ ...store, assignments: [...store.assignments, { documentId: document.id, kind, setId: defaultChoice.set.id, templateId: defaultChoice.template.id }] }));
      if (!assigned) return;
      commit(current => addDocumentToWorkspace(current, document));
    } else documentCommands.addDocument(kind);
    setCodeEditorDirty(false);
    setLibraryKind(kind);
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
    setInspectorTab("document");
    switchStudioMode("content");
  }

  function addDocumentFromTemplate() {
    if (!confirmCodeEditorDiscard()) return;
    const choices = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template })));
    if (!choices.length) { addDocument("page"); return; }
    setNewTemplateChoice(`${choices[0].set.id}/${choices[0].template.id}`);
  }

  function commitNewDocumentFromTemplate() {
    if (!newTemplateChoice || !writable) return;
    const [setId, templateId] = newTemplateChoice.split("/");
    const choice = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template }))).find(item => item.set.id === setId && item.template.id === templateId);
    if (!choice) return;
    const document = createDocumentFromTemplate(choice.template.kind);
    const assigned = templateSession.commit(store => ({ ...store, assignments: [...store.assignments.filter(item => item.documentId !== document.id), { documentId: document.id, kind: document.kind, setId: choice.set.id, templateId: choice.template.id }] }));
    if (!assigned || !writable) return;
    commit(current => addDocumentToWorkspace(current, document));
    newTemplateDialogRef.current?.close(); setNewTemplateChoice(undefined); setCodeEditorDirty(false); setLibraryKind(document.kind); setSelectedBlockId(null); setInspectorTab("document"); switchStudioMode("content");
  }

  function saveAsTemplate() {
    if (!activeDocument) return;
    const defaultDestination = templateSnapshot?.set.name ?? templateSession.store.sets[0]?.name ?? "New template set";
    setSaveTemplateDialog({ name: `${activeDocument.kind === "post" ? "Post" : "Page"} template`, destination: defaultDestination, includeAuthor: false, includeCategory: false, includeTags: false, includeParentPage: false });
  }

  function commitSaveAsTemplate({ name, destination: destinationName, includeAuthor, includeCategory, includeTags, includeParentPage }: NonNullable<typeof saveTemplateDialog>) {
    if (!activeDocument || !name.trim() || !destinationName.trim()) return;
    const sourceSet = templateSnapshot?.set;
    const assigned = templateSnapshot?.set.templates.find(template => template.id === templateSnapshot.templateId);
    const createFreshNodeCloner = (partIds: Map<string, string>) => (node: TemplateNode): TemplateNode => {
      const copy = copyTemplateData(node); copy.id = templateId();
      if (copy.type === "group" || copy.type === "section") copy.children = copy.children.map(createFreshNodeCloner(partIds));
      if (copy.type === "part") copy.partId = partIds.get(copy.partId) ?? copy.partId;
      return copy;
    };
    const cloneInto = (source: TemplateSet, sourceTemplate: PageTemplate, destination: TemplateSet, templateName: string): { template: PageTemplate; parts: TemplatePart[] } => {
      const partIds = new Map<string, string>();
      const referenced = new Set<string>();
      const collect = (nodes: TemplateNode[]) => nodes.forEach(node => {
        if (node.type === "part") { referenced.add(node.partId); return; }
        if (node.type === "group" || node.type === "section") collect(node.children);
      });
      collect(sourceTemplate.nodes);
      const parts: TemplatePart[] = [];
      const clonePart = (partId: string) => {
        if (partIds.has(partId)) return;
        const part = source.parts.find(item => item.id === partId);
        if (!part) return;
        partIds.set(part.id, templateId());
        const nested = new Set<string>();
        const collectNested = (nodes: TemplateNode[]) => nodes.forEach(node => {
          if (node.type === "part") nested.add(node.partId);
          else if (node.type === "group" || node.type === "section") collectNested(node.children);
        });
        collectNested(part.nodes);
        nested.forEach(clonePart);
        parts.push({ ...copyTemplateData(part), id: partIds.get(part.id)!, nodes: part.nodes.map(createFreshNodeCloner(partIds)) });
      };
      if (source.id !== destination.id) referenced.forEach(clonePart);
      const cloner = createFreshNodeCloner(partIds);
      return { template: { ...copyTemplateData(sourceTemplate), id: templateId(), name: templateName, nodes: sourceTemplate.nodes.map(cloner) }, parts };
    };
    templateSession.commit(store => {
      const destination = store.sets.find(item => item.name === destinationName.trim()) ?? createTemplateSet(destinationName.trim());
      const source = sourceSet ?? createTemplateSet();
      const sourceTemplate = assigned ?? { ...source.templates.find(item => item.kind === activeDocument.kind)!, nodes: source.templates.find(item => item.kind === activeDocument.kind)!.nodes.filter(node => node.type !== "element" || node.element !== "post-metadata") };
      const { template, parts } = cloneInto(source, sourceTemplate, destination, name.trim());
      const defaults = { ...(includeAuthor ? { author: resolvedDocument?.author } : {}), ...(includeCategory ? { category: resolvedDocument?.category } : {}), ...(includeTags ? { tags: [...(resolvedDocument?.tags ?? [])] } : {}), ...(includeParentPage ? { parentPageId: resolvedDocument?.parentPageId } : {}) };
      const nextSet = { ...destination, templates: [...destination.templates, { ...template, defaults }], parts: [...destination.parts, ...parts] };
      return { ...store, sets: store.sets.some(item => item.id === nextSet.id) ? store.sets.map(item => item.id === nextSet.id ? nextSet : item) : [...store.sets, nextSet] };
    });
    saveTemplateDialogRef.current?.close();
    setSaveTemplateDialog(undefined);
  }

  function duplicateDocument() {
    if (codeEditorDirty) {
      publishing.setPublishFeedback("Apply the code editor changes before duplicating this document.");
      return;
    }
    documentCommands.duplicateDocument();
    setSelectedBlockId(null);
  }

  function closeRenameDocumentDialog() {
    renameDocumentDialogRef.current?.close();
    setRenameDocumentDialog(null);
    requestAnimationFrame(() => renameDocumentOpenerRef.current?.isConnected && renameDocumentOpenerRef.current.focus());
  }

  function requestRenameDocument(documentId: string) {
    const targetDocument = workspace.documents.find(item => item.id === documentId);
    if (!targetDocument || !writable) return;
    renameDocumentOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : documentContextMenuTriggerRef.current;
    setRenameDocumentDialog({ documentId, name: targetDocument.title });
  }

  function confirmRenameDocument() {
    if (!renameDocumentDialog) return;
    const targetDocument = workspace.documents.find(item => item.id === renameDocumentDialog.documentId);
    const title = renameDocumentDialog.name.trim();
    if (!targetDocument || !writable || !title) return;
    if (title === targetDocument.title) {
      closeRenameDocumentDialog();
      return;
    }
    const saved = commit(current => ({
      ...current,
      documents: current.documents.map(document => document.id === renameDocumentDialog.documentId
        ? { ...document, title, updatedAt: new Date().toISOString() }
        : document),
    }));
    if (!saved) return;
    closeRenameDocumentDialog();
  }

  function requestDeleteDocument(documentId = activeDocument.id) {
    const targetDocument = workspace.documents.find((item) => item.id === documentId);
    if (!targetDocument) return;
    if (codeEditorDirty) { publishing.setPublishFeedback("Apply or discard the code editor changes before moving this document to the Bin."); return; }
    if (!canDeleteDocument(targetDocument)) return;
    deleteDocument(documentId);
  }

  function deleteDocument(documentId: string) {
    const targetDocument = workspace.documents.find((item) => item.id === documentId);
    if (!targetDocument || !writable) return;
    const assignment = templateSession.store.assignments.find((item) => item.documentId === documentId);
    const publication = targetDocument.kind === "post" ? getLocallyPublishedArticle(documentId) : undefined;
    const restoreAssignment = () => assignment && templateSession.commit((store) => ({ ...store, assignments: [...store.assignments.filter((item) => item.documentId !== documentId), assignment] }));
    try {
      if (assignment && !templateSession.commit((store) => ({ ...store, assignments: store.assignments.filter((item) => item.documentId !== documentId) }))) {
        publishing.setPublishFeedback("The template assignment could not be removed, so the document was not deleted.");
        return;
      }
      if (publication) {
        try { unpublishDocumentLocally(documentId); }
        catch { restoreAssignment(); publishing.setPublishFeedback("The published copy could not be moved to the Bin."); return; }
      }
      const moved = commit(current => ({
        ...current,
        documents: current.documents.filter(item => item.id !== documentId),
        bin: [...current.bin, { id: templateId(), deletedAt: new Date().toISOString(), document: targetDocument, ...(assignment ? { assignment } : {}), ...(publication ? { publication } : {}) }],
        activeDocumentId: current.activeDocumentId === documentId ? (current.documents.find(item => item.id !== documentId)?.id ?? "") : current.activeDocumentId,
      }));
      if (!moved) {
        if (publication) {
          try { restoreLocallyPublishedArticle(publication); }
          catch { publishing.setPublishFeedback("The post could not be moved to the Bin, and its publication could not be restored. Keep this page open and export a Backup."); }
        }
        restoreAssignment();
        return;
      }
      if (targetDocument.id === activeDocument.id) {
        const remaining = workspace.documents.filter((item) => item.id !== documentId);
        const deletedIndex = workspace.documents.findIndex((item) => item.id === documentId);
        const nextDocument = remaining[Math.min(deletedIndex, remaining.length - 1)];
        if (nextDocument) setLibraryKind(nextDocument.kind);
      }
    } catch {
      restoreAssignment();
      publishing.setPublishFeedback("The published copy could not be removed, so the post was not deleted.");
      return;
    }
    if (targetDocument.id === activeDocument.id) {
      setDocumentFieldSelection(null);
      setSelectedBlockId(null);
      setCodeEditorDirty(false);
    }
  }

  function insertBlock(type: InsertableBlockType) {
    const block = blockCommands.insertBlock(type, insertAfterIndex);
    setDocumentFieldSelection(null);
    setSelectedBlockId(block.id);
    setInspectorTab("block");
    setShowInserter(false);
    setInserterQuery("");
    return block;
  }

  function duplicateBlock(blockIndex: number) {
    const copy = blockCommands.duplicateBlock(blockIndex);
    if (copy) { setDocumentFieldSelection(null); setSelectedBlockId(copy.id); setInspectorTab("block"); }
  }

  function removeBlock(blockId: string) {
    blockCommands.removeBlock(blockId);
    setDocumentFieldSelection(null);
    setSelectedBlockId(null);
    setInspectorTab("document");
  }

  function openInserter(afterIndex: number | null, query = "") {
    setInsertAfterIndex(afterIndex);
    setInserterQuery(query);
    setShowInserter(true);
  }

  function openMediaLibrary(targetBlockId: string | null = null) {
    if (!confirmCodeEditorDiscard()) return;
    media.targetBlock(targetBlockId);
    setStudioSection("files");
    setPreviewing(false);
  }

  function openCoverMediaLibrary() {
    if (!confirmCodeEditorDiscard()) return;
    media.targetCoverImage();
    setStudioSection("files");
    setPreviewing(false);
  }

  useEffect(() => {
    const syncModeFromLocation = () => {
      const mode = new URLSearchParams(window.location.search).get("mode");
      setStudioSection(mode === "templates" ? "templates" : mode === "bin" ? "bin" : "content");
      if (mode === "templates") setLibraryKind("templates");
      setPreviewing(false);
    };
    const mode = new URLSearchParams(window.location.search).get("mode");
    queueMicrotask(() => { if (mode === "templates") { setStudioSection("templates"); setLibraryKind("templates"); } else if (mode === "bin") setStudioSection("bin"); });
    window.addEventListener("popstate", syncModeFromLocation);
    return () => window.removeEventListener("popstate", syncModeFromLocation);
  }, []);
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        if (event.key === "Escape") {
          setShowInserter(false);
          setDocumentFieldSelection(null);
          setSelectedBlockId(null);
        }
        return;
      }
      if (event.key.toLowerCase() === "s" && studioSection === "content" && activeDocument.kind === "post") {
        event.preventDefault();
        publishing.publish();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [activeDocument.kind, publishing, studioSection]);

  return (
    <div className="studio-shell studio-desktop-only" onBeforeInputCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{studioSection === "templates" ? <><span>Templates</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Shared presentation</strong></> : studioSection !== "content" ? <><span>Studio</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{studioSection === "files" ? "Files" : studioSection === "bin" ? "Bin" : "Backup"}</strong></> : hasContentDocuments ? <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{activeDocument.title}</strong></> : <><span>Content</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Empty workspace</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">LOCAL</span><span aria-live="polite">{studioSection === "templates" ? templateSession.saveLabel : saveLabel}</span>{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection === "templates" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Content</button>
          ) : studioSection !== "content" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Back to Content</button>
          ) : hasContentDocuments ? activeDocument.kind === "post" ? (
            <>
              {activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post <StudioIcon name="external" size={16} /></a> : null}
              <button className="button-primary" type="button" onClick={publishing.publish} disabled={!writable}>{activeDocument.status === "published" ? "Update" : "Publish"}</button>
            </>
          ) : (
            <>
              <button className="button-primary" type="button" onClick={savePageDraft} disabled={!writable}>Save draft</button>
              <button className="button-secondary" type="button" onClick={() => exportJson(activeDocument, `${activeDocument.slug}.json`)}>Export</button>
            </>
          ) : null}
        </div>
      </header>
      {syncConflict ? <div className="design-notice" role="alert"><span>{syncConflict.conflicts.length || 1} overlapping change{(syncConflict.conflicts.length || 1) === 1 ? " needs" : "s need"} review. {studioConflictDetails(syncConflict)} Your changes remain in this tab. Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</span> <button type="button" onClick={() => void resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void resolveSyncConflict("mine")}>Use My Change</button>{syncResolutionError ? <span> {syncResolutionError}</span> : null}</div> : null}
      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection === "files" || studioSection === "backup" || studioSection === "bin" ? " is-tool" : ""}${studioSection === "templates" ? " template-workspace" : ""}`}>
      {studioSection === "templates" ? <TemplateWorkspacePanel workspace={studioSession} templates={templateSession} selection={templateTarget} onSelectionChange={setTemplateTarget} libraryKind={libraryKind} onSelectLibraryKind={setLibraryKind} onSelectDocument={(documentId) => { const document = workspace.documents.find(item => item.id === documentId); if (document) selectDocument(document); }} inspectorTab={templateInspectorTab} onInspectorTabChange={tab => { setTemplateInspectorTab(tab); setInspectorTab(tab === "template" ? "document" : tab); }} manageHistoryShortcuts={false} onBackToContent={() => switchStudioMode("content")} onOpenFiles={() => openMediaLibrary()} onOpenBackup={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("backup"); setPreviewing(false); window.history.replaceState({}, "", "/studio"); }} onExportContent={() => exportJson(workspace, "acm-studio-content.json")} /> : <>
        <Pane trackClassName="studio-library-track" className="studio-library" bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={290} collapsed={libraryPaneCollapsed} onCollapsedChange={setLibraryPaneCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
          header={<><div className="library-create">
            <button type="button" onClick={() => addDocument("post")}><StudioIcon name="add" size={16} /> New post</button>
            <button type="button" onClick={() => addDocument("page")}><StudioIcon name="add" size={16} /> New page</button>
            <button type="button" onClick={addDocumentFromTemplate}>New from template</button>
          </div><div className="library-tools">
            <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={() => openMediaLibrary()}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
            <a className="library-tool-button" href="/studio/designs"><span><StudioIcon name="image" /></span><strong>Design canvas</strong><small>Create and annotate images</small></a>
            <a className="library-tool-button" href="/studio/ribbon"><span><AcmIcon name="layout.columns" /></span><strong>Ribbon Library</strong><small>Explore controls and original SVG icons</small></a>
            <a className="library-tool-button" href="/studio/panes"><span><StudioIcon name="archive" /></span><strong>Pane Library</strong><small>Explore pane structures and collapse controls</small></a>
            <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("backup"); setPreviewing(false); }}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
            <button className={`library-tool-button${studioSection === "bin" ? " is-active" : ""}`} type="button" onClick={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("bin"); setPreviewing(false); window.history.replaceState({}, "", "/studio?mode=bin"); }}><span><StudioIcon name="archive" /></span><strong>Bin</strong><small>{workspace.bin.length + templateSession.store.bin.length} deleted items</small></button>
          </div></>}
          tabs={<div className="library-tabs"><PaneTabs id={libraryTabsId} label="Content type" tabs={[
            { id: "page", label: "Pages" }, { id: "post", label: "Posts" }, { id: "templates", label: "Templates" },
          ]} active={libraryKind} onChange={(id) => { setLibraryKind(id as StudioDocumentKind | "templates"); if (studioSection === "bin" || studioSection === "backup" || studioSection === "files") setStudioSection("content"); }} renderLabel={(tab) => <><span className="library-tab-label">{tab.label}</span><span>{tab.id === "templates" ? templateSession.store.sets.reduce((count, item) => count + item.templates.length + item.parts.length, 0) : workspace.documents.filter((item) => item.kind === tab.id).length}</span></>} /></div>}
          footer={<><SiteNavigation /><div className="library-footer"><button type="button" onClick={() => exportJson(workspace, "acm-studio-content.json")}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div></>}>
          {(["page", "post", "templates"] as const).map((kind) => <PaneTabPanel key={kind} id={libraryTabsId} tab={kind} active={libraryKind}>
            <div className="document-list">
              {kind === "templates" ? <>
                {templateSession.store.sets.flatMap(set => [...set.templates, ...set.parts].map(entry => ({ set, entry }))).map(({ set, entry }) => (
                  <button className={`document-item template-target-item${templateTarget.setId === set.id && templateTarget.targetId === entry.id ? " is-active" : ""}`} type="button" key={`${set.id}/${entry.id}`} onClick={() => { if (!confirmCodeEditorDiscard()) return; setTemplateTarget({ setId: set.id, targetId: entry.id }); setStudioSection("templates"); setPreviewing(false); }}>
                    <span className="document-kind-mark">{entry.kind === "post" ? "A" : entry.kind === "page" ? "P" : "H"}</span>
                    <span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span>
                    <i aria-hidden="true" />
                  </button>
                ))}
                <button className="button-secondary" type="button" onClick={() => setStudioSection("templates")}>Open Template Editor</button>
                {!templateSession.store.sets.some(set => set.templates.length || set.parts.length) ? <p className="document-list-empty">No templates yet.</p> : null}
              </> : workspace.documents.filter((document) => document.kind === kind).map((document) => (
                  <button className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} aria-haspopup="menu" aria-expanded={documentContextMenu?.id === document.id} onClick={() => selectDocument(document)} onContextMenu={(event) => { event.preventDefault(); if (!selectDocument(document)) return; documentContextMenuTriggerRef.current = event.currentTarget; setDocumentContextMenu({ id: document.id, label: document.title, x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); if (!selectDocument(document)) return; documentContextMenuTriggerRef.current = event.currentTarget; const rect = event.currentTarget.getBoundingClientRect(); setDocumentContextMenu({ id: document.id, label: document.title, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
                  <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
                  <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                  <i className={`document-status is-${document.status}`} aria-label={document.status} />
                </button>
              ))}
              {kind !== "templates" && !workspace.documents.some((document) => document.kind === kind) ? <p className="document-list-empty">No {kind === "page" ? "pages" : "posts"} yet.</p> : null}
            </div>
          </PaneTabPanel>)}
          {documentContextMenu ? (() => {
            const contextDocument = workspace.documents.find((item) => item.id === documentContextMenu.id);
            const contextAssignment = templateSession.store.assignments.find((item) => item.documentId === documentContextMenu.id);
            const requiresExclusiveOwnership = contextDocument?.kind === "post" && contextDocument.status === "published";
            const canDelete = canDeleteDocument(contextDocument);
            const disabledReason = !writable ? "Editing is unavailable in this tab." : requiresExclusiveOwnership && !exclusiveWritable ? "Published posts require exclusive ownership to remove their local publication." : contextAssignment && !templateSession.writable ? "The template assignment is not writable in this tab." : undefined;
            const actions = contextDocument ? [
              { label: "Rename", icon: "pencil" as const, onClick: () => requestRenameDocument(contextDocument.id), disabled: !writable },
              { label: "Duplicate", icon: "copy" as const, onClick: duplicateDocument, disabled: !writable || codeEditorDirty, disabledReason: !writable ? "Editing is unavailable in this tab." : codeEditorDirty ? "Apply the code editor changes before duplicating this document." : undefined },
            ] : [];
            return <StudioListContextMenu target={documentContextMenu} actions={actions} canDelete={canDelete} disabledReason={disabledReason} returnFocusRef={documentContextMenuTriggerRef} onDelete={() => requestDeleteDocument(documentContextMenu.id)} onClose={closeDocumentContextMenu} />;
          })() : null}
        </Pane>

        {studioSection === "bin" ? <StudioBin workspace={studioSession} templates={templateSession} /> : studioSection === "content" && !hasContentDocuments ? <section className="studio-empty-workspace" aria-labelledby="studio-empty-title">
          <span className="studio-empty-icon" aria-hidden="true"><StudioIcon name="archive" size={24} /></span>
          <h1 id="studio-empty-title">{libraryKind === "templates" ? "No content yet" : `No ${libraryKind === "page" ? "pages" : "posts"} yet`}</h1>
          <p>Create a page or post when you’re ready. Your content stays in this browser.</p>
          <div className="studio-empty-actions">
            <button className="button-primary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "post" : "page")}>Create {libraryKind === "post" ? "post" : "page"}</button>
            <button className="button-secondary" type="button" disabled={!writable} onClick={() => addDocument(libraryKind === "post" ? "page" : "post")}>Create {libraryKind === "post" ? "page" : "post"}</button>
          </div>
        </section> : studioSection === "content" ? <StudioEditor writable={writable} onUndo={undoStudio} onRedo={redoStudio} canUndo={canUndo} canRedo={canRedo}
          canvas={{
            activeDocument: resolvedDocument,
            className: hasTemplate ? "template-editing" : undefined,
            presentation: templatePresentation(media.blockUrls, openCoverMediaLibrary, media.removeCoverImage),
            previewing,
            onPreviewChange: setPreviewing,
            wordCount,
            characterCount,
            linkTargets: workspace.documents.map((document) => ({ id: document.id, title: document.title, href: document.kind === "page" ? `/${document.slug}` : `/writing/${document.publishedSlug ?? document.slug}`, kind: document.kind })),
            showCoverImage,
            coverImageUrl: media.coverImageUrl,
            mediaBlockUrls: media.blockUrls,
            selectedBlockId,
            dragOverIndex,
            showInserter,
            inserterQuery,
            filteredBlocks,
            publishFeedback: publishing.publishFeedback,
            onOpenInserter: openInserter,
            onSetPublishFeedback: publishing.setPublishFeedback,
            onDocumentFieldChange: (field, value) => { updateActiveField(field, value); },
            onApplyDocumentCode: (blocks) => updateActiveDocument((document) => ({ ...document, blocks })),
            onCodeEditorDirtyChange: setCodeEditorDirty,
            selectedDocumentField,
            onFocusDocumentField: (field) => { setSelectedBlockId(null); setDocumentFieldSelection(field ? { documentId: activeDocument.id, field } : null); setInspectorTab(field ? "block" : "document"); },
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            onOpenInlineImage: (blockId, selection) => {
              if (!confirmCodeEditorDiscard()) return;
              setInlineImageTarget({ blockId, selection });
              media.targetBlock(null);
              setStudioSection("files");
              setPreviewing(false);
            },
            onAddFootnote: (blockId, selection, text) => {
              const id = `footnote-${crypto.randomUUID()}`;
              blockCommands.updateBlock(blockId, block => {
                if (block.type !== "paragraph" && block.type !== "heading" && block.type !== "quote") return block;
                const runs: RichTextRun[] = block.runs?.length ? block.runs : textToRuns(block.text);
                const nextRuns = updateTextMark(runs, selection.start, selection.end, { type: "footnote", id }, "set");
                return { ...block, runs: nextRuns, text: plainTextFromRuns(nextRuns) };
              });
              updateActiveDocument(document => {
                const existing = document.blocks.find(block => block.type === "footnotes");
                if (existing?.type === "footnotes") return { ...document, blocks: document.blocks.map(block => block.id === existing.id ? { ...existing, notes: [...existing.notes, { id, text }] } : block) };
                return { ...document, blocks: [...document.blocks, { id: `footnotes-${crypto.randomUUID()}`, type: "footnotes", notes: [{ id, text }] }] };
              });
              setSelectedBlockId(blockId);
            },
            onRemoveCoverImage: media.removeCoverImage,
            onSelectBlock: (blockId) => { setDocumentFieldSelection(null); setSelectedBlockId(blockId); setInspectorTab("block"); },
            onClearBlockSelection: () => { setDocumentFieldSelection(null); setSelectedBlockId(null); setInspectorTab("document"); },
            onSetDragOverIndex: setDragOverIndex,
            onMoveBlockTo: blockCommands.moveBlockTo,
            onMoveBlock: blockCommands.moveBlock,
            onDuplicateBlock: duplicateBlock,
            onRemoveBlock: removeBlock,
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
            onInsertBlock: insertBlock,
            onSetShowInserter: setShowInserter,
            onSetInserterQuery: setInserterQuery,
          }}
          inspector={{
            documentControls: templateControls,
            inspectorTab,
            selectedBlock,
            selectedDocumentField,
            activeDocument,
            categories: workspace.categories,
            tagSuggestions,
            pages: workspace.documents.filter((item) => item.kind === "page"),
            canDelete: canDeleteDocument(activeDocument),
            canDuplicate: writable && !codeEditorDirty,
            onSelectTab: setInspectorTab,
            onDocumentChange: (field, value) => { if (field === "author" || field === "category" || field === "tags" || field === "parentPageId") setFieldOverride(field, false); updateActiveField(field, value); },
            onCategorySelectionChange: (categoryIds) => {
              const primaryCategory = workspace.categories.find(category => category.id === categoryIds[0]);
              commit(current => ({ ...current, documents: current.documents.map(item => item.id === activeDocument.id ? { ...item, categoryIds, category: primaryCategory?.name, templateOverrides: { ...item.templateOverrides, category: true } } : item) }));
            },
            onAddCategory: (name, parentId) => {
              const existing = workspace.categories.find(category => category.name.toLocaleLowerCase("en-GB") === name.toLocaleLowerCase("en-GB") && (category.parentId || "") === (parentId || ""));
              const category: StudioCategory = existing ?? { id: `category-${crypto.randomUUID()}`, name, ...(parentId ? { parentId } : {}) };
              commit(current => ({
                ...current,
                categories: existing ? current.categories : [...current.categories, category],
                documents: current.documents.map(item => {
                  if (item.id !== activeDocument.id) return item;
                  const previousIds = item.categoryIds ?? (item.category ? current.categories.filter(term => term.name.toLocaleLowerCase("en-GB") === item.category?.trim().toLocaleLowerCase("en-GB")).map(term => term.id) : []);
                  const categoryIds = previousIds.includes(category.id) ? previousIds : [...previousIds, category.id];
                  const primaryCategory = current.categories.find(term => term.id === categoryIds[0]) ?? category;
                  return { ...item, categoryIds, category: primaryCategory.name, templateOverrides: { ...item.templateOverrides, category: true } };
                }),
              }));
            },
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onOpenFiles: () => openMediaLibrary(selectedBlock?.id ?? null),
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            onRemoveCoverImage: media.removeCoverImage,
            onPublish: publishing.publish,
            onUnpublish: publishing.unpublish,
            onDuplicate: duplicateDocument,
            onDelete: () => requestDeleteDocument(),
            resolvedDocument,
            hasTemplate,
            fieldUsage,
            onFieldOverride: setFieldOverride,
            onSaveAsTemplate: saveAsTemplate,
          }}
        /> : studioSection === "files" ? <MediaManager
          key={ownershipGeneration}
          writable={exclusiveWritable}
          targetLabel={inlineImageTarget ? "Inline image" : media.targetCover ? "Cover image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : "block"}
          onInsertImage={(asset, _objectUrl, altText) => {
            if (inlineImageTarget) {
              const { blockId, selection } = inlineImageTarget;
              const alt = altText?.trim() || asset.altText || asset.name.replace(/\.[^.]+$/, "");
              blockCommands.updateBlock(blockId, block => {
                if (block.type !== "paragraph" && block.type !== "heading" && block.type !== "quote") return block;
                const runs: RichTextRun[] = block.runs?.length ? block.runs : textToRuns(block.text);
                const nextRuns = updateTextMark(runs, selection.start, selection.end, { type: "inline-image", mediaId: asset.id, alt }, "set");
                return { ...block, runs: nextRuns, text: plainTextFromRuns(nextRuns) };
              });
              setSelectedBlockId(blockId);
              setInspectorTab("block");
              setInlineImageTarget(null);
              setStudioSection("content");
              return;
            }
            media.insertImage(asset, undefined, altText);
          }}
        /> : <BackupManager workspace={workspace} />}
        </>}
      </main>
      {newTemplateChoice ? <dialog ref={newTemplateDialogRef} className="template-dialog" aria-labelledby="new-template-title" onCancel={event => { event.preventDefault(); newTemplateDialogRef.current?.close(); setNewTemplateChoice(undefined); }} onClose={() => setNewTemplateChoice(undefined)}><form onSubmit={event => { event.preventDefault(); commitNewDocumentFromTemplate(); }}><h2 id="new-template-title">New from template</h2><p>Choose a presentation first. The new document starts empty and inherits only the reusable settings supplied by this template.</p><label><span>Template</span><select value={newTemplateChoice} onChange={event => setNewTemplateChoice(event.target.value)}>{templateSession.store.sets.flatMap(set => set.templates.map(template => <option key={`${set.id}/${template.id}`} value={`${set.id}/${template.id}`}>{template.name} ({template.kind === "post" ? "Post" : "Page"})</option>))}</select></label><p className="setting-note">The document remains a {templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template }))).find(item => `${item.set.id}/${item.template.id}` === newTemplateChoice)?.template.kind === "post" ? "post" : "page"} after creation. You can override inherited values in the Document pane.</p><div className="template-dialog-actions"><button type="button" onClick={() => { newTemplateDialogRef.current?.close(); setNewTemplateChoice(undefined); }}>Cancel</button><button className="button-primary" type="submit" disabled={!writable}>Create document</button></div></form></dialog> : null}
      {saveTemplateDialog ? <dialog ref={saveTemplateDialogRef} className="template-dialog" aria-labelledby="save-template-title" onCancel={event => { event.preventDefault(); saveTemplateDialogRef.current?.close(); setSaveTemplateDialog(undefined); }} onClose={() => setSaveTemplateDialog(undefined)}><form onSubmit={event => { event.preventDefault(); void commitSaveAsTemplate(saveTemplateDialog); }}><h2 id="save-template-title">Save as template</h2><p>The document body and personal content stay with this document. Choose reusable defaults below; the template keeps the layout and dynamic field structure.</p><label><span>Template name</span><input required value={saveTemplateDialog.name} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, name: event.target.value })} /></label><label><span>Template set</span><input required value={saveTemplateDialog.destination} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, destination: event.target.value })} /></label><fieldset><legend>Reusable defaults</legend><label className="checkbox-setting"><input type="checkbox" checked={saveTemplateDialog.includeAuthor} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, includeAuthor: event.target.checked })} /><span>Author</span></label><label className="checkbox-setting"><input type="checkbox" checked={saveTemplateDialog.includeCategory} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, includeCategory: event.target.checked })} /><span>Category</span></label><label className="checkbox-setting"><input type="checkbox" checked={saveTemplateDialog.includeTags} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, includeTags: event.target.checked })} /><span>Tags</span></label><label className="checkbox-setting"><input type="checkbox" checked={saveTemplateDialog.includeParentPage} onChange={event => setSaveTemplateDialog({ ...saveTemplateDialog, includeParentPage: event.target.checked })} /><span>Parent page</span></label></fieldset><p className="setting-note">The review is deliberately conservative: dynamic structure and layout are captured, while ordinary document text, media and publication state stay with the source document.</p><div className="template-dialog-actions"><button type="button" onClick={() => { saveTemplateDialogRef.current?.close(); setSaveTemplateDialog(undefined); }}>Cancel</button><button className="button-primary" type="submit" disabled={!writable}>Save template</button></div></form></dialog> : null}
      {renameDocumentDialog ? <dialog ref={renameDocumentDialogRef} className="template-dialog" aria-labelledby="rename-document-title" aria-describedby="rename-document-description" onCancel={event => { event.preventDefault(); closeRenameDocumentDialog(); }} onClose={() => setRenameDocumentDialog(null)}>
        <button className="template-dialog-close" type="button" aria-label="Close rename dialog" onClick={closeRenameDocumentDialog}><StudioIcon name="close" size={20} /></button>
        <form onSubmit={event => { event.preventDefault(); confirmRenameDocument(); }}>
          <h2 id="rename-document-title">Rename {workspace.documents.find(item => item.id === renameDocumentDialog.documentId)?.kind ?? "document"}</h2>
          <p id="rename-document-description">Change the title of this local document.</p>
          <label><span>Name</span><input required maxLength={160} value={renameDocumentDialog.name} onChange={event => setRenameDocumentDialog({ ...renameDocumentDialog, name: event.target.value })} /></label>
          <div className="template-dialog-actions"><button type="button" onClick={closeRenameDocumentDialog}>Cancel</button><button className="button-primary" type="submit" disabled={!writable || !renameDocumentDialog.name.trim()}>Rename</button></div>
        </form>
      </dialog> : null}
      {designMediaPrompt ? <dialog ref={designMediaDialogRef} className="media-alt-dialog" aria-labelledby="studio-design-media-title" onClose={() => setDesignMediaPrompt(null)}><form method="dialog" onSubmit={(event) => { event.preventDefault(); void insertDesignMedia(); }}>
          <h2 id="studio-design-media-title">Describe this image</h2><p>Provide alternative text for people who cannot see the image.</p>
          <label><span>Alternative text</span><textarea rows={4} value={designMediaAltText} onChange={(event) => setDesignMediaAltText(event.target.value)} placeholder="Describe the important content of the image" /></label>
          <div className="media-dialog-actions"><button type="button" onClick={() => designMediaDialogRef.current?.close()}>Cancel</button><button className="button-primary" type="submit">{designMediaPrompt.target === "cover" ? "Use as cover image" : "Insert image"}</button></div>
        </form>
      </dialog> : null}
    </div>
  );
}
