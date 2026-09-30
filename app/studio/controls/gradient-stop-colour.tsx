"use client";
import { useState } from "react";
import { StudioIcon } from "../studio-icons";
import { hexToHsv, hsvToHex, hsvToHsl, hslToHsv, rgbChannels } from "./gradient-colour";

/** Studio-owned colour surface; no upstream picker code or assets are included. */
export function GradientStopColour({ colour, onChange }: { colour: string; onChange: (colour: string) => void }) {
  const hsv = hexToHsv(colour);
  const [lastHue, setLastHue] = useState(hsv.hue);
  // Achromatic colours have no defined hue. Retain the user's hue while crossing white/black.
  const hue = hsv.saturation === 0 ? lastHue : hsv.hue;
  const [format, setFormat] = useState("Hex");
  const [copied, setCopied] = useState(false);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const rgb = rgbChannels(colour);
  const hsl = hsvToHsl({ ...hsv, hue });
  const channels = format === "RGB" ? rgb : hsl;
  function change(patch: Partial<typeof hsv>) {
    setLastHue(patch.hue ?? hue);
    onChange(hsvToHex({ ...hsv, hue, ...patch }));
  }
  function applyColour(next: string) {
    const converted = hexToHsv(next);
    setLastHue(converted.saturation > 0 ? converted.hue : hue);
    onChange(next);
  }
  function pointAt(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    change({ saturation: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), brightness: Math.max(0, Math.min(100, (1 - (event.clientY - bounds.top) / bounds.height) * 100)) });
  }
  return <div className="gradient-stop-colour">
    <div className="gradient-colour-plane" role="slider" tabIndex={0} aria-label="Colour saturation and brightness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsv.saturation)} aria-valuetext={`Saturation ${Math.round(hsv.saturation)}%, brightness ${Math.round(hsv.brightness)}%`} style={{ backgroundColor: hsvToHex({ hue, saturation: 100, brightness: 100, alpha: 100 }) }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); pointAt(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointAt(event); }} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      change({ saturation: Math.max(0, Math.min(100, hsv.saturation + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0))), brightness: Math.max(0, Math.min(100, hsv.brightness + (event.key === "ArrowDown" ? -1 : event.key === "ArrowUp" ? 1 : 0))) });
    }}><span style={{ left: `${hsv.saturation}%`, top: `${100 - hsv.brightness}%` }} /></div>
    <input className="gradient-colour-hue" type="range" aria-label="Hue" min="0" max="359" value={hue} onChange={event => change({ hue: Number(event.target.value) })} />
    <input className="gradient-colour-alpha" type="range" aria-label="Alpha" min="0" max="100" value={hsv.alpha} style={{ backgroundImage: `linear-gradient(90deg, transparent, ${colour.slice(0, 7)}), repeating-conic-gradient(#ddd 0% 25%, white 0% 50%)`, backgroundSize: "auto, 12px 12px" }} onChange={event => change({ alpha: Number(event.target.value) })} />
    <div className="gradient-colour-format"><label><span className="visually-hidden">Colour format</span><select value={format} onChange={event => setFormat(event.target.value)}><option>Hex</option><option>RGB</option><option>HSL</option></select></label><button type="button" aria-label="Copy colour" title="Copy colour" onClick={async () => { try { await navigator.clipboard.writeText(format === "Hex" ? colour : format === "RGB" ? `rgba(${rgb.join(", ")}, ${Math.round(hsv.alpha) / 100})` : `hsla(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%, ${Math.round(hsv.alpha) / 100})`); setCopied(true); } catch { setCopied(false); } }}><StudioIcon name="copy" size={16} /></button><span role="status" className="visually-hidden">{copied ? "Colour copied" : ""}</span></div>
    {format === "Hex" ? <label className="gradient-colour-hex"><span>Hex colour</span><input aria-label="Hex colour" value={hexDraft ?? colour.slice(1)} onChange={event => setHexDraft(event.target.value)} maxLength={8} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={event => { const next = event.target.value.replace(/^#/, ""); if (/^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(next)) applyColour(`#${next.toUpperCase()}`); setHexDraft(null); }} /></label> : <div className="gradient-colour-channels">{channels.map((channel, index) => <label key={index}>{(format === "RGB" ? ["Red", "Green", "Blue"] : ["Hue", "Saturation", "Lightness"])[index]}<input type="number" min="0" max={format === "RGB" ? 255 : index === 0 ? 359 : 100} value={channel} onChange={event => {
      if (event.target.value === "") return;
      const next = [...channels]; next[index] = Math.max(0, Math.min(format === "RGB" ? 255 : index === 0 ? 359 : 100, Number(event.target.value)));
      if (format === "RGB") applyColour(`#${next.map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}${colour.length === 9 ? colour.slice(7) : ""}`);
      else applyColour(hsvToHex(hslToHsv(next[0], next[1], next[2], hsv.alpha)));
    }} /></label>)}</div>}
  </div>;
}
