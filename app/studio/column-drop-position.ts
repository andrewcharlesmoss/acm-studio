import type { BlockInsertionTarget } from "./block-placement";

/** Immediate children of the deepest Column define the visible drop boundary. */
export function columnDropPosition(canvas: HTMLElement, element: Element | null, x: number, y: number): { target: BlockInsertionTarget; left: number; top: number; width: number; height: number } | null {
  const column = element?.closest<HTMLElement>("[data-studio-column-drop-id]");
  if (!column || !canvas.contains(column)) return null;
  const bounds = column.getBoundingClientRect();
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
  const children = Array.from(column.querySelectorAll<HTMLElement>(":scope > [data-studio-nested-block-id]"));
  const index = children.findIndex(child => { const box = child.getBoundingClientRect(); return y < box.top + box.height / 2; });
  const insertion = index < 0 ? children.length : index;
  const boundary = children[insertion]?.getBoundingClientRect().top ?? children.at(-1)?.getBoundingClientRect().bottom ?? bounds.top + bounds.height / 2;
  const canvasBounds = canvas.getBoundingClientRect();
  // Canvas zoom is a transform; CSS positions must use the unscaled coordinates.
  const scale = canvas.offsetWidth ? canvasBounds.width / canvas.offsetWidth : 1;
  return { target: { parentId: column.dataset.studioColumnDropId!, index: insertion }, left: (bounds.left - canvasBounds.left) / scale, top: (boundary - canvasBounds.top) / scale - (children.length ? 2 : 12), width: bounds.width / scale, height: children.length ? 4 : 24 };
}
