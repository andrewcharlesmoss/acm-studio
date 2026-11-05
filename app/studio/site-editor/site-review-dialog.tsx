"use client";

import { useState } from "react";
import { CheckboxControl } from "../controls/checkbox-control";
import { StudioButton } from "../controls/button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import type { PreviewScope } from "./identity-preview-state";
import "./site-review-dialog.css";

export type SiteReviewItem = { scope: PreviewScope; label: string; details: string[] };

export function SiteReviewDialog({ items, opener, onClose, onSave, onDiscard }: { items: SiteReviewItem[]; opener: HTMLElement | null; onClose: () => void; onSave: (scopes: PreviewScope[]) => Promise<void>; onDiscard: (scopes: PreviewScope[]) => Promise<void> }) {
  const [selected, setSelected] = useState<PreviewScope[]>(() => items.map(item => item.scope));
  const effectiveSelected = selected.filter(scope => items.some(item => item.scope === scope));
  const [busy, setBusy] = useState<"save" | "discard" | null>(null);
  const [error, setError] = useState("");
  async function save() {
    if (busy || !effectiveSelected.length) return;
    setBusy("save"); setError("");
    try { await onSave(effectiveSelected); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Changes could not be saved. Your draft was preserved."); }
    finally { setBusy(null); }
  }
  async function discard() {
    if (busy || !effectiveSelected.length) return;
    setBusy("discard"); setError("");
    try { await onDiscard(effectiveSelected); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Changes could not be discarded. Your draft was preserved."); }
    finally { setBusy(null); }
  }
  return <StudioDialog title="Review changes" className="navigation-review-dialog site-review-dialog" returnFocus={opener} closeDisabled={Boolean(busy)} onClose={onClose}>
    <p>{effectiveSelected.length ? <>There {items.length === 1 ? "is" : "are"} <strong>{items.length} {items.length === 1 ? "change" : "changes"}</strong> waiting to be saved.</> : "Select the items you want to save."}</p>
    <p>Review Identity, Styles and Navigation changes. Pages and templates are saved in their editors.</p>
    <div className="navigation-review-group">{items.map(item => <div className="site-review-item" key={item.scope}>
      <CheckboxControl label={item.label} checked={selected.includes(item.scope)} disabled={Boolean(busy)} onChange={checked => setSelected(current => checked ? [...current, item.scope] : current.filter(scope => scope !== item.scope))} />
      <ul>{item.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
    </div>)}</div>
    {error ? <p role="alert">{error}</p> : null}
    <StudioDialogActions><StudioButton variant="text" type="button" disabled={Boolean(busy)} onClick={onClose}>Cancel</StudioButton><StudioButton variant="text" type="button" disabled={Boolean(busy) || !effectiveSelected.length} onClick={() => void discard()}>{busy === "discard" ? "Discarding…" : "Don’t Save"}</StudioButton><StudioButton type="button" disabled={Boolean(busy) || !effectiveSelected.length} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save"}</StudioButton></StudioDialogActions>
  </StudioDialog>;
}
