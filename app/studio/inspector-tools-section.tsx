"use client";

import { StudioButton } from "./controls/button";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { StudioIcon } from "./studio-icons";
import { useInspectorContentDisabled } from "./inspector-accordion";

export type InspectorToolOption = { id: string; label: string; source?: "gutenberg" | "studio"; disabled?: boolean };
export type InspectorMenuOption = { id: string; label: string; checked?: boolean; disabled?: boolean };

export function InspectorToolsSection({ title, options, visible, canReset, alwaysShow = false, showCloseControl = true, menuWidth = 240, allowMenuOverlap = false, resettableOptions = new Set<string>(), onResetOption, menuOptions = [], onMenuOptionSelect, onToggle, onReset, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  canReset?: boolean;
  alwaysShow?: boolean;
  showCloseControl?: boolean;
  menuWidth?: number;
  allowMenuOverlap?: boolean;
  resettableOptions?: ReadonlySet<string>;
  onResetOption?: (id: string) => void;
  menuOptions?: readonly InspectorMenuOption[];
  onMenuOptionSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const disabled = useInspectorContentDisabled();
  return <InspectorToolsSectionContent key={String(disabled)} title={title} options={options} visible={visible} canReset={canReset ?? (visible.size > 0)} alwaysShow={alwaysShow} showCloseControl={showCloseControl} menuWidth={menuWidth} allowMenuOverlap={allowMenuOverlap} resettableOptions={resettableOptions} onResetOption={onResetOption} menuOptions={menuOptions} onMenuOptionSelect={onMenuOptionSelect} onToggle={onToggle} onReset={onReset} disabled={disabled}>{children}</InspectorToolsSectionContent>;
}

function InspectorToolsSectionContent({ title, options, visible, canReset, alwaysShow, showCloseControl, menuWidth, allowMenuOverlap, resettableOptions, onResetOption, menuOptions, onMenuOptionSelect, onToggle, onReset, disabled, children }: {
  title: string;
  options: readonly InspectorToolOption[];
  visible: ReadonlySet<string>;
  canReset: boolean;
  alwaysShow: boolean;
  showCloseControl: boolean;
  menuWidth: number;
  allowMenuOverlap: boolean;
  resettableOptions: ReadonlySet<string>;
  onResetOption?: (id: string) => void;
  menuOptions: readonly InspectorMenuOption[];
  onMenuOptionSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const gutenbergOptions = options.filter(option => option.source !== "studio");
  const studioOptions = options.filter(option => option.source === "studio");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function closeOtherMenu(event: Event) {
      if ((event as CustomEvent<string>).detail !== menuId) setMenuOpen(false);
    }
    document.addEventListener("studio-inspector-tools-open", closeOtherMenu);
    return () => document.removeEventListener("studio-inspector-tools-open", closeOtherMenu);
  }, [menuId]);

  function renderToggle(option: InspectorToolOption) {
    const checked = visible.has(option.id);
    const resettable = resettableOptions.has(option.id) && Boolean(onResetOption);
    const label = option.source === "studio" ? <span>{option.label}<StudioSourceBadge /></span> : option.label;
    return <div key={option.id} className="inspector-tools-menu-option">
      <button type="button" className="inspector-tools-menu-option-toggle" disabled={option.disabled} aria-pressed={checked} onClick={() => onToggle(option.id)}>{label}{checked && !resettable ? <StudioIcon name="check" size={16} /> : null}</button>
      {resettable ? <StudioButton variant="text" type="button" className="inspector-tools-menu-option-reset" aria-label={`Reset ${option.label}`} title={`Reset ${option.label}`} onClick={event => {
        const row = event.currentTarget.parentElement;
        onResetOption?.(option.id);
        requestAnimationFrame(() => row?.querySelector<HTMLButtonElement>(".inspector-tools-menu-option-toggle")?.focus());
      }}>Reset</StudioButton> : null}
    </div>;
  }

  return <section ref={rootRef} className={`inspector-panel inspector-tools-section${visible.size || alwaysShow ? "" : " is-compact"}`}>
    <div className="inspector-tools-heading">
      <h2>{title}</h2>
      <button ref={triggerRef} type="button" className="inspector-tools-trigger" aria-label={`${title} options`} aria-expanded={menuOpen && !disabled} aria-controls={menuId} disabled={disabled} onClick={() => { if (!menuOpen) document.dispatchEvent(new CustomEvent("studio-inspector-tools-open", { detail: menuId })); setMenuOpen(open => !open); }}><StudioIcon name={visible.size ? "more-vertical" : "add"} size={18} /></button>
      {menuOpen && !disabled ? <StudioAnchoredPopover id={menuId} anchor={() => triggerRef.current} inspectorPlacement allowInspectorOverlap={allowMenuOverlap} preferredWidth={menuWidth} role="group" focusOnMount label={`${title} controls`} className="inspector-tools-menu" onClose={restore => { setMenuOpen(false); if (restore) triggerRef.current?.focus(); }}>
        <div className="inspector-tools-menu-heading"><span className="inspector-tools-menu-title">{title}</span>{showCloseControl ? <button type="button" className="inspector-tools-menu-close" aria-label={`Close ${title} options`} onClick={() => { setMenuOpen(false); triggerRef.current?.focus(); }}><StudioIcon name="close" size={16} /></button> : null}</div>
        <div className="inspector-tools-menu-body">
          {menuOptions.length ? <div className="inspector-tools-menu-options" aria-label="Visible controls">{menuOptions.map(option => <button key={option.id} type="button" disabled={option.disabled} aria-pressed={option.checked} onClick={() => onMenuOptionSelect?.(option.id)}>{option.label}{option.checked ? <StudioIcon name="check" size={16} /> : null}</button>)}</div> : null}
          {gutenbergOptions.length ? <div className="inspector-tools-menu-options" aria-label="Gutenberg options">{gutenbergOptions.map(renderToggle)}</div> : null}
          {studioOptions.length ? <>
            {gutenbergOptions.length ? <div className="inspector-tools-menu-divider" role="separator" /> : null}
            <div className="inspector-tools-menu-options" aria-label="Studio options">{studioOptions.map(renderToggle)}</div>
          </> : null}
        </div>
        <StudioButton variant="text" type="button" className="inspector-tools-reset" disabled={!canReset} onClick={() => { onReset(); setMenuOpen(false); triggerRef.current?.focus(); }}>Reset all</StudioButton>
      </StudioAnchoredPopover> : null}
    </div>
    {visible.size || alwaysShow ? disabled ? <fieldset className="inspector-tools-content" disabled>{children}</fieldset> : <div className="inspector-tools-content">{children}</div> : null}
  </section>;
}

export function StudioSourceBadge() {
  return <span className="studio-source-badge" title="Not shown in the current Gutenberg reference; availability may depend on WordPress settings or the active theme">Studio</span>;
}
