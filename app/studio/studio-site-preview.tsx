"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderTestSite } from "./test-site/render";
import { localFixtureName } from "./test-site/sites";
import type { TestSiteDocument } from "./test-site/contract";
import { StudioIcon } from "./studio-icons";
import { viewportWidthFor, type StudioViewport, type StudioViewMode } from "./studio-view-menu";

const viewportHeights: Record<StudioViewport, number> = { desktop: 800, tablet: 1024, mobile: 844 };

export function StudioSitePreview({ document, documentId, viewport, onViewportChange, mode, onModeChange }: {
  document: TestSiteDocument; documentId: string; viewport: StudioViewport;
  onViewportChange: (viewport: StudioViewport) => void;
  mode: "website" | "full"; onModeChange: (mode: StudioViewMode) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const rendered = useMemo(() => {
    try { return { html: renderTestSite(document, "studio-preview", documentId), error: false }; }
    catch { return { html: "", error: true }; }
  }, [document, documentId]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const full = mode === "full";
  const width = full ? Math.max(320, available.width) : viewportWidthFor(viewport);
  const height = full ? Math.max(240, available.height) : viewportHeights[viewport];
  const fit = Math.min(1, available.width / width, available.height / height);
  const scale = full ? 1 : zoom === "fit" ? Math.max(0.1, fit) : zoom;
  function changeZoom(direction: number) { setZoom(Math.min(2, Math.max(0.25, Math.round((scale + direction * 0.1) * 100) / 100))); }

  return <section className={`studio-site-preview${full ? " is-full" : ""}`} aria-label="Website preview">
    <div className="studio-site-preview-toolbar">
      <div className="studio-site-preview-modes" aria-label="Workspace view">
        <button type="button" onClick={() => onModeChange("editing")}>Editing View</button>
        <button type="button" aria-pressed={!full} onClick={() => onModeChange("website")}>Website View</button>
        <button type="button" aria-pressed={full} onClick={() => onModeChange("full")}>Full Preview</button>
      </div>
      {!full ? <>
        <label>Viewport <select aria-label="Viewport" value={viewport} onChange={event => onViewportChange(event.target.value as StudioViewport)}>
          <option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option>
        </select></label>
        <div className="studio-site-preview-zoom" aria-label="Preview scale">
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-1)} disabled={scale <= 0.25}><StudioIcon name="zoom-out" size={18} /></button>
          <button type="button" aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}>Fit</button>
          <button type="button" aria-pressed={zoom === 1} onClick={() => setZoom(1)}>100%</button>
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(1)} disabled={scale >= 2}><StudioIcon name="zoom-in" size={18} /></button>
        </div>
      </> : null}
      <span className="studio-site-preview-details">Current draft · {Math.round(width)} × {Math.round(height)}{!full ? ` · ${Math.round(scale * 100)}%` : ""}</span>
    </div>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The application workspace owns zoom shortcuts when explicitly focused. */}
    <div className="studio-site-preview-stage" ref={stageRef} role="application" tabIndex={0} aria-label="Preview workspace" onKeyDown={event => {
      if (event.key === "Escape" && full) { event.preventDefault(); onModeChange("website"); }
      if (full || event.target !== event.currentTarget || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "0") setZoom(1); else changeZoom(event.key === "-" ? -1 : 1);
      }
    }}>
      {rendered.error ? <p role="alert">This draft cannot be previewed. Return to Editing View to review it.</p> : <div className="studio-site-preview-frame" style={{ width: width * scale, height: height * scale }}>
        <iframe title={`${localFixtureName(document.siteId)} current draft`} sandbox="allow-scripts" srcDoc={rendered.html} style={{ width, height, transform: `scale(${scale})` }} />
      </div>}
    </div>
  </section>;
}
