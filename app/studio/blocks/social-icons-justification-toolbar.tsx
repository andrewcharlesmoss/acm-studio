"use client";

import { useRef, useState } from "react";
import type { IconName } from "@acm/icons";
import type { ContentBlock } from "../../content/model";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { groupHorizontalChoices } from "./group-layout-alignment";

type SocialIconsBlock = Extract<ContentBlock, { type: "social-icons" }>;
type Justification = NonNullable<SocialIconsBlock["justification"]>;

const choices: Array<{ value: Justification; label: string; icon: IconName }> = [
  ...groupHorizontalChoices.map(choice => ({ ...choice, value: choice.value as Justification })),
  { value: "space-between", label: "Justify items space between", icon: "layout.justify-space-between" },
];

type Props = {
  block: SocialIconsBlock;
  writable: boolean;
  onChange: (justification: Justification) => void;
};

/** One-axis Social Icons justification, with commands retained by the editor. */
export function SocialIconsJustificationToolbar({ block, writable, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const current = block.justification ?? "left";
  const selected = choices.find(choice => choice.value === current) ?? choices[0];

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  return <div className="alignment-control social-icons-justification-toolbar">
    <button ref={trigger} className={`block-alignment-button${open ? " is-active" : ""}`} type="button" disabled={!writable} aria-label="Justification" title="Justification" aria-haspopup="menu" aria-expanded={open} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); setOpen(value => !value); }}>
      <StudioHoverIcon name={selected.icon} /><StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} className="group-layout-toolbar-menu" aria-label="Justification" onClose={close} onClick={event => event.stopPropagation()}>
      {choices.map(choice => <button key={choice.value} type="button" role="menuitemradio" aria-checked={choice.value === current} className={choice.value === current ? "is-active" : ""} disabled={!writable} onClick={() => {
        if (!writable) return;
        onChange(choice.value);
        close();
      }}><StudioHoverIcon name={choice.icon} /><span>{choice.label}</span></button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
