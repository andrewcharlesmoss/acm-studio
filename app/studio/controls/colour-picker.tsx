"use client";

import { createPortal } from "react-dom";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { UNIVERSAL_STYLE_PRESET } from "@acm/styles";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "../studio-icons";

const paletteRoles: { key: keyof typeof UNIVERSAL_STYLE_PRESET.palette; label: string }[] = [
  { key: "surface", label: "Surface" }, { key: "surfaceRaised", label: "Raised surface" },
  { key: "surfaceSubtle", label: "Subtle surface" }, { key: "textPrimary", label: "Text" },
  { key: "textSecondary", label: "Secondary text" }, { key: "border", label: "Border" },
  { key: "accent", label: "Accent" }, { key: "onAccent", label: "Text on accent" },
  { key: "success", label: "Success" }, { key: "information", label: "Information" },
  { key: "alert", label: "Alert" }, { key: "warning", label: "Warning" }, { key: "rating", label: "Rating" },
];

export type ColourPickerTriggerProps = {
  disabled: boolean;
  expanded: boolean;
  controls: string;
  onClick: () => void;
  close: () => void;
};

type ColourPickerProps = {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  hoverValue?: string;
  onHoverChange?: (value: string | undefined) => void;
  warningStates?: string;
  defaultWarning?: boolean;
  hoverWarning?: boolean;
  descriptionId?: string;
  wrapperClassName?: string;
  trigger?: (props: ColourPickerTriggerProps) => ReactNode;
  clearLabel?: string;
  disabled?: boolean;
};

