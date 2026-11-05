"use client";
import { useEffect, useState } from "react";
import { useMediaSession } from "./media-sync";
import { useBlobUrlsWithReadiness } from "./controls/use-blob-urls";
import { getMediaAsset, type MediaAsset } from "./media-store";
export { contentMediaIds } from "../content/media-references";

export function useTemplateMedia(ids: string[]) {
  const { revision: mediaRevision } = useMediaSession();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const { urls, ready: urlsReady } = useBlobUrlsWithReadiness(assets);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([...new Set(ids)].sort());
  useEffect(() => {
    let cancelled = false;
    void Promise.all((JSON.parse(key) as string[]).map(async id => ({ id, asset: await getMediaAsset(id) }))).then(records => {
      if (cancelled) return;
      setAssets(records.flatMap(record => record.asset ? [record.asset] : []));
      setError(records.some(record => !record.asset) ? "A referenced image is missing from this browser." : null);
      setLoadedKey(`${mediaRevision}:${key}`);
    }).catch(() => { if (!cancelled) { setAssets([]); setError("Template images could not be loaded."); setLoadedKey(`${mediaRevision}:${key}`); } });
    return () => { cancelled = true; };
  }, [key, mediaRevision]);
  return { urls, error, ready: loadedKey === `${mediaRevision}:${key}` && urlsReady };
}
