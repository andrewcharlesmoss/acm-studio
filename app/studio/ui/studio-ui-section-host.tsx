"use client";

import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from "react";
import { StudioUiLibrary, type StudioUiSection } from "./studio-ui-library";

const sectionLoaders: Record<StudioUiSection, () => Promise<{ default: ComponentType }>> = {
  workspace: () => import("./workspace-catalogue").then(module => ({ default: module.WorkspaceCatalogue })),
  navigation: () => import("./navigation/navigation-catalogue").then(module => ({ default: module.NavigationCatalogue })),
  ribbon: () => import("../ribbon/ribbon-catalogue").then(module => ({ default: module.RibbonCatalogue })),
  panes: () => import("../panes/pane-catalogue").then(module => ({ default: module.PaneCatalogue })),
  panels: () => import("./panels/panel-catalogue").then(module => ({ default: module.PanelCatalogue })),
  blocks: () => import("./blocks/block-specimen-catalogue").then(module => ({ default: () => <module.BlockLibraryCatalogue initialType={null} /> })),
  controls: () => import("./controls/controls-catalogue").then(module => ({ default: module.ControlsCatalogue })),
  icons: () => import("./icons-catalogue").then(module => ({ default: () => <module.IconsCatalogue /> })),
  styles: () => import("./styles/style-guide-sandbox").then(module => ({ default: module.StyleGuideSandbox })),
};

const sectionComponents = Object.fromEntries(
  Object.entries(sectionLoaders).map(([section, loader]) => [section, lazy(loader)]),
) as Record<StudioUiSection, ReturnType<typeof lazy<ComponentType>>>;

class SectionLoadErrorBoundary extends Component<{ section: StudioUiSection; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const label = this.props.section.charAt(0).toUpperCase() + this.props.section.slice(1);
      return <div className="ui-section-error" role="alert">
        <p>Could not load the {label} section.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload this page</button>
      </div>;
    }
    return this.props.children;
  }
}

export function StudioUiSectionHost({ section, children }: { section: StudioUiSection; children: ReactNode }) {
  const [activeSection, setActiveSection] = useState(section);
  const ActiveSection = sectionComponents[activeSection];

  return <StudioUiLibrary section={section} activeSection={activeSection} onSectionChange={setActiveSection}>
    {activeSection === section ? children : <SectionLoadErrorBoundary key={activeSection} section={activeSection}>
      <Suspense fallback={<p className="ui-section-loading" role="status">Loading {activeSection}…</p>}><ActiveSection /></Suspense>
    </SectionLoadErrorBoundary>}
  </StudioUiLibrary>;
}
