import { inspectorPopoverGeometry } from "./inspector-popover-geometry.mjs";

export type InspectorPopoverPosition = { left: number; top: number; width: number; maxHeight: number };

/** Owning panes declare their boundary; portal children retain the original anchor. */
export function inspectorPopoverOwner(anchor: Element) {
  return anchor.closest<HTMLElement>("[data-inspector-popover-owner]") ?? anchor.closest<HTMLElement>(".studio-inspector");
}

export function watchInspectorPopover(anchor: HTMLElement | null, popup: HTMLElement | null, preferredWidth: number, onPosition: (position: InspectorPopoverPosition) => void, options: { ownerAnchor?: HTMLElement | null; leftBoundary?: HTMLElement | null; below?: boolean; topOffset?: number } = {}) {
  if (!anchor || !popup) return () => {};
  const owner = inspectorPopoverOwner(options.ownerAnchor ?? anchor);
  function reposition() {
    const bounds = anchor!.getBoundingClientRect();
    onPosition(inspectorPopoverGeometry({
      ownerLeft: owner?.getBoundingClientRect().left ?? bounds.left,
      boundaryLeft: options.leftBoundary?.getBoundingClientRect().left,
      anchorTop: (options.below ? bounds.bottom + 8 : bounds.top) + (options.topOffset ?? 0),
      popupHeight: popup!.getBoundingClientRect().height,
      preferredWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  }
  reposition();
  const observer = new ResizeObserver(reposition);
  new Set([anchor, popup, owner, options.leftBoundary]).forEach(element => { if (element) observer.observe(element); });
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
  };
}
