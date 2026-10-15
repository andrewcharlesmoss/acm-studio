"use client";

import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { useBlobUrls } from "./controls/use-blob-urls";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { StudioButton } from "./controls/button";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { StudioIcon, type StudioIconName } from "./studio-icons";
import {
  listMediaLibrary,
  getMediaAsset,
  prepareMediaFolderMove,
  type MediaAsset,
  type MediaFolder,
} from "./media-store";
import { assetBefore, folderBefore, type MediaCommand, type MediaAssetPatch } from "./media-command";
import { submitMediaCommand, useMediaSession } from "./media-sync";
import { loadDesigns } from "./design-store";

type MediaFilter = "all" | "image" | "document" | "video" | "audio";
type MediaSort = "newest" | "name" | "size";

type MediaManagerProps = {
  writable: boolean;
  targetLabel: string;
  targetOwnerId: string;
  targetKind?: "block" | "cover" | "background";
  onInsertImage: (asset: MediaAsset, objectUrl?: string, altText?: string, signal?: AbortSignal) => boolean | void | Promise<boolean | void>;
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

export function MediaManager({ writable, targetLabel, targetOwnerId, targetKind = "block", onInsertImage }: MediaManagerProps) {
  const mediaSession = useMediaSession();
  const canonicalRef = useRef<{ assets: MediaAsset[]; folders: MediaFolder[] }>({ assets: [], folders: [] });
  const assetDrafts = useRef(new Map<string, { before: MediaAssetPatch; update: MediaAssetPatch }>());
  const folderDrafts = useRef(new Map<string, { before: string; name: string }>());
  const refreshSequence = useRef(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [conflict, setConflict] = useState<{ command: MediaCommand; retry: MediaCommand | null; latest: string; reason: string } | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [designLinks, setDesignLinks] = useState<Record<string, { designId: string; pageId: string }>>({});
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<{ id: string; kind: "folder" | "file"; x: number; y: number; colours: boolean } | null>(null);
  const colourMenuCloseTimerRef = useRef<number | null>(null);
  const colourSubmenuRef = useRef<HTMLDivElement>(null);
  const colourMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuTriggerRef = useRef<HTMLElement | null>(null);
  const draggedEntryRef = useRef<{ id: string; kind: "folder" | "file" } | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const [breadcrumbDrop, setBreadcrumbDrop] = useState<{ folderId: string | null; valid: boolean } | null>(null);
  const [parentDropState, setParentDropState] = useState<"valid" | "invalid" | null>(null);
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
  const canMutate = mediaSession.ready && libraryReady && !busy && !conflict;
  const canInsert = writable && libraryReady && !busy;
  const insertionGuard = useRef({ allowed: false, context: "", onInsertImage });
  const insertionContext = `${targetOwnerId}/${targetKind}/${targetLabel}`;
  useLayoutEffect(() => { insertionGuard.current = { allowed: canInsert, context: insertionContext, onInsertImage }; }, [canInsert, insertionContext, onInsertImage]);
  const [status, setStatus] = useState("Loading local files…");
  const imageAssets = useMemo(() => assets.filter(asset => asset.type.startsWith("image/")), [assets]);
  const objectUrls = useBlobUrls(imageAssets);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inlineRename, setInlineRename] = useState<{ id: string; kind: "folder" | "file"; name: string; before: string } | null>(null);
  const inlineRenameRef = useRef<HTMLInputElement>(null);
  const inlineRenameFinishedRef = useRef(false);
  const folderNameInputRef = useRef<HTMLInputElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const insertAltTriggerRef = useRef<HTMLButtonElement>(null);
  const [insertAltAsset, setInsertAltAsset] = useState<MediaAsset | null>(null);
  const [insertAltText, setInsertAltText] = useState("");
  const [insertError, setInsertError] = useState("");
  const [insertionBusy, setInsertionBusy] = useState(false);
  const insertionBusyRef = useRef(false);
  const imageAttempt = useRef<AbortController | null>(null);
  function dismissImageInsert() { imageAttempt.current?.abort(); setInsertAltAsset(null); }
  const folderNameFocusTargetIdRef = useRef<string | null>(null);

  async function refreshLibrary(message = "Files stored locally in this browser") {
    const epoch = epochRef.current;
    const sequence = ++refreshSequence.current;
    try {
      const library = await listMediaLibrary();
      if (!mountedRef.current || epoch !== epochRef.current || sequence !== refreshSequence.current) return;
      canonicalRef.current = library;
      setAssets(library.assets.map(asset => ({ ...asset, ...assetDrafts.current.get(asset.id)?.update })));
      setLibraryReady(true);
      try {
        const links: Record<string, { designId: string; pageId: string }> = {};
        for (const design of loadDesigns()) for (const page of design.pages) if (page.renderedMediaId) links[page.renderedMediaId] = { designId: design.id, pageId: page.id };
        setDesignLinks(links);
      } catch { setDesignLinks({}); }
      setFolders(library.folders.map(folder => ({ ...folder, ...(folderDrafts.current.has(folder.id) ? { name: folderDrafts.current.get(folder.id)!.name } : {}) })));
      setCurrentFolderId((id) => id && !library.folders.some((folder) => folder.id === id) ? null : id);
      setStatus(message);
    } catch {
      if (mountedRef.current && epoch === epochRef.current) setStatus("The local media library is unavailable in this browser");
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    epochRef.current += 1;
    queueMicrotask(() => { if (mountedRef.current) void refreshLibrary(); });
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
    };
    // The refresh reads refs rather than render state.
  }, []);

  useEffect(() => {
    queueMicrotask(() => { if (mountedRef.current) void refreshLibrary(); });
  }, [mediaSession.revision]);

  function draftAsset(asset: MediaAsset, update: MediaAssetPatch) {
    const draft = assetDrafts.current.get(asset.id) ?? { before: {}, update: {} };
    for (const key of Object.keys(update) as Array<keyof MediaAssetPatch>) {
      if (!(key in draft.before)) Object.assign(draft.before, { [key]: canonicalRef.current.assets.find(item => item.id === asset.id)?.[key] ?? asset[key] });
    }
    Object.assign(draft.update, update);
    assetDrafts.current.set(asset.id, draft);
    setAssets(current => current.map(item => item.id === asset.id ? { ...item, ...update } : item));
  }

  function draftFolder(folder: MediaFolder, name: string) {
    const before = folderDrafts.current.get(folder.id)?.before ?? canonicalRef.current.folders.find(item => item.id === folder.id)?.name ?? folder.name;
    folderDrafts.current.set(folder.id, { before, name });
    setFolders(current => current.map(item => item.id === folder.id ? { ...item, name } : item));
  }

  function clearCommandDraft(command: MediaCommand) {
    if (command.kind === "update-asset") {
      const draft = assetDrafts.current.get(command.id);
      if (draft) {
        for (const key of Object.keys(command.update) as Array<keyof MediaAssetPatch>) { delete draft.before[key]; delete draft.update[key]; }
        if (!Object.keys(draft.update).length) assetDrafts.current.delete(command.id);
      }
    } else if (command.kind === "rename-folder") folderDrafts.current.delete(command.id);
  }

  async function reviewCommand(command: MediaCommand, error: unknown) {
    const reason = error instanceof Error ? error.message : "The file action was not saved.";
    if (mountedRef.current) { setReviewOpen(true); setConflict({ command, retry: null, latest: "Loading latest details…", reason }); }
    try {
      const library = await listMediaLibrary();
      const asset = "id" in command ? library.assets.find(item => item.id === command.id) : undefined;
      const folder = "id" in command ? library.folders.find(item => item.id === command.id) : undefined;
      let retry: MediaCommand | null = command;
      if (command.kind === "update-asset") retry = asset ? { ...command, before: Object.fromEntries(Object.keys(command.update).map(key => [key, asset[key as keyof MediaAssetPatch]])) } : null;
      else if (command.kind === "rename-folder") retry = folder ? { ...command, before: folder.name } : null;
      else if (command.kind === "colour-folder") retry = folder ? { ...command, before: folder.colour ?? null } : null;
      else if (command.kind === "move-folder") retry = folder ? { ...command, before: folder.parentId } : null;
      else if (command.kind === "delete-folder") retry = folder ? { ...command, before: folderBefore(folder) } : null;
      else if (command.kind === "delete-asset") retry = asset ? { ...command, before: assetBefore(asset) } : null;
      else if (command.kind === "create-folder" && library.folders.some(item => item.id === command.folder.id)) retry = null;
      else if (command.kind === "upload" && command.files.some(file => library.assets.some(item => item.id === file.id))) retry = null;
      if (mountedRef.current) setConflict({ command, retry, latest: asset ? `Name: ${asset.name}\nFolder: ${library.folders.find(item => item.id === asset.folderId)?.name ?? "All files"}\nAlternative text: ${asset.altText || "None"}\nCaption: ${asset.caption || "None"}` : folder ? `Name: ${folder.name}\nFolder: ${library.folders.find(item => item.id === folder.parentId)?.name ?? "All files"}\nColour: ${folder.colour ?? "None"}` : "The item is missing, or this creation may already have been saved. Check the latest library.", reason });
    } catch {
      if (mountedRef.current) setConflict({ command, retry: null, latest: "The latest library is unavailable. Your action is kept here; reload the details before retrying.", reason });
    }
  }

  async function sendCommand(command: MediaCommand) {
    try { await submitMediaCommand(command); clearCommandDraft(command); }
    catch (error) { await reviewCommand(command, error); throw error; }
  }

  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const previewAsset = assets.find((asset) => asset.id === previewAssetId && asset.type.startsWith("image/")) ?? null;
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) ?? null : null;
  const selectedContainerId = selectedAsset?.folderId ?? selectedFolder?.parentId ?? null;
  const selectedContainer = selectedContainerId ? folderMap.get(selectedContainerId) ?? null : null;

  async function checkedImage(id: string) {
    if (insertionBusyRef.current) return;
    insertionBusyRef.current = true;
    setInsertionBusy(true);
    const epoch = epochRef.current;
    const context = insertionGuard.current.context;
    try {
      const latest = await getMediaAsset(id).catch(() => undefined);
      if (!mountedRef.current || epoch !== epochRef.current || !insertionGuard.current.allowed || context !== insertionGuard.current.context) return;
      if (!latest?.type.startsWith("image/")) {
        setInsertError("This image is no longer available. Your alternative text is kept here.");
        setStatus("This image is no longer available. Choose another image.");
        return;
      }
      return latest;
    } finally {
      insertionBusyRef.current = false;
      if (mountedRef.current && epoch === epochRef.current) setInsertionBusy(false);
    }
  }

  function requestImageInsert(asset: MediaAsset, trigger?: HTMLButtonElement) {
    if (!canInsert || insertionBusyRef.current) return;
    setInsertError("");
    if (targetKind === "cover") {
      const attempt = new AbortController(); imageAttempt.current = attempt;
      void checkedImage(asset.id).then(async latest => {
        if (!latest || attempt.signal.aborted) return;
        insertionBusyRef.current = true; setInsertionBusy(true);
        try {
          const accepted = await insertionGuard.current.onInsertImage(latest, objectUrls[latest.id], latest.altText || latest.name.replace(/\.[^.]+$/, ""), attempt.signal);
          if (accepted === false) throw new Error("The featured image was not applied. Try again when editing is available.");
        } finally { insertionBusyRef.current = false; if (mountedRef.current) setInsertionBusy(false); }
      }).catch(error => { if (mountedRef.current && !attempt.signal.aborted) setStatus(error instanceof Error ? error.message : "The featured image was not applied."); });
      return;
    }
    if (targetKind === "background") {
      void checkedImage(asset.id).then(async latest => { if (latest) await insertionGuard.current.onInsertImage(latest, objectUrls[latest.id]); }).catch(error => setStatus(error instanceof Error ? error.message : "The image was not inserted."));
      return;
    }
    insertAltTriggerRef.current = trigger ?? null;
    setInsertAltText(asset.altText || asset.name.replace(/\.[^.]+$/, ""));
    setInsertAltAsset(asset);
  }

  async function confirmImageInsert() {
    if (!insertAltAsset || !canInsert) return;
    const attempt = new AbortController(); imageAttempt.current = attempt;
    const latest = await checkedImage(insertAltAsset.id);
    if (attempt.signal.aborted) return;
    if (!latest) return;
    insertionBusyRef.current = true; setInsertionBusy(true);
    try {
      const accepted = await insertionGuard.current.onInsertImage(latest, objectUrls[latest.id], insertAltText.trim(), attempt.signal);
      if (accepted === false) throw new Error("The featured image was not applied. Your selection and alternative text were kept; try again when editing is available.");
      if (mountedRef.current) setInsertAltAsset(null);
    } catch (error) {
      if (mountedRef.current && !attempt.signal.aborted) setInsertError(error instanceof Error ? error.message : "The image was not applied. Your selection was kept.");
    } finally { insertionBusyRef.current = false; if (mountedRef.current) setInsertionBusy(false); }
  }

  useEffect(() => {
    if (!canMutate || folderMenu || folderNameFocusTargetIdRef.current !== selectedFolder?.id || !folderNameInputRef.current) return;
    folderNameInputRef.current.focus();
    folderNameInputRef.current.select();
    folderNameFocusTargetIdRef.current = null;
  }, [selectedFolder?.id, folders, folderMenu, canMutate]);

  const inlineRenameId = inlineRename?.id;
  const inlineRenameKind = inlineRename?.kind;
  useLayoutEffect(() => {
    if (!inlineRenameId) return;
    const input = inlineRenameRef.current;
    const card = input?.parentElement;
    const label = card?.querySelector<HTMLElement>(".media-card-name");
    if (!input || !card || !label) return;
    const alignInput = () => {
      const nameRect = label.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const textStyle = window.getComputedStyle(label);
      Object.assign(input.style, {
        left: `${nameRect.left - cardRect.left}px`, top: `${nameRect.top - cardRect.top}px`,
        width: `${nameRect.width}px`, height: `${nameRect.height}px`,
        fontFamily: textStyle.fontFamily, fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight, lineHeight: textStyle.lineHeight, letterSpacing: textStyle.letterSpacing,
      });
    };
    alignInput();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(alignInput);
    observer?.observe(label);
    observer?.observe(card);
    return () => observer?.disconnect();
  }, [inlineRenameId, inlineRenameKind, view]);

  useEffect(() => {
    if (!canMutate || !inlineRenameId) return;
    inlineRenameRef.current?.focus();
    inlineRenameRef.current?.select();
  }, [inlineRenameId, inlineRenameKind, canMutate]);

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
      // Refresh other records while retaining this tab's unsaved field values.
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
        await sendCommand({ kind: "upload", folderId: currentFolderId, createdAt: new Date().toISOString(), files: selected.map(file => ({ id: `media-${crypto.randomUUID()}`, name: file.name, type: file.type || "application/octet-stream", blob: file })) });
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
      const folder: MediaFolder = { id: `folder-${crypto.randomUUID()}`, name, parentId: currentFolderId, createdAt: new Date().toISOString() };
      await sendCommand({ kind: "create-folder", folder });
      await refreshLibrary(`Folder “${name}” created`);
      setSelectedAssetId(null);
      setSelectedFolderId(folder.id);
      folderNameFocusTargetIdRef.current = folder.id;
    });
  }

  async function saveFolderName(folderId: string, name: string, before?: string) {
    await mutate(async () => {
      const nextName = name.trim();
      if (!nextName) throw new Error("A folder name is required.");
      const original = before ?? folderDrafts.current.get(folderId)?.before ?? canonicalRef.current.folders.find(folder => folder.id === folderId)?.name;
      if (original === undefined) throw new Error("This folder no longer exists.");
      if (original === nextName && !folderDrafts.current.has(folderId)) return;
      await sendCommand({ kind: "rename-folder", id: folderId, name: nextName, before: original });
      await refreshLibrary("Folder renamed");
    });
  }

  async function saveAsset(update: Partial<Pick<MediaAsset, "name" | "folderId" | "altText" | "caption">>, assetId = selectedAsset?.id, originalName?: string) {
    if (!assetId) return;
    await mutate(async () => {
      const original = canonicalRef.current.assets.find(asset => asset.id === assetId);
      if (!original) throw new Error("This file no longer exists.");
      const draft = assetDrafts.current.get(assetId);
      const before = Object.fromEntries(Object.keys(update).map(key => [key, key === "name" && originalName !== undefined ? originalName : draft?.before[key as keyof MediaAssetPatch] ?? original[key as keyof MediaAssetPatch]]));
      await sendCommand({ kind: "update-asset", id: assetId, update, before });
      await refreshLibrary("File details saved locally");
    });
  }

  async function removeAsset() {
    if (!selectedAsset) return;
    await mutate(async () => {
      if (!window.confirm(`Delete “${selectedAsset.name}” from this browser?`)) return;
      await sendCommand({ kind: "delete-asset", id: selectedAsset.id, before: assetBefore(canonicalRef.current.assets.find(asset => asset.id === selectedAsset.id) ?? selectedAsset) });
      setSelectedAssetId(null);
      await refreshLibrary("File deleted from this browser");
    });
  }

  async function removeFolder() {
    if (!selectedFolder) return;
    await mutate(async () => {
      if (!window.confirm(`Delete the empty folder “${selectedFolder.name}”?`)) return;
      await sendCommand({ kind: "delete-folder", id: selectedFolder.id, before: folderBefore(canonicalRef.current.folders.find(folder => folder.id === selectedFolder.id) ?? selectedFolder) });
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

  function closeFolderMenu(restoreFocus = true) {
    setFolderMenu(null);
    if (restoreFocus) requestAnimationFrame(() => folderMenuTriggerRef.current?.isConnected && folderMenuTriggerRef.current.focus());
  }

  function showFolderMenu(folder: MediaFolder, trigger: HTMLElement, x: number, y: number) {
    folderMenuTriggerRef.current = trigger;
    setSelectedFolderId(folder.id);
    setSelectedAssetId(null);
    setFolderMenu({ id: folder.id, kind: "folder", x: x, y: y, colours: false });
  }

  function showFileMenu(asset: MediaAsset, trigger: HTMLElement, x: number, y: number) {
    folderMenuTriggerRef.current = trigger;
    setSelectedAssetId(asset.id);
    setSelectedFolderId(null);
    setFolderMenu({ id: asset.id, kind: "file", x: x, y: y, colours: false });
  }

  const folderMenuId = folderMenu?.id;
  useEffect(() => () => cancelColourMenuClose(), [folderMenuId]);

  function cancelColourMenuClose() {
    if (colourMenuCloseTimerRef.current !== null) {
      window.clearTimeout(colourMenuCloseTimerRef.current);
      colourMenuCloseTimerRef.current = null;
    }
  }

  function scheduleColourMenuClose() {
    cancelColourMenuClose();
    colourMenuCloseTimerRef.current = window.setTimeout(() => {
      colourMenuCloseTimerRef.current = null;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.matches(":focus-visible") && (focused === colourMenuTriggerRef.current || colourSubmenuRef.current?.contains(focused))) return;
      setFolderMenu((current) => current ? { ...current, colours: false } : null);
    }, 150);
  }

  function openColourMenu() {
    cancelColourMenuClose();
    if (!canMutate || !folderMenu) return;
    setFolderMenu({ ...folderMenu, colours: true });
  }

  function closeColourMenu() {
    cancelColourMenuClose();
    setFolderMenu((current) => current ? { ...current, colours: false } : null);
    colourMenuTriggerRef.current?.focus();
  }

  async function changeFolderColour(id: string, colour: string) {
    closeFolderMenu();
    await mutate(async () => {
      const folder = canonicalRef.current.folders.find(item => item.id === id);
      if (!folder) throw new Error("This folder no longer exists.");
      await sendCommand({ kind: "colour-folder", id, colour: colour || null, before: folder.colour ?? null });
      await refreshLibrary("Folder colour changed");
    });
  }

  function openFolder(folder: MediaFolder) {
    setCurrentFolderId(folder.id);
    setSelectedFolderId(null);
    setSelectedAssetId(null);
    setQuery("");
  }

  function allowedFolderDestination(id: string, parentId: string | null) {
    try { prepareMediaFolderMove(folders, id, parentId); return true; }
    catch { return false; }
  }

  function startMediaDrag(event: DragEvent<HTMLButtonElement>, id: string, kind: "folder" | "file") {
    if (!canMutate || inlineRename) { event.preventDefault(); return; }
    draggedEntryRef.current = { id, kind };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-acm-studio-media", JSON.stringify({ id, kind }));
  }

  function endMediaDrag() {
    draggedEntryRef.current = null;
    setDropFolderId(null);
    setParentDropState(null);
    setBreadcrumbDrop(null);
  }

  function dragOverFolder(event: DragEvent<HTMLButtonElement>, id: string) {
    const entry = draggedEntryRef.current;
    if (!canMutate || !entry || (entry.kind === "folder" && !allowedFolderDestination(entry.id, id))) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropFolderId(id);
  }

  async function moveMediaEntry(entry: { id: string; kind: "folder" | "file" }, parentId: string | null) {
    await mutate(async () => {
      if (entry.kind === "folder") {
        const folder = canonicalRef.current.folders.find(item => item.id === entry.id);
        if (!folder) throw new Error("This folder no longer exists.");
        await sendCommand({ kind: "move-folder", id: entry.id, parentId, before: folder.parentId });
      } else {
        const asset = canonicalRef.current.assets.find(item => item.id === entry.id);
        if (!asset) throw new Error("This file no longer exists.");
        await sendCommand({ kind: "update-asset", id: entry.id, update: { folderId: parentId }, before: { folderId: asset.folderId } });
      }
      await refreshLibrary(`Moved to ${parentId ? folderMap.get(parentId)?.name ?? "folder" : "All files"}`);
    });
  }

  function dropIntoFolder(event: DragEvent<HTMLButtonElement>, id: string) {
    event.preventDefault(); event.stopPropagation();
    const entry = draggedEntryRef.current;
    endMediaDrag();
    if (canMutate && entry) void moveMediaEntry(entry, id);
  }

  function canDropIntoParent(entry: { id: string; kind: "folder" | "file" } | null) {
    return Boolean(canMutate && currentFolder && entry && (entry.kind === "file" || allowedFolderDestination(entry.id, currentFolder.parentId)));
  }

  function dragOverParent(event: DragEvent<HTMLButtonElement>) {
    const entry = draggedEntryRef.current;
    if (!entry) return;
    const valid = canDropIntoParent(entry);
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setParentDropState(valid ? "valid" : "invalid");
    if (valid) event.preventDefault();
  }

  function dropIntoParent(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation();
    const entry = draggedEntryRef.current;
    const valid = canDropIntoParent(entry);
    endMediaDrag();
    if (valid && entry && currentFolder) void moveMediaEntry(entry, currentFolder.parentId);
  }

  function validBreadcrumbDrop(folderId: string | null) {
    const entry = draggedEntryRef.current;
    return Boolean(canMutate && entry && (entry.kind === "file" || allowedFolderDestination(entry.id, folderId)));
  }

  function dragOverBreadcrumb(event: DragEvent<HTMLButtonElement>, folderId: string | null) {
    if (!draggedEntryRef.current) return;
    const valid = validBreadcrumbDrop(folderId);
    setBreadcrumbDrop({ folderId, valid });
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    if (valid) event.preventDefault();
  }

  function dropIntoBreadcrumb(event: DragEvent<HTMLButtonElement>, folderId: string | null) {
    event.preventDefault(); event.stopPropagation();
    const entry = draggedEntryRef.current;
    const valid = validBreadcrumbDrop(folderId);
    endMediaDrag();
    if (valid && entry) void moveMediaEntry(entry, folderId);
  }

  function leaveBreadcrumb(event: DragEvent<HTMLButtonElement>) {
    if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setBreadcrumbDrop(null);
  }

  async function saveInlineRename() {
    if (!inlineRename || inlineRenameFinishedRef.current || !canMutate) return;
    inlineRenameFinishedRef.current = true;
    const name = inlineRename.name.trim();
    setInlineRename(null);
    if (!name) { setStatus("A name is required. The original name was kept."); return; }
    if (inlineRename.kind === "folder") { folderDrafts.current.set(inlineRename.id, { name, before: inlineRename.before }); }
    else { assetDrafts.current.set(inlineRename.id, { update: { ...assetDrafts.current.get(inlineRename.id)?.update, name }, before: { ...assetDrafts.current.get(inlineRename.id)?.before, name: inlineRename.before } }); }
    if (inlineRename.kind === "folder") await saveFolderName(inlineRename.id, name, inlineRename.before);
    else await saveAsset({ name }, inlineRename.id, inlineRename.before);
  }

  const totalSize = assets.reduce((total, asset) => total + asset.size, 0);

  function openImagePreview(asset: MediaAsset, trigger: HTMLButtonElement) {
    if (!asset.type.startsWith("image/") || !objectUrls[asset.id]) return;
    previewTriggerRef.current = trigger;
    setSelectedAssetId(asset.id);
    setSelectedFolderId(null);
    setPreviewAssetId(asset.id);
  }

  const inlineNameEditor = inlineRename ? <input ref={inlineRenameRef} className={`media-inline-name is-${inlineRename.kind}`} aria-label={`Rename ${inlineRename.kind}`} disabled={!canMutate} value={inlineRename.name} onChange={(event) => { if (canMutate) setInlineRename({ ...inlineRename, name: event.target.value }); }} onBlur={() => void saveInlineRename()} onKeyDown={(event) => {
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); }
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); inlineRenameFinishedRef.current = true; setInlineRename(null);
      requestAnimationFrame(() => folderMenuTriggerRef.current?.isConnected && folderMenuTriggerRef.current.focus());
    }
  }} /> : null;

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
          <button type="button" className={breadcrumbDrop?.folderId === null ? breadcrumbDrop.valid ? "is-drop-target" : "is-invalid-drop" : undefined} onDragOver={(event) => dragOverBreadcrumb(event, null)} onDragLeave={leaveBreadcrumb} onDrop={(event) => dropIntoBreadcrumb(event, null)} onClick={() => { setCurrentFolderId(null); setSelectedAssetId(null); setSelectedFolderId(null); }}>All files</button>
          {breadcrumbs.map((folder) => <span key={folder.id}><StudioIcon name="chevron-right" size={14} /><button type="button" className={breadcrumbDrop?.folderId === folder.id ? breadcrumbDrop.valid ? "is-drop-target" : "is-invalid-drop" : undefined} onDragOver={(event) => dragOverBreadcrumb(event, folder.id)} onDragLeave={leaveBreadcrumb} onDrop={(event) => dropIntoBreadcrumb(event, folder.id)} onClick={() => openFolder(folder)}>{folder.name}</button></span>)}
        </nav>
        <div className="media-control-row">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and folders" aria-label="Search files and folders" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as MediaFilter)} aria-label="Filter by file type"><option value="all">All types</option><option value="image">Images</option><option value="document">Documents</option><option value="video">Video</option><option value="audio">Audio</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value as MediaSort)} aria-label="Sort files"><option value="newest">Newest</option><option value="name">Name</option><option value="size">Size</option></select>
          <div className="media-view-switcher" aria-label="View"><button className={view === "grid" ? "is-active" : ""} type="button" onClick={() => setView("grid")} aria-label="Grid view"><StudioIcon name="block" /></button><button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")} aria-label="List view"><StudioIcon name="list" /></button></div>
        </div>
      </div>

      <div className="media-body">
        <div className="media-content" onPointerDown={(event) => {
          if (event.target === event.currentTarget || event.target === event.currentTarget.querySelector(".media-entries")) {
            setSelectedAssetId(null);
            setSelectedFolderId(null);
          }
        }}>
          <div className={`media-entries is-${view}`}>
            {currentFolder ? <button className={`media-parent-card${parentDropState === "valid" ? " is-drop-target" : parentDropState === "invalid" ? " is-invalid-drop" : ""}`} type="button" onDragOver={dragOverParent} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setParentDropState(null); }} onDrop={dropIntoParent} onClick={() => {
              setCurrentFolderId(currentFolder.parentId);
              setSelectedAssetId(null); setSelectedFolderId(null); setQuery(""); closeFolderMenu(false);
            }} aria-label={`Parent folder: ${currentFolder.parentId ? folderMap.get(currentFolder.parentId)?.name ?? "All files" : "All files"}`}>
              <span className="folder-glyph parent-folder-glyph"><StudioIcon name="folder" size={64} /><StudioIcon className="folder-up-arrow" name="arrow-up" size={24} /></span>
              <strong>Parent folder</strong><small>{currentFolder.parentId ? folderMap.get(currentFolder.parentId)?.name ?? "All files" : "All files"}</small>
            </button> : null}
            {visibleFolders.map((folder) => (
              <div className="media-folder-entry" key={folder.id}>
                <button className={`media-folder-card${selectedFolderId === folder.id ? " is-selected" : ""}${dropFolderId === folder.id ? " is-drop-target" : ""}`} draggable={canMutate && !inlineRename} onDragStart={(event) => startMediaDrag(event, folder.id, "folder")} onDragEnd={endMediaDrag} onDragOver={(event) => dragOverFolder(event, folder.id)} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setDropFolderId(null); }} onDrop={(event) => dropIntoFolder(event, folder.id)} type="button" aria-label={folder.name} onDoubleClick={() => openFolder(folder)} onClick={() => { setSelectedFolderId(folder.id); setSelectedAssetId(null); }} onContextMenu={(event) => { event.preventDefault(); showFolderMenu(folder, event.currentTarget, event.clientX, event.clientY); }} onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); openFolder(folder); }
                  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); showFolderMenu(folder, event.currentTarget, rect.left, rect.bottom); }
                }}>
                  <span className="folder-glyph" style={{ color: folder.colour }}><StudioIcon name="folder" size={64} /></span><span className="media-card-copy"><strong className={inlineRename?.id === folder.id ? "media-card-name is-renaming" : "media-card-name"}>{folder.name}</strong><small>Folder</small></span>
                </button>
                {inlineRename?.id === folder.id ? inlineNameEditor : null}
                <button className="media-folder-menu-toggle" type="button" aria-label={`Actions for ${folder.name}`} aria-haspopup="menu" aria-expanded={folderMenu?.id === folder.id} onClick={(event) => { if (folderMenu?.kind === "folder" && folderMenu.id === folder.id) { closeFolderMenu(); return; } const rect = event.currentTarget.getBoundingClientRect(); showFolderMenu(folder, event.currentTarget, rect.left, rect.bottom); }}><StudioIcon className="media-card-menu-icon" name="more-vertical" size={20} /></button>
              </div>
            ))}
            {visibleAssets.map((asset) => (
              <div className={`media-file-entry${designLinks[asset.id] ? " has-source-design" : ""}`} key={asset.id}>
              <button className={`media-file-card${selectedAssetId === asset.id ? " is-selected" : ""}`} draggable={canMutate && !inlineRename} onDragStart={(event) => startMediaDrag(event, asset.id, "file")} onDragEnd={endMediaDrag} type="button" aria-haspopup="menu" aria-expanded={folderMenu?.id === asset.id} onContextMenu={(event) => { event.preventDefault(); showFileMenu(asset, event.currentTarget, event.clientX, event.clientY); }} onKeyDown={(event) => {
                if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); showFileMenu(asset, event.currentTarget, rect.left, rect.bottom); }
              }} onDoubleClick={(event) => openImagePreview(asset, event.currentTarget)} onClick={() => { setSelectedAssetId(asset.id); setSelectedFolderId(null); }}>
                <span className="media-thumbnail">
                  {asset.type.startsWith("image/") && objectUrls[asset.id] ? (
                    // Locally uploaded images are represented by temporary object URLs.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={objectUrls[asset.id]} alt="" />
                  ) : <i><StudioIcon name={fileIcon(asset.type)} /></i>}
                </span>
                <span className="media-card-copy"><strong className={inlineRename?.id === asset.id ? "media-card-name is-renaming" : "media-card-name"}>{asset.name}</strong><small>{formatBytes(asset.size)} · {fileKind(asset.type)}</small></span>
              </button>
              {designLinks[asset.id] ? <a className="media-source-design-link" href={`/studio/designs?designId=${encodeURIComponent(designLinks[asset.id].designId)}&pageId=${encodeURIComponent(designLinks[asset.id].pageId)}`} onClick={(event) => event.stopPropagation()}>Edit source design</a> : null}
              {inlineRename?.id === asset.id ? inlineNameEditor : null}
              <button className="media-file-menu-toggle" type="button" aria-label={`Actions for ${asset.name}`} aria-haspopup="menu" aria-expanded={folderMenu?.id === asset.id} onClick={(event) => { if (folderMenu?.kind === "file" && folderMenu.id === asset.id) { closeFolderMenu(); return; } const rect = event.currentTarget.getBoundingClientRect(); showFileMenu(asset, event.currentTarget, rect.left, rect.bottom); }}><StudioIcon className="media-card-menu-icon" name="more-vertical" size={20} /></button>
              </div>
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
              <section><h2>File details</h2><label><span>Name</span><input disabled={!canMutate} value={selectedAsset.name} onChange={(event) => { if (canMutate) draftAsset(selectedAsset, { name: event.target.value }); }} onBlur={(event) => void saveAsset({ name: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label><dl><div><dt>Type</dt><dd>{selectedAsset.type}</dd></div><div><dt>Size</dt><dd>{formatBytes(selectedAsset.size)}</dd></div><div><dt>Added</dt><dd>{new Date(selectedAsset.createdAt).toLocaleDateString("en-GB")}</dd></div></dl></section>
              <section><h2>Organisation</h2><label><span>Folder</span><select disabled={!canMutate} value={selectedAsset.folderId ?? ""} onChange={(event) => void saveAsset({ folderId: event.target.value || null })}><option value="">All files</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></section>
              {selectedAsset.type.startsWith("image/") ? <section><h2>Image information</h2>{targetKind !== "background" ? <label><span>Alternative text</span><textarea disabled={!canMutate} rows={3} value={selectedAsset.altText} onChange={(event) => { if (canMutate) draftAsset(selectedAsset, { altText: event.target.value }); }} onBlur={(event) => void saveAsset({ altText: event.target.value })} placeholder="Describe the image for people who cannot see it" /></label> : <p className="setting-note">Background images are decorative and do not need alternative text.</p>}<label><span>Caption</span><textarea disabled={!canMutate} rows={3} value={selectedAsset.caption} onChange={(event) => { if (canMutate) draftAsset(selectedAsset, { caption: event.target.value }); }} onBlur={(event) => void saveAsset({ caption: event.target.value })} /></label><button ref={insertAltTriggerRef} className="media-insert-button" type="button" disabled={!canInsert || insertionBusy} onClick={(event) => requestImageInsert(selectedAsset, event.currentTarget)}>{targetKind === "cover" ? "Use as featured image" : targetKind === "background" ? "Use as background image" : `Insert into ${targetLabel}`}</button></section> : null}
              <section className="media-file-actions"><h2>Actions</h2><button type="button" onClick={downloadAsset}>Download</button><button className="danger-button" type="button" disabled={!canMutate} onClick={() => void removeAsset()}>Delete file</button></section>
            </div>
          ) : selectedFolder ? (
            <div className="media-detail-sections"><section className="folder-detail"><span style={{ color: selectedFolder.colour }}><StudioIcon name="folder" /></span><label><span>Name</span><input ref={folderNameInputRef} disabled={!canMutate} value={selectedFolder.name} onChange={(event) => { if (canMutate) draftFolder(selectedFolder, event.target.value); }} onBlur={(event) => void saveFolderName(selectedFolder.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label><p>Folder in {currentFolder?.name ?? "All files"}</p></section><section className="media-file-actions"><h2>Folder actions</h2><label><span>Move to folder</span><select disabled={!canMutate} value={selectedFolder.parentId ?? ""} onChange={(event) => void moveMediaEntry({ id: selectedFolder.id, kind: "folder" }, event.target.value || null)}><option value="">All files</option>{folders.filter((folder) => allowedFolderDestination(selectedFolder.id, folder.id)).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><button type="button" onClick={openFolder.bind(null, selectedFolder)}>Open folder</button><button className="danger-button" type="button" disabled={!canMutate} onClick={() => void removeFolder()}>Delete empty folder</button></section></div>
          ) : (
            <div className="media-details-empty"><span><StudioIcon name="info" /></span><p>Select a file or folder to see its information and actions.</p></div>
          )}
        </aside>
      </div>

      {folderMenu ? <StudioAnchoredMenu menuRef={folderMenuRef} presentation="custom" anchor={() => folderMenuTriggerRef.current} point={{ x: folderMenu.x, y: folderMenu.y }} className="media-folder-menu" aria-label={folderMenu.kind === "file" ? "File actions" : "Folder actions"} onClose={closeFolderMenu} onOutside={target => { if (target instanceof Element && target.closest(".media-folder-menu-toggle, .media-file-menu-toggle")) return; closeFolderMenu(false); }} onClick={event => {
        const colour = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-folder-colour]")?.dataset.folderColour : undefined;
        if (colour !== undefined) void changeFolderColour(folderMenu.id, colour);
      }}>
        <button type="button" role="menuitem" disabled={!canMutate} onClick={() => {
          if (!canMutate) return;
          const item = folderMenu.kind === "file" ? selectedAsset : selectedFolder;
          if (!item) return;
          inlineRenameFinishedRef.current = false;
          setInlineRename({ id: item.id, kind: folderMenu.kind, name: item.name, before: item.name });
          closeFolderMenu(false);
        }}><StudioIcon name="pencil" size={16} />Rename</button>
        {selectedContainer ? <button type="button" role="menuitem" disabled={!canMutate} onClick={() => {
          closeFolderMenu();
          void moveMediaEntry({ id: folderMenu.id, kind: folderMenu.kind }, selectedContainer.parentId);
        }}><StudioIcon name="arrow-up" size={16} />Move to parent folder</button> : null}
        {folderMenu.kind === "file" && selectedAsset?.type.startsWith("image/") ? <button type="button" role="menuitem" onClick={() => { const id = folderMenu.id; closeFolderMenu(false); window.location.href = `/studio/designs?mediaId=${encodeURIComponent(id)}`; }}><StudioIcon name="image" size={16} />Open in design</button> : null}
        <button type="button" role="menuitem" disabled={!canMutate} onClick={() => { closeFolderMenu(); if (folderMenu.kind === "file") void removeAsset(); else void removeFolder(); }}><StudioIcon name="trash" size={16} />Delete</button>
        {folderMenu.kind === "folder" ? <button ref={colourMenuTriggerRef} className="folder-colour-trigger" type="button" role="menuitem" disabled={!canMutate} aria-haspopup="menu" aria-controls="folder-colour-menu" aria-expanded={folderMenu.colours} onMouseEnter={() => openColourMenu()} onMouseLeave={scheduleColourMenuClose} onFocus={(event) => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest(".folder-colour-menu"))) openColourMenu(); }} onClick={() => folderMenu.colours ? setFolderMenu({ ...folderMenu, colours: false }) : openColourMenu()} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); openColourMenu(); requestAnimationFrame(() => colourSubmenuRef.current?.querySelector<HTMLButtonElement>("[data-folder-colour]")?.focus()); } }}><span className="folder-colour-icon" aria-hidden="true" />Change colour<StudioIcon name="chevron-right" size={16} /></button> : null}
        {folderMenu.kind === "folder" && folderMenu.colours ? <StudioAnchoredMenu menuRef={colourSubmenuRef} presentation="custom" anchor={() => colourMenuTriggerRef.current} placement="submenu" focusOnMount={false} id="folder-colour-menu" className="folder-colour-menu" onMouseEnter={cancelColourMenuClose} onMouseLeave={scheduleColourMenuClose} aria-label="Folder colour" onClose={() => closeColourMenu()} onOutside={target => { if (folderMenuRef.current?.contains(target)) { setFolderMenu(current => current ? { ...current, colours: false } : null); } else closeFolderMenu(false); }} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); closeColourMenu(); } }}>
          {[ ["No Colour", ""], ["Red", "#ff3b30"], ["Orange", "#ff9500"], ["Yellow", "#ffcc00"], ["Green", "#34c759"], ["Blue", "#007aff"], ["Purple", "#af52de"], ["Grey", "#8e8e93"] ].map(([name, colour]) => <button key={colour} type="button" role="menuitemradio" aria-checked={(selectedFolder?.colour ?? "") === colour} disabled={!canMutate} data-folder-colour={colour}><span className="folder-colour-swatch" style={{ backgroundColor: colour || "transparent" }} />{name}</button>)}
        </StudioAnchoredMenu> : null}
      </StudioAnchoredMenu> : null}

      {previewAsset && objectUrls[previewAsset.id] ? <StudioDialog title={previewAsset.name} closeLabel="Close image preview" returnFocus={previewTriggerRef} className="media-preview-dialog" onClose={() => setPreviewAssetId(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objectUrls[previewAsset.id]} alt={previewAsset.altText || previewAsset.name} />
      </StudioDialog> : null}

      {insertAltAsset ? <StudioDialog title="Describe this image" className="media-alt-dialog" returnFocus={insertAltTriggerRef} selectInitialText onClose={dismissImageInsert}>
        <form onSubmit={(event) => { event.preventDefault(); void confirmImageInsert(); }}>
          <p>Provide alternative text for people who cannot see the image.</p>
          {insertionBusy ? <p role="status">Saving the image. Closing this window cancels preparation; an accepted change continues saving.</p> : null}
          {insertError || !assets.some(asset => asset.id === insertAltAsset.id) ? <p role="alert">{insertError || "This image was removed in another tab. Your alternative text is kept here."}</p> : null}
          <label><span>Alternative text</span><textarea disabled={!canInsert} rows={4} value={insertAltText} onChange={(event) => setInsertAltText(event.target.value)} placeholder="Describe the important content of the image" /></label>
          <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={dismissImageInsert}>Close</StudioButton><StudioButton type="submit" disabled={!canInsert || insertionBusy || !assets.some(asset => asset.id === insertAltAsset.id)}>{targetKind === "cover" ? "Use as featured image" : "Insert image"}</StudioButton></StudioDialogActions>
        </form>
      </StudioDialog> : null}

      {conflict && reviewOpen ? <StudioDialog title="Review file change" className="media-change-dialog" onClose={() => setReviewOpen(false)}>
        <p>{conflict.reason}</p>
        <p>Your action: {conflict.command.kind.replaceAll("-", " ")}</p>
        {conflict.command.kind === "rename-folder" ? <p>Your name: {conflict.command.name}</p> : conflict.command.kind === "update-asset" ? <p>{Object.entries(conflict.command.update).map(([key, value]) => `${key === "altText" ? "Alternative text" : key === "folderId" ? "Folder" : key === "caption" ? "Caption" : "Name"}: ${key === "folderId" ? folders.find(folder => folder.id === value)?.name ?? "All files" : value || "None"}`).join("; ")}</p> : null}
        <h3>Latest saved details</h3><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{conflict.latest}</p>
        <StudioDialogActions>
          <StudioButton variant="secondary" disabled={busy} onClick={() => void reviewCommand(conflict.command, new Error(conflict.reason))}>Reload details</StudioButton>
          <StudioButton variant="secondary" disabled={busy} onClick={() => { clearCommandDraft(conflict.command); setConflict(null); void refreshLibrary("Latest saved details loaded"); }}>Use saved version</StudioButton>
          <StudioButton disabled={!mediaSession.ready || busy || !conflict.retry} onClick={() => {
            const retry = conflict.retry;
            if (!retry) return;
            setBusy(true); busyRef.current = true;
            void sendCommand(retry).then(() => { setConflict(null); return refreshLibrary("File change saved"); }).catch(() => undefined).finally(() => { busyRef.current = false; if (mountedRef.current) setBusy(false); });
          }}>{conflict.command.kind.startsWith("delete-") ? "Delete reviewed item" : "Apply my change"}</StudioButton>
        </StudioDialogActions>
      </StudioDialog> : null}

      {[...assetDrafts.current].filter(([id]) => !assets.some(asset => asset.id === id)).map(([id, draft]) => <section key={id} role="note" className="media-recovery-note"><h2>Unsaved details for a removed file</h2><p>Another tab removed this file. Your text is kept here so you can copy it.</p>{Object.entries(draft.update).map(([field, value]) => <p key={field}>{field === "altText" ? "Alternative text" : field === "caption" ? "Caption" : "Name"}: {value}</p>)}<StudioButton onClick={() => { assetDrafts.current.delete(id); void refreshLibrary(); }}>Discard unsaved details</StudioButton></section>)}
      {[...folderDrafts.current].filter(([id]) => !folders.some(folder => folder.id === id)).map(([id, draft]) => <section key={id} role="note" className="media-recovery-note"><h2>Unsaved name for a removed folder</h2><p>{draft.name}</p><StudioButton onClick={() => { folderDrafts.current.delete(id); void refreshLibrary(); }}>Discard unsaved name</StudioButton></section>)}
      {inlineRename && !(inlineRename.kind === "file" ? assets : folders).some(item => item.id === inlineRename.id) ? <section role="note" className="media-recovery-note"><h2>Unsaved name for a removed item</h2><p>{inlineRename.name}</p><StudioButton onClick={() => setInlineRename(null)}>Discard unsaved name</StudioButton></section> : null}

      {conflict && !reviewOpen ? <section role="note" className="media-recovery-note"><p>An unfinished file action needs review. Your change is kept.</p><StudioButton onClick={() => setReviewOpen(true)}>Review file change</StudioButton></section> : null}

      <footer className="media-status"><span aria-live="polite">{mediaSession.ready ? assetDrafts.current.size || folderDrafts.current.size ? "Unsaved file details — leave the field to save, or review any conflict." : status : mediaSession.error || "Files reconnecting. Browsing and downloads remain available."}</span><span>{assets.length} {assets.length === 1 ? "file" : "files"} · {folders.length} {folders.length === 1 ? "folder" : "folders"} · {formatBytes(totalSize)}</span></footer>
    </section>
  );
}
