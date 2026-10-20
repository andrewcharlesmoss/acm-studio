"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { previewBackgroundCss, type PreviewBackground } from "./background-preview-model";
import type { PreviewColours, PreviewPalette } from "./colours-preview-model";
import "./background-preview-surface.css";

/** Background attachment belongs to the sample scrollport, never Studio's viewport. */
export function BackgroundPreviewSurface({ background = {}, palette, colours, imageUrl, className, style, children, label, enabled = true }: { enabled?: boolean; background?: PreviewBackground; palette: PreviewPalette; colours?: PreviewColours; imageUrl?: string; className?: string; style?: CSSProperties; children: ReactNode; label?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ height: 0, available: 0 });
  const fixed = Boolean(enabled && background.fixed && background.image && imageUrl);
  useLayoutEffect(() => {
    const scrollport = root.current?.closest<HTMLElement>(".studio-preview-frame-content");
    if (!scrollport) return;
    const measure = () => {
      const height = scrollport.clientHeight;
      const offset = Math.max(0, (root.current?.getBoundingClientRect().top ?? 0) - scrollport.getBoundingClientRect().top + scrollport.scrollTop);
      const available = Math.max(0, height - offset);
      setViewport(previous => previous.height === height && previous.available === available ? previous : { height, available });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollport);
    return () => observer.disconnect();
  }, []);
  const surfaceStyle = enabled ? previewBackgroundCss(fixed ? { ...background, image: null } : background, palette, colours, imageUrl) : undefined;
  const imageStyle = fixed ? previewBackgroundCss({ ...background, colour: "transparent", gradient: null, fixed: false }, palette, colours, imageUrl) : undefined;
  return <div ref={root} className={`${className ?? ""} site-background-surface${fixed ? " has-fixed-image" : ""}`} style={{ minHeight: enabled ? viewport.available || undefined : undefined, ...style, ...surfaceStyle }} aria-label={label}>
    {fixed ? <div className="site-background-fixed-image" aria-hidden="true" style={{ ...imageStyle, height: viewport.height || "100%" }} /> : null}
    <div className="site-background-surface-content">{children}</div>
  </div>;
}
