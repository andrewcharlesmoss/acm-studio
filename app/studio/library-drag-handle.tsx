import { StudioIcon } from "./studio-icons";

/** The owning row supplies pointer dragging and keyboard reordering. */
export function LibraryDragHandle({ enabled }: { enabled: boolean }) {
  return <span className="library-drag-handle" aria-hidden="true" data-reorder-enabled={enabled}
    title={enabled ? "Drag to reorder" : "Reordering unavailable"}>
    <StudioIcon name="drag-handle" size={18} />
  </span>;
}
