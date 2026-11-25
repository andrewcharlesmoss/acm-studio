"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { useEffect, useState } from "react";
import { MediaFileDetailsButton } from "./media-file-details";
import { listMediaLibrary, type MediaAsset } from "./media-store";
import { useMediaSession } from "./media-sync";
import "./media-library-preview.css";

type MediaKind = "audio" | "video";
export type LibraryPreviewFile = { asset: MediaAsset; kind: MediaKind; preview?: MediaAsset };
export type MediaFileActions = {
  name: string;
  source: string;
  active: boolean;
  download?: { href: string; name: string };
  format: string;
  originalFile?: { blob: Blob; addedAt: string };
};

export function MediaPreviewActions({ name, source, active, download, format, originalFile, iconOnly }: MediaFileActions & { iconOnly?: boolean }) {
  const downloadLabel = `Download ${format}`;
  return <div className="media-preview-actions" data-icon-only={iconOnly || undefined}>
    <a className="button-secondary" href={download?.href ?? source} download={download?.name ?? true}
      aria-label={`${downloadLabel} for ${name}`} title={iconOnly ? downloadLabel : undefined}>
      {iconOnly ? <AcmIcon name="action.download" scale="Regular-S" size={20} /> : downloadLabel}
    </a>
    {active ? <MediaFileDetailsButton name={download?.name ?? (source.split("/").at(-1) || name)}
      source={originalFile?.blob ?? source} addedAt={originalFile?.addedAt} iconOnly={iconOnly} /> : null}
  </div>;
}

export function useLibraryPreviewFiles(kind: MediaKind) {
  const { revision, ready, error } = useMediaSession();
  const [library, setLibrary] = useState<{ files: LibraryPreviewFile[]; unavailable: boolean }>({ files: [], unavailable: false });

  useEffect(() => {
    let cancelled = false;
    void listMediaLibrary().then(({ assets, folders }) => {
      if (cancelled) return;
      const sourceFolders = new Set(folders.filter(folder => folder.parentId === null
        && (folder.name === "Motion Assets" || (kind === "audio" && folder.name === "Sound Effects"))).map(folder => folder.id));
      const previewFolders = new Map(folders.filter(folder => kind === "video"
        && folder.parentId && sourceFolders.has(folder.parentId) && folder.name === "Previews"
      ).map(folder => [folder.id, folder.parentId]));
      const previews = assets.filter(asset => asset.folderId && previewFolders.has(asset.folderId) && asset.blob.type === "video/mp4");
      const mediaType = `${kind}/`;
      const files = assets.flatMap<LibraryPreviewFile>(asset => {
        if (!asset.folderId || !sourceFolders.has(asset.folderId)
          || !asset.type.startsWith(mediaType) || !asset.blob.type.startsWith(mediaType)) return [];
        const name = asset.name.toLowerCase();
        const matches = kind === "video" && name.endsWith(".mov") ? previews.filter(item =>
          item.folderId && previewFolders.get(item.folderId) === asset.folderId && item.name.toLowerCase() === name.replace(/\.mov$/, ".mp4")
        ) : [];
        return [{ asset, kind, preview: matches.length === 1 ? matches[0] : undefined }];
      }).sort((left, right) => left.asset.name.localeCompare(right.asset.name));
      setLibrary({ files, unavailable: false });
    }).catch(() => {
      // An empty library may still be waiting for its first Files owner.
      if (!cancelled) setLibrary({ files: [], unavailable: ready || Boolean(error) });
    });
    return () => { cancelled = true; };
  }, [kind, ready, error, revision]);

  return library;
}

export function useLibraryFilePreview(file: LibraryPreviewFile) {
  const { asset, preview, kind } = file;
  const original = asset.blob;
  const playback = preview?.blob ?? original;
  const [urls, setUrls] = useState<{ original: Blob; playback: Blob; source: string; download: string }>();
  useEffect(() => {
    let cancelled = false;
    const download = URL.createObjectURL(original);
    const source = playback === original ? download : URL.createObjectURL(playback);
    queueMicrotask(() => { if (!cancelled) setUrls({ original, playback, source, download }); });
    return () => {
      cancelled = true;
      if (source !== download) URL.revokeObjectURL(source);
      URL.revokeObjectURL(download);
    };
  }, [original, playback]);

  if (urls?.original !== original || urls.playback !== playback) return null;
  const extension = /\.([a-z0-9]{1,8})$/i.exec(asset.name)?.[1]?.toUpperCase();
  return {
    name: asset.name, kind, source: urls.source,
    download: { href: urls.download, name: asset.name },
    originalFile: { blob: original, addedAt: asset.createdAt },
    description: asset.caption || asset.altText, detail: extension, format: extension ?? "File",
  };
}
