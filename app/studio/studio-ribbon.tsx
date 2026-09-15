"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

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
    <nav className="design-ribbon-tabs" aria-label="Design tools">
      {tabs.map((tab) => <button key={tab.id} type="button" className={tab.id === activeTab ? "is-active" : ""} aria-current={tab.id === activeTab ? "page" : undefined} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}
    </nav>
    <div className="design-ribbon-content">{children}</div>
  </header>;
}

export function StudioRibbonPanel({ active, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { active: boolean }) {
  return active ? <div className={classes("design-ribbon-panel", className)} {...props}>{children}</div> : null;
}

export function StudioRibbonGroup({ label, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return <section className={classes("design-ribbon-group", className)} {...props}><div className="design-ribbon-group-controls">{children}</div><span className="design-ribbon-group-label">{label}</span></section>;
}

export function StudioRibbonButton({ size = "standard", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: "compact" | "standard" | "large" }) {
  return <button className={classes("design-ribbon-button", `is-${size}`, className)} type="button" {...props}>{children}</button>;
}
