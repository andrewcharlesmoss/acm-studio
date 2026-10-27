"use client";

import { useRef } from "react";
import { preserveTextSelection } from "./editors/rich-text";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioIcon } from "../studio-icons";

/** Variations share the existing Reading Time record and owning history. */
export function ReadingTimeModeControl({ mode = "time", writable, open, onOpenChange, onChoose }: {
  mode?: "time" | "words";
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: "time" | "words") => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="transform-control">
    <button ref={trigger} className={open ? "is-active" : ""} type="button" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Reading Time variation" title="Transform block">
      <StudioHoverIcon name="time.clock" /><StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu presentation="custom" anchor={() => trigger.current} className="transform-menu" aria-label="Reading Time variation" onClose={restore => { onOpenChange(false); if (restore !== false) trigger.current?.focus(); }}>
      {(["time", "words"] as const).map(choice => <button className="table-style-choice" type="button" role="menuitemradio" aria-checked={mode === choice} key={choice} disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => { onChoose(choice); onOpenChange(false); requestAnimationFrame(() => trigger.current?.focus()); }}>
        <StudioHoverIcon name={choice === "time" ? "time.clock" : "text.paragraph"} /><span>{choice === "time" ? "Time to Read" : "Word Count"}{mode === choice ? <StudioIcon name="check" size={18} /> : null}</span>
      </button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
