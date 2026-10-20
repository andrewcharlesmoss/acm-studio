import type { CSSProperties } from "react";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import type { IdentityImage } from "./identity-preview-state";
import { previewColourValue, type PreviewPalette, type PreviewColours } from "./colours-preview-model";

export type BackgroundWidthUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
export type PreviewBackground = {
  colour?: string | null;
  gradient?: ParagraphBackgroundGradient | null;
  image?: IdentityImage | null;
  focalX?: number;
  focalY?: number;
  size?: "cover" | "contain" | "tile";
  width?: number;
  widthUnit?: BackgroundWidthUnit;
  repeat?: boolean;
  fixed?: boolean;
};
export const backgroundImageFields = ["image", "focalX", "focalY", "size", "width", "widthUnit", "repeat", "fixed"] as const;
export function mergePreviewBackground(global: PreviewBackground = {}, local: PreviewBackground = {}): PreviewBackground {
  return { ...global, ...Object.fromEntries(Object.entries(local).filter(([, value]) => value !== undefined)) };
}
export function patchPreviewBackground(current: PreviewBackground = {}, patch: PreviewBackground): PreviewBackground {
  const next = { ...current, ...patch };
  for (const key of Object.keys(next) as (keyof PreviewBackground)[]) if (next[key] === undefined) delete next[key];
  return next;
}
/** Blob bytes are opaque to JSON; a replacement image must remain an undoable change. */
export function equalPreviewBackground(first: PreviewBackground | undefined, second: PreviewBackground | undefined) {
  return first?.image === second?.image && JSON.stringify({ ...first, image: undefined }) === JSON.stringify({ ...second, image: undefined });
}
export function previewBackgroundCss(background: PreviewBackground = {}, palette: PreviewPalette, colours: PreviewColours = {}, imageUrl?: string): CSSProperties {
  const image = background.image && imageUrl ? `url(${JSON.stringify(imageUrl)})` : undefined;
  const gradient = background.gradient ? paragraphBackgroundGradientCss(background.gradient) : undefined;
  const layers = [image, gradient].filter(Boolean);
  const size = background.size ?? "cover";
  return {
    backgroundColor: previewColourValue(background.colour ?? undefined, palette, colours) || palette.colours[0],
    backgroundImage: layers.join(", ") || "none",
    backgroundSize: [image ? size === "tile" ? `${background.width ?? 100}${background.widthUnit ?? "%"} auto` : size : undefined, gradient ? "auto" : undefined].filter(Boolean).join(", ") || undefined,
    backgroundPosition: image ? `${background.focalX ?? 50}% ${background.focalY ?? 50}%` : undefined,
    backgroundRepeat: [image ? size === "tile" && (background.repeat ?? true) ? "repeat" : "no-repeat" : undefined, gradient ? "no-repeat" : undefined].filter(Boolean).join(", ") || "no-repeat",
    backgroundAttachment: [image ? background.fixed ? "fixed" : "scroll" : undefined, gradient ? "scroll" : undefined].filter(Boolean).join(", ") || "scroll",
  };
}
