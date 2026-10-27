"use client";

import { useRef, type CSSProperties } from "react";
import { StudioIcon } from "../studio/studio-icons";

export function ImageLightbox({ src, alt, title, style, imageAttributes }: { src: string; alt: string; title?: string; style: CSSProperties; imageAttributes?: { "data-image-duotone-authored"?: string } }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return <>
    <button ref={triggerRef} className="image-lightbox-trigger" type="button" aria-label={alt ? `Enlarge image: ${alt}` : "Enlarge image"} onClick={() => dialogRef.current?.showModal()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" title={title} style={style} {...imageAttributes} />
    </button>
    <dialog ref={dialogRef} className="image-lightbox-dialog" aria-label={alt || "Enlarged image"} onClose={() => triggerRef.current?.focus()}>
      <button type="button" className="image-lightbox-close" aria-label="Close enlarged image" onClick={() => dialogRef.current?.close()}><StudioIcon name="close" /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="image-lightbox-enlarged" src={src} alt={alt} style={style.filter !== undefined ? { filter: style.filter } : undefined} {...imageAttributes} />
    </dialog>
  </>;
}
