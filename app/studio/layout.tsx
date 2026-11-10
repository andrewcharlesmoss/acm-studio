import { SitesDisclosureRuntime } from "./sites-disclosure-runtime";
import type { ReactNode } from "react";
import { MediaRuntime } from "./media-runtime";
import { DesignBrokerRuntime } from "./design-broker-runtime";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";
import { StudioToolbarPreferenceProvider } from "./studio-toolbar-preference";
import { StudioNavigationVisibilityProvider } from "./studio-navigation-visibility";
import { LocalSiteBrokerRuntime } from "./test-site/broker-runtime";
import { NavigationContinuityProviders } from "./navigation-continuity-providers";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider><StudioToolbarPreferenceProvider><StudioNavigationVisibilityProvider><SitesDisclosureRuntime /><DesignBrokerRuntime /><MediaRuntime /><LocalSiteBrokerRuntime /><NavigationContinuityProviders><div className="studio-interface-scope" data-studio-interface>{children}</div></NavigationContinuityProviders></StudioNavigationVisibilityProvider></StudioToolbarPreferenceProvider></StudioFocusOutlineProvider>;
}
