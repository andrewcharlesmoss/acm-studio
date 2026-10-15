"use client";

import { Fragment, type RefObject } from "react";
import { StudioMenuItem } from "./overlays/menu";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
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
  const menuActions: StudioListContextMenuAction[] = [
    ...actions,
    ...(onDelete ? [{ label: "Move to Bin", icon: "archive" as const, onClick: onDelete, disabled: !canDelete, disabledReason: !canDelete ? disabledReason : undefined }] : []),
  ];
  const helpPrefix = `studio-list-context-menu-help-${target.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "item"}`;
  const runAction = (action: StudioListContextMenuAction) => {
    onClose();
    if (restoreFocus) restoreFocus(); else returnFocusRef?.current?.focus();
    action.onClick();
  };
  return <StudioAnchoredMenu presentation="custom" anchor={() => returnFocusRef?.current ?? document.activeElement as HTMLElement} point={{ x: target.x, y: target.y }} className="studio-list-context-menu" aria-label={`Actions for ${target.label}`} onClose={restore => { onClose(); if (restore !== false) requestAnimationFrame(() => restoreFocus ? restoreFocus() : returnFocusRef?.current?.focus()); }}>

    {menuActions.map((action, index) => {
      const helpId = `${helpPrefix}-${index}`;
      return <Fragment key={`${action.label}-${index}`}>
        <StudioMenuItem className={action.destructive ? "is-destructive" : undefined} disabled={action.disabled} aria-describedby={action.disabled && action.disabledReason ? helpId : undefined} onClick={() => runAction(action)}><StudioIcon name={action.icon} size={16} />{action.label}</StudioMenuItem>
        {action.disabled && action.disabledReason ? <small id={helpId} role="status">{action.disabledReason}</small> : null}
      </Fragment>;
    })}
  </StudioAnchoredMenu>;
}
