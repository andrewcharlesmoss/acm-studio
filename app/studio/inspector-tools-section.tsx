"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { StudioIcon } from "./studio-icons";
import { useInspectorContentDisabled } from "./inspector-accordion";

export type InspectorToolOption = { id: string; label: string };

export function InspectorToolsSection({ title, options, visible, onToggle, onReset, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const disabled = useInspectorContentDisabled();
  return <InspectorToolsSectionContent key={String(disabled)} title={title} options={options} visible={visible} onToggle={onToggle} onReset={onReset} disabled={disabled}>{children}</InspectorToolsSectionContent>;
}

function InspectorToolsSectionContent({ title, options, visible, onToggle, onReset, disabled, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function closeOtherMenu(event: Event) {
      if ((event as CustomEvent<string>).detail !== menuId) setMenuOpen(false);
    }
    document.addEventListener("studio-inspector-tools-open", closeOtherMenu);
    return () => document.removeEventListener("studio-inspector-tools-open", closeOtherMenu);
  }, [menuId]);

  useEffect(() => {
    if (!menuOpen || disabled) return;
    function dismissOnPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", dismissOnPointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [menuOpen, disabled]);

  return <section ref={rootRef} className="inspector-panel inspector-tools-section">
    <div className="inspector-tools-heading">
      <h2>{title}</h2>
      <button ref={triggerRef} type="button" className="inspector-tools-trigger" aria-label={`${title} options`} aria-expanded={menuOpen && !disabled} aria-controls={menuId} disabled={disabled} onClick={() => { if (!menuOpen) document.dispatchEvent(new CustomEvent("studio-inspector-tools-open", { detail: menuId })); setMenuOpen(open => !open); }}><StudioIcon name={visible.size ? "more-vertical" : "add"} size={18} /></button>
      {menuOpen && !disabled ? <div id={menuId} className="inspector-tools-menu" role="group" aria-label={`${title} controls`}>
        <span className="inspector-tools-menu-title">{title}</span>
        {options.map(option => <button key={option.id} type="button" aria-pressed={visible.has(option.id)} onClick={() => onToggle(option.id)}>{option.label}{visible.has(option.id) ? <StudioIcon name="check" size={16} /> : null}</button>)}
        <button type="button" className="inspector-tools-reset" disabled={!visible.size} onClick={() => { onReset(); setMenuOpen(false); triggerRef.current?.focus(); }}>Reset all</button>
      </div> : null}
    </div>
    {visible.size ? disabled ? <fieldset className="inspector-tools-content" disabled>{children}</fieldset> : <div className="inspector-tools-content">{children}</div> : null}
  </section>;
}
