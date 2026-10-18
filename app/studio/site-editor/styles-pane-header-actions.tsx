"use client";

import { useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioMenuItem } from "../overlays/menu";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";

/** Preview controls for the Styles pane; the represented features are not active yet. */
export function StylesPaneHeaderActions() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = (restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuTrigger.current?.isConnected && menuTrigger.current.focus());
  };

  return <div className="site-editor-styles-header-actions">
    <button type="button" className="site-editor-styles-header-action" aria-label="Open Style Book" title="Style Book — Coming Soon" disabled>
      <AcmIcon name="view.show" scale="Regular-M" size={20} aria-hidden="true" />
    </button>
    <button ref={menuTrigger} type="button" className="site-editor-styles-header-action" aria-label="More Styles actions" title="More Styles actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
      <AcmIcon name="action.more-vertical" scale="Regular-M" size={20} aria-hidden="true" />
    </button>
    {menuOpen ? <StudioAnchoredMenu anchor={() => menuTrigger.current} align="end" className="site-editor-styles-header-menu" aria-label="Styles actions" onClose={closeMenu}>
      <StudioMenuItem disabled title="Coming Soon" aria-description="Coming Soon">Additional CSS</StudioMenuItem>
      <StudioMenuItem disabled title="Coming Soon" aria-description="Coming Soon">Reset styles</StudioMenuItem>
    </StudioAnchoredMenu> : null}
  </div>;
}
