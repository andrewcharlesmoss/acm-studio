"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import type { InterfaceStylePreset } from "@acm/styles";
import { StudioButton } from "../../controls/button";
import { styleSourcePathFromTarget } from "./style-source-path";
import { CanonicalSourceLines, canonicalSourceScrollTop } from "./canonical-source-lines";
import { parseStyleGuidePresets, updateStyleGuideTokensFromDraft } from "./style-guide-tokens.mjs";
import { ResizableSourceView } from "./resizable-source-view";
import { FormattedGuideDocument } from "./formatted-guide-document";

export type GuideMapping = { line: number; excerpt: string; heading: string; rowPath: string };

function pathValue(preset: InterfaceStylePreset, path: string): unknown {
  return path.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, preset);
}

/** Mirrors Website Styles inspection without intercepting control actions. */
export function useInterfaceStyleInspection(preset: InterfaceStylePreset) {
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const path = pinned ?? hovered ?? focused ?? last;
  function mapped(target: EventTarget | null) {
    const candidate = styleSourcePathFromTarget(target);
    return candidate && ["string", "number"].includes(typeof pathValue(preset, candidate)) ? candidate : null;
  }
  function clear() { setPinned(null); setHovered(null); setFocused(null); setLast(null); }
  return {
    enabled, path, pinned,
    setEnabled(value: boolean) { setEnabled(value); setHovered(null); setPinned(null); },
    pin() { if (path) setPinned(path); },
    clear,
    events: {
      onPointerOverCapture(event: { target: EventTarget | null }) { if (enabled) { const next = mapped(event.target); setHovered(next); if (next) setLast(next); } },
      onPointerLeave() { setHovered(null); },
      onFocusCapture(event: { target: EventTarget | null }) { const next = mapped(event.target); setFocused(next); if (next) { setPinned(null); setHovered(null); setLast(next); } },
      onBlurCapture(event: { relatedTarget: EventTarget | null }) { setFocused(mapped(event.relatedTarget)); },
      onClickCapture(event: { target: EventTarget | null }) { const next = mapped(event.target); if (next) { setPinned(null); setHovered(null); setFocused(null); setLast(next); } },
      onKeyDownCapture(event: { key: string }) { if (event.key === "Escape" && pinned) clear(); },
    },
  };
}

export function InterfaceStyleSourceInspector({ path, pinned, baseline, draft, mapping, guideDocument, onPin, onClear }: {
  path: string | null; pinned: boolean; baseline: InterfaceStylePreset; draft: InterfaceStylePreset;
  mapping?: GuideMapping; guideDocument: string; onPin: () => void; onClear: () => void;
}) {
  const [view, setView] = useState<"formatted" | "markdown">("formatted");
  const formattedRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
  const activeLine = mapping?.line;
  const websitePreset = useMemo(() => parseStyleGuidePresets(guideDocument).universalPreset, [guideDocument]);
  const draftDocument = useMemo(() => updateStyleGuideTokensFromDraft(guideDocument, websitePreset, draft), [guideDocument, websitePreset, draft]);
  const lines = useMemo(() => draftDocument.split("\n"), [draftDocument]);
  useEffect(() => {
    const container = view === "formatted" ? formattedRef.current : markdownRef.current;
    const selector = view === "formatted" ? `[id="sg-guide-formatted-line-${activeLine}"]` : `[data-source-line="${activeLine}"]`;
    const line = container?.querySelector<HTMLElement>(selector);
    if (!container || !line) return;
    container.scrollTo({ top: canonicalSourceScrollTop(container.getBoundingClientRect(), line.getBoundingClientRect(), container.scrollTop, container.clientHeight), behavior: "auto" });
  }, [activeLine, draftDocument, view]);
  function syncScroll(event: UIEvent<HTMLDivElement>) {
    const source = event.currentTarget;
    const isMarkdown = source.classList.contains("sg-guide-markdown");
    if (isMarkdown !== (view === "markdown")) return;
    const target = isMarkdown ? formattedRef.current : markdownRef.current;
    const range = source.scrollHeight - source.clientHeight;
    if (!target || range <= 0) return;
    const next = source.scrollTop / range * (target.scrollHeight - target.clientHeight);
    if (Math.abs(target.scrollTop - next) > 3) target.scrollTop = next;
  }
  const saved = path ? pathValue(baseline, path) : undefined;
  const current = path ? pathValue(draft, path) : undefined;
  return <section className="interface-style-inspector" aria-label="Selected interface style source">
    <p className="rl-eyebrow">CANONICAL SOURCE</p><h2>Style inspector</h2>
    <div className="interface-style-source-views">
      <h3>Written Style Guide</h3>
      {path ? <StudioButton type="button" variant="text" onClick={pinned ? onClear : onPin}>{pinned ? "Clear selection" : "Pin selection"}</StudioButton> : null}
    </div>
    <p className="interface-style-source-path"><code>workspace-governance/STYLE_GUIDE.md</code></p>
    <div className="sg-guide-view-switch" role="group" aria-label="Written guide format">
      <button type="button" aria-pressed={view === "formatted"} onClick={() => setView("formatted")}>Formatted</button>
      <button type="button" aria-pressed={view === "markdown"} onClick={() => setView("markdown")}>Markdown source</button>
    </div>
    {guideDocument ? <ResizableSourceView>
      <FormattedGuideDocument ref={formattedRef} lines={lines} query="" activeLine={activeLine} active={view === "formatted"} onScroll={syncScroll} guidePathByLine={{}} onSelectSource={() => {}} />
      <div ref={markdownRef} className={`sg-guide-document sg-guide-markdown${view === "markdown" ? "" : " is-inactive"}`} role="region" tabIndex={view === "markdown" ? 0 : -1} aria-hidden={view !== "markdown"} aria-label="Full canonical Style Guide with line numbers" onScroll={syncScroll}>
        <CanonicalSourceLines lines={lines} activeLine={activeLine} idPrefix="interface-source-guide" />
      </div>
    </ResizableSourceView> : <p>The live file is available in local development after Reload Source.</p>}
    {path ? <>
      <h3><code>{path}</code></h3>
      <dl><div><dt>Saved value</dt><dd>{String(saved)}</dd></div>
        <div><dt>Draft value</dt><dd>{String(current)}{current !== saved ? " · Unsaved" : " · Unchanged"}</dd></div>
        <div><dt>Guide location</dt><dd><code>STYLE_GUIDE.md</code>{mapping ? ` · Line ${mapping.line}` : " · Line unavailable"}</dd></div>
      </dl>
    </> : null}
  </section>;
}
