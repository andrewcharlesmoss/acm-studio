"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { StudioIcon } from "./studio-icons";

export type StudioViewport = "desktop" | "tablet" | "mobile";

const viewports: { id: StudioViewport; label: string; width: number }[] = [
  { id: "desktop", label: "Desktop", width: 1200 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 390 },
];

export function StudioViewMenu({ viewport, onViewportChange, showTemplate, hasTemplate, onShowTemplateChange, onPreviewInNewTab }: {
  viewport: StudioViewport;
  onViewportChange: (viewport: StudioViewport) => void;
  showTemplate: boolean;
  hasTemplate: boolean;
  onShowTemplateChange: (show: boolean) => void;
  onPreviewInNewTab: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeViewportRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.isConnected && triggerRef.current.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    activeViewportRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) closeMenu(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
        const current = items.indexOf(document.activeElement as HTMLElement);
        if (!items.length) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  function chooseViewport(next: StudioViewport) {
    onViewportChange(next);
    closeMenu();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if ((event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return <div className="studio-view-menu" ref={rootRef}>
    <button ref={triggerRef} className="studio-view-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={handleTriggerKeyDown}>
      <span>View</span><StudioIcon name="chevron-down" size={16} aria-hidden="true" />
    </button>
    {open ? <div className="studio-view-popover" role="menu" aria-label="View options">
      <div className="studio-view-popover-heading"><strong>View</strong><button ref={closeRef} type="button" aria-label="Close View menu" onClick={closeMenu}><StudioIcon name="close" size={18} /></button></div>
      <div className="studio-view-group" aria-label="Preview viewport">
        {viewports.map(item => <button ref={viewport === item.id ? activeViewportRef : null} className="studio-view-option" type="button" role="menuitemradio" aria-checked={viewport === item.id} key={item.id} onClick={() => chooseViewport(item.id)}>
          <span><strong>{item.label}</strong><small>Preview {item.label.toLowerCase()} viewport.</small></span>
          {viewport === item.id ? <StudioIcon name="check" size={18} aria-hidden="true" /> : null}
        </button>)}
      </div>
      <div className="studio-view-group studio-view-responsive" aria-disabled="true">
        <span className="studio-view-option is-unavailable"><span><strong>Responsive styles</strong><small>Viewport-specific style editing is not available in Studio yet.</small></span></span>
      </div>
      <div className="studio-view-group">
        <button className="studio-view-option" type="button" role="menuitemcheckbox" aria-checked={showTemplate} disabled={!hasTemplate} onClick={() => onShowTemplateChange(!showTemplate)}>
          <span><strong>Show template</strong>{!hasTemplate ? <small>No template is assigned to this document.</small> : null}</span>
          {showTemplate ? <StudioIcon name="check" size={18} aria-hidden="true" /> : null}
        </button>
      </div>
      <div className="studio-view-group">
        <button className="studio-view-option" type="button" role="menuitem" onClick={() => { closeMenu(); onPreviewInNewTab(); }}>
          <span><strong>Preview in new tab</strong></span><StudioIcon name="external" size={18} aria-hidden="true" />
        </button>
      </div>
    </div> : null}
  </div>;
}

export function viewportWidthFor(viewport: StudioViewport) {
  return viewports.find(item => item.id === viewport)?.width ?? 1200;
}
