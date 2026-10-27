import type { CSSProperties } from "react";

const cssName = (property: string) => property.replace(/^--studio-rs-(tablet|mobile)-/, '').replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
const isSurfaceName = (name: string) => /^(padding|background|border)(-|$)/.test(name) || name === 'box-shadow';
const isMetricName = (name: string) => /^padding(-|$)/.test(name) || /^border(-|$)/.test(name) && !/(color|image|collapse|spacing)/.test(name);

/** Code paints one pre, while its outer frame owns layout and typography. */
export function codeFramePresentation(css: Record<string, string>) {
  const isSurface = (property: string) => isSurfaceName(cssName(property));
  return {
    frame: Object.fromEntries(Object.entries(css).filter(([property]) => !isSurface(property))),
    surface: Object.fromEntries(Object.entries(css).filter(([property]) => isSurface(property))),
  };
}

/** Invisible textarea borders occupy exactly the same space as painted ones. */
export function codeInputPresentation(surface: CSSProperties | undefined): CSSProperties | undefined {
  if (!surface) return undefined;
  const metrics = Object.fromEntries(Object.entries(surface).filter(([property]) => isMetricName(cssName(property))));
  return { ...metrics, borderColor: 'transparent' };
}
