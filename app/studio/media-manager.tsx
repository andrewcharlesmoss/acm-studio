"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StudioIcon, type StudioIconName } from "./studio-icons";
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
  writable: boolean;
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

function fileIcon(type: string): StudioIconName {
  const kind = fileKind(type);
  if (kind === "video") return "video";
  if (kind === "audio") return "audio";
  if (kind === "image") return "image";
  return "file";
}

export function MediaManager({ writable, targetLabel, targetKind = "block", onInsertImage }: MediaManagerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [libraryReady, setLibraryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const epochRef = useRef(0);
  const renderEpoch = epochRef.current;
  const canMutate = writable && libraryReady && !busy;
  const [status, setStatus] = useState("Loading local files…");
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderNameInputRef = useRef<HTMLInputElement>(null);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const folderNameFocusTargetIdRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<Record<string, string>>({});

  async function refreshLibrary(message = "Files stored locally in this browser") {
    const epoch = epochRef.current;
    try {
      const library = await listMediaLibrary();
      if (!mountedRef.current || epoch !== epochRef.current) return;
      const nextUrls: Record<string, string> = {};
      for (const asset of library.assets) {
        if (asset.type.startsWith("image/")) nextUrls[asset.id] = URL.createObjectURL(asset.blob);
      }
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = nextUrls;
      setObjectUrls(nextUrls);
      setAssets(library.assets);
      setFolders(library.folders);
      setCurrentFolderId((id) => id && !library.folders.some((folder) => folder.id === id) ? null : id);
      setStatus(message);
    } catch {
      if (mountedRef.current && epoch === epochRef.current) setStatus("The local media library is unavailable in this browser");
    }
  }

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    epochRef.current += 1;
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
        setLibraryReady(true);
        setStatus("Files stored locally in this browser");
      });
    }).catch(() => {
      if (!cancelled) queueMicrotask(() => { if (!cancelled) setStatus("The local media library is unavailable in this browser"); });
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      epochRef.current += 1;
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = {};
    };
  }, []);

  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const previewAsset = assets.find((asset) => asset.id === previewAssetId && asset.type.startsWith("image/")) ?? null;
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) ?? null : null;

  useEffect(() => {
    if (folderNameFocusTargetIdRef.current !== selectedFolder?.id) return;
    folderNameInputRef.current?.focus();
    folderNameInputRef.current?.select();
    folderNameFocusTargetIdRef.current = null;
  }, [selectedFolder?.id]);

  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (!previewAssetId || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [previewAssetId]);

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

  async function mutate<T>(operation: () => Promise<T>) {
    if (!canMutate || busyRef.current || !mountedRef.current || renderEpoch !== epochRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { return await operation(); }
    catch (error) {
      // Reload canonical metadata after a failed edit so an unsaved field is
      // not left looking like a successful file update.
      await refreshLibrary(error instanceof Error ? error.message : "The file operation could not be completed.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current && renderEpoch === epochRef.current) setBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    try {
      if (!files?.length) return;
      const selected = Array.from(files);
      await mutate(async () => {
        const tooLarge = selected.find((file) => file.size > 100 * 1024 * 1024);
        if (tooLarge) throw new Error(`${tooLarge.name} is larger than the 100 MB local limit`);
        setStatus(`Adding ${selected.length} ${selected.length === 1 ? "file" : "files"}…`);
        await addMediaFiles(selected, currentFolderId);
        await refreshLibrary(`${selected.length} ${selected.length === 1 ? "file" : "files"} added locally`);
      });
    } finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  function nextUntitledFolderName() {
    const names = new Set(folders.filter((folder) => folder.parentId === currentFolderId).map((folder) => folder.name.toLocaleLowerCase()));
    if (!names.has("untitled folder")) return "Untitled folder";
    let index = 2;
    while (names.has(`untitled folder ${index}`)) index++;
    return `Untitled folder ${index}`;
  }

  async function createFolder() {
    const name = nextUntitledFolderName();
    await mutate(async () => {
      const folder = await createMediaFolder(name, currentFolderId);
      await refreshLibrary(`Folder “${name}” created`);
      setSelectedAssetId(null);
      setSelectedFolderId(folder.id);
      folderNameFocusTargetIdRef.current = folder.id;
    });
  }

  async function saveFolderName(folderId: string, name: string) {
    await mutate(async () => {
      const nextName = name.trim();
      if (!nextName) throw new Error("A folder name is required.");
      await renameMediaFolder(folderId, nextName);
      await refreshLibrary("Folder renamed");
    });
  }

  async function saveAsset(update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>) {
    if (!selectedAsset) return;
    await mutate(async () => {
      await updateMediaAsset(selectedAsset.id, update);
      await refreshLibrary("File details saved locally");
    });
  }

  async function removeAsset() {
    if (!selectedAsset) return;
    await mutate(async () => {
      if (!window.confirm(`Delete “${selectedAsset.name}” from this browser?`)) return;
      await deleteMediaAsset(selectedAsset.id);
      setSelectedAssetId(null);
      await refreshLibrary("File deleted from this browser");
    });
  }

  async function removeFolder() {
    if (!selectedFolder) return;
    await mutate(async () => {
      if (!window.confirm(`Delete the empty folder “${selectedFolder.name}”?`)) return;
      await deleteMediaFolder(selectedFolder.id);
      setSelectedFolderId(null);
      await refreshLibrary("Folder deleted");
    });
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

  function openImagePreview(asset: MediaAsset, trigger: HTMLButtonElement) {
    if (!asset.type.startsWith("image/") || !objectUrls[asset.id]) return;
    previewTriggerRef.current = trigger;
    setSelectedAssetId(asset.id);
    setSelectedFolderId(null);
    setPreviewAssetId(asset.id);
  }

  return (
    <section className="media-manager" aria-label="File manager">
      <header className="media-toolbar">
        <div><span className="eyebrow">Files</span><h1>Media library</h1></div>
        <div className="media-toolbar-actions">
          <button type="button" disabled={!canMutate} onClick={() => void createFolder()}><StudioIcon name="add" size={16} />Folder</button>
          <button className="media-upload-button" type="button" disabled={!canMutate} onClick={() => fileInputRef.current?.click()}><StudioIcon name="download" size={16} />Upload files</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" disabled={!canMutate} multiple onChange={(event) => void handleFiles(event.target.files)} />
        </div>
      </header>

      <div className="media-controls">
        <nav className="media-breadcrumbs" aria-label="Folder path">
          <button type="button" onClick={() => { setCurrentFolderId(null); setSelectedAssetId(null); setSelectedFolderId(null); }}>All files</button>
          {breadcrumbs.map((folder) => <span key={folder.id}><StudioIcon name="chevron-right" size={14} /><button type="button" onClick={() => openFolder(folder)}>{folder.name}</button></span>)}
        </nav>
        <div className="media-control-row">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and folders" aria-label="Search files and folders" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as MediaFilter)} aria-label="Filter by file type"><option value="all">All types</option><option value="image">Images</option><option value="document">Documents</option><option value="video">Video</option><option value="audio">Audio</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value as MediaSort)} aria-label="Sort files"><option value="newest">Newest</option><option value="name">Name</option><option value="size">Size</option></select>
          <div className="media-view-switcher" aria-label="View"><button className={view === "grid" ? "is-active" : ""} type="button" onClick={() => setView("grid")} aria-label="Grid view"><StudioIcon name="block" /></button><button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")} aria-label="List view"><StudioIcon name="list" /></button></div>
        </div>
      </div>

      <div className="media-body">
        <div className="media-content">
          <div className={`media-entries is-${view}`}>
            {visibleFolders.map((folder) => (
              <button className={`media-folder-card${selectedFolderId === folder.id ? " is-selected" : ""}`} type="button" key={folder.id} onDoubleClick={() => openFolder(folder)} onClick={() => { setSelectedFolderId(folder.id); setSelectedAssetId(null); }}>
                <span className="folder-glyph"><StudioIcon name="archive" /></span><strong>{folder.name}</strong><small>Folder · double-click to open</small>
              </button>
            ))}
            {visibleAssets.map((asset) => (
              <button className={`media-file-card${selectedAssetId === asset.id ? " is-selected" : ""}`} type="button" key={asset.id} onDoubleClick={(event) => openImagePreview(asset, event.currentTarget)} onClick={() => { setSelectedAssetId(asset.id); setSelectedFolderId(null); }}>
                <span className="media-thumbnail">
                  {asset.type.startsWith("image/") && objectUrls[asset.id] ? (
                    // Locally uploaded images are represented by temporary object URLs.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={objectUrls[asset.id]} alt="" />
                  ) : <i><StudioIcon name={fileIcon(asset.type)} /></i>}
                </span>
                <span className="media-card-copy"><strong>{asset.name}</strong><small>{formatBytes(asset.size)} · {fileKind(asset.type)}</small></span>
              </button>
            ))}
          </div>
          {!visibleFolders.length && !visibleAssets.length ? (
            <div className="media-empty"><span><StudioIcon name="image" /></span><h2>{query ? "No matching files" : "This folder is empty"}</h2><p>{query ? "Try another search or file type." : "Upload files or create a folder to organise them."}</p><button type="button" disabled={!canMutate} onClick={() => fileInputRef.current?.click()}>Upload files</button></div>
          ) : null}
        </div>

        <aside className="media-details">
          {selectedAsset ? (
            <div className="media-detail-sections">
              <section className="media-detail-preview">
                {selectedAsset.type.startsWith("image/") && objectUrls[selectedAsset.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={objectUrls[selectedAsset.id]} alt="" />
                ) : <span><StudioIcon name={fileIcon(selectedAsset.type)} /></span>}
              </section>
              <section><h2>File details</h2><label><span>Name</span><input disabled={!canMutate} value={selectedAsset.name} onChange={(event) => { if (canMutate) setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, name: event.target.value } : asset)); }} onBlur={(event) => void saveAsset({ name: event.target.value })} /></label><dl><div><dt>Type</dt><dd>{selectedAsset.type}</dd></div><div><dt>Size</dt><dd>{formatBytes(selectedAsset.size)}</dd></div><div><dt>Added</dt><dd>{new Date(selectedAsset.createdAt).toLocaleDateString("en-GB")}</dd></div></dl></section>
              <section><h2>Organisation</h2><label><span>Folder</span><select disabled={!canMutate} value={selectedAsset.folderId ?? ""} onChange={(event) => void saveAsset({ folderId: event.target.value || null })}><option value="">All files</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></section>
              {selectedAsset.type.startsWith("image/") ? <section><h2>Image information</h2><label><span>Alternative text</span><textarea disabled={!canMutate} rows={3} value={selectedAsset.altText} onChange={(event) => { if (canMutate) setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, altText: event.target.value } : asset)); }} onBlur={(event) => void saveAsset({ altText: event.target.value })} placeholder="Describe the image for people who cannot see it" /></label><label><span>Caption</span><textarea disabled={!canMutate} rows={3} value={selectedAsset.caption} onChange={(event) => { if (canMutate) setAssets((current) => current.map((asset) => asset.id === selectedAsset.id ? { ...asset, caption: event.target.value } : asset)); }} onBlur={(event) => void saveAsset({ caption: event.target.value })} /></label><button className="media-insert-button" type="button" disabled={!canMutate} onClick={() => onInsertImage(selectedAsset, objectUrls[selectedAsset.id])}>{targetKind === "cover" ? "Use as cover image" : `Insert into ${targetLabel}`}</button></section> : null}
              <section className="media-file-actions"><h2>Actions</h2><button type="button" onClick={downloadAsset}>Download</button><button className="danger-button" type="button" disabled={!canMutate} onClick={() => void removeAsset()}>Delete file</button></section>
            </div>
          ) : selectedFolder ? (
            <div className="media-detail-sections"><section className="folder-detail"><span><StudioIcon name="archive" /></span><label><span>Name</span><input ref={folderNameInputRef} disabled={!canMutate} value={selectedFolder.name} onChange={(event) => { if (canMutate) setFolders((current) => current.map((folder) => folder.id === selectedFolder.id ? { ...folder, name: event.target.value } : folder)); }} onBlur={(event) => void saveFolderName(selectedFolder.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label><p>Folder in {currentFolder?.name ?? "All files"}</p></section><section className="media-file-actions"><h2>Folder actions</h2><button type="button" onClick={openFolder.bind(null, selectedFolder)}>Open folder</button><button className="danger-button" type="button" disabled={!canMutate} onClick={() => void removeFolder()}>Delete empty folder</button></section></div>
          ) : (
            <div className="media-details-empty"><span><StudioIcon name="info" /></span><p>Select a file or folder to see its information and actions.</p></div>
          )}
        </aside>
      </div>

      {previewAsset && objectUrls[previewAsset.id] ? <dialog ref={previewDialogRef} className="media-preview-dialog" aria-labelledby="media-preview-title" onClose={() => { setPreviewAssetId(null); previewTriggerRef.current?.focus(); }}>
          <header><h2 id="media-preview-title">{previewAsset.name}</h2><button type="button" onClick={() => previewDialogRef.current?.close()} aria-label="Close image preview" title="Close preview"><StudioIcon name="close" /></button></header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objectUrls[previewAsset.id]} alt={previewAsset.altText || previewAsset.name} />
      </dialog> : null}

      <footer className="media-status"><span aria-live="polite">{writable ? status : "Read-only files. Browsing and downloads remain available."}</span><span>{assets.length} {assets.length === 1 ? "file" : "files"} · {folders.length} {folders.length === 1 ? "folder" : "folders"} · {formatBytes(totalSize)}</span></footer>
    </section>
  );
}
