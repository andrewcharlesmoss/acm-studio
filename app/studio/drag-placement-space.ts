import type { DropAxis } from "./drop-gap-geometry";

/** CSS pixels reserved at either end of every authoring insertion sequence. */
export const OUTER_INSERTION_GAP = 24;
export type PlacementSpace = { element: HTMLElement; axis: DropAxis };

/** Preserve authored padding; remove only declarations still owned by this reservation. */
export function reservePlacementSpace(spaces: PlacementSpace[]): () => void {
  const restores: (() => void)[] = [];
  const seen = new Set<HTMLElement>();
  for (const { element, axis } of spaces) {
    if (seen.has(element)) continue;
    seen.add(element);
    const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!computed) continue;
    const properties = axis === "x" ? ["padding-left", "padding-right"] : ["padding-top", "padding-bottom"];
    for (const property of properties) {
      const original = element.style.getPropertyValue(property);
      const priority = element.style.getPropertyPriority(property);
      const applied = `${(Number.parseFloat(computed.getPropertyValue(property)) || 0) + OUTER_INSERTION_GAP}px`;
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
  const targets = [...new Set(spaces.flatMap(({ element }) => [element, ...(element.parentElement ? [element.parentElement] : [])]))];
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
