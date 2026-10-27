"use client";
import { useId } from "react";
import type { ContentBlock } from "../../content/model";
import { validImageDuotone } from "../../content/image-duotone";
import { imageDisplayStyle } from "../../content/image-style";
import { DuotoneFilter } from "../duotone-filter";
import { ImageLightbox } from "../image-lightbox";

/** One painted Image surface for authoring, previews, publication and lightbox. */
export function ImageContent({ block, src, lightbox = false, draggable }: {
  block: Extract<ContentBlock, { type: "image" }>;
  src: string;
  lightbox?: boolean;
  draggable?: boolean;
}) {
  const filterId = `image-duotone-${useId().replace(/:/g, "")}`;
  const owned = block.duotone !== undefined;
  const effect = validImageDuotone(block.duotone) ? block.duotone : null;
  const style = { ...imageDisplayStyle(block), ...(owned ? { filter: effect ? `url("#${filterId}")` : "none" } : {}) };
  const attributes = { "data-image-duotone-authored": owned ? "true" : undefined };
  return <>
    {effect ? <DuotoneFilter id={filterId} value={effect} /> : null}
    {lightbox ? <ImageLightbox src={src} alt={block.alt} title={block.title} style={style} imageAttributes={attributes} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img draggable={draggable} src={src} alt={block.decorative ? "" : block.alt} title={block.title} style={style} {...attributes} />}
  </>;
}
