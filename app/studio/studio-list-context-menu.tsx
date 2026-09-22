"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { StudioIcon, type StudioIconName } from "./studio-icons";

export type StudioListContextMenuTarget = {
  label: string;
  x: number;
  y: number;
};

export type StudioListContextMenuAction = {
  label: string;
  icon: StudioIconName;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  destructive?: boolean;
};

export function StudioListContextMenu({ target, actions = [], onDelete, onClose, returnFocusRef, restoreFocus, canDelete = true, disabledReason }: {
  target: StudioListContextMenuTarget;
  actions?: StudioListContextMenuAction[];
  onDelete?: () => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: () => void;
  canDelete?: boolean;
  disabledReason?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });
  const menuActions: StudioListContextMenuAction[] = [
    ...actions,
    ...(onDelete ? [{ label: "Delete", icon: "trash" as const, onClick: onDelete, disabled: !canDelete, disabledReason: !canDelete ? disabledReason : undefined, destructive: true }] : []),
  ];
  const menuSizeKey = menuActions.map(action => `${action.label}:${action.disabled ? "disabled" : "enabled"}:${action.disabledReason ?? ""}`).join("|");
  useLayoutEffect(() => {
    const updateMenuSize = () => {
      const rect = menuRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuSize(current => current.width === rect.width && current.height === rect.height ? current : { width: rect.width, height: rect.height });
    };
    updateMenuSize();
    window.addEventListener("resize", updateMenuSize);
    return () => window.removeEventListener("resize", updateMenuSize);
  }, [menuSizeKey]);
  useEffect(() => {
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    if (firstItem) firstItem.focus();
    else menuRef.current?.focus();
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) onClose();
    };
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); requestAnimationFrame(() => restoreFocus ? restoreFocus() : returnFocusRef?.current?.focus()); return; }
      if (!menuRef.current || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const items = [...menuRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : current < 0 ? (event.key === "ArrowUp" ? items.length - 1 : 0) : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
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
  const menuWidth = menuSize.width || 188;
  const menuHeight = menuSize.height || 58;
  const left = Math.max(8, Math.min(target.x, viewportWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(target.y, viewportHeight - menuHeight - 8));
  const helpPrefix = `studio-list-context-menu-help-${target.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "item"}`;
  const runAction = (action: StudioListContextMenuAction) => {
    onClose();
    if (restoreFocus) restoreFocus(); else returnFocusRef?.current?.focus();
    action.onClick();
  };
  return <div ref={menuRef} className="studio-list-context-menu" role="menu" tabIndex={-1} aria-label={`Actions for ${target.label}`} style={{ left, top }}>
    {menuActions.map((action, index) => {
      const helpId = `${helpPrefix}-${index}`;
      return <Fragment key={`${action.label}-${index}`}>
        <button className={action.destructive ? "is-destructive" : undefined} type="button" role="menuitem" disabled={action.disabled} aria-describedby={action.disabled && action.disabledReason ? helpId : undefined} onClick={() => runAction(action)}><StudioIcon name={action.icon} size={16} />{action.label}</button>
        {action.disabled && action.disabledReason ? <small id={helpId} role="status">{action.disabledReason}</small> : null}
      </Fragment>;
    })}
  </div>;
}
