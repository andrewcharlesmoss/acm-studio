"use client";

import { StudioButton } from "./button";
import { watchInspectorPopover } from "../panes/inspector-popover-position";
import { createPortal } from "react-dom";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { UNIVERSAL_STYLE_PRESET } from "@acm/styles";
import { AcmIcon } from "@acm/icons/react";
import { GradientStopColour } from "./gradient-stop-colour";
import { PopoverHeading } from "../overlays/popover-heading";
import { useOverlayDismiss } from "../overlays/use-overlay-dismiss";
import { StudioIcon } from "../studio-icons";

const paletteRoles: { key: keyof typeof UNIVERSAL_STYLE_PRESET.palette; label: string }[] = [
  { key: "surface", label: "Surface" }, { key: "surfaceRaised", label: "Raised surface" },
  { key: "surfaceSubtle", label: "Subtle surface" }, { key: "textPrimary", label: "Text" },
  { key: "textSecondary", label: "Secondary text" }, { key: "border", label: "Border" },
  { key: "accent", label: "Accent" }, { key: "onAccent", label: "Text on accent" },
  { key: "success", label: "Success" }, { key: "information", label: "Information" },
  { key: "alert", label: "Alert" }, { key: "warning", label: "Warning" }, { key: "rating", label: "Rating" },
];

export type ColourPaletteEntry = { key: string; label: string; colour: string; token?: string };
const interfacePalette: readonly ColourPaletteEntry[] = paletteRoles.map(({ key, label }) => ({ key, label, colour: UNIVERSAL_STYLE_PRESET.palette[key], token: `--acm-color-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}` }));

export type ColourPickerTriggerProps = {
  disabled: boolean;
  expanded: boolean;
  controls: string;
  onClick: () => void;
  close: () => void;
};

type ColourPickerProps = {
  label: string;
  palette?: readonly ColourPaletteEntry[];
  enableAlpha?: boolean;
  value?: string;
  onChange: (value: string | undefined) => void;
  hoverValue?: string;
  onHoverChange?: (value: string | undefined) => void;
  warningStates?: string;
  defaultWarning?: boolean;
  hoverWarning?: boolean;
  warningMessage?: string;
  hoverWarningMessage?: string;
  announceWarning?: boolean;
  descriptionId?: string;
  wrapperClassName?: string;
  paletteClassName?: string;
  trigger?: (props: ColourPickerTriggerProps) => ReactNode;
  clearLabel?: string;
  allowClear?: boolean;
  disabled?: boolean;
  additionalControls?: ReactNode;
  beforeControls?: ReactNode;
  hideColourControls?: boolean;
  onSelectPalette?: (entry: ColourPaletteEntry, state: "default" | "hover") => void;
};

