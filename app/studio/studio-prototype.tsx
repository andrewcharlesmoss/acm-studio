"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackupManager } from "./backup-manager";
import { SiteNavigation } from "./site-navigation";
import { MediaManager } from "./media-manager";
import { StudioEditor, useStudioDocumentCounts } from "./studio-editor";
import { StudioIcon } from "./studio-icons";
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
import type { MediaAsset } from "./media-store";
import {
  blockCatalogue,
  createDocumentFromTemplate,
  type InsertableBlockType,
  type StudioDocument,
  type StudioDocumentKind,
} from "./editor-model";
import { addDocumentToWorkspace } from "./studio-command-operations.mjs";
import { copyTemplateData, createTemplateSet, templateId, type PageTemplate, type TemplateNode, type TemplatePart, type TemplateSet } from "./template-model";
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
  const { workspace, ownershipGeneration, writable, exclusiveWritable, syncConflict, syncResolutionError, resolveSyncConflict, canRetryEditing, retryEditing, saveLabel, setSaveLabel, commit, undo, redo, canUndo, canRedo, updateActiveDocument, updateActiveField, setActiveDocument, templateSession, templateControls, templatePresentation, hasTemplate, resolvedDocument, fieldUsage, setFieldOverride, templateSnapshot } = useDocumentTemplates(studioSession);
  const [libraryKind, setLibraryKind] = useState<StudioDocumentKind>("page");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "block" | "styles">("document");
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [codeEditorDirty, setCodeEditorDirty] = useState(false);
  const [studioSection, setStudioSection] = useState<"content" | "templates" | "files" | "backup">("content");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [designMediaPrompt, setDesignMediaPrompt] = useState<{ asset: MediaAsset; target: "block" | "cover" } | null>(null);
  const [designMediaAltText, setDesignMediaAltText] = useState(""); const designMediaDialogRef = useRef<HTMLDialogElement>(null);
  function confirmCodeEditorDiscard() {
    if (!codeEditorDirty) return true;
    if (!window.confirm("Discard unsaved code changes?")) return false;
    setCodeEditorDirty(false);
    return true;
  }
  const activeDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0];
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
    setSelectedBlockId(null);
  }
  function redoStudio() {
    redo();
    setSelectedBlockId(null);
  }
  useStudioHistoryShortcuts(studioSection === "templates" ? templateSession.undo : undoStudio, studioSection === "templates" ? templateSession.redo : redoStudio, studioSection === "content" || studioSection === "templates");

  function switchStudioMode(mode: "content" | "templates") {
    if (!confirmCodeEditorDiscard()) return;
    setStudioSection(mode); setPreviewing(false); if (mode === "templates") setShowInserter(false);
    window.history.replaceState({}, "", mode === "templates" ? "/studio?mode=templates" : "/studio");
  }
  function selectDocument(document: StudioDocument) {
    if (!confirmCodeEditorDiscard()) return;
    documentCommands.selectDocument(document);
    setCodeEditorDirty(false);
    setLibraryKind(document.kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    setPreviewing(false);
    switchStudioMode("content");
  }

  function addDocument(kind: StudioDocumentKind) {
    if (!confirmCodeEditorDiscard()) return;
    documentCommands.addDocument(kind);
    setCodeEditorDirty(false);
    setLibraryKind(kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    switchStudioMode("content");
  }

  function addDocumentFromTemplate() {
    if (!confirmCodeEditorDiscard()) return;
    const choices = templateSession.store.sets.flatMap(set => set.templates.map(template => ({ set, template })));
    if (!choices.length) { addDocument("page"); return; }
    const choicePrompt = choices.length === 1 ? "1" : window.prompt(`Choose a template:\n${choices.map((choice, index) => `${index + 1}. ${choice.set.name} — ${choice.template.name}`).join("\n")}`, "1");
    if (choicePrompt === null) return;
    const requestedChoice = Number(choicePrompt);
    const choiceIndex = Number.isFinite(requestedChoice) ? Math.max(0, Math.min(choices.length - 1, requestedChoice - 1)) : 0;
    const choice = choices[choiceIndex];
    const document = createDocumentFromTemplate(choice.template.kind);
    const assigned = templateSession.commit(store => ({ ...store, assignments: [...store.assignments.filter(item => item.documentId !== document.id), { documentId: document.id, kind: document.kind, setId: choice.set.id, templateId: choice.template.id }] }));
    if (!assigned || !writable) return;
    commit(current => addDocumentToWorkspace(current, document));
    setCodeEditorDirty(false); setLibraryKind(document.kind); setSelectedBlockId(null); setInspectorTab("document"); switchStudioMode("content");
  }

  function saveAsTemplate() {
    if (!activeDocument) return;
    const name = window.prompt("Name this template", `${activeDocument.kind === "post" ? "Post" : "Page"} template`);
    if (!name?.trim()) return;
    const defaultDestination = templateSnapshot?.set.name ?? templateSession.store.sets[0]?.name ?? "New template set";
    const destinationName = window.prompt("Destination template set", defaultDestination);
    if (!destinationName?.trim()) return;
    window.alert("The document body stays with this document. Only its shell, layout and selected defaults are saved.");
    const includeAuthor = Boolean(resolvedDocument?.author?.trim()) && window.confirm("Use this document's author as the new template default?");
    const includeCategory = activeDocument.kind === "post" && Boolean(resolvedDocument?.category) && window.confirm("Use this document's category as the new template default?");
    const includeTags = activeDocument.kind === "post" && Boolean(resolvedDocument?.tags.length) && window.confirm("Use this document's tags as the new template default?");
    const sourceSet = templateSnapshot?.set;
    const assigned = templateSnapshot?.set.templates.find(template => template.id === templateSnapshot.templateId && template.kind === activeDocument.kind);
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
      const defaults = { ...(includeAuthor ? { author: resolvedDocument?.author } : {}), ...(includeCategory ? { category: resolvedDocument?.category } : {}), ...(includeTags ? { tags: [...(resolvedDocument?.tags ?? [])] } : {}) };
      const nextSet = { ...destination, templates: [...destination.templates, { ...template, defaults }], parts: [...destination.parts, ...parts] };
      return { ...store, sets: store.sets.some(item => item.id === nextSet.id) ? store.sets.map(item => item.id === nextSet.id ? nextSet : item) : [...store.sets, nextSet] };
    });
  }

  function duplicateDocument() {
    if (!confirmCodeEditorDiscard()) return;
    documentCommands.duplicateDocument();
    setSelectedBlockId(null);
    setCodeEditorDirty(false);
  }

  function deleteDocument() {
    if (workspace.documents.length === 1) return;
    if (!confirmCodeEditorDiscard()) return;
    if (!window.confirm(`Delete the local ${activeDocument.kind} “${activeDocument.title}”?`)) return;
    if (hasTemplate) {
      publishing.setPublishFeedback("Choose Existing Presentation before deleting a document with a site template.");
      return;
    }
    try {
      documentCommands.deleteDocument();
    } catch {
      publishing.setPublishFeedback("The published copy could not be removed, so the post was not deleted.");
      return;
    }
    setSelectedBlockId(null);
    setCodeEditorDirty(false);
  }

  function insertBlock(type: InsertableBlockType) {
    const block = blockCommands.insertBlock(type, insertAfterIndex);
    setSelectedBlockId(block.id);
    setInspectorTab("block");
    setShowInserter(false);
    setInserterQuery("");
    return block;
  }

  function duplicateBlock(blockIndex: number) {
    const copy = blockCommands.duplicateBlock(blockIndex);
    if (copy) setSelectedBlockId(copy.id);
  }

  function removeBlock(blockId: string) {
    blockCommands.removeBlock(blockId);
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
    const mode = new URLSearchParams(window.location.search).get("mode");
    queueMicrotask(() => { if (mode === "templates") setStudioSection("templates"); });
  }, []);
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        if (event.key === "Escape") {
          setShowInserter(false);
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

  if (!activeDocument) return null;
  return (
    <div className="studio-shell" onBeforeInputCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{studioSection === "templates" ? <><span>Templates</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Shared presentation</strong></> : studioSection !== "content" ? <><span>Studio</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{studioSection === "files" ? "Files" : "Backup"}</strong></> : <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{activeDocument.title}</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">Local prototype</span><span aria-live="polite">{studioSection === "templates" ? templateSession.saveLabel : saveLabel}</span>{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection === "templates" ? <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Content</button> : studioSection !== "content" ? <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Back to {activeDocument.title}</button> : <>{activeDocument.kind === "post" ? <>{activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post <StudioIcon name="external" size={16} /></a> : null}<button className="button-primary" type="button" onClick={publishing.publish} disabled={!writable}>{activeDocument.status === "published" ? "Update" : "Publish"}</button></> : <button className="button-primary" type="button" onClick={() => exportJson(activeDocument, `${activeDocument.slug}.json`)}>Export</button>}</>}
        </div>
      </header>
      {syncConflict ? <div className="design-notice" role="alert">Conflicting changes need review. <button type="button" onClick={() => void resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void resolveSyncConflict("mine")}>Use My Change</button>{syncResolutionError ? <span> {syncResolutionError}</span> : null}</div> : null}
      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection === "files" || studioSection === "backup" ? " is-tool" : ""}${studioSection === "templates" ? " template-workspace" : ""}`}>
        {studioSection === "templates" ? <TemplateWorkspacePanel workspace={studioSession} templates={templateSession} manageHistoryShortcuts={false} onBackToContent={() => switchStudioMode("content")} onSelectContentKind={(kind) => { setLibraryKind(kind); switchStudioMode("content"); }} onOpenFiles={() => openMediaLibrary()} onOpenBackup={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("backup"); setPreviewing(false); window.history.replaceState({}, "", "/studio"); }} onExportContent={() => exportJson(workspace, "acm-studio-content.json")} /> : <>
        <aside className="studio-library">
          <div className="library-create">
            <button type="button" onClick={() => addDocument("post")}><StudioIcon name="add" size={16} /> New post</button>
            <button type="button" onClick={() => addDocument("page")}><StudioIcon name="add" size={16} /> New page</button>
            <button type="button" onClick={addDocumentFromTemplate}>New from template</button>
          </div>
          <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={() => openMediaLibrary()}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
          <a className="library-tool-button" href="/studio/designs"><span><StudioIcon name="image" /></span><strong>Design canvas</strong><small>Create and annotate images</small></a>
          <a className="library-tool-button" href="/studio/ribbon"><span><AcmIcon name="layout.columns" /></span><strong>Ribbon Library</strong><small>Explore controls and original SVG icons</small></a>
          <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("backup"); setPreviewing(false); }}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
          <div className="library-tabs" aria-label="Content type">
            {(["page", "post"] as const).map((kind) => (
              <button className={studioSection === "content" && libraryKind === kind ? "is-active" : ""} type="button" key={kind} onClick={() => { setLibraryKind(kind); setStudioSection("content"); }}>
                {kind === "page" ? "Pages" : "Posts"}<span>{workspace.documents.filter((item) => item.kind === kind).length}</span>
              </button>
            ))}
            <button type="button" onClick={() => switchStudioMode("templates")}>Templates<span>{templateSession.store.sets.length}</span></button>
          </div>
          <div className="document-list">
            {workspace.documents.filter((document) => document.kind === libraryKind).map((document) => (
              <button className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} onClick={() => selectDocument(document)}>
                <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
                <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                <i className={`document-status is-${document.status}`} aria-label={document.status} />
              </button>
            ))}
          </div>
          <SiteNavigation />
          <div className="library-footer"><button type="button" onClick={() => exportJson(workspace, "acm-studio-content.json")}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div>
        </aside>

        {studioSection === "content" ? <StudioEditor writable={writable} onUndo={undoStudio} onRedo={redoStudio} canUndo={canUndo} canRedo={canRedo}
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
            onFocusDocumentField: () => { setSelectedBlockId(null); setInspectorTab("document"); },
            onOpenCoverMediaLibrary: openCoverMediaLibrary,
            onRemoveCoverImage: media.removeCoverImage,
            onSelectBlock: (blockId) => { setSelectedBlockId(blockId); setInspectorTab("block"); },
            onClearBlockSelection: () => { setSelectedBlockId(null); setInspectorTab("document"); },
            onSetDragOverIndex: setDragOverIndex,
            onMoveBlockTo: blockCommands.moveBlockTo,
            onMoveBlock: blockCommands.moveBlock,
            onDuplicateBlock: duplicateBlock,
            onRemoveBlock: removeBlock,
            onUpdateBlock: (id, update) => { blockCommands.updateBlock(id, update); },
            onInsertBlock: insertBlock,
            onSetShowInserter: setShowInserter,
            onSetInserterQuery: setInserterQuery,
          }}
          inspector={{
            documentControls: templateControls,
            inspectorTab,
            selectedBlock,
            activeDocument,
            pages: workspace.documents.filter((item) => item.kind === "page"),
            canDelete: workspace.documents.length > 1,
            onSelectTab: setInspectorTab,
            onDocumentChange: (field, value) => { if (field === "author" || field === "category" || field === "tags") setFieldOverride(field, false); updateActiveField(field, value); },
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onOpenFiles: () => openMediaLibrary(selectedBlock?.id ?? null),
            onPublish: publishing.publish,
            onUnpublish: publishing.unpublish,
            onDuplicate: duplicateDocument,
            onDelete: deleteDocument,
            resolvedDocument,
            fieldUsage,
            onFieldOverride: setFieldOverride,
            onSaveAsTemplate: saveAsTemplate,
          }}
        /> : studioSection === "files" ? <MediaManager
          key={ownershipGeneration}
          writable={exclusiveWritable}
          targetLabel={media.targetCover ? "Cover image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : "block"}
          onInsertImage={media.insertImage}
        /> : <BackupManager workspace={workspace} />}
        </>}
      </main>
      {designMediaPrompt ? <dialog ref={designMediaDialogRef} className="media-alt-dialog" aria-labelledby="studio-design-media-title" onClose={() => setDesignMediaPrompt(null)}><form method="dialog" onSubmit={(event) => { event.preventDefault(); void insertDesignMedia(); }}>
          <h2 id="studio-design-media-title">Describe this image</h2><p>Provide alternative text for people who cannot see the image.</p>
          <label><span>Alternative text</span><textarea rows={4} value={designMediaAltText} onChange={(event) => setDesignMediaAltText(event.target.value)} placeholder="Describe the important content of the image" /></label>
          <div className="media-dialog-actions"><button type="button" onClick={() => designMediaDialogRef.current?.close()}>Cancel</button><button className="button-primary" type="submit">{designMediaPrompt.target === "cover" ? "Use as cover image" : "Insert image"}</button></div>
        </form>
      </dialog> : null}
    </div>
  );
}
