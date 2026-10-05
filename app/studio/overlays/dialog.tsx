"use client";

import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { StudioIcon } from "../studio-icons";

/** Mount only while open. Native modality owns inertness and constrained tabbing. */
export function StudioDialog({ title, children, onClose, className = "", returnFocus, selectInitialText = false }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  returnFocus?: HTMLElement | RefObject<HTMLElement | null> | null;
  selectInitialText?: boolean;
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
  return createPortal(<dialog ref={dialogRef} className={`studio-dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <header className="studio-dialog-heading"><h2 id={titleId}>{title}</h2><button className="studio-dialog-close" type="button" aria-label={`Close ${title.toLowerCase()}`} title="Close" onClick={onClose}><StudioIcon name="close" size={20} /></button></header>
    {children}
  </dialog>, document.body);
}

export function StudioDialogActions({ children }: { children: ReactNode }) {
  return <div className="studio-dialog-actions">{children}</div>;
}
