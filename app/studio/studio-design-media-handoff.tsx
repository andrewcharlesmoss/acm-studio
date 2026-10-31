"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadAndInsertDesignMedia } from "./design-media-handoff-command";
import type { MediaAsset } from "./media-store";
import type { useStudioMedia } from "./use-studio-media";

/** Reuse the screen's media session; this component never opens another store. */
export function StudioDesignMediaHandoff({ documentId, writable, media, onInsert }: {
  documentId: string; writable: boolean;
  media: Pick<ReturnType<typeof useStudioMedia>, "loadAssetById">;
  onInsert: (documentId: string, asset: MediaAsset, target: "block" | "cover", altText: string) => boolean;
}) {
  const [error, setError] = useState("");
  const [inserting, setInserting] = useState(false);
  const request = useRef({ id: 0, busy: false });
  const context = useRef({ documentId, writable, onInsert });
  useLayoutEffect(() => { context.current = { documentId, writable, onInsert }; });
  useLayoutEffect(() => {
    const operation = request.current;
    operation.id++; operation.busy = false;
    return () => { operation.id++; operation.busy = false; };
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaId = params.get("designMedia");
    if (!mediaId || !writable || request.current.busy) return;
    const target = params.get("designTarget") === "cover" ? "cover" : "block";
    const operation = request.current;
    operation.busy = true;
    const id = ++operation.id;
    setError("");
    setInserting(true);
    const isCurrent = () => operation.id === id && context.current.writable && context.current.documentId === documentId;
    void loadAndInsertDesignMedia({ documentId, mediaId, target, altText: "", loadAsset: media.loadAssetById, isCurrent,
      insert: (...args) => context.current.onInsert(...args),
    }).then(result => {
      if (!isCurrent()) return;
      if (result !== "accepted") { setError("The image could not be inserted. Check the editing status and try again."); return; }
      window.history.replaceState({}, "", window.location.pathname);
    }).catch(() => { if (isCurrent()) setError("The image could not be inserted. Return to Files and try again."); })
      .finally(() => { if (operation.id === id) { operation.busy = false; setInserting(false); } });
    return () => { if (operation.id === id) { operation.id++; operation.busy = false; } };
  }, [documentId, writable, media]);
  if (error) return <p role="alert">{error}</p>;
  return inserting ? <p role="status" className="visually-hidden">Inserting image…</p> : null;
}
