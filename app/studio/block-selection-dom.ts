/** Resolve the deepest rendered block at a pointer's vertical position.
 * The canvas gutter belongs to that row, so moving left out of editable text
 * can still extend a block range. Callers validate the returned content owner.
 */
export function blockSelectionPointerTarget(canvas: HTMLElement | null, x: number, y: number): { id: string; element: HTMLElement } | null {
  if (!canvas?.isConnected) return null;
  const canvasBounds = canvas.getBoundingClientRect();
  if (x < canvasBounds.left || x > canvasBounds.right || y < canvasBounds.top || y > canvasBounds.bottom) return null;
  let target: { id: string; element: HTMLElement } | null = null;
  for (const element of canvas.querySelectorAll<HTMLElement>("[data-studio-block-anchor-id], [data-studio-nested-block-id]")) {
    const id = element.dataset.studioNestedBlockId ?? element.dataset.studioBlockAnchorId;
    const bounds = element.getBoundingClientRect();
    if (!id || !element.isConnected || bounds.width <= 0 || bounds.height <= 0 || y < bounds.top || y > bounds.bottom || x > bounds.right) continue;
    if (!target || target.element.contains(element)) target = { id, element };
  }
  return target;
}

/** A block can have several compatibility hosts (for example a Table figure
 * inside its canvas frame). Paint its first, outer host exactly once.
 */
export function markBlockSelectionHosts(canvas: HTMLElement, rootIds: string[]): void {
  const selected = new Set(rootIds);
  const marked = new Set<string>();
  for (const element of canvas.querySelectorAll<HTMLElement>("[data-studio-block-anchor-id], [data-studio-nested-block-id]")) {
    const id = element.dataset.studioNestedBlockId ?? element.dataset.studioBlockAnchorId;
    const active = Boolean(id && selected.has(id) && !marked.has(id));
    element.dataset.studioMultiSelected = String(active);
    if (id && active) marked.add(id);
  }
}