export function ColourPicker({ label, value, onChange, hoverValue, onHoverChange, warningStates, defaultWarning, hoverWarning, descriptionId, wrapperClassName, trigger, clearLabel, disabled = false }: ColourPickerProps) {
  const hasHoverState = Boolean(onHoverChange);
  const [open, setOpen] = useState(false);
  const [activeState, setActiveState] = useState<"default" | "hover">("default");
  const [position, setPosition] = useState({ left: 16, top: 16, width: 280 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteId = useId();
  const activeValue = activeState === "hover" && hasHoverState ? hoverValue : value;
  const activeChange = activeState === "hover" && hasHoverState ? onHoverChange! : onChange;
  const activeWarning = activeState === "hover" ? hoverWarning : defaultWarning;

  useLayoutEffect(() => {
    if (!open) return;
    function positionPalette() {
      const anchor = triggerRef.current ?? rootRef.current?.querySelector<HTMLButtonElement>("button");
      const palette = paletteRef.current;
      if (!anchor || !palette) return;
      const anchorRect = anchor.getBoundingClientRect();
      const inspectorLeft = anchor.closest(".studio-inspector")?.getBoundingClientRect().left ?? anchorRect.left;
      const width = Math.min(280, window.innerWidth - 32);
      setPosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(anchorRect.top, window.innerHeight - palette.getBoundingClientRect().height - 16)),
        width,
      });
    }
    positionPalette();
    window.addEventListener("resize", positionPalette);
    window.addEventListener("scroll", positionPalette, true);
    return () => {
      window.removeEventListener("resize", positionPalette);
      window.removeEventListener("scroll", positionPalette, true);
    };
  }, [open, activeWarning, activeState]);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => (triggerRef.current ?? rootRef.current?.querySelector<HTMLButtonElement>("button"))?.focus());
  }

  useLayoutEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        close();
        return;
      }
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !paletteRef.current?.contains(event.target)) close(false);
    }
    document.addEventListener("keydown", dismiss as EventListener);
    document.addEventListener("pointerdown", dismiss as EventListener);
    return () => {
      document.removeEventListener("keydown", dismiss as EventListener);
      document.removeEventListener("pointerdown", dismiss as EventListener);
    };
  }, [open]);

  const triggerProps: ColourPickerTriggerProps = { disabled, expanded: open, controls: paletteId, onClick: () => { if (!disabled) setOpen(current => !current); }, close: () => setOpen(false) };
  return <div ref={rootRef} className={`inspector-colour-setting paragraph-palette-setting${hasHoverState ? " paragraph-palette-setting--element" : ""}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
    {!trigger && !hasHoverState ? <span>{label}</span> : null}
    {trigger ? trigger(triggerProps) : <div className="paragraph-palette-actions"><button ref={triggerRef} type="button" disabled={disabled} className={`paragraph-palette-trigger${value || hoverValue ? " has-colour" : ""}${hasHoverState ? " has-hover-state" : ""}`} aria-label={hasHoverState ? `Choose ${label} colours` : `Choose ${label}`} aria-describedby={warningStates ? descriptionId : undefined} aria-expanded={open} aria-controls={paletteId} onClick={triggerProps.onClick}>
        <ColourValueSwatch value={value} className="paragraph-palette-default-swatch" />
        {hasHoverState ? <ColourValueSwatch value={hoverValue} overlap className="paragraph-palette-hover-swatch" /> : null}
        {hasHoverState ? <span className="paragraph-palette-trigger-label">{label}</span> : null}
        {warningStates ? <span className="paragraph-palette-warning-icon" title={`Low contrast: ${warningStates.toLowerCase()} link colour`}><AcmIcon name="state.warning" size={18} /><span className="visually-hidden" id={descriptionId}>Low contrast for {warningStates.toLowerCase()} link colour.</span></span> : null}
      </button>
      {!hasHoverState && !clearLabel ? <button type="button" aria-label={`Reset ${label} colour`} onClick={() => onChange(undefined)} disabled={disabled || !value}>Reset</button> : null}
    </div>}
    {open ? createPortal(<div ref={paletteRef} id={paletteId} className="paragraph-colour-palette" role="group" aria-label={`${label} colour palette`} style={position}>
      <div className="paragraph-colour-palette-heading"><strong>{label}</strong><button type="button" aria-label={`Close ${label} palette`} title="Close" onClick={() => close()}><StudioIcon name="close" size={16} /></button></div>
      {hasHoverState ? <div className="paragraph-colour-state-tabs" role="group" aria-label={`${label} colour state`}>
        <button type="button" disabled={disabled} aria-pressed={activeState === "default"} onClick={() => setActiveState("default")}>Default</button>
        <button type="button" disabled={disabled} aria-pressed={activeState === "hover"} onClick={() => setActiveState("hover")}>Hover</button>
      </div> : null}
      <ColourSwatches value={activeValue} onChange={activeChange} disabled={disabled} />
      <label className="paragraph-custom-colour"><span>Custom colour</span><input disabled={disabled} aria-label={`Custom ${label.toLowerCase()} ${hasHoverState ? `${activeState} ` : ""}colour`} type="color" value={activeValue ?? UNIVERSAL_STYLE_PRESET.palette.textPrimary} onChange={event => activeChange(event.target.value)} /></label>
      {hasHoverState || clearLabel ? <button type="button" className={clearLabel ? "paragraph-reset-button" : "paragraph-colour-clear"} disabled={disabled || !activeValue} onClick={() => activeChange(undefined)}>{clearLabel ?? `Clear ${activeState} colour`}</button> : null}
      {hasHoverState && activeWarning ? <div className="paragraph-colour-contrast-warning" role="status"><AcmIcon name="state.warning" size={18} /><span>This link colour has poor contrast against the background. Consider increasing contrast.</span></div> : null}
    </div>, document.body) : null}
  </div>;
}

export function ColourSwatches({ value, onChange, disabled = false }: { value?: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState<{ label: string; target: HTMLButtonElement; left: number; top: number; placement: "above" | "below" } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const anchor = hovered?.target;
  useLayoutEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    const positionTooltip = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !anchor.isConnected) return;
      const bounds = anchor.getBoundingClientRect();
      const tooltipBounds = tooltip.getBoundingClientRect();
      const inset = 8;
      const left = Math.max(inset + tooltipBounds.width / 2, Math.min(bounds.left + bounds.width / 2, window.innerWidth - inset - tooltipBounds.width / 2));
      const above = bounds.top - 8;
      const below = bounds.bottom + 8;
      const fitsAbove = above - tooltipBounds.height >= inset;
      const placement = !fitsAbove && below + tooltipBounds.height <= window.innerHeight - inset ? "below" : "above";
      const top = placement === "above" ? Math.max(inset + tooltipBounds.height, above) : Math.max(inset, Math.min(below, window.innerHeight - inset - tooltipBounds.height));
      setHovered(current => current?.target === anchor ? { ...current, left, top, placement } : current);
    };
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [anchor]);

  return <div className="paragraph-colour-swatches">{paletteRoles.map(({ key, label }) => {
    const colour = UNIVERSAL_STYLE_PRESET.palette[key];
    const selected = value?.toLowerCase() === colour.toLowerCase();
    return <button key={key} type="button" disabled={disabled} className="paragraph-colour-swatch" aria-label={`${label}, ${colour}`} aria-pressed={selected} onMouseEnter={event => setHovered({ label, target: event.currentTarget, left: 0, top: 0, placement: "above" })} onMouseLeave={() => setHovered(null)} onFocus={event => setHovered({ label, target: event.currentTarget, left: 0, top: 0, placement: "above" })} onBlur={() => setHovered(null)} onClick={() => onChange(colour)}>
      <span aria-hidden="true" style={{ backgroundColor: colour }} />
    </button>;
  })}{hovered ? createPortal(<div ref={tooltipRef} className={`paragraph-colour-swatch-tooltip${hovered.placement === "below" ? " is-below" : ""}`} role="tooltip" style={{ left: hovered.left, top: hovered.top }}>{hovered.label}</div>, document.body) : null}</div>;
}

export function ColourValueSwatch({ value, overlap = false, className = "" }: { value?: string; overlap?: boolean; className?: string }) {
  return <span className={`studio-colour-value-swatch${overlap ? " is-overlapped" : ""}${value ? " has-colour" : " is-unset"}${className ? ` ${className}` : ""}`} aria-hidden="true" style={value ? { backgroundColor: value } : undefined} />;
}