export function ColourPicker({ label, value, onChange, hoverValue, onHoverChange, warningStates, defaultWarning, hoverWarning, warningMessage, hoverWarningMessage, announceWarning = true, descriptionId, wrapperClassName, paletteClassName, trigger, clearLabel, allowClear = true, disabled = false, additionalControls, beforeControls, hideColourControls = false, onSelectPalette, palette = interfacePalette, enableAlpha = false }: ColourPickerProps) {
  const colourLabel = /colour$/i.test(label) ? label : `${label} colour`;
  const hasHoverState = Boolean(onHoverChange);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPosition, setCustomPosition] = useState({ left: 16, top: 16, width: 260 });
  const customRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const customCloseRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeState, setActiveState] = useState<"default" | "hover">("default");
  const [selectedPaletteRoles, setSelectedPaletteRoles] = useState<Partial<Record<"default" | "hover", { key: string; value: string }>>>({});
  const [position, setPosition] = useState({ left: 16, top: 16, width: 262, swatchSize: 28, swatchColumns: 6 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteId = useId();
  const activeValue = activeState === "hover" && hasHoverState ? hoverValue : value;
  const activeChange = activeState === "hover" && hasHoverState ? onHoverChange! : onChange;
  const activeWarning = activeState === "hover" ? hoverWarning : defaultWarning;
  const activeWarningMessage = activeState === "hover" ? hoverWarningMessage : warningMessage;
  const savedPaletteRole = selectedPaletteRoles[activeState];
  const matchingPaletteRoles = palette.filter(({ colour }) => activeValue?.toLowerCase() === colour.toLowerCase());
  const selectedPaletteRole = savedPaletteRole && savedPaletteRole.value.toLowerCase() === activeValue?.toLowerCase()
    ? savedPaletteRole.key
    : matchingPaletteRoles.length === 1 ? matchingPaletteRoles[0].key : undefined;

  const selectedRole = palette.find(role => role.key === selectedPaletteRole);
  const cssToken = selectedRole?.token ?? activeValue ?? "";
  function changeActiveColour(nextValue?: string) {
    if (disabled || (!allowClear && nextValue === undefined)) return;
    setSelectedPaletteRoles(current => {
      const next = { ...current };
      delete next[activeState];
      return next;
    });
    activeChange(nextValue);
  }

  function selectPaletteRole(key: string, colour: string) {
    setSelectedPaletteRoles(current => ({ ...current, [activeState]: { key, value: colour } }));
    const entry = palette.find(item => item.key === key);
    if (entry) onSelectPalette?.(entry, activeState);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = triggerRef.current ?? rootRef.current?.querySelector<HTMLButtonElement>("button") ?? null;
    return watchInspectorPopover(anchor, paletteRef.current, 262, next => {
      const swatchGridWidth = next.width - 34;
      const swatchColumns = Math.max(3, Math.min(6, Math.floor((swatchGridWidth + 12) / 40)));
      const swatchSize = Math.min(28, (swatchGridWidth - (swatchColumns - 1) * 12) / swatchColumns);
      setPosition({ ...next, swatchSize, swatchColumns });
    }, { allowOwnerOverlap: true });
  }, [open, activeWarning, activeState, customOpen]);

  function close(restoreFocus = true) {
    setOpen(false);
    setCustomOpen(false);
    if (restoreFocus) requestAnimationFrame(() => (triggerRef.current ?? rootRef.current?.querySelector<HTMLButtonElement>("button"))?.focus());
  }

  useLayoutEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useLayoutEffect(() => {
    if (!customOpen) return;
    customCloseRef.current?.focus();
    return watchInspectorPopover(previewRef.current, customRef.current, 260, setCustomPosition, { ownerAnchor: rootRef.current, leftBoundary: paletteRef.current });
  }, [customOpen]);
  useOverlayDismiss({
    open,
    onEscape: () => {
      if (customOpen) { setCustomOpen(false); requestAnimationFrame(() => previewRef.current?.focus()); }
      else close();
    },
    onOutside: target => {
      if (!rootRef.current?.contains(target) && !paletteRef.current?.contains(target)) close(false);
      else if (customOpen && !customRef.current?.contains(target) && !previewRef.current?.contains(target)) setCustomOpen(false);
    },
  });

  const triggerProps: ColourPickerTriggerProps = { disabled, expanded: open, controls: paletteId, onClick: () => { if (!disabled) setOpen(current => !current); setCustomOpen(false); }, close: () => { setOpen(false); setCustomOpen(false); } };
  return <div ref={rootRef} className={`inspector-colour-setting paragraph-palette-setting${hasHoverState ? " paragraph-palette-setting--element" : ""}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
    {!trigger && !hasHoverState ? <span>{label}</span> : null}
    {trigger ? trigger(triggerProps) : <div className="paragraph-palette-actions"><button ref={triggerRef} type="button" disabled={disabled} className={`paragraph-palette-trigger${value || hoverValue ? " has-colour" : ""}${hasHoverState ? " has-hover-state" : ""}`} aria-label={hasHoverState ? `Choose ${label} colours` : `Choose ${label}`} aria-describedby={warningStates ? descriptionId : undefined} aria-expanded={open} aria-controls={paletteId} onClick={triggerProps.onClick}>
        <ColourValueSwatch value={value} className="paragraph-palette-default-swatch" />
        {hasHoverState ? <ColourValueSwatch value={hoverValue} overlap className="paragraph-palette-hover-swatch" /> : null}
        {hasHoverState ? <span className="paragraph-palette-trigger-label">{label}</span> : null}
        {warningStates ? <span className="paragraph-palette-warning-icon" title={`Colour warning: ${warningStates.toLowerCase()} link colour`}><AcmIcon name="state.warning" size={18} /><span className="visually-hidden" id={descriptionId}>Colour warning for {warningStates.toLowerCase()} link colour.</span></span> : null}
      </button>
      {allowClear && !hasHoverState && !clearLabel ? <button type="button" aria-label={`Reset ${label} colour`} onClick={() => onChange(undefined)} disabled={disabled || !value}>Reset</button> : null}
    </div>}
    {open ? createPortal(<div ref={paletteRef} id={paletteId} className={`paragraph-colour-palette paragraph-theme-colour-palette${paletteClassName ? ` ${paletteClassName}` : ""}`} role="dialog" aria-label={`${colourLabel} palette`} style={{ left: position.left, top: position.top, width: position.width, "--colour-swatch-size": `${position.swatchSize}px`, "--colour-swatch-columns": position.swatchColumns } as CSSProperties}>
      <PopoverHeading closeRef={closeRef} closeLabel={`Close ${label} palette`} onClose={() => close()}>{label}</PopoverHeading>
      {hasHoverState ? <div className="paragraph-colour-state-tabs" role="group" aria-label={`${label} colour state`}>
        <button type="button" disabled={disabled} aria-pressed={activeState === "default"} onClick={() => { setActiveState("default"); setCustomOpen(false); }}>Default</button>
        <button type="button" disabled={disabled} aria-pressed={activeState === "hover"} onClick={() => { setActiveState("hover"); setCustomOpen(false); }}>Hover</button>
      </div> : null}
      {beforeControls}
      {!hideColourControls ? <><div className="paragraph-colour-preview-card">
        <button ref={previewRef} type="button" className="paragraph-colour-preview" disabled={disabled} aria-label={`Custom ${colourLabel.toLowerCase()} picker`} aria-haspopup="dialog" aria-expanded={customOpen} onClick={() => setCustomOpen(current => !current)} style={activeValue ? { backgroundImage: `linear-gradient(${activeValue}, ${activeValue}), var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" } : undefined} />
        <div><span>{activeValue ? selectedRole?.label ?? "Custom colour" : "No colour selected"}</span><span className="paragraph-colour-preview-value" title={cssToken}>{cssToken || " "}</span></div>
      </div>
      <strong className="paragraph-colour-theme-heading">THEME</strong>
      <ColourSwatches palette={palette} value={activeValue} selectedRole={selectedPaletteRole ?? null} onSelectRole={selectPaletteRole} onChange={onSelectPalette ? () => {} : activeChange} onClear={allowClear ? () => changeActiveColour(undefined) : undefined} disabled={disabled} />
      {allowClear && activeValue ? <StudioButton variant="text" type="button" className="paragraph-colour-clear" disabled={disabled} onClick={() => changeActiveColour(undefined)}>Clear</StudioButton> : null}
      </> : null}
      {additionalControls}
      {customOpen && !hideColourControls ? <div ref={customRef} className="paragraph-colour-palette paragraph-custom-colour-popup" role="dialog" aria-label={`Custom ${colourLabel.toLowerCase()}`} style={customPosition}>
        <PopoverHeading closeRef={customCloseRef} closeLabel="Close custom colour picker" onClose={() => { setCustomOpen(false); requestAnimationFrame(() => previewRef.current?.focus()); }}>Custom colour</PopoverHeading>
        <GradientStopColour colour={activeValue && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(activeValue) ? activeValue : "#FFFFFF"} onChange={changeActiveColour} enableAlpha={enableAlpha} deferPointerChange disabled={disabled} />
      </div> : null}
      {activeWarning ? <div className="paragraph-colour-contrast-warning" role={announceWarning ? "status" : undefined}><AcmIcon name="state.warning" size={18} /><span>{activeWarningMessage ?? (hasHoverState ? "This link colour has poor contrast against the background. Consider increasing contrast." : "This colour combination has poor contrast. Consider increasing contrast between background and foreground.")}</span></div> : null}
    </div>, document.body) : null}
  </div>;
}

