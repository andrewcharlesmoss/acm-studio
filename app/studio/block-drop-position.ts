import { placementContainsPoint, placementEdgeGaps } from "./drag-placement-space";
import { insertionGapIndex, insertionGapLine, dropLineInContainer, dropContainerScale, type DropLine } from "./drop-gap-geometry";

export function blockSiblingOwner(canvas: HTMLElement, sourceId: string, siblingIds?: string[]) {
  const source = Array.from(canvas.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]")).find(child => child.dataset.studioNestedBlockId === sourceId);
  let owner = source?.parentElement;
  while (owner && siblingIds && !siblingIds.every(id => Array.from(owner!.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]")).some(child => child.dataset.studioNestedBlockId === id))) owner = owner.parentElement;
  return owner;
}
export function blockSiblingAxis(owner: HTMLElement): "x" | "y" {
  const style = owner.ownerDocument.defaultView!.getComputedStyle(owner);
  return style.display.includes("flex") && !style.flexDirection.startsWith("column") || style.display.includes("grid") && style.gridTemplateColumns.split(" ").length > 1 ? "x" : "y";
}
function lineInCanvas(canvas: HTMLElement, owner: HTMLElement, children: HTMLElement[], index: number, axis: "x" | "y"): DropLine {
  const box = canvas.getBoundingClientRect();
  const scale = dropContainerScale(canvas);
  const line = insertionGapLine(children.map(child => child.getBoundingClientRect()), index, owner.getBoundingClientRect(), scale, axis, 2, placementEdgeGaps(owner, axis));
  return dropLineInContainer(line, owner.getBoundingClientRect(), box, scale, { scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop, borderLeft: canvas.clientLeft, borderTop: canvas.clientTop });
}
export function rootBlockDropPosition(canvas: HTMLElement, x: number, y: number): { index: number; line: DropLine } | null {
  if (!placementContainsPoint(canvas, x, y)) return null;
  const children = Array.from(canvas.querySelectorAll<HTMLElement>(":scope > .block-position > .canvas-block"));
  const index = insertionGapIndex(children.map(child => child.getBoundingClientRect()), x, y);
  return { index, line: lineInCanvas(canvas, canvas, children, index, "y") };
}
/** Nested moves use their actual sibling container, including horizontal rows. */
export function nestedBlockDropPosition(canvas: HTMLElement, sourceId: string, x: number, y: number, siblingIds?: string[]): { targetId: string; after: boolean; line: DropLine } | null {
  const owner = blockSiblingOwner(canvas, sourceId, siblingIds);

  if (!owner || !placementContainsPoint(owner, x, y)) return null;
  const frames = Array.from(owner.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]"));
  const children = siblingIds ? siblingIds.map(id => frames.find(child => child.dataset.studioNestedBlockId === id)!).filter(Boolean) : Array.from(owner.querySelectorAll<HTMLElement>(":scope > [data-studio-nested-block-id]"));
  if (!children.length) return null;
  const axis = blockSiblingAxis(owner);
  const index = insertionGapIndex(children.map(child => child.getBoundingClientRect()), x, y, axis);
  return { targetId: children[Math.min(index, children.length - 1)].dataset.studioNestedBlockId!, after: index === children.length, line: lineInCanvas(canvas, owner, children, index, axis) };
}
