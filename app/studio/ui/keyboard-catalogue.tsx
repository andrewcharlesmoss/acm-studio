"use client";

import { SearchInput, SelectControl, TextInput } from "../controls/native-fields";
import { CheckboxControl } from "../controls/checkbox-control";
import { RadioGroup } from "../controls/radio-group";

import { useId, useReducer, useRef, useState } from "react";
import { iconMetadata } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { keyboardKeys, keyboardAsset, createKeyboardSvg, type KeyboardKeyGroup, type KeyboardKeyId, type KeyboardMode, type KeyboardPlatform } from "@acm/icons/keyboard";
import { createFullKeyboardSvg, fullKeyboardLayout, windowsLayoutKeyAsset } from "@acm/icons/keyboard/layout";
import { AcmKeycap } from "@acm/icons/keyboard/react";
import { createSvgPng, downloadIconFile } from "./icon-download.mjs";
import { createKeyboardCatalogueState, getKeyboardAppearancePresetName, getKeyboardColourControlKey, keyboardCatalogueReducer } from "./keyboard-appearance.mjs";
import "./keyboard-catalogue.css";

type KeyboardAppearance = {
  colour: string;
  borderColour: string;
  fillColour: string;
  matchBorder: boolean;
  transparent: boolean;
  dark: boolean;
};
type KeyboardCatalogueState = {
  selected: KeyboardKeyId;
  windowsLayout: boolean;
  platform: KeyboardPlatform | "all";
  mode: KeyboardMode;
  height: number;
  appearance: KeyboardAppearance;
  resetRevision: number;
  status: string;
};
type KeyboardCatalogueAction =
  | { type: "select-key"; value: KeyboardKeyId; windowsLayout?: boolean }
  | { type: "set-platform"; value: KeyboardPlatform | "all" }
  | { type: "set-mode"; value: KeyboardMode }
  | { type: "set-dark"; value: boolean }
  | { type: "set-height"; value: number }
  | { type: "set-preset"; value: string }
  | { type: "update-appearance"; changes: Partial<KeyboardAppearance> }
  | { type: "set-symbol-colour"; value: string }
  | { type: "set-border-match"; value: boolean }
  | { type: "reset-appearance" }
  | { type: "set-status"; value: string };

function keyboardLegend(key: (typeof keyboardKeys)[number], windowsLayout: boolean) {
  return windowsLayout && key.id === "keypad-multiply" ? "*" : key.label;
}

