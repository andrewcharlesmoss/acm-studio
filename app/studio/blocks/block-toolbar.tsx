"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ResolvedBlockToolbarAction } from "./toolbar-registry";

/** Shared toolbar surface. Feature adapters render controls and own their commands. */
export function BlockToolbar({
  actions,
  blockType,
  className,
  label,
  style,
  children,
}: {
  actions: readonly ResolvedBlockToolbarAction[];
  blockType: string;
  className: string;
  label: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!actions.some(action => action.visible)) return null;
  return <div
    className={`${className} studio-block-toolbar`}
    style={style}
    onFocusCapture={event => {
      // Native focus can leave actions clipped by nested canvas scrollports.
      // Portal menus retain React ancestry but own their separate placement.
      if (event.target instanceof HTMLElement && event.currentTarget.contains(event.target)) {
        event.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
    }}
    role="group"
    aria-label={label}
    data-toolbar-block={blockType}
    data-toolbar-actions={actions.filter(action => action.visible).map(action => action.id).join(" ")}
  >{children}</div>;
}
