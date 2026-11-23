# Studio interface instructions

All code and documentation paths in these instructions are relative to the ACM Studio repository root.

## Reference interactions and icons

Match hover feedback to the specific Gutenberg control and its hit area; there
is no universal hover fill. Inspect the reference state before styling each
control, then reproduce whether it changes text or icon colour alone, fills a
whole menu row, or gives a compact action its own tinted, rounded background.
Andrew explicitly requires colour-only hover for Studio text actions, including
per-option Reset, Reset all, and colour-picker Clear, with no rectangular or
rounded background fill. This shared rule also applies in portalled overlays
and UI Library specimens; do not reintroduce fills from a Gutenberg reference.
Every adjustment-settings action using the sliders icon must carry the shared
`studio-adjustment-action` class. Its global rule gives enabled, unpressed actions
blue glyph-only hover and retains a black pressed state. Keep sizing and feature
behaviour with each owner, and exclude the shared class from generic host hover
rules. Other control types keep their own reference-specific hover treatment. The shared
neutral-hover token is not a blanket button rule. Keep hover, keyboard
focus, selected, pressed, disabled and destructive treatments distinct. Verify
pointer hover and keyboard focus in the rendered Site Editor and the matching
UI Library specimen whenever a shared control or interaction variant changes.
The shared `BackgroundSelection` Colour and Gradient rows use the same
blue-text, no-fill hover in editor panes, Site Editor Styles, and UI Library
specimens; selected and expanded states retain their own treatments. The
Colour minus/reset action also has no hover background. Their interaction
styles live with `controls/background-selection.css`; host-level generic hover
rules consume each control's `--studio-button-hover-background` preference
instead of listing BackgroundSelection selectors as exceptions.
Named Theme colour rows in Site Editor → Colours use the shared Colour row
style, with blue text-only hover and a separate expanded state. The Edit palette
navigation action uses blue text-only hover, and palette choices use a border
hover without a neutral background fill.

The table-action dropdown deliberately uses Gutenberg's system UI font stack
and measured compact menu dimensions instead of the shared Inter baseline.
These dimensions are a visual reference; its artwork comes from the ACM icon
collection. Keep the menu compact and do not infer CSS sizes from Retina
screenshots.

Studio interaction controls use original ACM artwork from the shared
`@andrewcharlesmoss/icons` catalogue. Use its React adapter and optical scales, and keep
new shared symbols product-neutral. Preserve the `StudioIcon` and table-icon
wrappers as compatibility APIs. Do not trace or copy third-party paths.
The Design rotation handle uses the shared `arrange.rotate-free` two-arrow
mark, with compact round proportions as Andrew requested on 15 October 2026.
The legacy Studio rotation mark delegates to that catalogue artwork. Keep the
generic `arrange.rotate` angled-object symbol distinct. Design and the Controls
Library rotation specimen inherit `RotationHandle`, its shared CSS and
`rotation-geometry.ts`; owners retain transaction and persistence adapters.
Andrew explicitly authorised the Copilot keyboard mark
as a sourced brand exception on 26 September 2026. Its MIT-licensed Lobe Icons
SVG, provenance and licence are owned by `icons/sources/copilot/` in the Packages repository. Preserve
the shared geometry and licence notices when previewing or exporting it.
Andrew authorised Inter-derived H1–H6 heading marks on 2 October 2026. These
shared font-outline assets use the pinned, licensed source in
`icons/sources/inter/` in the Packages repository. Retain their provenance and licence notices.

## Library specimens and saved styles

