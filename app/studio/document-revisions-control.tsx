"use client";
import { useRef, useState } from "react";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { BlockRenderer } from "../components/blocks/block-renderer";
import { InspectorAccordionSection } from "./inspector-accordion";
import type { StudioDocument } from "./editor-model";
import { revisionContent, type DocumentRevision } from "./document-revisions";
import { contentMediaIds, useTemplateMedia } from "./use-template-media";
import { StudioButton } from "./controls/button";

export function DocumentRevisionsControl({ document, writable, load, restore, mediaUrls = {} }: {
  document: StudioDocument; writable: boolean;
  load: () => Promise<DocumentRevision[]>;
  restore: (revision: StudioDocument, expected: StudioDocument) => Promise<void>;
  mediaUrls?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState(document);
  const opener = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const revision = revisions[selected];
  const previewMedia = useTemplateMedia(open && revision ? [...contentMediaIds(revision.document.blocks), ...(revision.document.coverImage?.mediaId ? [revision.document.coverImage.mediaId] : [])] : []);
  async function browse() {
    setBaseline(structuredClone(document));
    const request = ++generation.current;
    setOpen(true); setBusy(true); setError(""); setRevisions([]); setSelected(0);
    try {
      const items = await load();
      if (request !== generation.current) return;
      const seen = new Set<string>();
      const unique = [...items].sort((a, b) => Number(b.confirmed !== false) - Number(a.confirmed !== false) || Date.parse(b.savedAt) - Date.parse(a.savedAt)).filter(item => {
        const key = JSON.stringify(revisionContent(item.document));
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      setRevisions(unique);
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
  return <InspectorAccordionSection kind={document.kind} title="Revisions">
    <button ref={opener} type="button" onClick={() => { void browse(); }}>Browse saved versions</button>
    <p className="setting-note">Preview and restore earlier saved content.</p>
    {open ? <StudioDialog title="Revisions" className="document-revisions-dialog" returnFocus={opener} onClose={close}>
      <p>Saved content for <strong>{baseline.title || "Untitled"}</strong>. Restoring keeps current publication settings, categories, parent and template assignments. Your current content is saved before restoration.</p>
      {error ? <p role="alert">{error}</p> : null}
      {busy ? <p role="status">Loading or saving revisions…</p> : null}
      {!busy && !error && !revisions.length ? <p>No saved revisions yet. History starts with saved edits.</p> : null}
      {revisions.length ? <div className="document-revisions-content"><label>Saved version<select value={selected} disabled={busy} onChange={event => setSelected(Number(event.target.value))}>{revisions.map((item, index) => <option key={item.id} value={index}>{new Date(item.savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}{item.confirmed === false ? " — Retained snapshot" : index === 0 ? " — Latest saved" : ""}</option>)}</select></label>
        {revision?.confirmed === false ? <p className="setting-note">This legacy recovery snapshot has no saved-version confirmation. Preview its content before restoring.</p> : null}
        {previewMedia.error ? <p role="status">{previewMedia.error}</p> : null}
        {revision ? <article className="document-revision-preview studio-canvas" aria-label="Revision preview" onClickCapture={event => { if (event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}><h2>{revision.document.title || "Untitled"}</h2>{revision.document.subtitle ? <p>{revision.document.subtitle}</p> : null}{revision.document.excerpt ? <p>{revision.document.excerpt}</p> : null}<BlockRenderer variant="studio" document={revision.document} blocks={revision.document.blocks} mediaUrls={{ ...mediaUrls, ...previewMedia.urls }} showMissingMetadata={false} /></article> : null}
      </div> : null}
      <StudioDialogActions><StudioButton variant="secondary" type="button" disabled={busy} onClick={close}>Cancel</StudioButton><StudioButton type="button" disabled={busy || !writable || !revision || JSON.stringify(revisionContent(revision.document)) === JSON.stringify(revisionContent(document))} onClick={() => { void restoreSelected(); }}>Restore this revision</StudioButton></StudioDialogActions>
    </StudioDialog> : null}
  </InspectorAccordionSection>;
}
