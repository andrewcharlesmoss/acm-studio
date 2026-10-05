"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { watchAnchoredMenu } from "./anchored-menu-position.mjs";
import { useOverlayDismiss } from "./use-overlay-dismiss";

type Position = { left: number; top: number; maxWidth: number; maxHeight: number };
const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Non-modal forms retain native Tab navigation; menus own their arrow-key rules. */
export function StudioAnchoredPopover({ anchor, anchorRect, label, focusOnMount = false, focusRevision = 0, onFocusPlaced, ignoreOutside, onClose, children, className = "" }: {
  anchor: () => HTMLElement | null;
  anchorRect?: () => DOMRect | null;
  label: string;
  focusOnMount?: boolean;
  focusRevision?: number;
  onFocusPlaced?: () => void;
  ignoreOutside?: (target: Node) => boolean;
  onClose: (restoreFocus: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const mounted = useSyncExternalStore(subscribeToClient, clientSnapshot, serverSnapshot);
  const popupRef = useRef<HTMLDivElement>(null);
  const anchorGetter = useRef(anchor);
  const rectGetter = useRef(anchorRect);
  useLayoutEffect(() => { anchorGetter.current = anchor; rectGetter.current = anchorRect; });
  const [position, setPosition] = useState<Position>({ left: 8, top: 8, maxWidth: 1, maxHeight: 1 });
  useLayoutEffect(() => {
    const popup = popupRef.current;
    const owner = anchorGetter.current();
    if (!popup || !owner) return;
    return watchAnchoredMenu(owner, popup, "start", (next: Position) => {
      setPosition(current => Object.keys(next).every(key => current[key as keyof Position] === next[key as keyof Position]) ? current : next);
    }, () => rectGetter.current?.());
  }, [mounted]);
  useLayoutEffect(() => {
    if (!focusOnMount) return;
    const popup = popupRef.current;
    const first = popup?.querySelector<HTMLElement>("input:not(:disabled)") ?? popup?.querySelector<HTMLElement>("a[href]") ?? popup?.querySelector<HTMLElement>("button:not(:disabled), [tabindex='0']");
    first?.focus();
    if (first) onFocusPlaced?.();
  }, [mounted, focusOnMount, focusRevision, label, onFocusPlaced]);
  useOverlayDismiss({ open: mounted, onEscape: () => onClose(true), onOutside: target => {
    if (!popupRef.current?.contains(target) && !anchor()?.contains(target) && !ignoreOutside?.(target)) onClose(false);
  } });
  if (!mounted) return null;
  return createPortal(<div ref={popupRef} className={`studio-anchored-popover ${className}`} role="dialog" aria-label={label} style={position} onPointerDown={event => event.stopPropagation()} onBlurCapture={event => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next) && !anchor()?.contains(next) && !ignoreOutside?.(next)) onClose(false);
  }}>{children}</div>, document.body);
}
