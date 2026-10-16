import type { DropAxis } from "./drop-gap-geometry";
import { dropContainerScale } from "./drop-container-scale";

/** Fallback for a sequence without measurable or declared sibling spacing. */
export const OUTER_INSERTION_GAP = 24;
export type PlacementSpace = { element: HTMLElement; axis: DropAxis; rows?: HTMLElement[]; boundary?: HTMLElement };

export type PlacementEdgeGaps = { before: number; after: number };
const outsideSlots = new WeakMap<HTMLElement, PlacementEdgeGaps>();

/** Real end slots may occupy an existing surface gutter without insetting content. */
export function placementContainsPoint(element: HTMLElement, x: number, y: number): boolean {
  const box = element.getBoundingClientRect();
  const slots = outsideSlots.get(element);
  const scale = slots ? dropContainerScale(element) : 1;
  return x >= box.left - (slots?.before ?? 0) * scale && x <= box.right + (slots?.after ?? 0) * scale && y >= box.top && y <= box.bottom;
}

/** Read the same reserved CSS extents used by end-slot feedback. */
export function placementEdgeGaps(element: HTMLElement, axis: DropAxis = "y"): PlacementEdgeGaps {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const names = axis === "x" ? ["padding-left", "padding-right"] : ["padding-top", "padding-bottom"];
  const slots = axis === "x" ? outsideSlots.get(element) : undefined;
  return { before: (Number.parseFloat(style?.getPropertyValue(names[0]) ?? "") || 0) + (slots?.before ?? 0), after: (Number.parseFloat(style?.getPropertyValue(names[1]) ?? "") || 0) + (slots?.after ?? 0) };
}

function reserveSurfaceGutter(element: HTMLElement, boundary: HTMLElement, gaps: PlacementEdgeGaps, style: CSSStyleDeclaration): (() => void) | null {
  const box = element.getBoundingClientRect(), outer = boundary.getBoundingClientRect();
  const scale = dropContainerScale(element);
  const before = Math.max(0, gaps.before - (Number.parseFloat(style.getPropertyValue("padding-left")) || 0));
  const after = Math.max(0, gaps.after - (Number.parseFloat(style.getPropertyValue("padding-right")) || 0));
  // Borrow only a clear gutter at the surface edge, never a neighbouring block.
  if (box.left - outer.left < before * scale || outer.right - box.right < after * scale) return null;
  if (!before && !after) return null;
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const ancestorStyle = element.ownerDocument.defaultView?.getComputedStyle(ancestor);
    if (/^(hidden|clip|auto|scroll)$/.test(ancestorStyle?.overflowX ?? "")) {
      const clip = ancestor.getBoundingClientRect();
      if (box.left - before * scale < clip.left || box.right + after * scale > clip.right) return null;
    }
    if (ancestor === boundary) break;
  }
  const originalPosition = element.style.getPropertyValue("position");
  const originalPriority = element.style.getPropertyPriority("position");
  const positioned = style.position === "static";
  if (positioned) element.style.setProperty("position", "relative");
  const slots = [before, after].map((width, index) => {
    const slot = element.ownerDocument.createElement("span");
    slot.setAttribute("aria-hidden", "true");
    slot.setAttribute("data-studio-placement-slot", "");
    slot.style.cssText = `position:absolute;top:0;bottom:0;width:${width}px;${index === 0 ? "right:100%" : "left:100%"};margin:0;padding:0;border:0;pointer-events:auto;`;
    element.append(slot);
    return slot;
  });
  outsideSlots.set(element, { before, after });
  return () => {
    slots.forEach(slot => slot.remove()); outsideSlots.delete(element);
    if (positioned && element.style.getPropertyValue("position") === "relative") {
      if (originalPosition) element.style.setProperty("position", originalPosition, originalPriority);
      else element.style.removeProperty("position");
    }
  };
}
function siblingGaps(element: HTMLElement, axis: DropAxis, style?: CSSStyleDeclaration, logicalRows: HTMLElement[] = []): PlacementEdgeGaps {
  const rows = logicalRows.map(child => child.getBoundingClientRect()).filter(box => box.width > 0 && box.height > 0);
  const scale = rows.length ? dropContainerScale(element) : 1;
  const gaps = rows.slice(1).flatMap((row, index) => {
    const previous = rows[index];
    if (axis === "x" && (row.top >= previous.bottom || row.bottom <= previous.top)) return [];
    const gap = axis === "x" ? row.left - previous.right : row.top - previous.bottom;
    return gap >= 0 ? [gap / scale] : [];
  });
  const declared = Number.parseFloat(style?.getPropertyValue(axis === "x" ? "column-gap" : "row-gap") ?? "");
  const fallback = Number.isFinite(declared) ? declared : OUTER_INSERTION_GAP;
  const flexMainAxis = style?.flexDirection?.startsWith("column") ? "y" : "x";
  // Distributed flex space is spare room, not authored sibling spacing. Reserving it
  // at both ends can squeeze a Row into letter-wide children and feed resize loops.
  if (style?.display?.includes("flex") && axis === flexMainAxis && /\bspace-(between|around|evenly)\b/.test(style.justifyContent)) {
    return { before: Math.max(2, fallback), after: Math.max(2, fallback) };
  }
  return { before: Math.max(2, gaps[0] ?? fallback), after: Math.max(2, gaps.at(-1) ?? fallback) };
}

