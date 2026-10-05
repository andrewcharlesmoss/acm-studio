"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { StudioIcon } from "./studio-icons";

/** Authoring-only presentation; the owning editor supplies the saved note. */
export function BlockNoteCard({ label, note, writable, escapeBlocked, onEdit, onBackToBlock }: {
  label: string;
  note: string;
  writable: boolean;
  escapeBlocked: boolean;
  onEdit: (trigger: HTMLButtonElement) => void;
  onBackToBlock: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  function close() {
    const restoreFocus = ref.current?.contains(document.activeElement);
    setCollapsed(true);
    if (restoreFocus) requestAnimationFrame(() => reopenRef.current?.focus());
  }

  function open() {
    setCollapsed(false);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>("button")?.focus());
  }

  useLayoutEffect(() => {
    const card = ref.current;
    const area = card?.parentElement;
    if (!card || !area) return;
    // Keep the final block and appender scrollable above the floating card.
    const measure = () => area.style.setProperty("--studio-note-height", `${card.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => { observer.disconnect(); area.style.removeProperty("--studio-note-height"); };
  }, []);

  useEffect(() => {
    if (collapsed || escapeBlocked) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || !(event.target instanceof Node) || !ref.current?.parentElement?.contains(event.target)) return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [collapsed, escapeBlocked]);

  return <div ref={ref} className="studio-block-note">
    {collapsed ? <button ref={reopenRef} className="studio-block-note-reopen" type="button" onClick={open}><StudioIcon name="pencil" size={18} />Show note</button> : <section className="studio-block-note-card" aria-labelledby={headingId}>
      <header><div><strong id={headingId}>Block note</strong><span>{label}</span></div><button type="button" aria-label="Close block note card" onClick={close}><StudioIcon name="close" size={18} /></button></header>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users must be able to focus and scroll long note text. */}
      <div className="studio-block-note-content" role="region" aria-label="Note text" tabIndex={0}><p>{note}</p></div>
      <footer><button type="button" onClick={onBackToBlock}><StudioIcon name="arrow-left" size={18} />Back to block</button><button type="button" disabled={!writable} onClick={event => onEdit(event.currentTarget)}><StudioIcon name="pencil" size={18} />Edit note</button></footer>
    </section>}
  </div>;
}
