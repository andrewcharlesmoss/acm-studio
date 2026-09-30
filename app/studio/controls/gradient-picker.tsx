"use client";

import { createPortal } from "react-dom";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { CustomBackgroundGradient, ParagraphBackgroundGradient } from "../../content/model";
import { DEFAULT_GRADIENTS, editableBackgroundGradient } from "../../content/background-gradient";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { StudioIcon } from "../studio-icons";

export function GradientPicker({ value, onChange, disabled = false, active, onOpen }: {
  value?: ParagraphBackgroundGradient;
  onChange: (value: ParagraphBackgroundGradient | undefined) => void;
  disabled?: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = open && active;
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stopColourRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const gradient = editableBackgroundGradient(value);
  const activeStop = selectedStop === null ? undefined : gradient.stops[selectedStop];
  const barBackground = paragraphBackgroundGradientCss({ ...gradient, type: "linear", angle: 90 });

  function close(restoreFocus = true) {
    setOpen(false);
    setSelectedStop(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }
  const closeStopEditor = useCallback(() => {
    const index = selectedStop;
    setSelectedStop(null);
    if (index !== null) requestAnimationFrame(() => stopRefs.current[index]?.focus());
  }, [selectedStop]);
  useLayoutEffect(() => { if (isOpen) closeRef.current?.focus(); }, [isOpen]);
  useLayoutEffect(() => { if (selectedStop !== null) stopColourRef.current?.focus(); }, [selectedStop]);
  useLayoutEffect(() => {
    if (!isOpen) return;
    function reposition() {
      const anchor = triggerRef.current;
      const popup = popoverRef.current;
      if (!anchor || !popup) return;
      const bounds = anchor.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      const leftEdge = anchor.closest(".studio-inspector")?.getBoundingClientRect().left ?? bounds.left;
      setPosition({ width, left: Math.max(16, Math.min(leftEdge - width - 12, window.innerWidth - width - 16)), top: Math.max(16, Math.min(bounds.top, window.innerHeight - popup.getBoundingClientRect().height - 16)) });
    }
    function dismiss(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (selectedStop !== null) { closeStopEditor(); return; }
        close();
      } else if (event.target instanceof Node && !popoverRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close(false);
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [isOpen, selectedStop, gradient.type, closeStopEditor]);

  function update(next: CustomBackgroundGradient) { onChange(next); }
  function changeStop(index: number, patch: Partial<CustomBackgroundGradient["stops"][number]>) {
    const stops = gradient.stops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...patch } : stop);
    update({ ...gradient, stops });
  }
  function setStopPosition(index: number, nextPosition: number) {
    const lower = gradient.stops[index - 1]?.position ?? 0;
    const upper = gradient.stops[index + 1]?.position ?? 100;
    update({ ...gradient, stops: gradient.stops.map((stop, i) => i === index ? { ...stop, position: Math.max(lower, Math.min(upper, nextPosition)) } : stop) });
  }
  function angleAt(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const angle = (Math.atan2(event.clientX - bounds.left - bounds.width / 2, bounds.top + bounds.height / 2 - event.clientY) * 180 / Math.PI + 360) % 360;
    update({ ...gradient, angle: Math.round(angle) });
  }
  return <>
    <button ref={triggerRef} type="button" disabled={disabled} aria-expanded={isOpen} aria-controls={id} onClick={() => { onOpen(); setOpen(!isOpen); }}>
      <span className={`paragraph-background-mode-swatch${value ? " has-gradient" : ""}`} aria-hidden="true" style={value ? { backgroundImage: paragraphBackgroundGradientCss(value) } : undefined} />Gradient
    </button>
    {isOpen ? createPortal(<div ref={popoverRef} id={id} className="paragraph-colour-palette paragraph-gradient-palette" role="dialog" aria-label="Background gradient" style={position}>
      <div className="paragraph-colour-palette-heading"><strong>Gradient</strong><button ref={closeRef} type="button" aria-label="Close gradient picker" title="Close" onClick={() => close()}><StudioIcon name="close" size={16} /></button></div>
      <div ref={barRef} className="paragraph-gradient-bar" style={{ backgroundImage: barBackground }} onDoubleClick={event => {
        if (gradient.stops.length >= 20 || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100));
        const inserted = { colour: "#FFFFFF", position };
        const stops = [...gradient.stops, inserted].sort((a, b) => a.position - b.position);
        update({ ...gradient, stops }); setSelectedStop(stops.indexOf(inserted));
      }}>
        {gradient.stops.map((stop, index) => <button ref={element => { stopRefs.current[index] = element; }} key={index} type="button" className="paragraph-gradient-stop" aria-label={`Edit gradient stop ${index + 1}`} aria-pressed={selectedStop === index} style={{ left: `${stop.position}%`, backgroundColor: stop.colour }} onClick={() => setSelectedStop(index)} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || !barRef.current) return;
          const bounds = barRef.current.getBoundingClientRect();
          setStopPosition(index, Math.round((event.clientX - bounds.left) / bounds.width * 100));
        }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setStopPosition(index, stop.position + (event.key === "ArrowLeft" ? -1 : 1)); } }} />)}
      </div>
      {activeStop && selectedStop !== null ? <div className="paragraph-gradient-stop-editor">
        <label>Colour<input ref={stopColourRef} type="color" value={activeStop.colour.slice(0, 7)} onChange={event => changeStop(selectedStop, { colour: event.target.value + (activeStop.colour.length === 9 ? activeStop.colour.slice(7) : "") })} /></label>
        <label>Position (%)<input type="number" min={gradient.stops[selectedStop - 1]?.position ?? 0} max={gradient.stops[selectedStop + 1]?.position ?? 100} value={activeStop.position} onChange={event => { if (event.target.value !== "") setStopPosition(selectedStop, Number(event.target.value)); }} /></label>
        <label>Opacity (%)<input type="range" min="0" max="100" value={activeStop.colour.length === 9 ? Math.round(parseInt(activeStop.colour.slice(7), 16) / 255 * 100) : 100} onChange={event => changeStop(selectedStop, { colour: activeStop.colour.slice(0, 7) + Math.round(Number(event.target.value) * 255 / 100).toString(16).padStart(2, "0") })} /></label>
        <button type="button" disabled={gradient.stops.length <= 2} onClick={() => { update({ ...gradient, stops: gradient.stops.filter((_, index) => index !== selectedStop) }); setSelectedStop(null); requestAnimationFrame(() => closeRef.current?.focus()); }}>Remove stop</button>
        <button type="button" onClick={closeStopEditor}>Done</button>
      </div> : null}
      <div className="paragraph-gradient-settings">
        <label>Type<select value={gradient.type} onChange={event => update({ ...gradient, type: event.target.value as "linear" | "radial" })}><option value="linear">Linear</option><option value="radial">Radial</option></select></label>
        {gradient.type === "linear" ? <label>Angle<div className="paragraph-gradient-angle"><input type="number" min="0" max="360" aria-label="Gradient angle" value={value ? gradient.angle : ""} onChange={event => { if (event.target.value !== "") update({ ...gradient, angle: Math.max(0, Math.min(360, Number(event.target.value))) }); }} /><span aria-hidden="true">°</span><div className="paragraph-gradient-angle-dial" role="slider" tabIndex={0} aria-label="Gradient angle dial" aria-valuemin={0} aria-valuemax={360} aria-valuenow={gradient.angle} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); angleAt(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) angleAt(event); }} onKeyDown={event => { if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); update({ ...gradient, angle: event.key === "Home" ? 0 : event.key === "End" ? 360 : (gradient.angle + (["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 1) + 360) % 360 }); } }}><span style={{ transform: `rotate(${gradient.angle}deg)` }} /></div></div></label> : null}
      </div>
      <strong className="paragraph-gradient-presets-label">DEFAULT</strong>
      <div className="paragraph-gradient-options" role="group" aria-label="Default gradients">{DEFAULT_GRADIENTS.map(preset => <button key={preset.name} type="button" title={preset.name} aria-label={`Gradient: ${preset.name}`} aria-pressed={JSON.stringify(gradient) === JSON.stringify(preset.value) && Boolean(value)} style={{ backgroundImage: paragraphBackgroundGradientCss(preset.value) }} onClick={() => { onChange(preset.value); setSelectedStop(null); }} />)}</div>
      <div className="paragraph-gradient-footer"><button type="button" disabled={gradient.stops.length >= 20} onClick={() => { const inserted = { colour: "#FFFFFF", position: 50 }; const stops = [...gradient.stops, inserted].sort((a, b) => a.position - b.position); update({ ...gradient, stops }); setSelectedStop(stops.indexOf(inserted)); }}>Add stop</button><button type="button" disabled={!value} onClick={() => { onChange(undefined); setSelectedStop(null); }}>Clear</button></div>
    </div>, document.body) : null}
  </>;
}
