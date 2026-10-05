"use client";

import { cloneBlocksForInsertion } from "./block-copy";
import { setColumnWidth } from "../content/columns";
import { proposeColumnCountChange } from "./columns-count-change";
import { editBlockSiblings } from "./block-sibling-operations";
import { insertBlockAtTarget } from "./block-placement";
import { createButtonForInsertion } from "./button-insertion";
import { preservesBlockLocks } from "../content/block-editorial";
import { reconcileFootnoteBlocks } from "../content/footnote-reconciliation";
import { exitEmptyListItem } from "./list-structure";
import { backspaceFirstListItem } from "./list-root-boundary";
import { appendFollowingListItems } from "./list-sibling-boundary";
import type { ContentBlock, RichTextRun } from "../content/model";
import { normaliseTextRuns } from "../content/rich-text";
import { createBlock, type InsertableBlockType, type StudioDocument } from "./editor-model";
import { containsTemplateContent, groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { validContentBlocks } from "./workspace-validation";
import type { BlockCommandFocusTarget } from "./block-command-focus";
import {
  findBlockById,
  insertBlockAt,
  moveBlockAt,
  removeNestedBlockById,
  removeBlocksByIds,
  updateBlockById,
} from "./studio-command-operations.mjs";

function createUniqueId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function useStudioBlockCommands({
  activeDocument,
  updateActiveDocument: commitActiveDocument,
}: {
  activeDocument: StudioDocument;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => void;
}) {
  function updateActiveDocument(update: (document: StudioDocument) => StudioDocument) {
    commitActiveDocument(document => {
      const next = update(document);
      const blocks = reconcileFootnoteBlocks(document.blocks, next.blocks);
      return blocks && preservesBlockLocks(document.blocks, blocks) ? blocks === next.blocks ? next : { ...next, blocks } : document;
    });
  }
  function updateBlock(blockId: string, update: (block: ContentBlock) => ContentBlock) {
    updateActiveDocument((document) => updateBlockById(document, blockId, update));
  }

  function updateColumnWidth(expectedParent: Extract<ContentBlock, { type: "columns" }>, columnId: string, width: number) {
    if (!Number.isFinite(width)) return;
    const baseline = JSON.stringify(expectedParent);
    updateActiveDocument(document => {
      if (document.id !== activeDocument.id) return document;
      const parent = findBlockById(document.blocks, expectedParent.id);
      // Width belongs to Columns: never replace the selected child with its parent.
      if (parent?.type !== "columns" || JSON.stringify(parent) !== baseline) return document;
      const replacement = setColumnWidth(parent, columnId, width);
      if (replacement === parent || JSON.stringify(replacement) === baseline) return document;
      const next = updateBlockById(document, parent.id, () => replacement);
      return validContentBlocks(next.blocks) && permitsBlockTreeChanges(document.blocks, next.blocks) ? next : document;
    });
  }

  function updateColumnCount(expectedParent: Extract<ContentBlock, { type: "columns" }>, count: number) {
    const proposal = proposeColumnCountChange(expectedParent, count, index => createUniqueId(`column-${index + 1}`));
    if (proposal.block === expectedParent) return;
    const baseline = JSON.stringify(expectedParent);
    updateActiveDocument(document => {
      if (document.id !== activeDocument.id) return document;
      const parent = findBlockById(document.blocks, expectedParent.id);
      if (parent?.type !== "columns" || JSON.stringify(parent) !== baseline) return document;
      const next = updateBlockById(document, parent.id, () => proposal.block);
      return validContentBlocks(next.blocks) && permitsBlockTreeChanges(document.blocks, next.blocks) ? next : document;
    });
  }

  function insertBlock(type: InsertableBlockType, afterIndex: number | null, parentId?: string | null, parentInsertionIndex?: number) {
    const parent = parentId ? findBlockById(activeDocument.blocks, parentId) : null;
    if (parentId && (!parent || !groupAllowsChild(parent, type) || parent.type === "buttons" && parent.children.length >= 100)) return null;
    const block = createBlock(type, type === "button" || type === "buttons" ? createUniqueId(type) : undefined);
    const socialChild = block.type === "social-linkedin" || block.type === "social-tiktok";
    const buttonGroup = block.type === "button" ? { id: createUniqueId("buttons"), type: "buttons" as const, children: [block] } : null;
    const socialGroup = socialChild ? { id: createUniqueId("social-icons"), type: "social-icons" as const, children: [block] } : null;
    if (parentInsertionIndex !== undefined) {
      const inserted = socialGroup ?? buttonGroup ?? block;
      const target = { parentId: parentId ?? null, index: parentInsertionIndex };
      if (insertBlockAtTarget(activeDocument.blocks, inserted, target) === activeDocument.blocks) return null;
      updateActiveDocument(document => {
        const blocks = insertBlockAtTarget(document.blocks, inserted, target);
        return blocks === document.blocks ? document : { ...document, blocks };
      });
      return block;
    }
    updateActiveDocument((document) => parentId
      ? updateBlockById(document, parentId, (parent: ContentBlock) => parent.type === "social-icons" && socialChild
        ? { ...parent, children: [...parent.children, block] }
        : (parent.type === "section" || parent.type === "group" || parent.type === "column" || parent.type === "quote" || parent.type === "buttons")
          ? !groupAllowsChild(parent, type) || parent.type === "buttons" && parent.children.length >= 100
            ? parent
            : { ...parent, ...(parent.type === "quote" ? { text: "", runs: undefined } : {}), children: [...(parent.children ?? (parent.type === "quote" ? [{ id: createUniqueId("paragraph"), type: "paragraph" as const, text: parent.text, runs: parent.runs }] : [])), parent.type === "buttons" && block.type === "button" ? createButtonForInsertion(block.id, parent.children.at(-1)) : socialGroup ?? buttonGroup ?? block] } as ContentBlock
          : parent)
      : insertBlockAt(document, socialGroup ?? buttonGroup ?? block, afterIndex));
    return block;
  }

  function splitParagraph(blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source || (source.type !== "paragraph" && source.type !== "heading")) return null;
    const parent = parentOfNestedBlock(activeDocument.blocks, blockId);
    if ((parent?.type === "group" || parent?.type === "column") && !groupAllowsChild(parent, "paragraph")) return null;
    const nextId = createUniqueId("paragraph");
    const beforeText = beforeRuns.map((run) => run.text).join("");
    const afterText = afterRuns.map((run) => run.text).join("");
    const before = { ...source, text: beforeText, runs: beforeRuns };
    const afterStyle = source.visualStyle ? { ...source.visualStyle, anchor: undefined } : undefined;
    const after: ContentBlock = source.type === "heading" && !afterText
      ? { id: nextId, type: "paragraph", text: afterText, runs: afterRuns, align: source.align, visualStyle: afterStyle }
      : { ...source, id: nextId, text: afterText, runs: afterRuns, visualStyle: afterStyle, ...(source.type === "paragraph" && source.style ? { style: { ...source.style, anchor: undefined } } : {}) };

    updateActiveDocument((document) => {
      function split(blocks: ContentBlock[]): ContentBlock[] {
        const next: ContentBlock[] = [];
        for (const block of blocks) {
          if (block.id === blockId && (block.type === "paragraph" || block.type === "heading")) {
            next.push(before, after);
          } else if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "quote" || block.type === "buttons") && Array.isArray(block.children)) {
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

  function mergeParagraphBackward(blockId: string): { blockId: string; offset: number } | null {
    let merged: { blockId: string; offset: number } | null = null;
    function merge(blocks: ContentBlock[]): ContentBlock[] {
      const next = [...blocks];
      const index = next.findIndex((block) => block.id === blockId);
      if (index >= 0) {
        const current = next[index];
        const previous = next[index - 1];
        if (current.type === "heading" && !previous) {
          if (!current.text && next[index + 1]) { const target = next[index + 1]; merged = { blockId: target.id, offset: 0 }; next.splice(index, 1); }
          else {
            const paragraph = { ...current, type: "paragraph" as const, style: current.visualStyle, visualStyle: undefined };
            Reflect.deleteProperty(paragraph, "level");
            next[index] = paragraph;
            merged = { blockId: current.id, offset: 0 };
          }
          return next;
        }
        if ((current.type !== "paragraph" && current.type !== "heading") || (previous?.type !== "paragraph" && previous?.type !== "heading")) return blocks;
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
        if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "quote" || block.type === "buttons") && Array.isArray(block.children)) {
          const children = merge(block.children);
          if (children !== block.children) return { ...block, children } as ContentBlock;
        }
        return block;
      });
    }

    const proposed = merge(activeDocument.blocks);
    if (!preservesBlockLocks(activeDocument.blocks, proposed)) return null;
    const result = merged as { blockId: string; offset: number } | null;
    if (!result) return null;
    updateActiveDocument((document) => ({ ...document, blocks: merge(document.blocks) }));
    return result;
  }

  function splitParagraphs(blockId: string, paragraphs: RichTextRun[][]) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source || (source.type !== "paragraph" && source.type !== "heading") || paragraphs.length < 2) return null;
    const parent = parentOfNestedBlock(activeDocument.blocks, blockId);
    if ((parent?.type === "group" || parent?.type === "column") && !groupAllowsChild(parent, "paragraph")) return null;
    const replacements = paragraphs.map((runs, index) => ({
      ...source,
      id: index === 0 ? blockId : createUniqueId("paragraph"),
      text: runs.map(run => run.text).join(""),
      runs,
      visualStyle: index === 0 ? source.visualStyle : source.visualStyle ? { ...source.visualStyle, anchor: undefined } : undefined,
      ...(source.type === "paragraph" && source.style ? { style: index === 0 ? source.style : { ...source.style, anchor: undefined } } : {}),
    }));
    const ids = replacements.map(block => block.id);
    updateActiveDocument(document => {
      let replaced = false;
      function split(blocks: ContentBlock[]): ContentBlock[] {
        const next: ContentBlock[] = [];
        for (const block of blocks) {
          if (block.id === blockId && (block.type === "paragraph" || block.type === "heading")) {
            next.push(...replacements);
            replaced = true;
          } else if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "quote" || block.type === "buttons") && Array.isArray(block.children)) {
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


  function exitList(blockId: string, itemIndex: number, operation: "return" | "backward" | "forward" = "return", listId = blockId): BlockCommandFocusTarget {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (source?.type !== "list") return null;
    const parent = parentOfNestedBlock(activeDocument.blocks, blockId);
    if (operation === "backward" && itemIndex !== 0) return null;
    const backward = operation === "backward" ? backspaceFirstListItem(activeDocument.blocks, source, createUniqueId) : null;
    const forward = operation === "forward" ? appendFollowingListItems(activeDocument.blocks, source, listId, itemIndex) : null;
    const exit = operation === "return" ? exitEmptyListItem(source, itemIndex, createUniqueId, activeDocument.blocks) : null;
    if (!backward && !forward && !exit) return null;
    if (exit && parent && !groupAllowsChild(parent, "paragraph")) return null;
    const proposed = forward?.blocks ?? backward?.blocks ?? editBlockSiblings(activeDocument.blocks, blockId, (siblings, index) => [...siblings.slice(0, index), ...exit!.blocks, ...siblings.slice(index + 1)]);
    const reconciled = reconcileFootnoteBlocks(activeDocument.blocks, proposed);
    if (!reconciled || !validContentBlocks(reconciled) || !permitsBlockTreeChanges(activeDocument.blocks, reconciled) || !preservesBlockLocks(activeDocument.blocks, reconciled)) return null;
    const baseline = JSON.stringify(activeDocument.blocks);
    let accepted: boolean | undefined;
    updateActiveDocument(document => {
      accepted = document.id === activeDocument.id && JSON.stringify(document.blocks) === baseline;
      return accepted ? { ...document, blocks: reconciled } : document;
    });
    return accepted === false ? null : { ...(forward ? { blockId: forward.focus.listId, listItemIndex: forward.focus.itemIndex, offset: forward.focus.offset } : backward?.focus ?? { blockId: exit!.paragraphId }), isAccepted: () => accepted === true };
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
    return source ? duplicateBlockById(source.id) : null;
  }

  function duplicateBlockById(blockId: string) {
    const source = findBlockById(activeDocument.blocks, blockId);
    if (!source || containsTemplateContent(source)) return null;
    const parent = parentOfNestedBlock(activeDocument.blocks, blockId);
    if (parent && !groupAllowsChild(parent, source.type)) return null;
    // Allocate once: replaying the updater must reuse the same IDs and references.
    const [copy] = cloneBlocksForInsertion([source], createUniqueId);
    updateActiveDocument(document => ({ ...document, blocks: editBlockSiblings(document.blocks, blockId,
      (siblings, index) => [...siblings.slice(0, index + 1), copy, ...siblings.slice(index + 1)]) }));
    return copy;
  }

  function removeBlock(blockId: string) {
    updateActiveDocument((document) => removeNestedBlockById(document, blockId));
  }

  function removeBlocks(blockIds: string[]) {
    updateActiveDocument((document) => removeBlocksByIds(document, blockIds));
  }

  return { updateBlock, updateColumnWidth, updateColumnCount, insertBlock, exitList, splitParagraph, mergeParagraphBackward, splitParagraphs, moveBlock, moveBlockTo, duplicateBlock, duplicateBlockById, removeBlock, removeBlocks };
}
