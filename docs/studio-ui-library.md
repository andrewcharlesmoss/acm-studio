# Studio UI Library

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
  isolated editing specimens. A grouped index covers all 27 typed block types,
  plus the template Content slot. Each entry has a detail route at
  `/studio/ui/blocks/{type}`; Paragraph keeps `/studio/ui/blocks/paragraph`.
- **Controls** — 13 working inspector controls and a shared Slider foundation,
  with their supported states, ownership and consumers on the grouped
  `/studio/ui/controls` page.
  Group and control links jump to in-page specimen anchors. Recognised legacy
  `/studio/ui/controls/{id}` detail routes redirect to the matching anchor.
- **Icons** — original shared ACM symbols, metadata, provenance and optical
  specimens at 16, 24 and 32px, with a Block Library collection that shows the
  exact symbols used by each insertable block and the template Content tile.
- **Styles** — the executable universal style preset, editable in a local preview
  sandbox with a live specimen. Sandbox edits remain in component state and do
  not alter templates, products or the shared baseline.

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

The Controls jump menu tracks the last specimen whose top has reached the
viewport midpoint. A long card remains active while that midpoint passes
through it; gaps retain the preceding specimen until the next card arrives.

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

All fixtures and interactions remain temporary component state. The library
does not call product APIs, use write ownership or read/write browser storage.
The shared `blockCapabilityProfiles` registry is the source for the Blocks
index and detail inventories, and for shared-style inspector ownership,
defaults, reset fields, conditional settings and dependency links. It does not
define a second saved format. Block-specific inspectors keep their established
editing components and data contracts. Each specimen uses production `BlockField`,
`BlockInspector` and Studio `BlockRenderer` components with temporary,
selectable examples, local document metadata and an isolated local media
fixture. Container entries include children; Table shows populated and empty
states; Footnotes have references; Component remains inactive; Content shows a
template projection. Undo and Redo cover temporary block and document changes.
The preview uses ordinary linked text, and inspector control inventory,
relationships and compatibility notes are collapsed disclosures. No specimen
reads real documents, browser persistence or the product write lock.

The Controls section presents 13 working controls and a standalone Slider
foundation on one grouped page, with in-page jump links and isolated specimen
state. It retains the original inspector specimens and adds border settings,
font size and Appearance, background colour/gradient, preset number, image
dimensions and focal position. The production inspector and specimens share
the extracted BorderSettings, BackgroundSelection, FontSizeAppearanceSetting,
ImageDimensionsSetting, FocalPositionSetting and PresetNumberSetting controls.
Colour-picker ownership includes palette selection, Default/Hover values,
swatch geometry, popover positioning and dismissal. Text actions such as Clear
and the gradient angle dial marker use `--gutenberg-accent` for Gutenberg's
accent blue, including their reference hover and focus states.
The Slider foundation owns `--studio-range-accent`, the shared accent and focus
colour for standard `.studio-range-control` inputs. Pointer hover uses
`--studio-range-hover-accent`, which defaults to a 12% darker shade of the shared
accent. While a range is being pressed or dragged, `--studio-range-pressed-accent`
defaults to a further 12% darker shade of the hover colour. Either state colour
can be overridden independently. Its Controls specimen previews all three
effective colours, and Reset example restores the accent plus both derived
defaults. Its disclosure lists the
Controls sections that inherit it and external consumers. Consumers retain
their native range values, bounds, steps and behaviour. Gradient hue and alpha
inputs use specialist colour tracks and
are not consumers of these shared slider colours. Each Controls section keeps
dependency details in its ownership, consumers, dependencies and compatibility
disclosure. The inventory includes composed dependencies and conditional or
transitive slider styling, while keeping specialist gradient tracks excluded.
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

Styles previews the `@acm/styles` v0.2.0 preset beside the full written
workspace Style Guide. Hovering or focusing a specimen or setting shows its
baseline, current sandbox value, guide excerpt and exact line; clicking or
tapping pins the source selection. Hovering a mapped row in a guide table
temporarily highlights its matching specimen in the live preview; moving away
restores any pinned selection. The guide view records its source commit and
content digest. Its generated line index is bundled with Studio, so the hosted
page does not read another repository at runtime. After committing a guide
change, run `npm run styles:source` from the ACM Studio root to refresh that
bundle; `npm run styles:source:check` verifies it without writing files.
Responsive typography, semantic colour, button and layout controls change only
the current React state. Reset All restores the package default; the page does
not publish a global baseline or save project settings.
The Buttons panel exposes Base, Secondary and Outline variants. Each variant
has independently editable normal text colour and hover text colour, and both
values update the matching live preview button. These edits remain temporary
Styles sandbox state.
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
For Blocks, visit all 28 entries and verify editing, selection, Preview, Reset
Example, Undo and Redo. Check Block/Studio pane availability, conditional
controls, retained legacy values, temporary document fields, nested selection,
local media and the template Content projection. Verify unsupported gaps against
the compatibility guide. For Controls, visit all 12 in-page specimens, exercise
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
