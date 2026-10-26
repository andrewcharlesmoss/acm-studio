"use client";

import { useEffect, useMemo, useState } from "react";
import { createManagedImageUrl } from "../../content/image-source";

type BlobChoice = { id: string; blob: Blob };

/** URLs belong to one mounted resource generation, never to render or saved data. */
export function useBlobUrls(records: readonly BlobChoice[], enabled = true) {
  const [snapshot, setSnapshot] = useState<{ blobs: Map<string, Blob>; urls: Record<string, string> }>({ blobs: new Map(), urls: {} });
  useEffect(() => {
    let cancelled = false;
    const urls: Record<string, string> = {};
    queueMicrotask(() => {
      if (cancelled) return;
      const blobs = new Map<string, Blob>();
      try {
        if (enabled) for (const record of records) {
          if (blobs.has(record.id)) continue;
          const url = createManagedImageUrl(record.blob);
          if (!url) continue;
          blobs.set(record.id, record.blob);
          urls[record.id] = url;
        }
        setSnapshot({ blobs, urls });
      } catch {
        Object.values(urls).forEach(url => URL.revokeObjectURL(url));
        setSnapshot({ blobs: new Map(), urls: {} });
      }
    });
    return () => { cancelled = true; Object.values(urls).forEach(url => URL.revokeObjectURL(url)); };
  }, [records, enabled]);
  return useMemo(() => enabled ? Object.fromEntries(records.flatMap(record => snapshot.blobs.get(record.id) === record.blob && snapshot.urls[record.id] ? [[record.id, snapshot.urls[record.id]]] : [])) : {}, [enabled, records, snapshot]);
}
