"use client";

import { useEffect, useRef, useState } from "react";
import { LOCAL_PUBLICATIONS_KEY, parseLocallyPublishedArticles } from "../content/local-publishing";
import type { StudioWorkspace } from "./editor-model";
import {
  createStudioBackup,
  downloadStudioBackup,
  readStudioBackup,
  restoreStudioBackup,
  summariseStudioBackup,
  type StudioBackup,
  type StudioBackupSummary,
} from "./backup-store";
import { listMediaLibrary } from "./media-store";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupManager({ workspace }: { workspace: StudioWorkspace }) {
  const [currentSummary, setCurrentSummary] = useState<StudioBackupSummary | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<StudioBackup | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<StudioBackupSummary | null>(null);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("Ready to protect this local Studio");
  const [busy, setBusy] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void listMediaLibrary().then((library) => {
      const summary: StudioBackupSummary = {
        exportedAt: new Date().toISOString(),
        pages: workspace.documents.filter((document) => document.kind === "page").length,
        posts: workspace.documents.filter((document) => document.kind === "post").length,
        publishedPosts: parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY)).length,
        folders: library.folders.length,
        files: library.assets.length,
        fileBytes: library.assets.reduce((total, asset) => total + asset.size, 0),
      };
      queueMicrotask(() => { if (!cancelled) setCurrentSummary(summary); });
    }).catch(() => queueMicrotask(() => { if (!cancelled) setStatus("The local media library could not be counted"); }));
    return () => { cancelled = true; };
  }, [workspace.documents]);

  async function exportBackup() {
    setBusy(true);
    setStatus("Preparing content and media files…");
    try {
      const backup = await createStudioBackup(workspace);
      downloadStudioBackup(backup);
      setStatus(`Complete backup downloaded · ${backup.media.assets.length} ${backup.media.assets.length === 1 ? "file" : "files"} included`);
    } catch {
      setStatus("The complete backup could not be created");
    } finally {
      setBusy(false);
    }
  }

  async function selectBackup(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setSelectedBackup(null);
    setSelectedSummary(null);
    setConfirmed(false);
    setStatus("Checking the selected backup…");
    try {
      const backup = await readStudioBackup(file);
      setSelectedBackup(backup);
      setSelectedSummary(summariseStudioBackup(backup));
      setSelectedFilename(file.name);
      setStatus("Backup checked successfully. Review it before restoring.");
    } catch (error) {
      setSelectedFilename(file.name);
      setStatus(error instanceof Error ? error.message : "The selected backup could not be read");
    } finally {
      setBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  async function restoreBackup() {
    if (!selectedBackup || !confirmed) return;
    if (!window.confirm("Replace this browser's current Studio content and files with the checked backup?")) return;
    setBusy(true);
    setStatus("Restoring the checked backup…");
    try {
      await restoreStudioBackup(selectedBackup);
      window.location.reload();
    } catch {
      setBusy(false);
      setStatus("The backup could not be restored. Keep the backup file and try again.");
    }
  }

  return (
    <section className="backup-manager" aria-label="Backup and restore">
      <header className="backup-header"><span className="eyebrow">Recovery</span><h1>Backup and restore</h1><p>Protect everything currently held by this browser before relying on it for real writing.</p></header>

      <div className="backup-grid">
        <article className="backup-panel backup-export-panel">
          <div className="backup-panel-heading"><span>01</span><div><h2>Download a complete backup</h2><p>One file containing editable content, published snapshots, folders and the actual media files.</p></div></div>
          {currentSummary ? <BackupSummary summary={currentSummary} /> : <p className="backup-loading">Counting local content…</p>}
          <div className="backup-callout"><strong>Keep this file somewhere safe.</strong><p>It may contain private drafts and original media, so do not publish or share it casually.</p></div>
          <button className="backup-primary-action" type="button" onClick={() => void exportBackup()} disabled={busy}>{busy ? "Preparing backup…" : "Download complete backup"}</button>
        </article>

        <article className="backup-panel backup-restore-panel">
          <div className="backup-panel-heading"><span>02</span><div><h2>Check and restore a backup</h2><p>Selecting a file only checks it. Nothing is replaced until you review and confirm the restore.</p></div></div>
          <button className="backup-select-action" type="button" onClick={() => restoreInputRef.current?.click()} disabled={busy}>Choose backup file</button>
          <input ref={restoreInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void selectBackup(event.target.files?.[0])} />
          {selectedFilename ? <p className="backup-filename"><span>Selected file</span><strong>{selectedFilename}</strong></p> : null}
          {selectedSummary ? (
            <div className="restore-preview">
              <div className="restore-preview-heading"><span>✓</span><div><strong>Valid ACM Studio backup</strong><small>Exported {new Date(selectedSummary.exportedAt).toLocaleString("en-GB")}</small></div></div>
              <BackupSummary summary={selectedSummary} />
              <div className="restore-warning"><strong>This restore replaces current local data.</strong><p>Download a backup of the current Studio first if it contains anything you may need.</p></div>
              <label className="restore-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand that this will replace the content and files currently stored by this browser.</span></label>
              <button className="restore-action" type="button" disabled={!confirmed || busy} onClick={() => void restoreBackup()}>{busy ? "Restoring…" : "Restore checked backup"}</button>
            </div>
          ) : <div className="restore-empty"><span>⇣</span><p>A checked backup summary will appear here before any restore is possible.</p></div>}
        </article>
      </div>

      <footer className="backup-status" aria-live="polite">{status}</footer>
    </section>
  );
}

function BackupSummary({ summary }: { summary: StudioBackupSummary }) {
  return (
    <dl className="backup-summary">
      <div><dt>Pages</dt><dd>{summary.pages}</dd></div>
      <div><dt>Posts</dt><dd>{summary.posts}</dd></div>
      <div><dt>Published</dt><dd>{summary.publishedPosts}</dd></div>
      <div><dt>Folders</dt><dd>{summary.folders}</dd></div>
      <div><dt>Files</dt><dd>{summary.files}</dd></div>
      <div><dt>Media size</dt><dd>{formatBytes(summary.fileBytes)}</dd></div>
    </dl>
  );
}
