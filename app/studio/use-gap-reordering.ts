"use client";
import { movedLibraryIds, type LibraryMove } from "./library-reordering";
import { insertionGapIndex, insertionGapLine, dropLineInContainer, dropContainerScale, type DropAxis } from "./drop-gap-geometry";
import { useDragPlacement } from "./use-drag-placement";
/** Domain adapter: owned sibling rows inherit the canonical placement controller. */
export function useGapReordering({ ids, version, writable, axis = "y", accepts, onMove }: { ids: string[]; version: string; writable: boolean; axis?: DropAxis; accepts: (move: LibraryMove) => boolean; onMove: (move: LibraryMove) => boolean }) {
  const drag = useDragPlacement<string, LibraryMove>({ version: JSON.stringify([version, axis, ids]), writable,
    canStart: id => ids.length > 1 && ids.includes(id),
    resolve(id, container, x, y) {
      const bounds = container.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
      const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-gap-row]")).filter(row => row.dataset.gapOwner === drag.owner);
      if (rows.length !== ids.length || rows.some((row, index) => row.dataset.gapRow !== ids[index])) return null;
      const boxes = rows.map(row => row.getBoundingClientRect());
      const index = insertionGapIndex(boxes, x, y, axis);
      const target: LibraryMove = { id, baseline: [...ids], targetId: ids[Math.min(index, ids.length - 1)], edge: index === ids.length ? "after" : "before" };
      if (!movedLibraryIds(ids, target) || !accepts(target)) return null;
      const scale = dropContainerScale(container);
      const line = dropLineInContainer(insertionGapLine(boxes, index, bounds, scale, axis), bounds, bounds, scale, { scrollLeft: container.scrollLeft, scrollTop: container.scrollTop, borderLeft: container.clientLeft, borderTop: container.clientTop });
      return { target, line };
    },
    commit: (_id, move) => onMove(move),
  });
  return { ...drag, rowProps: (id: string) => ({ "data-gap-row": id, "data-gap-owner": drag.owner }), listProps: { ...drag.listProps, "data-gap-container": drag.owner } };
}
