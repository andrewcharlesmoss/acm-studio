"use client";
import { NumberInput, SelectControl, TextInput } from "./native-fields";
import { useRef, useState } from "react";
import { StudioIcon } from "../studio-icons";
import { hexToHsv, hsvToHex, hsvToHsl, hslToHsv, rgbChannels } from "./gradient-colour";

/** Studio-owned colour surface; no upstream picker code or assets are included. */
export function GradientStopColour({ colour, onChange, enableAlpha = true, deferPointerChange = false, disabled = false }: { colour: string; onChange: (colour: string) => void; enableAlpha?: boolean; deferPointerChange?: boolean; disabled?: boolean }) {
  const [pointerColour, setPointerColour] = useState<string | null>(null);
  const pointerColourRef = useRef<string | null>(null);
  const hsv = hexToHsv(pointerColour ?? colour);
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
    const base = deferPointerChange ? pointerColourRef.current ?? colour : colour;
    const current = hexToHsv(base);
    const currentHue = current.saturation === 0 ? hue : current.hue;
    const next = hsvToHex({ ...current, hue: currentHue, saturation: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), brightness: Math.max(0, Math.min(100, (1 - (event.clientY - bounds.top) / bounds.height) * 100)) });
    setLastHue(currentHue);
    if (deferPointerChange) {
      pointerColourRef.current = next;
      setPointerColour(next);
    } else onChange(next);
  }
  return <div className="gradient-stop-colour">
    <div className="gradient-colour-plane" role="slider" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined} aria-label="Colour saturation and brightness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsv.saturation)} aria-valuetext={`Saturation ${Math.round(hsv.saturation)}%, brightness ${Math.round(hsv.brightness)}%`} style={{ backgroundColor: hsvToHex({ hue, saturation: 100, brightness: 100, alpha: 100 }) }} onPointerDown={event => { if (disabled) return; if (deferPointerChange) event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); pointAt(event); }} onPointerMove={event => { if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId)) pointAt(event); }} onPointerUp={event => { if (!deferPointerChange || !event.currentTarget.hasPointerCapture(event.pointerId)) return; event.currentTarget.releasePointerCapture(event.pointerId); const next = pointerColourRef.current; pointerColourRef.current = null; setPointerColour(null); if (next && next.toLowerCase() !== colour.toLowerCase()) onChange(next); }} onPointerCancel={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); pointerColourRef.current = null; setPointerColour(null); }} onKeyDown={event => {
      if (disabled) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      change({ saturation: Math.max(0, Math.min(100, hsv.saturation + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0))), brightness: Math.max(0, Math.min(100, hsv.brightness + (event.key === "ArrowDown" ? -1 : event.key === "ArrowUp" ? 1 : 0))) });
    }}><span style={{ left: `${hsv.saturation}%`, top: `${100 - hsv.brightness}%` }} /></div>
    <input className="gradient-colour-hue" type="range" aria-label="Hue" min="0" max="359" value={hue} disabled={disabled} onChange={event => change({ hue: Number(event.target.value) })} />
    {enableAlpha ? <input className="gradient-colour-alpha" type="range" aria-label="Alpha" min="0" max="100" value={hsv.alpha} disabled={disabled} style={{ backgroundImage: `linear-gradient(90deg, transparent, ${(pointerColour ?? colour).slice(0, 7)}), var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" }} onChange={event => change({ alpha: Number(event.target.value) })} /> : null}
    <div className="gradient-colour-format"><label><span className="visually-hidden">Colour format</span><SelectControl className="gradient-colour-format-select" value={format} disabled={disabled} onChange={event => setFormat(event.target.value)}><option>Hex</option><option>RGB</option><option>HSL</option></SelectControl></label><button type="button" aria-label="Copy colour" title="Copy colour" disabled={disabled} onClick={async () => { try { await navigator.clipboard.writeText(format === "Hex" ? pointerColour ?? colour : format === "RGB" ? `rgba(${rgb.join(", ")}, ${Math.round(hsv.alpha) / 100})` : `hsla(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%, ${Math.round(hsv.alpha) / 100})`); setCopied(true); } catch { setCopied(false); } }}><StudioIcon name="copy" size={16} /></button><span role="status" className="visually-hidden">{copied ? "Colour copied" : ""}</span></div>
    {format === "Hex" ? <label className="gradient-colour-hex"><span className="visually-hidden">Hex colour</span><span className="gradient-colour-hex-field"><span className="gradient-colour-hex-prefix" aria-hidden="true">#</span><TextInput aria-label="Hex colour" disabled={disabled} value={hexDraft ?? (pointerColour ?? colour).slice(1).toUpperCase()} onChange={event => setHexDraft(event.target.value)} maxLength={enableAlpha ? 8 : 6} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={event => { const next = event.target.value.replace(/^#/, ""); if ((enableAlpha ? /^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i : /^[0-9a-f]{6}$/i).test(next)) applyColour(`#${next.toUpperCase()}`); setHexDraft(null); }} /></span></label> : <div className="gradient-colour-channels">{channels.map((channel, index) => <label key={index}>{(format === "RGB" ? ["Red", "Green", "Blue"] : ["Hue", "Saturation", "Lightness"])[index]}<NumberInput  min="0" disabled={disabled} max={format === "RGB" ? 255 : index === 0 ? 359 : 100} value={channel} onChange={event => {
      if (event.target.value === "") return;
      const next = [...channels]; next[index] = Math.max(0, Math.min(format === "RGB" ? 255 : index === 0 ? 359 : 100, Number(event.target.value)));
      if (format === "RGB") applyColour(`#${next.map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}${colour.length === 9 ? colour.slice(7) : ""}`);
      else applyColour(hsvToHex(hslToHsv(next[0], next[1], next[2], hsv.alpha)));
    }} /></label>)}</div>}
  </div>;
}