function ColourControl({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setDraft(value);
  }
  const valid = /^#[0-9A-Fa-f]{6}$/.test(draft);
  return <div className="kb-colour-control">
    <label htmlFor={id}>{label}</label>
    <div className="kb-colour-inputs">
      <input type="color" aria-label={`${label} Picker`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value.toUpperCase())} />
      <TextInput id={id} type="text" value={draft} disabled={disabled} spellCheck={false} maxLength={7} aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} onChange={(event) => { const next = event.target.value; setDraft(next); if (/^#[0-9A-Fa-f]{6}$/.test(next)) onChange(next.toUpperCase()); }} onBlur={() => setDraft(value)} />
    </div>
    {!valid && <small id={`${id}-error`}>Use # followed by six hex digits.</small>}
  </div>;
}

export function KeyboardCatalogue() {
  const [keyboardStatus, setKeyboardStatus] = useState("");
  const [keyboardPlatform, setKeyboardPlatform] = useState<KeyboardPlatform>("mac");
  const [query, setQuery] = useState("");
  const [focusedKeyIndex, setFocusedKeyIndex] = useState(0);
  const keyboardKeyRefs = useRef<(SVGElement | null)[]>([]);
  const [group, setGroup] = useState<KeyboardKeyGroup | "all">("all");
  const [state, dispatch] = useReducer(
    (currentState: KeyboardCatalogueState, action: KeyboardCatalogueAction) => keyboardCatalogueReducer(currentState, action) as KeyboardCatalogueState,
    createKeyboardCatalogueState() as KeyboardCatalogueState,
  );
  const { selected, windowsLayout, platform, mode, height, appearance, resetRevision, status } = state;
  const keys = keyboardKeys.filter((key) => platform === "all" || key.platforms.includes(platform));
  const groups = [...new Set(keys.map((key) => key.group))];
  const visibleKeys = keys.filter((key) => (group === "all" || key.group === group) && `${key.label} ${key.id} ${key.note} ${key.aliases?.join(" ") ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = keyboardKeys.find((key) => key.id === selected) ?? keys[0];
  const asset = keyboardAsset(current.id, { mode });
  const artwork = iconMetadata[asset.key.icon];
  const { colour, borderColour, matchBorder, fillColour, transparent, dark } = appearance;
  const resolvedAppearance = { colour, borderColour: matchBorder ? colour : borderColour, fillColour: transparent ? "none" : fillColour };
  const layoutAsset = windowsLayout ? windowsLayoutKeyAsset(current.id, { height, mode, ...resolvedAppearance }) : undefined;
  const width = layoutAsset?.width ?? Math.round(height * asset.width / asset.height);
  const preset = getKeyboardAppearancePresetName(appearance);
  const keyboardSvg = createFullKeyboardSvg(keyboardPlatform, { height: 256, ...resolvedAppearance });
  const keyboardLayout = fullKeyboardLayout(keyboardPlatform);

  function applyPreset(value: string) {
    dispatch({ type: "set-preset", value });
  }

  function updateAppearance(changes: Partial<KeyboardAppearance>) {
    dispatch({ type: "update-appearance", changes });
  }

  function resetAppearance() {
    dispatch({ type: "reset-appearance" });
  }

  async function download(format: "svg" | "png") {
    const key = current;
    try {
      const svg = layoutAsset?.svg ?? createKeyboardSvg(key.id, { mode, height, ...resolvedAppearance });
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await createSvgPng(svg, width, height);
      downloadIconFile(blob, `uk-${windowsLayout ? "windows-layout-" : ""}${key.id}-${mode}-${height}px-${colour.slice(1).toLowerCase()}${mode === "keycap" ? `-${resolvedAppearance.borderColour.slice(1).toLowerCase()}-${transparent ? "clear" : fillColour.slice(1).toLowerCase()}` : ""}.${format}`);
      dispatch({ type: "set-status", value: `${key.label} ${format.toUpperCase()} download started.` });
    } catch {
      dispatch({ type: "set-status", value: `Could not prepare the ${format.toUpperCase()} download. Try again.` });
    }
  }

  async function downloadKeyboard(format: "svg" | "png") {
    const exportHeight = 384;
    try {
      const svg = createFullKeyboardSvg(keyboardPlatform, { height: exportHeight, ...resolvedAppearance });
      const exportWidth = Math.round(exportHeight * keyboardLayout.width / keyboardLayout.height);
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await createSvgPng(svg, exportWidth, exportHeight);
      downloadIconFile(blob, `uk-${keyboardPlatform}-full-keyboard.${format}`);
      setKeyboardStatus(`Full keyboard ${format.toUpperCase()} download started.`);
    } catch {
      setKeyboardStatus(`Could not prepare the full keyboard ${format.toUpperCase()} download. Try again.`);
    }
  }

  return <section className="kb-catalogue" aria-label="UK Keyboard Collection">
    <div className="kb-intro"><div><p className="rl-eyebrow">KEYBOARD COLLECTION</p><h2>UK Mac and Windows keys.</h2></div><p>Common UK ISO legends, full-size key families and platform-specific keys.</p></div>
    <section className="kb-full-keyboard" aria-label="Full-size keyboards">
      <div className="kb-full-header"><div><h3>Full-size keyboards</h3><p>Illustrative UK ISO layouts with numeric keypads. Hardware and legends vary.</p></div>
        <RadioGroup label="Platform" hideLabel presentation="buttons" value={keyboardPlatform} onChange={value => { setKeyboardPlatform(value as KeyboardPlatform); setFocusedKeyIndex(0); if (windowsLayout) dispatch({ type: "select-key", value: selected }); }} options={[
          { value: "mac", label: <AcmIcon name="brand.apple" size={24} />, accessibleName: "Mac", title: "Mac" },
          { value: "windows", label: <AcmIcon name="keyboard.windows" size={24} />, accessibleName: "Windows", title: "Windows" },
        ]} /></div>
      <div className={"kb-full-art" + (dark && transparent ? " kb-dark-transparent" : "")}>
        <div className="kb-full-surface">
          {/* This self-contained SVG is generated from validated local catalogue geometry. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/svg+xml,${encodeURIComponent(keyboardSvg)}`} alt={`Illustrative full-size UK ${keyboardPlatform === "mac" ? "Mac" : "Windows"} keyboard`} />
          <svg className="kb-full-hit-areas" viewBox={`0 0 ${keyboardLayout.width} ${keyboardLayout.height}`} role="group" aria-label="Select a keyboard key" onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const origin = keyboardLayout.keys[focusedKeyIndex];
            const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
            const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
            const centre = (key: typeof origin) => ({ x: key.x + key.width / 2, y: key.y + key.height / 2 });
            const from = centre(origin);
            let next = focusedKeyIndex, best = Infinity;
            keyboardLayout.keys.forEach((key, index) => {
              const to = centre(key);
              const primary = (horizontal ? to.x - from.x : to.y - from.y) * direction;
              const cross = Math.abs(horizontal ? to.y - from.y : to.x - from.x);
              if (primary <= 0) return;
              const score = primary + cross * 2;
              if (score < best) { best = score; next = index; }
            });
            if (next !== focusedKeyIndex) { setFocusedKeyIndex(next); keyboardKeyRefs.current[next]?.focus(); }
          }}>
            {keyboardLayout.keys.map((key, index) => {
              const info = keyboardKeys.find(item => item.id === key.id)!;
              const select = () => dispatch({ type: "select-key", value: key.id, windowsLayout: keyboardPlatform === "windows" });
              const right = key.width - 3, bottom = key.height - 3, radius = 7;
              const notch = Math.round(key.width * 0.32), step = Math.round(key.height * 0.44);
              const corner = keyboardPlatform === "mac" ? ({ "mac-escape": "tl", "mac-f19": "tr", "fn-globe": "bl", "mac-keypad-enter": "br" } as Record<string, string>)[key.id] : undefined;
              const tl = corner === "tl" ? 17 : radius, tr = corner === "tr" ? 17 : radius;
              const bl = corner === "bl" ? 17 : radius, br = corner === "br" ? 17 : radius;
              const outline = key.outline ?? (key.id === "enter"
                ? `M 10 3 H ${right - radius} Q ${right} 3 ${right} 10 V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${notch + radius} Q ${notch} ${bottom} ${notch} ${bottom - radius} V ${step + 3} Q ${notch} ${step} ${notch - 3} ${step} H 10 Q 3 ${step} 3 ${step - radius} V 10 Q 3 3 10 3 Z`
                : `M ${3 + tl} 3 H ${right - tr} Q ${right} 3 ${right} ${3 + tr} V ${bottom - br} Q ${right} ${bottom} ${right - br} ${bottom} H ${3 + bl} Q 3 ${bottom} 3 ${bottom - bl} V ${3 + tl} Q 3 3 ${3 + tl} 3 Z`);
              return <path key={`${index}-${key.id}`} ref={element => { keyboardKeyRefs.current[index] = element; }} className="kb-full-key-hit" transform={`translate(${key.x} ${key.y})`} d={outline} role="button" aria-label={keyboardLegend(info, keyboardPlatform === "windows")} aria-pressed={selected === key.id && (keyboardPlatform !== "windows" || windowsLayout)} tabIndex={index === focusedKeyIndex ? 0 : -1} onPointerEnter={event => { if (event.pointerType !== "touch") select(); }} onClick={select} onFocus={() => { setFocusedKeyIndex(index); select(); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }} />;
            })}
          </svg>
        </div>
      </div>
      <div className="kb-full-actions"><button type="button" onClick={() => void downloadKeyboard("svg")}><AcmIcon name="action.download" size={18} />Download SVG</button><button type="button" onClick={() => void downloadKeyboard("png")}><AcmIcon name="action.download" size={18} />Download PNG</button></div>
      <p role="status" aria-live="polite">{keyboardStatus}</p>
      <p>Keys use the colours selected below. The case is silver. Exports are transparent outside the keyboard.</p>
    </section>
    <div className="kb-toolbar">
      <label>Platform<SelectControl value={platform} onChange={(event) => {
        const value = event.target.value as KeyboardPlatform | "all";
        if (group !== "all" && !keyboardKeys.some((key) => key.group === group && (value === "all" || key.platforms.includes(value)))) setGroup("all");
        dispatch({ type: "set-platform", value });
      }}><option value="all">Mac and Windows</option><option value="mac">Mac</option><option value="windows">Windows</option></SelectControl></label>
      <RadioGroup label="Artwork" value={mode} options={[{ value: "keycap", label: "Keycaps" }, { value: "symbol", label: "Symbols" }]} onChange={value => dispatch({ type: "set-mode", value: value as typeof mode })} />
      <CheckboxControl className="kb-dark-toggle" label="Dark Specimens" checked={dark} onChange={dark => dispatch({ type: "set-dark", value: dark })} />
      <label>Section<SelectControl value={group} onChange={(event) => setGroup(event.target.value as KeyboardKeyGroup | "all")}><option value="all">All sections</option>{groups.map((item) => <option value={item} key={item}>{item}</option>)}</SelectControl></label>
      <label className="kb-search">Find a key<SearchInput  value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or legend" /></label>
      <span className="kb-count">{visibleKeys.length} of {keys.length} keys</span>
    </div>
    <div className="kb-workspace">
      <div className="kb-grid" aria-label="Keyboard Assets">
        {visibleKeys.length ? visibleKeys.map((key) => <button type="button" className={"kb-card" + (key.shape === "spacebar" ? " kb-card--spacebar" : key.shape === "keypad-zero" ? " kb-card--keypad-zero" : "")} key={key.id} aria-pressed={!windowsLayout && current.id === key.id} onClick={() => dispatch({ type: "select-key", value: key.id })}>
          <span className={"kb-card-art" + (dark && (mode === "symbol" || transparent) ? " kb-symbol-dark" : "")}><AcmKeycap name={key.id} mode={mode} {...resolvedAppearance} height={mode === "keycap" && (key.shape === "iso" || key.shape === "tall") ? 112 : 96} /></span>
          <strong>{key.label}</strong><span>{key.platforms.length === 2 ? "Mac + Windows" : key.platforms[0] === "mac" ? "Mac" : "Windows"}</span>
        </button>) : <p className="kb-empty">No keys match this search.</p>}
      </div>
      <aside className="kb-inspector" aria-label="Keyboard Asset Inspector">
        <p className="rl-eyebrow">SELECTED ASSET</p><h2>{keyboardLegend(current, windowsLayout)}</h2>
        <div className={"kb-large" + (dark && (mode === "symbol" || transparent) ? " kb-symbol-dark" : "")} style={{ color: colour }}>
          {layoutAsset ? (
            // The shared renderer supplies the same self-contained SVG for preview and download.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`Windows keyboard: ${keyboardLegend(current, windowsLayout)}`} src={`data:image/svg+xml,${encodeURIComponent(layoutAsset.svg)}`} width={128 * width / height} />
          ) : <AcmKeycap name={current.id} mode={mode} {...resolvedAppearance} height={128} />}
        </div>
        <p>{windowsLayout && current.id === "keypad-multiply" ? "Numeric keypad multiply." : current.note}</p>
        <details className="kb-artwork-info">
          <summary>Artwork provenance and licensing</summary>
          {windowsLayout && <p>Windows layout artwork by ACM, based on the supplied Surface Keyboard photo.</p>}
          <p>{artwork.provenance}</p>
          <code>{windowsLayout ? "acm-studio/packages/acm-icons/src/keyboard-layout.js" : `acm-studio/packages/acm-icons/masters/${asset.key.icon}.svg`}</code>
          {artwork.licenceNotice && <details>
            <summary>Full licence notice</summary>
            <pre>{artwork.licenceNotice}</pre>
          </details>}
        </details>
        <div className="kb-export-settings">
          <label>Export Height<SelectControl value={height} onChange={(event) => dispatch({ type: "set-height", value: Number(event.target.value) })}>{[64, 128, 256, 512].map((size) => <option value={size} key={size}>{size}px</option>)}</SelectControl></label>
          <div className="kb-preset-row">
            <label>Preset<SelectControl value={preset} onChange={(event) => applyPreset(event.target.value)}><option value="default">Default</option><option value="dark">Dark</option><option value="outline">Outline</option><option value="custom" disabled>Custom</option></SelectControl></label>
            <button className="kb-reset-default" type="button" onClick={resetAppearance}><AcmIcon name="action.reset" size={18} />Reset to Default</button>
          </div>
          <ColourControl key={getKeyboardColourControlKey("symbol", resetRevision)} label="Symbol Colour" value={colour} onChange={(value) => dispatch({ type: "set-symbol-colour", value })} />
          {mode === "keycap" && <>
            <CheckboxControl className="kb-option" checked={transparent} onChange={checked => updateAppearance({ transparent: checked })} label={<>Transparent Fill</>} />
            <ColourControl key={getKeyboardColourControlKey("fill", resetRevision)} label="Fill Colour" value={fillColour} disabled={transparent} onChange={(value) => updateAppearance({ fillColour: value })} />
            <CheckboxControl className="kb-option" checked={matchBorder} onChange={checked => dispatch({ type: "set-border-match", value: checked })} label={<>Border Matches Symbol</>} />
            <ColourControl key={getKeyboardColourControlKey("border", resetRevision)} label="Border Colour" value={resolvedAppearance.borderColour} disabled={matchBorder} onChange={(value) => updateAppearance({ borderColour: value })} />
          </>}
        </div>
        <p className="kb-dimensions">{width} × {height}px · {mode === "symbol" || transparent ? "transparent background" : "transparent outside keycap"}</p>
        <div className="kb-downloads"><button type="button" onClick={() => void download("svg")}><AcmIcon name="action.download" size={18} />Download SVG</button><button type="button" onClick={() => void download("png")}><AcmIcon name="action.download" size={18} />Download PNG</button></div>
        <p className="kb-status" role="status" aria-live="polite">{status}</p>
        <p className="kb-export-note">Lettering uses Inter outlines. SVG and PNG downloads preserve these colours and need no installed fonts.</p>
      </aside>
    </div>
    <p className="kb-footnote">This collection covers the common full-size UK ISO key set. Laptop layouts, manufacturer-specific legends and optional hardware vary. Mac function-row symbols are representative; F1–F12 remain available as separate keys. Keycap proportions are illustrative.</p>
  </section>;
}
