"use client";
import { placementEdgeGaps } from "./drag-placement-space";
import { movedLibraryIds, type LibraryMove } from "./library-reordering";
import { cardGridInsertion, insertionGapIndex, insertionGapLine, dropLineInContainer, dropContainerScale, type ReorderLayout, type DropEdgeAlignment, type WrappedRowBoundaryCue } from "./drop-gap-geometry";
import { useDragPlacement } from "./use-drag-placement";
/** Domain adapter: owned sibling rows inherit the canonical placement controller. */
export function useGapReordering({ ids, version, writable, axis = "y", edgeAlignment = "boundary", wrappedRowBoundaryCue = "full-row", accepts, onMove }: { ids: string[]; version: string; writable: boolean; axis?: ReorderLayout; edgeAlignment?: DropEdgeAlignment; wrappedRowBoundaryCue?: WrappedRowBoundaryCue; accepts: (move: LibraryMove) => boolean; onMove: (move: LibraryMove) => boolean }) {
  const rowsFor = (container: HTMLElement): HTMLElement[] => Array.from(container.querySelectorAll<HTMLElement>("[data-gap-row]")).filter(row => row.dataset.gapOwner === drag.owner);
  const drag = useDragPlacement<string, LibraryMove>({ version: JSON.stringify([version, axis, edgeAlignment, wrappedRowBoundaryCue, ids]), writable,
    axis: axis === "card-grid" ? "x" : axis,
    rows: rowsFor,
    canStart: id => ids.length > 1 && ids.includes(id),
    resolve(id, container, x, y) {
      const bounds = container.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
      const rows = rowsFor(container);
      if (rows.length !== ids.length || rows.some((row, index) => row.dataset.gapRow !== ids[index])) return null;
      const boxes = rows.map(row => row.getBoundingClientRect());
      const scale = dropContainerScale(container);
      const placement = axis === "card-grid"
        ? cardGridInsertion(boxes, ids.indexOf(id), x, y, scale)
        : { index: insertionGapIndex(boxes, x, y, axis), axis };
      const { index, axis: dropAxis } = placement;
      const target: LibraryMove = { id, baseline: [...ids], targetId: ids[Math.min(index, ids.length - 1)], edge: index === ids.length ? "after" : "before" };
      if (!movedLibraryIds(ids, target) || !accepts(target)) return null;
      const line = dropLineInContainer(insertionGapLine(boxes, index, bounds, scale, dropAxis, 2, placementEdgeGaps(container, dropAxis), edgeAlignment, wrappedRowBoundaryCue, y), bounds, bounds, scale, { scrollLeft: container.scrollLeft, scrollTop: container.scrollTop, borderLeft: container.clientLeft, borderTop: container.clientTop });
      return { target, line };
    },
    commit: (_id, move) => onMove(move),
  });
  return { ...drag, rowProps: (id: string) => ({ "data-gap-row": id, "data-gap-owner": drag.owner }), listProps: { ...drag.listProps, "data-gap-container": drag.owner } };
}
