import { insertionGapIndex, insertionGapLine, dropLineInContainer, dropContainerScale, type DropLine } from "./drop-gap-geometry";

function inside(element: HTMLElement, x: number, y: number) {
  const box = element.getBoundingClientRect();
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}
function lineInCanvas(canvas: HTMLElement, owner: HTMLElement, children: HTMLElement[], index: number, axis: "x" | "y"): DropLine {
  const box = canvas.getBoundingClientRect();
  const scale = dropContainerScale(canvas);
  const line = insertionGapLine(children.map(child => child.getBoundingClientRect()), index, owner.getBoundingClientRect(), scale, axis);
  return dropLineInContainer(line, owner.getBoundingClientRect(), box, scale, { scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop, borderLeft: canvas.clientLeft, borderTop: canvas.clientTop });
}
export function rootBlockDropPosition(canvas: HTMLElement, x: number, y: number): { index: number; line: DropLine } | null {
  if (!inside(canvas, x, y)) return null;
  const children = Array.from(canvas.querySelectorAll<HTMLElement>(":scope > .block-position > .canvas-block"));
  const index = insertionGapIndex(children.map(child => child.getBoundingClientRect()), x, y);
  return { index, line: lineInCanvas(canvas, canvas, children, index, "y") };
}
/** Nested moves use their actual sibling container, including horizontal rows. */
export function nestedBlockDropPosition(canvas: HTMLElement, sourceId: string, x: number, y: number, siblingIds?: string[]): { targetId: string; after: boolean; line: DropLine } | null {
  const source = Array.from(canvas.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]")).find(child => child.dataset.studioNestedBlockId === sourceId);
  let owner = source?.parentElement;
  // Template projections may wrap each frame. Find the nearest common owner of
  // the model's actual siblings rather than treating a wrapper as a whole list.
  while (owner && siblingIds && !siblingIds.every(id => Array.from(owner!.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]")).some(child => child.dataset.studioNestedBlockId === id))) owner = owner.parentElement;

  if (!owner || !inside(owner, x, y)) return null;
  const frames = Array.from(owner.querySelectorAll<HTMLElement>("[data-studio-nested-block-id]"));
  const children = siblingIds ? siblingIds.map(id => frames.find(child => child.dataset.studioNestedBlockId === id)!).filter(Boolean) : Array.from(owner.querySelectorAll<HTMLElement>(":scope > [data-studio-nested-block-id]"));
  if (!children.length) return null;
  const style = owner.ownerDocument.defaultView!.getComputedStyle(owner);
  const axis = style.display.includes("flex") && !style.flexDirection.startsWith("column") || style.display.includes("grid") && style.gridTemplateColumns.split(" ").length > 1 ? "x" : "y";
  const index = insertionGapIndex(children.map(child => child.getBoundingClientRect()), x, y, axis);
  return { targetId: children[Math.min(index, children.length - 1)].dataset.studioNestedBlockId!, after: index === children.length, line: lineInCanvas(canvas, owner, children, index, axis) };
}
