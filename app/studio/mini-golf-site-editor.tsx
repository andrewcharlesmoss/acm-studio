"use client";

import { useMemo, useState } from "react";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { useStudioWorkspace } from "./use-studio-workspace";
import { initialMiniGolfDraft, initialMiniGolfStagingDraft, miniGolfDraftRepository, miniGolfStagingDraftRepository, validateMiniGolfDraft } from "./mini-golf-draft";
import { miniGolfSite as productionSite, type MiniGolfSite } from "./site-registry";
import { StudioIcon } from "./studio-icons";
import { studioWriteOwnership } from "./write-ownership";
import { SiteSourceFiles } from "./site-source-files";
import { SiteNavigation } from "./site-navigation";
import { SiteCodexTasks } from "./site-codex-tasks";
import { SiteSettings } from "./site-settings";
import { StudioEditor, documentCharacterCount, documentWordCount } from "./studio-editor";
import { blockCatalogue, type InsertableBlockType } from "./editor-model";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { MiniGolfRuntimeProvider } from "./mini-golf-runtime";
import { blocksToMiniGolfPageDefinition } from "./mini-golf-page-contract";
import runtimeSource from "../../docs/mini-golf-runtime-source.json";
import { miniGolfPresentation } from "./mini-golf-presentation";
import { findBlockById } from "./studio-command-operations.mjs";

