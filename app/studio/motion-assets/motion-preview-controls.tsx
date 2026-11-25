"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { useEffect, useEffectEvent, type ReactNode, type Ref } from "react";
import { RangeControl } from "../controls/range-control";
import { isNativeEditingTarget } from "../workspace-shortcuts.mjs";

export function useMotionPlaybackShortcut(active: boolean, togglePlayback: () => void) {
  const onPlaybackShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== " " || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (isNativeEditingTarget(target) || document.querySelector("dialog[open]")
      || (target instanceof Element && target.closest('audio, video, button, a[href], summary, [role="button"], [role="switch"], [role="tab"], [role="dialog"]'))) return;
    event.preventDefault();
    if (!event.repeat) togglePlayback();
  });

  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => onPlaybackShortcut(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [active]);
}

const formatPlaybackTime = (seconds: number) => `${seconds.toFixed(2)} s`;

export function MotionPreviewPane({ id, previewRef, actions, children }: {
  id?: string; previewRef: Ref<HTMLElement>; actions: ReactNode; children: ReactNode;
}) {
  return <section id={id} ref={previewRef} className="motion-preview" tabIndex={-1} aria-label="Motion preview">
    <div className="motion-toolbar">
      <h2>Preview</h2>
      <div className="motion-actions">{actions}</div>
    </div>
    {children}
  </section>;
}

export function MotionPlaybackTransport({ playing, position, duration, label, unitsPerSecond, step, disabled, onToggle, onSeek }: {
  playing: boolean; position: number; duration: number; label: string; unitsPerSecond: number; step: number;
  disabled?: boolean; onToggle: () => void; onSeek: (position: number) => void;
}) {
  const playbackLabel = playing ? "Pause" : "Play";
  const currentTime = formatPlaybackTime(position / unitsPerSecond);
  const totalTime = formatPlaybackTime(duration / unitsPerSecond);
  return <div className="motion-transport">
    <button type="button" className="button-secondary motion-playback-button" disabled={disabled} aria-label={playbackLabel}
      title={`${playbackLabel} (Space)`} aria-keyshortcuts="Space" onClick={onToggle}>
      <AcmIcon name={playing ? "media.pause" : "media.play"} scale="Regular-S" size={20} />
    </button>
    <RangeControl min={0} max={duration} step={step} value={position} disabled={disabled}
      aria-label={label} aria-valuetext={`${currentTime} of ${totalTime}`}
      tooltipPlacement="above" tooltipText={currentTime} onChange={event => onSeek(event.target.valueAsNumber)} />
    <span className="motion-time" aria-hidden="true">{currentTime} / {totalTime}</span>
  </div>;
}
