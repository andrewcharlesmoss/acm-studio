"use client";

import type { RefObject } from "react";
import { StudioMenuItem } from "./overlays/menu";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { StudioIcon } from "./studio-icons";

export type BlockMenuAction = "copy" | "cut" | "duplicate" | "before" | "after" | "note" | "copy-styles" | "paste-styles" | "group" | "lock" | "rename" | "hide" | "html" | "delete";
export type BlockMenuItem = { action: BlockMenuAction; label: string; shortcut?: string; disabled?: boolean; disabledReason?: string; separator?: boolean };

export function BlockOptionsMenu({ items, trigger, onAction, onClose }: { items: BlockMenuItem[]; trigger: RefObject<HTMLButtonElement | null>; onAction: (action: BlockMenuAction) => void; onClose: (restoreFocus?: boolean) => void }) {
  return <StudioAnchoredMenu anchor={() => trigger.current} align="end" className="block-options-menu studio-block-options-menu" aria-label="Block options" onClose={onClose} onOutside={target => {
    if (!(target instanceof Element && target.closest(".block-options-trigger"))) onClose(false);
  }}>
    {items.map(item => <div className={item.separator ? "block-options-menu-group" : undefined} key={item.action}><StudioMenuItem disabled={item.disabled} title={item.disabledReason} aria-description={item.disabledReason} onClick={() => onAction(item.action)}><span>{item.label}</span>{item.shortcut ? <kbd>{item.shortcut}</kbd> : item.action === "lock" ? <StudioIcon name="lock" size={18} /> : null}</StudioMenuItem></div>)}
  </StudioAnchoredMenu>;
}
