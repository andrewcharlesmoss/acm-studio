"use client";

import { useEffect, useRef, type RefObject } from "react";
import { StudioIcon } from "./studio-icons";

export type StudioListContextMenuTarget = {
  label: string;
  x: number;
  y: number;
};

export function StudioListContextMenu({ target, onDelete, onClose, returnFocusRef, restoreFocus, canDelete = true, disabledReason }: {
  target: StudioListContextMenuTarget;
  onDelete: () => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: () => void;
  canDelete?: boolean;
  disabledReason?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) onClose();
    };
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); requestAnimationFrame(() => restoreFocus ? restoreFocus() : returnFocusRef?.current?.focus()); return; }
      if (!menuRef.current || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const items = [...menuRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      if (items[next]) { event.preventDefault(); items[next].focus(); }
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnKeyDown);
    };
  }, [onClose, restoreFocus, returnFocusRef]);
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const left = Math.max(8, Math.min(target.x, viewportWidth - 188));
  const top = Math.max(8, Math.min(target.y, viewportHeight - 58));
  const helpId = `studio-list-context-menu-help-${target.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "item"}`;
  return <div ref={menuRef} className="studio-list-context-menu" role="menu" aria-label={`Actions for ${target.label}`} style={{ left, top }}>
    <button type="button" role="menuitem" disabled={!canDelete} aria-describedby={!canDelete && disabledReason ? helpId : undefined} onClick={() => { onClose(); if (restoreFocus) restoreFocus(); else returnFocusRef?.current?.focus(); onDelete(); }}><StudioIcon name="trash" size={16} />Delete</button>
    {!canDelete && disabledReason ? <small id={helpId} role="status">{disabledReason}</small> : null}
  </div>;
}
