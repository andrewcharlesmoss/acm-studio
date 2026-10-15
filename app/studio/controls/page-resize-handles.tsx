import type { KeyboardEvent, PointerEvent } from "react";
import { CanvasHandle } from "./canvas-handle";
import { resizeCursor, type ResizeHandle } from "../design-transform";

const pageResizeHandles: Array<{ handle: ResizeHandle; label: string }> = [
    { handle: "nw", label: "Resize page from top left" },
    { handle: "n", label: "Resize page from top middle" },
    { handle: "ne", label: "Resize page from top right" },
    { handle: "e", label: "Resize page from right middle" },
    { handle: "se", label: "Resize page from bottom right" },
    { handle: "s", label: "Resize page from bottom middle" },
    { handle: "sw", label: "Resize page from bottom left" },
    { handle: "w", label: "Resize page from left middle" },
  ];

export function PageResizeHandles({ page, controlScale, activeHandle, disabled = false, onPointerDown, onKeyDown }: {
  page: { width: number; height: number };
  controlScale: number;
  activeHandle?: ResizeHandle | null;
  disabled?: boolean;
  onPointerDown?: (event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) => void;
  onKeyDown?: (event: KeyboardEvent<SVGCircleElement>, handle: ResizeHandle) => void;
}) {
  return pageResizeHandles.map(({ handle, label }) => activeHandle && activeHandle !== handle ? null : <CanvasHandle key={`page-${handle}`} aria-label={label} cursor={resizeCursor(handle, 0)} cx={handle.includes("e") ? page.width : handle.includes("w") ? 0 : page.width / 2} cy={handle.includes("s") ? page.height : handle.includes("n") ? 0 : page.height / 2} controlScale={controlScale} disabled={disabled} onPointerDown={event => onPointerDown?.(event, handle)} onKeyDown={event => onKeyDown?.(event, handle)} />);
}
