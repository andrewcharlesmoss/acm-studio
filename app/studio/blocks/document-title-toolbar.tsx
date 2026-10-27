"use client";

import { useRef } from "react";
import type { DocumentTitleLevel } from "../../content/model";
import { HeadingLevelIcon } from "../controls/heading-level-setting";
import { preserveTextSelection } from "./editors/rich-text";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioIcon } from "../studio-icons";

const levels: DocumentTitleLevel[] = [0, 1, 2, 3, 4, 5, 6];
const levelLabel = (level: DocumentTitleLevel) => level === 0 ? "Paragraph" : `Heading ${level}`;

/** Changes presentation only; the host retains document ownership and history. */
export function DocumentTitleLevelControl({ level = 2, writable, open, onOpenChange, onChoose }: {
  level?: DocumentTitleLevel;
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (level: DocumentTitleLevel) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="transform-control">
    <button ref={trigger} className={open ? "is-active" : ""} type="button" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Title heading level" title="Change heading level">
      {level === 0 ? <StudioHoverIcon name="text.paragraph" /> : <HeadingLevelIcon level={level} />}
      <StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu presentation="custom" anchor={() => trigger.current} className="transform-menu" aria-label="Title heading level" onClose={restore => { onOpenChange(false); if (restore !== false) trigger.current?.focus(); }}>
      {levels.map(choice => <button className="table-style-choice" type="button" role="menuitemradio" aria-checked={level === choice} key={choice} disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => { onChoose(choice); onOpenChange(false); requestAnimationFrame(() => trigger.current?.focus()); }}>
        {choice === 0 ? <StudioHoverIcon name="text.paragraph" /> : <HeadingLevelIcon level={choice} />}<span>{levelLabel(choice)}{level === choice ? <StudioIcon name="check" size={18} /> : null}</span>
      </button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
