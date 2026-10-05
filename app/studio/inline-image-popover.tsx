"use client";

import { useState } from "react";
import type { InlineImage } from "../content/model";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { PopoverHeading } from "./overlays/popover-heading";
import { StudioButton } from "./controls/button";
import { StudioDialogActions } from "./overlays/dialog";

/** Width and alternative text stay transient until one changed-only Apply. */
export function InlineImagePopover({ value, anchor, onApply, onReplace, onClose }: {
  value: InlineImage;
  anchor: () => HTMLElement | null;
  onApply: (value: InlineImage) => boolean;
  onReplace: () => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const [width, setWidth] = useState(value.width?.toString() ?? "");
  const [alt, setAlt] = useState(value.alt);
  const [conflict, setConflict] = useState(false);
  const number = width === "" ? undefined : Number(width);
  const valid = number === undefined || Number.isInteger(number) && number >= 1 && number <= 2400;
  const changed = number !== value.width || alt !== value.alt;
  return <StudioAnchoredPopover anchor={anchor} label="Inline image" className="inline-image-popover" onClose={onClose}>
    <PopoverHeading closeLabel="Close inline image" onClose={() => onClose(true)}>Inline image</PopoverHeading>
    <form onSubmit={event => {
      event.preventDefault();
      if (!valid || !changed || conflict) return;
      const next = { ...value, alt, width: number };
      if (number === undefined) delete next.width;
      if (!onApply(next)) setConflict(true);
    }}>
      <label>Width<input data-inline-image-width="true" type="number" min={1} max={2400} step={1} placeholder="Auto" value={width} aria-invalid={!valid || undefined} onChange={event => setWidth(event.target.value)} /></label>
      <label>Alternative text<input value={alt} maxLength={1000} onChange={event => setAlt(event.target.value)} /></label>
      {conflict ? <p role="alert">This image changed elsewhere. Close and reopen it to edit the latest version.</p> : !valid ? <p role="alert">Width must be a whole number from 1 to 2400.</p> : null}
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={onReplace}>Replace image</StudioButton><StudioButton type="submit" disabled={!valid || !changed || conflict}>Apply</StudioButton></StudioDialogActions>
    </form>
  </StudioAnchoredPopover>;
}
