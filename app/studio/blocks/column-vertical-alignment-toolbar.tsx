"use client";

import { useRef, useState } from "react";
import type { IconName } from "@acm/icons";
import type { ContentBlock, LayoutVerticalAlignment } from "../../content/model";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";

type ColumnBlock = Extract<ContentBlock, { type: "column" }>;
type AlignmentChoice = { value: LayoutVerticalAlignment | undefined; label: string; icon: IconName };
type Props = {
  block: ColumnBlock;
  inheritedVerticalAlign?: LayoutVerticalAlignment;
  writable: boolean;
  onChange: (alignment: LayoutVerticalAlignment | undefined) => void;
};

const choices: AlignmentChoice[] = [
  { value: undefined, label: "Use Columns setting", icon: "action.reset" },
  { value: "top", label: "Align top", icon: "layout.align-top" },
  { value: "centre", label: "Align middle", icon: "layout.align-middle" },
  { value: "bottom", label: "Align bottom", icon: "layout.align-bottom" },
  { value: "stretch", label: "Stretch to fill", icon: "layout.align-stretch" },
];

/** Exposes a child Column override while preserving its parent Columns alignment. */
export function ColumnVerticalAlignmentToolbar(props: Props) {
  return <ColumnVerticalAlignmentToolbarControls key={`${props.block.id}:${props.inheritedVerticalAlign ?? "stretch"}:${props.writable}`} {...props} />;
}

function ColumnVerticalAlignmentToolbarControls({ block, inheritedVerticalAlign, writable, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const effectiveAlignment = block.verticalAlign ?? inheritedVerticalAlign ?? "stretch";
  const current = choices.find(choice => choice.value === effectiveAlignment) ?? choices[4];

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  return <div className="alignment-control column-vertical-alignment-toolbar">
    <button ref={trigger} className={`block-alignment-button${open ? " is-active" : ""}`} type="button" disabled={!writable} aria-label="Vertical alignment" title="Vertical alignment" aria-haspopup="menu" aria-expanded={open} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); setOpen(value => !value); }}>
      <StudioHoverIcon name={current.icon} /><StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} className="group-layout-toolbar-menu" aria-label="Vertical alignment" onClose={close} onClick={event => event.stopPropagation()}>
      {choices.map(choice => <button key={choice.label} type="button" role="menuitemradio" aria-checked={choice.value === block.verticalAlign} className={choice.value === block.verticalAlign ? "is-active" : ""} disabled={!writable} onClick={() => {
        if (!writable) return;
        onChange(choice.value);
        close();
      }}><StudioHoverIcon name={choice.icon} /><span>{choice.label}</span></button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
