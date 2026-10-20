"use client";

import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { StudioIcon } from "../studio-icons";
import { isStudioDialogBackdropClick } from "./dialog-backdrop";

/** Mount only while open. Native modality owns inertness and constrained tabbing. */
export function StudioDialog({ title, children, onClose, className = "", returnFocus, selectInitialText = false, closeLabel, closeDisabled = false, closeOnBackdrop = false }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  returnFocus?: HTMLElement | RefObject<HTMLElement | null> | null;
  selectInitialText?: boolean;
  closeLabel?: string;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = returnFocus && "current" in returnFocus ? returnFocus.current : returnFocus ?? document.activeElement;
    dialog.showModal();
    const field = dialog.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not(:disabled), textarea:not(:disabled), select:not(:disabled)");
    field?.focus();
    if (selectInitialText && field && "select" in field) field.select();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [returnFocus, selectInitialText]);
  // Native cancel handles Escape; pointer clicks optionally dismiss only the backdrop.
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return createPortal(<dialog ref={dialogRef} className={`studio-dialog ${className || "studio-dialog-default"}`} aria-labelledby={titleId} onClick={event => {
    if (isStudioDialogBackdropClick(event, closeOnBackdrop, closeDisabled)) onClose();
  }} onCancel={event => { event.preventDefault(); event.stopPropagation(); if (!closeDisabled) onClose(); }}>
    <header className="studio-dialog-heading"><h2 id={titleId}>{title}</h2><button className="studio-dialog-close" type="button" aria-label={closeLabel ?? `Close ${title.toLowerCase()}`} title="Close" disabled={closeDisabled} onClick={onClose}><StudioIcon name="close" size={20} /></button></header>
    {children}
  </dialog>, document.body);
}

export function StudioDialogActions({ children }: { children: ReactNode }) {
  return <div className="studio-dialog-actions">{children}</div>;
}
