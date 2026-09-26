"use client";

import { useId, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { keyboardKeys, keyboardAsset, createKeyboardSvg, type KeyboardKeyId, type KeyboardMode, type KeyboardPlatform } from "@acm/icons/keyboard";
import { AcmKeycap } from "@acm/icons/keyboard/react";
import { createSvgPng, downloadIconFile } from "./icon-download.mjs";
import "./keyboard-catalogue.css";

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
  const [selected, setSelected] = useState<KeyboardKeyId>("command");
  const [platform, setPlatform] = useState<KeyboardPlatform | "all">("all");
  const [mode, setMode] = useState<KeyboardMode>("keycap");
  const [dark, setDark] = useState(false);
  const [height, setHeight] = useState(128);
  const [colour, setColour] = useState("#1C1C1E");
  const [borderColour, setBorderColour] = useState("#1C1C1E");
  const [matchBorder, setMatchBorder] = useState(true);
  const [fillColour, setFillColour] = useState("#F2F2F7");
  const [transparent, setTransparent] = useState(true);
  const [status, setStatus] = useState("");
  const keys = keyboardKeys.filter((key) => platform === "all" || key.platforms.includes(platform));
  const current = keys.find((key) => key.id === selected) ?? keys[0];
  const asset = keyboardAsset(current.id, { mode });
  const width = Math.round(height * asset.width / asset.height);
  const appearance = { colour, borderColour: matchBorder ? colour : borderColour, fillColour: transparent ? "none" : fillColour };
  const preset = transparent && colour === "#1C1C1E" && matchBorder ? "outline" : !transparent && matchBorder && colour === "#1C1C1E" && fillColour === "#F2F2F7" ? "light" : !transparent && matchBorder && colour === "#F2F2F7" && fillColour === "#1C1C1E" ? "dark" : "custom";

  function applyPreset(value: string) {
    if (value === "custom") return;
    setColour(value === "dark" ? "#F2F2F7" : "#1C1C1E");
    setFillColour(value === "dark" ? "#1C1C1E" : "#F2F2F7");
    setMatchBorder(true);
    setTransparent(value === "outline");
    setDark(value === "dark");
    setStatus("");
  }

  function changePlatform(value: KeyboardPlatform | "all") {
    setPlatform(value);
    setStatus("");
  }

  async function download(format: "svg" | "png") {
    const key = current;
    try {
      const svg = createKeyboardSvg(key.id, { mode, height, ...appearance });
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await createSvgPng(svg, width, height);
      downloadIconFile(blob, `uk-${key.id}-${mode}-${height}px-${colour.slice(1).toLowerCase()}${mode === "keycap" ? `-${appearance.borderColour.slice(1).toLowerCase()}-${transparent ? "clear" : fillColour.slice(1).toLowerCase()}` : ""}.${format}`);
      setStatus(`${key.label} ${format.toUpperCase()} download started.`);
    } catch {
      setStatus(`Could not prepare the ${format.toUpperCase()} download. Try again.`);
    }
  }

  return <section className="kb-catalogue" aria-label="UK Keyboard Preview">
    <div className="kb-intro"><div><p className="rl-eyebrow">KEYBOARD COLLECTION</p><h2>Eight keys to set the direction.</h2></div><p>UK Mac and Windows · first sample<br />Review the style before the full keyboard set.</p></div>
    <div className="kb-toolbar">
      <label>Platform<select value={platform} onChange={(event) => changePlatform(event.target.value as KeyboardPlatform | "all")}><option value="all">Mac and Windows</option><option value="mac">Mac</option><option value="windows">Windows</option></select></label>
      <fieldset><legend>Artwork</legend><label><input type="radio" name="key-artwork" value="keycap" checked={mode === "keycap"} onChange={() => { setMode("keycap"); setStatus(""); }} />Keycaps</label><label><input type="radio" name="key-artwork" value="symbol" checked={mode === "symbol"} onChange={() => { setMode("symbol"); setStatus(""); }} />Symbols</label></fieldset>
      <label className="kb-dark-toggle"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label>
      <span className="kb-count">{keys.length} sample keys</span>
    </div>
    <div className="kb-workspace">
      <div className={"kb-grid" + (dark ? " kb-dark" : "")} aria-label="Keyboard Assets">
        {keys.map((key) => <button type="button" className="kb-card" key={key.id} aria-pressed={current.id === key.id} onClick={() => { setSelected(key.id); setStatus(""); }}>
          <span className="kb-card-art"><AcmKeycap name={key.id} mode={mode} {...appearance} height={key.shape === "iso" && mode === "keycap" ? 96 : 64} /></span>
          <strong>{key.label}</strong><span>{key.platforms.length === 2 ? "Mac + Windows" : key.platforms[0] === "mac" ? "Mac" : "Windows"}</span>
        </button>)}
      </div>
      <aside className="kb-inspector" aria-label="Keyboard Asset Inspector">
        <p className="rl-eyebrow">SELECTED ASSET</p><h2>{current.label}</h2>
        <div className={"kb-large" + (dark ? " kb-dark" : "")} style={{ color: colour }}><AcmKeycap name={current.id} mode={mode} {...appearance} height={128} /></div>
        <p>{current.note}</p>
        <div className="kb-export-settings">
          <label>Export Height<select value={height} onChange={(event) => { setHeight(Number(event.target.value)); setStatus(""); }}>{[64, 128, 256, 512].map((size) => <option value={size} key={size}>{size}px</option>)}</select></label>
          <label>Preset<select value={preset} onChange={(event) => applyPreset(event.target.value)}><option value="outline">Outline</option><option value="light">Light</option><option value="dark">Dark</option><option value="custom" disabled>Custom</option></select></label>
          <ColourControl label="Symbol Colour" value={colour} onChange={(value) => { setColour(value); setStatus(""); }} />
          {mode === "keycap" && <>
            <label className="kb-option"><input type="checkbox" checked={transparent} onChange={(event) => { setTransparent(event.target.checked); setStatus(""); }} />Transparent Fill</label>
            <ColourControl label="Fill Colour" value={fillColour} disabled={transparent} onChange={(value) => { setFillColour(value); setStatus(""); }} />
            <label className="kb-option"><input type="checkbox" checked={matchBorder} onChange={(event) => { setMatchBorder(event.target.checked); setBorderColour(colour); setStatus(""); }} />Border Matches Symbol</label>
            <ColourControl label="Border Colour" value={appearance.borderColour} disabled={matchBorder} onChange={(value) => { setBorderColour(value); setStatus(""); }} />
          </>}
        </div>
        <p className="kb-dimensions">{width} × {height}px · {mode === "symbol" || transparent ? "transparent background" : "transparent outside keycap"}</p>
        <div className="kb-downloads"><button type="button" onClick={() => void download("svg")}><AcmIcon name="action.download" size={18} />Download SVG</button><button type="button" onClick={() => void download("png")}><AcmIcon name="action.download" size={18} />Download PNG</button></div>
        <p className="kb-status" role="status" aria-live="polite">{status}</p>
        <p className="kb-export-note">Lettering uses Inter outlines. SVG and PNG downloads preserve these colours and need no installed fonts.</p>
      </aside>
    </div>
    <p className="kb-footnote">This is a style preview, not the complete key inventory. Shared keys use the same artwork; platform-specific modifiers stay distinct. Keycap proportions are illustrative.</p>
  </section>;
}
