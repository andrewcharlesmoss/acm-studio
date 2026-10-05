"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { watchInspectorPopover } from "../panes/inspector-popover-position";
import { AcmIcon } from "@acm/icons/react";
import { customFontSizeMaximum, normaliseCustomFontSize, type CustomFontSizeUnit } from "../../content/font-size";

export function CustomFontSizeSetting({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const units: CustomFontSizeUnit[] = ["px", "em", "rem", "vw", "vh"];
  const match = value?.match(/^(\d+(?:\.\d+)?)(px|em|rem|vw|vh)$/);
  const [unitWhenValueIsEmpty, setUnitWhenValueIsEmpty] = useState<CustomFontSizeUnit>("px");
  const unit = (match?.[2] as CustomFontSizeUnit) ?? unitWhenValueIsEmpty;
  const [draft, setDraft] = useState<string | null>(null);
  const [sliderDraft, setSliderDraft] = useState<string | null>(null);
  const sliderDraggingRef = useRef(false);
  const sliderPointerIdRef = useRef<number | null>(null);
  const finishSliderDragRef = useRef<(pointerId?: number) => void>(() => {});
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const unitMenuId = useId();
  const unitTriggerRef = useRef<HTMLButtonElement>(null);
  const unitMenuRef = useRef<HTMLDivElement>(null);
  const unitRootRef = useRef<HTMLDivElement>(null);
  const [unitMenuPosition, setUnitMenuPosition] = useState({ left: 16, top: 16, width: 120, maxHeight: 240 });
  const displayedValue = draft ?? match?.[1] ?? "";
  const relativeUnit = unit !== "px";
  const sliderMinimum = relativeUnit ? 0.1 : 1;
  const sliderMaximum = customFontSizeMaximum(unit);
  const sliderDisplayedValue = sliderDraft ?? displayedValue;
  const numericValue = Number(sliderDisplayedValue);
  const sliderValue = sliderDisplayedValue && Number.isFinite(numericValue) ? Math.max(sliderMinimum, Math.min(numericValue, sliderMaximum)) : relativeUnit ? 1 : 16;
  function startSliderDrag(pointerId: number) {
    if (sliderDraggingRef.current) return;
    // The range only renders in custom mode. Avoid a parent state update here,
    // which can interrupt the browser's native range drag as it starts.
    sliderDraggingRef.current = true;
    sliderPointerIdRef.current = pointerId;
  }
  function commit(next: string, nextUnit = unit) {
    setDraft(null);
    if (!next.trim()) { onChange(undefined); return; }
    const normalised = normaliseCustomFontSize(Number(next), nextUnit);
    if (normalised) onChange(normalised);
  }
  function finishSliderDrag(pointerId?: number) {
    if (!sliderDraggingRef.current) return;
    if (pointerId !== undefined && sliderPointerIdRef.current !== pointerId) return;
    sliderDraggingRef.current = false;
    sliderPointerIdRef.current = null;
    setSliderDraft(null);
  }
  useLayoutEffect(() => {
    finishSliderDragRef.current = (pointerId) => finishSliderDrag(pointerId);
  });
  useEffect(() => {
    const finishPointerInteraction = (event: PointerEvent) => finishSliderDragRef.current(event.pointerId);
    window.addEventListener("pointerup", finishPointerInteraction);
    window.addEventListener("pointercancel", finishPointerInteraction);
    return () => {
      window.removeEventListener("pointerup", finishPointerInteraction);
      window.removeEventListener("pointercancel", finishPointerInteraction);
    };
  }, []);
  useEffect(() => {
    if (unitMenuOpen) unitMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [unitMenuOpen]);
  useLayoutEffect(() => {
    if (!unitMenuOpen) return;
    return watchInspectorPopover(unitTriggerRef.current, unitMenuRef.current, 120, setUnitMenuPosition);
  }, [unitMenuOpen]);
  useEffect(() => {
    if (!unitMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !unitRootRef.current?.contains(event.target) && !unitMenuRef.current?.contains(event.target)) setUnitMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [unitMenuOpen]);
  function closeUnitMenu(restoreFocus = false) {
    setUnitMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => unitTriggerRef.current?.focus());
  }
  function selectUnit(nextUnit: CustomFontSizeUnit) {
    setUnitWhenValueIsEmpty(nextUnit);
    if (displayedValue) commit(displayedValue, nextUnit);
    closeUnitMenu(true);
  }
  return <div className="paragraph-custom-font-size"><div ref={unitRootRef} className="paragraph-custom-font-size-input" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !unitMenuRef.current?.contains(event.relatedTarget as Node | null)) closeUnitMenu(); }}><input aria-label="Custom font size" type="number" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={displayedValue} onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft !== null) commit(draft); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button ref={unitTriggerRef} className="paragraph-custom-font-size-unit" type="button" aria-label={`Custom font size unit: ${unit}`} aria-haspopup="menu" aria-expanded={unitMenuOpen} aria-controls={unitMenuId} onClick={() => setUnitMenuOpen(open => !open)}>{unit}</button>{unitMenuOpen ? createPortal(<div style={unitMenuPosition} ref={unitMenuRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !unitRootRef.current?.contains(event.relatedTarget as Node | null)) closeUnitMenu(); }} id={unitMenuId} className="paragraph-custom-font-size-unit-menu" role="menu" tabIndex={-1} aria-label="Custom font size unit" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeUnitMenu(true); return; }
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const activeIndex = items.indexOf(event.target as HTMLButtonElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
    else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex !== null && items.length) { event.preventDefault(); items[nextIndex]?.focus(); }
  }}><button type="button" aria-label="Close font size unit menu" title="Close" onClick={() => closeUnitMenu(true)}><AcmIcon name="action.close" size={16} /></button>{units.map(option => <button className={option === unit ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={option === unit} key={option} onClick={() => selectUnit(option)}><span className="paragraph-custom-font-size-unit-check">{option === unit ? <AcmIcon name="state.selected" scale="Regular-S" size={16} /> : null}</span><span>{option}</span></button>)}</div>, document.body) : null}</div><input className="studio-range-control paragraph-custom-font-size-slider" aria-label="Custom font size slider" type="range" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={sliderValue} onPointerDown={event => startSliderDrag(event.pointerId)} onPointerUp={event => finishSliderDrag(event.pointerId)} onPointerCancel={event => finishSliderDrag(event.pointerId)} onLostPointerCapture={event => finishSliderDrag(event.pointerId)} onBlur={() => finishSliderDrag()} onChange={event => { const nextValue = event.currentTarget.value; if (sliderDraggingRef.current) setSliderDraft(nextValue); commit(nextValue); }} /></div>;
}
