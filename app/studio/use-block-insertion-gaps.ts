import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { blockInsertionGap, nearestInsertionBoundary } from "./block-insertion-gap";

export type CanvasInsertionCue = { anchor: HTMLButtonElement; left: number; top: number; width: number };

export function useBlockInsertionGaps(canvasRef: RefObject<HTMLDivElement | null>) {
  const [cue, setCue] = useState<CanvasInsertionCue | null>(null);
  const pointer = useRef<{ x: number; y: number; button?: HTMLButtonElement } | null>(null);
  // Reconnect after rendering so inserted/reordered blocks and selection spacing are current.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const positions = [...canvas.querySelectorAll<HTMLElement>(".block-position, [data-studio-insertion-position]")];
    const buttons = [...canvas.querySelectorAll<HTMLButtonElement>(".between-blocks")];
    const surface = canvas.querySelector<HTMLElement>(".block-canvas");
    const activate = () => {
      const viewport = canvas.getBoundingClientRect();
      const available = buttons.filter(button => {
        const rect = button.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        return !button.hidden && !button.disabled && rect.width > 0 && rect.right > viewport.left && rect.left < viewport.right && middle - 12 >= viewport.top && middle + 12 <= viewport.bottom;
      });
      const opened = available.find(button => button.getAttribute("aria-expanded") === "true");
      const focused = available.find(button => button === canvas.ownerDocument.activeElement);
      const boundaries = available.map(button => {
        const rect = button.getBoundingClientRect();
        let depth = 0;
        for (let owner = button.parentElement; owner && owner !== canvas; owner = owner.parentElement) depth++;
        return { button, left: rect.left, right: rect.right, y: rect.top + rect.height / 2, depth };
      });
      const held = available.find(button => button === pointer.current?.button);
      const icon = held?.querySelector<HTMLElement>(":scope > span")?.getBoundingClientRect();
      const heldIsCurrent = pointer.current && icon && pointer.current.x >= icon.left && pointer.current.x <= icon.right && pointer.current.y >= icon.top && pointer.current.y <= icon.bottom;
      const active = opened ?? (pointer.current ? (heldIsCurrent ? held : undefined) ?? nearestInsertionBoundary(boundaries, pointer.current.x, pointer.current.y)?.button : focused);
      for (const button of buttons) {
        if (button === active) button.dataset.activeInsertion = "true";
        else delete button.dataset.activeInsertion;
      }
      const rect = active?.getBoundingClientRect();
      const next = active && rect ? { anchor: active, left: Math.max(rect.left, viewport.left), top: rect.top + rect.height / 2 - 12, width: Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left) } : null;
      setCue(current => current?.anchor === next?.anchor && current?.left === next?.left && current?.top === next?.top && current?.width === next?.width ? current : next);
      if (active) surface?.setAttribute("data-studio-insertion-active", "true");
      else surface?.removeAttribute("data-studio-insertion-active");
    };
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
        button.style.removeProperty("pointer-events");
      }
      activate();
    };
    const move = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const proxy = target && typeof target.closest === "function" ? target.closest<HTMLElement>("[data-studio-insertion-proxy-for]") : null;
      const held = proxy ? buttons.find(button => button.id === proxy.dataset.studioInsertionProxyFor) : target && typeof target.closest === "function" ? target.closest<HTMLButtonElement>(".between-blocks[data-active-insertion]") ?? undefined : undefined;
      pointer.current = { x: event.clientX, y: event.clientY, button: held };
      activate();
    };
    const leave = (event?: PointerEvent) => {
      const target = event?.relatedTarget as Element | null;
      const proxy = target && typeof target.closest === "function" ? target.closest<HTMLElement>("[data-studio-insertion-proxy-for]") : null;
      if (proxy && buttons.some(button => button.id === proxy.dataset.studioInsertionProxyFor)) return;
      pointer.current = null; activate();
    };
    const focus = () => { pointer.current = null; activate(); };
    canvas.ownerDocument.addEventListener("pointermove", move, { passive: true });
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("focusin", focus);
    canvas.addEventListener("focusout", activate);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    for (const position of positions) {
      observer.observe(position);
      const block = position.matches("[data-studio-insertion-position]") ? position : position.querySelector<HTMLElement>(":scope > .canvas-block");
      if (block) observer.observe(block);
    }
    // Sticky blocks can move without resizing, including inside nested scrollers.
    canvas.ownerDocument.addEventListener("scroll", update, { capture: true, passive: true });
    canvas.ownerDocument.defaultView?.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      canvas.ownerDocument.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("focusin", focus);
      canvas.removeEventListener("focusout", activate);
      surface?.removeAttribute("data-studio-insertion-active");
      canvas.ownerDocument.removeEventListener("scroll", update, true);
      canvas.ownerDocument.defaultView?.removeEventListener("resize", update);
    };
  });
  return cue;
}
