import type { StudioDocument } from "./editor-model";
import { contentEditorBlockCatalogue, socialIconCatalogue, templateContentBlock, templateNavigationBlock, templateSiteTitleBlock, templatePageLinkBlock, type blockCatalogue } from "./editor-model";
import { childContentBlocks, findContentBlock } from "../content/block-tree";
import { blockInserterOptions, groupAllowsChild, permitsBlockTreeChanges } from "./block-inserter-options";
import type { ContentBlock } from "../content/model";
import { updateBlockById } from "./studio-command-operations.mjs";
import { validContentBlocks } from "./workspace-validation";
import { preservesBlockLocks } from "../content/block-editorial";
import { reconcileFootnoteBlocks } from "../content/footnote-reconciliation";

export type CanvasInsertionTarget = { documentId: string; parentId: string | null; parentType: ContentBlock["type"] | null; index: number; siblingIds: string[] };

/** Capture a boundary without changing selection or the pane's insertion state. */
export function captureCanvasInsertionTarget(document: StudioDocument, afterIndex: number | null, parentId: string | null = null): CanvasInsertionTarget | null {
  const parent = parentId ? findContentBlock(document.blocks, parentId) : null;
  if (parentId && !parent) return null;
  const siblings = parent ? childContentBlocks(parent) : document.blocks;
  const index = afterIndex === null ? siblings.length : afterIndex + 1;
  if (!Number.isInteger(index) || index < 0 || index > siblings.length) return null;
  return { documentId: document.id, parentId, parentType: parent?.type ?? null, index, siblingIds: siblings.map(block => block.id) };
}

/** Foreign reordering/deletion must never silently redirect an open chooser. */
export function canvasInsertionTargetCurrent(document: StudioDocument, target: CanvasInsertionTarget): boolean {
  const current = captureCanvasInsertionTarget(document, target.index - 1, target.parentId);
  return document.id === target.documentId && Boolean(current && current.parentType === target.parentType && current.siblingIds.length === target.siblingIds.length && current.siblingIds.every((id, index) => id === target.siblingIds[index]));
}

/** Build a legacy Quote insertion only against the current captured boundary. */
export function insertAtLegacyQuoteBoundary(document: StudioDocument, target: CanvasInsertionTarget, inserted: ContentBlock, legacyParagraphId: string): StudioDocument {
  if (!target.parentId || target.index !== 0 || target.siblingIds.length !== 0 || !canvasInsertionTargetCurrent(document, target)) return document;
  const parent = findContentBlock(document.blocks, target.parentId);
  if (!parent || (parent.type !== "quote" && parent.type !== "pullquote") || !groupAllowsChild(parent, inserted.type)) return document;
  const children = parent.children ?? [{ id: legacyParagraphId, type: "paragraph" as const, text: parent.text, runs: parent.runs, ...(parent.type === "quote" && parent.align ? { align: parent.align } : {}) }];
  const next = updateBlockById(document, parent.id, () => ({ ...parent, ...(parent.children === undefined ? { text: "", runs: undefined } : {}), children: [...children, inserted] }));
  if (next === document || !validContentBlocks(next.blocks) || !permitsBlockTreeChanges(document.blocks, next.blocks) || !preservesBlockLocks(document.blocks, next.blocks)) return document;
  const blocks = reconcileFootnoteBlocks(document.blocks, next.blocks);
  return blocks ? { ...next, blocks } : document;
}

export function canvasBlockChoices(document: StudioDocument, target: CanvasInsertionTarget, query: string, capabilities: { allowTemplateContent?: boolean; allowTemplateNavigation?: boolean; allowTemplateSiteTitle?: boolean; allowTemplatePageLink?: boolean } = {}, catalogue: typeof blockCatalogue = contentEditorBlockCatalogue) {
  if (!canvasInsertionTargetCurrent(document, target)) return [];
  const parent = target.parentId ? findContentBlock(document.blocks, target.parentId) ?? undefined : undefined;
  const choices = blockInserterOptions([...catalogue, templateContentBlock, templateNavigationBlock, templateSiteTitleBlock, templatePageLinkBlock], parent, query.trim(), socialIconCatalogue, { ...capabilities, allowTemplatePageLink: capabilities.allowTemplatePageLink && parent?.type === "group" && parent.data?.templateElement === "navigation" });
  if (query.trim() || choices.length <= 6) return choices;
  const common = ["paragraph", "list", "image", "embed", "heading", "separator"];
  const ordered = [...common.flatMap(type => choices.filter(item => item.type === type)), ...choices.filter(item => !common.includes(item.type))];
  return ordered.slice(0, 6);
}
