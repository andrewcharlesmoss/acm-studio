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
    className={className}
    style={style}
    role="group"
    aria-label={label}
    data-toolbar-block={blockType}
    data-toolbar-actions={actions.filter(action => action.visible).map(action => action.id).join(" ")}
  >{children}</div>;
}
