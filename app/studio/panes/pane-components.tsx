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

export function Pane({ label, side, width, collapsed, onCollapsedChange, collapseIcon, header, tabs, toolbar, footer, children }: PaneProps) {
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
  return <div className="pane-track" data-side={side} data-collapsed={collapsed}
    style={{ "--pane-width": `${width}px` } as CSSProperties}>
    <aside ref={container} id={id} className="pane" aria-label={label} hidden={collapsed}
      data-pane-region={side} onFocusCapture={() => { focusWasInside.current = true; }}
      onBlurCapture={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusWasInside.current = false; }}>
      {header != null && <header className="pane-header" data-pane-region={`${side}.header`}>{header}</header>}
      {tabs != null && <div className="pane-tabs-region" data-pane-region={`${side}.tabs`}>{tabs}</div>}
      {toolbar != null && <div className="pane-toolbar" data-pane-region={`${side}.toolbar`}>{toolbar}</div>}
      <div ref={body} className="pane-body" data-pane-region={`${side}.body`}
        onScroll={(event) => { if (!collapsed) scrollPosition.current = event.currentTarget.scrollTop; }}>{children}</div>
      {footer != null && <footer className="pane-footer" data-pane-region={`${side}.footer`}>{footer}</footer>}
    </aside>
    <PaneCollapseButton buttonRef={toggle} side={side} collapsed={collapsed} label={label}
      controls={id} icon={collapseIcon} onClick={changeCollapsed} />
  </div>;
}

export function PaneWorkspace({ left, right, children, label = "Pane workspace" }: {
  left?: ReactElement<PaneProps>; right?: ReactElement<PaneProps>; children: ReactNode; label?: string;
}) {
  const leftWidth = left && !left.props.collapsed ? left.props.width : 0;
  const rightWidth = right && !right.props.collapsed ? right.props.width : 0;
  return <div className="pane-workspace" role="group" aria-label={label} data-pane-region="workspace"
    style={{ "--pane-left-width": `${leftWidth}px`, "--pane-right-width": `${rightWidth}px` } as CSSProperties}>
    {left ?? <div />}
    <div className="pane-centre" data-pane-region="centre">{children}</div>
    {right ?? <div />}
  </div>;
}

export function PaneSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <section className="pane-section" aria-labelledby={id}><h3 id={id}>{title}</h3>{children}</section>;
}

export type PaneTab = { id: string; label: string };
export function paneTabTarget(prefix: string, tab: string, kind: "tab" | "panel") {
  return `${prefix}-${kind}-${tab}`;
}

export function PaneTabs({ id, label, tabs, active, onChange }: {
  id: string; label: string; tabs: readonly PaneTab[]; active: string; onChange: (id: string) => void;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className="pane-tabs" role="tablist" aria-label={label}>{tabs.map((tab, index) =>
    <button key={tab.id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab"
      id={paneTabTarget(id, tab.id, "tab")} aria-controls={paneTabTarget(id, tab.id, "panel")}
      aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1}
      onClick={() => onChange(tab.id)} onKeyDown={(event) => {
        let next: number;
        switch (event.key) {
          case "ArrowRight": next = (index + 1) % tabs.length; break;
          case "ArrowLeft": next = (index - 1 + tabs.length) % tabs.length; break;
          case "Home": next = 0; break;
          case "End": next = tabs.length - 1; break;
          default: return;
        }
        event.preventDefault(); onChange(tabs[next].id); buttons.current[next]?.focus();
      }}>{tab.label}</button>)}</div>;
}

export function PaneTabPanel({ id, tab, active, children }: { id: string; tab: string; active: string; children: ReactNode }) {
  return <div role="tabpanel" id={paneTabTarget(id, tab, "panel")} aria-labelledby={paneTabTarget(id, tab, "tab")}
    hidden={active !== tab} tabIndex={0}>{children}</div>;
}
