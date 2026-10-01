"use client";

import type { ReactNode } from "react";
import type { IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { useEffect, useRef } from "react";
import "@acm/ribbon/styles.css";
import "../ribbon/ribbon-library.css";
import "../panes/pane-library.css";
import "@acm/panel/styles.css";
import "./catalogue-navigation.css";
import "./blocks/catalogue.css";
import "./controls/catalogue.css";
import "./panels/panel-catalogue.css";
import "./keyboard-catalogue.css";
import "./studio-ui-library.css";

export type StudioUiSection = "workspace" | "navigation" | "ribbon" | "panes" | "panels" | "blocks" | "controls" | "icons" | "styles";

const sections: { id: StudioUiSection; label: string; icon: IconName }[] = [
  { id: "workspace", label: "Workspace", icon: "layout.columns" },
  { id: "navigation", label: "Navigation", icon: "navigation.menu" },
  { id: "ribbon", label: "Ribbon", icon: "layout.columns" },
  { id: "panes", label: "Panes", icon: "view.pages" },
  { id: "panels", label: "Panels", icon: "view.pages" },
  { id: "blocks", label: "Blocks", icon: "insert.shapes" },
  { id: "controls", label: "Controls", icon: "action.adjust" },
  { id: "icons", label: "Icons", icon: "insert.shapes" },
  { id: "styles", label: "Styles", icon: "text.heading" },
];

export function StudioUiLibrary({ section, activeSection = section, onSectionChange, children }: { section: StudioUiSection; activeSection?: StudioUiSection; onSectionChange?: (section: StudioUiSection) => void; children: ReactNode }) {
  const tabRefs = useRef<Partial<Record<StudioUiSection, HTMLButtonElement | null>>>({});
  const initialTitle = useRef<string | null>(null);
  useEffect(() => {
    initialTitle.current ??= document.title;
    document.title = activeSection === section
      ? initialTitle.current
      : `${sections.find(item => item.id === activeSection)?.label ?? "Studio UI"} · Studio UI Library — Andrew Charles Moss`;
  }, [activeSection, section]);

  function focusSection(id: StudioUiSection) {
    const index = sections.findIndex(item => item.id === id);
    const next = sections[(index + sections.length) % sections.length].id;
    onSectionChange?.(next);
    tabRefs.current[next]?.focus();
  }

  return <main className="rl-shell ui-library">
    <header className="ui-library-header">
      <a href="/studio"><AcmIcon name="navigation.back" size={20} />ACM Studio</a>
      <strong>Studio UI Library</strong>
    </header>
    <div className="ui-library-sections" role="tablist" aria-label="Studio UI Library Sections">
      {sections.map((item) => <button key={item.id} ref={node => { tabRefs.current[item.id] = node; }} type="button" role="tab" id={`studio-ui-tab-${item.id}`} aria-controls="studio-ui-section-panel" aria-selected={activeSection === item.id} tabIndex={activeSection === item.id ? 0 : -1}
        onClick={() => onSectionChange?.(item.id)}
        onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); focusSection(sections[(sections.findIndex(candidate => candidate.id === item.id) + 1) % sections.length].id); }
          if (event.key === "ArrowLeft") { event.preventDefault(); focusSection(sections[(sections.findIndex(candidate => candidate.id === item.id) + sections.length - 1) % sections.length].id); }
          if (event.key === "Home") { event.preventDefault(); focusSection(sections[0].id); }
          if (event.key === "End") { event.preventDefault(); focusSection(sections.at(-1)!.id); }
        }}>
        <AcmIcon name={item.icon} size={20} />{item.label}
      </button>)}
    </div>
    <div className="ui-library-content" role="tabpanel" id="studio-ui-section-panel" aria-labelledby={`studio-ui-tab-${activeSection}`} tabIndex={0}>{children}</div>
  </main>;
}
