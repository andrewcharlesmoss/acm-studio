"use client";
import "./site-editor/style-reference-fonts.css";
import "./reference-template-part-preview.css";
import { useEffect, useRef, useState } from "react";
import { TemplateNodes, TemplateSurface } from "./template-renderer";
import { referenceComparisonSet, referencePartSetId } from "./reference-template-parts";
import type { TemplatePart, TemplateSet } from "./template-model";
import type { StudioDocument } from "./editor-model";

const sample: StudioDocument = { id: "tt5-preview", kind: "page", title: "Sample Page", slug: "sample-page", excerpt: "", status: "draft", updatedAt: "", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
/** Canonical rendering at the reference canvas width, scaled into catalogue cards. */
export function ReferenceTemplatePartPreview({ set, part, fitContent = false }: { set: TemplateSet; part: TemplatePart; fitContent?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(260);
  const [contentHeight, setContentHeight] = useState(200);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(container.current);
    const surface = container.current.querySelector<HTMLElement>(".template-surface");
    const heightObserver = new ResizeObserver(() => { if (surface) setContentHeight(surface.offsetHeight); });
    if (surface) { setContentHeight(surface.offsetHeight); heightObserver.observe(surface); }
    return () => { observer.disconnect(); heightObserver.disconnect(); };
  }, []);
  const comparison = { ...referenceComparisonSet(set), id: referencePartSetId };
  return <div ref={container} className={`reference-template-part-preview${fitContent ? " is-design-choice" : ""}`} style={fitContent ? { aspectRatio: "auto", height: Math.max(28, contentHeight * width / 1340) } : undefined} aria-hidden="true" inert><div className="reference-template-part-preview-canvas" style={{ width: 1340, transform: `scale(${width / 1340})`, fontFamily: '"TT5 Manrope", sans-serif', fontWeight: 300, color: "#111111", background: "#FFFFFF" }}><TemplateSurface set={comparison}><TemplateNodes set={comparison} nodes={part.nodes} document={sample} authoring /></TemplateSurface></div></div>;
}
