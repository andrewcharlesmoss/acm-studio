"use client";

import { useEffect, useState } from "react";
import { loadDesigns } from "./design-store";
import type { DesignProject } from "./design-model";
import { PageSvg } from "./design-editor";
import { StudioIcon } from "./studio-icons";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function DesignPreview({ design }: { design: DesignProject }) {
  const page = design.pages[0];
  if (!page) return null;
  return <div className="design-library-preview" style={{ aspectRatio: `${page.width} / ${page.height}` }} aria-hidden="true">
    <PageSvg page={page} assets={design.assets} selectedIds={[]} guides={[]} showHoverHandles={false} onCanvasPointerDown={() => undefined} onObjectPointerDown={() => undefined} onResizePointerDown={() => undefined} onRotatePointerDown={() => undefined} onArrowEndpointPointerDown={() => undefined} onArrowBendPointerDown={() => undefined} />
    <span>{design.pages.length} {design.pages.length === 1 ? "page" : "pages"}</span>
  </div>;
}

export function DesignLibrary() {
  const [designs, setDesigns] = useState<DesignProject[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try { setDesigns(loadDesigns().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))); }
      catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Saved designs could not be read."); }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  return <div className="design-library-shell">
    <header className="design-topbar">
      <div className="design-topbar-brand"><span className="design-topbar-mark" aria-hidden="true">A</span><a href="/studio" aria-label="ACM Studio home">ACM Studio</a><span className="design-topbar-divider" aria-hidden="true">|</span><strong>File</strong></div>
      <span className="design-environment" aria-label="Environment: local">LOCAL</span>
    </header>
    <main className="design-library-main" aria-labelledby="design-library-title">
      <div className="design-library-heading"><div><p className="design-library-eyebrow">ACM Studio</p><h1 id="design-library-title">All designs</h1><p>Open a saved design or return to the canvas to create something new.</p></div><a className="design-library-back" href="/studio/designs"><StudioIcon name="arrow-left" size={18} />Back to canvas</a></div>
      {error ? <p className="design-library-error" role="alert">{error}</p> : null}
      {!error && !designs.length ? <section className="design-library-empty"><StudioIcon name="archive" size={32} /><h2>No saved designs yet</h2><p>Your browser-saved Studio designs will appear here.</p><a className="design-library-primary" href="/studio/designs">Open design canvas</a></section> : null}
      {designs.length ? <section className="design-library-grid" aria-label="Saved Studio designs">{designs.map((design) => <a className="design-library-card" href={`/studio/designs?designId=${encodeURIComponent(design.id)}`} key={design.id}><DesignPreview design={design} /><div className="design-library-card-copy"><h2>{design.name}</h2><p>{design.pages.length} {design.pages.length === 1 ? "page" : "pages"} · Updated {formatUpdatedAt(design.updatedAt)}</p></div><StudioIcon name="arrow-right" size={20} /></a>)}</section> : null}
    </main>
  </div>;
}
