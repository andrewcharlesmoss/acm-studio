"use client";

import { createContext, useContext, useId, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useInterfaceStylePortalStyle } from "../ui/styles/interface-style-scope";
import type { CanvasInsertionCue as Cue } from "../use-block-insertion-gaps";
import { InserterToggleIcon } from "./inserter-toggle-icon";

/** The canvas owner supplies only the currently valid chooser anchor. */
export const CanvasInserterAnchorContext = createContext<string | null>(null);

export function CanvasInserterButton({ label = "Add block", iconSize = 24, frameIcon = false, showLabel = false, ownerAnchorId, onPointerDown, onFocus, onClick, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "id" | "aria-label" | "aria-expanded" | "aria-haspopup" | "title"> & {
  ownerAnchorId?: string;
  label?: string;
  iconSize?: number;
  frameIcon?: boolean;
  showLabel?: boolean;
}) {
  const id = useId();
  const activeAnchorId = useContext(CanvasInserterAnchorContext);
  const open = activeAnchorId === (ownerAnchorId ?? id);
  const currentLabel = open ? "Close block chooser" : label;
  const icon = <InserterToggleIcon open={open} size={iconSize} />;

  return <button {...props} data-studio-canvas-inserter="true" data-studio-inserter-label={label} onPointerDown={event => { event.stopPropagation(); onPointerDown?.(event); }} onFocus={event => { event.stopPropagation(); onFocus?.(event); }} onClick={event => { event.stopPropagation(); onClick?.(event); }} id={id} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={currentLabel} title={currentLabel}>
    {frameIcon ? <span aria-hidden="true">{icon}</span> : icon}
    {showLabel ? <span className="nested-add-label">{currentLabel}</span> : null}
  </button>;
}


/** One painted cue escapes authored clipping; logical anchors retain keyboard order. */
export function CanvasInsertionCue({ cue }: { cue: Cue | null }) {
  const interfaceStyle = useInterfaceStylePortalStyle();
  if (!cue || !cue.anchor.isConnected) return null;
  const anchor = cue.anchor;
  return createPortal(<CanvasInserterButton key={anchor.id} className="between-blocks canvas-insertion-cue" frameIcon ownerAnchorId={anchor.id}
    label={anchor.dataset.studioInserterLabel ?? "Add block"} tabIndex={-1} data-active-insertion="true" data-studio-insertion-proxy-for={anchor.id}
    style={{ ...interfaceStyle, left: cue.left, top: cue.top, width: cue.width }}
    onPointerDown={event => { event.preventDefault(); anchor.focus({ preventScroll: true }); }} onClick={() => { if (anchor.isConnected && !anchor.disabled) anchor.click(); }}
  />, anchor.ownerDocument.body);
}
