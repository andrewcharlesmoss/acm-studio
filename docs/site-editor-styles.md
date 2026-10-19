# Site Editor style preview

Browse Styles in `/studio/site-editor` follows the Twenty Twenty-Five reference:
nine full variations, nine colour palettes, and eight typography pairings. The
three grids share one choice presentation, with named buttons, pressed states,
keyboard focus, and native button activation. Existing Pane, two-left-pane,
header actions, and history controls remain canonical.

Selections are memory-only. Global Defaults supplies both dimensions; Test and
Test 2 can independently override palette and typography. A full variation sets
both. Use Global Defaults removes both site overrides. Reset styles returns
Global Defaults to the reference baseline or clears the selected site's
overrides. Reset, Undo/Redo and platform shortcuts affect the current section's
preview history. Identity history remains independent. Leaving or reloading the
page discards the preview. No site source, shared interface preset, template, or
saved style is changed. Typography and Style Book are also available; other
Styles categories and Additional CSS remain unavailable.

The sample website demonstrates the reference palette and heading/body font
pairing. It does not import the theme's block-specific styling or template system.
Reference fonts are deliberately confined to specimens and the Styles webpage
preview; Studio's controls retain their existing system UI typography.

## Style Book

The header eye button toggles Style Book and the sample webpage without changing
the current scope, styles, or history. Its pressed state and accessible name
follow the visible mode. The overview contains Colours, Typography, Image,
Separator, Buttons, and Quote examples. Opening Typography shows Headings,
Paragraph, Links, List, Quote, Code, and Table. Element settings narrow the book
to their corresponding examples, including individual H1–H6, image captions,
and buttons. Examples update immediately from the same palette, role resolver,
font-size presets, global/site overrides, Reset, and Undo/Redo as the webpage.

