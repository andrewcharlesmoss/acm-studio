import type { CSSProperties } from "react";
import { validBoxLengths } from "../../content/box-lengths";
export type PreviewLayout = { contentWidth?: string; wideWidth?: string; padding?: string; blockSpacing?: string };
export const previewLengthUnits = ["px", "%", "em", "rem", "vw", "vh", "ch"] as const;
export function validPreviewLength(value: string, positive = false) { return /^(?:\d+(?:\.\d+)?)(?:px|%|em|rem|vw|vh|ch)$/.test(value) && Number.parseFloat(value) <= 10000 && (!positive || Number.parseFloat(value) > 0); }
export function patchPreviewLayout(current: PreviewLayout = {}, patch: PreviewLayout): PreviewLayout {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [keyof PreviewLayout, string | undefined][]) {
    if (value === undefined) delete next[key];
    else if (key === "padding" ? validBoxLengths(value) : validPreviewLength(value, key === "contentWidth" || key === "wideWidth")) next[key] = value;
  }
  return next;
}
export function previewRelativeLengths(value: string) { return value.replace(/(\d+(?:\.\d+)?)(vw|vh)/g, (_, number, unit) => `calc(var(--site-preview-viewport-${unit === "vw" ? "width" : "height"}, 0px) * ${Number(number) / 100})`); }
/** Isolated unit-based preview adapter; independent of the versioned website-layout contract. */
export function previewLayoutCss(layout: PreviewLayout = {}): CSSProperties {
  return { ...(layout.contentWidth ? { "--site-layout-content-width": previewRelativeLengths(layout.contentWidth) } : {}), ...(layout.wideWidth ? { "--site-layout-wide-width": previewRelativeLengths(layout.wideWidth) } : {}), ...(layout.padding !== undefined ? { "--site-layout-padding": previewRelativeLengths(layout.padding) } : {}), ...(layout.blockSpacing !== undefined ? { "--site-layout-block-spacing": previewRelativeLengths(layout.blockSpacing) } : {}) } as CSSProperties;
}
