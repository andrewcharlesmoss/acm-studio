"use client";

import { AcmIcon } from "@acm/icons/react";
import { memo, useContext, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import { ColourPicker } from "../controls/colour-picker";
import { SearchInput, TextInput } from "../controls/native-fields";
import { NumberStepper } from "../controls/number-stepper";
import { RangeControl } from "../controls/range-control";
import { ToggleSetting } from "../controls/toggle-setting";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { Pane } from "../panes/pane-components";
import { StudioUiActiveSectionContext } from "../ui/studio-ui-library";
import { isNativeEditingTarget } from "../workspace-shortcuts.mjs";
import { importMotionSvg } from "./import-motion-svg";
import { motionCatalogue } from "./motion-catalogue";
import { MotionPreviewStage } from "./motion-preview-stage";
import { focusedMotionField, hasPendingFieldEdit, makeDraft, projectKey, useMotionPreviewWorkspace, type MotionDraft } from "./motion-preview-workspace";
import type { MotionSize } from "./motion-resize";
import {
  motionDimensionLimit, motionFileLimit, motionFps, motionGeometry, motionLottie, motionProject,
  motionSvg, readMotionProject, type MotionAsset,
} from "./motion-asset";
import "./motion-assets.css";

const movEndpoint = "/__studio/motion-export";
const localOnly = "MOV export is available in local Studio with FFmpeg installed.";
const exportHeaders = { "Content-Type": "application/json", "X-Studio-Client": "motion-assets" };
const formatSeconds = (frames: number) => `${(frames / motionFps).toFixed(2)} s`;
const subscribeToHydration = () => () => {};

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="motion-field"><span>{label}</span>{children}</label>;
}

