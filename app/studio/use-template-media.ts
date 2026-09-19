"use client";
import { useEffect, useState } from "react";
import { getMediaAsset } from "./media-store";
export { contentMediaIds } from "../content/media-references";

export function useTemplateMedia(ids: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([...new Set(ids)].sort());
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    void Promise.all((JSON.parse(key) as string[]).map(async id => ({ id, asset: await getMediaAsset(id) }))).then(records => {
      if (cancelled) return;
      const next: Record<string, string> = Object.create(null);
      for (const { id, asset } of records) if (asset) { const url = URL.createObjectURL(asset.blob); created.push(url); next[id] = url; }
      setUrls(next); setError(records.some(record => !record.asset) ? "A referenced image is missing from this browser." : null);
    }).catch(() => { if (!cancelled) setError("Template images could not be loaded."); });
    return () => { cancelled = true; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [key]);
  return { urls, error };
}
