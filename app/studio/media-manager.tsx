"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMediaFiles,
  createMediaFolder,
  deleteMediaAsset,
  deleteMediaFolder,
  listMediaLibrary,
  renameMediaFolder,
  updateMediaAsset,
  type MediaAsset,
  type MediaFolder,
} from "./media-store";

type MediaFilter = "all" | "image" | "document" | "video" | "audio";
type MediaSort = "newest" | "name" | "size";

type MediaManagerProps = {
  targetLabel: string;
  targetKind?: "block" | "cover";
  onInsertImage: (asset: MediaAsset, objectUrl: string) => void;
};

function fileKind(type: string): Exclude<MediaFilter, "all"> {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "document";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileGlyph(type: string) {
  const kind = fileKind(type);
  if (kind === "video") return "▶";
  if (kind === "audio") return "♪";
  if (kind === "image") return "▧";
  return "DOC";
}

export function MediaManager({ targetLabel, targetKind = "block", onInsertImage }: MediaManagerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [status, setStatus] = useState("Loading local files…");
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Record<string, string>>({});

  async function refreshLibrary(message = "Files stored locally in this browser") {
    try {
      const library = await listMediaLibrary();
      const nextUrls: Record<string, string> = {};
      for (const asset of library.assets) {
        if (asset.type.startsWith("image/")) nextUrls[asset.id] = URL.createObjectURL(asset.blob);
      }
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = nextUrls;
      setObjectUrls(nextUrls);
      setAssets(library.assets);
      setFolders(library.folders);
      setStatus(message);
    } catch {
      setStatus("The local media library is unavailable in this browser");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void listMediaLibrary().then((library) => {
      if (cancelled) return;
      const nextUrls: Record<string, string> = {};
      for (const asset of library.assets) {
        if (asset.type.startsWith("image/")) nextUrls[asset.id] = URL.createObjectURL(asset.blob);
      }
      queueMicrotask(() => {
        if (cancelled) {
          Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        objectUrlsRef.current = nextUrls;
        setObjectUrls(nextUrls);
        setAssets(library.assets);
        setFolders(library.folders);
        setStatus("Files stored locally in this browser");
      });
    }).catch(() => {
      if (!cancelled) queueMicrotask(() => setStatus("The local media library is unavailable in this browser"));
    });
    return () => {
      cancelled = true;
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = {};
    };
  }, []);

  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) ?? null : null;

  const breadcrumbs = useMemo(() => {
    const path: MediaFolder[] = [];
    let folder = currentFolderId ? folderMap.get(currentFolderId) : undefined;
    while (folder) {
      path.unshift(folder);
      folder = folder.parentId ? folderMap.get(folder.parentId) : undefined;
    }
    return path;
  }, [currentFolderId, folderMap]);

  const visibleFolders = useMemo(() => folders
    .filter((folder) => query.trim() ? folder.name.toLowerCase().includes(query.trim().toLowerCase()) : folder.parentId === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name)), [currentFolderId, folders, query]);

  const visibleAssets = useMemo(() => {
    const search = query.trim().toLowerCase();
    return assets
      .filter((asset) => search ? `${asset.name} ${asset.altText} ${asset.caption}`.toLowerCase().includes(search) : asset.folderId === currentFolderId)
      .filter((asset) => filter === "all" || fileKind(asset.type) === filter)
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "size") return b.size - a.size;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [assets, currentFolderId, filter, query, sort]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const tooLarge = selected.find((file) => file.size > 100 * 1024 * 1024);
    if (tooLarge) {
      setStatus(`${tooLarge.name} is larger than the 100 MB local limit`);
      return;
    }
    setStatus(`Adding ${selected.length} ${selected.length === 1 ? "file" : "files"}…`);
    await addMediaFiles(selected, currentFolderId);
    await refreshLibrary(`${selected.length} ${selected.length === 1 ? "file" : "files"} added locally`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function addFolder() {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    await createMediaFolder(name, currentFolderId);
    await refreshLibrary(`Folder “${name.trim()}” created`);
  }

  async function saveAsset(update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>) {
    if (!selectedAsset) return;
    await updateMediaAsset(selectedAsset.id, update);
    await refreshLibrary("File details saved locally");
  }

  async function removeAsset() {
    if (!selectedAsset || !window.confirm(`Delete “${selectedAsset.name}” from this browser?`)) return;
    await deleteMediaAsset(selectedAsset.id);
    setSelectedAssetId(null);
    await refreshLibrary("File deleted from this browser");
  }

  async function renameFolder() {
    if (!selectedFolder) return;
    const name = window.prompt("Rename folder", selectedFolder.name);
    if (!name?.trim()) return;
    await renameMediaFolder(selectedFolder.id, name);
    await refreshLibrary("Folder renamed");
  }

  async function removeFolder() {
    if (!selectedFolder || !window.confirm(`Delete the empty folder “${selectedFolder.name}”?`)) return;
    try {
      await deleteMediaFolder(selectedFolder.id);
      setSelectedFolderId(null);
      await refreshLibrary("Folder deleted");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The folder could not be deleted");
    }
  }

  function downloadAsset() {
    if (!selectedAsset) return;
    const url = URL.createObjectURL(selectedAsset.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedAsset.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openFolder(folder: MediaFolder) {
    setCurrentFolderId(folder.id);
    setSelectedFolderId(null);
    setSelectedAssetId(null);
    setQuery("");
  }

  const totalSize = assets.reduce((total, asset) => total + asset.size, 0);

  return (
    <section className="media-manager" aria-label="File manager">
      <header className="media-toolbar">
        <div><span className="eyebrow">Files</span><h1>Media library</h1></div>
        <div className="media-toolbar-actions">
          <button type="button" onClick={addFolder}>＋ Folder</button>
          <button className="media-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>↑ Upload files</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={(event) => void handleFiles(event.target.files)} />
        </div>
      </header>

      <div className="media-controls">
        <nav className="media-breadcrumbs" aria-label="Folder path">
          <button type="button" onClick={() => { setCurrentFolderId(null); setSelectedAssetId(null); setSelectedFolderId(null); }}>All files</button>
          {breadcrumbs.map((folder) => <span key={folder.id}>› <button type="button" onClick={() => openFolder(folder)}>{folder.name}</button></span>)}
        </nav>
        <div className="media-control-row">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and folders" aria-label="Search files and folders" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as MediaFilter)} aria-label="Filter by file type"><option value="all">All types</option><option value="image">Images</option><option value="document">Documents</option><option value="video">Video</option><option value="audio">Audio</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value as MediaSort)} aria-label="Sort files"><option value="newest">Newest</option><option value="name">Name</option><option value="size">Size</option></select>
          <div className="media-view-switcher" aria-label="View"><button className={view === "grid" ? "is-active" : ""} type="button" onClick={() => setView("grid")} aria-label="Grid view">▦</button><button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")} aria-label="List view">☷</button></div>
        </div>
      </div>

      <div className="media-body">
        <div className="media-content">
          <div className={`media-entries is-${view}`}>
            {visibleFolders.map((folder) => (
              <button className={`media-folder-card${selectedFolderId === folder.id ? " is-selected" : ""}`} type="button" key={folder.id} onDoubleClick={() => openFolder(folder)} onClick={() => { setSelectedFolderId(folder.id); setSelectedAssetId(null); }}>
                <span className="folder-glyph">▰</span><strong>{folder.name}</strong><small>Folder · double-click to open</small>
              </button>
            ))}
            {visibleAssets.map((asset) => (
              <button className={`media-file-card${selectedAssetId === asset.id ? " is-selected" : ""}`} type="button" key={asset.id} onClick={() => { setSelectedAssetId(asset.id); setSelectedFolderId(null); }}>
                <span className="media-thumbnail">
                  {asset.type.startsWith("image/") && objectUrls[asset.id] ? (
                    // Locally uploaded images are represented by temporary object URLs.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={objectUrls[asset.id]} alt="" />
                  ) : <i>{fileGlyph(asset.type)}</i>}
                </span>
                <span className="media-card-copy"><strong>{asset.name}</strong><small>{formatBytes(asset.size)} · {fileKind(asset.type)}</small></span>
              </button>
            ))}
          </div>
          {!visibleFolders.length && !visibleAssets.length ? (
            <div className="media-empty"><span>▧</span><h2>{query ? "No matching files" : "This folder is empty"}</h2><p>{query ? "Try another search or file type." : "Upload files or create a folder to organise them."}</p><button type="button" onClick={() => fileInputRef.current?.click()}>Upload files</button></div>
          ) : null}
        </div>

        <aside className="media-details">
          {selectedAsset ? (
            <div className="media-detail-sections">
              <section className="media-detail-preview">
                {selectedAsset.type.startsWith("image/") && objectUrls[selectedAsset.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={objectUrls[selectedAsset.id]} alt="" />
                ) : <span>{fileGlyph(selectedAsset.type)}</span>}
              </section>
              <section><h2>File details</h2><label><span>Name</span><input value={selectedAsset.name} onChange={(event) => setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, name: event.target.value } : asset))} onBlur={(event) => void saveAsset({ name: event.target.value })} /></label><dl><div><dt>Type</dt><dd>{selectedAsset.type}</dd></div><div><dt>Size</dt><dd>{formatBytes(selectedAsset.size)}</dd></div><div><dt>Added</dt><dd>{new Date(selectedAsset.createdAt).toLocaleDateString("en-GB")}</dd></div></dl></section>
              <section><h2>Organisation</h2><label><span>Folder</span><select value={selectedAsset.folderId ?? ""} onChange={(event) => void saveAsset({ folderId: event.target.value || null })}><option value="">All files</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></section>
              {selectedAsset.type.startsWith("image/") ? <section><h2>Image information</h2><label><span>Alternative text</span><textarea rows={3} value={selectedAsset.altText} onChange={(event) => setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, altText: event.target.value } : asset))} onBlur={(event) => void saveAsset({ altText: event.target.value })} placeholder="Describe the image for people who cannot see it" /></label><label><span>Caption</span><textarea rows={3} value={selectedAsset.caption} onChange={(event) => setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, caption: event.target.value } : asset))} onBlur={(event) => void saveAsset({ caption: event.target.value })} /></label><button className="media-insert-button" type="button" onClick={() => onInsertImage(selectedAsset, objectUrls[selectedAsset.id])}>{targetKind === "cover" ? "Use as cover image" : `Insert into ${targetLabel}`}</button></section> : null}
              <section className="media-file-actions"><h2>Actions</h2><button type="button" onClick={downloadAsset}>Download</button><button className="danger-button" type="button" onClick={() => void removeAsset()}>Delete file</button></section>
            </div>
          ) : selectedFolder ? (
            <div className="media-detail-sections"><section className="folder-detail"><span>▰</span><h2>{selectedFolder.name}</h2><p>Folder in {currentFolder?.name ?? "All files"}</p></section><section className="media-file-actions"><h2>Folder actions</h2><button type="button" onClick={openFolder.bind(null, selectedFolder)}>Open folder</button><button type="button" onClick={() => void renameFolder()}>Rename folder</button><button className="danger-button" type="button" onClick={() => void removeFolder()}>Delete empty folder</button></section></div>
          ) : (
            <div className="media-details-empty"><span>ⓘ</span><p>Select a file or folder to see its information and actions.</p></div>
          )}
        </aside>
      </div>

      <footer className="media-status"><span aria-live="polite">{status}</span><span>{assets.length} {assets.length === 1 ? "file" : "files"} · {folders.length} {folders.length === 1 ? "folder" : "folders"} · {formatBytes(totalSize)}</span></footer>
    </section>
  );
}
