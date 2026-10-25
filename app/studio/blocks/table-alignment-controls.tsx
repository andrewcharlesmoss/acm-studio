"use client";

import { useRef, useState } from "react";
import type { ContentBlock, TableCellMetadata, TextAlignment } from "../../content/model";
import { setTableCellAlignment, tableCellPresentation, type TableCellPosition } from "../../content/table-presentation";
import { validTableActiveCell } from "../../content/table-actions";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { AcmIcon } from "@acm/icons/react";
import { AlignmentIcon } from "./editors/rich-text";

/** Production and Library share the same target validation, actions and dismissal. */
export function TableAlignmentControls({ block, activeCell, scope = "cell", writable = true, onChange }: {
  block: Extract<ContentBlock, { type: "table" }>;
  activeCell?: TableCellPosition | null;
  scope?: "cell" | "column";
  writable?: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const valid = validTableActiveCell(block, activeCell);
  const cell = valid ? { ...block.columnStyles?.[activeCell.columnIndex], ...(scope === "cell" ? block.cellMetadata?.[activeCell.rowIndex]?.[activeCell.columnIndex] : {}) } : undefined;
  const effective = valid ? tableCellPresentation(block, activeCell.rowIndex, activeCell.columnIndex) : {};
  const label = scope === "column" ? "Align column content" : "Cell alignment";
  function apply(patch: Pick<TableCellMetadata, "textAlign" | "verticalAlign">) {
    if (!writable || !validTableActiveCell(block, activeCell)) return;
    onChange(setTableCellAlignment(block, activeCell, patch, scope));
    setOpen(false);
    trigger.current?.focus();
  }
  return <div className="alignment-control">
    <button ref={trigger} type="button" className={`alignment-button${open ? " is-active" : ""}`} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} disabled={!writable || !valid} onMouseDown={event => event.preventDefault()} onClick={() => setOpen(current => !current)}>
      {scope === "column" ? <AlignmentIcon align={effective.textAlign === "center" ? "centre" : effective.textAlign ?? "left"} /> : <AcmIcon name="block.table" scale="Regular-M" size={24} />}
      <AcmIcon name="navigation.disclosure" scale="Regular-M" size={16} />
    </button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} className="alignment-menu table-alignment-menu" aria-label={label} onClose={restore => { setOpen(false); if (restore !== false) trigger.current?.focus(); }}>
      {(["left", "centre", "right"] as TextAlignment[]).map(textAlign => <button key={textAlign} type="button" role="menuitemradio" aria-checked={cell?.textAlign === textAlign} onMouseDown={event => event.preventDefault()} onClick={() => apply({ textAlign })}><AlignmentIcon align={textAlign} /><span>Align {scope} {textAlign}</span></button>)}
      {(["top", "middle", "bottom"] as const).map(verticalAlign => <button key={verticalAlign} type="button" role="menuitemradio" aria-checked={cell?.verticalAlign === verticalAlign} onMouseDown={event => event.preventDefault()} onClick={() => apply({ verticalAlign })}><span>Align {scope} {verticalAlign}</span></button>)}
      <button type="button" role="menuitem" onClick={() => apply({ textAlign: undefined, verticalAlign: undefined })}>Reset {scope} alignment</button>
    </StudioAnchoredMenu> : null}
  </div>;
}
