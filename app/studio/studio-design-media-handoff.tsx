"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadAndInsertDesignMedia } from "./design-media-handoff-command";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import type { MediaAsset } from "./media-store";
import type { useStudioMedia } from "./use-studio-media";

/** Reuse the screen's media session; this component never opens another store. */
export function StudioDesignMediaHandoff({ documentId, writable, media, onInsert }: {
  documentId: string; writable: boolean;
  media: Pick<ReturnType<typeof useStudioMedia>, "loadAssetById">;
  onInsert: (documentId: string, asset: MediaAsset, target: "block" | "cover", altText: string) => boolean;
}) {
  const [prompt, setPrompt] = useState<{ asset: MediaAsset; target: "block" | "cover"; documentId: string } | null>(null);
  const [altText, setAltText] = useState("");
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
  function closePrompt() { request.current.id++; request.current.busy = false; setInserting(false); setPrompt(null); }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaId = params.get("designMedia");
    if (!mediaId || !writable) return;
    let cancelled = false;
    void media.loadAssetById(mediaId).then(asset => {
      if (cancelled || !asset || !asset.type.startsWith("image/")) return;
      window.history.replaceState({}, "", window.location.pathname);
      setAltText(asset.altText || asset.name.replace(/\.[^.]+$/, ""));
      setPrompt({ asset, documentId, target: params.get("designTarget") === "cover" ? "cover" : "block" });
    }).catch(() => { if (!cancelled) setError("The image could not be loaded. Return to Files and try again."); });
    return () => { cancelled = true; };
  }, [documentId, writable, media]);
  const currentPrompt = prompt?.documentId === documentId && writable ? prompt : null;
  async function insertDesignMedia() {
    if (!currentPrompt || request.current.busy) return;
    request.current.busy = true; setInserting(true); setError("");
    const id = ++request.current.id;
    const isCurrent = () => request.current.id === id && context.current.writable && context.current.documentId === currentPrompt.documentId;
    try {
      const result = await loadAndInsertDesignMedia({ documentId: currentPrompt.documentId, mediaId: currentPrompt.asset.id,
        target: currentPrompt.target, altText: altText.trim(), loadAsset: media.loadAssetById, isCurrent,
        insert: (...args) => context.current.onInsert(...args),
      });
      if (!isCurrent()) return;
      if (result !== "accepted") { setError("The image could not be inserted. Check the editing status and try again."); return; }
      window.history.replaceState({}, "", window.location.pathname); setPrompt(null);
    } catch { if (isCurrent()) setError("The image could not be inserted. Return to Files and try again."); }
    finally { if (request.current.id === id) { request.current.busy = false; setInserting(false); } }
  }
  if (!currentPrompt) return error ? <p role="alert">{error}</p> : null;
  return <StudioDialog title="Describe this image" className="media-alt-dialog" selectInitialText onClose={closePrompt}>
    <form onSubmit={event => { event.preventDefault(); void insertDesignMedia(); }}>
      <p>Provide alternative text for people who cannot see the image.</p>
      <label><span>Alternative text</span><textarea rows={4} value={altText} onChange={event => setAltText(event.target.value)} placeholder="Describe the important content of the image" /></label>
      {error ? <p role="alert">{error}</p> : null}
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={closePrompt}>Cancel</StudioButton><StudioButton type="submit" disabled={inserting} aria-busy={inserting}>{currentPrompt.target === "cover" ? "Use as cover image" : "Insert image"}</StudioButton></StudioDialogActions>
    </form>
  </StudioDialog>;
}
