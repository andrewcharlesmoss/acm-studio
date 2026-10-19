"use client";

import { useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioMenuItem } from "../overlays/menu";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";

/** Preview controls for Styles history and the remaining unavailable actions. */
export function StylesPaneHeaderActions({ canReset, onReset, styleBookOpen, onToggleStyleBook, onAdditionalCss }: {
  onAdditionalCss: () => void;
  canReset: boolean;
  onReset: () => void;
  styleBookOpen: boolean;
  onToggleStyleBook: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = (restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuTrigger.current?.isConnected && menuTrigger.current.focus());
  };

  return <div className="site-editor-styles-header-actions">
    <button type="button" className="site-editor-styles-header-action" aria-label={styleBookOpen ? "Close Style Book" : "Open Style Book"} title="Style Book" aria-pressed={styleBookOpen} onClick={onToggleStyleBook}>
      <AcmIcon name="view.show" scale="Regular-M" size={20} aria-hidden="true" />
    </button>
    <button ref={menuTrigger} type="button" className="site-editor-styles-header-action" aria-label="More Styles actions" title="More Styles actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
      <AcmIcon name="action.more-vertical" scale="Regular-M" size={20} aria-hidden="true" />
    </button>
    {menuOpen ? <StudioAnchoredMenu anchor={() => menuTrigger.current} align="end" className="site-editor-styles-header-menu" aria-label="Styles actions" onClose={closeMenu}>
      <StudioMenuItem onClick={() => { closeMenu(false); onAdditionalCss(); }}>Additional CSS</StudioMenuItem>
      <StudioMenuItem disabled={!canReset} title="Reset Styles" onClick={() => { onReset(); closeMenu(); }}>Reset styles</StudioMenuItem>
    </StudioAnchoredMenu> : null}
  </div>;
}
