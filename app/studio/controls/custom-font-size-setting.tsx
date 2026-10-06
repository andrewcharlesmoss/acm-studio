"use client";

import { RangeControl } from "./range-control";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  function selectUnit(nextUnit: CustomFontSizeUnit) {
    setUnitWhenValueIsEmpty(nextUnit);
    if (displayedValue) commit(displayedValue, nextUnit);
  }
  return <div className="paragraph-custom-font-size">
    <div className="paragraph-custom-font-size-input">
      <input aria-label="Custom font size" type="number" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={displayedValue} onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft !== null) commit(draft); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      <select className="paragraph-custom-font-size-unit" aria-label="Custom font size unit" value={unit} onChange={event => selectUnit(event.target.value as CustomFontSizeUnit)}>
        {units.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
    <RangeControl className="studio-range-control paragraph-custom-font-size-slider" aria-label="Custom font size slider" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={sliderValue} onPointerDown={event => startSliderDrag(event.pointerId)} onPointerUp={event => finishSliderDrag(event.pointerId)} onPointerCancel={event => finishSliderDrag(event.pointerId)} onLostPointerCapture={event => finishSliderDrag(event.pointerId)} onBlur={() => finishSliderDrag()} onChange={event => { const nextValue = event.currentTarget.value; if (sliderDraggingRef.current) setSliderDraft(nextValue); commit(nextValue); }} />
  </div>;
}
