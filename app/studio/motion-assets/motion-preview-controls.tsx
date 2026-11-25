"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { RangeControl } from "../controls/range-control";
import { useOverlayDismiss } from "../overlays/use-overlay-dismiss";
import { isNativeEditingTarget } from "../workspace-shortcuts.mjs";

export function useMotionPlaybackShortcut(active: boolean, togglePlayback: () => void) {
  const onPlaybackShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== " " || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (isNativeEditingTarget(target) || document.querySelector("dialog[open]")
      || (target instanceof Element && target.closest('audio, video, button, a[href], summary, [role="button"], [role="switch"], [role="tab"], [role="dialog"]:not(.motion-preview)'))) return;
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

export const formatPlaybackTime = (seconds: number) => `${seconds.toFixed(2)} s`;
export function MotionPreviewPane({ id, previewRef, active, actions, children, onClose }: {
  id?: string; previewRef: RefObject<HTMLElement | null>; active: boolean; actions?: ReactNode; children: ReactNode; onClose?: () => void;
}) {
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const wasFullscreen = useRef(false);
  const closing = useRef(false);
  const releaseExpansion = useRef<(() => void) | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  if (!active && expanded) setExpanded(false);

  useEffect(() => {
    function onFullscreenChange() {
      const entered = Boolean(previewRef.current && document.fullscreenElement === previewRef.current);
      if (!entered && wasFullscreen.current && !closing.current) fullscreenButton.current?.focus({ preventScroll: true });
      wasFullscreen.current = entered;
      setFullscreen(entered);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [previewRef]);

  useEffect(() => {
    if (!active && previewRef.current && document.fullscreenElement === previewRef.current) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [active, previewRef]);

  useLayoutEffect(() => {
    const pane = previewRef.current;
    if (!expanded || !pane) return;
    const inertSiblings: HTMLElement[] = [];
    for (let child = pane; child.parentElement && child !== document.body; child = child.parentElement) {
      for (const sibling of child.parentElement.children) {
        if (sibling === child || !(sibling instanceof HTMLElement) || sibling.inert) continue;
        sibling.setAttribute("inert", "");
        inertSiblings.push(sibling);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullscreenButton.current?.focus({ preventScroll: true });
    const containTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const tabStops = Array.from(pane.querySelectorAll<HTMLElement | SVGElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      )).filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length);
      const first = tabStops[0], last = tabStops.at(-1);
      if (!first || !last || document.activeElement !== (event.shiftKey ? first : last)) return;
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    };
    pane.addEventListener("keydown", containTab);

    const release = () => {
      if (releaseExpansion.current !== release) return;
      releaseExpansion.current = null;
      pane.removeEventListener("keydown", containTab);
      for (const sibling of inertSiblings) sibling.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      if (!closing.current) requestAnimationFrame(() => {
        const button = fullscreenButton.current;
        if (button?.isConnected && !button.closest("[hidden], [inert]")) button.focus({ preventScroll: true });
      });
    };
    releaseExpansion.current = release;
    return release;
  }, [expanded, previewRef]);

  useOverlayDismiss({
    open: expanded, onEscape: () => setExpanded(false), onOutside: () => {},
    onFocusOutside: target => {
      if (!previewRef.current?.contains(target)) fullscreenButton.current?.focus({ preventScroll: true });
    },
  });

  async function toggleFullscreen() {
    const element = previewRef.current;
    if (!element) return;
    setFullscreenError("");
    if (expanded) { setExpanded(false); return; }
    if (!document.fullscreenEnabled) { setExpanded(true); return; }
    const exiting = document.fullscreenElement === element;
    try {
      if (exiting) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      if (exiting) setFullscreenError("Couldn’t close full screen mode.");
      else setExpanded(true);
    }
  }

  async function closePreview() {
    closing.current = true;
    if (expanded) {
      releaseExpansion.current?.();
      setExpanded(false);
    }
    if (previewRef.current && document.fullscreenElement === previewRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        closing.current = false;
        setFullscreenError("Couldn’t close full screen mode.");
        return;
      }
    }
    onClose?.();
  }

  return <section id={id} ref={previewRef} className="motion-preview" tabIndex={-1} aria-label="Motion preview"
    role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} data-expanded={expanded || undefined}>
    <div className="motion-toolbar">
      <h2>Preview</h2>
      <div className="motion-actions">
        {actions}
        {onClose ? <button type="button" className="button-secondary" onClick={() => void closePreview()}>Close Preview</button> : null}
        <button ref={fullscreenButton} type="button" className="button-secondary" onClick={() => void toggleFullscreen()}>
          {fullscreen || expanded ? "Exit Full Screen" : "Full Screen"}
        </button>
      </div>
      {fullscreenError ? <p role="alert" className="motion-feedback">{fullscreenError}</p> : null}
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
