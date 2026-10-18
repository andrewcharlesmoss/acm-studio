# Pane Library

## Purpose and boundaries

Open Panes from the Studio UI Library at `/studio/ui/panes`. The former
`/studio/panes` address redirects here. Workspace combines a Ribbon with both
pane specimens so their shared alignment can be reviewed in one frame.
Overview presents one pane structure beside the centre workspace. When both
panes are shown, Inspect Side switches the structure inspector between left
and right without duplicating its regions. Skeletons lets you remove
optional regions and try single-sided layouts. Studio Examples contains
navigation, Block Library, editor inspector, Design Pages/Layers and Design
properties specimens. Each live Studio pane uses the shared Pane structure
and, where applicable, its shared tab components. Catalogue examples are
structural demonstrations, not live product data or commands.

The Studio UI Library owns the shared tab indicator rule; see
`docs/studio-ui-library.md`. Pane follows its label-width resting line and
padded-edge hover and focus expansion. Product surfaces may theme the indicator
colour but should keep this geometry and motion consistent.

All interactions are temporary React state. Reset Demo resets both specimens'
fields, tabs, selection, collapse state and scrolling, and restores Normal
content. Presentation controls (layout, optional regions, preview width,
tab indicator, boundaries and the second specimen) remain as chosen. Reload
restores everything.
Catalogue fixtures never import product stores, claim write ownership, call
product APIs, or read/write browser persistence. No real documents, designs or
media are involved. Product data, commands, persistence and pane-specific
interaction remain owned by their existing features.

## Canvas block chooser

The canvas end, between-block, featured-image boundary, and general nested
appenders open a compact anchored chooser with Search, six contextual quick
choices, and Browse All. Searching uses the complete canonical contextual
catalogue. Only Browse All opens the Block Library pane from this popup;
the Ribbon Add Block and slash insertion retain their existing pane behaviour.
The chooser preserves unfinished appender text and the captured insertion
boundary, refuses changed documents or sibling ordering, and closes after
insertion. Close, Escape, outside clicks, and native Tab navigation use the
shared anchored-popover contract. Specialised Add Button, Add Paragraph, and
social-icon controls retain their contextual commands.

## Document and template settings

The main Post, Page and Template tabs use the same overview, spacing and compact
label/value rows. Categories and Tags are their only collapsible groups.
Block and Styles tabs retain their specialised grouping. Inspector headings and
field labels use regular case, including their portalled editors.

`app/studio/controls/inspector-setting-row.tsx` owns these property rows and
static sections. A setting button exposes both its label and current value;
its editor uses the existing pane-facing popover geometry. Close and Escape
return focus to the opener. Moving focus or clicking outside dismisses the
editor, so keyboard navigation cannot stack property popovers. Template text
fields commit on blur before the editor unmounts. Portalled fields retain the
owning pane's disabled state, and existing content/template handlers own all
mutations and saves.

## Two left panes

The Two Left Panes section demonstrates `TwoLeftPaneWorkspace`, also used by the
Site Editor preview. Supply `primary` and `secondary` Pane elements and preview
children. The composition owns left-side placement, zero-width collapsed tracks,
separate reopen-button positions, and container-based responsive layout. Pane
retains resizing, collapse, focus recovery, and keyboard behaviour. Callers own
width/collapse state, content, commands, and persistence; no feature store is read.

Above 1000px the two panes precede the preview. At 601–1000px the preview follows
both panes; at 600px and below all three regions stack. These thresholds refer to
the composition's container, including catalogue width examples. Collapsed slots
are out of flow at every size. The shared Show controls sit 52px apart vertically,
without reserving empty columns. Use `--two-left-pane-min-height` to set the host's
minimum workspace height (default 540px). Content presentation stays with its host.
The existing left/right `PaneWorkspace` retains its behaviour.

Acceptance: in both the library and Site Editor, test each pane closed alone and
both closed at 1440px, 820px, and 390px. Confirm zero-width collapsed slots, separate
visible Show buttons, pointer/Enter reopening, edge and keyboard resizing, retained
content, and reset/reload. With both closed, preview starts at the workspace edge.
The library Reset Demo resets pane widths, collapse state, and sample title.

## Internal component contract — v1.5.0

