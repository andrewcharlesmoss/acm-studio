import { placementEdgeGaps } from "./drag-placement-space";
import { insertionGapIndex, insertionGapLine, dropLineInContainer, dropContainerScale } from "./drop-gap-geometry";
import type { BlockInsertionTarget } from "./block-placement";

/** Immediate children of the deepest Column define the visible drop boundary. */
export function columnDropPosition(canvas: HTMLElement, element: Element | null, x: number, y: number): { target: BlockInsertionTarget; left: number; top: number; width: number; height: number } | null {
  const column = element?.closest<HTMLElement>("[data-studio-column-drop-id]");
  if (!column || !canvas.contains(column)) return null;
  const bounds = column.getBoundingClientRect();
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
  const children = Array.from(column.querySelectorAll<HTMLElement>(":scope > [data-studio-nested-block-id]"));
  const insertion = insertionGapIndex(children.map(child => child.getBoundingClientRect()), x, y);
  const canvasBounds = canvas.getBoundingClientRect();
  // Canvas zoom is a transform; CSS positions must use the unscaled coordinates.
  const scale = dropContainerScale(canvas);
  const line = insertionGapLine(children.map(child => child.getBoundingClientRect()), insertion, bounds, scale, "y", 2, placementEdgeGaps(column));
  return { target: { parentId: column.dataset.studioColumnDropId!, index: insertion }, ...dropLineInContainer(line, bounds, canvasBounds, scale, { scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop, borderLeft: canvas.clientLeft, borderTop: canvas.clientTop }) };
}
