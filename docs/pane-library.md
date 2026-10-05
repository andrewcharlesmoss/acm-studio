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

## Internal component contract — v1.1.0

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
  established layout while using the shared structure.
  Optional controlled `onWidthChange`, `minWidth` and `maxWidth` enable edge
  resizing. The collapse button also acts as the drag handle and accepts Left/Right arrows, with Shift
  for larger steps and Home/End for limits. The owning workspace applies the
  resulting width to its grid; the library specimens do this through
  `PaneWorkspace`. Studio Navigation, Editor Inspector and both Design Canvas
  side panes use this contract. Width changes remain local to the current session.
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
  visible.

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
collapse-control dimensions. Width is a per-pane prop. The control uses the
existing Studio chevron SVG at 18px in a 28 × 48px neutral pill, centred on the
inner edge. A collapsed control moves fully inside the workspace boundary.
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