Double-click a resizable pane’s edge, or press Enter while its separator is
focused, to fit primary labels and controls within the existing width limits.
Secondary descriptions may wrap. Measurement uses the current content and tab
allocation without cloning the DOM, changing styles, or moving focus. The round
collapse control retains its normal click and keyboard behaviour.

The compatibility contract covers the React props, slots, accessible behaviour
and CSS tokens in `app/studio/panes/pane-components.tsx` and its scoped CSS.
This is an internal Studio module, not a published package.

- `PaneWorkspace`: optional `left` and `right` Pane elements, a centre child
  and an accessible workspace label. Each element's `side` must match its slot.
- `Pane`: `label`, `side`, positive pixel `width`, controlled `collapsed` and
  `onCollapsedChange`, an accessible-decorative `collapseIcon` slot, body
  children, and optional `header`, `tabs`, `toolbar` and `footer` slots.
  Optional `collapsible` and `inert` flags support panes whose visibility is
  controlled by their owning overlay. Styling hooks (`trackClassName`,
  `className`, `bodyClassName` and `style`) let product panes retain their
  content and appearance while using the shared structure.
  `flushRegions` optionally names header, toolbar, body, or footer regions that
  contain full-width sections. Other regions inherit 12px `--pane-space` insets.
  Pane edges have zero margin and padding; consumers must not add edge spacing
  or override region padding in local CSS. Content fields and lists retain their
  own spacing inside these boundaries. Tabs remain full width.
  Optional controlled `onWidthChange`, `minWidth` and `maxWidth` enable edge
  resizing along the full height of the inner edge. The focusable separator exposes
  the current width and limits. It and the collapse button accept Left/Right arrows, with Shift
  for larger steps and Home/End for limits. The owning workspace applies the
  resulting width to its grid; the library specimens do this through
  `PaneWorkspace`. Studio Navigation, Editor Inspector and both Design Canvas
  side panes use this contract. The site navigation editor also uses
  `PaneWorkspace` with a right-hand link-details `Pane`, starting at 300px and
  resizable from 270px to 480px. Collapsing retains its selection and fields.
  Width changes remain local to the current session.
- `PaneCollapseButton`: state-aware name, optional tooltip, expanded state and
  controls relationship. Pane supplies the stable ID and focus handling.
- `PaneSection`: a labelled content group with a generated heading identity.
- `PaneTabs` / `PaneTabPanel`: share an instance-unique prefix, tab IDs and
  controlled active value. All panels remain mounted; inactive panels are
  hidden. Disabled tabs are skipped. Arrow keys wrap; Home/End choose the
  first/last enabled tab. `PaneTabs` accepts a custom label renderer for
  product counts and other non-interactive decoration. The default
  `indicatorVariant="hover"` is the default. The active tab keeps its underline
  and hovered or keyboard-focused tabs receive a subtle underline in the ACM
  neutral palette. At rest, each line matches its label. Hovering an unselected
  tab keeps its neutral grey line at label width; hovering the selected tab
  expands its active line but keeps a small inset from the tab edge, then it
  retracts when the pointer leaves. Keyboard focus keeps the label-width line
  and uses the visible focus outline.
  Unconfigured Pane tab strips share the same default. It does not add a
  background block. The optional
  `indicatorVariant="selected"` limits the underline to the active tab. Both
  variants retain the same layout and focus behaviour. Space-constrained
  Studio Navigation uses a 4px inset to keep all three tab labels and counts
  visible. Its content tabs are ordered Posts, Pages, then Templates.

### Inspector overlay ownership

Right panes declare `data-inspector-popover-owner` on their outer `aside`.
Standalone Block and Controls catalogue specimens declare the same boundary on
their inspector/example container. The shared `inspectorPopoverOwner` and
`watchInspectorPopover` helpers resolve that boundary before positioning any
floating inspector box. Every block uses this rule: menus, colour palettes,
gradient editors, font-size unit menus and document popovers open 12px to the
left of the pane, into the workspace. The trigger controls vertical alignment,
not the horizontal edge. This additive ownership contract is v1.1.0; existing
Pane props remain compatible.

Portal children pass their original owner anchor. A custom colour editor opens
further left of its parent palette; a gradient-stop editor keeps the original
pane edge and aligns below its stop. Both stay on the left of the pane.
Available workspace width bounds popup width when at least 200px remains (or
the preferred width for smaller menus). Viewport width, vertical placement and
height remain constrained. When there is insufficient usable workspace for the full
popup, clamp towards the left viewport margin; never flip to the other side of
the pane. The same geometry applies to catalogue previews and product panes.

