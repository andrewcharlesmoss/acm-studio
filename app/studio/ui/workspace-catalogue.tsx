"use client";

import { useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { PaneSpecimen } from "../panes/pane-specimen";
import { defaultRegions, skeletonDefinition } from "../panes/catalogue-model";
import type { PaneTabIndicatorVariant } from "../panes/pane-components";
import { RibbonPreview } from "../ribbon/ribbon-preview";
import { skeletonExample } from "../ribbon/catalogue-model";
import { initialDemo } from "../ribbon/demo-state";
import { ApplicationSectionNavigation } from "./application-section-navigation";
import { StudioUiLibrary } from "./studio-ui-library";

export function WorkspaceCatalogue() {
  const [tab, setTab] = useState(skeletonExample.initialTab);
  const [ribbonState, setRibbonState] = useState(() => initialDemo(skeletonExample));
  const [indicatorVariant, setIndicatorVariant] = useState<PaneTabIndicatorVariant>("hover");
  const [revision, setRevision] = useState(0);
  function reset() {
    setTab(skeletonExample.initialTab);
    setRibbonState(initialDemo(skeletonExample));
    setIndicatorVariant("hover");
    setRevision((value) => value + 1);
  }

  return <StudioUiLibrary section="workspace">
    <section className="ui-workspace-page" aria-labelledby="ui-workspace-title">
      <div className="ui-page-intro">
        <p className="rl-eyebrow">Studio UI / Composition</p>
        <h1 id="ui-workspace-title">Application navigation, Ribbon and panes.</h1>
        <p>Compare application section navigation, the shared Ribbon and Pane structures in one workspace.</p>
      </div>
      <div className="ui-workspace-tools">
        <p>Both panes start open. Drag an edge button to resize, or click it to collapse.</p>
        <div className="ui-workspace-actions">
          <div className="ui-tab-indicator-options" role="group" aria-label="Tab hover style preview">
            <span>Hover style</span>
            <button type="button" aria-pressed={indicatorVariant === "selected"} onClick={() => setIndicatorVariant("selected")}>Selected only</button>
            <button type="button" aria-pressed={indicatorVariant === "hover"} onClick={() => setIndicatorVariant("hover")}>Subtle hover</button>
          </div>
          <button type="button" onClick={reset}><AcmIcon name="action.reset" size={18} />Reset Demo</button>
        </div>
      </div>
      {/* The combined specimen scrolls horizontally at narrow viewports. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="ui-workspace-frame" role="region" aria-label="Scrollable combined application navigation, Ribbon and Pane workspace" tabIndex={0}>
        <div className="ui-workspace-stage" data-tab-indicator-variant={indicatorVariant}>
          <ApplicationSectionNavigation initialActiveId="accounts" preventNavigation />
          <RibbonPreview example={skeletonExample} tab={tab} setTab={setTab} state={ribbonState} setState={setRibbonState} showScenarios={false} showFixture={false} showStatus={false} />
          <PaneSpecimen key={revision} definition={skeletonDefinition} regions={defaultRegions} layout="both" content="normal" studio={false} indicatorVariant={indicatorVariant} />
        </div>
      </div>
      <p className="ui-workspace-caption">The workspace preview scrolls horizontally when its full structure does not fit. Changes stay in this example only.</p>
    </section>
  </StudioUiLibrary>;
}
