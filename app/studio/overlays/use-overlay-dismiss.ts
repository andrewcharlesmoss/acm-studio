"use client";

import { useLayoutEffect, useRef } from "react";

type DismissOptions = {
  open: boolean;
  onEscape: () => void;
  onOutside: (target: Node) => void;
  onFocusOutside?: (target: Node) => void;
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
    const focusin = (event: FocusEvent) => {
      const target = event.target;
      // A child portal registers its overlay during this same layout commit.
      // Recheck after registration before treating its initial focus as outside.
      if (target instanceof Node) queueMicrotask(() => {
        if (stack.includes(token) && isTopmost() && document.activeElement === target) latest.current.onFocusOutside?.(target);
      });
    };
    document.addEventListener("focusin", focusin);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      stack.splice(stack.indexOf(token), 1);
      document.removeEventListener("focusin", focusin);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [options.open]);
}
