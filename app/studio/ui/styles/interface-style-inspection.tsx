"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InterfaceStylePreset } from "@acm/styles";
import { StudioButton } from "../../controls/button";
import { styleSourcePathFromTarget } from "./style-source-path";
import { CanonicalSourceLines, canonicalSourceScrollTop } from "./canonical-source-lines";

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
  const documentRef = useRef<HTMLDivElement>(null);
  const activeLine = mapping?.line;
  const lines = useMemo(() => guideDocument.split("\n"), [guideDocument]);
  useEffect(() => {
    const container = documentRef.current;
    const line = container?.querySelector<HTMLElement>(`[data-source-line="${activeLine}"]`);
    if (!container || !line) return;
    container.scrollTo({ top: canonicalSourceScrollTop(container.getBoundingClientRect(), line.getBoundingClientRect(), container.scrollTop, container.clientHeight), behavior: "auto" });
  }, [activeLine, guideDocument]);
  const saved = path ? pathValue(baseline, path) : undefined;
  const current = path ? pathValue(draft, path) : undefined;
  return <section className="interface-style-inspector" aria-label="Selected interface style source">
    <p className="rl-eyebrow">CANONICAL SOURCE</p><h2>Style inspector</h2>
    <div className="interface-style-source-views" role="group" aria-label="Canonical source document">
      <StudioButton type="button" variant="secondary" aria-pressed="true">Written Style Guide</StudioButton>
      {path ? <StudioButton type="button" variant="text" onClick={pinned ? onClear : onPin}>{pinned ? "Clear selection" : "Pin selection"}</StudioButton> : null}
    </div>
    <p className="interface-style-source-path"><code>workspace-governance/STYLE_GUIDE.md</code></p>
    {guideDocument ? (
      // This read-only scroll region needs a tab stop for keyboard scrolling.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      <div ref={documentRef} className="interface-style-source-document" role="region" tabIndex={0} aria-label="Full canonical Style Guide with line numbers">
      <CanonicalSourceLines lines={lines} activeLine={activeLine} idPrefix="interface-source-guide" />
    </div>) : <p>The live file is available in local development after Reload Source.</p>}
    {path ? <>
      <h3><code>{path}</code></h3>
      <dl><div><dt>Saved value</dt><dd>{String(saved)}</dd></div>
        <div><dt>Draft value</dt><dd>{String(current)}{current !== saved ? " · Unsaved" : " · Unchanged"}</dd></div>
        <div><dt>Guide location</dt><dd><code>STYLE_GUIDE.md</code>{mapping ? ` · Line ${mapping.line}` : " · Line unavailable"}</dd></div>
      </dl>
    </> : <p>Hover Inspection follows settings and preview controls. Focus or click a setting to inspect it. Use Pin selection to hold its source, and Escape to release it.</p>}
    <p className="interface-style-inspector-help">Saved values come from the loaded source. Draft changes affect the previews until Save Interface Styles.</p>
  </section>;
}
