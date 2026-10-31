"use client";

import { useRef, useState } from "react";
import { MetadataVariationControl } from "./metadata-variation-control";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { preserveTextSelection } from "./editors/rich-text";
import { StudioHoverIcon } from "../studio-hover-icon";
import type { ContentBlock } from "../../content/model";

/** Date variations retain the owning document's publication/modification values. */
export function DateSourceControl({ source = "published", ...props }: {
  source?: "published" | "modified";
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (source: "published" | "modified") => void;
}) {
  return <MetadataVariationControl value={source} label="Date variation" icon="time.calendar" choices={[
    { value: "published", label: "Post Date", icon: "time.calendar" },
    { value: "modified", label: "Modified Date", icon: "time.calendar" },
  ]} {...props} />;
}

export function dateTimeToUtcInput(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, 19) : "";
}

export function utcInputToDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const normalised = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalised}.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === normalised ? date.toISOString() : null;
}

export function postDateWithSource(block: Extract<ContentBlock, { type: "post-date" }>, dateSource: "published" | "modified") {
  const next = { ...block, dateSource };
  if (dateSource === "modified") delete next.datetime;
  return next;
}

/** The toolbar owns this temporary form; the editor adapter commits the block value. */
export function DateTimeControl({ value, writable, open, onOpenChange, onApply }: {
  value?: string;
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (value?: string) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState("");
  const close = (restoreFocus = true) => {
    onOpenChange(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  const show = () => {
    setDraft(dateTimeToUtcInput(value));
    onOpenChange(!open);
  };
  const datetime = utcInputToDateTime(draft);
  return <div className="date-change-control">
    <button ref={trigger} type="button" className={open ? "is-active" : ""} disabled={!writable}
      aria-label="Change Date" title="Change Date" aria-haspopup="dialog" aria-expanded={open}
      onMouseDown={preserveTextSelection} onClick={show}><StudioHoverIcon name="time.calendar" /></button>
    {open ? <StudioAnchoredPopover anchor={() => trigger.current} label="Change Date" focusOnMount
      preferredWidth={300} onClose={restore => close(restore)} className="date-change-popover">
      <PopoverHeading closeLabel="Close Change Date" onClose={() => close()}>Change Date</PopoverHeading>
      <form onSubmit={event => { event.preventDefault(); if (datetime && writable) { onApply(datetime); close(); } }}>
        <label><span>Date and time (UTC)</span><input type="datetime-local" step="1" value={draft}
          onChange={event => setDraft(event.target.value)} aria-label="Date and time (UTC)" /></label>
        <div className="date-change-actions">
          <button type="submit" disabled={!writable || !datetime}>Apply</button>
          <button type="button" disabled={!writable || !value} onClick={() => { onApply(undefined); close(); }}>Reset to document date</button>
        </div>
      </form>
    </StudioAnchoredPopover> : null}
  </div>;
}