/** Preserve authored padding; remove only declarations still owned by this reservation. */
export function reservePlacementSpace(spaces: PlacementSpace[]): () => void {
  const restores: (() => void)[] = [];
  const seen = new Set<HTMLElement>();
  for (const { element, axis, rows, boundary } of spaces) {
    if (seen.has(element)) continue;
    seen.add(element);
    const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!computed) continue;
    const properties = axis === "x" ? ["padding-left", "padding-right"] : ["padding-top", "padding-bottom"];
    const gaps = siblingGaps(element, axis, computed, rows);
    const gutter = axis === "x" && boundary ? reserveSurfaceGutter(element, boundary, gaps, computed) : null;
    if (gutter) { restores.push(gutter); continue; }
    for (const [index, property] of properties.entries()) {
      const original = element.style.getPropertyValue(property);
      const priority = element.style.getPropertyPriority(property);
      const applied = `${Math.max(Number.parseFloat(computed.getPropertyValue(property)) || 0, index === 0 ? gaps.before : gaps.after)}px`;
      element.style.setProperty(property, applied, "important");
      restores.push(() => {
        // React may already have applied a newer authored declaration before cleanup.
        if (element.style.getPropertyValue(property) !== applied || element.style.getPropertyPriority(property) !== "important") return;
        if (original) element.style.setProperty(property, original, priority);
        else element.style.removeProperty(property);
      });
    }
  }
  return () => restores.reverse().forEach(restore => restore());
}

/** Keep stylesheet/% padding responsive without accumulating the authoring reserve. */
export function maintainPlacementSpace(spaces: PlacementSpace[]): () => void {
  let active = true;
  let restore = reservePlacementSpace(spaces);
  // Percentage padding depends on the containing block, including fixed-width owners.
  const targets = [...new Set(spaces.flatMap(({ element, boundary }) => [element, ...(element.parentElement ? [element.parentElement] : []), ...(boundary ? [boundary] : [])]))];
  const widths = new Map(targets.map(element => [element, element.getBoundingClientRect().width]));
  const view = spaces[0]?.element.ownerDocument.defaultView;
  function refresh() {
    if (!active) return;
    restore(); restore = reservePlacementSpace(spaces);
    targets.forEach(element => widths.set(element, element.getBoundingClientRect().width));
  }
  const observer = view && "ResizeObserver" in view ? new view.ResizeObserver(() => {
    if (targets.some(element => element.getBoundingClientRect().width !== widths.get(element))) refresh();
  }) : null;
  targets.forEach(element => observer?.observe(element));
  view?.addEventListener("resize", refresh);
  return () => { active = false; observer?.disconnect(); view?.removeEventListener("resize", refresh); restore(); };
}
