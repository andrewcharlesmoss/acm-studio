"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MediaFileDetailsButton } from "./media-file-details";
import { listMediaLibrary, type MediaAsset } from "./media-store";
import { useMediaSession } from "./media-sync";
import "./media-library-preview.css";

type MediaKind = "audio" | "video";
type LibraryPreviewFile = { asset: MediaAsset; kind: MediaKind; preview?: MediaAsset };

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

export function MediaPreviewCard({ name, source, kind, active, download, description, detail, format, originalFile }: {
  name: string;
  source: string;
  kind: MediaKind;
  active: boolean;
  download?: { href: string; name: string };
  description?: string;
  detail?: string;
  format: string;
  originalFile?: { blob: Blob; addedAt: string };
}) {
  const player = useRef<HTMLMediaElement | null>(null);
  const descriptionId = useId();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const media = player.current;
    if (!active) media?.pause();
    return () => media?.pause();
  }, [active]);

  const playback = {
    "aria-label": `${name} preview`,
    "aria-describedby": description ? descriptionId : undefined,
    ref: (element: HTMLMediaElement | null) => { player.current = element; },
    src: source,
    controls: true,
    controlsList: "nodownload",
    preload: "none",
    onError: () => setUnavailable(true),
    onCanPlay: () => setUnavailable(false),
  };
  return <li className="media-preview-card">
    <div className="media-preview-name"><strong>{name}</strong>{detail ? <span>{detail}</span> : null}</div>
    {description ? <span className="sr-only" id={descriptionId}>{description}</span> : null}
    {/* eslint-disable-next-line jsx-a11y/media-has-caption -- This player previews locally selected media. Supplied descriptions are linked above. */}
    {kind === "audio" ? <audio {...playback} /> : <video {...playback} playsInline />}
    <div className="media-preview-actions">
      <a className="button-secondary" href={download?.href ?? source} download={download?.name ?? true}
        aria-label={`Download ${format} for ${name}`}>Download {format}</a>
      {active ? <MediaFileDetailsButton name={download?.name ?? (source.split("/").at(-1) || name)}
        source={originalFile?.blob ?? source} addedAt={originalFile?.addedAt} /> : null}
    </div>
    {unavailable ? <p role="alert">This preview couldn’t play. Download the file to open it in another app.</p> : null}
  </li>;
}

export function LibraryFilePreview({ file, active }: { file: LibraryPreviewFile; active: boolean }) {
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
  return <MediaPreviewCard key={urls.source} name={asset.name} kind={kind} active={active} source={urls.source}
    download={{ href: urls.download, name: asset.name }} description={asset.caption || asset.altText}
    originalFile={{ blob: original, addedAt: asset.createdAt }}
    detail={extension} format={extension ?? "File"} />;
}
