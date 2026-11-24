"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { StudioButton } from "../controls/button";
import { SelectControl } from "../controls/native-fields";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";

type PackageChoice = { id: string; label: string; declared: string };
type Review = { reviewId: string; previous: string; version: string; diff: string };

async function requestVersionChange<T>(payload: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/__studio/package-version", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Studio-Client": "package-dashboard" },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Studio couldn’t complete the package request. Try again.");
  }
  return data as T;
}

export function PackageVersionDialog({ packages, opener, onClose, onApplied }: {
  packages: PackageChoice[];
  opener: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const [packageId, setPackageId] = useState("");
  const [versions, setVersions] = useState<string[] | null>(null);
  const [version, setVersion] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState<"review" | "apply" | null>(null);
  const [error, setError] = useState("");
  const reviewSummary = useRef<HTMLParagraphElement>(null);
  const selected = packages.find(pkg => pkg.id === packageId);
  const currentVersion = selected?.declared;
  const hasAlternative = versions?.some(item => item !== currentVersion);
  const canReview = Boolean(version && version !== currentVersion && versions?.includes(version));
  const displayedVersion = version || (!hasAlternative && currentVersion && versions?.includes(currentVersion) ? currentVersion : "");

  useEffect(() => {
    if (!packageId) return;
    const controller = new AbortController();
    void requestVersionChange<{ versions: string[] }>({ action: "versions", packageId }, controller.signal).then(result => {
      if (!controller.signal.aborted) setVersions(result.versions);
    }).catch(reason => {
      if (!controller.signal.aborted) {
        setVersions([]);
        setError(reason.message);
      }
    });
    return () => controller.abort();
  }, [packageId]);

  useEffect(() => { if (review) reviewSummary.current?.focus(); }, [review]);

  async function reviewChange() {
    setBusy("review");
    setError("");
    try {
      setReview(await requestVersionChange<Review>({ action: "review", packageId, version }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Studio couldn’t prepare the review.");
    } finally { setBusy(null); }
  }

  async function applyChange() {
    if (!review || !selected) return;
    setBusy("apply");
    setError("");
    try {
      const result = await requestVersionChange<{ applied: boolean; version: string }>({ action: "apply", reviewId: review.reviewId });
      if (!result.applied || result.version !== review.version) throw new Error("Studio couldn’t confirm the saved version. Refresh the dashboard and check the dependency files.");
      onApplied(`${selected.label} v${result.version} is saved in Studio’s dependency files. Run npm ci and restart Studio to use it locally.`);
    } catch (reason) {
      setReview(null);
      setError(reason instanceof Error ? reason.message : "Studio couldn’t confirm the change.");
    } finally { setBusy(null); }
  }

  return <StudioDialog title="Change Studio package version" className="studio-dialog-wide package-version-dialog" returnFocus={opener}
    onClose={onClose} closeDisabled={busy !== null}>
    <form onSubmit={event => { event.preventDefault(); if (!review && !busy && canReview) void reviewChange(); }}>
      <div className="package-version-fields">
        <label>Package<SelectControl value={packageId} disabled={busy !== null || review !== null} onChange={event => {
          setPackageId(event.target.value);
          setVersion("");
          setVersions(null);
          setError("");
        }}>
          <option value="">Choose a package</option>
          {packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.label}</option>)}
        </SelectControl></label>
        <label>Published version<SelectControl value={displayedVersion} disabled={busy !== null || review !== null || !hasAlternative}
          onChange={event => { setVersion(event.target.value); setError(""); }}>
          <option value="">Choose a version</option>
          {versions?.map(item => <option value={item} key={item} disabled={item === currentVersion}>
            v{item}{item === currentVersion ? " (current)" : ""}
          </option>)}
        </SelectControl></label>
      </div>
      {packageId && !versions ? <p role="status">Checking published versions…</p> : null}
      {versions && !hasAlternative && !error ? <p role="status">No other published versions are available for this package.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {review && selected ? <section aria-label="Proposed dependency change">
        <p ref={reviewSummary} tabIndex={-1}><strong>{selected.label}</strong> will change from <strong>v{review.previous}</strong> to <strong>v{review.version}</strong> in ACM Studio.</p>
        <p>Apply updates this checkout’s <code>package.json</code> and <code>package-lock.json</code>. Install dependencies and restart Studio to use the selected version.</p>
        <details className="package-version-diff"><summary>Dependency file changes</summary><pre>{review.diff}</pre></details>
      </section> : null}
      <StudioDialogActions>
        <StudioButton type="button" variant="secondary" disabled={busy !== null} onClick={review ? () => setReview(null) : onClose}>{review ? "Back" : "Cancel"}</StudioButton>
        {review ? <StudioButton key="apply" type="button" disabled={busy !== null} onClick={() => void applyChange()}>{busy ? "Applying…" : "Apply Version Change"}</StudioButton>
          : <StudioButton key="review" type="submit" disabled={!canReview || busy !== null}>{busy ? "Preparing Review…" : "Review Change"}</StudioButton>}
      </StudioDialogActions>
    </form>
  </StudioDialog>;
}
