"use client";

import { useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { keyboardKeys, keyboardAsset, createKeyboardSvg, type KeyboardKeyId, type KeyboardMode, type KeyboardPlatform } from "@acm/icons/keyboard";
import { AcmKeycap } from "@acm/icons/keyboard/react";
import { createSvgPng, downloadIconFile } from "./icon-download.mjs";
import "./keyboard-catalogue.css";

export function KeyboardCatalogue() {
  const [selected, setSelected] = useState<KeyboardKeyId>("command");
  const [platform, setPlatform] = useState<KeyboardPlatform | "all">("all");
  const [mode, setMode] = useState<KeyboardMode>("keycap");
  const [dark, setDark] = useState(false);
  const [height, setHeight] = useState(128);
  const [colour, setColour] = useState("#1C1C1E");
  const [status, setStatus] = useState("");
  const keys = keyboardKeys.filter((key) => platform === "all" || key.platforms.includes(platform));
  const current = keys.find((key) => key.id === selected) ?? keys[0];
  const asset = keyboardAsset(current.id, { mode });
  const width = Math.round(height * asset.width / asset.height);

  function changePlatform(value: KeyboardPlatform | "all") {
    setPlatform(value);
    setStatus("");
  }

  async function download(format: "svg" | "png") {
    const key = current;
    try {
      const svg = createKeyboardSvg(key.id, { mode, height, colour });
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await createSvgPng(svg, width, height);
      downloadIconFile(blob, `uk-${key.id}-${mode}-${height}px-${colour.slice(1).toLowerCase()}.${format}`);
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
          <span className="kb-card-art"><AcmKeycap name={key.id} mode={mode} height={key.shape === "iso" && mode === "keycap" ? 96 : 64} /></span>
          <strong>{key.label}</strong><span>{key.platforms.length === 2 ? "Mac + Windows" : key.platforms[0] === "mac" ? "Mac" : "Windows"}</span>
        </button>)}
      </div>
      <aside className="kb-inspector" aria-label="Keyboard Asset Inspector">
        <p className="rl-eyebrow">SELECTED ASSET</p><h2>{current.label}</h2>
        <div className={"kb-large" + (colour === "#F2F2F7" ? " kb-dark" : "")} style={{ color: colour }}><AcmKeycap name={current.id} mode={mode} height={128} /></div>
        <p>{current.note}</p>
        <div className="kb-export-settings">
          <label>Export Height<select value={height} onChange={(event) => { setHeight(Number(event.target.value)); setStatus(""); }}>{[64, 128, 256, 512].map((size) => <option value={size} key={size}>{size}px</option>)}</select></label>
          <label>Artwork Colour<select value={colour} onChange={(event) => { setColour(event.target.value); setStatus(""); }}><option value="#1C1C1E">Dark</option><option value="#F2F2F7">Light</option></select></label>
        </div>
        <p className="kb-dimensions">{width} × {height}px · transparent background</p>
        <div className="kb-downloads"><button type="button" onClick={() => void download("svg")}><AcmIcon name="action.download" size={18} />Download SVG</button><button type="button" onClick={() => void download("png")}><AcmIcon name="action.download" size={18} />Download PNG</button></div>
        <p className="kb-status" role="status" aria-live="polite">{status}</p>
        <p className="kb-export-note">All lettering is vector artwork. SVGs stay sharp at any size and need no installed fonts.</p>
      </aside>
    </div>
    <p className="kb-footnote">This is a style preview, not the complete key inventory. Shared keys use the same artwork; platform-specific modifiers stay distinct. Keycap proportions are illustrative.</p>
  </section>;
}
