"use client";

import { useState } from "react";
import { StudioButton } from "../controls/button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";

export type NavigationReviewItem = { id: string; label: string };

/** Confirms staged, site-owned menu changes before their owner persists them. */
export function NavigationReviewDialog({ items, opener, onClose, onSave }: {
  items: NavigationReviewItem[]; opener: HTMLElement | null; onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (busy) return;
    setBusy(true); setError(null);
    try { await onSave(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The navigation changes could not be saved. Your draft is preserved."); }
    finally { setBusy(false); }
  }
  return <StudioDialog title="Review changes" className="navigation-review-dialog" returnFocus={opener} closeDisabled={busy} onClose={onClose}>
    <p>There {items.length === 1 ? "is" : "are"} <strong>{items.length} navigation {items.length === 1 ? "change" : "changes"}</strong> waiting to be saved. Saving will save all pending changes for this site.</p>
    <details open className="navigation-review-group">
      <summary>NAVIGATION MENUS</summary>
      <div>{items.map(item => <p key={item.id} className="navigation-review-item">{item.label}</p>)}</div>
    </details>
    {error ? <p role="alert">{error}</p> : null}
    <StudioDialogActions><StudioButton variant="text" type="button" disabled={busy} onClick={onClose}>Cancel</StudioButton><StudioButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</StudioButton></StudioDialogActions>
  </StudioDialog>;
}
