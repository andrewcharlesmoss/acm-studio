import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import "./design-page-frame.css";
import type { ResizeHandle } from "./design-transform";

type PageSize = { width: number; height: number };
export type PageResizeFrame = PageSize & { handle: ResizeHandle };
export type PageResizePlacement = { basis: PageSize; x: number; y: number };
type FrameOptions = {
  placement?: PageResizePlacement | null;
  fit?: PageSize & { margin: number };
};

/** Keep the layout origin through a drag and its commit. */
export function pageResizeLayout(page: PageSize, zoom: number, resize?: PageResizeFrame | null, { placement, fit }: FrameOptions = {}) {
  const scale = zoom / 100;
  const original = placement?.basis ?? resize ?? page;
  const x = resize ? (resize.width - page.width) * (resize.handle.includes("w") ? 1 : resize.handle.includes("e") ? 0 : .5) : 0;
  const y = resize ? (resize.height - page.height) * (resize.handle.includes("n") ? 1 : resize.handle.includes("s") ? 0 : .5) : 0;
  const footprint = { width: original.width * scale, height: original.height * scale };
  const frame = {
    width: page.width * scale,
    height: page.height * scale,
    left: (x + (placement?.x ?? 0)) * scale,
    top: (y + (placement?.y ?? 0)) * scale,
  };
  if (fit && fit.width > 0 && fit.height > 0 && scale > 0) {
    const margin = Math.min(fit.margin, Math.min(fit.width, fit.height) / 4);
    const width = fit.width - 2 * margin;
    const height = fit.height - 2 * margin;
    const fitScale = Math.min(1, width / frame.width, height / frame.height);
    const left = (footprint.width - width) / 2;
    const top = (footprint.height - height) / 2;
    frame.width *= fitScale;
    frame.height *= fitScale;
    frame.left = Math.max(left, Math.min(frame.left, left + width - frame.width));
    frame.top = Math.max(top, Math.min(frame.top, top + height - frame.height));
  }
  return { footprint, frame };
}

export function commitPageResizePlacement(page: PageSize, resize: PageResizeFrame, placement?: PageResizePlacement | null): PageResizePlacement {
  const { frame } = pageResizeLayout(page, 100, resize, { placement });
  return {
    basis: placement?.basis ?? { width: resize.width, height: resize.height },
    x: frame.left,
    y: frame.top,
  };
}

/** Compensate for newly reserved scroll space on the leading edges. */
export function usePageResizeScroll(scrollRef: RefObject<HTMLDivElement | null>, frameKey: string,
  resizing: boolean, placement?: PageResizePlacement | null) {
  const previous = useRef<{
    key: string; x: number; y: number; scrollLeft: number; scrollTop: number;
    remainderX: number; remainderY: number;
    resizing: boolean; placement?: PageResizePlacement | null;
  }>(null);
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const footprint = scroll?.querySelector<HTMLElement>(
      ".design-all-page.is-active .design-page-footprint, :scope > .design-page-footprint");
    if (!scroll || !footprint) {
      previous.current = null;
      return;
    }
    const viewport = scroll.getBoundingClientRect();
    const bounds = footprint.getBoundingClientRect();
    const x = bounds.left - viewport.left + scroll.scrollLeft + Number(footprint.dataset.resizeOriginX);
    const y = bounds.top - viewport.top + scroll.scrollTop + Number(footprint.dataset.resizeOriginY);
    const prior = previous.current;
    let remainderX = 0;
    let remainderY = 0;
    if (prior?.key === frameKey && (prior.resizing || prior.placement !== placement)) {
      // The browser can clamp scroll offsets as soon as the content shrinks.
      // Account for that movement before applying the change of layout origin.
      const maxLeft = scroll.scrollWidth - scroll.clientWidth;
      const maxTop = scroll.scrollHeight - scroll.clientHeight;
      const previousLeft = scroll.scrollLeft === maxLeft ? Math.max(maxLeft, prior.scrollLeft) : scroll.scrollLeft;
      const previousTop = scroll.scrollTop === maxTop ? Math.max(maxTop, prior.scrollTop) : scroll.scrollTop;
      const left = previousLeft + x - prior.x + prior.remainderX;
      const top = previousTop + y - prior.y + prior.remainderY;
      scroll.scrollLeft = left;
      scroll.scrollTop = top;
      // Preserve scroll rounding across pointer moves. Drop any remainder
      // caused by reaching a scroll boundary.
      remainderX = Math.abs(left - scroll.scrollLeft) < 1 ? left - scroll.scrollLeft : 0;
      remainderY = Math.abs(top - scroll.scrollTop) < 1 ? top - scroll.scrollTop : 0;
    }
    previous.current = { key: frameKey, x, y, resizing, placement, remainderX, remainderY,
      scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop };
  });
}

export function DesignPageFrame({ page, zoom, resize, placement, stacked, children }: {
  page: PageSize; zoom: number; resize?: PageResizeFrame | null; placement?: PageResizePlacement | null;
  stacked?: boolean; children: ReactNode;
}) {
  const { footprint, frame } = pageResizeLayout(page, zoom, resize, { placement });
  // A centred scrollable surface grows equally in both directions. Stacked
  // pages instead reserve vertical space next to their own frame.
  const horizontalInset = Math.max(0, -frame.left, frame.left + frame.width - footprint.width);
  const topOverflow = Math.max(0, -frame.top);
  const bottomOverflow = Math.max(0, frame.top + frame.height - footprint.height);
  const topInset = stacked ? topOverflow : Math.max(topOverflow, bottomOverflow);
  return <div className="design-page-footprint" data-resize-origin-x={horizontalInset} data-resize-origin-y={topInset} style={{
    width: footprint.width + 2 * horizontalInset,
    height: footprint.height + topInset + (stacked ? bottomOverflow : topInset),
  }}>
    <div className="design-canvas-frame" style={{ ...frame, left: frame.left + horizontalInset, top: frame.top + topInset }}>{children}</div>
  </div>;
}
