"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useBlobUrls } from "./controls/use-blob-urls";
import { ImageChoiceGrid } from "./controls/image-choice-grid";
import type { InlineImage } from "../content/model";
import { safeImageSource } from "../content/rich-text";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";

export type InlineImageChoice = { id: string; name: string; altText?: string; blob: Blob };
export type InlineImageLibrary = () => Promise<InlineImageChoice[]>;
const emptyChoices: InlineImageChoice[] = [];

/** Measure before proposing an object; a failed load never changes source text. */
export function measureInlineImage(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => finish(), 15000);
    function finish(width?: number) {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (width && Number.isFinite(width)) resolve(Math.min(width, 150));
      else reject(new Error("Image unavailable"));
    }
    image.onload = () => finish(image.naturalWidth);
    image.onerror = () => finish();
    image.src = src;
  });
}

/** A mounted picker retains its caller's field; media providers remain explicit. */
export function InlineImagePicker({ loadImages, replacing, returnFocus, onChoose, onClose }: {
  loadImages?: InlineImageLibrary;
  replacing: boolean;
  returnFocus: HTMLElement | RefObject<HTMLElement | null>;
  onChoose: (image: InlineImage) => boolean;
  onClose: () => void;
}) {
  const [choices, setChoices] = useState<InlineImageChoice[] | null>(loadImages ? null : []);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const imageUrls = useBlobUrls(choices ?? emptyChoices);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const epoch = ++generation.current;
    pending.current = false;
    void Promise.resolve().then(() => {
      if (generation.current !== epoch) return;
      setBusy(false);
      setError(null);
      setChoices(loadImages ? null : []);
      return loadImages?.();
    }).then(records => {
      if (generation.current !== epoch) return;
      setChoices(records ?? []);
    }).catch(() => {
      if (generation.current === epoch) setError("Local images could not be loaded. Close and reopen the picker to try again.");
    });
    // This is a request generation counter, not a mounted DOM ref.
    // Invalidate the latest decode as well as this provider session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++; };
  }, [loadImages]);

  async function choose(src: string, descriptor: Omit<InlineImage, "width">) {
    if (pending.current) return;
    pending.current = true;
    const epoch = generation.current;
    setBusy(true);
    setError(null);
    try {
      const width = await measureInlineImage(src);
      if (generation.current !== epoch) return;
      if (!onChoose({ ...descriptor, width })) setError("The editing target changed. Close and reselect the text before inserting an image.");
    } catch {
      if (generation.current === epoch) setError("The image could not be loaded. Your original content has been retained.");
    } finally {
      if (generation.current === epoch) { pending.current = false; setBusy(false); }
    }
  }

  return <StudioDialog title={replacing ? "Replace image" : "Insert inline image"} returnFocus={returnFocus} onClose={() => { generation.current++; onClose(); }} className="inline-image-picker">
    {loadImages ? <section aria-label="Local images">
      <h3>Local images</h3>
      <ImageChoiceGrid choices={choices ?? emptyChoices} urls={imageUrls} loading={choices === null} disabled={busy} empty="No local images are available." className="inline-image-choices" onChoose={(choice, src) => void choose(src, { type: "image", mediaId: choice.id, alt: choice.altText ?? "" })} />
    </section> : null}
    <form onSubmit={event => {
      event.preventDefault();
      const src = safeImageSource(url.trim());
      if (!src) { setError("Enter a supported image URL."); return; }
      void choose(src, { type: "image", src, alt });
    }}>
      <label>Image URL<input type="text" inputMode="url" value={url} maxLength={12000} disabled={busy} onChange={event => setUrl(event.target.value)} /></label>
      <label>Alternative text<input value={alt} maxLength={1000} disabled={busy} onChange={event => setAlt(event.target.value)} /></label>
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={() => { generation.current++; onClose(); }}>Cancel</StudioButton><StudioButton type="submit" disabled={busy || !safeImageSource(url.trim())}>{busy ? "Loading…" : replacing ? "Replace image" : "Insert image"}</StudioButton></StudioDialogActions>
    </form>
    {error ? <p role="alert">{error}</p> : null}
  </StudioDialog>;
}
