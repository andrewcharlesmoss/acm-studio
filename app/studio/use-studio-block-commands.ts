"use client";

import type { ContentBlock } from "../content/model";
import { createBlock, type InsertableBlockType, type StudioDocument } from "./editor-model";
import {
  duplicateBlockAt,
  insertBlockAt,
  moveBlockAt,
  removeBlockById,
  updateDocumentBlocks,
} from "./studio-command-operations.mjs";

function createUniqueId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function useStudioBlockCommands({
  activeDocument,
  updateActiveDocument,
}: {
  activeDocument: StudioDocument;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => void;
}) {
  function updateBlock(blockId: string, update: (block: ContentBlock) => ContentBlock) {
    updateActiveDocument((document) => ({
      ...updateDocumentBlocks(document, (blocks) => blocks.map((block) => block.id === blockId ? update(block) : block)),
    }));
  }

  function insertBlock(type: InsertableBlockType, afterIndex: number | null) {
    const block = createBlock(type);
    updateActiveDocument((document) => insertBlockAt(document, block, afterIndex));
    return block;
  }

  function moveBlock(blockIndex: number, direction: -1 | 1) {
    const target = blockIndex + direction;
    if (target < 0 || target >= activeDocument.blocks.length) return;
    updateActiveDocument((document) => moveBlockAt(document, blockIndex, target));
  }

  function moveBlockTo(from: number, to: number) {
    if (from === to) return;
    updateActiveDocument((document) => moveBlockAt(document, from, to));
  }

  function duplicateBlock(blockIndex: number) {
    const source = activeDocument.blocks[blockIndex];
    const copy = { ...JSON.parse(JSON.stringify(source)) as ContentBlock, id: createUniqueId(source.type) };
    updateActiveDocument((document) => duplicateBlockAt(document, blockIndex, () => copy.id));
    return copy;
  }

  function removeBlock(blockId: string) {
    updateActiveDocument((document) => removeBlockById(document, blockId));
  }

  return { updateBlock, insertBlock, moveBlock, moveBlockTo, duplicateBlock, removeBlock };
}
