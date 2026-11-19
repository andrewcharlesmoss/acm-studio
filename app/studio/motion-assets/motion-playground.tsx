"use client";

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import { ColourPicker } from "../controls/colour-picker";
import { NumberInput, TextInput } from "../controls/native-fields";
import { RangeControl } from "../controls/range-control";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { Pane } from "../panes/pane-components";
import { StudioUiActiveSectionContext } from "../ui/studio-ui-library";
import { importMotionSvg } from "./import-motion-svg";
import { motionCatalogue } from "./motion-catalogue";
import {
  motionDimensionLimit, motionFileLimit, motionFps, motionGeometry, motionLottie, motionPreset, motionProject,
  motionSvg, readMotionProject, type MotionAsset,
} from "./motion-asset";
import "./motion-assets.css";

const movEndpoint = "/__studio/motion-export";
const localOnly = "MOV export is available in local Studio with FFmpeg installed.";
const exportHeaders = { "Content-Type": "application/json", "X-Studio-Client": "motion-assets" };
const formatSeconds = (frames: number) => `${(frames / motionFps).toFixed(2)} s`;
const wave = motionPreset("wave");
const subscribeToHydration = () => () => {};
const projectKey = (asset: MotionAsset) => JSON.stringify(motionProject(asset));

function hasPendingFieldEdit() {
  const field = document.activeElement;
  return field instanceof HTMLInputElement && field.closest(".motion-field")
    && field.value !== field.dataset.committedValue;
}

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

