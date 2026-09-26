"use client";

import { ApplicationSectionNavigation } from "../application-section-navigation";
import { StudioUiLibrary } from "../studio-ui-library";

export function NavigationCatalogue() {
  return <StudioUiLibrary section="navigation">
    <section className="ui-navigation-page" aria-labelledby="ui-navigation-title">
      <header className="ui-page-intro">
        <p className="rl-eyebrow">Reusable application component</p>
        <h1 id="ui-navigation-title">Application Section Navigation</h1>
        <p>A shared pattern for moving between the top-level sections of an application. The Workspace shows how it sits above a Ribbon and panes.</p>
      </header>
      <section className="ui-navigation-specimen" aria-labelledby="ui-navigation-specimen-title">
        <h2 id="ui-navigation-specimen-title">Interactive example</h2>
        <ApplicationSectionNavigation initialActiveId="accounts" preventNavigation />
        <p className="ui-navigation-contract">Consumers provide section labels and routes, control the active section when needed, and keep permissions and page content in their own application.</p>
      </section>
    </section>
  </StudioUiLibrary>;
}
