"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ContentBlock } from "../content/model";
import { ImageContent } from "../components/blocks/image-content";

type ImageBlock = Extract<ContentBlock, { type: "image" }>;
type ResizeAxis = "width" | "height";
type ImageSize = { width: number; height: number };
type Gesture = {
  axis: ResizeAxis;
  pointerId: number;
  target: HTMLButtonElement;
  origin: { x: number; y: number };
  initial: ImageSize;
  latest: ImageSize;
  ratio: number;
  scaleX: number;
  scaleY: number;
  maxWidth: number;
  moved: boolean;
  sourceSnapshot: string;
};

const MINIMUM_IMAGE_DIMENSION = 32;
const MAXIMUM_IMAGE_DIMENSION = 2400;

function renderedSize(image: HTMLImageElement | SVGSVGElement): ImageSize | null {
  if (image instanceof HTMLImageElement && (!image.naturalWidth || !image.naturalHeight)) return null;
  const rect = image.getBoundingClientRect();
  const parent = image.closest("figure");
  const scale = parent && parent.clientWidth ? parent.getBoundingClientRect().width / parent.clientWidth : 1;
  if (!rect.width || !rect.height || !scale) return null;
  return { width: Math.round(rect.width / scale), height: Math.round(rect.height / scale) };
}

function resizeImage(size: ImageSize, ratio: number, axis: ResizeAxis, amount: number, maxWidth: number): ImageSize {
  const start = axis === "width" ? size.width : size.height;
  const requested = Math.max(MINIMUM_IMAGE_DIMENSION, Math.min(MAXIMUM_IMAGE_DIMENSION, start + amount));
  const desiredScale = requested / start;
  const minimumScale = Math.max(MINIMUM_IMAGE_DIMENSION / size.width, MINIMUM_IMAGE_DIMENSION / size.height);
  const maximumScale = Math.min(maxWidth / size.width, MAXIMUM_IMAGE_DIMENSION / size.width, MAXIMUM_IMAGE_DIMENSION / size.height);
  const scale = Math.max(minimumScale, Math.min(maximumScale, desiredScale));
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

/** Direct Image block resizing; dimension persistence stays with the editor owner. */
export function ImageResizeControls({ block, src, enabled, link, onChange }: {
  block: ImageBlock;
  src: string;
  enabled: boolean;
  link?: { href: string; target?: "_blank"; rel?: string; label?: string };
  onChange: (block: ImageBlock, expectedBlock?: ImageBlock) => void;
}) {
  const surface = useRef<HTMLSpanElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [previewSize, setPreviewSize] = useState<ImageSize | null>(null);
  const helpId = useId();
  const displayedBlock: ImageBlock = previewSize
    ? { ...block, displayWidth: previewSize.width, displayHeight: previewSize.height }
    : block;

  useLayoutEffect(() => {
    const active = gesture.current;
    if (!active || enabled && JSON.stringify(block) === active.sourceSnapshot) return;
    gesture.current = null;
    // Cancel before the next paint when selection, ownership or image data changes.
    setPreviewSize(null);
    if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
  }, [block, enabled]);

  function imageElement() {
    return surface.current?.querySelector<HTMLImageElement | SVGSVGElement>("img, svg[viewBox]") ?? null;
  }

  function commit(size: ImageSize, expectedBlock: ImageBlock = block) {
    const preserveNaturalHeight = expectedBlock.aspectRatio === undefined || expectedBlock.aspectRatio === "original";
    const widthOnly = preserveNaturalHeight && expectedBlock.displayHeight === undefined;
    onChange({
      ...expectedBlock,
      displayWidth: size.width,
      displayHeight: widthOnly ? undefined : size.height,
    }, expectedBlock);
  }

  function begin(axis: ResizeAxis, event: PointerEvent<HTMLButtonElement>) {
    if (!enabled || event.button !== 0 || gesture.current) return;
    const image = imageElement();
    const current = image && renderedSize(image);
    const parentWidth = surface.current?.parentElement?.clientWidth ?? MAXIMUM_IMAGE_DIMENSION;
    if (!image || !current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    const boundedWidth = Math.max(MINIMUM_IMAGE_DIMENSION, Math.min(current.width, parentWidth, MAXIMUM_IMAGE_DIMENSION));
    const boundedHeight = Math.max(MINIMUM_IMAGE_DIMENSION, Math.min(current.height, MAXIMUM_IMAGE_DIMENSION));
    const initial = { width: boundedWidth, height: boundedHeight };
    const rect = image.getBoundingClientRect();
    gesture.current = {
      axis,
      pointerId: event.pointerId,
      target: event.currentTarget,
      origin: { x: event.clientX, y: event.clientY },
      initial,
      latest: initial,
      ratio: initial.width / initial.height,
      scaleX: rect.width / current.width || 1,
      scaleY: rect.height / current.height || 1,
      maxWidth: Math.max(MINIMUM_IMAGE_DIMENSION, Math.min(parentWidth, MAXIMUM_IMAGE_DIMENSION)),
      moved: false,
      sourceSnapshot: JSON.stringify(block),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = active.axis === "width"
      ? (event.clientX - active.origin.x) / active.scaleX
      : (event.clientY - active.origin.y) / active.scaleY;
    active.moved = active.moved || Math.abs(delta) > 2;
    active.latest = resizeImage(active.initial, active.ratio, active.axis, delta, active.maxWidth);
    setPreviewSize(active.latest);
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!enabled || JSON.stringify(block) !== active.sourceSnapshot) {
      cancel(event);
      return;
    }
    move(event);
    const final = gesture.current?.latest ?? active.latest;
    gesture.current = null;
    setPreviewSize(null);
    if (active.moved && (final.width !== active.initial.width || final.height !== active.initial.height)) commit(final, block);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function cancel(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPreviewSize(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function finishInterrupted(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPreviewSize(null);
    if (enabled && JSON.stringify(block) === active.sourceSnapshot && active.moved
      && (active.latest.width !== active.initial.width || active.latest.height !== active.initial.height)) {
      commit(active.latest, block);
    }
  }

  function keyResize(axis: ResizeAxis, event: KeyboardEvent<HTMLButtonElement>) {
    if (!enabled) return;
    if (event.key === "Escape" && gesture.current) {
      event.preventDefault();
      event.stopPropagation();
      const active = gesture.current;
      gesture.current = null;
      setPreviewSize(null);
      if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
      return;
    }
    const positiveKeys = axis === "width" ? ["ArrowRight"] : ["ArrowDown"];
    const negativeKeys = axis === "width" ? ["ArrowLeft"] : ["ArrowUp"];
    if (![...positiveKeys, ...negativeKeys].includes(event.key)) return;
    const image = imageElement();
    const current = image && renderedSize(image);
    if (!image || !current) return;
    event.preventDefault();
    event.stopPropagation();
    const parentWidth = surface.current?.parentElement?.clientWidth ?? MAXIMUM_IMAGE_DIMENSION;
    const amount = (positiveKeys.includes(event.key) ? 1 : -1) * (event.shiftKey ? 10 : 1);
    const next = resizeImage(current, current.width / current.height, axis, amount, Math.max(MINIMUM_IMAGE_DIMENSION, Math.min(parentWidth, MAXIMUM_IMAGE_DIMENSION)));
    if (next.width !== current.width || next.height !== current.height) commit(next, block);
  }

  return <span ref={surface} className={`image-resize-surface${enabled ? " has-resize-handles" : ""}`} data-image-explicit-width={displayedBlock.displayWidth ? "true" : undefined} data-image-cropped={displayedBlock.imageEdit ? "true" : undefined}>
    {link ? <a href={link.href} target={link.target} rel={link.rel} aria-label={link.label} onClick={event => event.preventDefault()}><ImageContent block={displayedBlock} src={src} draggable={false} /></a>
      : <ImageContent block={displayedBlock} src={src} draggable={false} />}
    {enabled ? <>
      <button className="image-resize-handle is-width" type="button" aria-label="Resize image width" aria-describedby={helpId} title="Resize image width" onPointerDown={event => begin("width", event)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={finishInterrupted} onKeyDown={event => keyResize("width", event)} />
      <button className="image-resize-handle is-height" type="button" aria-label="Resize image height" aria-describedby={helpId} title="Resize image height" onPointerDown={event => begin("height", event)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={finishInterrupted} onKeyDown={event => keyResize("height", event)} />
      <span id={helpId} className="visually-hidden">Use the arrow keys to resize. Hold Shift for larger steps.</span>
    </> : null}
  </span>;
}
