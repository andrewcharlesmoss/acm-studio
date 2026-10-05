"use client";

import { useState, type RefObject } from "react";
import type { BlockEditorial } from "../content/block-editorial";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";

export function BlockEditorialDialog({ kind, value, trigger, onApply, onClose, writable }: { kind: "rename" | "note" | "lock"; value: BlockEditorial; trigger: RefObject<HTMLElement | null>; onApply: (value: BlockEditorial) => void; onClose: () => void; writable: boolean }) {
  const [draft, setDraft] = useState(value);
  const title = kind === "rename" ? "Rename block" : kind === "note" ? "Block note" : "Lock block";
  return <StudioDialog title={title} className="block-editorial-dialog" returnFocus={trigger} onClose={onClose}>
    <form onSubmit={event => { event.preventDefault(); if (writable) onApply(draft); }}>
      {kind === "rename" ? <label>Block name<input disabled={!writable} maxLength={100} value={draft.name ?? ""} onChange={event => setDraft({ ...draft, name: event.target.value })} /><span>Shown in List View. Leave blank to use the block’s default name.</span></label> : null}
      {kind === "note" ? <label>Note<textarea disabled={!writable} rows={5} maxLength={4000} value={draft.note ?? ""} onChange={event => setDraft({ ...draft, note: event.target.value })} /><span>A private authoring note for this block.</span></label> : null}
      {kind === "lock" ? <><p>Restrict moving or deleting this block. Its content remains editable.</p><label className="block-lock-option"><input disabled={!writable} type="checkbox" checked={draft.lock?.move ?? false} onChange={event => setDraft({ ...draft, lock: { ...draft.lock, move: event.target.checked } })} />Disable movement</label><label className="block-lock-option"><input disabled={!writable} type="checkbox" checked={draft.lock?.remove ?? false} onChange={event => setDraft({ ...draft, lock: { ...draft.lock, remove: event.target.checked } })} />Prevent removal</label></> : null}
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={onClose}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable}>Save</StudioButton></StudioDialogActions>
    </form>
  </StudioDialog>;
}
