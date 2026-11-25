"use client";

import { useEffect, useRef, useState } from "react";
import { StudioButton } from "../controls/button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";

export type PackageChoice = { id: string; label: string; version: string };
type Review = { reviewId: string; previous: string; version: string; diff: string };

async function requestVersionChange<T>(payload: Record<string, string>): Promise<T> {
  const response = await fetch("/__studio/package-version", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Studio-Client": "package-dashboard" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Studio couldn’t complete the package request. Try again.");
  }
  return data as T;
}

export function PackageVersionDialog({ selected, opener, onClose, onApplied }: {
  selected: PackageChoice;
  opener: HTMLSelectElement;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const reviewSummary = useRef<HTMLParagraphElement>(null);
  const reviewTask = useRef<Promise<Review> | null>(null);
  const { id: packageId, version } = selected;

  useEffect(() => {
    let open = true;
    // Strict Mode can repeat the effect setup. Reuse the same server review.
    reviewTask.current ??= requestVersionChange<Review>({ action: "review", packageId, version });
    void reviewTask.current.then(result => {
      if (open) setReview(result);
    }).catch(reason => {
      if (open) setError(reason instanceof Error ? reason.message : "Studio couldn’t prepare the review.");
    });
    return () => { open = false; };
  }, [packageId, version]);

  useEffect(() => { if (review) reviewSummary.current?.focus(); }, [review]);

  async function applyChange() {
    if (!review) return;
    setApplying(true);
    setError("");
    try {
      const result = await requestVersionChange<{ applied: boolean; version: string }>({ action: "apply", reviewId: review.reviewId });
      if (!result.applied || result.version !== review.version) throw new Error("Studio couldn’t confirm the saved version. Refresh the dashboard and check the dependency files.");
      onApplied(`${selected.label} v${result.version} is saved in Studio’s dependency files. Run npm ci and restart Studio to use it locally.`);
    } catch (reason) {
      setReview(null);
      setError(reason instanceof Error ? reason.message : "Studio couldn’t confirm the change.");
    } finally { setApplying(false); }
  }

  return <StudioDialog title={`Change ${selected.label} version`} className="studio-dialog-wide package-version-dialog" returnFocus={opener}
    onClose={onClose} closeDisabled={applying}>
      {!review && !error ? <p role="status">Preparing the review for v{version}…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {review ? <section aria-label="Proposed dependency change">
        <p ref={reviewSummary} tabIndex={-1}><strong>{selected.label}</strong> will change from <strong>v{review.previous}</strong> to <strong>v{review.version}</strong> in ACM Studio.</p>
        <p>Apply updates this checkout’s <code>package.json</code> and <code>package-lock.json</code>. Install dependencies and restart Studio to use the selected version.</p>
        <details className="package-version-diff"><summary>Dependency file changes</summary><pre>{review.diff}</pre></details>
      </section> : null}
      <StudioDialogActions>
        <StudioButton type="button" variant="secondary" disabled={applying} onClick={onClose}>Cancel</StudioButton>
        <StudioButton type="button" disabled={!review || applying} onClick={() => void applyChange()}>{applying ? "Applying…" : "Apply Version Change"}</StudioButton>
      </StudioDialogActions>
  </StudioDialog>;
}
