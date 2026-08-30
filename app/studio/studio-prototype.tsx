"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentBlock } from "../content/model";
import { BackupManager } from "./backup-manager";
import { MediaManager } from "./media-manager";
import { StudioCanvas } from "./studio-canvas";
import { StudioInspector } from "./studio-inspectors";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { useStudioDocumentCommands } from "./use-studio-document-commands";
import { useStudioMedia } from "./use-studio-media";
import { useStudioPublishing } from "./use-studio-publishing";
import { useStudioWorkspace } from "./use-studio-workspace";
import {
  blockCatalogue,
  type InsertableBlockType,
  type StudioDocument,
  type StudioDocumentKind,
} from "./editor-model";

function blockText(block: ContentBlock) {
  if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return block.text;
  if (block.type === "list") return block.items.join(" ");
  if (block.type === "code") return block.code;
  if (block.type === "button") return block.label;
  if (block.type === "embed") return block.title;
  if (block.type === "image") return block.caption ?? "";
  return "";
}

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
  const { workspace, saveLabel, setSaveLabel, commit, undo, redo, updateActiveDocument, updateActiveField, setActiveDocument } = useStudioWorkspace();
  const [libraryKind, setLibraryKind] = useState<StudioDocumentKind>("page");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "block">("document");
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [studioSection, setStudioSection] = useState<"content" | "files" | "backup">("content");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeDocument = workspace.documents.find((item) => item.id === workspace.activeDocumentId) ?? workspace.documents[0];
  const selectedBlock = activeDocument?.blocks.find((block) => block.id === selectedBlockId) ?? null;
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
    return activeDocument.blocks.flatMap(blockText).join(" ").trim().split(/\s+/).filter(Boolean).length;
  }, [activeDocument]);
  const characterCount = useMemo(() => {
    if (!activeDocument) return 0;
    return activeDocument.blocks.flatMap(blockText).join(" ").length;
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

  function selectDocument(document: StudioDocument) {
    documentCommands.selectDocument(document);
    setLibraryKind(document.kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    setPreviewing(false);
    setStudioSection("content");
  }

  function addDocument(kind: StudioDocumentKind) {
    documentCommands.addDocument(kind);
    setLibraryKind(kind);
    setSelectedBlockId(null);
    setInspectorTab("document");
    setStudioSection("content");
  }

  function duplicateDocument() {
    documentCommands.duplicateDocument();
    setSelectedBlockId(null);
  }

  function deleteDocument() {
    if (workspace.documents.length === 1) return;
    if (!window.confirm(`Delete the local ${activeDocument.kind} “${activeDocument.title}”?`)) return;
    try {
      documentCommands.deleteDocument();
    } catch {
      publishing.setPublishFeedback("The published copy could not be removed, so the post was not deleted.");
      return;
    }
    setSelectedBlockId(null);
  }

  function insertBlock(type: InsertableBlockType) {
    const block = blockCommands.insertBlock(type, insertAfterIndex);
    setSelectedBlockId(block.id);
    setInspectorTab("block");
    setShowInserter(false);
    setInserterQuery("");
  }

  function duplicateBlock(blockIndex: number) {
    const copy = blockCommands.duplicateBlock(blockIndex);
    setSelectedBlockId(copy.id);
  }

  function removeBlock(blockId: string) {
    blockCommands.removeBlock(blockId);
    setSelectedBlockId(null);
    setInspectorTab("document");
  }

  function openInserter(afterIndex: number | null) {
    setInsertAfterIndex(afterIndex);
    setShowInserter(true);
  }

  function openMediaLibrary(targetBlockId: string | null = null) {
    media.targetBlock(targetBlockId);
    setStudioSection("files");
    setPreviewing(false);
  }

  function openCoverMediaLibrary() {
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
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoStudio(); else undoStudio();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  if (!activeDocument) return null;

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{studioSection !== "content" ? <><span>Studio</span><b>›</b><strong>{studioSection === "files" ? "Files" : "Backup"}</strong></> : <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><b>›</b><strong>{activeDocument.title}</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">Local prototype</span><span aria-live="polite">{saveLabel}</span></div>
        <div className="studio-actions">
          {studioSection !== "content" ? <button className="button-secondary" type="button" onClick={() => setStudioSection("content")}>Back to {activeDocument.title}</button> : <><button className="icon-button" type="button" onClick={undoStudio} aria-label="Undo">↶</button><button className="icon-button" type="button" onClick={redoStudio} aria-label="Redo">↷</button><button className={`button-secondary${previewing ? " is-active" : ""}`} type="button" onClick={() => setPreviewing((value) => !value)}>{previewing ? "Edit" : "Preview"}</button>{activeDocument.kind === "post" ? <>{activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post ↗</a> : null}<button className="button-primary" type="button" onClick={publishing.publish}>{activeDocument.status === "published" ? "Update" : "Publish"}</button></> : <button className="button-primary" type="button" onClick={() => exportJson(activeDocument, `${activeDocument.slug}.json`)}>Export</button>}</>}
        </div>
      </header>

      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</div>

      <main className={`studio-workspace${previewing ? " is-previewing" : ""}${studioSection !== "content" ? " is-tool" : ""}`}>
        <aside className="studio-library">
          <div className="library-create">
            <button type="button" onClick={() => addDocument("post")}><span>＋</span> New post</button>
            <button type="button" onClick={() => addDocument("page")}><span>＋</span> New page</button>
          </div>
          <div className="library-tabs" aria-label="Content type">
            {(["page", "post"] as const).map((kind) => (
              <button className={studioSection === "content" && libraryKind === kind ? "is-active" : ""} type="button" key={kind} onClick={() => { setLibraryKind(kind); setStudioSection("content"); }}>
                {kind === "page" ? "Pages" : "Posts"}<span>{workspace.documents.filter((item) => item.kind === kind).length}</span>
              </button>
            ))}
          </div>
          <button className={`library-tool-button${studioSection === "files" ? " is-active" : ""}`} type="button" onClick={() => openMediaLibrary()}><span>▧</span><strong>Files</strong><small>Images and documents</small></button>
          <button className={`library-tool-button${studioSection === "backup" ? " is-active" : ""}`} type="button" onClick={() => { setStudioSection("backup"); setPreviewing(false); }}><span>⇣</span><strong>Backup</strong><small>Export and restore</small></button>
          <div className="document-list">
            {workspace.documents.filter((document) => document.kind === libraryKind).map((document) => (
              <button className={`document-item${document.id === activeDocument.id ? " is-active" : ""}`} type="button" key={document.id} onClick={() => selectDocument(document)}>
                <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
                <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
                <i className={`document-status is-${document.status}`} aria-label={document.status} />
              </button>
            ))}
          </div>
          <div className="library-footer"><button type="button" onClick={() => exportJson(workspace, "acm-studio-content.json")}>Export all content</button><a href="/">← Public site</a></div>
        </aside>

        {studioSection === "content" ? <>
          <StudioCanvas
            activeDocument={activeDocument}
            previewing={previewing}
            wordCount={wordCount}
            characterCount={characterCount}
            linkTargets={workspace.documents.map((document) => ({ id: document.id, title: document.title, href: document.kind === "page" ? `/${document.slug}` : `/writing/${document.publishedSlug ?? document.slug}`, kind: document.kind }))}
            showCoverImage={showCoverImage}
            coverImageUrl={media.coverImageUrl}
            mediaBlockUrls={media.blockUrls}
            selectedBlockId={selectedBlockId}
            dragOverIndex={dragOverIndex}
            showInserter={showInserter}
            inserterQuery={inserterQuery}
            filteredBlocks={filteredBlocks}
            publishFeedback={publishing.publishFeedback}
            onOpenInserter={openInserter}
            onSetPublishFeedback={publishing.setPublishFeedback}
            onDocumentFieldChange={updateActiveField}
            onFocusDocumentField={() => { setSelectedBlockId(null); setInspectorTab("document"); }}
            onOpenCoverMediaLibrary={openCoverMediaLibrary}
            onRemoveCoverImage={media.removeCoverImage}
            onSelectBlock={(blockId) => { setSelectedBlockId(blockId); setInspectorTab("block"); }}
            onSetDragOverIndex={setDragOverIndex}
            onMoveBlockTo={blockCommands.moveBlockTo}
            onMoveBlock={blockCommands.moveBlock}
            onDuplicateBlock={duplicateBlock}
            onRemoveBlock={removeBlock}
            onUpdateBlock={blockCommands.updateBlock}
            onInsertBlock={insertBlock}
            onSetShowInserter={setShowInserter}
            onSetInserterQuery={setInserterQuery}
          />
          <StudioInspector
            inspectorTab={inspectorTab}
            selectedBlock={selectedBlock}
            activeDocument={activeDocument}
            pages={workspace.documents.filter((item) => item.kind === "page")}
            canDelete={workspace.documents.length > 1}
            onSelectTab={setInspectorTab}
            onDocumentChange={updateActiveField}
            onBlockChange={(next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next)}
            onOpenFiles={() => openMediaLibrary(selectedBlock?.id ?? null)}
            onPublish={publishing.publish}
            onUnpublish={publishing.unpublish}
            onDuplicate={duplicateDocument}
            onDelete={deleteDocument}
          />
        </> : studioSection === "files" ? <MediaManager
          targetLabel={media.targetCover ? "Cover image" : media.targetBlockId ? "Image block" : "Media library"}
          targetKind={media.targetCover ? "cover" : "block"}
          onInsertImage={media.insertImage}
        /> : <BackupManager workspace={workspace} />}
      </main>
    </div>
  );
}
