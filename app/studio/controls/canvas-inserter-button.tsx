"use client";

import { createContext, useContext, useId, type ButtonHTMLAttributes } from "react";
import { InserterToggleIcon } from "./inserter-toggle-icon";

/** The canvas owner supplies only the currently valid chooser anchor. */
export const CanvasInserterAnchorContext = createContext<string | null>(null);

export function CanvasInserterButton({ label = "Add block", iconSize = 24, frameIcon = false, showLabel = false, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "id" | "aria-label" | "aria-expanded" | "aria-haspopup" | "title"> & {
  label?: string;
  iconSize?: number;
  frameIcon?: boolean;
  showLabel?: boolean;
}) {
  const id = useId();
  const activeAnchorId = useContext(CanvasInserterAnchorContext);
  const open = activeAnchorId === id;
  const currentLabel = open ? "Close block chooser" : label;
  const icon = <InserterToggleIcon open={open} size={iconSize} />;

  return <button {...props} id={id} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={currentLabel} title={currentLabel}>
    {frameIcon ? <span aria-hidden="true">{icon}</span> : icon}
    {showLabel ? <span className="nested-add-label">{currentLabel}</span> : null}
  </button>;
}
