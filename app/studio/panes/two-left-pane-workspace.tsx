"use client";
import { cloneElement, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { PaneProps } from "./pane-components";
import { twoLeftPaneControls, twoLeftPaneWidths } from "./two-left-pane-layout";
import "./two-left-pane-workspace.css";

/** Shared placement only. Callers supply Pane content, widths, collapse state and commands. */
export function TwoLeftPaneWorkspace({ primary, secondary, children, label = "Two left pane workspace", className = "", contentClassName = "" }: {
  primary: ReactElement<PaneProps>; secondary: ReactElement<PaneProps>; children: ReactNode;
  label?: string; className?: string; contentClassName?: string;
}) {
  const layout = useRef<HTMLDivElement>(null);
  const primarySlot = useRef<HTMLDivElement>(null);
  const secondarySlot = useRef<HTMLDivElement>(null);
  const [primaryHost, setPrimaryHost] = useState<HTMLDivElement | null>(null);
  const [secondaryHost, setSecondaryHost] = useState<HTMLDivElement | null>(null);
  const [controls, setControls] = useState({ primary: { left: 0, top: 0 }, secondary: { left: 0, top: 0 } });
  const primaryClosed = primary.props.collapsed;
  const secondaryClosed = secondary.props.collapsed;
  useLayoutEffect(() => {
    const root = layout.current;
    const first = primarySlot.current;
    const second = secondarySlot.current;
    if (!root || !first || !second) return;
    function measure() {
      if (!root || !first || !second) return;
      const workspace = root.getBoundingClientRect();
      function box(element: HTMLElement, collapsed: boolean) {
        const rect = element.getBoundingClientRect();
        return { left: rect.left - workspace.left, top: rect.top - workspace.top, width: rect.width, height: rect.height, collapsed };
      }
      const next = twoLeftPaneControls(box(first, primaryClosed), box(second, secondaryClosed), workspace.height);
      setControls(previous => previous.primary.left === next.primary.left && previous.primary.top === next.primary.top && previous.secondary.left === next.secondary.left && previous.secondary.top === next.secondary.top ? previous : next);
    }
    measure();
    const observer = new ResizeObserver(measure);
    [root, first, second].forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [primaryClosed, secondaryClosed]);
  function pane(element: ReactElement<PaneProps>, host: HTMLElement | null) {
    return cloneElement(element, { side: "left", collapseControlHost: host, style: { ...element.props.style, width: "100%" } });
  }
  return <div className={`two-left-pane-workspace ${className}`}>
    <div ref={layout} className="two-left-pane-layout" role="group" aria-label={label} style={twoLeftPaneWidths(primary.props, secondary.props) as CSSProperties}>
      <div ref={primarySlot} className="two-left-pane-slot two-left-pane-primary" data-collapsed={primaryClosed}>{pane(primary, primaryHost)}</div>
      <div ref={secondarySlot} className="two-left-pane-slot two-left-pane-secondary" data-collapsed={secondaryClosed}>{pane(secondary, secondaryHost)}</div>
      <div className={`two-left-pane-content ${contentClassName}`}>{children}</div>
      <div className="two-left-pane-control-layer pane-control-host" role="group" aria-label="Pane controls">
        <div ref={setPrimaryHost} className="two-left-pane-control" data-at-start={controls.primary.left === 0} style={controls.primary} />
        <div ref={setSecondaryHost} className="two-left-pane-control" data-at-start={controls.secondary.left === 0} style={controls.secondary} />
      </div>
    </div>
  </div>;
}
