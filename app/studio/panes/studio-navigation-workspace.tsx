import { cloneElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { PaneProps } from "./pane-components";
import "./studio-navigation-workspace.css";

/** Places Studio navigation beside a feature workspace built from shared panes. */
export function StudioNavigationWorkspace({ navigation, children, label = "Studio workspace", className = "" }: {
  navigation: ReactElement<PaneProps>;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const collapsed = navigation.props.collapsed;
  const width = collapsed ? 0 : navigation.props.width;
  return <div className={`studio-navigation-workspace${className ? ` ${className}` : ""}`} role="group" aria-label={label}
    data-navigation-collapsed={collapsed} style={{ "--studio-navigation-workspace-width": `${width}px` } as CSSProperties}>
    {cloneElement(navigation, { style: { ...navigation.props.style, width: "100%" } })}
    <div className="studio-navigation-workspace-content">{children}</div>
  </div>;
}