The Studio UI Library at `/studio/ui` groups Workspace, Ribbon, Panes, Panels,
Icons and Styles. `workspace-governance/STYLE_GUIDE.md` is the only stored source
of website and interface style values. Studio parses its token tables at load,
validates the in-memory presets through `@acm/styles`, and derives CSS variables
and the source-line index from that Markdown. Draft controls update the specimen
and source view immediately. In local development, Save Website Styles and Save
Interface Styles use one fixed-target, revision-checked gateway that writes only
the applicable guide token cells, then rereads and validates the complete guide.
Original Default cells and canonical Defaults tables hold the fixed reset values
recovered from the original presets; saves update saved-value cells only. Individual, section and all-style
resets are undoable drafts, independently of the latest saved baseline. Reload
Source returns to saved values. Policy prose stays manually authored. Saving borrows `studioWriteOwnership` or a
bounded claim of its same Web Lock; no unlocked fallback, browser store, Git
commit or publication is permitted. The gateway requires exact local-origin
checks, expiring sessions, validation, a process guard, recoverable replacement
and readback. External changes block stale saves and preserve the draft; Reload
Source deliberately discards it. Development refreshes reread hand edits, and
restart also loads them. Hosted builds retain bundled preview editing with
source saving unavailable and require the canonical Markdown as a build input.
See `docs/studio-ui-library.md` for scope and recovery.
Formatted and Markdown source guide views must contain the same source content in
the same order. Formatting may interpret Markdown syntax, but must not invent,
omit, duplicate or split source tables into display-only content. Every displayed
heading and table row must map to its actual canonical Markdown line; never
invent or reuse line numbers for generated content. Make structural changes in
the canonical Markdown and update parsing and saving together.

Workspace composes the shared Ribbon and Pane specimens; Ribbon details live at
`/studio/ui/ribbon`, Pane details at `/studio/ui/panes`, and the broadly shared
icon catalogue at `/studio/ui/icons`. The prior `/studio/ribbon` and
`/studio/panes` routes redirect to their new sections. ACM symbols come from the
`@andrewcharlesmoss/icons` shared package. The UK Keyboard collection lives at
`/studio/ui/icons?collection=keyboard`. Shared keycap assets are owned by
`@andrewcharlesmoss/icons/keyboard`. The collection covers the common UK ISO Mac and Windows
key families; layouts and hardware-dependent legends remain model-specific.
The Studio preview's default appearance and Reset to Default behaviour are
defined in `docs/studio-ui-library.md`; keep them separate from the shared
keyboard renderer's transparent backwards-compatible defaults.
The Panels section at `/studio/ui/panels` demonstrates the shared `@andrewcharlesmoss/panel`
card component. Product consumers own placement, width, resizing, visibility,
content and actions. Keep account data and behaviour in ACM Account.
This catalogue organisation does not replace
existing product icons or change their provenance. Ribbon definitions drive its
tree, inspector and renderer. All catalogue demo handlers remain memory-only
and independent of product stores or write ownership. See
`docs/studio-ui-library.md`, `docs/ribbon-library.md` and `docs/pane-library.md`.

Every new shared control and supported presentation or interaction variant must
be demonstrated in the Studio UI Library in the same change. Extend the existing
catalogue entry where appropriate rather than creating duplicate entries. The
specimen must consume the canonical production component and its shared styles
and behaviour, with temporary example state, working interactions and Reset;
never recreate the control for demonstration. Update relevant catalogue metadata,
documentation and regression coverage, and verify the rendered variant and its
keyboard, dismissal and responsive behaviour where applicable. Changes to an
existing shared control must also reach its Library specimens. Do not treat the
work as complete with a missing or stale specimen unless Andrew explicitly
authorises that exception.

The Studio UI Library defines the shared Ribbon and Pane tab indicator rule.
`docs/studio-ui-library.md` is the canonical specification;
`@andrewcharlesmoss/ribbon` supplies the reusable Ribbon implementation and Pane components
follow the same geometry. Product consumers may theme indicator colours but
should not replace this behaviour.

