"use client";

import { useRef, useState } from "react";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { groupFlexAlignment, groupUsesContentWidth, type GroupBlock, type GroupAlignmentChoice } from "./group-layout-alignment";

type Axis = "horizontalAlign" | "verticalAlign";
type Control = { field: Axis; label: string; choices: GroupAlignmentChoice[]; value: string };
type Props = { block: GroupBlock; writable: boolean; onUpdate: (update: (current: GroupBlock) => GroupBlock) => void };

/** Remount on variation/width-mode changes so an obsolete menu cannot remain open. */
export function GroupLayoutToolbar(props: Props) {
  return <GroupLayoutToolbarControls key={`${props.block.id}:${props.block.layout}:${groupUsesContentWidth(props.block)}:${props.writable}`} {...props} />;
}
function GroupLayoutToolbarControls({ block, writable, onUpdate }: Props) {
  const [open, setOpen] = useState<Axis | null>(null);
  const triggers = useRef<Partial<Record<Axis, HTMLButtonElement | null>>>({});
  const controls: Control[] = [];
  if (block.layout === "row" || block.layout === "stack") {
    const alignment = groupFlexAlignment(block);
    controls.push({ field: "horizontalAlign", ...alignment.horizontal }, { field: "verticalAlign", ...alignment.vertical });
  }
  function close(restoreFocus = true) {
    const trigger = open ? triggers.current[open] : null;
    setOpen(null);
    if (restoreFocus) trigger?.focus();
  }
  return <div className="group-layout-toolbar" role="group" aria-label="Group layout alignment">{controls.map(control => {
    const current = control.choices.find(choice => choice.value === control.value) ?? control.choices[0];
    const expanded = open === control.field;
    return <div className="alignment-control" key={control.field}>
      <button ref={element => { triggers.current[control.field] = element; }} className={`block-alignment-button${expanded ? " is-active" : ""}`} type="button" disabled={!writable} aria-label={control.label} title={control.label} aria-haspopup="menu" aria-expanded={expanded} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); setOpen(expanded ? null : control.field); }}>
        <StudioHoverIcon name={current.icon} /><StudioHoverIcon name="navigation.disclosure" size={16} />
      </button>
      {expanded ? <StudioAnchoredMenu anchor={() => triggers.current[control.field] ?? null} className="group-layout-toolbar-menu" aria-label={control.label} onClose={close} onClick={event => event.stopPropagation()}>
        {control.choices.map(choice => <button key={choice.value} type="button" role="menuitemradio" aria-checked={choice.value === control.value} className={choice.value === control.value ? "is-active" : ""} disabled={!writable} onClick={() => {
          if (!writable) return;
          onUpdate(currentBlock => currentBlock.layout === block.layout && groupUsesContentWidth(currentBlock) === groupUsesContentWidth(block) ? { ...currentBlock, [control.field]: choice.value } : currentBlock);
          close();
        }}><StudioHoverIcon name={choice.icon} /><span>{choice.label}</span></button>)}
        <button type="button" role="menuitem" className="group-layout-menu-close" aria-label={`Close ${control.label.toLowerCase()} menu`} onClick={() => close()}><StudioHoverIcon name="action.close" /><span>Close</span></button>
      </StudioAnchoredMenu> : null}
    </div>;
  })}</div>;
}
