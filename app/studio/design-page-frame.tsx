import type { ReactNode } from "react";
import "./design-page-frame.css";
import type { ResizeHandle } from "./design-transform";

type PageSize = { width: number; height: number };
export type PageResizeFrame = PageSize & { handle: ResizeHandle };

/** Keep flex centring and neighbouring pages from moving the drag's origin. */
export function pageResizeLayout(page: PageSize, zoom: number, resize?: PageResizeFrame | null) {
  const scale = zoom / 100;
  const original = resize ?? page;
  const x = resize ? (resize.width - page.width) * (resize.handle.includes("w") ? 1 : resize.handle.includes("e") ? 0 : .5) : 0;
  const y = resize ? (resize.height - page.height) * (resize.handle.includes("n") ? 1 : resize.handle.includes("s") ? 0 : .5) : 0;
  return {
    footprint: { width: original.width * scale, height: original.height * scale },
    frame: { width: page.width * scale, height: page.height * scale, left: x * scale, top: y * scale },
  };
}

export function DesignPageFrame({ page, zoom, resize, children }: { page: PageSize; zoom: number; resize?: PageResizeFrame | null; children: ReactNode }) {
  const layout = pageResizeLayout(page, zoom, resize);
  return <div className="design-page-footprint" style={layout.footprint}>
    <div className="design-canvas-frame" style={layout.frame}>{children}</div>
  </div>;
}
