"use client";

import { useLayoutEffect, useRef } from "react";

type DismissOptions = {
  open: boolean;
  onEscape: () => void;
  onOutside: (target: Node) => void;
};

// Each document has its own overlay stack, including portalled nested editors.
const stacks = new WeakMap<Document, symbol[]>();

/** Dismiss only the most recently opened overlay; owners decide focus return. */
export function useOverlayDismiss(options: DismissOptions) {
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  useLayoutEffect(() => {
    if (!options.open) return;
    const stack = stacks.get(document) ?? [];
    stacks.set(document, stack);
    const token = Symbol("overlay");
    stack.push(token);
    const isTopmost = () => stack.at(-1) === token && !document.querySelector("dialog[open]");
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.defaultPrevented || !isTopmost()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      latest.current.onEscape();
    };
    const pointerdown = (event: PointerEvent) => {
      if (isTopmost() && event.target instanceof Node) latest.current.onOutside(event.target);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      stack.splice(stack.indexOf(token), 1);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [options.open]);
}