function NumberSetting({ label, value, min, max, step = 1, onCommit }: {
  label: string; value: number; min: number; max: number; step?: number; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return <Field label={label}><NumberInput value={draft ?? value} data-committed-value={value} min={min} max={max} step={step}
    onChange={event => setDraft(event.target.value)}
    onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
    onBlur={event => {
      const entered = event.currentTarget.valueAsNumber;
      if (Number.isFinite(entered)) {
        onCommit(Math.max(min, Math.min(max, Math.round(entered / step) * step)));
      }
      setDraft(null);
    }} /></Field>;
}

export function MotionPlayground() {
  const active = useContext(StudioUiActiveSectionContext) === "motion-assets";
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [asset, setAsset] = useState(wave);
  const [search, setSearch] = useState("");
  const [baseline, setBaseline] = useState(() => projectKey(wave));
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [replacement, setReplacement] = useState<{ asset: MotionAsset; unsaved: boolean }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movSupport, setMovSupport] = useState<{ available: boolean; error?: string }>();
  const [exporting, setExporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const exportRequest = useRef<AbortController | null>(null);
  const inputSequence = useRef(0);
  const currentDirty = useRef(false);
  const model = useMemo(() => motionGeometry(asset), [asset]);
  const signature = useMemo(() => projectKey(asset), [asset]);
  const dirty = signature !== baseline;
  const frame = Math.min(position ?? model.frameCount, model.frameCount);
  const stem = asset.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "sketch";

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

  useLayoutEffect(() => { currentDirty.current = dirty; }, [dirty]);

  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (!dirty && !hasPendingFieldEdit()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  useEffect(() => () => exportRequest.current?.abort(), []);

  useEffect(() => {
    if (!playing) return;
    let request = 0;
    let started: number | undefined;
    const firstFrame = frame;
    function tick(now: number) {
      started ??= now;
      const nextFrame = Math.min(model.frameCount, firstFrame + Math.floor((now - started) * motionFps / 1000));
      setPosition(nextFrame);
      if (nextFrame === model.frameCount) setPlaying(false);
      else request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
    // Capture the starting frame when playback begins. Rendered frames don't restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, model.frameCount]);

  function applyReplacement(next: MotionAsset, unsaved: boolean) {
    inputSequence.current++;
    setPlaying(false);
    setPosition(null);
    setAsset(next);
    setBaseline(unsaved ? "" : projectKey(next));
    setReplacement(undefined);
    setError("");
    setMessage("");
    document.getElementById("motion-preview")?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function requestReplacement(next: MotionAsset, unsaved = false) {
    if (currentDirty.current || hasPendingFieldEdit()) setReplacement({ asset: next, unsaved });
    else applyReplacement(next, unsaved);
  }

  function changeAsset(changes: Partial<MotionAsset>) {
    setMessage("");
    setError("");
    setAsset(current => ({ ...current, ...changes }));
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
      requestReplacement(svg ? importMotionSvg(source, file.name.replace(/\.svg$/i, "").slice(0, 100)) : readMotionProject(JSON.parse(source)), svg);
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
    if (format === "project") setBaseline(signature);
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
        <label><span>Search motion assets</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sketches…" /></label>
      </div>
      <div className="motion-catalogue-grid">
        {motionCatalogue.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())).map(item => <button key={item.name} type="button" className="motion-catalogue-card" aria-label={`Use ${item.name}`} aria-pressed={asset.path === item.path && asset.name === item.name} onClick={() => requestReplacement(item)}>
          <svg viewBox="0 0 420 420" aria-hidden="true"><path d={item.path} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <strong>{item.name}</strong>
        </button>)}
      </div>
      {!motionCatalogue.some(item => item.name.toLowerCase().includes(search.trim().toLowerCase())) ? <p>No matching sketches.</p> : null}
    </section>
    <div className="motion-workspace" data-motion-ready={ready} inert={!ready}>
      <section id="motion-preview" className="motion-preview" aria-label="Motion preview">
        <div className="motion-toolbar">
          <h2>Preview</h2>
          <div className="motion-actions">
            <button type="button" className="button-secondary" onClick={() => fileInput.current?.click()}>Open File</button>
            <button type="button" className="button-primary" onClick={() => downloadSource("project")}>Download Project</button>
            <input hidden ref={fileInput} type="file" accept=".svg,.json" onChange={openFile} />
          </div>
        </div>
        <div className="motion-stage">
          <div className="motion-artboard" style={{
            aspectRatio: `${asset.width} / ${asset.height}`,
            width: `min(100%, ${asset.width}px, ${56 * asset.width / asset.height}vh)`,
          }}>
            <svg width={asset.width} height={asset.height} viewBox={`0 0 ${asset.width} ${asset.height}`} role="img" aria-label={`${asset.name} animation preview`}>
              {frame > 0 ? <path d={model.pathAt(frame)} fill="none" stroke={asset.colour} strokeWidth={asset.thickness} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </svg>
          </div>
        </div>
        <div className="motion-transport">
          <button type="button" className="button-secondary" onClick={() => {
            if (playing) { setPlaying(false); return; }
            if (frame === model.frameCount) setPosition(0);
            setPlaying(true);
          }}>{playing ? "Pause" : "Play"}</button>
          <RangeControl min={0} max={model.frameCount} step={1} value={frame}
            aria-label="Animation position" aria-valuetext={`${formatSeconds(frame)} of ${formatSeconds(model.frameCount)}`}
            tooltipPlacement="above" tooltipText={formatSeconds(frame)} onChange={event => { setPlaying(false); setPosition(event.target.valueAsNumber); }} />
          <span className="motion-time" aria-hidden="true">{formatSeconds(frame)} / {formatSeconds(model.frameCount)}</span>
        </div>
      </section>
      <Pane label="Motion settings" side="right" width={312} collapsed={false} onCollapsedChange={() => {}} collapseIcon={null} collapsible={false} inspectorPopoverOwner
        trackClassName="motion-inspector" header={<h2>Settings</h2>}>
        <div className="motion-settings">
          <div className="motion-setting-group" role="group" aria-label="Asset">
            <Field label="Name"><TextInput maxLength={100} defaultValue={asset.name} data-committed-value={asset.name} key={asset.path + asset.name}
              onBlur={event => {
                const name = event.currentTarget.value.trim();
                if (name) changeAsset({ name });
                else event.currentTarget.value = asset.name;
              }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></Field>
            <div className="motion-field-grid">
              <NumberSetting label="Width (px)" min={128} max={motionDimensionLimit(asset.height)} value={asset.width} onCommit={width => changeAsset({ width })} />
              <NumberSetting label="Height (px)" min={128} max={motionDimensionLimit(asset.width)} value={asset.height} onCommit={height => changeAsset({ height })} />
            </div>
          </div>
          <div className="motion-setting-group" role="group" aria-label="Stroke">
            {active ? <div className="motion-colour"><ColourPicker label="Stroke colour" value={asset.colour}
              onChange={colour => { if (colour && /^#[a-f0-9]{6}$/i.test(colour)) changeAsset({ colour }); }} enableAlpha={false} allowClear={false} /></div> : null}
            <NumberSetting label="Thickness (px)" value={asset.thickness} min={1} max={64} onCommit={thickness => changeAsset({ thickness })} />
          </div>
          <div className="motion-setting-group motion-field-grid" role="group" aria-label="Timing">
            <NumberSetting label="Draw time (s)" value={asset.drawFrames / motionFps} min={0.1} max={(300 - asset.holdFrames) / motionFps} step={0.1}
              onCommit={value => changeAsset({ drawFrames: Math.round(value * motionFps) })} />
            <NumberSetting label="Hold time (s)" value={asset.holdFrames / motionFps} min={0.1} max={(300 - asset.drawFrames) / motionFps} step={0.1}
              onCommit={value => changeAsset({ holdFrames: Math.round(value * motionFps) })} />
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
        <button type="button" className="button-primary" onClick={() => applyReplacement(replacement.asset, replacement.unsaved)}>Replace Project</button>
      </StudioDialogActions>
    </StudioDialog> : null}
  </>;
}
