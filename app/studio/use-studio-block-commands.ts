"use client";

import type { ContentBlock, RichTextRun } from "../content/model";
import { normaliseTextRuns } from "../content/rich-text";
import { createBlock, type InsertableBlockType, type StudioDocument } from "./editor-model";
import {
  findBlockById,
  insertBlockAt,
  moveBlockAt,
  removeNestedBlockById,
  updateBlockById,
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
    updateActiveDocument((document) => updateBlockById(document, blockId, update));
  }

  function insertBlock(type: InsertableBlockType, afterIndex: number | null) {
    const block = createBlock(type);
    updateActiveDocument((document) => insertBlockAt(document, block, afterIndex));
    return block;
  }

  function splitParagraph(blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source || source.type !== "paragraph") return null;
    const nextId = createUniqueId("paragraph");
    const beforeText = beforeRuns.map((run) => run.text).join("");
    const afterText = afterRuns.map((run) => run.text).join("");
    const before = { ...source, text: beforeText, runs: beforeRuns };
    const after = { ...source, id: nextId, text: afterText, runs: afterRuns };

    updateActiveDocument((document) => {
      function split(blocks: ContentBlock[]): ContentBlock[] {
        const next: ContentBlock[] = [];
        for (const block of blocks) {
          if (block.id === blockId && block.type === "paragraph") {
            next.push(before, after);
          } else if ((block.type === "section" || block.type === "group" || block.type === "component") && Array.isArray(block.children)) {
            next.push({ ...block, children: split(block.children) } as ContentBlock);
          } else {
            next.push(block);
          }
        }
        return next;
      }
      return { ...document, blocks: split(document.blocks) };
    });
    return nextId;
  }

  function mergeParagraphBackward(blockId: string) {
    let merged: { blockId: string; offset: number } | null = null;
    function merge(blocks: ContentBlock[]): ContentBlock[] {
      const next = [...blocks];
      const index = next.findIndex((block) => block.id === blockId);
      if (index >= 0) {
        const current = next[index];
        const previous = next[index - 1];
        if (current.type !== "paragraph" || previous?.type !== "paragraph") return blocks;
        const previousRuns = previous.runs?.length ? previous.runs : [{ text: previous.text }];
        const currentRuns = current.runs?.length ? current.runs : [{ text: current.text }];
        merged = { blockId: previous.id, offset: previous.text.length };
        next.splice(index - 1, 2, {
          ...previous,
          text: previous.text + current.text,
          runs: normaliseTextRuns([...previousRuns, ...currentRuns]),
        });
        return next;
      }
      return blocks.map((block) => {
        if ((block.type === "section" || block.type === "group" || block.type === "component") && Array.isArray(block.children)) {
          const children = merge(block.children);
          if (children !== block.children) return { ...block, children } as ContentBlock;
        }
        return block;
      });
    }

    merge(activeDocument.blocks);
    if (!merged) return null;
    updateActiveDocument((document) => ({ ...document, blocks: merge(document.blocks) }));
    return merged;
  }

  function splitParagraphs(blockId: string, paragraphs: RichTextRun[][]) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source || source.type !== "paragraph" || paragraphs.length < 2) return null;
    const replacements = paragraphs.map((runs, index) => ({
      ...source,
      id: index === 0 ? blockId : createUniqueId("paragraph"),
      text: runs.map(run => run.text).join(""),
      runs,
    }));
    const ids = replacements.map(block => block.id);
    updateActiveDocument(document => {
      let replaced = false;
      function split(blocks: ContentBlock[]): ContentBlock[] {
        const next: ContentBlock[] = [];
        for (const block of blocks) {
          if (block.id === blockId && block.type === "paragraph") {
            next.push(...replacements);
            replaced = true;
          } else if ((block.type === "section" || block.type === "group" || block.type === "component") && Array.isArray(block.children)) {
            next.push({ ...block, children: split(block.children) } as ContentBlock);
          } else {
            next.push(block);
          }
        }
        return next;
      }
      const blocks = split(document.blocks);
      return replaced ? { ...document, blocks } : document;
    });
    return ids;
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
    if (!source) return null;
    const ids: string[] = [];
    const copy = JSON.parse(JSON.stringify(source)) as ContentBlock;
    const assignIds = (block: ContentBlock): ContentBlock => {
      const id = createUniqueId(block.type);
      ids.push(id);
      const next = { ...block, id } as ContentBlock;
      if (next.type === "section" || next.type === "group") return { ...next, children: next.children.map(assignIds) };
      if (next.type === "component" && next.children) return { ...next, children: next.children.map(assignIds) };
      return next;
    };
    const remapped = assignIds(copy);
    // Use the precomputed immutable copy in the state update. React may replay
    // updater functions in Strict Mode; generating IDs inside that updater can
    // otherwise produce different or exhausted descendant IDs.
    updateActiveDocument((document) => insertBlockAt(document, remapped, blockIndex));
    return remapped;
  }

  function duplicateBlockById(blockId: string) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source) return null;
    const remap = (block: ContentBlock): ContentBlock => {
      const next = { ...JSON.parse(JSON.stringify(block)) as ContentBlock, id: createUniqueId(block.type) };
      if (next.type === "section" || next.type === "group") return { ...next, children: next.children.map(remap) };
      if (next.type === "component" && next.children) return { ...next, children: next.children.map(remap) };
      return next;
    };
    const remapped = remap(source);
    // The operation receives a stable copy so replaying the updater cannot
    // consume another set of generated IDs.
    updateActiveDocument((document) => {
      function insert(blocks: ContentBlock[]): ContentBlock[] {
        const next: ContentBlock[] = [];
        for (const block of blocks) {
          next.push(block);
          if (block.id === blockId) next.push(remapped);
          else if ((block.type === "section" || block.type === "group" || block.type === "component") && Array.isArray(block.children)) next[next.length - 1] = { ...block, children: insert(block.children) } as ContentBlock;
        }
        return next;
      }
      return { ...document, blocks: insert(document.blocks) };
    });
    return remapped;
  }

  function removeBlock(blockId: string) {
    updateActiveDocument((document) => removeNestedBlockById(document, blockId));
  }

  return { updateBlock, insertBlock, splitParagraph, mergeParagraphBackward, splitParagraphs, moveBlock, moveBlockTo, duplicateBlock, duplicateBlockById, removeBlock };
}
