import type { ContentBlock } from "../content/model";
import { findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import { groupAllowsChild } from "./block-inserter-options";
import { editBlockSiblings } from "./block-sibling-operations";
import { templateEditorBlocks, templateNodesFromBlocks, validateTemplateSet, visitTemplateNodes, type PageTemplate, type TemplatePart, type TemplateSet, type TemplateNode } from "./template-model";

/** Content is template-owned; ordinary document inserters never opt into it. */
export function templateContentAvailable(target: PageTemplate | TemplatePart, nodes = target.nodes): boolean {
  if (target.kind !== "page" && target.kind !== "post") return false;
  let found = false;
  visitTemplateNodes(nodes, node => { if (node.type === "element" && node.element === "content") found = true; });
  return !found;
}

export function insertTemplateContent(set: TemplateSet, target: PageTemplate | TemplatePart, nodes: TemplateNode[], index: number | null, parentId: string | undefined, id: string): { nodes: TemplateNode[]; block: ContentBlock } | null {
  if (!templateContentAvailable(target, nodes) || !set.templates.some(item => item.id === target.id && item.kind === target.kind)) return null;
  const before = templateEditorBlocks(nodes);
  const parent = parentId ? findContentBlock(before, parentId) : undefined;
  if (parentId && (!parent || !(parent.type === "section" || parent.type === "column" || parent.type === "group" && !parent.data?.templateElement && !parent.data?.templatePart))) return null;
  const block = templateEditorBlocks([{ id, type: "element", element: "content" }])[0];
  if (findContentBlock(before, id) || parent && !groupAllowsChild(parent, block.type)) return null;
  const siblings = parent && "children" in parent ? parent.children : before;
  if (!siblings) return null;
  const position = index ?? siblings.length;
  if (!Number.isInteger(position) || position < 0 || position > siblings.length) return null;
  const inserted = [...siblings.slice(0, position), block, ...siblings.slice(position)];
  const after = parentId ? editBlockSiblings(before, parentId, (items, ownerIndex) => items.map((item, itemIndex) => itemIndex === ownerIndex && (item.type === "group" || item.type === "section" || item.type === "column") ? { ...item, children: inserted } : item)) : inserted;
  if (!preservesBlockLocks(before, after)) return null;
  const nextNodes = templateNodesFromBlocks(after, nodes);
  // Keep the canonical template validator as the final parent/slot contract.
  try {
    validateTemplateSet({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes: nextNodes } : item) });
  } catch { return null; }
  return { nodes: nextNodes, block };
}
