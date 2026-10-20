"use client";

import { useRef, useState } from "react";
import { StudioIcon } from "../studio-icons";
import { AcmIcon } from "@acm/icons/react";
import type { StyleViewport } from "../../content/responsive-styles";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import "./viewport-states-menu.css";

export type ButtonPseudoState = "default" | "hover" | "focus" | "focus-visible" | "active";

/** View selection only; style ownership and preview sizing stay with the host. */
export function ViewportStatesMenu({ viewport, onChange, pseudoState, onPseudoStateChange }: { viewport: StyleViewport; onChange: (viewport: StyleViewport) => void; pseudoState?: ButtonPseudoState; onPseudoStateChange?: (state: ButtonPseudoState) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close(restore = true) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  return <div className="studio-viewport-states">
    <button ref={trigger} className="studio-viewport-states-trigger" type="button" aria-label="States" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>States<StudioIcon name="chevron-down" size={20} /></button>
    {viewport !== "desktop" ? <span className="studio-viewport-states-current" role="status"><StudioIcon name="info" size={16} aria-hidden="true" />{viewport === "tablet" ? "Tablet" : "Mobile"}</span> : null}
    {open ? <StudioAnchoredMenu className="studio-viewport-states-menu" anchor={() => trigger.current} align="end" initialFocus={menu => menu.querySelector<HTMLElement>('[aria-checked="true"]')} aria-label="States" onClose={close}>
      <div className="studio-viewport-states-label">VIEWPORT</div>
      {(["desktop", "tablet", "mobile"] as const).map(device => <button type="button" role="menuitemradio" aria-checked={viewport === device} key={device} onClick={() => { onChange(device); close(); }}><span>{device === "desktop" ? "Default" : device === "tablet" ? "Tablet" : "Mobile"}</span>{viewport === device ? <AcmIcon name="state.selected" size={20} /> : null}</button>)}
      {pseudoState !== undefined && onPseudoStateChange ? <>
        <div className="studio-viewport-states-divider" />
        <div className="studio-viewport-states-label">PSEUDO STATE</div>
        {(["default", "hover", "focus", "focus-visible", "active"] as const).map(state => <button type="button" role="menuitemradio" aria-checked={pseudoState === state} key={state} onClick={() => { onPseudoStateChange(state); close(); }}><span>{state === "default" ? "Default" : state === "focus-visible" ? "Focus-visible" : state[0].toUpperCase() + state.slice(1)}</span>{pseudoState === state ? <AcmIcon name="state.selected" size={20} /> : null}</button>)}
      </> : null}
    </StudioAnchoredMenu> : null}
  </div>;
}
