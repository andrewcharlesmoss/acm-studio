# Studio UI Library

## Tool navigation icons

`app/studio/studio-tool-icon.tsx` owns tool icon mappings for the homepage and
editor navigation. Both surfaces render the same `@acm/icons` catalogue artwork
at the Regular-M optical scale. Files uses `library.files`, Design Canvas uses
`library.designs`, Backup uses `output.backup`, and Bin uses `action.delete`.
Templates uses `component.block`, Content Studio uses `action.edit`, and Studio
UI Library uses `layout.columns`. Their surrounding surfaces may differ.

## Purpose and organisation

Open `/studio/ui` from the Studio dashboard or its content and template tools.
The library has nine sections:

- **Navigation** — the reusable top-level Application Section Navigation
  component, with an isolated interactive example.
- **Workspace** — application section navigation, a combined live Ribbon and
  two resizable panes around a centre workspace, assembled from the shared
  components and temporary fixtures.
- **Ribbon** — Ribbon component structure, controls and isolated Studio/Account
  product examples.
- **Panes** — shared Pane structure, optional regions, resize/collapse behaviour
  and isolated Studio examples.
- **Panels** — the shared card surface and header slots, demonstrated with
  temporary sample data from `@acm/panel`.
- **Blocks** — block definitions, inspector capabilities, relationships and
  isolated editing specimens. A grouped index covers all 28 typed block types,
  plus the template Content slot. Each entry has a detail route at
  `/studio/ui/blocks/{type}`; Paragraph keeps `/studio/ui/blocks/paragraph`.
- **Controls** — working control specimens, including the shared Slider foundation,
  with their supported states, ownership and consumers on the grouped
  `/studio/ui/controls` page.
  Group and control links jump to in-page specimen anchors. Recognised legacy
  `/studio/ui/controls/{id}` detail routes redirect to the matching anchor.
- **Icons** — original shared ACM symbols, metadata, provenance and optical
  specimens at 16, 24 and 32px, with a Block Library collection that shows the
  exact symbols used by each insertable block and the template Content tile.
- **Styles** — the executable universal style preset, editable in a local preview
  editor with a live specimen and source view. Save Shared Styles writes the
  shared preset and synchronises its guide tables in local development.

Navigation is `/studio/ui/navigation`, the Ribbon section is
`/studio/ui/ribbon`, Panes is `/studio/ui/panes`, Panels is
`/studio/ui/panels`, Blocks is `/studio/ui/blocks`, Controls is
`/studio/ui/controls`, Icons is `/studio/ui/icons`, the Block Library icon
collection is `/studio/ui/icons?collection=blocks`, and Styles is
`/studio/ui/styles`. `/studio/ribbon` and `/studio/panes` remain
compatible redirects. Studio navigation links to the combined library.

The top section bar is an in-page tab set. Selecting a section replaces the
content without changing the current URL; arrow keys move between tabs, and
Home/End select the first/last section. Existing section, block detail, icon
collection and control URLs remain direct entry points. Reloading a direct URL
opens its original section. Section catalogue state is temporary and resets
when its component is unmounted while switching sections.
Lazy-loaded sections show a loading status and a local error message with a
reload action if their code cannot be loaded.

Page-level kickers use uppercase styling across every library section. The
shared library stylesheet covers the common page intro and the Ribbon and Pane
intro variants; secondary specimen kickers retain their own wording and style.

The Controls jump menu retains a clicked or hash-linked specimen throughout
anchor scrolling, even when the destination cannot reach the viewport top.
Manual page scrolling resumes tracking at each specimen's top scroll margin;
gaps retain the preceding specimen. Scrolling the menu itself does not change
the destination. Hover uses the shared neutral background, and selection does
not change text weight or move the surrounding menu entries.

Page introductions share heading typography and 32px desktop / 16px mobile
gutters. Group headings, specimen cards and supporting disclosures align to
the same content edge. Controls specimens use the production inspector's field
styling and 13px interface baseline, with ordinary controls shown at practical
inspector widths. Image-dimension examples scale their preview to fit the
available space while retaining the configured pixel values. The Styles
workbench stacks before its three columns exceed the available page width.

## Ownership boundaries

The library groups reference views without combining package ownership. The
sibling `@acm/icons` package owns original shared symbol artwork and metadata;
ACM Studio owns its Studio-specific symbols. The Block Library collection
identifies which source supplies each tile symbol and previews both sets at
16, 24 and 32px. Shared symbols use their Regular-S, Regular-M and Regular-L
optical artwork. The Heading tile uses a generic Studio heading marker; the
selected heading level stays in the block's level control. The sibling
`@acm/styles` package owns the executable universal
style values and CSS custom-property exports. The governance Style Guide remains
authoritative for policy. The Ribbon and Pane implementations remain in their
existing modules and retain their own contracts. The Panels section consumes the
product-neutral `@acm/panel` package. Its card owns the surface and slots;
consumers own position, width, resizing, visibility, data and actions.
Workspace composes the shared
components and includes the generic Application Section Navigation specimen;
it does not copy either implementation or use product stores. Application
section navigation owns the visual relationship between top-level product
sections; consumers supply the labels, routes, permissions and active section.
The Navigation section demonstrates that shared component directly; Workspace
shows how it composes with the Ribbon and panes.

The memory-only selection specimen at `/studio/ui/selection` uses the shared
Studio Canvas. Drag across blocks, including from or into its empty “Type / to
choose a block” appender, to select real blocks for one undoable deletion. The
empty appender represents the document end, not a saved block. A populated
appender retains native text selection and its draft; normal typing, slash
insertion and the Add Block button keep their existing behaviour.

