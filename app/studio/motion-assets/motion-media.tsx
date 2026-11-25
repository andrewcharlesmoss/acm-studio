"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MediaFileDetailsButton } from "../media-file-details";
import { listMediaLibrary, type MediaAsset } from "../media-store";
import { useMediaSession } from "../media-sync";

type MediaKind = "audio" | "video";
type LibraryMotionFile = { asset: MediaAsset; kind: MediaKind; preview?: MediaAsset };

export const motionSoundCatalogue = [
  {
    name: "Explosion and Glass",
    src: "/motion-assets/explosion-and-glass.wav",
    duration: "4.1 s",
    description: "A low explosion with a sharp glass crack, followed by scattered clinks and a fading rumble.",
    keywords: "blast boom shatter smash breaking debris impact audio",
  },
];

export function useMotionLibraryFiles() {
  const { revision, ready, error } = useMediaSession();
  const [library, setLibrary] = useState<{ files: LibraryMotionFile[]; unavailable: boolean }>({ files: [], unavailable: false });

  useEffect(() => {
    let cancelled = false;
    void listMediaLibrary().then(({ assets, folders }) => {
      if (cancelled) return;
      const motionFolders = new Set(folders.filter(folder => folder.parentId === null && folder.name === "Motion Assets").map(folder => folder.id));
      const previewFolders = new Map(folders.filter(folder =>
        folder.parentId && motionFolders.has(folder.parentId) && folder.name === "Previews"
      ).map(folder => [folder.id, folder.parentId]));
      const previews = assets.filter(asset => asset.folderId && previewFolders.has(asset.folderId) && asset.blob.type === "video/mp4");
      const files = assets.flatMap<LibraryMotionFile>(asset => {
        if (!asset.folderId || !motionFolders.has(asset.folderId)) return [];
        if (asset.type.startsWith("audio/") && asset.blob.type.startsWith("audio/")) return [{ asset, kind: "audio" }];
        if (!asset.type.startsWith("video/") || !asset.blob.type.startsWith("video/")) return [];
        const name = asset.name.toLowerCase();
        const matches = name.endsWith(".mov") ? previews.filter(item =>
          item.folderId && previewFolders.get(item.folderId) === asset.folderId && item.name.toLowerCase() === name.replace(/\.mov$/, ".mp4")
        ) : [];
        return [{ asset, kind: "video", preview: matches.length === 1 ? matches[0] : undefined }];
      }).sort((left, right) => left.asset.name.localeCompare(right.asset.name));
      setLibrary({ files, unavailable: false });
    }).catch(() => {
      // An empty library may still be waiting for its first Files owner.
      if (!cancelled) setLibrary({ files: [], unavailable: ready || Boolean(error) });
    });
    return () => { cancelled = true; };
  }, [ready, error, revision]);

  return library;
}

export function MotionMediaPreview({ name, source, kind, active, download, description, detail, format, originalFile }: {
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
  return <li className="motion-media-card">
    <div className="motion-media-name"><strong>{name}</strong>{detail ? <span>{detail}</span> : null}</div>
    {description ? <span className="sr-only" id={descriptionId}>{description}</span> : null}
    {/* eslint-disable-next-line jsx-a11y/media-has-caption -- This player previews locally selected media. Supplied descriptions are linked above. */}
    {kind === "audio" ? <audio {...playback} /> : <video {...playback} playsInline />}
    <div className="motion-media-actions">
      <a className="button-secondary" href={download?.href ?? source} download={download?.name ?? true}
        aria-label={`Download ${format} for ${name}`}>Download {format}</a>
      {active ? <MediaFileDetailsButton name={download?.name ?? (source.split("/").at(-1) || name)}
        source={originalFile?.blob ?? source} addedAt={originalFile?.addedAt} /> : null}
    </div>
    {unavailable ? <p role="alert">This preview couldn’t play. Download the file to open it in another app.</p> : null}
  </li>;
}

export function MotionFilePreview({ file, active }: { file: LibraryMotionFile; active: boolean }) {
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
  return <MotionMediaPreview key={urls.source} name={asset.name} kind={kind} active={active} source={urls.source}
    download={{ href: urls.download, name: asset.name }} description={asset.caption || asset.altText}
    originalFile={{ blob: original, addedAt: asset.createdAt }}
    detail={extension} format={extension ?? "File"} />;
}
