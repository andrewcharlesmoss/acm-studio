"use client";

import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { createPortal } from "react-dom";
import { watchAnchoredMenu } from "./anchored-menu-position.mjs";
import { focusStudioMenu, navigateStudioMenu } from "./menu";
import { useOverlayDismiss } from "./use-overlay-dismiss";

type Props = Omit<ComponentPropsWithoutRef<"div">, "style"> & {
  anchor: () => HTMLElement | null;
  align?: "start" | "end";
  onClose: (restoreFocus?: boolean) => void;
  onOutside?: (target: Node) => void;
};
type Position = { left: number; top: number; maxWidth: number; maxHeight: number };

/** Commands and selection remain with the consumer; this owns menu geometry. */
export function StudioAnchoredMenu({ anchor, align = "start", onClose, onOutside, className, onKeyDown, children, ...props }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorGetter = useRef(anchor);
  useLayoutEffect(() => { anchorGetter.current = anchor; });
  const [position, setPosition] = useState({ left: 8, top: 8, maxWidth: 1, maxHeight: 1 });
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = anchorGetter.current();
    if (!trigger || !menu) return;
    const stop = watchAnchoredMenu(trigger, menu, align, (next: Position) => {
      setPosition(current => Object.keys(next).every(key => current[key as keyof typeof current] === next[key as keyof typeof next]) ? current : next);
    });
    focusStudioMenu(menu);
    return stop;
  }, [align]);
  useOverlayDismiss({ open: true, onEscape: onClose, onOutside: target => {
    if (menuRef.current?.contains(target) || anchor()?.contains(target)) return;
    if (onOutside) onOutside(target);
    else onClose(false);
  } });
  return createPortal(<div {...props} ref={menuRef} className={`studio-anchored-menu ${className ?? ""}`} role="menu" tabIndex={-1} style={position} onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Tab") {
      // Native Tab advances from the opener, not from a portal at the page end.
      anchor()?.focus();
      onClose(false);
      event.stopPropagation();
      return;
    }
    navigateStudioMenu(event, onClose);
  }}>{children}</div>, document.body);
}
