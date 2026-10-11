"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { StudioDialog } from "./overlays/dialog";
import type { StudioDocument } from "./editor-model";
import { revisionContent, type DocumentRevision } from "./document-revisions";
import { revisionDiffRows, revisionDiffSections, revisionTimeline, revisionWordChanges, type RevisionDiffRow } from "./document-revision-diff";
import { StudioButton } from "./controls/button";
import { RangeControl } from "./controls/range-control";
import { StudioIcon } from "./studio-icons";

const dateLabel = (item: DocumentRevision) => `${new Date(item.savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}${item.confirmed === false ? " — Retained snapshot" : ""}`;

function ChangedLine({ row, side }: { row: RevisionDiffRow; side: "before" | "after" }) {
  const text = row[side];
  if (text === undefined) return null;
  if (!row.changed) return <>{text}</>;
  const pieces = row.before !== undefined && row.after !== undefined ? revisionWordChanges(row.before, row.after) : [{ kind: side === "before" ? "removed" : "added", text }];
  return <><span aria-hidden="true">{side === "before" ? "− " : "+ "}</span><span className="visually-hidden">{side === "before" ? "Removed: " : "Added: "}</span>{pieces.filter(piece => piece.kind !== (side === "before" ? "added" : "removed")).map((piece, index) => piece.kind === "same" ? <span key={index}>{piece.text}</span> : <mark key={index}>{piece.text}</mark>)}</>;
}

function DiffTable({ label, before, after }: { label: string; before: string; after: string }) {
  const rows = useMemo(() => revisionDiffRows(before, after), [before, after]);
  const [limit, setLimit] = useState(500);
  return <section className="document-revision-section" aria-label={`${label} comparison`}>
    <h3>{label}</h3>
    <table className="document-revision-diff"><caption className="visually-hidden">{label}: removed and added content</caption><thead><tr><th scope="col">Removed</th><th scope="col">Added</th></tr></thead><tbody>{rows.slice(0, limit).map((row, index) => <tr key={index}>
      <td className={row.changed && row.before !== undefined ? "is-removed" : ""}><ChangedLine row={row} side="before" /></td>
      <td className={row.changed && row.after !== undefined ? "is-added" : ""}><ChangedLine row={row} side="after" /></td>
    </tr>)}</tbody></table>
    {!rows.length ? <p className="setting-note">No content in either version.</p> : null}
    {rows.length > limit ? <StudioButton variant="secondary" onClick={() => setLimit(value => value + 500)}>Show More Lines ({rows.length - limit} Remaining)</StudioButton> : null}
  </section>;
}