Shared Studio measurement fields use `NumberUnitField`; link editors reuse
`controls/link-controls.tsx` through the existing rich-text or destination owner.
Undo/Redo buttons use `HistoryActionButton` or `HistoryActions`, including Ribbon
examples. Context and global-template Bins use `bin-presentation.tsx`. These
components own presentation only: keep validation, captured selections, history,
write ownership and recovery policies with their features. Do not recreate their
inner spacing, action icons or feedback locally. See `docs/studio-ui-library.md`.

## Typography and focus

Studio interface text uses Gutenberg's 13px system UI baseline through
`--studio-ui-font` and `--studio-ui-size`. Do not introduce interface text
smaller than that token: use hierarchy, weight, colour and spacing instead.
Keep interface copy concise. Include short descriptions where they help people
understand a control, choice, or section. Keep each description brief and directly
useful; avoid repeating labels or adding unnecessary detail.
The shared application header uses the global Inter-first `--font-sans` stack
and the guide’s 1rem navigation and button size, including its site and section
names. Header status text retains the compact
13px baseline. Article and block content may retain their content-specific typography.

ACM Studio's Focus Outline preference applies to every `/studio` route,
including the editor, appender and portalled overlays. On shows focus outlines
for pointer and keyboard input, Off hides them, and Keyboard Only is the default.
Andrew explicitly authorised Off as an accessibility exception for this scope;
keyboard navigation, editing carets and selected-item markings remain available,
and forced-colours mode retains visible focus. Public article routes are outside
this scope. For the preview resize handle, its accent-coloured enlarged bar is
the focus cue without an enclosing outline; forced-colours mode retains a system
outline.
The Library header and editor View menu share the setting. Its exact
enumerated preference is saved through `studioWriteOwnership`, using the existing
writer or a bounded claim of the same Web Lock; load the latest preference before
writing and never save without ownership. A denied or failed save applies only
to the current page and must be reported visibly. See `docs/studio-ui-library.md`.

Decorative focus selectors consult the document's `data-studio-focus-visible`
flag through the zero-specificity `:where(html:not([data-studio-focus-visible="false"]) *)`
guard on the focus branch. This includes borders, shadows, SVG handle marks,
and parent, sibling, or pseudo-element rings in portalled overlays. Preserve
hover and active branches, semantic selections, authored content focus styles,
and forced-colours overrides. `tests/focus-decoration-contract.test.mjs` checks
the application stylesheets for new unguarded decorations. Shared package
adaptations belong at Studio's consumer boundary.

## Panes and shared controls

The Pane section of the Studio UI Library documents the shared internal Pane
components used by Studio Navigation, Block Library, Editor Inspector, Design
Pages/Layers and Design Properties. Its component contract is v1.9.0; see
`docs/pane-library.md`. Block Library's three-pane comparison composes the shared
Pane and keeps collapse-control placement in its comparison layout; coincident
left boundaries stack controls in pane order, and the all-collapsed stack sits
flush to the visible viewport's far-right edge without a reserved rail.
Catalogue fixtures and demo state remain separate from
product stores and write ownership. Product data, commands and pane-specific
behaviour remain owned by their existing features. Pane specimens permit
temporary edge resizing, with contained horizontal scrolling at narrow widths;
collapse controls remain available. Studio Navigation and Editor Inspector
adopt the shared resizing contract. Other product panes retain their existing
widths and responsive behaviour.

Studio Navigation groups its tool rows and site rows in separate collapsible
Tools and Sites sections. Show each eye action only while its section is open.
Activating that action enters a section-local edit mode; per-row visibility
toggles and drag handles appear only in that mode. Keep hidden rows available
there for restoring or reordering, and keep row labels from navigating while
editing. Save visibility as a shared browser preference and order through the
existing navigation ordering owner.