// Omit selectedRole for legacy value matching; null explicitly means no palette role is selected.
export function ColourSwatches({ value, selectedRole, onChange, onSelectRole, onClear, disabled = false, palette = interfacePalette }: { palette?: readonly ColourPaletteEntry[]; value?: string; selectedRole?: string | null; onChange: (value: string) => void; onClear?: () => void; onSelectRole?: (role: string, value: string) => void; disabled?: boolean }) {
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

  return <div className="paragraph-colour-swatches">{palette.map(({ key, label, colour }) => {
    const selected = selectedRole === null ? false : selectedRole ? selectedRole === key : value?.toLowerCase() === colour.toLowerCase();
    return <button key={key} type="button" disabled={disabled} className={`paragraph-colour-swatch${/^#[0-9a-f]{8}$/i.test(colour) ? " has-transparency" : ""}`} aria-label={`${label}, ${colour}`} aria-pressed={selected} onMouseEnter={event => setHovered({ label, target: event.currentTarget, left: 0, top: 0, placement: "above" })} onMouseLeave={() => setHovered(null)} onFocus={event => setHovered({ label, target: event.currentTarget, left: 0, top: 0, placement: "above" })} onBlur={() => setHovered(null)} onClick={() => { if (selected && onClear) { onClear(); return; } onSelectRole?.(key, colour); onChange(colour); }}>
      <span aria-hidden="true" style={{ backgroundImage: `linear-gradient(${colour}, ${colour})${/^#[0-9a-f]{8}$/i.test(colour) ? ", var(--studio-palette-transparency-pattern)" : ""}`, backgroundSize: "auto, var(--studio-palette-transparency-size)" }}>{selected ? <StudioIcon name="check" size={18} style={{ color: colourSwatchCheckColour(colour) }} /> : null}</span>
    </button>;
  })}{hovered ? createPortal(<div ref={tooltipRef} className={`paragraph-colour-swatch-tooltip${hovered.placement === "below" ? " is-below" : ""}`} role="tooltip" style={{ left: hovered.left, top: hovered.top }}>{hovered.label}</div>, document.body) : null}</div>;
}

/** Composite translucent swatches on their light checkerboard before choosing the check colour. */
export function colourSwatchCheckColour(colour: string): string {
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(colour)) return "#1e1e1e";
  const alpha = colour.length === 9 ? parseInt(colour.slice(7), 16) / 255 : 1;
  const channels = [1, 3, 5].map(start => parseInt(colour.slice(start, start + 2), 16) * alpha + 255 * (1 - alpha));
  return channels[0] * .299 + channels[1] * .587 + channels[2] * .114 > 160 ? "#1e1e1e" : "#fff";
}

export function ColourValueSwatch({ value, overlap = false, className = "" }: { value?: string; overlap?: boolean; className?: string }) {
  return <span className={`studio-colour-value-swatch${overlap ? " is-overlapped" : ""}${value ? " has-colour" : " is-unset"}${className ? ` ${className}` : ""}`} aria-hidden="true" style={value ? { backgroundImage: `linear-gradient(${value}, ${value}), var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" } : undefined} />;
}
