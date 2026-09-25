import type { ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import "@acm/ribbon/styles.css";
import "../ribbon/ribbon-library.css";
import "../panes/pane-library.css";
import "./studio-ui-library.css";

export type StudioUiSection = "workspace" | "ribbon" | "panes" | "icons";

const sections: { id: StudioUiSection; label: string; href: string; icon: string }[] = [
  { id: "workspace", label: "Workspace", href: "/studio/ui", icon: "layout.columns" },
  { id: "ribbon", label: "Ribbon", href: "/studio/ui/ribbon", icon: "layout.columns" },
  { id: "panes", label: "Panes", href: "/studio/ui/panes", icon: "view.pages" },
  { id: "icons", label: "Icons", href: "/studio/ui/icons", icon: "insert.shapes" },
];

export function StudioUiLibrary({ section, children }: { section: StudioUiSection; children: ReactNode }) {
  return <main className="rl-shell ui-library">
    <header className="ui-library-header">
      <a href="/studio"><AcmIcon name="navigation.back" size={20} />ACM Studio</a>
      <strong>Studio UI Library</strong>
    </header>
    <nav className="ui-library-sections" aria-label="Studio UI Library Sections">
      {sections.map((item) => <a key={item.id} href={item.href} aria-current={section === item.id ? "page" : undefined}>
        <AcmIcon name={item.icon} size={20} />{item.label}
      </a>)}
    </nav>
    <div className="ui-library-content">{children}</div>
  </main>;
}
