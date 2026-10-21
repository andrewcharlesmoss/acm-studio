"use client";

import { useMemo, useState } from "react";
import type { InterfaceStylePreset } from "@acm/styles";
import { StudioButton } from "../../controls/button";
import { indexPresetSource } from "./preset-source.mjs";
import { styleSourcePathFromTarget } from "./style-source-path";

export type GuideMapping = { line: number; excerpt: string; heading: string; rowPath: string };
export type PresetSource = { sourcePath: string; document: string };

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
  return {
    enabled, path, pinned,
    setEnabled(value: boolean) { setEnabled(value); setHovered(null); },
    pin() { if (path) setPinned(path); },
    clear() { setPinned(null); setHovered(null); setFocused(null); setLast(null); },
    events: {
      onPointerOverCapture(event: { target: EventTarget | null }) { if (enabled) { const next = mapped(event.target); setHovered(next); if (next) setLast(next); } },
      onPointerLeave() { setHovered(null); },
      onFocusCapture(event: { target: EventTarget | null }) { const next = mapped(event.target); setFocused(next); if (next) { setPinned(null); setHovered(null); setLast(next); } },
      onBlurCapture(event: { relatedTarget: EventTarget | null }) { setFocused(mapped(event.relatedTarget)); },
      onClickCapture(event: { target: EventTarget | null }) { const next = mapped(event.target); if (next) setPinned(next); },
    },
  };
}

export function InterfaceStyleSourceInspector({ path, pinned, baseline, draft, source, mapping, onPin, onClear }: {
  path: string | null; pinned: boolean; baseline: InterfaceStylePreset; draft: InterfaceStylePreset;
  source?: PresetSource; mapping?: GuideMapping; onPin: () => void; onClear: () => void;
}) {
  const indexed = useMemo<Record<string, { line: number; excerpt: string; value: unknown }>>(() => {
    try { return source ? indexPresetSource(source.document) : {}; }
    catch { return {}; } // Invalid metadata must not prevent editing or imply a file location.
  }, [source]);
  const location = path ? indexed[path] : undefined;
  const saved = path ? pathValue(baseline, path) : undefined;
  const current = path ? pathValue(draft, path) : undefined;
  return <section className="interface-style-inspector" aria-label="Selected interface style source">
    <p className="rl-eyebrow">CANONICAL SOURCE</p><h2>Style inspector</h2>
    {path ? <>
      <h3><code>{path}</code></h3>
      <dl><div><dt>{source ? "Saved value" : "Bundled value"}</dt><dd>{String(saved)}</dd></div>
        <div><dt>Draft value</dt><dd>{String(current)}{current !== saved ? " · Unsaved" : " · Unchanged"}</dd></div>
        <div><dt>Preset file</dt><dd><code>{source?.sourcePath ?? "acm-styles/src/interface-style-preset.json"}</code>{location ? ` · Line ${location.line}` : " · File location unavailable"}</dd></div>
      </dl>
      {location ? <pre aria-label="Canonical preset line"><code>{location.excerpt}</code></pre> : <p>The live file is available in local development after Reload Source.</p>}
      {mapping ? <details><summary>Written Style Guide · Line {mapping.line}</summary><p><code>workspace-governance/STYLE_GUIDE.md</code></p><pre><code>{mapping.excerpt}</code></pre></details> : null}
      <StudioButton type="button" variant="text" onClick={pinned ? onClear : onPin}>{pinned ? "Clear selection" : "Pin selection"}</StudioButton>
    </> : <p>Hover Inspection follows settings and preview controls. Focus or click a setting to inspect it at any time; click pins its source.</p>}
    <p className="interface-style-inspector-help">Saved values come from the loaded source. Draft changes affect the previews until Save Interface Styles.</p>
  </section>;
}
