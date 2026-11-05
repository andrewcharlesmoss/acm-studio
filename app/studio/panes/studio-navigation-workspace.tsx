"use client";
import { cloneElement, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { paneControlVisibleLeft } from "./pane-control-clipping";
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
  const workspace = useRef<HTMLDivElement>(null);
  const [controlOffset, setControlOffset] = useState(0);
  useLayoutEffect(() => {
    const root = workspace.current;
    const track = root?.querySelector<HTMLElement>(":scope > .pane-track");
    if (!root || !track) return;
    const coarse = window.matchMedia("(pointer: coarse)");
    function measure() {
      if (!root || !track) return;
      const radius = 13;
      const hitRadius = coarse.matches ? 22 : radius;
      const centre = track.getBoundingClientRect().right + (collapsed ? radius : 0);
      setControlOffset(Math.max(0, paneControlVisibleLeft(root) + hitRadius - centre));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root); observer.observe(track);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    coarse.addEventListener("change", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); coarse.removeEventListener("change", measure); };
  }, [collapsed, width]);
  return <div ref={workspace} className={`studio-navigation-workspace${className ? ` ${className}` : ""}`} role="group" aria-label={label}
    data-navigation-collapsed={collapsed} style={{ "--studio-navigation-workspace-width": `${width}px`, "--studio-navigation-control-offset": `${controlOffset}px` } as CSSProperties}>
    {cloneElement(navigation, { style: { ...navigation.props.style, width: "100%" } })}
    <div className="studio-navigation-workspace-content">{children}</div>
  </div>;
}
