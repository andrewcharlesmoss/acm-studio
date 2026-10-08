import { useLayoutEffect, type RefObject } from "react";
import { blockInsertionGap } from "./block-insertion-gap";

export function useBlockInsertionGaps(canvasRef: RefObject<HTMLDivElement | null>) {
  // Reconnect after rendering so inserted/reordered blocks and selection spacing are current.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const positions = [...canvas.querySelectorAll<HTMLElement>(".block-position")];
    const update = () => {
      for (const position of positions) {
        const previous = position.previousElementSibling;
        const previousBlock = previous?.matches(".block-position") ? previous.querySelector<HTMLElement>(":scope > .canvas-block") : null;
        const block = position.querySelector<HTMLElement>(":scope > .canvas-block");
        const button = position.querySelector<HTMLButtonElement>(":scope > .between-blocks");
        if (!previousBlock || !block || !button) continue;
        const rect = position.getBoundingClientRect();
        const scale = position.offsetWidth ? rect.width / position.offsetWidth : 1;
        if (scale <= 0) continue;
        const gap = blockInsertionGap(previousBlock.getBoundingClientRect().bottom, block.getBoundingClientRect().top, rect.top, scale);
        button.dataset.measuredGap = "true";
        button.style.top = `${gap.top}px`;
        button.style.height = `${gap.height}px`;
        button.style.pointerEvents = gap.height > 0 ? "auto" : "none";
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    for (const position of positions) {
      observer.observe(position);
      const block = position.querySelector<HTMLElement>(":scope > .canvas-block");
      if (block) observer.observe(block);
    }
    // Sticky blocks can move without resizing, including inside nested scrollers.
    canvas.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      canvas.removeEventListener("scroll", update, true);
    };
  });
}
