"use client";

import { useLayoutEffect, useRef, useState, type RefObject, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { watchAnchoredMenu } from "./anchored-menu-position.mjs";
import { focusStudioMenu, navigateStudioMenu } from "./menu";
import { useOverlayDismiss } from "./use-overlay-dismiss";
import { inspectorPopoverOwner, watchInspectorPopover } from "../panes/inspector-popover-position";
import { useInterfaceStylePortalStyle } from "../ui/styles/interface-style-scope";

type Props = Omit<ComponentPropsWithoutRef<"div">, "style"> & {
  anchor: () => HTMLElement | null;
  presentation?: "default" | "custom";
  align?: "start" | "end";
  point?: { x: number; y: number };
  placement?: "below" | "submenu";
  menuRef?: RefObject<HTMLDivElement | null>;
  focusOnMount?: boolean;
  initialFocus?: (menu: HTMLElement) => HTMLElement | null;
  onEscape?: () => void;
  inspectorPlacement?: boolean;
  onClose: (restoreFocus?: boolean) => void;
  onOutside?: (target: Node) => void;
};
type Position = { left: number; top: number; maxWidth?: number; width?: number; maxHeight: number };

/** Commands and selection remain with the consumer; this owns menu geometry. */
export function StudioAnchoredMenu({ anchor, align = "start", presentation = "default", inspectorPlacement = false, onClose, onOutside, point, placement = "below", menuRef: externalRef, focusOnMount = true, initialFocus, onEscape, className, onKeyDown, children, ...props }: Props) {
  const localRef = useRef<HTMLDivElement>(null);
  const menuRef = externalRef ?? localRef;
  const focusGetter = useRef(initialFocus);
  useLayoutEffect(() => { focusGetter.current = initialFocus; });
  const anchorGetter = useRef(anchor);
  useLayoutEffect(() => { anchorGetter.current = anchor; });
  const pointX = point?.x, pointY = point?.y;
  const interfaceStyle = useInterfaceStylePortalStyle();
  const [position, setPosition] = useState<Position>({ left: 8, top: 8, maxWidth: 1, maxHeight: 1 });
  useOverlayDismiss({ open: true, onEscape: () => (onEscape ?? onClose)(), onOutside: target => {
    if (menuRef.current?.contains(target) || anchor()?.contains(target)) return;
    if (onOutside) onOutside(target);
    else onClose(false);
  } });
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = anchorGetter.current();
    if (!trigger || !menu) return;
    const stop = inspectorPlacement && inspectorPopoverOwner(trigger) ? watchInspectorPopover(trigger, menu, 240, next => setPosition(next)) : watchAnchoredMenu(trigger, menu, align, (next: Position) => {
      setPosition(current => Object.keys(next).every(key => current[key as keyof typeof current] === next[key as keyof typeof next]) ? current : next);
    }, undefined, { point: pointX !== undefined && pointY !== undefined ? { x: pointX, y: pointY } : undefined, placement });
    if (focusOnMount) { const target = focusGetter.current?.(menu); if (target) target.focus(); else focusStudioMenu(menu); }
    return stop;
  }, [align, inspectorPlacement, pointX, pointY, placement, focusOnMount, menuRef]);

  return createPortal(<div {...props} ref={menuRef} data-menu-presentation={presentation} className={`studio-anchored-menu ${className ?? ""}`} role="menu" tabIndex={-1} style={{ ...interfaceStyle, ...position } as CSSProperties} onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Tab") {
      // Native Tab advances from the opener, not from a portal at the page end.
      anchor()?.focus();
      onClose(false);
      event.stopPropagation();
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable=true]")) return;
    navigateStudioMenu(event, onClose);
  }}>{children}</div>, document.body);
}