export function MiniGolfSiteEditor({ site: miniGolfSite = productionSite }: { site?: MiniGolfSite }) {
  const repository = miniGolfSite.environment === "staging" ? miniGolfStagingDraftRepository : miniGolfDraftRepository;
  const { workspace, ready, writable, saveLabel, canRetryEditing, retryEditing, updateActiveDocument, updateActiveField, undo, redo, canUndo, canRedo } = useStudioWorkspace(repository, studioWriteOwnership, miniGolfSite.environment === "staging" ? initialMiniGolfStagingDraft : initialMiniGolfDraft, `mini-golf-${miniGolfSite.id}`, validateMiniGolfDraft);
  const [previewing, setPreviewing] = useState(false);
  const [codeEditorDirty, setCodeEditorDirty] = useState(false);
  const [view, setView] = useState<"page" | "files" | "codex" | "settings">("page");
  useStudioHistoryShortcuts(undo, redo, view === "page");
  const page = workspace.documents[0];
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"document" | "block" | "styles">("document");
  const [showInserter, setShowInserter] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [inserterQuery, setInserterQuery] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const selectedBlock = selectedBlockId ? findBlockById(page.blocks, selectedBlockId) : null;
  const blockCommands = useStudioBlockCommands({ activeDocument: page, updateActiveDocument });
  const filteredBlocks = useMemo(() => {
    const query = inserterQuery.trim().toLowerCase();
    return query ? blockCatalogue.filter((item) => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query)) : blockCatalogue;
  }, [inserterQuery]);

  function confirmCodeEditorDiscard() {
    if (!codeEditorDirty) return true;
    if (!window.confirm("Discard unsaved code changes?")) return false;
    setCodeEditorDirty(false);
    return true;
  }

  function insertBlock(type: InsertableBlockType) {
    const block = blockCommands.insertBlock(type, insertAfterIndex);
    setSelectedBlockId(block.id);
    setInspectorTab("block");
    setShowInserter(false);
    setInserterQuery("");
    return block;
  }

  function duplicateBlock(index: number) {
    const copy = blockCommands.duplicateBlock(index);
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

  function exportDraft() {
    const blob = new Blob([JSON.stringify({ format: "acm-studio-site-draft", version: 1, siteId: miniGolfSite.id, workspace, pageDefinition: blocksToMiniGolfPageDefinition(page.blocks, { pageId: page.id, instanceId: `${miniGolfSite.id}:${page.id}:scorecard`, source: { revision: runtimeSource.sourceRevision, fileHashes: runtimeSource.files } }) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${miniGolfSite.id}-page-draft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <MiniGolfRuntimeProvider blocks={page.blocks} identity={`${miniGolfSite.id}:${page.id}`}><div className="studio-shell studio-desktop-only mini-golf-editor">
    <header className="studio-header">
      <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
      <nav className="studio-breadcrumbs" aria-label="Breadcrumb"><a href="/">Sites</a><StudioIcon name="chevron-right" size={14} /><strong>{miniGolfSite.name}</strong></nav>
      <div className="studio-state"><span aria-live="polite">{saveLabel}</span>{canRetryEditing ? <button className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
      <div className="studio-actions"><a className="button-secondary" href={`${miniGolfSite.editorHref}/preview`} target="_blank" rel="noopener noreferrer">Open standalone preview</a><button className="button-secondary" onClick={exportDraft} disabled={!ready}>Export Draft</button></div>
    </header>
    <div className="studio-notice" role="note"><strong>{miniGolfSite.environmentLabel} — local page draft.</strong> {miniGolfSite.environment === "staging" ? "Staging is the working copy for this build. Production remains separate until an explicit synchronisation is reviewed; this draft is not a capture of the private staging site. " : "Production is a separate reference until staging is approved for synchronisation. "}Page edits stay here; no deployment is performed.</div>
    <main className={`site-draft-workspace${view !== "page" ? " is-files" : ""}`}>
      <aside className="site-draft-library" aria-label="Site pages">
        <a className="site-draft-back" href="/"><StudioIcon name="arrow-left" size={16} /> All Sites</a>
        <SiteNavigation currentSiteId={miniGolfSite.id} />
        <h2>{miniGolfSite.name}</h2>
        <p>Pages</p><button className="site-draft-page" aria-pressed={view === "page"} onClick={() => { if (!confirmCodeEditorDiscard()) return; setView("page"); setSelectedBlockId(null); setInspectorTab("document"); setPreviewing(false); }}>Home <span>Draft</span></button>
        <button className="site-draft-page" aria-pressed={view === "files"} onClick={() => { if (confirmCodeEditorDiscard()) setView("files"); }}><StudioIcon name="code" size={18} />Files &amp; Code</button>
        <button className="site-draft-page" aria-pressed={view === "codex"} onClick={() => { if (confirmCodeEditorDiscard()) setView("codex"); }}>Codex Tasks</button>
        <button className="site-draft-page" aria-pressed={view === "settings"} onClick={() => { if (confirmCodeEditorDiscard()) setView("settings"); }}>Site Settings</button>
        <a className="site-draft-visit" href={miniGolfSite.publicHref} target="_blank" rel="noopener noreferrer">Visit Live Site <StudioIcon name="external" size={16} /></a>
      </aside>
      {view === "settings" ? <SiteSettings key={miniGolfSite.id} site={miniGolfSite} /> : view === "codex" ? <SiteCodexTasks /> : view === "files" ? <SiteSourceFiles /> : <>
        <StudioEditor
          writable={writable}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          canvas={{
            className: "mini-golf-editor-surface",
            presentation: miniGolfPresentation,
            activeDocument: page,
            previewing,
            onPreviewChange: setPreviewing,
            wordCount: documentWordCount(page),
            characterCount: documentCharacterCount(page),
            linkTargets: [],
            showCoverImage: false,
            mediaBlockUrls: {},
            selectedBlockId,
            dragOverIndex,
            showInserter,
            inserterQuery,
            filteredBlocks,
            publishFeedback: null,
            onOpenInserter: openInserter,
            onSetPublishFeedback: () => undefined,
            onDocumentFieldChange: updateActiveField,
            onApplyDocumentCode: (blocks) => updateActiveDocument((document) => ({ ...document, blocks })),
            onCodeEditorDirtyChange: setCodeEditorDirty,
            onFocusDocumentField: () => { setSelectedBlockId(null); setInspectorTab("document"); },
            onOpenCoverMediaLibrary: () => undefined,
            onRemoveCoverImage: () => undefined,
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
            activeDocument: page,
            pages: [page],
            canDelete: false,
            canDuplicate: false,
            canOpenFiles: false,
            allowedStatuses: ["draft"],
            allowedPageTemplates: ["default", "wide"],
            onSelectTab: setInspectorTab,
            onDocumentChange: updateActiveField,
            onBlockChange: (next) => selectedBlock && blockCommands.updateBlock(selectedBlock.id, () => next),
            onOpenFiles: () => { if (confirmCodeEditorDiscard()) setView("files"); },
            onPublish: () => undefined,
            onUnpublish: () => undefined,
            onDuplicate: () => undefined,
            onDelete: () => undefined,
          }}
        />
      </>}
    </main>
  </div></MiniGolfRuntimeProvider>;
}