function NumberSetting({ label, value, min, max, step = 1, readOnly = false, onCommit }: {
  label: string; value: number; min: number; max: number; step?: number; readOnly?: boolean; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const bound = (number: number) => Math.max(min, Math.min(max, number));
  const normalise = (number: number) => bound(Math.round(number / step) * step);
  return <div className="motion-field"><label htmlFor={inputId}>{label}</label>
    <NumberStepper id={inputId} label={label} value={draft ?? value} data-committed-value={value} min={min} max={max} step={step} readOnly={readOnly}
      onStep={direction => {
        const entered = draft?.trim() ? Number(draft) : NaN;
        const base = Number.isFinite(entered) ? normalise(entered) : value;
        setDraft(null);
        onCommit(bound(Number((base + direction * step).toFixed(3))));
      }}
      onChange={event => {
        const input = event.currentTarget;
        setDraft(input.value);
        if (input.validity.valid && Number.isFinite(input.valueAsNumber)) {
          onCommit(input.valueAsNumber);
        }
      }}
      onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
      onBlur={event => {
        const entered = event.currentTarget.valueAsNumber;
        if (!readOnly && draft !== null && Number.isFinite(entered)) {
          onCommit(normalise(entered));
        }
        setDraft(null);
      }} />
  </div>;
}

function NameSetting({ name, onChange }: { name: string; onChange: (value: string) => void }) {
  const [input, setInput] = useState<string | null>(null);
  return <Field label="Name"><TextInput maxLength={100} value={input ?? name} data-committed-value={name}
    onChange={event => {
      const value = event.currentTarget.value;
      setInput(value);
      if (value.trim()) onChange(value.trim());
    }}
    onBlur={() => setInput(null)}
    onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></Field>;
}

const MotionThumbnail = memo(function MotionThumbnail({ asset }: { asset: MotionAsset }) {
  const path = motionGeometry(asset).pathAt(asset.drawFrames);
  return <svg viewBox={`0 0 ${asset.width} ${asset.height}`} aria-hidden="true">
    <path d={path} fill="none" stroke={asset.colour} strokeWidth={asset.thickness} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
});

export function MotionPlayground() {
  const active = useContext(StudioUiActiveSectionContext) === "motion-assets";
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { workspace: { draft, parked }, setWorkspace, autoplay, setAutoplay } = useMotionPreviewWorkspace();
  const { asset } = draft;
  const [search, setSearch] = useState("");
  const [playback, setPlayback] = useState<{ startFrame: number } | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [resizeDraft, setResizeDraft] = useState<MotionSize | null>(null);
  const [replacement, setReplacement] = useState<{ draft: MotionDraft; play: boolean; focusPreview: boolean }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movSupport, setMovSupport] = useState<{ available: boolean; error?: string }>();
  const [exporting, setExporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);
  const exportRequest = useRef<AbortController | null>(null);
  const inputSequence = useRef(0);
  const currentFileDirty = useRef(false);
  const model = useMemo(() => motionGeometry(asset), [asset]);
  const previewAsset = useMemo(() => resizeDraft ? { ...asset, ...resizeDraft } : asset, [asset, resizeDraft]);
  const previewModel = useMemo(() => previewAsset === asset ? model : motionGeometry(previewAsset), [asset, model, previewAsset]);
  const visibleSketches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return motionCatalogue.flatMap(preset => {
      const sketch = draft.preset === preset.name ? previewAsset : parked.get(preset.name)?.asset ?? preset;
      return [preset.name, sketch.name].some(name => name.toLowerCase().includes(query)) ? [{ preset, sketch }] : [];
    });
  }, [draft.preset, parked, previewAsset, search]);
  const frameCount = useRef(model.frameCount);
  const signature = useMemo(() => projectKey(asset), [asset]);
  const dirty = signature !== draft.baseline;
  const frame = Math.min(position ?? model.frameCount, model.frameCount);
  const playbackLabel = playback ? "Pause" : "Play";
  const stem = asset.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "sketch";

  function togglePlayback() {
    if (playback) { setPlayback(null); return; }
    const startFrame = frame === model.frameCount ? 0 : frame;
    setPosition(startFrame);
    setPlayback({ startFrame });
  }

  const onPlaybackShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== " " || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (isNativeEditingTarget(target) || document.querySelector("dialog[open]")
      || (target instanceof Element && target.closest('button, a[href], summary, [role="button"], [role="switch"], [role="tab"], [role="dialog"]'))) return;
    event.preventDefault();
    if (!event.repeat) togglePlayback();
  });

  useEffect(() => {
    if (!active || !ready) return;
    const listener = (event: KeyboardEvent) => onPlaybackShortcut(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [active, ready]);

  useEffect(() => {
    const controller = new AbortController();
    async function checkEncoder() {
      if (location.hostname !== "localhost") return { available: false, error: localOnly };
      const response = await fetch(movEndpoint + "/status", {
        method: "POST", headers: exportHeaders, body: "{}", signal: controller.signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error();
      return response.json() as Promise<{ available: boolean; error?: string }>;
    }
    void checkEncoder().then(support => {
      if (!controller.signal.aborted) setMovSupport(support);
    }).catch(() => {
      if (!controller.signal.aborted) setMovSupport({ available: false, error: localOnly });
    });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => { currentFileDirty.current = !draft.preset && dirty; }, [draft.preset, dirty]);
  useLayoutEffect(() => { frameCount.current = model.frameCount; }, [model.frameCount]);

  useEffect(() => () => exportRequest.current?.abort(), []);

  useEffect(() => {
    if (!playback) return;
    let request = 0;
    let started: number | undefined;
    const { startFrame } = playback;
    function tick(now: number) {
      started ??= now;
      const nextFrame = Math.min(frameCount.current, startFrame + Math.floor((now - started) * motionFps / 1000));
      setPosition(nextFrame);
      if (nextFrame === frameCount.current) setPlayback(null);
      else request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playback]);

  function applyReplacement(next: MotionDraft, play: boolean) {
    focusedMotionField()?.blur();
    inputSequence.current++;
    setPreviewRevision(current => current + 1);
    setPlayback(play ? { startFrame: 0 } : null);
    setPosition(play ? 0 : null);
    setWorkspace(current => {
      const nextParked = new Map(current.parked);
      if (current.draft.preset) nextParked.set(current.draft.preset, current.draft);
      const restored = next.preset ? nextParked.get(next.preset) ?? next : next;
      if (next.preset) nextParked.delete(next.preset);
      return { draft: restored, parked: nextParked };
    });
    setReplacement(undefined);
    setError("");
    setMessage("");
    document.getElementById("motion-preview")?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function requestReplacement(next: MotionDraft, play = false, focusPreview = false) {
    if (!draft.preset && (currentFileDirty.current || hasPendingFieldEdit())) {
      inputSequence.current++;
      setReplacement({ draft: next, play, focusPreview });
    } else {
      applyReplacement(next, play);
      if (focusPreview) preview.current?.focus({ preventScroll: true });
    }
  }

  function resetPreview() {
    focusedMotionField()?.blur();
    inputSequence.current++;
    setPreviewRevision(current => current + 1);
    setWorkspace(current => {
      const { draft } = current;
      const baseline = draft.preset ? projectKey(draft.original) : draft.baseline;
      return { ...current, draft: { ...draft, asset: draft.original, baseline } };
    });
    setPlayback(null);
    setPosition(null);
    setMessage("");
    setError("");
  }

  function changeAsset(changes: Partial<MotionAsset>) {
    setMessage("");
    setError("");
    setWorkspace(current => {
      const asset = current.draft.asset;
      if (Object.entries(changes).every(([key, value]) => asset[key as keyof MotionAsset] === value)) return current;
      return { ...current, draft: { ...current.draft, asset: { ...asset, ...changes } } };
    });
  }

  function changeTiming(drawFrames: number, holdFrames: number) {
    if (drawFrames === asset.drawFrames && holdFrames === asset.holdFrames) return;
    changeAsset({ drawFrames, holdFrames });
    setPosition(current => current === null ? null : Math.min(current, drawFrames + holdFrames));
  }

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const sequence = ++inputSequence.current;
    try {
      if (file.size > motionFileLimit) throw new Error("Choose an SVG or motion project up to 24 KB.");
      const source = await file.text();
      if (inputSequence.current !== sequence) return;
      const svg = /\.svg$/i.test(file.name);
      const imported = svg ? importMotionSvg(source, file.name.replace(/\.svg$/i, "").slice(0, 100)) : readMotionProject(JSON.parse(source));
      requestReplacement(makeDraft(imported, { unsaved: svg }));
    } catch (failure) {
      if (inputSequence.current !== sequence) return;
      setMessage("");
      setError(failure instanceof SyntaxError ? "Choose a valid ACM Motion project file." : (failure as Error).message);
    }
  }

  function downloadSource(format: "project" | "svg" | "lottie") {
    const source = format === "svg" ? motionSvg(asset, model.pathAt(asset.drawFrames))
      : JSON.stringify(format === "project" ? motionProject(asset) : motionLottie(asset), null, 2) + "\n";
    const extension = { project: "acm-motion.json", svg: "svg", lottie: "lottie.json" };
    download(new Blob([source], { type: format === "svg" ? "image/svg+xml" : "application/json" }), `${stem}.${extension[format]}`);
    if (format === "project") {
      setWorkspace(current => ({ ...current, draft: { ...current.draft, baseline: signature } }));
    }
    setError("");
    setMessage({ project: "Editable project download started.", svg: "SVG download started.", lottie: "Lottie download started." }[format]);
  }

  async function exportMov() {
    if (exportRequest.current || !movSupport?.available) return;
    const request = new AbortController();
    exportRequest.current = request;
    setExporting(true);
    setMessage("Rendering and encoding MOV…");
    setError("");
    try {
      const response = await fetch(movEndpoint, {
        method: "POST", headers: exportHeaders, signal: request.signal, body: signature,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "The MOV export failed. Check local Studio and try again.");
      }
      if (!response.headers.get("content-type")?.startsWith("video/quicktime")) throw new Error(localOnly);
      const file = await response.blob();
      if (request.signal.aborted) return;
      download(file, `${stem}.mov`);
      setMessage("Transparent MOV download started.");
    } catch (failure) {
      setMessage(request.signal.aborted ? "MOV export cancelled." : "");
      if (!request.signal.aborted) setError((failure as Error).message);
    } finally {
      if (exportRequest.current === request) exportRequest.current = null;
      setExporting(false);
    }
  }

  return <>
    <section className="motion-catalogue" aria-labelledby="motion-catalogue-title" inert={!ready}>
      <div className="motion-catalogue-heading">
        <div><h1 id="motion-catalogue-title">Motion Assets</h1><p>Choose a sketch to preview, adjust and export.</p></div>
        <div className="motion-catalogue-options">
          <ToggleSetting label="Autoplay on selection" checked={autoplay} onChange={setAutoplay} />
          <label className="motion-catalogue-search"><span>Search motion assets</span><SearchInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sketches…" /></label>
        </div>
      </div>
      <div className="motion-catalogue-grid">
        {visibleSketches.map(({ preset, sketch }) => <button key={preset.name} type="button" className="motion-catalogue-card" aria-label={`Use ${sketch.name}`} aria-pressed={draft.preset === preset.name} onClick={event => requestReplacement(makeDraft(preset, { preset: preset.name }), autoplay, event.detail > 0)}>
          <MotionThumbnail asset={sketch} />
          <strong>{sketch.name}</strong>
        </button>)}
      </div>
      {!visibleSketches.length ? <p>No matching sketches.</p> : null}
    </section>
    <div className="motion-workspace" data-motion-ready={ready} inert={!ready}>
      <section id="motion-preview" ref={preview} tabIndex={-1} className="motion-preview" aria-label="Motion preview">
        <div className="motion-toolbar">
          <h2>Preview</h2>
          <div className="motion-actions">
            <button type="button" className="button-secondary motion-reset-button" onClick={resetPreview}>
              <AcmIcon name="action.reset" scale="Regular-S" size={18} />Reset Preview
            </button>
            <button type="button" className="button-secondary" onClick={() => fileInput.current?.click()}>Open File</button>
            <button type="button" className="button-primary" onClick={() => downloadSource("project")}>Download Project</button>
            <input hidden ref={fileInput} type="file" accept=".svg,.json" onChange={openFile} />
          </div>
        </div>
        <MotionPreviewStage key={`${active}-${previewRevision}`} asset={previewAsset} path={previewModel.pathAt(frame)} geometry={previewModel.preview} onResize={changeAsset} onResizeDraft={setResizeDraft} />
        <div className="motion-transport">
          <button type="button" className="button-secondary motion-playback-button" aria-label={playbackLabel} title={`${playbackLabel} (Space)`} aria-keyshortcuts="Space" onClick={togglePlayback}><AcmIcon name={playback ? "media.pause" : "media.play"} scale="Regular-S" size={20} /></button>
          <RangeControl min={0} max={model.frameCount} step={1} value={frame}
            aria-label="Animation position" aria-valuetext={`${formatSeconds(frame)} of ${formatSeconds(model.frameCount)}`}
            tooltipPlacement="above" tooltipText={formatSeconds(frame)} onChange={event => { setPlayback(null); setPosition(event.target.valueAsNumber); }} />
          <span className="motion-time" aria-hidden="true">{formatSeconds(frame)} / {formatSeconds(model.frameCount)}</span>
        </div>
      </section>
      <Pane label="Motion settings" side="right" width={312} collapsed={false} onCollapsedChange={() => {}} collapseIcon={null} collapsible={false} inspectorPopoverOwner
        trackClassName="motion-inspector" header={<h2>Settings</h2>}>
        <div className="motion-settings">
          <div className="motion-setting-group" role="group" aria-label="Asset">
            <NameSetting key={previewRevision} name={asset.name} onChange={name => changeAsset({ name })} />
            <div className="motion-field-grid">
              <NumberSetting label="Width (px)" min={128} max={motionDimensionLimit(asset.height)} value={previewAsset.width} readOnly={resizeDraft !== null} onCommit={width => changeAsset({ width })} />
              <NumberSetting label="Height (px)" min={128} max={motionDimensionLimit(asset.width)} value={previewAsset.height} readOnly={resizeDraft !== null} onCommit={height => changeAsset({ height })} />
            </div>
          </div>
          <div className="motion-setting-group" role="group" aria-label="Stroke">
            {active ? <div className="motion-colour"><ColourPicker label="Stroke colour" value={asset.colour}
              onChange={colour => { if (colour && /^#[a-f0-9]{6}$/i.test(colour)) changeAsset({ colour }); }} enableAlpha={false} allowClear={false} livePointerChanges liveHexChanges /></div> : null}
            <NumberSetting label="Thickness (px)" value={asset.thickness} min={1} max={64} onCommit={thickness => changeAsset({ thickness })} />
          </div>
          <div className="motion-setting-group motion-field-grid" role="group" aria-label="Timing">
            <NumberSetting label="Draw time (s)" value={asset.drawFrames / motionFps} min={0.1} max={(300 - asset.holdFrames) / motionFps} step={0.1}
              onCommit={value => changeTiming(Math.round(value * motionFps), asset.holdFrames)} />
            <NumberSetting label="Hold time (s)" value={asset.holdFrames / motionFps} min={0.1} max={(300 - asset.drawFrames) / motionFps} step={0.1}
              onCommit={value => changeTiming(asset.drawFrames, Math.round(value * motionFps))} />
          </div>
          <div className="motion-setting-group">
            <h3>Export</h3>
            <div className="motion-actions">
              <button type="button" className="button-secondary" onClick={() => downloadSource("svg")}>SVG</button>
              <button type="button" className="button-secondary" onClick={() => downloadSource("lottie")}>Lottie JSON</button>
              {exporting ? <button type="button" className="button-secondary" onClick={() => exportRequest.current?.abort()}>Cancel Export</button>
                : <button type="button" className="button-secondary" disabled={!movSupport?.available} onClick={() => void exportMov()}>Transparent MOV</button>}
            </div>
            {!movSupport?.available ? <p className="motion-explanation">{movSupport?.error ?? "Checking local MOV export…"} </p> : null}
            <p role="status" className="motion-feedback">{message}</p>
            {error ? <p role="alert" className="motion-feedback">{error}</p> : null}
          </div>
        </div>
      </Pane>
    </div>
    {active && replacement ? <StudioDialog title="Replace this project?" onClose={() => setReplacement(undefined)}>
      <p>Download the editable project first if you want to keep your changes.</p>
      <StudioDialogActions>
        <button type="button" className="button-secondary" onClick={() => setReplacement(undefined)}>Keep Editing</button>
        <button type="button" className="button-primary" onClick={() => {
          applyReplacement(replacement.draft, replacement.play);
          // The dialog restores its opener's focus as it closes.
          if (replacement.focusPreview) requestAnimationFrame(() => preview.current?.focus());
        }}>Replace Project</button>
      </StudioDialogActions>
    </StudioDialog> : null}
  </>;
}
