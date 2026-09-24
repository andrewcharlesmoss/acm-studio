"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties, type ReactElement, type ReactNode, type Ref } from "react";
import "./pane-components.css";

export type PaneSide = "left" | "right";
export type PaneProps = {
  label: string;
  side: PaneSide;
  width: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  collapseIcon: ReactNode;
  collapsible?: boolean;
  inert?: boolean;
  trackClassName?: string;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  header?: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function PaneCollapseButton({ side, collapsed, label, controls, icon, onClick, buttonRef }: {
  side: PaneSide; collapsed: boolean; label: string; controls: string;
  icon: ReactNode; onClick: () => void; buttonRef?: Ref<HTMLButtonElement>;
}) {
  const action = `${collapsed ? "Show" : "Hide"} ${label}`;
  return <button ref={buttonRef} type="button" className="pane-collapse" data-side={side}
    data-collapsed={collapsed} data-pane-region={`${side}.collapse`} aria-label={action}
    title={action} aria-expanded={!collapsed} aria-controls={controls} onClick={onClick}>{icon}</button>;
}

export function Pane({ label, side, width, collapsed, onCollapsedChange, collapseIcon, collapsible = true, inert, trackClassName, className, bodyClassName, style, header, tabs, toolbar, footer, children }: PaneProps) {
  const id = useId();
  const container = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);
  const focusWasInside = useRef(false);
  useLayoutEffect(() => {
    if (collapsed && (focusWasInside.current || container.current?.contains(document.activeElement))) {
      toggle.current?.focus();
      focusWasInside.current = false;
    }
    if (!collapsed && body.current) body.current.scrollTop = scrollPosition.current;
  }, [collapsed]);
  function changeCollapsed() {
    if (!collapsed && container.current?.contains(document.activeElement)) toggle.current?.focus();
    onCollapsedChange(!collapsed);
  }
  return <div className={`pane-track${trackClassName ? ` ${trackClassName}` : ""}`} data-side={side} data-collapsed={collapsed}
    style={{ "--pane-width": `${width}px` } as CSSProperties}>
    <aside ref={container} id={id} className={`pane${className ? ` ${className}` : ""}`} aria-label={label} hidden={collapsed} inert={inert}
      style={style}
      data-pane-region={side} onFocusCapture={() => { focusWasInside.current = true; }}
      onBlurCapture={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusWasInside.current = false; }}>
      {header != null && <header className="pane-header" data-pane-region={`${side}.header`}>{header}</header>}
      {tabs != null && <div className="pane-tabs-region" data-pane-region={`${side}.tabs`}>{tabs}</div>}
      {toolbar != null && <div className="pane-toolbar" data-pane-region={`${side}.toolbar`}>{toolbar}</div>}
      <div ref={body} className={`pane-body${bodyClassName ? ` ${bodyClassName}` : ""}`} data-pane-region={`${side}.body`}
        onScroll={(event) => { if (!collapsed) scrollPosition.current = event.currentTarget.scrollTop; }}>{children}</div>
      {footer != null && <footer className="pane-footer" data-pane-region={`${side}.footer`}>{footer}</footer>}
    </aside>
    {collapsible ? <PaneCollapseButton buttonRef={toggle} side={side} collapsed={collapsed} label={label}
      controls={id} icon={collapseIcon} onClick={changeCollapsed} /> : null}
  </div>;
}

export function PaneWorkspace({ left, right, children, label = "Pane workspace", className, centreClassName, style }: {
  left?: ReactElement<PaneProps>; right?: ReactElement<PaneProps>; children: ReactNode; label?: string;
  className?: string; centreClassName?: string; style?: CSSProperties;
}) {
  const leftWidth = left && !left.props.collapsed ? left.props.width : 0;
  const rightWidth = right && !right.props.collapsed ? right.props.width : 0;
  return <div className={`pane-workspace${className ? ` ${className}` : ""}`} role="group" aria-label={label} data-pane-region="workspace"
    style={{ "--pane-left-width": `${leftWidth}px`, "--pane-right-width": `${rightWidth}px`, ...style } as CSSProperties}>
    {left ?? <div />}
    <div className={`pane-centre${centreClassName ? ` ${centreClassName}` : ""}`} data-pane-region="centre">{children}</div>
    {right ?? <div />}
  </div>;
}

export function PaneSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <section className="pane-section" aria-labelledby={id}><h3 id={id}>{title}</h3>{children}</section>;
}

export type PaneTab = { id: string; label: string; disabled?: boolean };
export function paneTabTarget(prefix: string, tab: string, kind: "tab" | "panel") {
  return `${prefix}-${kind}-${tab}`;
}

export function PaneTabs({ id, label, tabs, active, onChange, renderLabel, className }: {
  id: string; label: string; tabs: readonly PaneTab[]; active: string; onChange: (id: string) => void;
  renderLabel?: (tab: PaneTab) => ReactNode;
  className?: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className={`pane-tabs${className ? ` ${className}` : ""}`} role="tablist" aria-label={label}>{tabs.map((tab, index) =>
    <button key={tab.id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab"
      id={paneTabTarget(id, tab.id, "tab")} aria-controls={paneTabTarget(id, tab.id, "panel")}
      aria-selected={active === tab.id} tabIndex={active === tab.id && !tab.disabled ? 0 : -1} disabled={tab.disabled}
      onClick={() => onChange(tab.id)} onKeyDown={(event) => {
        const enabledTabs = tabs.filter((item) => !item.disabled);
        const currentIndex = enabledTabs.findIndex((item) => item.id === tab.id);
        if (currentIndex < 0) return;
        let next: number;
        switch (event.key) {
          case "ArrowRight": next = (currentIndex + 1) % enabledTabs.length; break;
          case "ArrowLeft": next = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length; break;
          case "Home": next = 0; break;
          case "End": next = enabledTabs.length - 1; break;
          default: return;
        }
        event.preventDefault(); onChange(enabledTabs[next].id); buttons.current[tabs.indexOf(enabledTabs[next])]?.focus();
      }}>{renderLabel ? renderLabel(tab) : tab.label}</button>)}</div>;
}

export function PaneTabPanel({ id, tab, active, className, children }: { id: string; tab: string; active: string; className?: string; children: ReactNode }) {
  return <div className={className} role="tabpanel" id={paneTabTarget(id, tab, "panel")} aria-labelledby={paneTabTarget(id, tab, "tab")}
    hidden={active !== tab} tabIndex={0}>{children}</div>;
}
