"use client";
import { useEffect, useState } from "react";
import { StudioDialog } from "../overlays/dialog";
import { ImageChoiceGrid } from "../controls/image-choice-grid";
import { useBlobUrls } from "../controls/use-blob-urls";
import { listMediaLibrary } from "../media-store";
import type { IdentityImage } from "./identity-preview-state";

/** Read existing Files only; selection stays in the caller's temporary identity draft. */
export function IdentityImagePicker({ title, opener, onChoose, onClose }: { title: string; opener: HTMLElement; onChoose: (image: IdentityImage) => void; onClose: () => void }) {
  const [choices, setChoices] = useState<IdentityImage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const urls = useBlobUrls(choices);
  useEffect(() => {
    let active = true;
    void listMediaLibrary().then(library => { if (!active) return; setChoices(library.assets.filter(asset => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(asset.blob.type)).map(asset => ({ id: asset.id, name: asset.name, altText: asset.altText, blob: asset.blob }))); setStatus("ready"); }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);
  return <StudioDialog className="image-choice-dialog" title={title} returnFocus={opener} onClose={onClose}><p>Choose an existing image from Files. This changes only the preview.</p>{status === "error" ? <p role="alert">Files could not be loaded. Close and reopen to try again.</p> : <ImageChoiceGrid choices={choices} urls={urls} loading={status === "loading"} empty="No supported images are available. Add a PNG, JPEG, WebP, or GIF through Files, then reopen this chooser." onChoose={image => onChoose(image)} />}</StudioDialog>;
}
