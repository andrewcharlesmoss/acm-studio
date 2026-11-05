"use client";

import { useRef, useState } from "react";
import { RadioGroup } from "./controls/radio-group";
import { ToggleSetting } from "./controls/toggle-setting";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { StudioDialog } from "./overlays/dialog";
import { StudioIcon } from "./studio-icons";
import { useStudioToolbarPreference } from "./studio-toolbar-preference";

export function StudioPreferencesMenu() {
  const preference = useStudioToolbarPreference();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!preference) return null;
  function closeMenu(restore = true) {
    setOpen(false);
    if (restore) requestAnimationFrame(() => trigger.current?.focus());
  }
  return <>
    <button ref={trigger} className="studio-preferences-trigger" type="button" aria-label="Options" title="Options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><StudioIcon name="more-vertical" size={20} /></button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} align="end" aria-label="Options" onClose={closeMenu} className="studio-preferences-menu"><button type="button" role="menuitem" onClick={() => { setOpen(false); setDialog(true); }}>Preferences</button></StudioAnchoredMenu> : null}
    {dialog ? <StudioDialog title="Preferences" className="studio-preferences-dialog" returnFocus={trigger} onClose={() => setDialog(false)}>
      <div className="studio-preferences-content">
        <h3>Editor</h3>
        <ToggleSetting label="Make space for block toolbar" checked={preference.enabled} onChange={preference.setEnabled} />
        <p>Move nearby blocks to keep the toolbar visible.</p>
        <RadioGroup label="Block selection outline" presentation="segmented" value={preference.outlineMode} onChange={value => preference.setOutlineMode(value as typeof preference.outlineMode)} options={[
          { value: "toolbar-hover", label: "Toolbar hover" },
          { value: "always", label: "Always" },
          { value: "off", label: "Off" },
        ]} />
        <p>Toolbar hover shows the outline when you hover over the block type, drag or move controls.</p>
        {preference.status ? <p role="status">{preference.status}</p> : null}
        {preference.outlineStatus ? <p role="status">{preference.outlineStatus}</p> : null}
      </div>
    </StudioDialog> : null}
  </>;
}
