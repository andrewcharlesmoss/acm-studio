"use client";

import { watchInspectorPopover } from "../panes/inspector-popover-position";
import { createPortal } from "react-dom";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { CustomBackgroundGradient, ParagraphBackgroundGradient } from "../../content/model";
import { DEFAULT_GRADIENTS, editableBackgroundGradient } from "../../content/background-gradient";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { GradientStopColour } from "./gradient-stop-colour";
import { PopoverHeading } from "../overlays/popover-heading";
import { useOverlayDismiss } from "../overlays/use-overlay-dismiss";
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
  const [insertPosition, setInsertPosition] = useState<number | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [inserting, setInserting] = useState(false);
  const [stopPosition, setStopPosition] = useState({ left: 16, top: 16, width: 260 });
  const dragRef = useRef({ initial: 0, moved: false });
  const stopPopoverRef = useRef<HTMLDivElement>(null);
  const insertRef = useRef<HTMLButtonElement>(null);
  const stopCloseRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const gradient = editableBackgroundGradient(value);
  const positions = [0, ...gradient.stops.map(stop => stop.position), 100];
  const insertionGaps = positions.slice(1).map((end, index) => ({ width: end - positions[index], position: Math.round((end + positions[index]) / 2) }));
  const keyboardInsertionPosition = insertionGaps.filter(gap => gap.width >= 20).sort((a, b) => b.width - a.width)[0]?.position;
  const activeStop = selectedStop === null ? undefined : gradient.stops[selectedStop];
  const barBackground = paragraphBackgroundGradientCss({ ...gradient, type: "linear", angle: 90 });

  function close(restoreFocus = true) {
    setOpen(false);
    setSelectedStop(null);
    setInserting(false);
    setInsertPosition(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }
  const closeStopEditor = useCallback(() => {
    const index = selectedStop;
    setSelectedStop(null);
    setInserting(false);
    if (index === null) requestAnimationFrame(() => insertRef.current?.focus());
    if (index !== null) requestAnimationFrame(() => stopRefs.current[index]?.focus());
  }, [selectedStop]);
  useLayoutEffect(() => { if (isOpen) closeRef.current?.focus(); }, [isOpen]);
  const stopEditorOpen = isOpen && (selectedStop !== null || inserting);
  useLayoutEffect(() => { if (stopEditorOpen) stopCloseRef.current?.focus(); }, [stopEditorOpen]);
  useLayoutEffect(() => {
    if (selectedStop === null && !inserting) return;
    const anchor = selectedStop === null ? insertRef.current : stopRefs.current[selectedStop];
    return watchInspectorPopover(anchor, stopPopoverRef.current, 260, setStopPosition, { ownerAnchor: triggerRef.current, below: true });
  }, [selectedStop, inserting]);
  useLayoutEffect(() => {
    if (!isOpen) return;
    return watchInspectorPopover(triggerRef.current, popoverRef.current, 280, setPosition);
  }, [isOpen, selectedStop, inserting, gradient.type]);
  useOverlayDismiss({
    open: isOpen,
    onEscape: () => { if (stopEditorOpen) closeStopEditor(); else close(); },
    onOutside: target => {
      if (stopPopoverRef.current?.contains(target)) return;
      if (!popoverRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
      else if (!barRef.current?.contains(target)) { setSelectedStop(null); setInserting(false); }
    },
  });

  function update(next: CustomBackgroundGradient) { onChange(next); }
  function changeStop(index: number, patch: Partial<CustomBackgroundGradient["stops"][number]>) {
    const stops = gradient.stops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...patch } : stop);
    update({ ...gradient, stops });
  }
  function moveStop(index: number, nextPosition: number) {
    const lower = gradient.stops[index - 1]?.position ?? 0;
    const upper = gradient.stops[index + 1]?.position ?? 100;
    const position = Math.max(0, Math.min(100, Math.round(nextPosition)));
    if (position < lower || position > upper) return;
    update({ ...gradient, stops: gradient.stops.map((stop, i) => i === index ? { ...stop, position } : stop) });
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
      <PopoverHeading closeRef={closeRef} closeLabel="Close gradient picker" onClose={() => close()}>Gradient</PopoverHeading>
      <div className={`paragraph-gradient-bar${value ? "" : " is-unset"}`} style={{ backgroundImage: `${barBackground}, repeating-conic-gradient(#ddd 0% 25%, white 0% 50%)`, backgroundSize: "auto, 12px 12px" }}>
        <div ref={barRef} className="paragraph-gradient-track" onPointerDown={event => {
          if (event.pointerType !== "touch" || event.target !== event.currentTarget || gradient.stops.length >= 20) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = Math.max(0, Math.min(100, Math.round((event.clientX - bounds.left) / bounds.width * 100)));
          if (gradient.stops.some(stop => Math.abs(stop.position - position) < 10)) return;
          setEditorSession(session => session + 1); setSelectedStop(null); setInsertPosition(position); setInserting(true);
        }} onPointerMove={event => {
          if (selectedStop !== null || inserting || gradient.stops.length >= 20) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = Math.max(0, Math.min(100, Math.round((event.clientX - bounds.left) / bounds.width * 100)));
          setInsertPosition(gradient.stops.some(stop => Math.abs(stop.position - position) < 10) ? null : position);
        }} onPointerLeave={() => { if (!inserting) setInsertPosition(null); }}>
        {gradient.stops.map((stop, index) => <button ref={element => { stopRefs.current[index] = element; }} key={index} type="button" className="paragraph-gradient-stop" aria-label={`Gradient control point at position ${stop.position}% with colour ${stop.colour}`} aria-describedby={`${id}-instructions`} aria-haspopup="dialog" aria-expanded={selectedStop === index} style={{ left: `${stop.position}%`, backgroundColor: stop.colour }} onClick={() => {
          if (dragRef.current.moved) return;
          setEditorSession(session => session + 1); setSelectedStop(selectedStop === index ? null : index); setInserting(false); setInsertPosition(null);
        }} onPointerDown={event => { dragRef.current = { initial: stop.position, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || !barRef.current) return;
          const bounds = barRef.current.getBoundingClientRect();
          const position = (event.clientX - bounds.left) / bounds.width * 100;
          if (Math.abs(position - dragRef.current.initial) >= 5) dragRef.current.moved = true;
          moveStop(index, position);
        }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); dragRef.current.moved = false; moveStop(index, stop.position + (event.key === "ArrowLeft" ? -10 : 10)); } if (event.key === "Enter" || event.key === " ") dragRef.current.moved = false; }} />)}
        {selectedStop === null && gradient.stops.length < 20 && keyboardInsertionPosition !== undefined ? <button ref={insertRef} type="button" className={`paragraph-gradient-insert${insertPosition === null ? " is-keyboard-only" : ""}`} aria-label="Insert gradient control point" aria-haspopup="dialog" aria-expanded={inserting} style={{ left: `${insertPosition ?? keyboardInsertionPosition}%` }} onClick={() => { setEditorSession(session => session + 1); setInsertPosition(insertPosition ?? keyboardInsertionPosition); setInserting(!inserting); }}><StudioIcon name="add" size={16} /></button> : null}
        </div>
      </div>
      <span id={`${id}-instructions`} className="visually-hidden">Use left or right arrow keys or drag to change the gradient position. Press to change the colour or remove the control point.</span>
      <div className="paragraph-gradient-settings">
        <label>Type<select value={gradient.type} onChange={event => update({ ...gradient, type: event.target.value as "linear" | "radial" })}><option value="linear">Linear</option><option value="radial">Radial</option></select></label>
        {gradient.type === "linear" ? <label>Angle<div className="paragraph-gradient-angle"><input type="number" min="0" max="360" aria-label="Gradient angle" value={value ? gradient.angle : ""} onChange={event => { if (event.target.value !== "") update({ ...gradient, angle: Math.max(0, Math.min(360, Number(event.target.value))) }); }} /><span aria-hidden="true">°</span><div className="paragraph-gradient-angle-dial" role="slider" tabIndex={0} aria-label="Gradient angle dial" aria-valuemin={0} aria-valuemax={360} aria-valuenow={gradient.angle} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); angleAt(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) angleAt(event); }} onKeyDown={event => { if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); update({ ...gradient, angle: event.key === "Home" ? 0 : event.key === "End" ? 360 : (gradient.angle + (["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 1) + 360) % 360 }); } }}><span style={{ transform: `rotate(${gradient.angle}deg)` }} /></div></div></label> : null}
      </div>
      <strong className="paragraph-gradient-presets-label">DEFAULT</strong>
      <div className="paragraph-gradient-options" role="group" aria-label="Default gradients">{DEFAULT_GRADIENTS.map(preset => <button key={preset.name} type="button" title={preset.name} aria-label={`Gradient: ${preset.name}`} aria-pressed={JSON.stringify(gradient) === JSON.stringify(preset.value) && Boolean(value)} style={{ backgroundImage: paragraphBackgroundGradientCss(preset.value) }} onClick={() => { onChange(JSON.stringify(gradient) === JSON.stringify(preset.value) && value ? undefined : preset.value); setSelectedStop(null); setInserting(false); }} />)}</div>
      {value ? <div className="paragraph-gradient-footer"><button className="studio-clear-action" type="button" onClick={() => { onChange(undefined); setSelectedStop(null); setInserting(false); }}>Clear</button></div> : null}
    </div>, document.body) : null}
    {isOpen && (activeStop || inserting) ? createPortal(<div ref={stopPopoverRef} className="paragraph-colour-palette paragraph-gradient-stop-popover" role="dialog" aria-label={inserting ? "Insert gradient control point" : "Gradient control point colour"} style={stopPosition}>
      <PopoverHeading closeRef={stopCloseRef} closeLabel="Close control point colour picker" onClose={closeStopEditor}><span className="visually-hidden">Control point colour</span></PopoverHeading>
      <GradientStopColour key={editorSession} colour={activeStop?.colour ?? "#FFFFFF"} onChange={colour => {
        if (selectedStop !== null) changeStop(selectedStop, { colour });
        else if (insertPosition !== null && gradient.stops.length < 20) {
          const inserted = { colour, position: insertPosition };
          const stops = [...gradient.stops, inserted].sort((a, b) => a.position - b.position);
          update({ ...gradient, stops }); setSelectedStop(stops.indexOf(inserted)); setInserting(false);
        }
      }} />
      {activeStop && selectedStop !== null && gradient.stops.length > 2 ? <button type="button" className="paragraph-gradient-remove" onClick={() => { update({ ...gradient, stops: gradient.stops.filter((_, index) => index !== selectedStop) }); setSelectedStop(null); setInserting(false); requestAnimationFrame(() => stopRefs.current[Math.max(0, selectedStop - 1)]?.focus()); }}>Remove control point</button> : null}
    </div>, document.body) : null}
  </>;
}
