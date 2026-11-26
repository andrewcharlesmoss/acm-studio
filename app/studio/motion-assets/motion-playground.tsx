"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { memo, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type MouseEventHandler, type ReactNode } from "react";
import { HistoryActions } from "../controls/history-actions";
import { studioHistoryShortcut } from "../studio-history-shortcuts.mjs";
import { ColourPicker } from "../controls/colour-picker";
import { SearchInput, TextInput } from "../controls/native-fields";
import { NumberStepper } from "../controls/number-stepper";
import { RangeControl } from "../controls/range-control";
import { ToggleSetting } from "../controls/toggle-setting";
import { motionBinPrefix, type MotionBinCommand } from "../media-command";
import { changeLibraryFile } from "../media-sync";
import { StudioListContextMenu } from "../studio-list-context-menu";
import { createStudioPreferenceRepository } from "../studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";
import { motionCatalogueKey, motionCatalogueChanged, readMotionCatalogue, validMotionCatalogue } from "./catalogue-preferences.mjs";
import { useLibraryPreviewFiles, type LibraryPreviewFile } from "../media-library-preview";
import { MediaFileDetailsButton } from "../media-file-details";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { Pane, PaneTabPanel, PaneTabs } from "../panes/pane-components";
import { StudioUiActiveSectionContext } from "../ui/studio-ui-library";
import { importMotionSvg } from "./import-motion-svg";
import { motionCatalogue } from "./motion-catalogue";
import { MotionEffectArtwork, motionEffectCatalogue, motionEffectKeywords, motionEffectPoster, motionEffectPreview } from "./motion-effects";
import { MotionPreviewStage } from "./motion-preview-stage";
import { formatPlaybackTime, MotionPlaybackTransport, MotionPreviewPane, useMotionPlaybackShortcut } from "./motion-preview-controls";
import { MotionVideoWorkspace } from "./motion-video-workspace";
import { VideoCatalogueThumbnail } from "./video-catalogue-thumbnail";
import { VolumetricFireballCanvas, fireballPoster } from "./volumetric-fireball-canvas";
import { focusedMotionField, hasPendingFieldEdit, makeDraft, projectKey, useMotionPreviewWorkspace, type MotionDraft } from "./motion-preview-workspace";
import type { MotionSize } from "./motion-resize";
import {
  isVolumetricEffect, motionDimensionLimit, motionEffectDuration, motionEffectFrameLimit, motionFileLimit, motionFps, motionGeometry, motionLottie, motionProject,
  motionSvg, readMotionProject, softFadeControls, softFadeDefaults, volumetricExportRequirement, type MotionAsset, type MotionClip, type MotionEffect,
} from "./motion-asset";
import "./motion-assets.css";

const movEndpoint = "/__studio/motion-export";
const localOnly = "MOV export is available in local Studio with FFmpeg installed.";
const exportHeaders = { "Content-Type": "application/json", "X-Studio-Client": "motion-assets" };
type MovSupport = { available: boolean; volumetricAvailable?: boolean; error?: string };
const subscribeToHydration = () => () => {};
const motionAssetTabs = [
  { id: "special-effects", label: "Special Effects" },
  { id: "sketches", label: "Sketches" },
] as const;
type MotionAssetTab = (typeof motionAssetTabs)[number]["id"];
type PresetPreferences = Record<string, { name?: string; hidden?: boolean }>;
type CatalogueStep = {
  label: "Rename" | "Delete" | "Restore";
  fileGeneration?: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};
const catalogueHistoryLimit = 50;

type VideoSelection = { id: string; poster?: { source: Blob; image: string } };

function revealPreview(element: HTMLElement, preserveVisiblePosition = false) {
  if (preserveVisiblePosition) {
    const { top, bottom } = element.getBoundingClientRect();
    if (top < window.innerHeight && bottom > 0) return;
  }
  element.scrollIntoView({ block: "start", behavior: "instant" });
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

function SketchArtwork({ asset, path }: { asset: MotionAsset; path: string }) {
  return path ? <path d={path} fill="none" stroke={asset.colour} strokeWidth={asset.thickness} strokeLinecap="round" strokeLinejoin="round" /> : null;
}

const MotionThumbnail = memo(function MotionThumbnail({ asset }: { asset: MotionClip }) {
  if ("effect" in asset && isVolumetricEffect(asset.effect)) {
    // eslint-disable-next-line @next/next/no-img-element -- The renderer's bundled poster is already sized for the catalogue.
    return <img src={fireballPoster(asset.effect)} width={320} height={180} alt="" />;
  }
  return <svg viewBox={`0 0 ${asset.width} ${asset.height}`} aria-hidden="true">
    {"effect" in asset ? <MotionEffectArtwork asset={asset} frame={motionEffectPoster(asset)} />
      : <SketchArtwork asset={asset} path={motionGeometry(asset).pathAt(asset.drawFrames)} />}
  </svg>;
});

function MotionCatalogueCard({ name, label, pressed, onClick, onContextMenu, children }: {
  name: string; label: string; pressed: boolean; onClick: MouseEventHandler<HTMLButtonElement>; onContextMenu: MouseEventHandler<HTMLButtonElement>; children: ReactNode;
}) {
  return <button type="button" className="motion-catalogue-card" aria-label={label} aria-pressed={pressed} onClick={onClick} onContextMenu={onContextMenu} onKeyDown={event => {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: bounds.left, clientY: bounds.bottom }));
  }}>
    {children}
    <strong>{name}</strong>
  </button>;
}