Styles → Interactions owns one neutral hover background in the executable
`@acm/styles` preset, shared by disclosure headings, neutral controls, menu items
and list items. It defaults to `#F0F0F0`. Selected, pressed, disabled and
destructive states keep their own treatments. The Controls → Accordion specimen
has no separate colour preference; see `docs/studio-ui-library.md`.
Styles → Interactions also owns interface selection colour, independent of
palette Accent. Its v0.9.0 executable preset reads v0.1.0–v0.8.0; the default
`#0088FF` feeds the stable Studio alias, including portalled selections. Local
saves refresh loaded tabs without remounting drafts. Focus and action states
retain their separate roles.
Styles → Interactions also owns Block selection colour (`#FF383C`), separate
from Alert and interface selection. Content and template editors
share one square 1px selection overlay without changing authored corner radii
or layout. Range highlighting uses the same colour at 30%; focus stays separate.
Shared template-part references instead use the Interface Styles Shared Block
Selection colour for hover and selection; ordinary blocks inside a part retain
their normal selection. In content editing, selecting a shared Header or Footer
clears block selection, while Edit opens the shared original. Preview and public
output do not show authoring outlines. The Workspace playground demonstrates
the shared part, including nested references and reset. The interface preset
v0.2.0 adds this colour; v0.1.0 CSS exports fall back to block selection.
Styles → Interactions owns Control accent colour (`#3858E9`) for enabled
toggles and standard sliders. @acm/styles derives hover by darkening each sRGB
channel by 12%, and pressed by darkening hover a further 12%. Controls examples
inherit the shared colour without temporary colour pickers; their reset affects
example values only. Specialist hue and alpha tracks remain separate.

Andrew authorised an exception to the visible-close-control rule on 11 October
2026 for compact editor toolbar dropdowns: omit Close buttons and rows, following
the Gutenberg reference. Escape closes the topmost dropdown and returns focus to
its trigger; clicking outside or clicking the trigger again also dismisses it.
Dialogs and larger editing popovers retain visible close controls.
On 18 October 2026, Andrew clarified that dropdown selection and action menus,
including Font and Appearance and their Library specimens, must omit the Close
row and X. Reuse dismissal from the shared menu: Escape closes the topmost menu
and returns focus to its trigger; outside click and trigger toggle also dismiss.
Do not reintroduce a Close control when adding or reusing a dropdown.
On 18 October 2026, Andrew extended this exception to the compact Styles pane
header actions menu: omit its Close menu row and X while retaining Escape,
outside-click and trigger-toggle dismissal with focus return.
Andrew extended this exception to the Site Editor Typography options menu on
18 October 2026: match the supplied WordPress menu without a Close control,
retaining Escape, outside-click, and trigger-toggle dismissal with focus return.
The Typography menu is 240px wide to match WordPress and may overlap its
owning pane only when needed to remain at that width, while staying within the
viewport. Its width stays feature-specific.

Site Editor → Styles → Browse Styles uses Twenty Twenty-Five reference designs with full variations, separate palettes and typography, and
global defaults with independent site overrides. Reference fonts are confined
to specimens and website presentation. Identity and Styles keep independent
session-only histories and save through their canonical settings owner. See `docs/site-editor-styles.md` for provenance, licences,
scope, and verification. Local fixture settings are authorised; the universal interface preset stays separate.
Site Editor Typography marks authored option values with individual Reset
actions beside their visibility toggles. Each reset removes only that option's
override and records through Styles history; Reset all clears the current role.
Site Editor Font Library permits deactivating and reactivating typeset fonts.
Select all and variant checkboxes stay editable; Update records scoped availability
in Styles history. Retain disabled families for reactivation and authored family
choices for recovery; the webpage and Style Book use their CSS fallback while disabled.
Site Editor element Colour uses the selected website palette, including custom
alpha editing. Links offers Decoration instead of Letter Spacing and Letter Case.
Appearance retains CSS weight and normal/italic style together through inheritance,
rendering, reset and history; missing faces use browser matching and synthesis.
Site Editor Font and Appearance choices share the font-preview menu so each
family or weight is shown in its actual typeface. The shared FontFamilySelect
uses this presentation only when `previewOptions` is enabled; other consumers
retain the native select.
Style Book toggles the sample webpage into live, labelled style specimens.
Overview and Typography/element views share the effective Styles selection,
role resolvers, history, and canonical Studio BlockRenderer. Specimen actions
navigate only to existing typography or Browse Styles controls; the book has no
content editing, block-style persistence, or independent history. Desktop panes
and the book scroll independently; narrower layouts retain the shared stacked
workspace. See `docs/site-editor-styles.md` for the reference and supported scope.
Site Editor webpage, Style Book and Controls → Preview frame inherit the shared
`controls/resizable-preview-frame.tsx`, its stylesheet and `preview-frame-size.ts`.
It owns the centred left-edge handle, appearance, animation, pointer lifecycle,
keyboard resizing, bounded sizing and rounded scroll surface. Hosts supply space
and content; Site Editor retains its desktop workspace layout adapter. Width is
temporary view state outside style/identity history. Preserve capture-loss size
retention, explicit cancellation and independent content scrolling in every consumer.

