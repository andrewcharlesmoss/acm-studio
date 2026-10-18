"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { watchAnchoredMenu } from "./anchored-menu-position.mjs";
import { useOverlayDismiss } from "./use-overlay-dismiss";
import { inspectorPopoverOwner, watchInspectorPopover } from "../panes/inspector-popover-position";

type Position = { left: number; top: number; maxWidth?: number; width?: number; maxHeight: number };
const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Non-modal forms retain native Tab navigation; menus own their arrow-key rules. */
export function StudioAnchoredPopover({ anchor, anchorRect, label, inspectorPlacement = false, allowInspectorOverlap = false, focusOnMount = false, focusRevision = 0, onFocusPlaced, ignoreOutside, onClose, id, role = "dialog", contentRef, preferredWidth = 320, topOffset = 0, initialFocus, commitOnClose = false, children, className = "" }: {
  id?: string;
  role?: "dialog" | "group";
  contentRef?: RefObject<HTMLDivElement | null>;
  preferredWidth?: number;
  topOffset?: number;
  initialFocus?: (popup: HTMLElement) => HTMLElement | null;
  commitOnClose?: boolean;
  anchor: () => HTMLElement | null;
  anchorRect?: () => DOMRect | null;
  inspectorPlacement?: boolean;
  allowInspectorOverlap?: boolean;
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
  const localRef = useRef<HTMLDivElement>(null);
  const popupRef = contentRef ?? localRef;
  function close(restoreFocus: boolean) {
    const active = document.activeElement;
    if (commitOnClose && active instanceof HTMLElement && popupRef.current?.contains(active)) active.blur();
    onClose(restoreFocus);
  }
  const focusGetter = useRef(initialFocus);
  useLayoutEffect(() => { focusGetter.current = initialFocus; });
  const anchorGetter = useRef(anchor);
  const rectGetter = useRef(anchorRect);
  useLayoutEffect(() => { anchorGetter.current = anchor; rectGetter.current = anchorRect; });
  const [position, setPosition] = useState<Position>({ left: 8, top: 8, maxWidth: 1, maxHeight: 1 });
  const outside = (target: Node) => {
    if (!popupRef.current?.contains(target) && !anchor()?.contains(target) && !ignoreOutside?.(target)) close(false);
  };
  useOverlayDismiss({ open: mounted, onEscape: () => close(true), onOutside: outside, onFocusOutside: outside });
  useLayoutEffect(() => {
    const popup = popupRef.current;
    const owner = anchorGetter.current();
    if (!popup || !owner) return;
    if (inspectorPlacement && inspectorPopoverOwner(owner)) return watchInspectorPopover(owner, popup, preferredWidth, next => setPosition(next), { topOffset, allowOwnerOverlap: allowInspectorOverlap });
    return watchAnchoredMenu(owner, popup, "start", (next: Position) => {
      setPosition(current => Object.keys(next).every(key => current[key as keyof Position] === next[key as keyof Position]) ? current : next);
    }, () => rectGetter.current?.());
  }, [mounted, inspectorPlacement, allowInspectorOverlap, preferredWidth, topOffset, popupRef]);
  useLayoutEffect(() => {
    if (!mounted || !focusOnMount) return;
    const popup = popupRef.current;
    const first = (popup && focusGetter.current?.(popup)) ?? popup?.querySelector<HTMLElement>("input:not(:disabled), textarea:not(:disabled), select:not(:disabled)") ?? popup?.querySelector<HTMLElement>("a[href]") ?? popup?.querySelector<HTMLElement>("button:not(:disabled), [tabindex='0']");
    first?.focus();
    if (first) onFocusPlaced?.();
  }, [mounted, focusOnMount, focusRevision, label, onFocusPlaced, popupRef]);

  if (!mounted) return null;
  return createPortal(<div id={id} ref={popupRef} className={`studio-anchored-popover ${className}`} role={role} aria-label={label} style={position} onPointerDown={event => event.stopPropagation()}>{children}</div>, document.body);
}
