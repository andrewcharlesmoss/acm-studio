import type { DropLine } from "./drop-gap-geometry";
/** All ordered-drop feedback uses this renderer and the shared Studio treatment. */
export function DragPlacementIndicator({ line, as = "div" }: { line: DropLine | null; as?: "div" | "li" }) {
  if (!line) return null;
  return as === "li" ? <li className="studio-gap-line" aria-hidden="true" style={line} /> : <div className="studio-gap-line" aria-hidden="true" style={line} />;
}
