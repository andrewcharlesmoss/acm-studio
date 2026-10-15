"use client";

import { MobileNavigationExample } from "./mobile-navigation-example";
import { ApplicationSectionNavigation } from "../application-section-navigation";

export function NavigationCatalogue() {
  return <section className="ui-navigation-page" aria-labelledby="ui-navigation-title">
      <header className="ui-page-intro">
        <p className="rl-eyebrow">Reusable application component</p>
        <h1 id="ui-navigation-title">Navigation</h1>
        <p>Shared application section navigation and mobile template navigation, using the same components and behaviour as production.</p>
      </header>
      <section className="ui-navigation-specimen" aria-labelledby="ui-navigation-specimen-title">
        <h2 id="ui-navigation-specimen-title">Interactive example</h2>
        <ApplicationSectionNavigation initialActiveId="accounts" preventNavigation />
        <p className="ui-navigation-contract">Consumers provide section labels and routes, control the active section when needed, and keep permissions and page content in their own application.</p>
      </section>
      <section className="ui-navigation-specimen" id="mobile-navigation-example" aria-labelledby="mobile-navigation-title">
        <h2 id="mobile-navigation-title">Mobile navigation</h2>
        <p>Try the production template navigation in a narrow page, using its shared mobile breakpoint, overlay, submenus, and keyboard behaviour.</p>
        <MobileNavigationExample />
      </section>
    </section>;
}