The watcher observes the owner, anchor and popup for size changes, listens to
viewport resize and captures scrolling, and disconnects when the popup closes.
The owning control retains outside-click dismissal, a visible Close control,
Escape behaviour, keyboard navigation and focus return. Native select lists and
inline fields remain browser controls; canvas toolbar menus have separate owners.

The pane container stays mounted when collapsed. Hidden content is outside
keyboard navigation; focus within a collapsing pane moves to its edge button.
Selection and fields survive reopening, and body scroll position is restored.
Headers, tabs, toolbars and footer actions remain outside the scrolling body.
Each instance has independent state and unique accessibility IDs.

Tokens cover surfaces, borders, primary/muted text, hover, spacing, font and
collapse-control dimensions. Studio panes use the shared white
`--studio-pane-surface` interface token for their surface, body and edge control.
This interface token is independent of template and content palette colours.
Width is a per-pane prop. The control uses the
existing Studio chevron SVG at 18px in a 26 × 26px neutral circle, centred on the
inner edge. A 4px inner-edge gutter keeps pane content clear of the circle
without changing the pane width or divider position. A collapsed control moves fully inside the workspace boundary.
The resize strip is 12px wide (24px for coarse pointers). Coarse pointers also
receive a 44px collapse target around the visible circle. Dragging the circle
remains supported; a drag does not collapse the pane.
The module accepts its icon rather than importing a product-specific icon set.
The catalogue supplies `StudioIcon` from the reusable ACM Studio icon
collection; no third-party artwork is used.

## Source baseline and deliberate differences

The source baseline is Studio commit
`84dc3b2c60f412045c1b09719bba5a5183dd842d`, captured 22 September 2026 before
navigation links were added. File SHA-256 values are recorded in
`app/studio/panes/source-snapshots.json` and shown in the source disclosure.

| Example | Source component | Width |
| --- | --- | --- |
| Studio Navigation | StudioPrototype / studio-library | 290px |
| Block Library | StudioCanvas / block-inserter | 320px |
| Editor Inspector | StudioInspector | 300px |
| Design Pages/Layers | DesignEditor / design-pages | 224px |
| Design Properties | DesignEditor / design-inspector | 260px |

The structure list presents the shared pane regions once. Inspect Side changes
which rendered side supplies measurements; the specimens still have
independent content, width and collapse state. The examples simplify content
and replace product commands with selection, sample fields or a local status
message. Header/section spacing and scrolling are standardised. Every specimen
has the same collapse contract. Live pane
widths start at 290px, 320px, 300px, 224px and 260px respectively. Design Canvas
panes provide the visual model for controls and tabs; their edge controls now
remain available at narrow widths. The canvas retains its existing
minimum-width behaviour.

The shell uses Inter; Studio specimens use the Studio 13px system-font baseline.
Skeletons use 290px left and 300px right panes. Narrow specimen viewports do not
shrink, stack or automatically collapse panes. The centre contracts to 240px,
then the preview scrolls horizontally. Its fixed 540px demonstration height is
only a test surface, not a requirement on future product integrations. The
catalogue shell reflows independently. Docking, floating, saved layouts and
product migrations are not included.

Typed definitions drive the specimen options and structure list. Inspection
reads the first specimen's actual rendered dimensions and computed tokens;
hidden selections are reported as hidden rather than assigned invented sizes.
The second specimen demonstrates independent state and IDs.

## Verification

From the repository root:

```sh
node --experimental-strip-types --test tests/pane-library.test.mjs tests/ribbon-catalogue.test.mjs
npx tsc --project tsconfig.panes.json --noEmit --pretty false
npm run typecheck
npm run lint
npm test
git diff --check
```

`npm test` includes the production build. From `_Projects`, run
`node workspace-governance/scripts/audit-project-docs.mjs` for documentation
validation. Distinguish pre-existing typecheck or suite failures from regressions.

Browser acceptance: all five examples; both/left/right/no panes expanded;
header and edge collapse, focus restoration, keyboard tabs, optional regions,
long/empty/filtered content, retained fields and scroll positions, inspection,
reset, and two independent specimens. Check desktop, 768px and 390px browser
widths and actual 200% browser zoom where supported. Preview-width selection
alone is not evidence of browser viewport or zoom testing. Check product
navigation links and the existing Ribbon route for regressions.

