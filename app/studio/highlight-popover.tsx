"use client";

import { StudioButton } from "./controls/button";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { HighlightChannel, highlightColoursAtRange } from "../content/text-highlight";
import { ColourSwatches } from "./controls/colour-picker";
import { GradientStopColour } from "./controls/gradient-stop-colour";
import { PopoverHeading } from "./overlays/popover-heading";
import { useOverlayDismiss } from "./overlays/use-overlay-dismiss";
import { StudioIcon } from "./studio-icons";

type Props = {
  editor: HTMLElement;
  anchor: { left: number; bottom: number };
  colours: ReturnType<typeof highlightColoursAtRange>;
  disabled: boolean;
  onChange: (channel: HighlightChannel, value?: string) => void;
  onClose: (restoreFocus?: boolean) => void;
};

/** Canvas palette: the range stays captured while colour controls take focus. */
export function HighlightPopover({ editor, anchor, colours, disabled, onChange, onClose }: Props) {
  const [channel, setChannel] = useState<HighlightChannel>("textColor");
  const [customOpen, setCustomOpen] = useState(false);
  const [resolvedColour, setResolvedColour] = useState("#FFFFFF");
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const [customPosition, setCustomPosition] = useState({ left: 16, top: 16 });
  const rootRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const customCloseRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const active = colours[channel];
  const label = channel === "textColor" ? "text" : "background";
  const closeCustom = () => { setCustomOpen(false); requestAnimationFrame(() => previewRef.current?.focus()); };

  useLayoutEffect(() => { tabRefs.current[0]?.focus(); }, []);
  useLayoutEffect(() => {
    if (!active.value || !previewRef.current) { setResolvedColour("#FFFFFF"); return; }
    // Imported/edited marks may be RGB, HSL or named CSS colours. Resolve the
    // visible preview rather than resetting a valid non-hex colour to white.
    const channels = getComputedStyle(previewRef.current).backgroundColor.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3) return;
    const rgb = channels.slice(0, 3).map(value => Math.round(value).toString(16).padStart(2, "0")).join("");
    const alpha = channels[3] !== undefined && channels[3] < 1 ? Math.round(channels[3] * 255).toString(16).padStart(2, "0") : "";
    setResolvedColour(`#${rgb}${alpha}`.toUpperCase());
  }, [active.value]);
  useLayoutEffect(() => {
    const place = () => {
      if (!editor.isConnected) { onClose(false); return; }
      const bounds = editor.getBoundingClientRect();
      const popup = rootRef.current?.getBoundingClientRect();
      const inset = 8;
      const width = popup?.width ?? 262;
      const height = popup?.height ?? 360;
      const left = Math.max(inset, Math.min(bounds.left + anchor.left, window.innerWidth - width - inset));
      const top = Math.max(inset, Math.min(bounds.top + anchor.bottom + 8, window.innerHeight - height - inset));
      setPosition(current => current.left === left && current.top === top ? current : { left, top });
      const custom = customRef.current?.getBoundingClientRect();
      if (custom) {
        const customLeft = left + width + 8 + custom.width <= window.innerWidth - inset ? left + width + 8 : left - custom.width - 8;
        setCustomPosition({ left: Math.max(inset, customLeft), top: Math.max(inset, Math.min(top, window.innerHeight - custom.height - inset)) });
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(editor);
    if (rootRef.current) observer.observe(rootRef.current);
    if (customRef.current) observer.observe(customRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [editor, anchor, customOpen, onClose]);
  useLayoutEffect(() => { if (customOpen) customCloseRef.current?.focus(); }, [customOpen]);
  useOverlayDismiss({ open: true, onEscape: () => customOpen ? closeCustom() : onClose(), onOutside: target => {
    if (!rootRef.current?.contains(target)) onClose(false);
    else if (customOpen && !customRef.current?.contains(target) && !previewRef.current?.contains(target)) setCustomOpen(false);
  } });

  return createPortal(<div ref={rootRef} className="rich-text-highlight-popover" role="dialog" aria-label="Highlight" style={position}>
    <div className="highlight-colour-tabs" role="tablist" aria-label="Highlight colour">
      {(["textColor", "backgroundColor"] as const).map((key, index) => <button key={key} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab" id={`${id}-${key}`} aria-controls={`${id}-panel`} aria-selected={channel === key} tabIndex={channel === key ? 0 : -1} onClick={() => { setChannel(key); setCustomOpen(false); }} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
        setChannel(next === 0 ? "textColor" : "backgroundColor"); setCustomOpen(false); tabRefs.current[next]?.focus();
      }}>{index === 0 ? "Text" : "Background"}</button>)}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${channel}`} className="highlight-colour-panel">
      <div className="paragraph-colour-preview-card">
        <button ref={previewRef} type="button" className="paragraph-colour-preview" disabled={disabled} aria-label={`Custom highlight ${label} colour`} aria-haspopup="dialog" aria-expanded={customOpen} onClick={() => setCustomOpen(current => !current)} style={active.value ? { backgroundColor: active.value, backgroundImage: "none" } : undefined} />
        <div><span>{active.mixed ? "Mixed colours" : active.value ? "Custom colour" : "No colour selected"}</span>{active.value ? <span className="paragraph-colour-preview-value">{active.value}</span> : null}</div>
      </div>
      <ColourSwatches value={active.value ? resolvedColour : undefined} onChange={value => onChange(channel, value)} disabled={disabled} />
      <div className="highlight-colour-actions"><button type="button" className="highlight-close" aria-label="Close Highlight" title="Close" onClick={() => onClose()}><StudioIcon name="close" size={16} /></button><StudioButton variant="text" type="button" disabled={disabled || !active.hasColour} onClick={() => { onChange(channel); requestAnimationFrame(() => tabRefs.current[channel === "textColor" ? 0 : 1]?.focus()); }}>Clear</StudioButton></div>
    </div>
    {customOpen ? <div ref={customRef} className="paragraph-colour-palette paragraph-custom-colour-popup" role="dialog" aria-label={`Custom highlight ${label} colour picker`} style={customPosition as CSSProperties}>
      <PopoverHeading closeRef={customCloseRef} closeLabel="Close custom colour picker" onClose={closeCustom}>Custom colour</PopoverHeading>
      <GradientStopColour key={channel} colour={resolvedColour} onChange={value => onChange(channel, value)} />
    </div> : null}
  </div>, document.body);
}
