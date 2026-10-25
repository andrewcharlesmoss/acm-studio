import type { StudioDocument } from "./editor-model";
import { contentEditorBlockCatalogue, socialIconCatalogue, templateContentBlock, templateNavigationBlock, templatePageLinkBlock, type blockCatalogue } from "./editor-model";
import { childContentBlocks, findContentBlock } from "../content/block-tree";
import { blockInserterOptions } from "./block-inserter-options";

export type CanvasInsertionTarget = { documentId: string; parentId: string | null; index: number; siblingIds: string[] };

/** Capture a boundary without changing selection or the pane's insertion state. */
export function captureCanvasInsertionTarget(document: StudioDocument, afterIndex: number | null, parentId: string | null = null): CanvasInsertionTarget | null {
  const parent = parentId ? findContentBlock(document.blocks, parentId) : null;
  if (parentId && !parent) return null;
  const siblings = parent ? childContentBlocks(parent) : document.blocks;
  const index = afterIndex === null ? siblings.length : afterIndex + 1;
  if (!Number.isInteger(index) || index < 0 || index > siblings.length) return null;
  return { documentId: document.id, parentId, index, siblingIds: siblings.map(block => block.id) };
}

/** Foreign reordering/deletion must never silently redirect an open chooser. */
export function canvasInsertionTargetCurrent(document: StudioDocument, target: CanvasInsertionTarget): boolean {
  const current = captureCanvasInsertionTarget(document, target.index - 1, target.parentId);
  return document.id === target.documentId && Boolean(current && current.siblingIds.length === target.siblingIds.length && current.siblingIds.every((id, index) => id === target.siblingIds[index]));
}

export function canvasBlockChoices(document: StudioDocument, target: CanvasInsertionTarget, query: string, capabilities: { allowTemplateContent?: boolean; allowTemplateNavigation?: boolean; allowTemplatePageLink?: boolean } = {}, catalogue: typeof blockCatalogue = contentEditorBlockCatalogue) {
  if (!canvasInsertionTargetCurrent(document, target)) return [];
  const parent = target.parentId ? findContentBlock(document.blocks, target.parentId) ?? undefined : undefined;
  const choices = blockInserterOptions([...catalogue, templateContentBlock, templateNavigationBlock, templatePageLinkBlock], parent, query.trim(), socialIconCatalogue, { ...capabilities, allowTemplatePageLink: capabilities.allowTemplatePageLink && parent?.type === "group" && parent.data?.templateElement === "navigation" });
  if (query.trim() || choices.length <= 6) return choices;
  const common = ["paragraph", "list", "image", "embed", "heading", "divider"];
  const ordered = [...common.flatMap(type => choices.filter(item => item.type === type)), ...choices.filter(item => !common.includes(item.type))];
  return ordered.slice(0, 6);
}