Governance references: workspace AGENTS.md and STYLE_GUIDE.md are unversioned,
read at governance commit `6f80c6e`; the project AGENTS.md at the source baseline
also applies. Use Explorer → Builder → independent read-only Verifier before
a scoped local commit. No push or deployment is authorised by this increment.

### Verification checkpoint — 22 September 2026

- All 15 focused Pane/Ribbon tests pass; focused pane TypeScript passes.
- Production build passes. Full lint reports no errors and seven existing
  warnings outside the new feature. Documentation validation passes for all
  17 registered paths.
- Full tests: 452/460 pass. The eight failures also reproduce against baseline
  application sources from `84dc3b2`, read directly from Git into the test
  process without changing the checkout: three Design CSS assertions, the
  template Content-slot source assertion, the coordinator line-count guard,
  two publication/ownership tests and the template narrow-shell assertion.
- Full typecheck retains 21 errors in existing Design, template, block-type
  and sibling Ribbon code. No pane or new navigation errors remain.
- Real-browser checks cover all five measured widths, independent collapse,
  keyboard activation, header-close focus transfer, retained fields, tab
  Arrow/Home/End navigation, independent body scrolling and scroll restoration,
  optional regions, single-sided layouts, multiple instances with unique IDs,
  filtering, empty content, reset, boundaries and actual measured inspection.
- At actual 1440px, 768px and 390px browser widths the catalogue was inspected.
  Narrow widths retain the 290/300px skeleton panes with contained preview
  overflow and working edge controls; the document itself does not overflow.
  The dashboard/content links open the new route, the template link is visible
  with the correct destination, and the combined Studio UI Library remains
  accessible.
- True 200% browser zoom was not verified: the available in-app browser
  controls provide viewport sizing, not a browser zoom setting. Width checks
  are not presented as zoom evidence.
- Independent read-only Verifier Pascal reviewed the diff, passed the focused
  tests/typecheck, verified all six baseline hashes and found no actionable
  code findings. Browser evidence was supplied by the Builder, not independently
  repeated by the Verifier. Concurrent Ribbon/icon documentation and lockfile
  changes are outside this increment and excluded from its commit.

Studio Navigation uses `StudioNavigationFrame` in Posts, Pages and Templates.
It owns one creation toolbar, tool menu, Studio Drafts/Sites area, shared tabs,
scrolling list region and footer. Consumers supply counts and commands; Files
and the other tool rows share one separator rule and the same catalogue icons.
Template import and template creation remain in the template workspace.

### Site ordering in Studio Navigation

Each site has a six-dot handle beside its title. Drag the handle or focus it and
press Alt+Up/Down to move the complete site card, including its environments.
Edit and Visit actions retain ordinary pointer and keyboard behaviour. Cancelled
or stale drags do not change the order.

Studio library lists and site cards use one marker per effective insertion gap.
Either neighbouring row edge resolves to the following full row, with the line
centred between their measured borders. Pointer movement through the empty gap
retains that same marker; handles do not supply the card geometry.
The complete Studio drag inventory and shared block, Navigation, and Design
placement contracts are documented in [Drag placement](drag-placement.md).

The order is a browser interface preference in `acm-studio-site-order-v1`, saved
through the existing Studio preference repository and writer coordinator. It does
not change site sources, document/template order or publication. Saves check the
latest stored order; a competing preference change, denied writer or storage
failure is reported visibly. An unsaved order applies to the current page. Other
tabs read successful changes, and new site IDs append without losing known order.

The Studio Navigation Sites section inherits `InspectorAccordionSection`, the
same production control demonstrated in the UI Library. It starts expanded;
shared state, accessible heading, chevron, hover, focus, and mounted-content
behaviour remain in that component. Shared accordion styles own full-width
headings, a 52px minimum height, 16px vertical and 18px horizontal heading padding,
and 18px content insets. Sites has no dimension or spacing overrides. Its
open-state callback cancels active site placement when collapsed. Hidden controls
leave keyboard navigation. Disclosure state is page-local and saved order is
unchanged. Use this foundation for pane accordions; do not fork their interaction
or header styling. All consumers retain the shared mounted fieldset. Standalone
pane controls such as Studio Drafts use `pane-inset`, which takes its margin from
the shared 12px `--pane-space` rhythm rather than product-specific spacing.
