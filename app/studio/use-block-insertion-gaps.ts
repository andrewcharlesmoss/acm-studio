import { useLayoutEffect, type RefObject } from "react";
import { blockInsertionGap } from "./block-insertion-gap";

export function useBlockInsertionGaps(canvasRef: RefObject<HTMLDivElement | null>) {
  // Reconnect after rendering so inserted/reordered blocks and selection spacing are current.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const positions = [...canvas.querySelectorAll<HTMLElement>(".block-position, [data-studio-insertion-position]")];
    const update = () => {
      for (const position of positions) {
        const block = position.matches("[data-studio-insertion-position]") ? position : position.querySelector<HTMLElement>(":scope > .canvas-block");
        const button = position.querySelector<HTMLButtonElement>(":scope > .between-blocks");
        if (!block || !button) continue;
        // Invisible template fields have no visual boundary. Keep their records
        // in List View, but use one insertion target before the next visible block.
        button.hidden = block.getBoundingClientRect().height === 0;
        if (button.hidden) continue;
        let previous = position.previousElementSibling;
        let previousBlock: HTMLElement | null = null;
        while (previous?.matches(".block-position, [data-studio-insertion-position]")) {
          previousBlock = previous.matches("[data-studio-insertion-position]") ? previous as HTMLElement : previous.querySelector<HTMLElement>(":scope > .canvas-block");
          if (previousBlock && previousBlock.getBoundingClientRect().height > 0) break;
          previous = previous.previousElementSibling;
          previousBlock = null;
        }
        if (!previousBlock) {
          delete button.dataset.measuredGap;
          button.style.removeProperty("top");
          button.style.removeProperty("height");
          button.style.removeProperty("pointer-events");
          continue;
        }
        const rect = position.getBoundingClientRect();
        const scale = position.offsetWidth ? rect.width / position.offsetWidth : 1;
        if (scale <= 0) continue;
        const gap = blockInsertionGap(previousBlock.getBoundingClientRect().bottom, block.getBoundingClientRect().top, rect.top, scale, position.matches("[data-studio-insertion-position]") ? 6 : 0);
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
      const block = position.matches("[data-studio-insertion-position]") ? position : position.querySelector<HTMLElement>(":scope > .canvas-block");
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
