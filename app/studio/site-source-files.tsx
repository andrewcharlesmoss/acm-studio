"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioIcon } from "./studio-icons";

type SourceFile = { path: string; size: number; kind: "text" | "image" | "binary"; content?: string; mime?: string; data?: string };
type SourceSnapshot = { version: number; siteId: string; capturedAt: string; source: string; revision: string; hasLocalChanges: boolean; files: SourceFile[] };
type Folder = { files: SourceFile[]; folders: Map<string, Folder> };

function fileTree(files: SourceFile[]) {
  const root: Folder = { files: [], folders: new Map() };
  for (const file of files) {
    const parts = file.path.split("/");
    let parent = root;
    for (const part of parts.slice(0, -1)) {
      if (!parent.folders.has(part)) parent.folders.set(part, { files: [], folders: new Map() });
      parent = parent.folders.get(part)!;
    }
    parent.files.push(file);
  }
  return root;
}

function FolderFiles({ folder, selected, onSelect }: { folder: Folder; selected: string; onSelect: (path: string) => void }) {
  return <>{[...folder.folders].map(([name, child]) => <details key={name} open><summary><StudioIcon name="archive" size={16} />{name}</summary><div className="source-folder-children"><FolderFiles folder={child} selected={selected} onSelect={onSelect} /></div></details>)}{folder.files.map((file) => <button key={file.path} className={file.path === selected ? "is-active" : ""} onClick={() => onSelect(file.path)} aria-current={file.path === selected ? "true" : undefined} title={file.path}><StudioIcon name={file.kind === "image" ? "image" : "file"} size={16} /><span>{file.path.split("/").at(-1)}</span></button>)}</>;
}

export function SiteSourceFiles() {
  const [snapshot, setSnapshot] = useState<SourceSnapshot | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("app/page.tsx");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/site-previews/mini-golf-files.json", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("The project files could not be loaded.");
      const data = await response.json() as SourceSnapshot;
      if (data.version !== 1 || data.siteId !== "mini-golf-scorecard" || !Array.isArray(data.files)) throw new Error("The project file snapshot is unsupported.");
      setSnapshot(data);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The project files could not be loaded."); });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => snapshot?.files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase().trim())) ?? [], [snapshot, query]);
  const tree = useMemo(() => fileTree(filtered), [filtered]);
  const file = snapshot?.files.find((item) => item.path === selected);
  if (error) return <p className="source-loading" role="alert">{error}</p>;
  if (!snapshot) return <p className="source-loading" role="status">Loading project files…</p>;
  return <section className="site-source-files" aria-label="Mini Golf project files">
    <header className="source-heading"><div><h1>Project files</h1><p>Local source snapshot · {snapshot.files.length} files · {new Date(snapshot.capturedAt).toLocaleDateString("en-GB")}</p></div><span>Read-only</span></header>
    <p className="source-note">{snapshot.hasLocalChanges ? "Includes local changes that may differ from the live site. " : ""}Private environment files, dependencies and generated output are excluded.</p>
    <div className="source-browser">
      <nav className="source-tree" aria-label="Project file tree"><label>Find a file<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file names…" /></label>{filtered.length ? <FolderFiles folder={tree} selected={selected} onSelect={setSelected} /> : <p>No matching files.</p>}</nav>
      <section className="source-file" aria-label="File contents">{file ? <><header><strong>{file.path}</strong><span>{file.size.toLocaleString("en-GB")} bytes</span></header>{file.kind === "text" ? <pre aria-label={`Code for ${file.path}`}><code>{file.content}</code></pre> : file.kind === "image" ? <div className="source-image">{/* Snapshot bytes must render locally without an image optimisation service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:${file.mime};base64,${file.data}`} alt={file.path} /></div> : <p className="source-loading">Binary file · {file.mime}. Code preview is not available for this format.</p>}</> : <p>Select a file to view its contents.</p>}</section>
    </div>
  </section>;
}