function AnimationCatalogueCards({ entries, selectedPreset, onSelect, onContextMenu, children }: {
  entries: { preset: MotionClip; clip: MotionClip }[];
  selectedPreset?: string;
  onSelect: (preset: MotionClip, focusPreview: boolean) => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>, preset: MotionClip, clip: MotionClip) => void;
  children?: ReactNode;
}) {
  return <div className="motion-catalogue-grid">
    {entries.map(({ preset, clip }) => <MotionCatalogueCard key={preset.name} name={clip.name}
      label={`Use ${clip.name}`} pressed={selectedPreset === preset.name}
      onClick={event => onSelect(preset, event.detail > 0)} onContextMenu={event => onContextMenu(event, preset, clip)}>
      <MotionThumbnail asset={clip} />
    </MotionCatalogueCard>)}
    {children}
  </div>;
}

export function MotionPlayground() {
  const active = useContext(StudioUiActiveSectionContext) === "motion-assets";
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { workspace: { draft, parked }, setWorkspace, autoplay, setAutoplay, movExport, setMovExport } = useMotionPreviewWorkspace();
  const { asset } = draft;
  const sketch = "effect" in asset ? null : asset;
  const fireballSettings = "effect" in asset && asset.effect === "volumetric-fireball-soft-fade"
    ? asset.softFade ?? softFadeDefaults : null;
  const [assetTab, setAssetTab] = useState<MotionAssetTab>("sketches");
  const [videoSelection, setVideoSelection] = useState<VideoSelection>();
  const [searches, setSearches] = useState<Record<MotionAssetTab, string>>({ "special-effects": "", sketches: "" });
  const assetTabsId = useId();
  const [playback, setPlayback] = useState<{ startFrame: number } | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [resizeDraft, setResizeDraft] = useState<MotionSize | null>(null);
  const [replacement, setReplacement] = useState<{ draft: MotionDraft; play: boolean; focusPreview: boolean }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [catalogue, setCatalogue] = useState<PresetPreferences>({});
  const [menu, setMenu] = useState<{ label: string; x: number; y: number; opener: HTMLButtonElement; preset?: MotionClip; file?: LibraryPreviewFile; generation?: string | null; presetBefore?: string }>();
  const [action, setAction] = useState<{ mode: "rename" | "delete"; target: NonNullable<typeof menu> }>();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const catalogueBusy = useRef(false);
  const pendingPresetNames = useRef(new Map<string, string>());
  const [history, setHistory] = useState<{ past: CatalogueStep[]; future: CatalogueStep[]; generation: string | null }>({ past: [], future: [], generation: null });
  const [catalogueError, setCatalogueError] = useState("");
  const [movSupport, setMovSupport] = useState<MovSupport>();
  const fileInput = useRef<HTMLInputElement>(null);
  const historyControls = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLElement>(null);
  const videoTile = useRef<HTMLButtonElement | null>(null);
  const videoReveal = useRef<{ id: string; focus: boolean; preserveVisiblePosition: boolean } | null>(null);
  const videoPosters = useRef(new WeakMap<Blob, string>());
  const exportRequest = useRef<AbortController | null>(null);
  const inputSequence = useRef(0);
  const currentFileDirty = useRef(false);
  const model = useMemo(() => sketch ? motionGeometry(sketch) : null, [sketch]);
  const previewAsset = useMemo(() => resizeDraft ? { ...asset, ...resizeDraft } : asset, [asset, resizeDraft]);
  const previewModel = useMemo(() => "effect" in previewAsset ? null
    : previewAsset === asset ? model : motionGeometry(previewAsset), [asset, model, previewAsset]);
  const videoSearch = searches["special-effects"];
  const sketchSearch = searches.sketches;
  const videoQuery = videoSearch.trim().toLowerCase();
  const { files, binFiles, motionBins, generation, unavailable: filesUnavailable } = useLibraryPreviewFiles("video");
  if (generation && generation !== history.generation) {
    const matchesLibrary = (step: CatalogueStep) => !step.fileGeneration || step.fileGeneration === generation;
    setHistory({ generation, past: history.past.filter(matchesLibrary), future: history.future.filter(matchesLibrary) });
  }
  const videoFiles = files.filter(({ asset }) => asset.name.toLowerCase().includes(videoQuery));
  const selectedVideo = assetTab === "special-effects" ? videoFiles.find(file => file.asset.id === videoSelection?.id) : undefined;
  const animationActive = active && !selectedVideo;
  const poster = videoSelection?.poster;
  const selectedVideoPoster = selectedVideo && poster?.source === (selectedVideo.preview?.blob ?? selectedVideo.asset.blob) ? poster.image : undefined;
  const rememberVideoPoster = useCallback((id: string, source: Blob, image: string) => {
    videoPosters.current.set(source, image);
    setVideoSelection(current => current?.id === id ? { ...current, poster: { source, image } } : current);
  }, []);
  const revealVideoPreview = useCallback((id: string, element: HTMLElement) => {
    const reveal = videoReveal.current;
    if (reveal?.id !== id) return;
    videoReveal.current = null;
    revealPreview(element, reveal.preserveVisiblePosition);
    if (reveal.focus) element.focus({ preventScroll: true });
  }, []);
  const { effects, sketches } = useMemo(() => {
    const matching = (presets: readonly MotionClip[], search: string) => {
      const query = search.trim().toLowerCase();
      return presets.flatMap(preset => {
        if (catalogue[preset.name]?.hidden) return [];
        const stored = draft.preset === preset.name ? previewAsset : parked.get(preset.name)?.asset ?? preset;
        const clip = { ...stored, name: catalogue[preset.name]?.name ?? stored.name };
        return [preset.name, clip.name, "effect" in clip ? motionEffectKeywords(clip) : ""]
          .some(name => name.toLowerCase().includes(query)) ? [{ preset, clip }] : [];
      });
    };
    return { effects: matching(motionEffectCatalogue, videoSearch), sketches: matching(motionCatalogue, sketchSearch) };
  }, [catalogue, draft.preset, parked, previewAsset, videoSearch, sketchSearch]);
  const duration = "effect" in asset ? asset.durationFrames : asset.drawFrames + asset.holdFrames;
  const volumetric = "effect" in asset && isVolumetricEffect(asset.effect);
  const durationLimit = "effect" in asset ? motionEffectFrameLimit(asset.effect) : 0;
  const canExportMov = movSupport?.available && (!volumetric || movSupport.volumetricAvailable);
  const exportExplanation = !movSupport ? "Checking local MOV export…"
    : !movSupport.available ? movSupport.error ?? localOnly : volumetricExportRequirement;
  const frameCount = useRef(duration);
  const signature = useMemo(() => projectKey(asset), [asset]);
  const dirty = signature !== draft.baseline;
  const frame = Math.min(position ?? ("effect" in asset ? motionEffectPoster(asset) : duration), duration);
  const stem = asset.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || (sketch ? "sketch" : "effect");
  const cancelExport = movExport && "message" in movExport ? movExport.cancel : undefined;
  const feedbackMessage = movExport && "message" in movExport ? movExport.message : message;
  const feedbackError = movExport && "error" in movExport ? movExport.error : error;

  if (!active && playback) setPlayback(null);

  function togglePlayback() {
    if (playback) { setPlayback(null); return; }
    const startFrame = position === null || frame === duration ? 0 : frame;
    setPosition(startFrame);
    setPlayback({ startFrame });
  }

  useMotionPlaybackShortcut(animationActive && ready, togglePlayback);

  useEffect(() => {
    const controller = new AbortController();
    async function checkEncoder() {
      if (location.hostname !== "localhost") return { available: false, error: localOnly };
      const response = await fetch(movEndpoint + "/status", {
        method: "POST", headers: exportHeaders, body: "{}", signal: controller.signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error();
      return response.json() as Promise<MovSupport>;
    }
    void checkEncoder().then(support => {
      if (!controller.signal.aborted) setMovSupport(support);
    }).catch(() => {
      if (!controller.signal.aborted) setMovSupport({ available: false, error: localOnly });
    });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => { currentFileDirty.current = !draft.preset && dirty; }, [draft.preset, dirty]);
  useLayoutEffect(() => { frameCount.current = duration; }, [duration]);

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

  function clearFeedback() {
    setMessage("");
    setError("");
    setMovExport(current => current && "message" in current && current.cancel ? current : undefined);
  }

  function applyReplacement(next: MotionDraft, play: boolean) {
    focusedMotionField()?.blur();
    inputSequence.current++;
    setPreviewRevision(current => current + 1);
    setVideoSelection(undefined);
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
    clearFeedback();
    if (selectedVideo) {
      requestAnimationFrame(() => { if (preview.current) revealPreview(preview.current, true); });
    } else if (preview.current) revealPreview(preview.current);
  }

  function requestReplacement(next: MotionDraft, play = false, focusPreview = false) {
    if (!draft.preset && (currentFileDirty.current || hasPendingFieldEdit())) {
      inputSequence.current++;
      setReplacement({ draft: next, play, focusPreview });
    } else {
      applyReplacement(next, play);
      if (focusPreview) {
        if (selectedVideo) requestAnimationFrame(() => preview.current?.focus({ preventScroll: true }));
        else preview.current?.focus({ preventScroll: true });
      }
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
    clearFeedback();
  }

  function changeAsset(changes: Partial<Omit<MotionAsset, "path" | "viewBox"> & Pick<MotionEffect, "durationFrames" | "softFade">>) {
    clearFeedback();
    setWorkspace(current => {
      const asset = current.draft.asset;
      if (Object.entries(changes).every(([key, value]) => asset[key as keyof MotionClip] === value)) return current;
      return { ...current, draft: { ...current.draft, asset: { ...asset, ...changes } } };
    });
  }

  function changeTiming(drawFrames: number, holdFrames: number) {
    if (drawFrames === sketch?.drawFrames && holdFrames === sketch.holdFrames) return;
    changeAsset({ drawFrames, holdFrames });
    setPosition(current => current === null ? null : Math.min(current, drawFrames + holdFrames));
  }

  function changeEffectDuration(durationFrames: number) {
    changeAsset({ durationFrames });
    setPosition(current => current === null ? null : Math.min(current, durationFrames));
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
      clearFeedback();
      setError(failure instanceof SyntaxError ? "Choose a valid ACM Motion project file." : (failure as Error).message);
    }
  }

  function downloadSource(format: "project" | "svg" | "lottie") {
    let source;
    if (format === "project") source = JSON.stringify(motionProject(asset), null, 2) + "\n";
    else {
      if (!sketch || !model) return;
      source = format === "svg" ? motionSvg(sketch, model.pathAt(sketch.drawFrames)) : JSON.stringify(motionLottie(sketch), null, 2) + "\n";
    }
    const extension = { project: "acm-motion.json", svg: "svg", lottie: "lottie.json" };
    download(new Blob([source], { type: format === "svg" ? "image/svg+xml" : "application/json" }), `${stem}.${extension[format]}`);
    if (format === "project") {
      setWorkspace(current => ({ ...current, draft: { ...current.draft, baseline: signature } }));
    }
    clearFeedback();
    setMessage({ project: "Editable project download started.", svg: "SVG download started.", lottie: "Lottie download started." }[format]);
  }

  async function exportMov() {
    if (exportRequest.current || !canExportMov) return;
    const request = new AbortController();
    exportRequest.current = request;
    clearFeedback();
    setMovExport({ message: "Rendering and encoding MOV…", cancel: () => request.abort() });
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
      request.signal.throwIfAborted();
      download(file, `${stem}.mov`);
      setMovExport({ message: "Transparent MOV download started." });
    } catch (failure) {
      setMovExport(request.signal.aborted ? { message: "MOV export cancelled." } : { error: (failure as Error).message });
    } finally {
      if (exportRequest.current === request) exportRequest.current = null;
    }
  }

  useEffect(() => {
    const refresh = () => {
      try {
        const value = readMotionCatalogue(window.localStorage);
        if (!validMotionCatalogue(value)) throw new Error("Motion asset settings are invalid and have been preserved.");
        const names = JSON.parse(value) as PresetPreferences;
        setCatalogue(names);
        setWorkspace(current => {
          const update = (item: MotionDraft) => {
            const name = item.preset && (names[item.preset]?.name ?? item.preset);
            if (!name || name === item.asset.name) return item;
            const clean = projectKey(item.asset) === item.baseline;
            const renamed = { ...item.asset, name };
            return { ...item, asset: renamed, original: { ...item.original, name },
              baseline: clean ? projectKey(renamed) : item.baseline };
          };
          const parked = new Map(current.parked);
          for (const [id, item] of parked) parked.set(id, update(item));
          return { ...current, draft: update(current.draft), parked };
        });
      } catch { setCatalogueError("Motion asset settings could not be loaded. Existing settings have been preserved."); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(motionCatalogueChanged, refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener(motionCatalogueChanged, refresh); };
  }, [setWorkspace]);

  function openCatalogueMenu(event: React.MouseEvent<HTMLButtonElement>, target: { label: string; preset?: MotionClip; file?: LibraryPreviewFile; generation?: string | null }) {
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    let presetBefore: string | undefined;
    if (target.preset) {
      try {
        const value = readMotionCatalogue(window.localStorage);
        if (!validMotionCatalogue(value)) throw new Error();
        presetBefore = JSON.stringify(JSON.parse(value)[target.preset.name] ?? {});
      } catch {
        setCatalogueError("Motion asset settings could not be loaded. Existing settings have been preserved.");
        return;
      }
    }
    setMenu({ ...target, presetBefore, x: event.clientX || box.left, y: event.clientY || box.bottom, opener: event.currentTarget });
  }

  async function saveCatalogueChange(before: string, after: string) {
    if (!validMotionCatalogue(before)) throw new Error("Motion asset settings are invalid and have been preserved.");
    const repository = createStudioPreferenceRepository({ storage: window.localStorage, key: motionCatalogueKey,
      read: readMotionCatalogue, validate: validMotionCatalogue });
    let result = await repository.update((current: string) => {
      if (current !== before) throw new Error("Motion assets changed in another tab. Please try again.");
      return after;
    });
    if (!result.saved && result.reason === "blocked") {
      result = await saveStudioPreferenceThroughOwner("motionCatalogue", JSON.stringify({ before, after }));
    }
    if (!result.saved) throw new Error("The motion catalogue could not be saved. Please try again.");
    window.dispatchEvent(new Event(motionCatalogueChanged));
  }

  function readCatalogue() {
    const source = readMotionCatalogue(window.localStorage);
    if (!validMotionCatalogue(source)) throw new Error("Motion asset settings are invalid and have been preserved.");
    return { source, values: JSON.parse(source) as PresetPreferences };
  }

  async function runCatalogueAction(apply: () => Promise<void>) {
    if (catalogueBusy.current) return;
    catalogueBusy.current = true;
    setSaving(true);
    setCatalogueError("");
    try {
      await apply();
      // The Name field keeps its latest edit while the preference save is in flight.
      while (pendingPresetNames.current.size) {
        const pending = [...pendingPresetNames.current];
        pendingPresetNames.current.clear();
        for (const [key, name] of pending) await savePresetName(key, name);
      }
    } catch (error) {
      setCatalogueError(error instanceof Error ? error.message : "The motion asset change could not be saved.");
    } finally {
      pendingPresetNames.current.clear();
      catalogueBusy.current = false;
      setSaving(false);
    }
  }

  async function applyCatalogueStep(step: CatalogueStep, initial = step.redo) {
    await initial();
    setHistory(current => {
      if (step.fileGeneration && step.fileGeneration !== current.generation) return current;
      return { ...current, past: [...current.past, step].slice(-catalogueHistoryLimit), future: [] };
    });
    focusHistory();
  }

  function changeHistory(direction: "undo" | "redo") {
    const step = (direction === "undo" ? history.past : history.future).at(-1);
    if (!step) return;
    void runCatalogueAction(async () => {
      await step[direction]();
      setHistory(current => {
        const { past, future } = current;
        const source = direction === "undo" ? past : future;
        if (source.at(-1) !== step) return current;
        return direction === "undo"
          ? { ...current, past: past.slice(0, -1), future: [...future, step] }
          : { ...current, past: [...past, step], future: future.slice(0, -1) };
      });
      focusHistory();
    });
  }

  function focusHistory() {
    requestAnimationFrame(() => {
      const focus = document.activeElement;
      if (!focus || focus === document.body || !focus.isConnected) {
        historyControls.current?.focus({ preventScroll: true });
      }
    });
  }

  function onHistoryShortcut(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!active || !ready || action || menu || replacement || saving
      || !event.currentTarget.contains(event.target as Node)) return;
    const direction = studioHistoryShortcut(event.nativeEvent, navigator.platform);
    if (!direction || !(direction === "undo" ? history.past : history.future).length) return;
    event.preventDefault();
    changeHistory(direction);
  }

  function presetStep(label: CatalogueStep["label"], before: PresetPreferences, after: PresetPreferences): CatalogueStep {
    // The action may touch several entries when restoring hidden built-ins.
    // Merge unrelated edits from another tab, but reject changes to these entries.
    const apply = async (expected: PresetPreferences, next: PresetPreferences) => {
      const { source, values } = readCatalogue();
      for (const key of Object.keys(expected)) {
        const actual = values[key] ?? {};
        if (actual.name !== expected[key].name || actual.hidden !== expected[key].hidden) {
          throw new Error("This motion asset changed in another tab. Review the current asset before trying again.");
        }
        if (Object.keys(next[key]).length) values[key] = next[key];
        else delete values[key];
      }
      await saveCatalogueChange(source, JSON.stringify(values));
    };
    return { label, undo: () => apply(after, before), redo: () => apply(before, after) };
  }

  function changeMotionBin(
    command: Omit<MotionBinCommand, "kind" | "toBin">,
    fileGeneration: string | null,
    toBin: boolean,
  ): Promise<void> {
    const { updatedAt, ...location } = command;
    const move = async (hide: boolean, initialTimestamp?: string) => {
      await changeLibraryFile({ ...location, kind: "move-motion-video", toBin: hide,
        ...(initialTimestamp ? { updatedAt: initialTimestamp } : {}) }, fileGeneration);
      if (hide) setVideoSelection(current => current?.id === command.id ? undefined : current);
    };
    const step: CatalogueStep = {
      label: toBin ? "Delete" : "Restore", fileGeneration: fileGeneration ?? undefined, undo: () => move(!toBin), redo: () => move(toBin),
    };
    return applyCatalogueStep(step, () => move(toBin, updatedAt));
  }

  async function savePresetName(key: string, name: string) {
    const { values } = readCatalogue();
    const before = values[key] ?? {};
    if ((before.name ?? key) === name) return;
    await applyCatalogueStep(presetStep("Rename", { [key]: before }, { [key]: { ...before, name } }));
  }

  function renameSelectedPreset(name: string) {
    if (!draft.preset) { changeAsset({ name }); return; }
    const key = draft.preset;
    if (catalogueBusy.current) {
      pendingPresetNames.current.set(key, name);
      return;
    }
    void runCatalogueAction(() => savePresetName(key, name));
  }

  function commitCatalogueAction() {
    if (!action) return;
    const name = newName.trim();
    if (action.mode === "rename" && (!name || name.length > 100)) {
      setCatalogueError("Enter a name from 1 to 100 characters.");
      return;
    }
    void runCatalogueAction(async () => {
      const { target, mode } = action;
      if (mode === "rename" && name === target.label) {
        setAction(undefined);
        return;
      }
      if (target.file) {
        const { asset, preview } = target.file;
        const fileGeneration = target.generation ?? null;
        if (mode === "delete") {
          const sourceFolderId = asset.folderId!;
          await changeMotionBin({
            id: asset.id, name: asset.name, sourceFolderId, updatedAt: asset.updatedAt,
            binFolderId: motionBins.get(sourceFolderId) ?? motionBinPrefix + crypto.randomUUID(),
          }, fileGeneration, true);
        } else {
          const { id, name: originalName, folderId, type } = asset;
          const mov = /\.mov$/i.test(originalName);
          if (mov && !/\.mov$/i.test(name)) throw new Error("Keep the .mov extension so the matching preview stays connected.");
          const companion = preview ? { id: preview.id, name: preview.name, folderId: preview.folderId!, type: preview.type } : null;
          const pairedName = name.replace(/\.mov$/i, ".mp4");
          const rename = (from: string, to: string, fromPreview?: string, toPreview?: string) => mov
            ? changeLibraryFile({
              kind: "rename-video-with-preview", id, name: to,
              before: { name: from, folderId: folderId!, type },
              preview: companion ? { ...companion, name: fromPreview! } : null,
              ...(toPreview ? { previewName: toPreview } : {}),
            }, fileGeneration)
            : changeLibraryFile({ kind: "update-asset", id, before: { name: from, folderId }, update: { name: to, folderId } }, fileGeneration);
          await applyCatalogueStep({ label: "Rename", fileGeneration: fileGeneration ?? undefined,
            undo: () => rename(name, originalName, pairedName, companion?.name),
            redo: () => rename(originalName, name, companion?.name),
          });
        }
      } else if (target.preset) {
        const key = target.preset.name;
        const before = JSON.parse(target.presetBefore ?? "{}");
        const after = mode === "delete" ? { ...before, hidden: true } : { ...before, name };
        await applyCatalogueStep(presetStep(mode === "delete" ? "Delete" : "Rename", { [key]: before }, { [key]: after }));
      }
      setAction(undefined);
      if (mode === "delete") requestAnimationFrame(() => {
        if (document.activeElement === target.opener || document.activeElement === document.body) {
          historyControls.current?.focus({ preventScroll: true });
        }
      });
    });
  }

  function restorePresets() {
    void runCatalogueAction(async () => {
      const { values } = readCatalogue();
      const before: PresetPreferences = Object.create(null);
      const after: PresetPreferences = Object.create(null);
      for (const [key, { hidden, ...visible }] of Object.entries(values)) {
        if (!hidden) continue;
        before[key] = values[key];
        after[key] = visible;
      }
      if (Object.keys(before).length) await applyCatalogueStep(presetStep("Restore", before, after));
    });
  }

  function selectCataloguePreset(preset: MotionClip, focusPreview: boolean) {
    const play = autoplay && (!("effect" in preset) || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    requestReplacement(makeDraft({ ...preset, name: catalogue[preset.name]?.name ?? preset.name }, { preset: preset.name }), play, focusPreview);
  }

  function selectAssetTab(id: string) {
    const tab = motionAssetTabs.find(tab => tab.id === id);
    if (!tab) return;
    setAssetTab(tab.id);
  }

  const movAction = cancelExport ? <button type="button" className="button-secondary" onClick={cancelExport}>Cancel Export</button>
    : <button type="button" className="button-secondary" disabled={!canExportMov} onClick={() => void exportMov()}>
      {sketch ? "Transparent MOV" : "Download MOV"}
    </button>;
  const exportStatus = <>
    {!canExportMov ? <p className="motion-explanation">{exportExplanation}</p> : null}
    <p role="status" className="motion-feedback">{feedbackMessage}</p>
    {feedbackError ? <p role="alert" className="motion-feedback">{feedbackError}</p> : null}
  </>;

  // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Motion Assets owns shortcuts for focused descendants.
  return <div className="motion-playground" onKeyDown={onHistoryShortcut}>
    <Pane label="Motion Assets" side="left" width={280} collapsed={false} onCollapsedChange={() => {}} collapseIcon={null}
      collapsible={false} inert={!ready} trackClassName="motion-catalogue-pane" bodyClassName="motion-catalogue-body"
      header={<h1>Motion Assets</h1>}
      tabs={<PaneTabs id={assetTabsId} label="Motion asset categories" className="motion-category-tabs"
        tabs={motionAssetTabs} active={assetTab} onChange={selectAssetTab} />}
      toolbar={<div className="motion-catalogue-options">
        <label className="motion-catalogue-search"><span>Search motion assets</span>
          <SearchInput value={searches[assetTab]} onChange={event => {
            const value = event.target.value;
            setSearches(previous => ({ ...previous, [assetTab]: value }));
          }} placeholder="Search this tab…" /></label>
        <ToggleSetting label="Autoplay on selection" checked={autoplay} onChange={setAutoplay} />
        <div className="motion-actions" role="group" aria-label="Motion asset history" ref={historyControls} tabIndex={-1}>
          <HistoryActions presentation="labelled" canUndo={history.past.length > 0} canRedo={history.future.length > 0}
            disabled={saving} onUndo={() => changeHistory("undo")} onRedo={() => changeHistory("redo")}
            undoLabel={history.past.length ? `Undo ${history.past.at(-1)!.label}` : "Undo"}
            redoLabel={history.future.length ? `Redo ${history.future.at(-1)!.label}` : "Redo"} />
        </div>
      </div>}>
    {Object.values(catalogue).some(item => item.hidden) && <button type="button" className="button-secondary" disabled={saving}
      onClick={restorePresets}>Restore built-in assets</button>}
    {binFiles.length > 0 && <details>
      <summary>Motion Assets Bin ({binFiles.length})</summary>
      <ul>{binFiles.map(file => <li key={file.id}>
        <button type="button" className="button-secondary" disabled={saving} onClick={() => void runCatalogueAction(() =>
          changeMotionBin(file, generation, false))}>Restore {file.name}</button>
      </li>)}</ul>
    </details>}
    {catalogueError && !action && <p role="alert">{catalogueError}</p>}
      <PaneTabPanel id={assetTabsId} tab="special-effects" active={assetTab}>
        {effects.length || videoFiles.length ? <AnimationCatalogueCards entries={effects}
          selectedPreset={selectedVideo ? undefined : draft.preset} onSelect={selectCataloguePreset}
          onContextMenu={(event, preset, clip) => openCatalogueMenu(event, { label: clip.name, preset })}>
          {videoFiles.map(file => { const { asset, preview } = file; return <MotionCatalogueCard key={asset.id} name={asset.name}
            label={`Preview ${asset.name}`} pressed={videoSelection?.id === asset.id}
            onContextMenu={event => openCatalogueMenu(event, { label: asset.name, file, generation })}
            onClick={event => {
              videoTile.current = event.currentTarget;
              setPlayback(null);
              const source = preview?.blob ?? asset.blob;
              const image = videoPosters.current.get(source);
              const selection = { id: asset.id, poster: image ? { source, image } : undefined };
              const closing = videoSelection?.id === asset.id;
              videoReveal.current = closing ? null : {
                id: asset.id, focus: event.detail > 0, preserveVisiblePosition: Boolean(selectedVideo) || !sketch,
              };
              setVideoSelection(closing ? undefined : selection);
            }}>
            <VideoCatalogueThumbnail id={asset.id} source={preview?.blob ?? asset.blob} onPoster={rememberVideoPoster}
              active={active && assetTab === "special-effects"} />
          </MotionCatalogueCard>; })}
        </AnimationCatalogueCards> : null}
        {filesUnavailable ? <p role="status">The files from your Motion Assets folder couldn’t be loaded.</p> : null}
        {!effects.length && !videoFiles.length ? <p>No matching motion assets.</p> : null}
      </PaneTabPanel>
      <PaneTabPanel id={assetTabsId} tab="sketches" active={assetTab}>
        {sketches.length ? <AnimationCatalogueCards entries={sketches} selectedPreset={draft.preset} onSelect={selectCataloguePreset} onContextMenu={(event, preset, clip) => openCatalogueMenu(event, { label: clip.name, preset })} />
          : <p>No matching motion assets.</p>}
      </PaneTabPanel>
    </Pane>
    {menu && <StudioListContextMenu target={menu} restoreFocus={() => menu.opener.focus()} onClose={() => setMenu(undefined)}
      actions={[
        { label: "Rename", icon: "pencil", onClick: () => { setNewName(menu.label); setCatalogueError(""); setAction({ mode: "rename", target: menu }); } },
        { label: "Delete", icon: "trash", destructive: true, onClick: () => { setCatalogueError(""); setAction({ mode: "delete", target: menu }); } },
      ]} />}
    {action && <StudioDialog title={action.mode === "rename" ? "Rename motion asset" : "Delete motion asset?"}
      returnFocus={action.target.opener} closeDisabled={saving} onClose={() => setAction(undefined)}>
      {action.mode === "rename" ? <label className="motion-field">Name<TextInput value={newName} maxLength={100}
        onChange={event => setNewName(event.target.value)} /></label>
        : <p>{action.target.file ? `Move “${action.target.label}” to the Motion Assets Bin? You can restore it from the catalogue.`
          : `Remove “${action.target.label}” from the catalogue? You can restore built-in assets.`}</p>}
      {action.mode === "rename" && action.target.file?.preview && <p>The matching MP4 preview will be renamed to match.</p>}
      {catalogueError && <p role="alert">{catalogueError}</p>}
      <StudioDialogActions><button type="button" className="button-secondary" disabled={saving} onClick={() => setAction(undefined)}>Cancel</button>
        <button type="button" className="button-primary" disabled={saving} onClick={() => void commitCatalogueAction()}>{saving ? "Saving…" : action.mode === "rename" ? "Rename" : "Delete"}</button></StudioDialogActions>
    </StudioDialog>}
    {selectedVideo ? <MotionVideoWorkspace file={selectedVideo} active={active} poster={selectedVideoPoster} onPreviewReady={revealVideoPreview}
      onClose={() => { setVideoSelection(undefined); videoTile.current?.focus(); }}
      exportFeedback={movExport ? <div className="motion-actions">
        {"message" in movExport ? <p role="status" className="motion-feedback">{movExport.message}</p>
          : <p role="alert" className="motion-feedback">{movExport.error}</p>}
        {cancelExport ? <button type="button" className="button-secondary" onClick={cancelExport}>Cancel Export</button> : null}
      </div> : undefined} /> : null}
    <div className="motion-workspace" data-motion-ready={ready} inert={!ready || Boolean(selectedVideo)} aria-hidden={selectedVideo ? true : undefined}
      data-inactive={selectedVideo ? true : undefined}>
      <MotionPreviewPane id="motion-preview" previewRef={preview} active={animationActive} actions={<>
        <button type="button" className="button-secondary motion-reset-button" onClick={resetPreview}>
          <AcmIcon name="action.reset" scale="Regular-S" size={18} />Reset Preview
        </button>
        <button type="button" className="button-secondary" onClick={() => fileInput.current?.click()}>Open File</button>
        <button type="button" className="button-primary" onClick={() => downloadSource("project")}>Download Project</button>
        <input hidden ref={fileInput} type="file" accept=".svg,.json" onChange={openFile} />
      </>}>
        <MotionPreviewStage key={`${active}-${previewRevision}`} asset={previewAsset} geometry={previewModel?.preview ?? motionEffectPreview} onResize={changeAsset} onResizeDraft={setResizeDraft}
          renderedFrame={animationActive && "effect" in previewAsset && isVolumetricEffect(previewAsset.effect)
            ? <VolumetricFireballCanvas asset={previewAsset} frame={frame} playing={playback !== null} /> : undefined}
          artwork={"effect" in previewAsset ? <MotionEffectArtwork asset={previewAsset} frame={frame} />
            : <SketchArtwork asset={previewAsset} path={previewModel?.pathAt(frame) ?? ""} />} />
        <MotionPlaybackTransport playing={playback !== null} position={frame} duration={duration} label="Animation position"
          unitsPerSecond={motionFps} step={1} onToggle={togglePlayback} onSeek={value => { setPlayback(null); setPosition(value); }} />
      </MotionPreviewPane>
      <Pane label="Motion settings" side="right" width={312} collapsed={false} onCollapsedChange={() => {}} collapseIcon={null} collapsible={false} inspectorPopoverOwner
        trackClassName="motion-inspector" header={<h2>Settings</h2>}>
        <div className="motion-settings">
          <div className="motion-setting-group">
            <button type="button" className="button-secondary motion-reset-button" onClick={resetPreview}>
              <AcmIcon name="action.reset" scale="Regular-S" size={18} />Reset Settings
            </button>
          </div>
          {!sketch ? <div className="motion-setting-group" role="group" aria-label="Video export">
            <div className="media-preview-actions">
              {movAction}
              {animationActive ? <MediaFileDetailsButton name={asset.name} exportRows={[
                { label: "Container", value: "QuickTime (MOV)" },
                { label: "Video codec", value: "Apple ProRes 4444" },
                { label: "Dimensions", value: `${asset.width} × ${asset.height} px` },
                { label: "Duration", value: formatPlaybackTime(duration / motionFps) },
                { label: "Frame rate", value: `${motionFps} fps` },
                { label: "Transparency", value: "Alpha channel" },
                { label: "Audio", value: "Silent" },
              ]} /> : null}
            </div>
            {exportStatus}
          </div> : null}
          <div className="motion-setting-group" role="group" aria-label="Asset">
            <NameSetting key={previewRevision} name={asset.name} onChange={name => void renameSelectedPreset(name)} />
            <div className="motion-field-grid">
              <NumberSetting label="Width (px)" min={128} max={motionDimensionLimit(asset.height)} value={previewAsset.width} readOnly={resizeDraft !== null} onCommit={width => changeAsset({ width })} />
              <NumberSetting label="Height (px)" min={128} max={motionDimensionLimit(asset.width)} value={previewAsset.height} readOnly={resizeDraft !== null} onCommit={height => changeAsset({ height })} />
            </div>
          </div>
          {sketch ? <><div className="motion-setting-group" role="group" aria-label="Stroke">
            {animationActive ? <div className="motion-colour"><ColourPicker label="Stroke colour" value={sketch.colour}
              onChange={colour => { if (colour && /^#[a-f0-9]{6}$/i.test(colour)) changeAsset({ colour }); }} enableAlpha={false} allowClear={false} livePointerChanges liveHexChanges /></div> : null}
            <NumberSetting label="Thickness (px)" value={sketch.thickness} min={1} max={64} onCommit={thickness => changeAsset({ thickness })} />
          </div>
          <div className="motion-setting-group motion-field-grid" role="group" aria-label="Timing">
            <NumberSetting label="Draw time (s)" value={sketch.drawFrames / motionFps} min={0.1} max={(300 - sketch.holdFrames) / motionFps} step={0.1}
              onCommit={value => changeTiming(Math.round(value * motionFps), sketch.holdFrames)} />
            <NumberSetting label="Hold time (s)" value={sketch.holdFrames / motionFps} min={0.1} max={(300 - sketch.drawFrames) / motionFps} step={0.1}
              onCommit={value => changeTiming(sketch.drawFrames, Math.round(value * motionFps))} />
          </div></> : <div className="motion-setting-group" role="group" aria-label="Timing">
            <NumberSetting label="Duration (s)" value={duration / motionFps} min={motionEffectDuration.min / motionFps} max={durationLimit / motionFps} step={0.1}
              onCommit={value => changeEffectDuration(Math.round(value * motionFps))} />
          </div>}
          {fireballSettings && <div className="motion-setting-group" role="group" aria-label="Fireball">
            {softFadeControls.map(({ key, label, min, max }) => {
              const value = fireballSettings[key];
              const readout = key === "fadeIn" || key === "fadeOut"
                ? `${value}% · ${formatPlaybackTime(duration / motionFps * value / 100)}` : `${value}%`;
              return <label key={key} className="motion-field">
                <span className="motion-range-label">{label}<span aria-hidden="true">{readout}</span></span>
                <RangeControl aria-label={label} min={min} max={max} step={1} value={value} data-committed-value={value}
                  aria-valuetext={readout} tooltipText={readout}
                  onChange={event => changeAsset({ softFade: { ...fireballSettings, [key]: event.target.valueAsNumber } })} />
              </label>;
            })}
          </div>}
          {sketch ? <div className="motion-setting-group">
            <h3>Export</h3>
            <div className="motion-actions">
              <button type="button" className="button-secondary" onClick={() => downloadSource("svg")}>SVG</button>
              <button type="button" className="button-secondary" onClick={() => downloadSource("lottie")}>Lottie JSON</button>
              {movAction}
            </div>
            {exportStatus}
          </div> : null}
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
  </div>;
}
