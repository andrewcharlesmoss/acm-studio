"use client";

import { Activity, Component, lazy, Suspense, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { StudioUiLibrary, type StudioUiSection } from "./studio-ui-library";

const sectionLoaders: Record<StudioUiSection, () => Promise<{ default: ComponentType }>> = {
  catalogue: () => import("./global-catalogue").then(module => ({ default: module.GlobalCatalogue })),
  workspace: () => import("./workspace-catalogue").then(module => ({ default: module.WorkspaceCatalogue })),
  navigation: () => import("./navigation/navigation-catalogue").then(module => ({ default: module.NavigationCatalogue })),
  ribbon: () => import("../ribbon/ribbon-catalogue").then(module => ({ default: module.RibbonCatalogue })),
  panes: () => import("../panes/pane-catalogue").then(module => ({ default: module.PaneCatalogue })),
  panels: () => import("./panels/panel-catalogue").then(module => ({ default: module.PanelCatalogue })),
  blocks: () => import("./blocks/block-specimen-catalogue").then(module => ({ default: () => <module.BlockLibraryCatalogue initialType={null} /> })),
  controls: () => import("./controls/controls-catalogue").then(module => ({ default: module.ControlsCatalogue })),
  icons: () => import("./icons-catalogue").then(module => ({ default: () => <module.IconsCatalogue /> })),
  styles: () => import("./styles/styles-workspace").then(module => ({ default: module.StylesWorkspace })),
  "interface-styles": () => import("./styles/interface-style-sandbox").then(module => ({ default: module.InterfaceStyleSandbox })),
};

const sectionHrefs: Record<StudioUiSection, string> = { catalogue: "/studio/ui", workspace: "/studio/ui/workspace", navigation: "/studio/ui/navigation", ribbon: "/studio/ui/ribbon", panes: "/studio/ui/panes", panels: "/studio/ui/panels", blocks: "/studio/ui/blocks", controls: "/studio/ui/controls", icons: "/studio/ui/icons", styles: "/studio/ui/styles", "interface-styles": "/studio/ui/interface-styles" };

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

type SectionView = { x: number; y: number; hash: string };

function RestoreSectionScroll({ view, children }: { view?: SectionView; children: ReactNode }) {
  useLayoutEffect(() => {
    if (!view) return; // Initial page loads retain native deep-link navigation.
    const restore = () => window.scrollTo({ left: view.x, top: view.y, behavior: "instant" });
    restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [view]);
  return children;
}

export function StudioUiSectionHost({ section, children }: { section: StudioUiSection; children: ReactNode }) {
  const [activeSection, setActiveSection] = useState(section);
  const [controlsVisited, setControlsVisited] = useState(section === "controls");
  const controlsView = useRef<SectionView | undefined>(undefined);
  const initialEntryPath = useRef(typeof window === "undefined" ? sectionHrefs[section] : `${window.location.pathname}${window.location.search}`);
  const hashes = useRef<Partial<Record<StudioUiSection, string>>>({});
  const ActiveSection = sectionComponents[activeSection];
  const ControlsSection = sectionComponents.controls;

  useLayoutEffect(() => {
    function restoreSectionFromRoute() {
      const route = window.location.pathname.match(/^\/studio\/ui(?:\/([^/]+))?/);
      const section = (route?.[1] ?? "catalogue") as StudioUiSection;
      if (!sectionLoaders[section]) return;
      if (section === "controls") setControlsVisited(true);
      setActiveSection(section);
    }
    window.addEventListener("popstate", restoreSectionFromRoute);
    return () => window.removeEventListener("popstate", restoreSectionFromRoute);
  }, []);

  function selectSection(next: StudioUiSection) {
    if (next === activeSection) return;
    hashes.current[activeSection] = window.location.hash;
    if (activeSection === "controls") {
      controlsView.current = { x: window.scrollX, y: window.scrollY, hash: window.location.hash };
    }
    if (next === "controls") {
      controlsView.current ??= { x: 0, y: 0, hash: "" };
      setControlsVisited(true);
    }
    const hash = hashes.current[next] ?? "";
    const href = next === section ? initialEntryPath.current : sectionHrefs[next];
    window.history.pushState(window.history.state, "", `${href}${hash}`);
    setActiveSection(next);
  }

  return <StudioUiLibrary section={section} activeSection={activeSection} onSectionChange={selectSection}>
    {controlsVisited ? <Activity mode={activeSection === "controls" ? "visible" : "hidden"}>
      <SectionLoadErrorBoundary section="controls">
        <Suspense fallback={<p className="ui-section-loading" role="status">Loading controls…</p>}>
          <RestoreSectionScroll view={controlsView.current}>{section === "controls" ? children : <ControlsSection />}</RestoreSectionScroll>
        </Suspense>
      </SectionLoadErrorBoundary>
    </Activity> : null}
    {activeSection !== "controls" ? activeSection === section ? children : <SectionLoadErrorBoundary key={activeSection} section={activeSection}>
      <Suspense fallback={<p className="ui-section-loading" role="status">Loading {activeSection}…</p>}><ActiveSection /></Suspense>
    </SectionLoadErrorBoundary> : null}
  </StudioUiLibrary>;
}
