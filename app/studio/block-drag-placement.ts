import type { ContentBlock } from "../content/model";
import { childContentBlocks, findContentBlock } from "../content/block-tree";
import { preservesBlockLocks } from "../content/block-editorial";
import type { BlockLibraryItemType } from "./editor-model";
import { groupAllowsChild, permitsBlockTreeChanges } from "./block-inserter-options";
import { moveBlockToTarget } from "./block-placement";
import { editBlockSiblings, reorderBlockAmongSiblings } from "./block-sibling-operations";
import { rootBlockDropPosition, nestedBlockDropPosition, blockSiblingOwner, blockSiblingAxis } from "./block-drop-position";
import { columnDropPosition } from "./column-drop-position";
import type { DragPlacement } from "./use-drag-placement";
import type { PlacementSpace } from "./drag-placement-space";
export type BlockDragSource = { id?: string; libraryType?: BlockLibraryItemType };
export type BlockDragTarget = { kind: "insert"; type: BlockLibraryItemType; index: number; parentId?: string } | { kind: "move"; id: string; blocks: ContentBlock[]; root?: { from: number; index: number } };
/** Only block policy lives here; input lifecycle and indicator geometry are shared. */
export function resolveBlockDrag({ blocks, source, rootTypes }: { blocks: ContentBlock[]; source: BlockDragSource; rootTypes: string[] }, canvas: HTMLElement, x: number, y: number): DragPlacement<BlockDragTarget> | null {
  const sourceBlock = source.id ? findContentBlock(blocks, source.id) : null;
  if (source.id && !blocks.some(block => block.id === source.id)) {
    let siblings: string[] = [];
    editBlockSiblings(blocks, source.id, items => { siblings = items.map(item => item.id); return items; });
    const position = nestedBlockDropPosition(canvas, source.id, x, y, siblings);
    if (position) {
      const next = reorderBlockAmongSiblings(blocks, source.id, position.targetId, position.after);
      return next === blocks || !permitsBlockTreeChanges(blocks, next) || !preservesBlockLocks(blocks, next) ? null : { target: { kind: "move", id: source.id, blocks: next }, line: position.line };
    }
  }
  const column = columnDropPosition(canvas, canvas.ownerDocument.elementFromPoint(x, y), x, y);
  if (column && sourceBlock?.type !== "column") {
    if (source.libraryType) {
      const parent = findContentBlock(blocks, column.target.parentId!);
      if (parent?.type !== "column" || !groupAllowsChild(parent, source.libraryType)) return null;
      return { target: { kind: "insert", type: source.libraryType, index: column.target.index, parentId: column.target.parentId! }, line: { left: column.left, top: column.top, width: column.width, height: column.height } };
    }
    if (!source.id) return null;
    const next = moveBlockToTarget(blocks, source.id, column.target);
    return next === blocks ? null : { target: { kind: "move", id: source.id, blocks: next }, line: { left: column.left, top: column.top, width: column.width, height: column.height } };
  }
  const position = rootBlockDropPosition(canvas, x, y);
  if (!position) return null;
  if (source.libraryType) return rootTypes.includes(source.libraryType) ? { target: { kind: "insert", type: source.libraryType, index: position.index }, line: position.line } : null;
  if (!source.id) return null;
  const next = moveBlockToTarget(blocks, source.id, { parentId: null, index: position.index });
  if (next === blocks) return null;
  const from = blocks.findIndex(block => block.id === source.id);
  return { target: { kind: "move", id: source.id, blocks: next, ...(from >= 0 ? { root: { from, index: position.index } } : {}) }, line: position.line };
}

/** Domain discovery only; the controller owns reservation and restoration. */
export function blockPlacementSpaces(canvas: HTMLElement, blocks: ContentBlock[]) {
  const spaces: PlacementSpace[] = [];
  const surface = canvas.closest<HTMLElement>(".template-surface, .document-preview");
  const canvasBounds = canvas.getBoundingClientRect();
  function visit(block: ContentBlock) {
    const children = childContentBlocks(block);
    const groups = block.type === "list" ? block.items.flatMap(item => typeof item === "string" || !item.children?.length ? [] : [item.children]) : children.length ? [children] : [];
    for (const siblings of groups) {
      const owner = blockSiblingOwner(canvas, siblings[0].id, siblings.map(child => child.id));
      if (owner && owner !== canvas) {
        const frames = Array.from(owner.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]"));
        const rows = siblings.map(sibling => frames.find(frame => frame.dataset.studioNestedBlockId === sibling.id)!).filter(Boolean);
        const axis = blockSiblingAxis(owner);
        const bounds = owner.getBoundingClientRect();
        const boundary = axis === "x" && surface && Math.abs(bounds.left - canvasBounds.left) < 1 && Math.abs(bounds.right - canvasBounds.right) < 1 ? surface : undefined;
        spaces.push({ element: owner, axis, rows, boundary });
      }
    }
    children.forEach(visit);
  }
  blocks.forEach(visit);
  return spaces;
}
