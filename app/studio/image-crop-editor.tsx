"use client";

import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import type { ImageCropEdit } from "../content/image-edit";
import type { ContentBlock } from "../content/model";
import { StudioButton } from "./controls/button";
import { NumberInput, SelectControl } from "./controls/native-fields";
import { RangeControl } from "./controls/range-control";
import "./image-crop-editor.css";

type CroppableBlock = Extract<ContentBlock, { type: "image" | "cover" }>;
type Ratio = "free" | "landscape" | "square" | "portrait";
const copyEdit = (edit?: ImageCropEdit): ImageCropEdit => edit ? structuredClone(edit) : {
  crop: { x: 0, y: 0, width: 1, height: 1 }, sourceWidth: 1, sourceHeight: 1, zoom: 1, rotation: 0, straighten: 0, flipHorizontal: false, flipVertical: false,
};

export function ImageCropEditor({ block, src, returnFocus, onClose, onApply }: {
  block: CroppableBlock;
  src: string;
  returnFocus: HTMLElement | null;
  onClose: () => void;
  onApply: (edit: ImageCropEdit) => void;
}) {
  const [edit, setEdit] = useState(() => copyEdit(block.imageEdit));
  const [ratio, setRatio] = useState<Ratio>("free");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startCrop: ImageCropEdit["crop"]; mode: "move" | "resize"; handle?: string } | null>(null);
  const dimensionsReady = naturalSize !== null;
  const previewSize = naturalSize ?? { width: 1, height: 1 };
  const aspect = previewSize.width / previewSize.height;
  const crop = edit.crop;

  function updateCrop(part: keyof ImageCropEdit["crop"], value: number) {
    if (!Number.isFinite(value)) return;
    setEdit(current => {
      const next = { ...current, crop: { ...current.crop, [part]: Math.max(0, Math.min(1, value)) } };
      const rect = next.crop;
      if (rect.width <= 0 || rect.height <= 0) return current;
      rect.x = Math.min(rect.x, 1 - rect.width);
      rect.y = Math.min(rect.y, 1 - rect.height);
      return next;
    });
  }

  function chooseRatio(value: Ratio) {
    setRatio(value);
    if (!dimensionsReady || value === "free") return;
    const outputRatio = value === "square" ? 1 : value === "landscape" ? 4 / 3 : 3 / 4;
    const normalizedRatio = outputRatio / aspect;
    setEdit(current => {
      let width = current.crop.width;
      let height = width / normalizedRatio;
      if (height > 1) { height = 1; width = height * normalizedRatio; }
      const x = Math.min(1 - width, Math.max(0, current.crop.x + (current.crop.width - width) / 2));
      const y = Math.min(1 - height, Math.max(0, current.crop.y + (current.crop.height - height) / 2));
      return { ...current, crop: { x, y, width, height } };
    });
  }

  function startCropPointer(event: PointerEvent<HTMLElement>, mode: "move" | "resize", handle?: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const surface = previewRef.current;
    if (!surface) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startCrop: { ...crop }, mode, handle };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCropPointer(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect?.width || !rect.height) return;
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    const start = drag.startCrop;
    let x = start.x, y = start.y, width = start.width, height = start.height;
    if (drag.mode === "move") {
      x = Math.max(0, Math.min(1 - width, x + dx));
      y = Math.max(0, Math.min(1 - height, y + dy));
    } else {
      if (drag.handle?.includes("w")) { x = Math.max(0, Math.min(start.x + start.width - .01, start.x + dx)); width = start.width + start.x - x; }
      if (drag.handle?.includes("e")) width = Math.max(.01, Math.min(1 - start.x, start.width + dx));
      if (drag.handle?.includes("n")) { y = Math.max(0, Math.min(start.y + start.height - .01, start.y + dy)); height = start.height + start.y - y; }
      if (drag.handle?.includes("s")) height = Math.max(.01, Math.min(1 - start.y, start.height + dy));
    }
    setEdit(current => ({ ...current, crop: { x, y, width, height } }));
  }

  function finishCropPointer(event: PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function moveCropByKeyboard(event: KeyboardEvent<HTMLSpanElement>, handle: string) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const amount = (event.shiftKey ? 5 : 1) / 100;
    const dx = direction[0] * amount, dy = direction[1] * amount;
    setEdit(current => {
      let { x, y, width, height } = current.crop;
      if (handle === "move") { x = Math.max(0, Math.min(1 - width, x + dx)); y = Math.max(0, Math.min(1 - height, y + dy)); }
      else {
        if (handle.includes("w")) { const edge = Math.max(0, Math.min(x + width - .01, x + dx)); width += x - edge; x = edge; }
        if (handle.includes("e")) width = Math.max(.01, Math.min(1 - x, width + dx));
        if (handle.includes("n")) { const edge = Math.max(0, Math.min(y + height - .01, y + dy)); height += y - edge; y = edge; }
        if (handle.includes("s")) height = Math.max(.01, Math.min(1 - y, height + dy));
      }
      return { ...current, crop: { x, y, width, height } };
    });
  }

  const rotateQuarter = (amount: number) => setEdit(current => ({ ...current, rotation: (current.rotation + amount + 360) % 360 }));
  return <StudioDialog title="Crop image" onClose={onClose} returnFocus={returnFocus} className="studio-dialog-wide" closeOnBackdrop>
    <div className="image-crop-editor">
      <div ref={previewRef} className="image-crop-preview" aria-label="Crop preview" style={{ aspectRatio: `${previewSize.width} / ${previewSize.height}` }} onPointerMove={moveCropPointer} onPointerUp={finishCropPointer} onPointerCancel={finishCropPointer}>
        <svg viewBox={`0 0 ${previewSize.width} ${previewSize.height}`} aria-hidden="true">
          <image href={src} x="0" y="0" width={previewSize.width} height={previewSize.height} preserveAspectRatio="none" transform={`translate(${(crop.x + crop.width / 2) * previewSize.width} ${(crop.y + crop.height / 2) * previewSize.height}) rotate(${edit.rotation + edit.straighten}) scale(${edit.flipHorizontal ? -1 : 1} ${edit.flipVertical ? -1 : 1}) scale(${edit.zoom}) translate(${-(crop.x + crop.width / 2) * previewSize.width} ${-(crop.y + crop.height / 2) * previewSize.height})`} />
        </svg>
        <div className="image-crop-selection" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} onPointerDown={event => startCropPointer(event, "move")}>
          <span className="image-crop-move-handle" role="slider" tabIndex={0} aria-label="Move crop area" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(crop.x * 100)} aria-valuetext={`Left ${Math.round(crop.x * 100)} percent, top ${Math.round(crop.y * 100)} percent`} onKeyDown={event => moveCropByKeyboard(event, "move")} />
          {(["nw", "ne", "sw", "se"] as const).map(handle => <span key={handle} className={`image-crop-handle is-${handle}`} role="slider" tabIndex={0} aria-label={`${handle === "nw" ? "Top left" : handle === "ne" ? "Top right" : handle === "sw" ? "Bottom left" : "Bottom right"} crop handle`} aria-valuemin={1} aria-valuemax={100} aria-valuenow={Math.round((handle.includes("w") ? crop.width : crop.height) * 100)} aria-valuetext={`Crop ${handle} handle`} onPointerDown={event => startCropPointer(event, "resize", handle)} onKeyDown={event => moveCropByKeyboard(event, handle)} />)}
        </div>
      {/* Intrinsic dimensions are needed to keep the crop in source pixels. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="image-crop-measurer" src={src} alt="" aria-hidden="true" onLoad={event => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (Number.isSafeInteger(naturalWidth) && naturalWidth > 0 && naturalWidth <= 50000 && Number.isSafeInteger(naturalHeight) && naturalHeight > 0 && naturalHeight <= 50000) {
            setNaturalSize({ width: naturalWidth, height: naturalHeight });
            setImageLoadFailed(false);
          } else {
            setImageLoadFailed(true);
          }
        }} onError={() => setImageLoadFailed(true)} />
      </div>
      {!dimensionsReady ? <p role="status">{imageLoadFailed ? "Couldn't read the image dimensions. Reload or replace the image before applying a crop." : "Aspect ratios and Apply will be available when the image loads."}</p> : null}
      <label>Aspect ratio<SelectControl disabled={!dimensionsReady} value={ratio} onChange={event => chooseRatio(event.target.value as Ratio)}><option value="free">Free</option><option value="landscape">Landscape 4:3</option><option value="square">Square 1:1</option><option value="portrait">Portrait 3:4</option></SelectControl></label>
      <fieldset><legend>Crop rectangle (%)</legend><div className="image-crop-fields">
        <label>Left<NumberInput min="0" max="100" value={Math.round(crop.x * 100)} onChange={event => updateCrop("x", Number(event.target.value) / 100)} /></label>
        <label>Top<NumberInput min="0" max="100" value={Math.round(crop.y * 100)} onChange={event => updateCrop("y", Number(event.target.value) / 100)} /></label>
        <label>Width<NumberInput min="1" max="100" value={Math.round(crop.width * 100)} onChange={event => updateCrop("width", Number(event.target.value) / 100)} /></label>
        <label>Height<NumberInput min="1" max="100" value={Math.round(crop.height * 100)} onChange={event => updateCrop("height", Number(event.target.value) / 100)} /></label>
      </div></fieldset>
      <label>Zoom<RangeControl aria-label="Zoom" tooltipText={`${edit.zoom.toFixed(2)}×`} min="1" max="3" step="0.01" value={edit.zoom} onChange={event => setEdit(current => ({ ...current, zoom: Number(event.target.value) }))} /><output>{edit.zoom.toFixed(2)}×</output></label>
      <label>Straighten<RangeControl aria-label="Straighten" tooltipText={`${edit.straighten}°`} min="-45" max="45" step="1" value={edit.straighten} onChange={event => setEdit(current => ({ ...current, straighten: Number(event.target.value) }))} /><output>{edit.straighten}°</output></label>
      <div className="image-crop-actions" role="group" aria-label="Image rotation and flipping">
        <StudioButton onClick={() => rotateQuarter(-90)}>Rotate left 90°</StudioButton><StudioButton onClick={() => rotateQuarter(90)}>Rotate right 90°</StudioButton>
        <StudioButton aria-pressed={edit.flipHorizontal} onClick={() => setEdit(current => ({ ...current, flipHorizontal: !current.flipHorizontal }))}>Flip horizontal</StudioButton>
        <StudioButton aria-pressed={edit.flipVertical} onClick={() => setEdit(current => ({ ...current, flipVertical: !current.flipVertical }))}>Flip vertical</StudioButton>
        <StudioButton onClick={() => { setEdit(copyEdit()); setRatio("free"); }}>Reset crop</StudioButton>
      </div>
      <StudioDialogActions><StudioButton variant="secondary" onClick={onClose}>Cancel</StudioButton><StudioButton disabled={!dimensionsReady} onClick={() => { if (naturalSize) onApply({ ...edit, sourceWidth: naturalSize.width, sourceHeight: naturalSize.height }); }}>Apply</StudioButton></StudioDialogActions>
    </div>
  </StudioDialog>;
}