Pane accordion sections inherit `InspectorAccordionSection`, the production
control shown in the Studio UI Library. Consumers supply content
and optional open-state callbacks; keep disclosure state, chevrons, hover, focus,
and mounted-content behaviour in that shared component. Accordion dimensions and
spacing belong to its shared styles; use `pane-inset` and the shared `--pane-space`
rhythm for standalone controls rather than product-specific margins. Pane regions
use the shared inset layout or declare `flushRegions` when they contain full-width
sections. Keep pane edges free of padding and margin; do not override region
padding in consumer CSS. Feature content retains its own internal spacing.

Managed image surfaces deliberately use native `img` elements to retain browser
Blob URLs, authored dimensions and portable rendering without a Next image
service. The owning renderer, lightbox and Pages catalogue document narrow
`@next/next/no-img-element` exceptions. These exceptions concern image
optimisation only; alternative text, keyboard behaviour and other accessibility
checks remain required.

## Popovers and editor fields

Studio popovers and menus inherit `StudioAnchoredPopover` and
`StudioAnchoredMenu`; point context menus and submenus use the same placement and
dismissal foundation. Native modal flows inherit `StudioDialog`. Keep pending
request dismissal restrictions, editing commits, permissions, and range ownership
in their feature adapters. Specialised colour/gradient editors retain their
shared controls and overlay dismissal contract. Image resource maps use
`useBlobUrls`, and simple image choosers use `ImageChoiceGrid`; never allocate
persistent preview URLs during render. See `docs/studio-ui-library.md`.

Dynamic document fields inherit the pure `document-field-content.tsx` views and
the existing `FeaturedImage`. Hosts retain visibility, missing-value policy,
selection, input editing, and media actions. Design canvas, thumbnails, library,
and raster exports inherit `design-artwork.tsx` and `design-geometry.ts`; keep hit
targets, selection handles, and inline editing in the canvas adapter. Serialise
exports through React rather than assembling SVG from model strings. Design
properties use shared range, colour, font-select, and toggle controls with explicit
adapters for their stored values. Required colours disable the shared clear action.
Workspace history and zoom recognition inherit `workspace-shortcuts.mjs`; listeners,
ownership, bounds, and reset actions remain with each workspace. Preserve Studio's
explicit rich-text and table history ownership exceptions.

The Site Editor shadow preset actions menu is an explicit placement exception:
Andrew requested it directly below its three-dot trigger on 20 October 2026,
using the shared anchored menu with start alignment and viewport clamping.
The viewport States menu is also trigger-anchored and end-aligned, with standard
viewport clamping. Do not move it to the owning pane's left edge.

Position popovers according to the ownership of the control that opens them.
When a control inside a pane opens a popover owned by that pane, place it on the
workspace-facing side of the pane — the left side for a right-hand inspector —
so it does not obscure the workspace. Declare
`data-inspector-popover-owner` on the actual pane boundary and use the shared
inspector-popover positioning contract; do not position from the section
button's horizontal coordinate. Apply this to pane-owned controls in live
editors and UI Library specimens, including colour and gradient editors,
font-size units and document settings.

