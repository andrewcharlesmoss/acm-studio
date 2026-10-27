"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createManagedImageUrl, isSafeManagedImageType } from "../../content/image-source";

type BlobChoice = { id: string; blob: Blob };

/** URLs belong to one mounted resource generation, never to render or saved data. */
export function useBlobUrls(records: readonly BlobChoice[], enabled = true) {
  const [snapshot, setSnapshot] = useState<{ blobs: Map<string, Blob>; urls: Record<string, string> }>({ blobs: new Map(), urls: {} });
  const retained = useRef(new Map<string, { blob: Blob; url: string }>());
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const desired = new Map<string, Blob>();
      const created: string[] = [];
      try {
        if (enabled) for (const record of records) if (!desired.has(record.id) && isSafeManagedImageType(record.blob.type)) desired.set(record.id, record.blob);
        for (const [id, entry] of retained.current) {
          if (desired.get(id) === entry.blob) continue;
          URL.revokeObjectURL(entry.url);
          retained.current.delete(id);
        }
        for (const [id, blob] of desired) {
          if (retained.current.has(id)) continue;
          const url = createManagedImageUrl(blob);
          if (!url) continue;
          retained.current.set(id, { blob, url });
          created.push(id);
        }
      } catch {
        for (const id of created) {
          const entry = retained.current.get(id);
          if (entry) URL.revokeObjectURL(entry.url);
          retained.current.delete(id);
        }
      }
      setSnapshot({ blobs: new Map([...retained.current].map(([id, entry]) => [id, entry.blob])), urls: Object.fromEntries([...retained.current].map(([id, entry]) => [id, entry.url])) });
    });
    return () => { cancelled = true; };
  }, [records, enabled]);
  useEffect(() => () => { for (const entry of retained.current.values()) URL.revokeObjectURL(entry.url); retained.current.clear(); }, []);
  return useMemo(() => enabled ? Object.fromEntries(records.flatMap(record => snapshot.blobs.get(record.id) === record.blob && snapshot.urls[record.id] ? [[record.id, snapshot.urls[record.id]]] : [])) : {}, [enabled, records, snapshot]);
}