The docked Block Library uses three icon-and-label tiles per row. Supported
Gutenberg equivalents follow its category and registration order: Text
(Paragraph, Heading, List, Quote, Code, Table), Media (Image), Design
(Button, Columns, Group, Separator, Spacer), Widgets (Social Icons and available
social children), Theme (Title, Featured Image, Author, Date,
Reading Time), then Embeds (Embed). ACM-only Section and Field follow the Design
equivalents; Document Subtitle remains in Other. The Theme labels use Gutenberg's
current names. Unsupported Gutenberg blocks
are omitted. Descriptions remain available as tile tooltips and search terms.
The canonical category list and block catalogue drive editor and specimen menus.
Upstream references checked on 2 October 2026: [Gutenberg registration order](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/index.jsx),
[WordPress default categories](https://github.com/WordPress/wordpress-develop/blob/trunk/src/wp-includes/block-editor.php)
and [Gutenberg three-column block list](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-editor/src/components/block-types-list/index.jsx).

The docked Block Library stays open after selecting a tile by mouse or keyboard.
It preserves search and the insertion parent, and repeated root insertions advance
in click order. Close, Escape and the Add Block toggle dismiss it explicitly;
transient pickers and appender submission retain their existing behaviour.

All catalogue fixtures and demo interactions remain temporary component state.
Focus Outline is a deliberate user-preference exception.
The Library header and
editor View menu share On, Off and Keyboard Only across every ACM Studio route.
On shows outlines for pointer and keyboard focus; Off hides them; Keyboard Only
(the default) shows them after meaningful keyboard input and hides them after
pointer input. Modifier keys alone do not switch input mode. Portalled overlays
inherit the active choice immediately. Keyboard navigation, editing carets and
selected-item markings remain available in every mode. Andrew explicitly
authorised Off for ACM Studio; forced-colours mode retains visible focus.

The preference survives reloads and full-page Studio navigation when saving is
available. The isolated `acm-studio-focus-outline-v1` key accepts only the three
modes and uses `studioWriteOwnership`: an existing writer saves it through the
coordinator, otherwise a bounded claim loads the current preference and saves
under the same exclusive Web Lock. It never writes content or uses an unlocked
fallback. A denied or failed save keeps the choice on the current page and shows
a status beside the setting. Other open pages load the saved choice on their next
navigation or reload. Studio's route layout owns listeners and document scope;
public article routes retain their usual focus behaviour. The setting does not
change the shared style preset. Catalogue demos do not call product APIs or
read/write product stores.

Styles → Interactions has one Neutral hover background setting for disclosure
headings, neutral controls, menu items and list items. The preview retains four
examples to show the shared colour. Selected, pressed, disabled and destructive
treatments keep their own colours. Button variants and content links retain
their existing settings; sliders remain separate.
The six-digit hex value defaults to `#F0F0F0` and uses the existing draft,
Undo/Redo, reset and revision-checked Save Shared Styles flow. The Controls →
Accordion specimen demonstrates the shared appearance without a separate
colour control or browser preference.

The shared `blockCapabilityProfiles` registry is the source for the Blocks
index and runtime shared-style inspector ownership, defaults, reset fields
and conditional settings. The disclosure-only projection in
`app/studio/blocks/catalogue-documentation.ts` supplements those profiles with
current availability, canvas/summary placement, nesting, document context,
actual direct/composed dependencies and compatibility notes. It must never be
passed to an inspector, validator, reset action or saved-data migration.
Disclosures are capability categories, not a promise of visual pane order.
Gutenberg/ACM labels describe origin, not separate panes. Hidden retained
attributes and model-only fields are distinguished from available controls.
The recorded pinned Gutenberg defaults are separate from Studio insertion
defaults; they do not certify current upstream parity. It does not
define a second saved format. Block-specific inspectors keep their established
editing components and data contracts. Each specimen uses production `BlockField`,
`BlockInspector` and Studio `BlockRenderer` components with temporary,
selectable examples, local document metadata and an isolated local media
fixture. Container entries include children; Table shows populated and empty
states; Footnotes have references; Component remains inactive; Content shows a
template projection. Navigation at `/studio/ui/blocks/navigation` reuses the
production Navigation canvas, inspector and template renderer, with temporary
menu links and node settings. Its Menu, Settings and Styles controls share the
specimen's history. Undo and Redo cover temporary block and document changes.
The preview uses ordinary linked text, and inspector control inventory,
relationships and compatibility notes are collapsed disclosures. No specimen
reads real documents, browser persistence or the product write lock.

The Controls section presents working controls and a standalone Slider
foundation on one grouped page, with in-page jump links and isolated specimen
state. It retains the original inspector specimens and adds border settings,
font size and Appearance, background colour/gradient, preset number, image
dimensions and focal position. The production inspector and specimens share
the extracted BorderSettings, BackgroundSelection, FontSizeAppearanceSetting,
ImageDimensionsSetting, FocalPositionSetting and PresetNumberSetting controls.
Colour-picker ownership includes palette selection, Default/Hover values,
swatch geometry, popover positioning and dismissal. Text actions such as Clear
use the shared semantic Accent token as described below. The gradient angle dial marker uses `--gutenberg-accent` for Gutenberg's
accent blue.
Styles → Interactions owns Control accent colour (`interactions.controlAccentColour`),
shared by enabled toggles and standard sliders through `--studio-range-accent`. Inspector ranges compose `RangeControl` for a value label
beneath the thumb while it is hovered, focused or dragged. Labels do not change
row spacing or saved values. Shared spacing controls name the standard presets
(None, 2X-Small, X-Small, Small, Medium, Large, X-Large and 2X-Large); custom
values retain their measurement and unset values display Default. Disabled
ranges do not show a label. Native range keyboard semantics and caller handlers
remain intact. This follows the behaviour of Gutenberg's
[RangeControl](https://github.com/WordPress/gutenberg/tree/trunk/packages/components/src/range-control).
`RangeControl` owns the 12px thumb, 4px track, progress fill and interaction halo
for composed inspector sliders. Font Size and Border share `NumberUnitField`:
a 40px field with no visible number spinner and a blue native unit selector.
Border supplies its colour button through the optional leading-control slot;
value validation and supported units remain with each setting. Font Size's
slider ends at 100px or 10 in relative units, independently of the larger
numeric-entry limits retained for saved-content compatibility. Border's default
slider ends at 100 and expands to accommodate a larger entered width. Raw range
inputs retain their native presentation until they adopt `RangeControl`.
Custom padding and margin sliders use a 0–300 scale for px, 0–10 with 0.1 steps
for em/rem, and 0–100 with whole-number steps for percentage and viewport units.
Studio's supported ch unit uses the same 0–100 fallback scale. Controls that
allow negative margins mirror the range below zero. These are slider scales,
not limits on saved dimensions: numeric entry may exceed them, and changing a
unit preserves the number without converting it. An out-of-range measurement
stays in the numeric field while the slider thumb and label use the nearest
endpoint; adjusting the slider writes a value within its current unit's scale.
Radius and other controls retain their own bounds. The spacing reference is
Gutenberg's [SpacingInputControl](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-editor/src/components/spacing-sizes-control/input-controls/spacing-input-control.js).
The shared accent also applies to
standard `.studio-range-control` inputs. Focus outlines follow the Studio
Focus Outline preference and focus tokens. Pointer hover uses
`--studio-range-hover-accent`, which defaults to a 12% darker shade of the shared
accent. While a range is being pressed or dragged, `--studio-range-pressed-accent`
defaults to a further 12% darker shade of the hover colour. Both state colours are derived automatically in @acm/styles; they have no
separate saved settings. The Controls page inherits these shared values and has
no temporary colour pickers. Reset example restores only its toggle or range
value. Consumers retain their native range values, bounds, steps and behaviour.
Gradient hue and alpha inputs keep their specialist tracks. Each Controls
section retains its ownership and dependency details.
Its theme palette uses the
shared ACM semantic colour tokens, with 28px circular swatches, Gutenberg-like
spacing and selected borders in up to six columns, a 262px desktop popover and
a content-fitting preview card that keeps names and values visible. Link contrast remains with the
Link adapter. Each control records consumers, ownership, supported states
and compatibility in a collapsed disclosure with links to its real block
consumers. Examples use temporary component state and provide Reset Example and
disabled states where supported. Recognised legacy detail routes redirect to
the matching control anchor on the grouped page. Ribbon catalogue specimens
remain examples and are not inspector dependencies.
Ribbon icon usage in the inspector means examples in the Ribbon catalogue only;
it is not an exhaustive inventory of use throughout ACM products.

The Icons inspector downloads the selected original symbol as SVG at its chosen
16, 24 or 32px optical size. PNG downloads use the same optical geometry at
three times the selected pixel dimensions and retain a transparent background.
The Interface Icons collection keeps catalogue order by default and can sort
symbols by newest or oldest first. The inspector shows the selected symbol's
first package commit timestamp in UK local time; the owning `@acm/icons` package
keeps the complete ISO timestamp with its UTC offset for exact chronological
sorting.

Styles edits the `@acm/styles` v0.3.0 preset beside the full written
workspace Style Guide. Hovering or focusing a specimen or setting shows its
baseline, current draft value, guide excerpt and exact line; clicking or
tapping pins the source selection. Hovering a mapped row in a guide table
temporarily shows its matching rule in the source details; moving away restores
any pinned selection in the source details and written guide. Hovering or
focusing a semantic colour in the preview opens Colours and highlights its
matching Settings row without moving keyboard focus. Hover temporarily takes
precedence over a pinned source selection; moving away restores that selection.
Hovering or focusing a colour Settings row also highlights its matching preview
swatch, using the same transient selection.
Pointer hover keeps the current category open while a Settings control has focus,
so an active editor is not removed. Colour swatches use the preview selection
outline to show the matching token. Focus Outline controls their shared grey
focus indicators.
Mapped guide lines use the same focus tokens, with system colours retained in
forced-colours mode. The source panel records the last commit that changed the
guide, its saved content digest and whether it contains working-tree changes.
The generated index is bundled with Studio; hosted pages read no sibling files.

### Saving shared styles

Colour, typography, button, interaction and layout edits immediately update the specimen,
guide table cells, selected excerpt and Markdown source. Unsaved drafts stay in
component state. In local development, **Save Shared Styles** validates and
writes these exact files:

- `acm-styles/src/universal-style-preset.json` — canonical executable values;
- `workspace-governance/STYLE_GUIDE.md` — generated token table cells only;
- `acm-studio/app/studio/ui/styles/style-guide-source.json` — guide and line index.

The preset schema is v0.7.0 and reads v0.1.0–v0.6.0. v0.4.0 migration chooses
the first non-default colour in neutral-control, disclosure, menu-item and
list-item order; otherwise it uses the neutral-control value. v0.3.0 retains its
disclosure value, and v0.1.0/v0.2.0 use the default. Guide policy, reference palettes and prose are
not editable through this interface. Responsive overrides appear alongside the
desktop metric, for example `1rem; mobile: 15px`. Source saving is dev-only and
does not publish, commit, push or directly update project-owned style settings.
Loaded local Studio tabs refresh executable tokens after a successful save and
on window focus, without remounting editors. Other consumers read saved values
on their next load or rebuild.
Hosted Studio retains draft previews but reports source saving as unavailable.

Save borrows the existing Studio writer or makes a bounded claim of the same
Web Lock. A competing editor tab blocks saving visibly; close that editor or
open the library in its window. The gateway checks the exact localhost origin,
expiring session token, fixed targets and complete source revision. It serialises
saves behind a file guard and checks each replacement and the final readback.
External file edits refresh on window focus when the draft is unchanged. A dirty
draft is preserved and stale saving is refused. **Reload Source** loads the latest
files and discards the draft and its history; its tooltip states this consequence.
A lost save response blocks another save until a successful source reload.
External editors do not participate in the gateway's process guard: avoid editing
these source files while a save is running. Revision checks reduce conflicts but
do not provide an operating-system-wide atomic compare-and-swap.

Reset properties, Reset Section and Reset All restore the loaded saved baseline.
Undo and Redo retain up to 60 draft changes across all controls. Continuous colour
or number edits share a history step until focus changes; a new edit after Undo
clears Redo. Saving retains history, so Undo after Save creates another unsaved
draft. Preview sizes, panel selection, searches and guide navigation are outside
history. Command+Z/Command+Shift+Z on macOS and Ctrl+Z/Ctrl+Y (or Ctrl+Shift+Z) on
Windows/Linux work on this page; editable fields keep native text history.
Leaving Styles discards unsaved drafts and history; saved source values remain.

After editing or committing guide prose, run `npm run styles:source` from the
ACM Studio root. `npm run styles:source:check` verifies the bundle without writing.
The generator accepts an uncommitted guide and labels that provenance explicitly;
it refuses token table values that differ from the canonical preset. Use Save
Shared Styles to synchronise an externally edited preset with those tables.

### Interrupted save recovery

Ordinary replacement failures roll written files back. If rollback cannot be
verified or the process stops mid-save, further saving is blocked. The ignored
`work/shared-styles-recovery.json` contains the exact before and after contents of
all three fixed files. It is retained for recovery, not served through Vite.

Stop the local server before recovery. Inspect all three current files against
that journal, preserving any external edits. Restore a consistent before or after
state only after reviewing the exact targets; do not overwrite a file that matches
neither state. Run `npm run styles:source` and `npm run styles:source:check` once
the preset and guide agree. Remove the journal and `work/shared-styles.lock` only
when recovery is verified and no server holds the guard, then restart and Reload
Source. A remaining lock without a journal also requires checking that its
recorded server PID has stopped before removing it.

The block HTML editor and document code editor use `StudioButton`: Base for Apply
and Secondary for Cancel. Its scoped `@acm/styles` preset supplies colours, border, shape and
hover treatment. Studio retains its system UI typography and focus preference;
the adapter dims disabled buttons and keeps their variant colours while hovered.
The Styles sandbox previews this same baseline without changing editor settings.

The link and rich-text editors, block editorial dialogs, template naming and
media insertion also use `StudioButton` for their Cancel and Apply/Save actions.
Destructive commands retain their feature-specific treatment.

`overlays/StudioDialog` and `StudioDialogActions` own native modal opening,
accessible headings, the close button, Escape dismissal, initial field focus,
focus return and action layout. Block naming, notes and locks, template naming,
image descriptions and permanent-deletion confirmation consume this shell;
feature owners retain drafts, validation and write-ownership checks.

Colour and gradient pickers share `PopoverHeading` and `useOverlayDismiss`.
Dismissal applies to the topmost registered overlay; nested custom-colour and
control-point editors close before their parent. Their existing inspector
positioning and colour-editing contracts remain authoritative.

Block options, list actions and Design context menus share `StudioMenuItem`
and `navigateStudioMenu` for disabled-aware Arrow, Home and End navigation and
Escape/Tab dismissal. Each owner retains its actions, focus-return target and
placement, including the distinct inspector positioning contract.

`StudioAnchoredMenu` owns viewport placement, portal rendering, resize/scroll
tracking and topmost dismissal for More text formatting and Block options.
Its Controls specimen lives at `/studio/ui/controls#anchored-menu`. Long menus
scroll on the side with more space; visual viewport offsets and dimensions
constrain their bounds. Commands and saved text ranges remain with the caller.
Escape and repeat-trigger dismissal restore the opener; outside dismissal
retains the clicked target, and Tab continues from the opener's document order.
Inspector menus keep their separate workspace-facing pane-edge contract.

The font picker offers Inter and the individual fallback families from the
shared stack: Helvetica Neue, Helvetica, Arial and generic sans-serif. Older
System Sans and Georgia preset values remain valid for compatibility but are
not offered by the picker.

## Shared tab indicator

The Studio UI Library owns the common Ribbon and Pane underline rule. At rest,
the line matches the label. Hovering an unselected tab keeps its neutral grey
line at label width; hovering the selected tab expands its active line while
leaving a small inset at the tab edge, and leaving retracts it. Keyboard focus
keeps the label-width underline and uses the visible focus outline. The underline
remains line-only, with no full-width divider beneath the tab strip or hover
background block. `@acm/ribbon` implements the Ribbon behaviour, and Studio Pane
tabs follow the same geometry and motion. Product consumers may
theme indicator colours but should not replace the shared sizing or transition.

The Workspace specimen offers two comparison states: Selected only keeps the
underline on the active tab, while Subtle hover also shows a muted underline on
the hovered or keyboard-focused tab and slightly expands the active underline
on pointer hover. This control changes catalogue specimens only; the shared
default remains Subtle hover.

## Verification

From the ACM Studio repository root:

```sh
node --experimental-strip-types --test tests/studio-ui-library.test.mjs tests/ribbon-catalogue.test.mjs tests/pane-library.test.mjs
npx tsc --project tsconfig.ribbon.json --noEmit --pretty false
npx tsc --project tsconfig.panes.json --noEmit --pretty false
npm run build
npm run lint
npm run styles:source:check
git diff --check
```

In a browser, inspect all nine sections, the legacy redirects, section-navigation
selection, Ribbon and Pane
specimen interactions, icon search/selection/provenance, and the combined
Workspace with both panes expanded, resized and collapsed. Check keyboard
navigation and focus, desktop/tablet/mobile widths, and verify narrow preview
overflow stays inside the Workspace frame while the page itself remains usable.
Include 320px and 390px mobile, 768px tablet, the 1060px Styles transition and
1440px desktop widths when reviewing catalogue layout. Compare section
introductions, card edges, toolbar alignment and expanded disclosure states.
For Blocks, visit every entry and verify editing, selection, Preview, Reset
Example, Undo and Redo. Check setting origin and availability in the shared pane, conditional
controls, retained legacy values, temporary document fields, nested selection,
local media and the template Content projection. Verify unsupported gaps against
the compatibility guide. For Controls, visit all 19 in-page specimens, exercise
their values, disabled examples, conditional availability and reset actions,
and check consumer links, group/control jump links and compatible legacy detail
route redirects. Check palette
popover Escape/outside dismissal and focus restoration. Use desktop, tablet and
mobile widths, keyboard navigation and 200% zoom; library pages adapt without
changing the production editor's documented workspace arrangement. Exact
Gutenberg pane comparison remains unverified where the pinned source or capture
is unavailable, as recorded in the compatibility guide.
For Styles, check palette, typography, button and layout controls, inherited
responsive values, property/section/global resets, and contained mobile preview
scrolling. Check hover, focus and pinned guide references, exact source lines,
search navigation and responsive panel selection; verify that edits are not
written to browser storage.

## UK keyboard collection

The Icons section groups interface icons and the complete common UK ISO Keyboard
collection at `/studio/ui/icons?collection=keyboard`. It presents 154 key
identities across 144 active keyboard symbols: letters, platform-specific
number-row and punctuation
legends, modifiers, editing/navigation keys, function keys, numeric keypad,
Mac-specific legends and optional Windows hardware keys. The Mac British/Irish
section/plus-minus key and grave/tilde key are distinct from the Windows UK
grave/shifted-not/AltGr-broken-bar top-left key. Mac number 2 has @ and a small
€ marking; Mac 3
has £ and a small # marking; the Mac apostrophe key has a double-quote Shift
legend. Windows variants retain their UK legends. The collection includes Mac F1–F12 action legends,
separate F1–F19 keys, and a Copilot mark based on Andrew's supplied reference.
Function assignments and optional keys vary by model, OS and manufacturer;
this is a catalogue of common key types rather than a model-exact physical
layout.

The sibling `@acm/icons` v0.10.8 package owns the glyph masters, shared square,
wide, tall, Backspace, Spacebar, numeric-zero and left/right Shift keycap frames, platform
metadata and SVG composer. Backspace is 84 × 48 units, Spacebar is 240 × 48,
left Shift is 84 × 48, right Shift is 96 × 48 and numeric zero is 96 × 48. The package contains 269
symbols overall, including the 119 existing interface icons. Older renderer
defaults remain compatible; the new Studio artwork is additive.
Studio owns the preview controls and download interaction. No keyboard
shortcuts or product controls are changed.

Choose Mac, Windows or both; switch between keycaps and bare symbols; compare
light/dark specimens. New previews start with Default: off-black symbols and
borders on an off-white keycap. The space outside the keycap stays transparent.
Choose Outline or Dark, or edit a colour to enter the automatically detected
Custom state. Use Reset to Default to restore the palette and light preview
surface without changing the selected key, platform, artwork mode or export
size. Switching keys retains your palette. The Dark preset also selects a
dark preview surface.
The border initially follows the symbol; unlink it for an independent colour.
Transparent Fill leaves the inside clear; solid fill colours only the keycap.
The outside remains transparent. Download SVG or PNG with these settings,
with heights of 64, 128, 256 or 512px. The width follows the selected key's
proportions. Unlike the interface-icon inspector's 3× PNG exports, Keyboard
exports use the displayed dimensions exactly. Inter-derived text uses common
font-metric scales, natural punctuation sizes, painted-bound upper/lower optical
bands and intentional two-line names. Generated stacked legends retain at least
two viewBox units of painted separation at every optical scale. Secondary marks
on Mac number
2/3 and apostrophe keys follow the supplied keyboard reference. Left/right Mac
Command, Option and Control variants align their symbols to match their key
positions. Their wide keycaps show larger Inter-outline word captions beneath
the symbols; bare-symbol exports show the marks alone. Mac function-row artwork
uses larger pictograms in a common band above the F numbers. Brightness Down
and Up use small and large suns without additional minus/plus marks;
Touch ID and Power have separate symbols, AltGr has its own legend, and the
Context Menu key uses a menu symbol. The F6 Focus key uses a broad, clearly
legible crescent. The selected-key inspector includes the icon's catalogue
provenance and any full licence notice supplied by `@acm/icons`. Copilot uses
the MIT-licensed monochrome brand SVG from Lobe Icons, with one preserved
ribbon shape at all three scales.
Its pinned source and licence live in `acm-icons/sources/copilot/`; SVG downloads
retain the licence notice. This is an explicitly authorised exception to the
original ACM artwork rule. The Spacebar
keycap is blank and spans more catalogue columns so its long frame remains
visible; numeric zero also spans two columns. Bare-symbol mode retains the
Space legend. Windows-only physical keys
do not appear in the Mac filter. SVGs do not require fonts. Shared keys show
primary/Shift legends and selected physically printed UK third markings;
complete alternate layers and every physical key width are outside this set.

Square, wide, tall and ISO keycap dimensions and transparent outer padding remain
unchanged. Backspace, Spacebar and Shift use the new proportions documented
above. Inter sources and licensing belong to ACM Icons; Studio neither embeds
nor loads the font for key artwork.

The Controls catalogue also owns the shared native Toggle setting and the
Quote Style variation previews and Table Default/Stripes buttons. The six text-block specimens reuse
bordered colour rows, Background stacks, segmented spacing, compact Border and
section options/reset controls. Their background media examples remain memory-only;
see the dated six-block inventory in `docs/block-inspector-compatibility.md` for
supported controls, theme conditions and model gaps.

### Block icon parity

The Block Symbols collection includes every canonical library entry, including
non-insertable Column, Footnotes and Component blocks and the template content
slot. Tiles, pane summaries, List View and generic transform choices use the
same shared symbol mapping. Heading level controls retain their H1–H6 labels.
See [Block icon references](block-icon-reference.md) for the complete ownership
and Gutenberg reference mapping.

Studio-only insertable blocks — Section, Field, Reading Time and Document Subtitle —
belong in Other, which is always the last Block Library section. Blocks with
Gutenberg equivalents retain their standard categories and names, including Title
and Featured Image. Component also remains Other
in the full catalogue, without becoming insertable.

The Heading level control at `/studio/ui/controls/heading-level` supplies the
Heading inspector's H1–H6 summary buttons. Its live and disabled specimens use
temporary state and Reset Example returns to H2. The header and toolbar consume the six shared `text.heading-one` through
`text.heading-six` catalogue symbols, each available in Interface Icons with
three optical scales and export. The selected-level header is contextual; the Block Library's generic Heading icon remains unchanged. Shared
font-size presets use one rectangular frame without internal dividers.

Table captions use the same temporary visibility controller in the canvas toolbar
and Table specimen. An empty caption stays hidden until Add caption is used;
existing caption text remains visible. Adding focuses the centred field below the
table, outside its border. Remove caption clears text and formatting through the
owning editor's undoable update. Reset Example also resets empty-caption prompts.
The caption prompt is not a persisted content attribute.

The Table toolbar uses 40px icon targets, 24px formatting symbols and wider
paired alignment controls. Its caption visibility button consumes the original
`text.caption` symbol from `@acm/icons`; the accessible name switches between
Add caption and Remove caption. Table spacing is scoped to its toolbar, while
dropdown rows retain their own dimensions.

### Block catalogue availability

Block control inventories distinguish Gutenberg-derived controls, ACM additions,
theme-unavailable controls and model-only fields without an inspector. Gap controls
link to Layout spacing; custom content/wide widths link to Paragraph length. Content
uses a real template-slot inspector and isolated body rather than a Paragraph stand-in.
Reading Time is an ACM adaptation of Gutenberg Time to Read; estimator differences
remain explicit in the compatibility guide.

### Block options menu

The canvas hover toolbar provides Copy, Cut, Duplicate, Add before, Add after,
Add note, Copy styles, Paste styles, Group/Ungroup, Lock, Rename, Hide/Show,
Edit as HTML and Delete. Create pattern is deliberately excluded. The menu is
portalled, remains within the viewport, supports arrow-key navigation, and
closes when its trigger is clicked again, with Escape or an outside pointer
press.

Add before/after inserts an empty Paragraph. Copy/Cut uses the system clipboard;
Cut removes blocks only after a successful copy. Studio clipboard pastes create
new IDs and clear unique HTML anchors. Ordinary text pastes remain native.
Copy/Paste styles uses temporary editor state, retaining the destination’s
content, name, note, locks and HTML anchors. Shared visual styles and text
alignment transfer across compatible block types; type-specific presentation
settings transfer between blocks of the same type.

Names appear in List View. Notes are single private authoring notes rather than
threaded comments. Saving a note or selecting a noted block shows its card in
the bottom-right corner of the canvas, independent of canvas scrolling. The
card offers Edit note and Back to block; Close or Escape collapses it to Show
note without deleting the saved note. Other open editor overlays take priority
for Escape. Read-only editors can view notes but cannot edit them. Cards are
hidden in Preview and the code editor. Notes do not yet store author identity
or timestamps, so the card identifies its block rather than inventing an author
or date. Hide removes content from previews and local publication;
the editor shows a compact Show control and List View retains the block. Locks
independently restrict movement and removal while leaving content editable.
Grouping and HTML edits honour existing locks and supported nesting rules.
Template HTML editing remains unavailable until dynamic nodes can round-trip
safely. All mutations use the existing document history and write ownership.

Authoring metadata is stored as optional `editorial` fields in workspace v20 and
template v0.21.0 records. Local publication v13 snapshots retain visibility but
strip private notes, names and locks. Readers retain the previous versions.


The memory-only selection specimen also demonstrates Language attributes across
adjacent French/English runs and an empty-language RTL run. Its production menu
uses the shared anchored popover shell with a live selection rectangle, native
form Tab navigation, standard buttons and the catalogue Language icon. Drafts,
formatting and history remain independent of product stores.

## Shared text actions

Clear actions and the inspector Reset All action use `StudioButton` with
`variant="text"`. The framework-neutral `.acm-button-text` variant in
`@acm/styles` owns normal, hover, pressed, focus and disabled states. Studio's
`StudioButton` supplies `--acm-color-accent` from the canonical
`UNIVERSAL_STYLE_PRESET.palette.accent`, including portalled controls. The
`.studio-text-action` theme mixes 80% Accent with 20% black for readable small
text (currently #006DCC), with a compact 32px target. The Styles section shows
the same canonical Accent; its temporary sandbox edits do not alter Studio.
Component-specific styles own placement;
they must not override the action colour or duplicate interaction rules.
The Controls library includes a working Text action specimen with Clear, Reset
and disabled actions. Callers retain their existing state and focus behaviour.
This CSS addition does not change saved UniversalStylePreset data.

Styles → Interactions owns `interactions.selectionColour` (default `#0088FF`),
separate from specimen Accent. Source highlights, selected list/media items,
menu-link outlines, gradient choices and status radio selections use the shared
Studio selection alias, including portalled controls. Styles drafts preview it
locally; saving refreshes loaded tabs from the validated source without remounting
editors. Keyboard focus and action-button colours keep their own roles.

### Revision slider

Controls → Revision slider demonstrates the shared native range timeline used
by Page and Post revisions. It has a neutral track, discrete revision markers
and a circular double-chevron handle. Hover and keyboard focus show the author
and date above the handle. Callers own history, comparison and restore actions;
the Library specimen changes temporary selection only. This specialist timeline
does not inherit the standard slider accent.

### Block presentation in Edit and Preview

Library page typography stays outside the editable block canvas. Both specimen
modes use the same content typography and compact block gap; template Content
projections apply the same template surface in both modes. Template heading
presets target editable heading fields and semantic preview headings together.
Metadata and authored captions retain the same presentation. Selection controls,
empty-field prompts, appenders, and recovery inputs remain editing affordances.

#### Template list colour regression check

`tests/template-list-colour.test.mjs` protects the shared inheritance rule in
production CSS and runs with the normal test command. It fails against the
original stylesheet. This structural guard supplements the browser check;
Node's module tests do not run a browser CSS cascade.

Open `/studio?site=test` and `/studio?site=test2`. For each site, select its
existing Test post, switch between Edit and Preview, and compare the computed
colour of `.list-item-editor` and `.list-item-text` inside the template surface.
Both must inherit the authored template text colour (the fixtures currently use
`#1C1C1E`). Check a page in each site too. Compare text size, weight, line height,
letter spacing, and alignment as well as colour; `start` and `left` are equivalent
for these left-to-right documents. Do not edit or publish content during this
check. Authored block/item colours must retain priority over inherited defaults.

Styles → Colours exposes Workspace Background as `palette.workspaceBackground`
in the shared preset (schema v0.8.0, reading v0.1.0–v0.7.0). It defaults to
`#F8FAFC` and exports `--acm-color-workspace-background`. Save Shared Styles
updates the stable `--studio-workspace-background` alias in loaded Studio tabs
without remounting their drafts. The surrounding workspace is independent of
pane surfaces and authored document backgrounds.

Templates lists and template editing workspaces use `--studio-workspace-background`,
matching Posts and Pages, including browser-local Studio Drafts in Edit and
Preview. The UI Library’s template and content-editor specimens
consume that same route-scoped token in Edit and Preview. Pane surfaces remain independently controlled by
`--studio-pane-surface`; authored template artwork retains its own background.

## Drag-to-position specimen

Controls → Foundation → Drag to position (`/studio/ui/controls#drag-placement`)
uses the production sibling adapter, placement controller, geometry, and line
renderer. Switch between vertical, horizontal, and wrapped layouts with unequal
item sizes. Drag across both neighbouring edges and the empty gap; returning to
the original position must show no line or create history. Escape cancels.
Read-only disables moves; Undo/Redo and Reset example affect only this specimen.
Alt + arrow keys move the focused handle along the selected layout's axis.
Standard Undo/Redo shortcuts apply while the example has focus, preserving native
form editing. All example data remains in memory. See `docs/drag-placement.md`.


## Shared overlays and image resources

`/studio/ui/controls#overlay-composition` demonstrates nested production popovers,
native modal image selection, focus return, and temporary image choices. Its
fixture data never enters product stores. Reset example remounts the fixture and
releases its Blob URLs.

`StudioAnchoredPopover` owns portal positioning, inspector widths and offsets,
topmost dismissal, optional initial focus, and outside-focus handling. Settings
rows opt into blur-before-close to retain their existing template field commits.
`PopoverHeading` supplies the existing shared close heading, with optional
caller actions and presentation classes. Specialised colour and gradient editors
retain their geometry and use the same overlay dismissal foundation.

`StudioAnchoredMenu` owns anchored, point-positioned context, and side-submenu
placement. View, Files, Design, document/template lists, block transforms, and
alignment menus inherit its keyboard and dismissal contract. Native form fields
retain their own navigation. Callers retain action permissions, captured ranges,
menu data, and explicit focus-return targets. Register overlays before moving
focus; outside-focus checks re-evaluate the topmost owner after child portals
register, so a child cannot dismiss its parent during initial focus.

`StudioDialog` supplies native modality, close control, Escape, and focus return
for Design, Files preview, and Site Settings as well as existing consumers.
Site Settings retains its confirmation flow and disables dismissal during a
pending request. This adoption does not connect to a provider or authorise a
hosted change.

`useBlobUrls` allocates resources after mounting and revokes them when their
records change, the consumer disables them, or the component unmounts. The
Design chooser, Files thumbnails, inline image picker, document images, and
template images share it. `ImageChoiceGrid` supplies chooser presentation for
Design and inline images. File management keeps its richer cards and actions.
Providers, decode validation, alternative text, insertion freshness, staged
fixture-image URLs, and persistence remain feature-owned. Download URLs have a
separate lifetime and are outside this resource hook.

## Shared document fields and Design presentation

`app/components/blocks/document-field-content.tsx` owns title and subtitle
elements, author/avatar content, publication-date content, reading-time labels,
and safe document-field links. The canvas, BlockRenderer, and template renderer
inherit those views; templates already delegate ordinary metadata blocks to
BlockRenderer. `FeaturedImage` remains the canonical image view. Hosts retain
field visibility, missing-value prompts or omission, heading defaults, selection,
editing inputs, complete-document reading scope, image actions, and fixed/hidden
template-image policy. Date formatting still belongs to document metadata.

Design's `design-artwork.tsx` renders intrinsic object content, with geometry in
`design-geometry.ts` and existing text layout in `design-text.ts`. Canvas objects,
page thumbnails, the Design Library, and raster exports share the artwork. Each
mounted instance has distinct clip/checker identifiers. React serialises the
same content-only SVG tree for export, escaping text and attributes. Hit targets,
handles, guides, marquee selection, and the inline text editor stay in PageSvg.
Checkerboards are authoring presentation; transparent PNG export omits them.
Raster scale, quality, matte policy, and media-saving ownership remain unchanged.

Design properties inherit `RangeControl`, `ColourPicker`, `FontFamilySelect`, and
`ToggleSetting`. `FontFamilySetting` maps Paragraph font IDs onto that same select
presentation; Design keeps its CSS-family strings, including imported values.
`ColourPicker` defaults to its existing clearable contract. Required Design
colours opt into `allowClear={false}`, which omits Reset/Clear and prevents a
selected swatch from clearing the value. Colour opacity remains separate from
colour; object opacity and percentage sliders retain their stored conversions.

`workspace-shortcuts.mjs` owns platform modifiers, native editing exclusions,
history-key recognition, and zoom keys, including shifted plus and numpad forms.
Design, templates, website preview, Ribbon examples, and the drag-placement
example share it. The Studio history adapter retains its explicit rich-text and
table ownership exceptions. Callers own listener scope, permissions, history,
zoom limits, and reset policy: templates and website preview reset to 100%;
Design and its Ribbon example retain their existing Fit action.


## Shared measurement, link, history and Bin presentation

`controls/number-unit-field.tsx` owns the numeric input and unit-select layout
for custom font sizes, paragraph lengths, box spacing, border widths and radius
corners. Callers supply labels, bounds, supported units and native event props.
Draft parsing, blank versus zero, mixed values, unit changes, slider ranges and
commit timing remain with each setting. Compose surrounding sliders, colour
triggers and reset actions without overriding the field's internal spacing.

`controls/link-controls.tsx` supplies URL/text fields, internal-link suggestions
and Edit/Remove/Copy actions with URL-bound copy feedback. Both the rich-text
editor and `LinkDestinationPopover` inherit these pieces. Owners retain safe-URL
validation, suggestion filtering, optional fields, captured text ranges and
transaction freshness. Rich-text suggestions preserve selection on mousedown;
Navigation retains its plain-text label contract. Button, Social links and
Navigation consumers continue through `LinkDestinationPopover`.

`controls/history-actions.tsx` owns Undo/Redo names, catalogue icons, shortcut
hints and compact, labelled or Ribbon presentation. Its Ribbon variant uses
`@acm/ribbon`'s existing button. The shared canvas, Design, navigation editor,
Styles, block/selection/drag specimens and Ribbon examples inherit it. Each
owner supplies commands, availability and read-only or busy state; the component
does not add history or keyboard listeners. Reset example and Bin Restore are
separate commands and do not use Undo/Redo presentation.

`bin-presentation.tsx` supplies Bin lists, item rows, Restore buttons, empty
states and recovery feedback for context Bins and the global-template Bin.
Recovery transactions, dependency checks, save acknowledgements and permanent
deletion remain with the owning feature. Global templates retain their existing
Restore-only actions. Context permanent deletion retains its separate explicit
confirmation and focus-return target.


## Rotation handle specimen

Controls → Foundation → Rotation handle (`/studio/ui/controls#rotation-handle`)
uses `controls/rotation-handle.tsx` and its shared CSS directly, as does Design's
PageSvg. The component owns its circular target, shared `arrange.rotate-free`
artwork, upright glyph, zoom-compensated dimensions, focus/disabled states,
rotation cursor and drag-time angle badge. `rotation-geometry.ts` owns pointer
angles, normalisation, badge position and keyboard increments. Design retains
its coordinate conversion, permission checks, pointer lifecycle, history and
saving adapters; `design-transform.ts` retains compatible formatter/cursor exports.

The specimen is temporary: drag to rotate, use Left/Right for 5° or Shift for
15°, change zoom between 50%, 100% and 200%, and try read-only, Reset example,
Undo/Redo and standard history shortcuts. Escape, pointer cancellation and lost
capture discard the current drag. One completed changed drag creates one example
history entry; unchanged drops create none. The specimen keeps keyboard focus on
its persistent SVG stage during a drag and returns it to the handle afterwards.
It never reads or changes a saved design, media library or product history.

### History actions specimen

Controls → History actions uses the production `HistoryActions` component in
compact, labelled and Ribbon presentations against one temporary history. Make
change, Undo/Redo, read-only mode and standard history shortcuts affect only the
example; Reset example clears its state. Shared controls own presentation and
availability handling; production features retain commands and persistence.

### Whole-library catalogue

The `/studio/ui` landing view is the searchable catalogue across Workspace,
Navigation, Ribbon, Panes, Panels, Blocks, Controls, Icons and Styles. Entries
are built from their existing section definitions and link to their full example.
Search matches names, sections, purpose, owner, consumers and dependencies;
section filters may be combined. The Name column and grouped section labels stay
pinned during horizontal table scrolling, keeping entry names and their adjacent
Preview eye icons visible. Hover the Preview control for 350 ms to preview an
entry; moving across rows or focusing links does not open previews. Activate
Preview with pointer, touch, or keyboard for pinned inspection. A pinned preview
stays unchanged when hovering other entries. Escape and the visible close
control dismiss the preview. Preview placement inherits the shared anchored
overlay watcher, measuring the mounted specimen and keeping it beside its
trigger. Lower rows shift the popup upwards only enough to fit its actual
height within the viewport; content resizing updates placement too.
Scaled control previews measure their visual height instead of clipping the
unscaled specimen. Longer examples scroll inside the preview without dismissing
it; all content still comes from the shared production specimens.
Shared symbols and production specimens supply the
visuals; preview-only state remains temporary and isolated.

### Circular canvas handles

Design object resizing, page resizing, and arrow endpoints inherit `CanvasHandle`
from `app/studio/controls/canvas-handle.tsx` and its stylesheet. The component owns
the circular SVG target, screen-scaled radius, neutral appearance, hover, pressed
and focus states, accessible button semantics, and disabled input forwarding.
Owners supply coordinates, cursor, accessible name, zoom compensation, and pointer
and keyboard commands; permissions, resize calculations, history, and persistence
stay with Design. Rotation keeps its specialised shared `RotationHandle`, and
arrow bends retain their distinct diamond target.

### Zoom range scale

Design uses `ZoomRangeControl` over the shared `RangeControl`. Its 10–500% range
places 100% at the track midpoint: each half is linear on its own percentage
interval. Tooltip and accessible values report zoom percentages, while arrow keys
change one percentage point, Page Up/Down change 49 points (the existing native
range increment), and Home/End reach 10%/500%. `RangeControl` owns value-label
appearance and supports `tooltipPlacement="above"` for controls docked at the
bottom of a workspace; other consumers keep the default below placement.

### Visual object resizing

Design handle resizing uses `shouldKeepResizeRatio` in `design-transform.ts` for
images, all shapes, highlights, redactions, and numbered markers. Pointer and
keyboard resizing preserve the starting proportions unless Shift is held.
Pointer movement reads the current modifier state, including page resizing,
so pressing or releasing Shift during a drag changes the constraint immediately.
Text boxes retain free resizing for reflow; arrows retain endpoint editing.
Direct inspector dimension fields remain explicit independent measurements.

### Resize handles specimen

Controls → Resize handles (`/studio/ui/controls#resize-handles`) reuses
`CanvasHandle`, `DesignObjectArtwork`, and the production resize geometry,
proportion policy, cursors, and keyboard calculations in `design-transform.ts`.
Its shape/image fixtures, coordinate conversion, pointer capture, temporary
history, and preview controls are memory-only adapters. Drag corner or side
handles, hold Shift to stretch or Alt to resize from the centre, then try zoom,
rotation, read-only mode, Escape cancellation, Reset example, and Undo/Redo.
The shared catalogue preview uses this same specimen definition.

### Zoom slider specimen

Controls → Zoom slider (`/studio/ui/controls#zoom-slider`) inherits
`ZoomRangeControl`, its shared `RangeControl`, and `zoom-range-scale.ts`.
Only the temporary percentage and surrounding scale legend belong to the demo.
The default and Reset example value is 100%, at the track midpoint; the limits
remain 10% and 500%. Pointer cursors, percentage labels, focus, and keyboard input
come from the shared control. The catalogue preview uses this same definition.
