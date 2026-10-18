"use client";
import { cloneElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { PaneProps } from "./pane-components";
import { twoLeftPaneWidths } from "./two-left-pane-layout";
import "./two-left-pane-workspace.css";

/** Shared placement only. Callers supply Pane content, widths, collapse state and commands. */
export function TwoLeftPaneWorkspace({ primary, secondary, children, label = "Two left pane workspace", className = "", contentClassName = "" }: {
  primary: ReactElement<PaneProps>; secondary: ReactElement<PaneProps>; children: ReactNode;
  label?: string; className?: string; contentClassName?: string;
}) {
  function pane(element: ReactElement<PaneProps>) {
    return cloneElement(element, { side: "left", style: { ...element.props.style, width: "100%" } });
  }
  return <div className={`two-left-pane-workspace ${className}`}>
    <div className="two-left-pane-layout" role="group" aria-label={label} style={twoLeftPaneWidths(primary.props, secondary.props) as CSSProperties}>
      <div className="two-left-pane-slot two-left-pane-primary" data-collapsed={primary.props.collapsed}>{pane(primary)}</div>
      <div className="two-left-pane-slot two-left-pane-secondary" data-collapsed={secondary.props.collapsed}>{pane(secondary)}</div>
      <div className={`two-left-pane-content ${contentClassName}`}>{children}</div>
    </div>
  </div>;
}
