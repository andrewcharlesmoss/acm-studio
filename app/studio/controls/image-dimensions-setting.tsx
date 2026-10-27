"use client";

import { NumberInput, SelectControl } from "./native-fields";
import type { ImageAspectRatio as AspectRatio } from "../../content/image-aspect-ratios";
type ImageScale = "cover" | "contain" | "fill";

export function ImageDimensionsSetting({ aspectRatio = "original", displayWidth, displayHeight, scale = "cover", onAspectRatioChange, onWidthChange, onHeightChange, onScaleChange, scaleOptions = ["cover", "contain"], showScale = true, disabled = false }: {
  aspectRatio?: AspectRatio;
  displayWidth?: number;
  displayHeight?: number;
  scale?: ImageScale;
  onAspectRatioChange: (value: AspectRatio) => void;
  onWidthChange: (value: number | undefined) => void;
  onHeightChange: (value: number | undefined) => void;
  onScaleChange: (value: ImageScale) => void;
  scaleOptions?: readonly ImageScale[];
  showScale?: boolean;
  disabled?: boolean;
}) {
  return <fieldset className="image-dimensions-setting" disabled={disabled}><legend className="visually-hidden">Image dimensions</legend>
    <label><span>Aspect ratio</span><SelectControl value={aspectRatio} onChange={(event) => onAspectRatioChange(event.target.value as AspectRatio)}><option value="original">Original</option><option value="square">Square — 1:1</option><option value="portrait">Portrait — 3:4</option><option value="landscape">Landscape — 4:3</option><option value="classic">Classic — 3:2</option><option value="classic-portrait">Classic Portrait — 2:3</option><option value="wide">Wide — 16:9</option><option value="tall">Tall — 9:16</option></SelectControl></label>
    <label><span>Width (px)</span><NumberInput  min="32" max="2400" value={displayWidth ?? ""} placeholder="Auto" onChange={(event) => onWidthChange(event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined)} /></label>
    <label><span>Height (px)</span><NumberInput  min="32" max="2400" value={displayHeight ?? ""} placeholder="Auto" onChange={(event) => onHeightChange(event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined)} /></label>
    {showScale && aspectRatio !== "original" ? <label><span>Scale</span><SelectControl value={scale} onChange={(event) => onScaleChange(event.target.value as ImageScale)}>{scaleOptions.map(option => <option value={option} key={option}>{option === "cover" ? "Cover" : option === "contain" ? "Contain" : "Fill"}</option>)}</SelectControl></label> : null}
  </fieldset>;
}