Controls outside a pane, including controls on the editing canvas, keep their
popover anchored beside the control that opened it. Do not use inspector
placement just because the popover edits inspector data or a pane is elsewhere
in the workspace. Determine ownership from the actual control and pane boundary,
not its block type or feature. Explicit trigger-anchored menu rules, such as the
viewport States menu above, remain in force.

Portal children retain their original pane owner. Nested editors may extend
further left of their parent popup. Keep overlays within the visible viewport
as far as available space allows, without automatically flipping to the right.
Reposition on pane/popup resize and scrolling, and preserve close controls,
Escape dismissal and focus return. See `docs/pane-library.md`.

## Responsive editing and placement

Posts, pages, and template block editors share View → Responsive styles. Desktop
edits the shared baseline; Tablet (>480px and ≤782px) and Mobile (≤480px) have
independent bounded ParagraphStyle overrides inheriting Desktop. Turning the
session toggle off preserves overrides and edits Desktop at any preview width.
Device inspectors expose supported typography, colours, borders, and spacing;
native layout/content, assets, Advanced fields, interaction states, and shared
site styles remain Desktop controls. Fit-text blocks retain shared fitted sizing.
Block toolbars remain shared, including every nested control group, and must stay
on one horizontal row. Never wrap or stack toolbar controls to fit a block or
pane. When a toolbar extends beyond its selected block or the visible canvas,
keep the complete row and all controls accessible through horizontal canvas
overflow. Canonical CSS mappers emit escaped device deltas; editor container
queries and local publication media queries share the ranges.
See `docs/responsive-styles.md` for contracts and acceptance checks.

The main content and template editors remain three-pane desktop workspaces at
narrow viewport widths. The navigation track retains its chosen width as the
browser narrows. The canvas retains a 160px minimum and the inspector stays at
the viewport's right edge, overlapping the workspace where needed; its existing
collapse control exposes the covered content. Retain horizontal scrolling and
the three-pane order until a dedicated mobile arrangement is designed.

All Studio insertion-gap dragging inherits `use-drag-placement.ts`,
`drop-gap-geometry.ts`, and `DragPlacementIndicator` for input, cancellation,
freshness, geometry, and the single measured, centred line per logical boundary.
Domain adapters define valid destinations and commits; do not duplicate the
controller, geometry, renderer, or edge-scrolling lifecycle. Preserve
effective-change, source freshness, ownership, container, and lock checks in both feedback and commit. Content and template
canvases share block placement; Navigation and Design share sibling gap
reordering. Template wrappers and toolbars are not additional siblings.
The shared controller reserves outer insertion spaces through
`drag-placement-space.ts`. Andrew authorised border-aligned end indicators globally
on 19 October 2026: first and last indicators centre on their item boundaries;
interior indicators remain centred between siblings. Retain reserved hit space
and do not add consumer-specific offsets or padding rules. Preview and saved content retain their original
dimensions. Captured mouse drags retain cancellable edge scrolling. See
`docs/drag-placement.md` for the inventory, exclusions, and verification recipe.

Edit and Preview must share block presentation rules, including typography,
colours, spacing and dimensions. Use the Studio variant of `BlockRenderer`
for editor previews, not the public article's prose theme. Keep selection
controls and empty-field prompts editor-only; excerpts are metadata, not
additional body content. Verify both modes when changing a block's appearance.

Document featured-image controls show the resolved image with overlaid Replace
and Remove actions. Featured-image selection uses existing Files alternative
text directly; body-image insertion also inserts directly, using the saved alternative
text or the filename when it is empty. Users can edit the alternative text
afterwards in the inspector. Template
featured-image actions use the shared centred image overlay.
Hidden template images remain recoverable through Restore in authoring Edit.
