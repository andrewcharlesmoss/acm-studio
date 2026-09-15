"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";

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
  return <header className="design-ribbon">
    <div className="design-ribbon-top"><div className="design-ribbon-brand">{brand}</div><div className="design-ribbon-status" aria-live="polite">{status}</div></div>
    <div className="design-ribbon-tabs" role="tablist" aria-label="Design tools">
      {tabs.map((tab) => <button key={tab.id} id={`design-ribbon-tab-${tab.id}`} type="button" role="tab" className={tab.id === activeTab ? "is-active" : ""} aria-selected={tab.id === activeTab} aria-controls={`design-ribbon-panel-${tab.id}`} tabIndex={tab.id === activeTab ? 0 : -1} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}
    </div>
    <div className="design-ribbon-content">{children}</div>
  </header>;
}

export function StudioRibbonPanel({ active, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { active: boolean }) {
  return active ? <div className={classes("design-ribbon-panel", className)} role="tabpanel" tabIndex={0} {...props}>{children}</div> : null;
}

export function StudioRibbonGroup({ label, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return <section className={classes("design-ribbon-group", className)} {...props}><div className="design-ribbon-group-controls">{children}</div><span className="design-ribbon-group-label">{label}</span></section>;
}

export const StudioRibbonButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { size?: "compact" | "standard" | "large"; active?: boolean }>(function StudioRibbonButton({ size = "standard", active = false, className, children, ...props }, ref) {
  return <button ref={ref} className={classes("design-ribbon-button", `is-${size}`, active && "is-active", className)} type="button" aria-pressed={props["aria-pressed"] ?? (active || undefined)} {...props}>{children}</button>;
});
