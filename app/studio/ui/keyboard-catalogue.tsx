"use client";

import { useId, useReducer, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { keyboardKeys, keyboardAsset, createKeyboardSvg, type KeyboardKeyGroup, type KeyboardKeyId, type KeyboardMode, type KeyboardPlatform } from "@acm/icons/keyboard";
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
  platform: KeyboardPlatform | "all";
  mode: KeyboardMode;
  height: number;
  appearance: KeyboardAppearance;
  resetRevision: number;
  status: string;
};
type KeyboardCatalogueAction =
  | { type: "select-key"; value: KeyboardKeyId }
  | { type: "set-platform"; value: KeyboardPlatform | "all" }
  | { type: "set-mode"; value: KeyboardMode }
  | { type: "set-height"; value: number }
  | { type: "set-preset"; value: string }
  | { type: "update-appearance"; changes: Partial<KeyboardAppearance> }
  | { type: "set-symbol-colour"; value: string }
  | { type: "set-border-match"; value: boolean }
  | { type: "reset-appearance" }
  | { type: "set-status"; value: string };

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
      <input id={id} type="text" value={draft} disabled={disabled} spellCheck={false} maxLength={7} aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} onChange={(event) => { const next = event.target.value; setDraft(next); if (/^#[0-9A-Fa-f]{6}$/.test(next)) onChange(next.toUpperCase()); }} onBlur={() => setDraft(value)} />
    </div>
    {!valid && <small id={`${id}-error`}>Use # followed by six hex digits.</small>}
  </div>;
}

export function KeyboardCatalogue() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<KeyboardKeyGroup | "all">("all");
  const [state, dispatch] = useReducer(
    (currentState: KeyboardCatalogueState, action: KeyboardCatalogueAction) => keyboardCatalogueReducer(currentState, action) as KeyboardCatalogueState,
    createKeyboardCatalogueState() as KeyboardCatalogueState,
  );
  const { selected, platform, mode, height, appearance, resetRevision, status } = state;
  const keys = keyboardKeys.filter((key) => platform === "all" || key.platforms.includes(platform));
  const groups = [...new Set(keys.map((key) => key.group))];
  const visibleKeys = keys.filter((key) => (group === "all" || key.group === group) && `${key.label} ${key.id} ${key.note}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = visibleKeys.find((key) => key.id === selected) ?? visibleKeys[0] ?? keys.find((key) => key.id === selected) ?? keys[0];
  const asset = keyboardAsset(current.id, { mode });
  const width = Math.round(height * asset.width / asset.height);
  const { colour, borderColour, matchBorder, fillColour, transparent, dark } = appearance;
  const resolvedAppearance = { colour, borderColour: matchBorder ? colour : borderColour, fillColour: transparent ? "none" : fillColour };
  const preset = getKeyboardAppearancePresetName(appearance);

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
      const svg = createKeyboardSvg(key.id, { mode, height, ...resolvedAppearance });
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await createSvgPng(svg, width, height);
      downloadIconFile(blob, `uk-${key.id}-${mode}-${height}px-${colour.slice(1).toLowerCase()}${mode === "keycap" ? `-${resolvedAppearance.borderColour.slice(1).toLowerCase()}-${transparent ? "clear" : fillColour.slice(1).toLowerCase()}` : ""}.${format}`);
      dispatch({ type: "set-status", value: `${key.label} ${format.toUpperCase()} download started.` });
    } catch {
      dispatch({ type: "set-status", value: `Could not prepare the ${format.toUpperCase()} download. Try again.` });
    }
  }

  return <section className="kb-catalogue" aria-label="UK Keyboard Collection">
    <div className="kb-intro"><div><p className="rl-eyebrow">KEYBOARD COLLECTION</p><h2>UK Mac and Windows keys.</h2></div><p>Common UK ISO legends, full-size key families and platform-specific keys.</p></div>
    <div className="kb-toolbar">
      <label>Platform<select value={platform} onChange={(event) => {
        const value = event.target.value as KeyboardPlatform | "all";
        if (group !== "all" && !keyboardKeys.some((key) => key.group === group && (value === "all" || key.platforms.includes(value)))) setGroup("all");
        dispatch({ type: "set-platform", value });
      }}><option value="all">Mac and Windows</option><option value="mac">Mac</option><option value="windows">Windows</option></select></label>
      <fieldset><legend>Artwork</legend><label><input type="radio" name="key-artwork" value="keycap" checked={mode === "keycap"} onChange={() => dispatch({ type: "set-mode", value: "keycap" })} />Keycaps</label><label><input type="radio" name="key-artwork" value="symbol" checked={mode === "symbol"} onChange={() => dispatch({ type: "set-mode", value: "symbol" })} />Symbols</label></fieldset>
      <label className="kb-dark-toggle"><input type="checkbox" checked={dark} onChange={(event) => updateAppearance({ dark: event.target.checked })} />Dark Specimens</label>
      <label>Section<select value={group} onChange={(event) => setGroup(event.target.value as KeyboardKeyGroup | "all")}><option value="all">All sections</option>{groups.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <label className="kb-search">Find a key<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or legend" /></label>
      <span className="kb-count">{visibleKeys.length} of {keys.length} keys</span>
    </div>
    <div className="kb-workspace">
      <div className={"kb-grid" + (dark ? " kb-dark" : "")} aria-label="Keyboard Assets">
        {visibleKeys.length ? visibleKeys.map((key) => <button type="button" className="kb-card" key={key.id} aria-pressed={current.id === key.id} onClick={() => dispatch({ type: "select-key", value: key.id })}>
          <span className="kb-card-art"><AcmKeycap name={key.id} mode={mode} {...resolvedAppearance} height={mode === "keycap" && (key.shape === "iso" || key.shape === "tall" || key.group === "Mac function row") ? 96 : 80} /></span>
          <strong>{key.label}</strong><span>{key.platforms.length === 2 ? "Mac + Windows" : key.platforms[0] === "mac" ? "Mac" : "Windows"}</span>
        </button>) : <p className="kb-empty">No keys match this search.</p>}
      </div>
      <aside className="kb-inspector" aria-label="Keyboard Asset Inspector">
        <p className="rl-eyebrow">SELECTED ASSET</p><h2>{current.label}</h2>
        <div className={"kb-large" + (dark ? " kb-dark" : "")} style={{ color: colour }}><AcmKeycap name={current.id} mode={mode} {...resolvedAppearance} height={128} /></div>
        <p>{current.note}</p>
        <div className="kb-export-settings">
          <label>Export Height<select value={height} onChange={(event) => dispatch({ type: "set-height", value: Number(event.target.value) })}>{[64, 128, 256, 512].map((size) => <option value={size} key={size}>{size}px</option>)}</select></label>
          <div className="kb-preset-row">
            <label>Preset<select value={preset} onChange={(event) => applyPreset(event.target.value)}><option value="default">Default</option><option value="dark">Dark</option><option value="outline">Outline</option><option value="custom" disabled>Custom</option></select></label>
            <button className="kb-reset-default" type="button" onClick={resetAppearance}><AcmIcon name="action.reset" size={18} />Reset to Default</button>
          </div>
          <ColourControl key={getKeyboardColourControlKey("symbol", resetRevision)} label="Symbol Colour" value={colour} onChange={(value) => dispatch({ type: "set-symbol-colour", value })} />
          {mode === "keycap" && <>
            <label className="kb-option"><input type="checkbox" checked={transparent} onChange={(event) => updateAppearance({ transparent: event.target.checked })} />Transparent Fill</label>
            <ColourControl key={getKeyboardColourControlKey("fill", resetRevision)} label="Fill Colour" value={fillColour} disabled={transparent} onChange={(value) => updateAppearance({ fillColour: value })} />
            <label className="kb-option"><input type="checkbox" checked={matchBorder} onChange={(event) => dispatch({ type: "set-border-match", value: event.target.checked })} />Border Matches Symbol</label>
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
