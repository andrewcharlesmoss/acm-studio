"use client";
import { useState, type DragEvent, type KeyboardEvent } from "react";
import { movedLibraryIds, type LibraryMove } from "./library-reordering";
import { useGapReordering } from "./use-gap-reordering";
/** Library metadata, keyboard shortcuts, and announcements adapt the shared controller. */
export function useLibraryReordering(ids: string[], writable: boolean, onMove: (move: LibraryMove) => boolean, listKey = "library") {
  const canReorder = writable && ids.length > 1;
  const [announcement, setAnnouncement] = useState({ listKey, message: "" });
  if (announcement.listKey !== listKey) setAnnouncement({ listKey, message: "" });
  function move(value: LibraryMove) {
    if (!movedLibraryIds(ids, value) || !onMove(value)) return false;
    setAnnouncement({ listKey, message: `Moved to position ${ids.filter(id => id !== value.id).indexOf(value.targetId) + (value.edge === "before" ? 1 : 2)} of ${ids.length}.` });
    return true;
  }
  const drag = useGapReordering({ ids, writable, version: JSON.stringify([listKey, ids]), accepts: () => true, onMove: move });
  function listEvent(event: DragEvent<HTMLElement>): DragEvent<HTMLElement> {
    const currentTarget = event.currentTarget.closest?.<HTMLElement>("[data-drag-placement-owner]") ?? event.currentTarget;
    return { currentTarget, clientX: event.clientX, clientY: event.clientY, relatedTarget: event.relatedTarget, dataTransfer: event.dataTransfer, preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() } as DragEvent<HTMLElement>;
  }
  function rowProps(id: string) {
    return {
      ...drag.rowProps(id), ...drag.handleProps(id), draggable: canReorder,
      "data-library-entry-id": id, "data-library-drop-row": true, "data-library-reorder-owner": drag.owner,
      "data-drop-edge": drag.placement?.targetId === id ? drag.placement.edge : undefined,
      style: undefined,
      "aria-description": canReorder ? "Drag to reorder, or press Alt and the Up or Down arrow." : undefined,
      onDragStart: (event: DragEvent<HTMLElement>) => drag.start(event, id), onDragEnd: drag.cancel,
      onDragOver: (event: DragEvent<HTMLElement>) => drag.listProps.onDragOver(listEvent(event)),
      onDrop: (event: DragEvent<HTMLElement>) => drag.listProps.onDrop(listEvent(event)),
      onDragLeave: (event: DragEvent<HTMLElement>) => drag.listProps.onDragLeave(listEvent(event)),
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Escape") { drag.cancel(); return; }
        if (!writable || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); const direction = event.key === "ArrowUp" ? -1 : 1; const targetId = ids[ids.indexOf(id) + direction];
        if (targetId) move({ id, targetId, edge: direction === -1 ? "before" : "after", baseline: [...ids] });
      },
    };
  }
  return { rowProps, canReorder, line: drag.line, listProps: drag.listProps, message: announcement.listKey === listKey ? announcement.message : "" };
}
