"use client";
import { useId, type CSSProperties } from "react";
import type { ContentBlock } from "../../content/model";
import { validImageDuotone } from "../../content/image-duotone";
import { imageDisplayStyle } from "../../content/image-style";
import { imageCropSvgGeometry, validImageCropEdit } from "../../content/image-edit";
import { DuotoneFilter } from "../duotone-filter";
import { ImageLightbox } from "../image-lightbox";

/** One painted Image surface for authoring, previews, publication and lightbox. */
export function ImageContent({ block, src, lightbox = false, draggable, coverFrame = false }: {
  block: Extract<ContentBlock, { type: "image" | "cover" }>;
  src: string;
  lightbox?: boolean;
  draggable?: boolean;
  coverFrame?: boolean;
}) {
  const filterId = `image-duotone-${useId().replace(/:/g, "")}`;
  const owned = block.duotone !== undefined;
  const effect = validImageDuotone(block.duotone) ? block.duotone : null;
  const cropEdit = validImageCropEdit(block.imageEdit) ? block.imageEdit : null;
  const style: CSSProperties = { ...imageDisplayStyle(block, { coverFrame }), ...(owned ? { filter: effect ? `url("#${filterId}")` : "none" } : {}) };
  const attributes = { "data-image-duotone-authored": owned ? "true" : undefined };
  const croppedStyle = { ...style, maxWidth: "100%", width: coverFrame ? "100%" : style.width ?? "100%", height: coverFrame ? style.height : style.height ?? "auto", display: "block", objectFit: undefined, objectPosition: undefined } as CSSProperties;
  if (cropEdit) {
    croppedStyle.aspectRatio = `${cropEdit.crop.width * cropEdit.sourceWidth} / ${cropEdit.crop.height * cropEdit.sourceHeight}`;
  }
  const cropGeometry = cropEdit ? imageCropSvgGeometry(cropEdit, cropEdit.sourceWidth, cropEdit.sourceHeight) : null;
  const renderCropped = (className: string, imageAlt: string) => cropGeometry && cropEdit ? <svg className={className || undefined} xmlns="http://www.w3.org/2000/svg" width={Math.max(1, Math.round(cropEdit.crop.width * cropEdit.sourceWidth))} height={Math.max(1, Math.round(cropEdit.crop.height * cropEdit.sourceHeight))} viewBox={cropGeometry.viewBox} role={imageAlt ? "img" : undefined} aria-label={imageAlt || undefined} aria-hidden={imageAlt ? undefined : "true"} style={className ? { filter: style.filter } : croppedStyle} {...attributes}>
    <image href={src} x="0" y="0" width={cropEdit.sourceWidth} height={cropEdit.sourceHeight} preserveAspectRatio="none" transform={cropGeometry.transform} />
  </svg> : null;
  return <>
    {effect ? <DuotoneFilter id={filterId} value={effect} /> : null}
    {cropEdit ? <>
      {lightbox && block.type === "image" ? <ImageLightbox src={src} alt={block.alt} title={block.title} style={style} imageAttributes={attributes} renderImage={(className, imageAlt) => renderCropped(className, imageAlt)} /> : renderCropped("", block.decorative ? "" : block.alt)}
    </> : lightbox && block.type === "image" ? <ImageLightbox src={src} alt={block.alt} title={block.title} style={style} imageAttributes={attributes} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img draggable={draggable} src={src} alt={block.decorative ? "" : block.alt} title={block.title} style={style} {...attributes} />}
  </>;
}