The reference is the open WordPress Style Book inspected on 18 October 2026,
plus the official [Styles documentation](https://wordpress.org/documentation/article/styles-overview/#preview-your-changes-with-style-book).
The live reference replaces the canvas with labelled examples, filters them by
the active Styles section, and opens settings when examples are activated.
Upstream source retrieval was unavailable during this task; the observed UI and
documentation are the evidence for these conventions.

Studio uses `BlockRenderer` with `variant="studio"` for typed block specimens,
with scoped role variables adapting their presentation to the existing Styles
preview. The typography overview is a dedicated alphabet and two-column text
sample. The landscape is original existing Library specimen artwork, now shared
as `public/specimens/landscape.svg`. The Blocks Library retains the same image.
No external image or font requests are introduced.

Each supported target is a named, keyboard-reachable button over inert sample
content. Separate text alternatives describe the samples, including palette
values and image descriptions, without activating their internal links.
Headings, text, links, captions, and buttons open the existing global
element settings. Colours opens Browse Styles palettes; Typography opens its
main settings. Separator is read-only. These are deliberate adaptations to the
implemented preview: WordPress-specific block settings, Search, and unsupported
block types aren't added. Desktop settings and the book scroll independently;
tablet and mobile keep the shared workspace's stacked layout. Returning to a
different specimen resets only the book's scroll position.

Verify the eye toggle in both directions, specimen activation by pointer and
keyboard, role filtering and focus, changes and Undo/Redo while the sample stays
visible, palette and scope changes, Reset, and desktop/tablet/mobile layouts.
Focused coverage lives in `tests/site-editor-style-book.test.mjs` and the existing
Styles menu tests; browser checks remain necessary for fonts and scroll geometry.
For the descender regression, open Headings with the default Manrope typeset and
confirm the complete “g” in Heading 1–6 at desktop and narrow widths. Static
specimens allow glyph overflow rather than inheriting editable-field clipping;
the Node suite has no browser font-painting engine, so this check is manual.

## Preview resizing

Both the sample webpage and Style Book share a centred, width-resizable preview
frame. The left midpoint handle follows the observed WordPress/Snagit reference:
dragging right narrows the frame, dragging left expands it, and the content
reflows at its actual width. There are no additional preview headings, visible
Undo/Redo buttons or reserved header space. Platform history shortcuts remain
available. Its full-size desktop top and bottom edges align with the settings
pane. Its content scrolls independently of the settings. The preview owns this small adapter and reuses Studio's
`resize-drag.ts`; Pane's collapse and fit-content behaviour remains separate.
The scroll surface retains the shared 8px layout radius and a subtle border so
all four corners remain visible while its content scrolls and reflows.
Height follows Gutenberg's aspect-ratio interpolation from the available frame
towards 9:19.5 at 320px width, using its 1300px reference width. Narrowing therefore
also shortens the frame when space permits; both axes remain centred. Height is
capped at the available stage height, and fit restores the full stage height.

The target minimum is 320px; smaller available areas contract safely. The maximum
is the current available width with 24px on each side for the handle and gutter.
Left/Right resize by 10px, Shift by 20px, Home selects the minimum, and End,
Enter or double-click restores a fluid full-width frame. Escape, pointer
cancellation or focus loss restores the drag's starting size. The handle exposes
its current width and limits as a keyboard-accessible vertical separator.
The bar eases to 130% height on hover, visible keyboard focus or dragging, and
returns smoothly on exit. This follows Gutenberg's
[resize handle animation](https://github.com/WordPress/gutenberg/blob/trunk/packages/edit-site/src/components/resizable-frame/index.js).
Only the visual bar transforms; the hit area and frame geometry stay fixed.
Reduced-motion preferences remove the transition.

Size is temporary presentation state, retained across Styles navigation and
scope changes but discarded on reload. It does not enter Identity or Styles
history or change any saved layout. `tests/site-editor-preview-frame.test.mjs`
exercises the production pointer, keyboard, cancellation and measurement paths;
verify real dragging, reflow, scrolling and handle visibility at desktop, tablet
and mobile sizes, including collapsed panes.
On desktop, check both Style Book and webpage modes at full size: the frame and
Styles pane must share the same top and bottom coordinates. This rendered-layout
regression remains a manual check because the Node suite has no layout engine.

Full variation cards reveal their name on hover or focus, exchanging the specimen
and name with scale/opacity transitions over a blurred palette layer. This is
presentation only; activation remains the sole selection action. Reduced motion
retains the name reveal without animation. Native title tooltips are omitted on
these cards because the name appears inside the card; the accessible name stays
constant. Palette and typography choices retain their existing presentation.
Revealed names use each variation's heading family and weight, as Gutenberg does,
with a 16px minimum and responsive sizing for legibility.
Both choice grids share `StyleTypographySample`: uppercase A uses the heading
family and lowercase a uses the body family, both at regular weight (400 for
these bundled families). This follows Gutenberg's `typography-example.js` and
`getFamilyPreviewStyle`, independently of the theme's authored heading weights.

The behavioural reference is Gutenberg v19.3.0, revision
`1ff81b42269288bb7ed3415d76558331670ce401`, specifically
[`preview-styles.js`](https://github.com/WordPress/gutenberg/blob/1ff81b42269288bb7ed3415d76558331670ce401/packages/edit-site/src/components/global-styles/preview-styles.js),
`preview-iframe.js`, and `variations/variation.js`. Studio uses its existing native
buttons and CSS rather than importing Gutenberg's iframe or motion runtime.
Unlike that reference's reduced-motion suppression of the hover view, Studio
shows the name instantly so it remains available to users with reduced motion.
The palette wash is capped below full opacity to keep names readable against
the dark reference palettes at Studio's smaller card sizes.

## Typography

Typography follows the live WordPress reference inspected on 18 October 2026:
Typesets, Fonts, Elements, and Font Sizes. `TypographyChoices` and
`StyleTypographySample` are shared with Browse Styles. Text, Links, All Headings,
H1–H6, Captions, and Buttons use one settings view with the canonical Font select,
Font Size controls, Line Height field, Inspector tools menu, and native fields.
The Elements rows share `ElementTypographySample`, resolving each role's Typeset
and authored font, weight, decoration, case, and palette colours. Thumbnail size
and line height remain compact interface dimensions; row labels retain Studio UI
typography. Palette surface colours keep light and dark specimens readable.
Element screens use the centred Aa preview and source descriptions, a shared
Colour row, resolved Font dropdown, size presets/custom mode, Appearance,
unitless Line Height stepper, and Letter Spacing number/unit field. Letter Case
and Text Alignment use the shared native-radio button presentation, retaining
native keyboard behaviour and initially unselected inherited values. Letter
Spacing supports `px`, `%`, `em`, `rem`, `vw`, and `vh`. Metrics
stack below 260px of pane content width. Line Height and Letter Spacing retain
incomplete numeric drafts and commit on blur or Enter, so decimals and negative
spacing can be typed without mid-entry fallback or clamping. The Aa specimen follows the effective
nominal font size, family, weight, spacing, colour, and palette background;
text alignment continues to affect the website while the specimen stays centred.
Text colour inherits into Links and Captions; explicit theme heading/button
foregrounds remain until those roles receive their own colour overrides.
Appearance uses `FontAppearanceSelect` with the shared anchored menu, with each
weight label rendered in the resolved font family and its own weight. The
trigger retains interface typography. Appearance offers CSS weights 100–1000 in normal and italic styles, preserving
authored choices through inheritance, reset, and history. Browsers resolve missing
faces using normal CSS matching and synthesis; additional font installation is not
implied. Font choices use the same shared preview menu, showing each family name
in its own typeface. The shared `FontFamilySelect` retains its native select for
other consumers unless `previewOptions` is enabled. Semantic website specimens
demonstrate every element and heading level.

The owning Styles reducer retains property-level global/site overrides, preset
changes, font availability, and Undo/Redo in the existing temporary history.
Resetting an element removes that scope's authored properties and reveals its
inherited values. Activating any Typeset, including the currently selected one,
clears that scope's custom element settings while preserving its size presets
and enabled font families. Identity history remains separate.

Fonts uses the shared `StudioDialog`, Library tab, and checkbox controls in a
centred window matching WordPress’s Font Library: 65vw wide from 782px, with
40px vertical insets on desktop and bounded narrow-screen margins. Its body
scrolls independently above a fixed Update
footer. Manage Fonts shows a Theme section containing the same current families
as the owning Typography pane, alphabetically, with active/total variant counts
and a row that opens family details. It does not expose every bundled family or
family checkboxes on this overview. Family details show a back control, Select all, and bordered specimens
in their actual typeface. Update commits draft family availability, keeps the window open, and shows the
dismissible “Font family updated successfully.” status. Update stays disabled
until another change. Closing the window, pressing Escape, or clicking the
shaded area outside it discards uncommitted changes and returns focus to its
opener. Clicks inside the window leave it open. A clean dialog follows Undo/Redo;
unfinished edits remain intact and stale success feedback clears. Fonts lists the active Typeset's declared families, enabled extras, and families
used by resolved element overrides, deduplicated and sorted alphabetically by
English display name. The Typeset metadata retains Default's declared Fira Code
family even though its body and headings use Manrope. Other Typesets do not
implicitly retain Default's families. Declared and authored in-use families
remain listed so they can be reactivated. Font Library and element Font choices use the same order. This is a deliberate bounded adaptation: it manages the nine
already bundled families together, without individual face installation, file
upload, external font providers, or persistent font storage. Available face
counts describe only this bundled subset. Variable fonts are one variable face;
each has one selectable variant labelled with its family and minimum and maximum
weights, matching WordPress (for example, Fira Code 300 700). Static
faces show only the bundled weights and remain enabled together through the
family-level Select all control. Select all and the variable-variant checkbox remain editable for typeset and
authored families. Deactivation commits only through Update, retains the family
in the library, and renders its CSS fallback in the webpage and Style Book.
The scoped temporary Styles history records deactivation and reactivation.
Element Font dropdowns offer only active families. A disabled authored choice
shows Default without clearing the stored family, so Undo or reactivation can
restore it; the shared selector must not reinsert it as an unknown option.
No independent face-selection state is introduced.

The five theme font sizes retain their names, sizes, and custom fluid bounds.
Preset edits update the website immediately when valid. Custom presets support
inline naming, removal, and history recovery rather than WordPress's separate
rename/delete dialogs. Positive px/rem/em sizes are bounded to 400px or 25rem/em;
fluid minimum must not exceed maximum. Custom Fluid Values disables the base
Size field while minimum and maximum are edited. With custom values off, this
preview derives an automatic minimum at 85% of Size and maximum at Size. Fluid
interpolation uses the preview container's 320–1440px range through container
units, so pane resizing affects the website sample rather than the entire
browser's width. This explicit preview geometry is an adaptation, not a claim to
reproduce Gutenberg's full fluid-size calculation or breakpoint settings.

Further implementation references at the pinned Gutenberg revision are
[`screen-typography-element.js`](https://github.com/WordPress/gutenberg/blob/1ff81b42269288bb7ed3415d76558331670ce401/packages/edit-site/src/components/global-styles/screen-typography-element.js),
`screen-typography.js`, `typography-panel.js`, and `font-sizes/font-size.js`.
The inspected live WordPress installation uses a newer landing layout with an
inline Typesets grid; its version is not inferred from the pinned source.

## Reference provenance and licences

Source: [WordPress Twenty Twenty-Five](https://github.com/WordPress/twentytwentyfive/tree/62c10821880ac2242460e7ecf42727ce1a026047),
revision `62c10821880ac2242460e7ecf42727ce1a026047`, retrieved 18 October 2026.
The base `theme.json`, eight `/styles/*.json` variations, and seven
`/styles/typography/*.json` definitions supply the compact typed data in
`app/studio/site-editor/style-reference-data.ts`. Palette order and values are
retained; font-family names have a `TT5` namespace to prevent interface collisions.
The reference data is adapted under GPL-2.0-or-later. The bundled licence and
upstream notices are in `public/fonts/site-editor-reference/`.

Normal WOFF2 faces are copied unchanged from that revision, limited to the
weights used by these specimens: Manrope, Beiruti, Literata, Vollkorn, Fira Code,
Platypi, Ysabeau Office, Roboto Slab, and Fira Sans. Font copyright notices and
the corresponding OFL or upstream licence texts accompany them in the same
directory. Roboto Slab's upstream `LICENSE.txt` is retained alongside the theme's
font notice. No font files are fetched from external services at runtime.

## Verification

From the repository root, run
`node --test tests/site-editor-font-appearance.test.mjs tests/site-editor-browse-styles.test.mjs tests/site-editor-styles-menu.test.mjs tests/site-editor-identity-preview.test.mjs tests/site-editor-typography.test.mjs`,
focused ESLint, and `npm run build`. In a browser, open Styles → Browse Styles;
check all three groups, full and independent choices, scope switching, global
inheritance, Reset styles, Undo/Redo from the preview controls, Mac and Windows
shortcut equivalents, Back focus return, keyboard activation,
and the existing pane collapse/reopen controls. Check desktop, tablet, and mobile
layouts; reload to confirm preview reset.

For Typography, check Typesets from both entry points, Fonts dialog cancellation
and Update Preview, available-weight details, each element and all heading
levels, custom/preset size switching, inheritance/reset, preset edits and
min/max validation, custom preset removal, and Undo/Redo while a preset editor
is open. Check preview-container fluid scaling, keyboard navigation, focus
return, and narrow panes. Reload must discard all Typography changes.

Numeric typing regression recipe: in Text, select all Line Height, clear, type
`0.8`, and leave the field; it must commit 0.8. Type a negative decimal Letter
Spacing and leave the field; its sign, fraction, and unit must be retained. Undo
must refresh the fields without closing or remounting the settings view. The
Node stepper state harness covers incomplete decimal entry and source resync;
real browser number-input editing and selection remain a manual boundary.

Typography options follow the supplied WordPress menu: Colour, Font, Size,
Appearance, Line height, Letter spacing, Letter case, and Text alignment.
Each toggles only control visibility, preserving authored values. All Headings
omits Size; individual heading levels retain it. Links replaces Letter spacing
and Letter case with Decoration (None, Underline, and Strikethrough).
Element Colour uses the selected website palette (Base, Contrast, and Accent 1–6),
with labelled swatch hover feedback and custom alpha editing. Other ColourPicker
consumers retain the interface palette and their existing alpha policy.
The menu is 240px wide to match WordPress. It may overlap the Typography pane
when space before the pane is insufficient and remains within the viewport on
the workspace-facing side. It omits Close and retains Escape, outside-click,
trigger-toggle dismissal, and focus return. Reset all uses the existing element
reset history. Changed Typography options replace their checkmark with an
individual Reset action; resetting removes only that option's override, exposes
any inherited value, and remains undoable. Reset all clears the current role.


## Matching Home comparison sample

The ordinary Styles webpage uses `comparison-home-model.ts` as its canonical
content fixture, rendered through Studio BlockRenderer and the same effective
role styling as Style Book. It includes H1–H6, paragraphs with bold, italic, and
linked text, both list types, a quotation, image and caption, primary and outline
buttons, a separator, table and caption, and code. Identity and Style Book retain
their own existing sample views.

`comparisonHomeWordPressMarkup(imageUrl)` exports the same content as WordPress
core block markup for manual pasting into the comparison Home page. It is not a
WordPress integration or publication path. The PNG is generated from the existing
original `public/specimens/landscape.svg` artwork so both editors can use the same
image. Styles sample content and role changes remain memory-only.

### Resize scroll stability

The preview scroll container disables browser scroll anchoring so width changes
from dragging, keyboard resizing, or pane geometry preserve its scroll offset.
Normal scroll-range clamping still applies when content becomes shorter.

Manual regression check: open Styles with the Home sample, scroll partway down
without reaching its end, and drag the left handle repeatedly between roughly
400px and 700px. Text and images reflow, but `scrollTop` must stay unchanged when
it remains within the resulting scroll range. Repeat with keyboard arrows and
with Style Book open. This is a rendered browser check because the Node suite
has no layout or native scroll-anchoring engine. The original defect moved
`scrollTop` from 866px to 720px while widening; the corrected drag retained its
720px offset in both directions.

Resize gestures suppress fit events generated by either of the last two pointer
releases if horizontal movement exceeded 3px. Two stationary clicks still fit
the preview; pointer cancellation continues to restore the starting width.
Height interpolation uses the available fit width when it is below the 1300px
reference, preventing a discontinuity when narrowing a tall, narrow workspace.
The ratio blend requires at least 320px of horizontal travel, so workspaces
already close to the minimum do not compress the whole height change into
a few pixels.
The production resize tests cover both drag-generated double-clicks and the
first pixel below fit in portrait stage geometries.
