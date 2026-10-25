"use client";

import { useCallback, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { StudioFocusOutlineSetting } from "./focus-outline-preferences";
import { useResponsiveStyleScope } from "./responsive-style-context";
import { StudioIcon } from "./studio-icons";
import { AcmIcon } from "@acm/icons/react";

export type StudioViewport = "desktop" | "tablet" | "mobile";

const viewports: { id: StudioViewport; label: string; width: number }[] = [
  { id: "desktop", label: "Desktop", width: 1200 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 390 },
];

export function StudioViewMenu({ viewport, onViewportChange, showTemplate, hasTemplate, onShowTemplateChange, showTemplateUnavailableMessage, onPreviewInNewTab, previewInNewTabDisabled = false, showResponsiveStylesNotice = true, responsiveStylesUnavailableMessage, showFocusOutlineSetting = true }: {
  viewport: StudioViewport;
  onViewportChange?: (viewport: StudioViewport) => void;
  showTemplate?: boolean;
  hasTemplate?: boolean;
  onShowTemplateChange?: (show: boolean) => void;
  showTemplateUnavailableMessage?: string;
  onPreviewInNewTab?: () => void;
  previewInNewTabDisabled?: boolean;
  showResponsiveStylesNotice?: boolean;
  responsiveStylesUnavailableMessage?: string;
  showFocusOutlineSetting?: boolean;
}) {
  const { enabled: responsiveStyles, setEnabled: setResponsiveStyles } = useResponsiveStyleScope();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeViewportRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.isConnected && triggerRef.current.focus());
  }, []);

  function chooseViewport(next: StudioViewport) {
    onViewportChange?.(next);
    closeMenu();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if ((event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return <div className="studio-view-menu" ref={rootRef}>
    <button ref={triggerRef} className="studio-view-trigger" type="button" aria-label="View" title="View" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={handleTriggerKeyDown}>
      <AcmIcon name="device.laptop" scale="Regular-M" size={24} className="studio-view-trigger-icon" />
    </button>
    {open ? <StudioAnchoredMenu presentation="custom" anchor={() => triggerRef.current} align="end" initialFocus={() => activeViewportRef.current ?? closeRef.current} onClose={closeMenu} className="studio-view-popover" aria-label="View options">
      <div className="studio-view-popover-heading"><strong>View</strong><button ref={closeRef} type="button" aria-label="Close View menu" onClick={() => closeMenu()}><StudioIcon name="close" size={18} /></button></div>
      {onViewportChange ? <div className="studio-view-group" aria-label="Preview viewport">
        {viewports.map(item => <button ref={viewport === item.id ? activeViewportRef : null} className="studio-view-option" type="button" role="menuitemradio" aria-checked={viewport === item.id} key={item.id} onClick={() => chooseViewport(item.id)}>
          <span><strong>{item.label}</strong><small>{responsiveStyles ? item.id === "desktop" ? "Style all viewports." : `Style ${item.label.toLowerCase()} only.` : `Preview ${item.label.toLowerCase()} viewport.`}</small></span>
          {viewport === item.id ? <StudioIcon name="check" size={18} aria-hidden="true" /> : null}
        </button>)}
      </div> : null}
      {showFocusOutlineSetting ? <div className="studio-view-group"><StudioFocusOutlineSetting /></div> : null}
      {showResponsiveStylesNotice && onViewportChange ? <div className="studio-view-group studio-view-responsive">
        {responsiveStylesUnavailableMessage ? <div className="studio-view-option is-unavailable" aria-disabled="true"><span><strong>Responsive styles</strong><small>{responsiveStylesUnavailableMessage}</small></span></div> : <button className="studio-view-option" type="button" role="menuitemcheckbox" aria-checked={responsiveStyles} onClick={() => setResponsiveStyles(!responsiveStyles)}><span><strong>Responsive styles</strong><small>Style changes apply only to the selected viewport.</small></span>{responsiveStyles ? <StudioIcon name="check" size={18} aria-hidden="true" /> : null}</button>}
      </div> : null}
      {onShowTemplateChange ? <div className="studio-view-group">
        <button className="studio-view-option" type="button" role="menuitemcheckbox" aria-checked={showTemplate} disabled={!hasTemplate} onClick={() => onShowTemplateChange(!showTemplate)}>
          <span><strong>Show template</strong>{!hasTemplate ? <small>{showTemplateUnavailableMessage ?? "No template is assigned to this document."}</small> : null}</span>
          {showTemplate ? <StudioIcon name="check" size={18} aria-hidden="true" /> : null}
        </button>
      </div> : null}
      {onPreviewInNewTab ? <div className="studio-view-group">
        <button className="studio-view-option" type="button" role="menuitem" disabled={previewInNewTabDisabled} onClick={() => { closeMenu(); onPreviewInNewTab(); }}>
          <span><strong>Preview in new tab</strong></span><StudioIcon name="external" size={18} aria-hidden="true" />
        </button>
      </div> : null}
    </StudioAnchoredMenu> : null}
  </div>;
}

export function viewportWidthFor(viewport: StudioViewport) {
  return viewports.find(item => item.id === viewport)?.width ?? 1200;
}
