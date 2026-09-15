"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export type StudioRibbonTab = "home" | "insert" | "arrange" | "view" | "export";

const tabs: Array<{ id: StudioRibbonTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "arrange", label: "Arrange" },
  { id: "view", label: "View" },
  { id: "export", label: "Export" },
];

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function StudioRibbon({ activeTab, onTabChange, brand, status, children }: { activeTab: StudioRibbonTab; onTabChange: (tab: StudioRibbonTab) => void; brand: ReactNode; status: ReactNode; children: ReactNode }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return <header className="design-ribbon">
    <div className="design-ribbon-top"><div className="design-ribbon-brand">{brand}</div><div className="design-ribbon-status" aria-live="polite">{status}</div></div>
    <div className="design-ribbon-tabs" role="tablist" aria-label="Design tools">
      {tabs.map((tab, index) => <button ref={(element) => { tabRefs.current[index] = element; }} key={tab.id} id={`design-ribbon-tab-${tab.id}`} type="button" role="tab" className={tab.id === activeTab ? "is-active" : ""} aria-selected={tab.id === activeTab} aria-controls={`design-ribbon-panel-${tab.id}`} tabIndex={tab.id === activeTab ? 0 : -1} onClick={() => onTabChange(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{tab.label}</button>)}
    </div>
    <div className="design-ribbon-content">{children}</div>
  </header>;
}

export function StudioRibbonPanel({ active, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { active: boolean }) {
  return <div className={classes("design-ribbon-panel", className)} role="tabpanel" tabIndex={0} hidden={!active} aria-hidden={!active} {...props}>{children}</div>;
}

export function StudioRibbonGroup({ label, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return <section className={classes("design-ribbon-group", className)} {...props}><div className="design-ribbon-group-controls">{children}</div><span className="design-ribbon-group-label">{label}</span></section>;
}

export const StudioRibbonButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { size?: "compact" | "standard" | "large"; active?: boolean }>(function StudioRibbonButton({ size = "standard", active = false, className, children, ...props }, ref) {
  return <button ref={ref} className={classes("design-ribbon-button", `is-${size}`, active && "is-active", className)} type="button" aria-pressed={props["aria-pressed"] ?? (active || undefined)} {...props}>{children}</button>;
});