export function DocumentRevisionsControl({ document, writable, load, restore, refreshKey, refreshStatus }: {
  document: StudioDocument; writable: boolean; refreshKey: unknown; refreshStatus: string;
  load: () => Promise<DocumentRevision[]>;
  restore: (revision: StudioDocument, expected: StudioDocument) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [selected, setSelected] = useState(0);
  const [from, setFrom] = useState(0);
  const [compareAny, setCompareAny] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState(document);
  const opener = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const readHistory = useEffectEvent(load);
  useEffect(() => {
    let cancelled = false;
    // Refresh the count after source/save changes, without reading history on every keystroke.
    const timer = window.setTimeout(() => {
      void readHistory().then(items => { if (!cancelled) setCount(revisionTimeline(items).length); }).catch(() => { if (!cancelled) setCount(null); });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [refreshKey, refreshStatus]);
  const revision = revisions[selected];
  const previous = revisions[compareAny ? from : selected - 1];
  const sections = useMemo(() => revision ? revisionDiffSections(previous?.document, revision.document) : [], [previous, revision]);
  async function browse() {
    setBaseline(structuredClone(document));
    const request = ++generation.current;
    setOpen(true); setBusy(true); setError(""); setRevisions([]); setCompareAny(false);
    try {
      const items = revisionTimeline(await load());
      if (request !== generation.current) return;
      setRevisions(items); setCount(items.length); setSelected(Math.max(0, items.length - 1)); setFrom(Math.max(0, items.length - 2));
    } catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : "Revisions could not be loaded."); }
    finally { if (request === generation.current) setBusy(false); }
  }
  function close() { generation.current++; setOpen(false); }
  async function restoreSelected() {
    if (!revision || busy || !writable) return;
    const request = generation.current;
    setBusy(true); setError("");
    try { await restore(revision.document, baseline); if (request === generation.current) setOpen(false); }
    catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : "The revision could not be restored. Your draft was preserved."); }
    finally { if (request === generation.current) setBusy(false); }
  }
  return <div className="document-revisions-entry">
    <span>Revisions</span><button ref={opener} type="button" aria-label={`Revisions: ${count ?? "view saved versions"}`} onClick={() => { void browse(); }}>{count ?? "View"}</button>
    {open ? <StudioDialog title={`Compare revisions of “${baseline.title || "Untitled"}”`} className="document-revisions-screen" returnFocus={opener} onClose={close}>
      <div className="document-revision-topbar"><StudioButton variant="text" onClick={close}><StudioIcon name="arrow-left" size={18} /> Go to Editor</StudioButton>
        {revisions.length > 1 ? <label><input type="checkbox" disabled={busy} checked={compareAny} onChange={event => { setCompareAny(event.target.checked); setFrom(Math.max(0, selected - 1)); }} /> Compare any two revisions</label> : null}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {busy ? <p role="status">Loading or saving revisions…</p> : null}
      {!busy && !error && !revisions.length ? <p>No saved revisions yet. History starts with saved edits.</p> : null}
      {revision ? <>
        <div className="document-revision-timeline">
          <StudioButton variant="secondary" disabled={busy || selected === 0} onClick={() => setSelected(value => value - 1)}>Previous</StudioButton>
          <div className="document-revision-sliders">
            {compareAny ? <label>From: {dateLabel(revisions[from])}<RangeControl aria-label="Compare from revision" aria-valuetext={dateLabel(revisions[from])} tooltipText={dateLabel(revisions[from])} min={0} max={Math.max(1, revisions.length - 1)} step={1} value={from} disabled={busy} onChange={event => setFrom(Number(event.target.value))} /></label> : null}
            <label><span>{compareAny ? "To" : "Select a revision"}: {selected + 1} of {revisions.length}</span><RangeControl aria-label="Select revision" aria-valuetext={dateLabel(revision)} tooltipText={dateLabel(revision)} min={0} max={Math.max(1, revisions.length - 1)} step={1} value={selected} disabled={busy || revisions.length < 2} onChange={event => setSelected(Number(event.target.value))} /></label>
          </div>
          <StudioButton variant="secondary" disabled={busy || selected >= revisions.length - 1} onClick={() => setSelected(value => value + 1)}>Next</StudioButton>
        </div>
        <div className="document-revision-summary"><div aria-live="polite"><strong>{selected === revisions.length - 1 && revision.confirmed !== false ? "Latest saved revision" : "Revision"}</strong><span>{dateLabel(revision)}{revision.document.author ? ` · ${revision.document.author}` : ""}</span><span>Compared with {previous ? dateLabel(previous) : "empty content before the first retained version"}</span></div>
          <StudioButton disabled={busy || !writable || JSON.stringify(revisionContent(revision.document)) === JSON.stringify(revisionContent(document))} onClick={() => { void restoreSelected(); }}>Restore This Revision</StudioButton>
        </div>
        {revision.confirmed === false || previous?.confirmed === false ? <p className="setting-note">Retained snapshots are legacy recovery copies without saved-version confirmation.</p> : null}
        <p className="setting-note">Restoring saves your current draft first and keeps current publication settings, categories, parent and template assignments.</p>
        <div className="document-revision-comparison" key={`${previous?.id ?? "empty"}:${revision.id}`}>{sections.map(section => section.label === "Block data" ? <details className="document-revision-block-data" key={section.label}><summary>Block data changes</summary><DiffTable {...section} /></details> : <DiffTable key={section.label} {...section} />)}</div>
      </> : null}
    </StudioDialog> : null}
  </div>;
}
