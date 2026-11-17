# ACM Ribbon

@acm/ribbon is the shared React ribbon foundation for ACM projects. It owns the ribbon skeleton, configurable tabs, keyboard navigation, fixed-height panels, standard control sizes, shared typography and accessible state handling. Applications own their tab definitions, commands, permissions, icons and brand content.

## Usage

import { Ribbon, RibbonButton, RibbonField, RibbonGroup, RibbonPanel } from '@acm/ribbon';
import '@acm/ribbon/styles.css';

const tabs = [{ id: 'home', label: 'Home' }, { id: 'tools', label: 'Tools' }];

<Ribbon tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accessibleName="Editor tools">
  <RibbonPanel tab="home">
    <RibbonGroup label="Actions">
      <RibbonButton size="large" onClick={save}><span>Save</span></RibbonButton>
      <RibbonField>Format<select aria-label="Format"><option>PNG</option></select></RibbonField>
    </RibbonGroup>
  </RibbonPanel>
</Ribbon>

The public exports are `Ribbon`, `RibbonTabs`, `RibbonPanel`, `RibbonGroup`,
`RibbonControls`, `RibbonButton`, `RibbonToggleButton` and `RibbonField`. The
ribbon accepts consumer-supplied children and owns the tab relationships,
keyboard navigation and fixed-height panel contract. Applications supply their
own SVG icon components as button children.

The shared type scale is 16px regular tabs with a 24px line height, plus 13px
regular group and control labels with a 19.5px line height. Consumers may theme
the documented colour tokens while keeping this typography consistent.

compact, standard and large are the supported button sizes. The default panel height is 114px and can be overridden with --acm-ribbon-panel-height when a consumer has a deliberate fixed-height token.

Consumers can theme the documented `--acm-ribbon-*` custom properties on their
ribbon root. Keep the panel-height token fixed across tabs; use horizontal
overflow or a deliberate narrow-layout treatment rather than allowing one tab
to stretch the application. ACM Studio's Studio UI Library defines the tab
indicator contract: a line-only underline sized to its text at rest. Hovering an
unselected tab keeps its neutral grey line at label width; hovering the selected
tab extends its active line while retaining a small inset from the tab edge,
and it retracts when the pointer leaves. Keyboard focus keeps the label-width line and uses the visible focus outline
without revealing a second button border.
This package implements the shared Ribbon behaviour. Consumers theme the line
with `--acm-ribbon-tab-hover-indicator` and set its horizontal padding with
`--acm-ribbon-tab-inline-padding`; they should not replace its geometry. Motion
is disabled when the user requests reduced motion. The package targets React 18
or later and modern evergreen browsers, and has no dependency on a router, icon
library, authentication system or persistence layer.
