"use client";
import { insertedBlockSelectionId } from "./button-insertion";
import type { InsertableBlockType } from "./editor-model";
import type { useStudioBlockCommands } from "./use-studio-block-commands";

/** Adapt block commands to canvas selection and inserter state. */
export function useStudioCanvasActions({ blockCommands, writable, insertAfterIndex,
  setPendingColumnsLayoutBlockId, setDocumentFieldSelection, setSelectedBlockId, setInspectorTab,
  setInsertAfterIndex, setShowInserter, setInserterQuery,
}: {
  blockCommands: ReturnType<typeof useStudioBlockCommands>; writable: boolean; insertAfterIndex: number | null;
  setPendingColumnsLayoutBlockId: (id: string | null) => void; setDocumentFieldSelection: (field: null) => void;
  setSelectedBlockId: (id: string | null) => void; setInspectorTab: (tab: "block" | "document") => void;
  setInsertAfterIndex: (index: number | null) => void; setShowInserter: (show: boolean) => void; setInserterQuery: (query: string) => void;
}) {
  function insertBlock(type: InsertableBlockType, parentId?: string, afterIndex = insertAfterIndex, keepInserterOpen = false, parentInsertionIndex?: number) {
    if (!writable) return null;
    const block = blockCommands.insertBlock(type, afterIndex, parentId, parentInsertionIndex);
    if (!block) return null;
    setPendingColumnsLayoutBlockId(block.type === "columns" ? block.id : null);
    setDocumentFieldSelection(null);
    setSelectedBlockId(insertedBlockSelectionId(block));
    setInspectorTab("block");
    if (keepInserterOpen && !parentId && afterIndex !== null) setInsertAfterIndex(afterIndex + 1);
    if (!keepInserterOpen) { setShowInserter(false); setInserterQuery(""); }
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

  return { insertBlock, duplicateBlock, removeBlock, openInserter };
}
