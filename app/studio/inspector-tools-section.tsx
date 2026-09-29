"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { StudioIcon } from "./studio-icons";
import { useInspectorContentDisabled } from "./inspector-accordion";

export type InspectorToolOption = { id: string; label: string; source?: "gutenberg" | "studio" };
export type InspectorMenuOption = { id: string; label: string; checked?: boolean; disabled?: boolean };

export function InspectorToolsSection({ title, options, visible, canReset, menuOptions = [], onMenuOptionSelect, onToggle, onReset, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  canReset?: boolean;
  menuOptions?: readonly InspectorMenuOption[];
  onMenuOptionSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const disabled = useInspectorContentDisabled();
  return <InspectorToolsSectionContent key={String(disabled)} title={title} options={options} visible={visible} canReset={canReset ?? (visible.size > 0)} menuOptions={menuOptions} onMenuOptionSelect={onMenuOptionSelect} onToggle={onToggle} onReset={onReset} disabled={disabled}>{children}</InspectorToolsSectionContent>;
}

function InspectorToolsSectionContent({ title, options, visible, canReset, menuOptions, onMenuOptionSelect, onToggle, onReset, disabled, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  canReset: boolean;
  menuOptions: readonly InspectorMenuOption[];
  onMenuOptionSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const gutenbergOptions = options.filter(option => option.source !== "studio");
  const studioOptions = options.filter(option => option.source === "studio");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 16, top: 16, width: 240 });

  useLayoutEffect(() => {
    if (!menuOpen || disabled) return;
    function positionMenu() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const triggerRect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? triggerRect.left;
      const width = Math.min(240, window.innerWidth - 32);
      setMenuPosition({
        left: Math.min(window.innerWidth - width - 16, Math.max(16, inspectorLeft - width - 12)),
        top: Math.max(16, Math.min(triggerRect.top, window.innerHeight - menu.getBoundingClientRect().height - 16)),
        width,
      });
    }
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [menuOpen, disabled]);

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
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
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

  return <section ref={rootRef} className={`inspector-panel inspector-tools-section${visible.size ? "" : " is-compact"}`}>
    <div className="inspector-tools-heading">
      <h2>{title}</h2>
      <button ref={triggerRef} type="button" className="inspector-tools-trigger" aria-label={`${title} options`} aria-expanded={menuOpen && !disabled} aria-controls={menuId} disabled={disabled} onClick={() => { if (!menuOpen) document.dispatchEvent(new CustomEvent("studio-inspector-tools-open", { detail: menuId })); setMenuOpen(open => !open); }}><StudioIcon name={visible.size ? "more-vertical" : "add"} size={18} /></button>
      {menuOpen && !disabled ? createPortal(<div ref={menuRef} id={menuId} className="inspector-tools-menu" role="group" aria-label={`${title} controls`} style={menuPosition}>
        <div className="inspector-tools-menu-heading"><span className="inspector-tools-menu-title">{title}</span><button type="button" className="inspector-tools-menu-close" aria-label={`Close ${title} options`} onClick={() => { setMenuOpen(false); triggerRef.current?.focus(); }}><StudioIcon name="close" size={16} /></button></div>
        <div className="inspector-tools-menu-body">
          {menuOptions.length ? <div className="inspector-tools-menu-options" aria-label="Gutenberg controls">{menuOptions.map(option => <button key={option.id} type="button" disabled={option.disabled} aria-pressed={option.checked} onClick={() => onMenuOptionSelect?.(option.id)}>{option.label}{option.checked ? <StudioIcon name="check" size={16} /> : null}</button>)}</div> : null}
          {gutenbergOptions.length ? <div className="inspector-tools-menu-options" aria-label="Gutenberg options">{gutenbergOptions.map(option => <button key={option.id} type="button" aria-pressed={visible.has(option.id)} onClick={() => onToggle(option.id)}>{option.label}{visible.has(option.id) ? <StudioIcon name="check" size={16} /> : null}</button>)}</div> : null}
          {studioOptions.length ? <>
            {gutenbergOptions.length ? <div className="inspector-tools-menu-divider" role="separator" /> : null}
            <div className="inspector-tools-menu-options" aria-label="Studio options">{studioOptions.map(option => <button key={option.id} type="button" aria-pressed={visible.has(option.id)} onClick={() => onToggle(option.id)}><span>{option.label}<StudioSourceBadge /></span>{visible.has(option.id) ? <StudioIcon name="check" size={16} /> : null}</button>)}</div>
          </> : null}
        </div>
        <button type="button" className="inspector-tools-reset" disabled={!canReset} onClick={() => { onReset(); setMenuOpen(false); triggerRef.current?.focus(); }}>Reset all</button>
      </div>, document.body) : null}
    </div>
    {visible.size ? disabled ? <fieldset className="inspector-tools-content" disabled>{children}</fieldset> : <div className="inspector-tools-content">{children}</div> : null}
  </section>;
}

export function StudioSourceBadge() {
  return <span className="studio-source-badge" title="Not shown in the current Gutenberg reference; availability may depend on WordPress settings or the active theme">Studio</span>;
}
