"use client";

import { useEffect, useMemo, useState } from "react";
import { BackupManager } from "./backup-manager";
import { SiteNavigation } from "./site-navigation";
import { MediaManager } from "./media-manager";
import { StudioEditor, documentCharacterCount, documentWordCount } from "./studio-editor";
import { StudioIcon } from "./studio-icons";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { findBlockById } from "./studio-command-operations.mjs";
import { useStudioDocumentCommands } from "./use-studio-document-commands";
import { useStudioMedia } from "./use-studio-media";
import { useStudioPublishing } from "./use-studio-publishing";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { useStudioWorkspace } from "./use-studio-workspace";
import {
  blockCatalogue,
  type InsertableBlockType,
  type StudioDocument,
  type StudioDocumentKind,
} from "./editor-model";

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
  const { workspace, ownershipGeneration, writable, canRetryEditing, retryEditing, saveLabel, setSaveLabel, commit, undo, redo, updateActiveDocument, updateActiveField, setActiveDocument } = useStudioWorkspace();
  const [libraryKind, setLibraryKind] = useState<StudioDocumentKind>("page");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "block">("document");
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [codeEditorDirty, setCodeEditorDirty] = useState(false);
  const [studioSection, setStudioSection] = useState<"content" | "files" | "backup">("content");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    workspace,
    updateActiveDocument,
    setSaveLabel,
  });

  const wordCount = useMemo(() => {
    if (!activeDocument) return 0;
    return documentWordCount(activeDocument);
  }, [activeDocument]);
  const characterCount = useMemo(() => {
    if (!activeDocument) return 0;
    return documentCharacterCount(activeDocument);
  }, [activeDocument]);

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

  useStudioHistoryShortcuts(undoStudio, redoStudio, studioSection === "content");

  function selectDocument(document: StudioDocument) {
    if (!confirmCodeEditorDiscard()) return;
    documentCommands.selectDocument(document);
    setCodeEditorDirty(false);
    setLibraryKind(document.kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    setPreviewing(false);
    setStudioSection("content");
  }

  function addDocument(kind: StudioDocumentKind) {
    if (!confirmCodeEditorDiscard()) return;
    documentCommands.addDocument(kind);
    setCodeEditorDirty(false);
    setLibraryKind(kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    setStudioSection("content");
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
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        if (event.key === "Escape") {
          setShowInserter(false);
          setSelectedBlockId(null);
        }
        return;
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSaveLabel("Saved locally just now");
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  if (!activeDocument) return null;

  return (
    <div className="studio-shell" onBeforeInputCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{studioSection !== "content" ? <><span>Studio</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{studioSection === "files" ? "Files" : "Backup"}</strong></> : <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{activeDocument.title}</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">Local prototype</span><span aria-live="polite">{saveLabel}</span>{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection !== "content" ? <button className="button-secondary" type="button" onClick={() => setStudioSection("content")}>Back to {activeDocument.title}</button> : <><button className="icon-button" type="button" onClick={undoStudio} disabled={!writable} aria-label="Undo"><StudioIcon name="undo" /></button><button className="icon-button" type="button" onClick={redoStudio} disabled={!writable} aria-label="Redo"><StudioIcon name="redo" /></button>{activeDocument.kind === "post" ? <>{activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post <StudioIcon name="external" size={16} /></a> : null}<button className="button-primary" type="button" onClick={publishing.publish} disabled={!writable}>{activeDocument.status === "published" ? "Update" : "Publish"}</button></> : <button className="button-primary" type="button" onClick={() => exportJson(activeDocument, `${activeDocument.slug}.json`)}>Export</button>}</>}
        </div>
      </header>

      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection !== "content" ? " is-tool" : ""}`}>
        <aside className="studio-library">
          <div className="library-create">
            <button type="button" onClick={() => addDocument("post")}><StudioIcon name="add" size={16} /> New post</button>
            <button type="button" onClick={() => addDocument("page")}><StudioIcon name="add" size={16} /> New page</button>
          </div>
          <div className="library-tabs" aria-label="Content type">
            {(["page", "post"] as const).map((kind) => (
              <button className={studioSection === "content" && libraryKind === kind ? "is-active" : ""} type="button" key={kind} onClick={() => { setLibraryKind(kind); setStudioSection("content"); }}>
                {kind === "page" ? "Pages" : "Posts"}<span>{workspace.documents.filter((item) => item.kind === kind).length}</span>
              </button>
            ))}
          </div>
          <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={() => openMediaLibrary()}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
          <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={() => { if (!confirmCodeEditorDiscard()) return; setStudioSection("backup"); setPreviewing(false); }}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
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

        {studioSection === "content" ? <StudioEditor writable={writable}
          canvas={{
            activeDocument,
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
            onDocumentFieldChange: updateActiveField,
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
            onUpdateBlock: blockCommands.updateBlock,
            onInsertBlock: insertBlock,
            onSetShowInserter: setShowInserter,
            onSetInserterQuery: setInserterQuery,
          }}
          inspector={{
            inspectorTab,
            selectedBlock,
            activeDocument,
            pages: workspace.documents.filter((item) => item.kind === "page"),
            canDelete: workspace.documents.length > 1,
            onSelectTab: setInspectorTab,
            onDocumentChange: updateActiveField,
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onOpenFiles: () => openMediaLibrary(selectedBlock?.id ?? null),
            onPublish: publishing.publish,
            onUnpublish: publishing.unpublish,
            onDuplicate: duplicateDocument,
            onDelete: deleteDocument,
          }}
        /> : studioSection === "files" ? <MediaManager
          key={ownershipGeneration}
          writable={writable}
          targetLabel={media.targetCover ? "Cover image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : "block"}
          onInsertImage={media.insertImage}
        /> : <BackupManager workspace={workspace} />}
      </main>
    </div>
  );
}
