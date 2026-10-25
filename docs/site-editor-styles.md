# Site Editor website settings

Browse Styles in `/studio/site-editor` follows the Twenty Twenty-Five reference:
nine full variations, nine colour palettes, and eight typography pairings. The
three grids share one choice presentation, with named buttons, pressed states,
keyboard focus, and native button activation. Existing Pane, two-left-pane,
header actions, and history controls remain canonical.

Identity and Styles are saved locally for Global Defaults, Test, and Test2.
Global Defaults supplies inherited properties; each site owns only its explicit
overrides. Reset removes a site's override and restores current inheritance.
Empty text remains a deliberate blank value. Hide retains the text/image, and a
site can explicitly Show a value hidden in Global Defaults. Reset clears both
value and visibility choices. Identity and Styles keep independent session-only
Undo/Redo histories. Wait for “Website settings saved locally” before refreshing.
No hosted deployment or document publication is performed by these settings.

The sample website demonstrates the reference palette and heading/body font
pairing. It does not import the theme's block-specific styling or template system.
Reference fonts are deliberately confined to specimens and the Styles webpage
preview; Studio's controls retain their existing system UI typography.

## Actual local home pages

Test and Test2 display their actual authored home pages, including saved site
identity and shared global templates. The selected collection’s `homeDocumentId`
is resolved explicitly before the canonical StudioEditor/StudioCanvas is shown;
publications are not substituted. Preview and Edit retain the same resolved
document, template presentation, media URL map, page framing, and background.
Only the canonical canvas preview flag and editor chrome change. The hosted
preview omits a forced desktop width so shared paper sizing fits narrow panes
while retaining its usual wide content cap. The editor keeps its existing
desktop workspace overflow contract. Empty authored pages stay empty. Missing sources, home pages, or
shared templates produce an error and never fall back to sample content.

Click the preview, or activate Edit Home Page with Enter or Space, to open the
existing page editor inside Site Editor. The same iframe, editor session, and
history remain mounted; the outer panes collapse to make room. Return to Site
Editor Preview restores the panes after code/navigation checks and draft saving.
Changing the outer site also waits for acknowledgement. Mutations pause during
this flush; failed or unconfirmed saving retains the editor and selected scope.
These transitions save authored content only and do not capture publications or
deploy. Explicit publication controls keep their existing separate behaviour.

The frame uses a fixed same-origin `/studio` hosted-home mode, exact parent/frame
message sources, origin checks, fixed site IDs, and correlated leave requests.
Unrelated site and library navigation is suppressed in this mode. Browser
ownership, gateway revisions, media, Undo/Redo, and peer synchronisation remain
owned by the existing editor. Identity and Styles use those same typed brokers
to update the actual selected local site; the child frame has no new write authority.

## Saved settings and compatibility

The global template library v4 stores a separate `websiteDesignDefaults` record;
fixture source v9 stores `websiteDesign`. Template structures remain shared and
unchanged. The existing gateway, writer lock, typed peers, process guards, CAS,
source history, and readback own all settings writes. Controls wait for validated
source hydration. Stale or failed saves retain the draft and report the problem;
reloading is deliberate. Previous browser Global Defaults identity is adopted
once only when canonical defaults are absent. Former sample Test/Test2 records
remain recovery data. Existing site names and blank taglines are retained as
explicit overrides so enabling inheritance does not rename sites unexpectedly.

Images use the existing UUID/SHA-256 portable raster contract: PNG, JPEG, WebP,
and GIF, up to 2 MiB each and 5 MiB per transfer. Snapshots hold references only.
Global files live at fixed `work/global-design-media` paths; the owned refresh
copies them into fixture media output. Library backups include design files;
browser backups v6 retain them for explicit shared-library recovery. Existing
backup formats remain readable. Bundled theme fonts and their licences are copied
to local output. Files is read-only from these choosers.

WebsiteDesignSurface and canonical block renderers apply the same role, palette,
background, layout, block, device, and interaction rules in Edit, Preview, and
static output. Inherited presentation never becomes saved document content.
Additional CSS rejects external resources and stays inside the website scope.
The Controls Library remains memory-only. Local gateway saving is unavailable
on hosted static Studio builds; this work does not connect hosted site editing.

## Identity text values

Title and tagline inputs show their effective inherited text as editable values.
Hide dims the retained input text while suppressing it in the sample website;
editing hidden text keeps Hide enabled. Deleting text leaves an empty authored
value and removes that text from the preview. Reset restores the original global
text or the current inherited site value.

## Identity resets

Identity offers Reset beside Site Title and Site Tagline in every scope. Global
Defaults restores “Site Title” and “A short description of your site.” from the
original preview defaults; site resets restore inheritance from the current
Global Defaults and clear Hide. Each action is independently undoable and is
disabled when already at its target. The shared Identity controls and Library
specimen use the same reducer. Site Editor saves Global Defaults through its canonical library and site overrides through the selected local fixture gateway; the Library remains memory-only.

Reset All resets the selected scope in one undoable action. Global Defaults
restores the original text and clears chosen images and Hide states. A site
clears all four identity overrides and Hide states to inherit the current Global
Defaults. It is disabled when that scope already matches its reset target.

## Style Book

The header eye uses the canonical `@acm/icons` `view.preview` open-eyelid and
filled-pupil artwork, also shown in the UI Library Icons catalogue. The button toggles Style Book and the sample webpage without changing
the current scope, styles, or history. Its pressed state and accessible name
follow the visible mode. The overview contains Colours, Typography, Image,
Separator, Buttons, Pullquote, and Search examples. Opening Typography starts with
Headings, followed by Paragraph, List, Quote, Code, Details, Math, Preformatted,
Pullquote, Table, Poetry, Custom Link, Content, and Home Link, following the
WordPress reference inspected on 22 October 2026. The Links element retains its
dedicated link specimen. The paragraph pair uses the effective Text typography
and stacks into one column in narrow previews. Element settings narrow the book
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
sample. The Style Book image is a local, unmodified copy of WordPress's
[Mont Blanc specimen](https://s.w.org/images/core/5.3/MtBlanc1.jpg), stored as
`public/specimens/mont-blanc.jpg` (500 × 375). The original photograph is by
Spiridon MANOLIU, released into the public domain;
[Wikimedia Commons records its provenance](https://commons.wikimedia.org/wiki/File:MtBlanc1.JPG).
The Blocks Library and Home comparison keep the original landscape illustration.
No external image or font requests are introduced.
Each Style Book example is capped at 900px including 16px internal gutters,
leaving the observed 868px WordPress sample width. The example has a 25px label,
a 40px gap before the sample, and a 40px bottom margin. Combined outer and inner
gutters are 48px, reducing to 24px below a 480px preview width. This presentation follows Andrew's WordPress
resize recording inspected on 20 October 2026. Labels and text share the same
left edge; the alphabet uses Heading 1 styling. Overview paragraphs use a 24px
column gap, with no editor selection-border inset. H4 uses Medium, H5 and H6
use Small. H5 and H6 have 0.5px and 1.4px letter spacing respectively, and H6
defaults to bold uppercase, following the pinned
[Twenty Twenty-Five heading tokens](https://github.com/WordPress/twentytwentyfive/blob/62c10821880ac2242460e7ecf42727ce1a026047/theme.json).
These defaults come from the shared
preview role resolver, preserving authored element overrides and Reset.
The heading specimen uses normal block flow with browser heading margins, rather
than the editor canvas's uniform gap. Explicit Heading margins suppress those
browser margins, including zero and device overrides. An authored Layout Block
spacing returns headings to the canonical grid gap; Reset restores the reference
rhythm. Heading padding remains owned by the canonical wrapper. Lists retain the reference's 40px text inset
and 0.5rem item spacing. Code paints its padding once on its full-width surface;
the shared preview adapter preserves scoped/device padding edits in the webpage
and book, while the book uses the reference's square Code corners. Math uses a
display-style fraction at the surrounding text size; ordinary inline maths stays
unchanged. These refinements follow the fresh Chrome comparison on 22 October 2026.
Colour swatches change from four
columns to two below 600px, and overview paragraphs stack below 420px. These
breakpoints and fluid type sizes follow the preview frame's width. The image
retains its natural 500px maximum width, while the table uses the full specimen
width with contained horizontal scrolling when necessary.
The alphabet specimen matches WordPress's displayed character sequence,
including the additional `X` after the digits and its punctuation and symbol order.
The overview’s Pullquote adapts a canonical plain Quote with scoped centred
presentation. Its citation uses compact, normal metadata typography, independent
of the oversized quotation. A 20px gap below the quotation follows the current
WordPress spacing-30 default CSS. Its canonical outer wrapper owns the 20px
vertical padding, with no second inset inside the quotation; the standard Typography Quote remains
unchanged. Buttons use filled, pill-shaped content links and wrap centrally at
narrow widths. Search is
an inert semantic input and canonical content button specimen, with no search
service, saved block type, or content editing. These website-content styles do
not change Studio interface controls.

Each supported target is a named, keyboard-reachable button over inert sample
content. Separate text alternatives describe the samples, including palette
values and image descriptions, without activating their internal links.
Supported block specimens open their existing block settings from every book
context; this includes Image, Separator, Buttons, Pullquote, and Search in the
overview. Colours opens the palette; Typography opens its main settings. The
Links element's dedicated specimen retains element navigation. Details, Math,
Preformatted, Poetry, Custom Link, Content, and Home Link are read-only reference
examples composed from existing production renderers and semantic presentation;
they do not add saved block types or unavailable inspectors. Details uses the
[upstream open example](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/details/index.js).
The image caption retains the workspace's spaces around its em dash. These are
deliberate adaptations to the implemented preview. Desktop settings and the book scroll independently;
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
pane. Its content scrolls independently of the settings. It inherits the shared
`controls/resizable-preview-frame.tsx`, also demonstrated at
`/studio/ui/controls#preview-frame`. The component uses `resize-drag.ts`; Site
Editor owns only its workspace layout adapter. Pane's collapse and fit-content
behaviour remains separate.
The desktop workspace uses one full-height grid row so the preview handle and
grouped pane buttons share a vertical centre. Check both centres after hiding
either pane or both, reopening them, narrowing the preview, and toggling Style
Book. Their measured centres should differ by less than 1px. The original auto
row left 15.5px below the preview, placing its handle 7.75px above the button group.
The scroll surface retains the shared 8px layout radius and a subtle border so
all four corners remain visible while its content scrolls and reflows.
The frame alone owns that outline; the sample page has no second border.
When checking corners, inspect them at close range in the webpage and Style Book,
at fit and narrow widths, including after scrolling. A declared CSS radius alone
does not prove that child borders or backgrounds leave the curve unobstructed.
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
Unexpected pointer-capture loss finishes at the last displayed width. Embedded
browsers can report this before pointer release; it must not undo the movement.
Late release or blur events cannot reset that completed drag, and a stationary
capture loss retains fluid fit sizing.
The bar eases to 130% height on hover, visible keyboard focus or dragging, and
returns smoothly on exit. This follows Gutenberg's
[resize handle animation](https://github.com/WordPress/gutenberg/blob/trunk/packages/edit-site/src/components/resizable-frame/index.js).
Only the visual bar transforms; the hit area and frame geometry stay fixed.
Reduced-motion preferences remove the transition.

Size is temporary presentation state, retained across Styles navigation and
scope changes but discarded on reload. It does not enter Identity or Styles
history or change any saved layout. `tests/resizable-preview-frame.test.mjs`
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
other consumers unless `previewOptions` is enabled. In both Typography elements
and block Styles, the selected Font represents the current scope's authored
override (and the active viewport/state for blocks). Default clears that override
and stays selected while the specimen continues to resolve inherited fonts.
Undo and Redo restore the authored selection independently of inherited rendering.
Semantic website specimens
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
layouts; reload to confirm saved settings persist while view state resets.

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
image. Sample content remains memory-only; authored role settings persist through the selected settings owner.

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
Browser acceptance also includes dragging left across the embedded browser's
boundary and releasing: the last displayed width must remain, the dragging state
must clear, and the next drag must start from that width. The original event trace
showed a 2043px starting width reaching 2301px, then `lostpointercapture` restoring
2043px before any `pointerup`. Regression coverage exercises this production
handler sequence alongside Escape, pointer cancellation and stationary fit.
Height interpolation uses the available fit width when it is below the 1300px
reference, preventing a discontinuity when narrowing a tall, narrow workspace.
The ratio blend requires at least 320px of horizontal travel, so workspaces
already close to the minimum do not compress the whole height change into
a few pixels.
The production resize tests cover both drag-generated double-clicks and the
first pixel below fit in portrait stage geometries.

## Additional CSS

Styles → More Styles actions → Additional CSS follows the [WordPress custom CSS entry point](https://wordpress.org/documentation/article/styles-overview/#applying-custom-css). The shared textarea updates the webpage and Style Book, then saves through the selected website settings owner. Global CSS inherits into Test and Test 2; a site's empty string deliberately clears inherited CSS. Reset removes that field override. Reset Styles, Undo, and Redo include CSS; reloading retains saved CSS.

CSS is parsed in a detached constructable stylesheet and emitted inside native `@scope`. An outer paint containment boundary prevents positioned sample content from covering Studio controls. Supported rules are ordinary selectors (including `:scope`), nesting, `@media`, `@supports`, and `@container`. Global at-rules, CSS escapes, resource functions, and unsupported value functions are rejected with inline feedback; invalid drafts remain editable but produce no custom output. Browser CSS parsing may discard malformed declarations. No external resource loading, saved-site mutation, or publication is connected.

## Colours

Edit palette adapts to the Styles pane's available width: Theme swatches wrap,
and palette choices use one column at or below 288px of content width. For the manual
layout regression check, resize the pane to 240px and 420px, confirm all eight
Theme swatches and nine palette choices remain visible without horizontal
clipping, and open the last swatch with the keyboard. Escape returns focus to
its trigger. This check uses the rendered layout because Node tests have no
browser layout engine.

Styles → Colours follows the live WordPress Twenty Twenty-Five reference inspected
on 19 October 2026. The overview exposes Edit palette and the mandatory Link,
Captions, Button, and Heading rows. Elements options expose Heading 1–6 as
optional rows, with individual reset and Reset all. Reset removes colour overrides
only and retains typography. Link includes Default and Hover. Button and Heading
include Text, Background, and Gradient; heading levels inherit Heading until
explicitly overridden. Native heading and button backgrounds are preview styling,
not new stored block attributes.

Palette includes the eight named theme swatches, Show Details, custom colour
names and removal, nine named reference palettes, and a Gradient tab with custom
gradient names and removal. The shared colour and gradient editors retain their
existing keyboard, hover, alpha, close, and dismissal behaviour. Colours adds no
explanatory descriptions. Named palette selection replaces all theme swatches in that scope, overriding
inherited theme edits while retaining element choices and custom entries. Reset
Theme removes those slot overrides and reveals inherited values.

Palette choices carry stable CSS-variable references, so editing the selected
swatch updates its role uses even when two swatches have the same hex value.
Custom picker input remains a literal colour. Typography and Colours use the same
foreground properties and custom swatches. Custom gradients retain their selected
ID and use the latest gradient definition. Removing a custom entry removes it from
choices and retains its last value for existing uses; Undo restores the entry.

All values use session-only Styles history, canonical settings persistence and per-property
Global Defaults/Test/Test 2 inheritance. The webpage and Style Book share the
resolved colour variables; entering Colours shows only the colour specimen in
Style Book. The universal interface palette and document publication snapshots remain unchanged.

Focused regression checks are in `tests/site-editor-colours.test.mjs`, alongside
the existing Styles menu, typography, and Style Book tests. Browser checks cover
editing a theme swatch, duplicate-colour identity, custom colour/gradient names
and removal, role default/hover/background/gradient updates, heading inheritance,
reset/history, scope switching, and narrow layouts.

Colour popup layout regression is checked in a real browser because the Node
suite has no layout engine. Open Button, Heading, and H1 colour popups, cycle
Text, Background, and Gradient, and confirm every tab label, preview card, and
swatch stays inside the popup without horizontal scrolling. Repeat at desktop,
tablet, and mobile widths, then check an ordinary UI Library ColourPicker.
Short viewports may retain vertical scrolling. Check all four rounded corners,
Escape dismissal, and keyboard tab selection.

Selecting an already selected element swatch clears that state. An empty string
records this deliberate no-colour choice in temporary Styles fields, suppressing
inherited selections; Reset removes it and restores inheritance. Default and
Hover remain independent. Theme and custom palette definitions still require
a colour and cannot be cleared by selecting their swatch again.

The element Gradient tab embeds the shared GradientPicker editor body: stops,
Type, and Angle are available directly. Named custom gradients remain available;
the inline view omits the default preset grid. Stop colour editing retains the
original pane owner and closes independently before its containing colour popup.
Other GradientPicker consumers retain the trigger and full popup by default.

Theme Show Details replaces the compact row with eight full-width named colour
buttons and a Done action. Each row opens the existing required-colour picker;
Done returns to the compact row and restores focus to Theme options. The details
swatches composite alpha over white, matching the reference, while compact
swatches retain their transparency checks. Opening and closing details do not
change Styles history.

Custom palette colours have compact swatch and Show details views. Add Colour
creates the next unused Colour N name and opens the bordered editing rows; Done
returns to the compact row without changing Styles. Rows reuse the shared colour
picker and native field, with a minus action to remove one colour. Custom options
provides Show details and Remove all colours. Bulk removal is one undoable Styles
action and preserves the resolved values of existing palette references.

Style Book Theme Colours opens Edit palette directly, with focus on its heading.
The Colours category continues to open the Colours overview; Back to Colours
returns there without changing the palette or Styles history. Theme swatches
remain visible behind the transparent specimen navigation target on hover.

## Background preview

Styles → Background edits the sample website and Style Book through the same
session-only Styles history and canonical saved settings. Image, Colour, and Gradient remain independent layers,
with the image above the gradient above the website base colour. Palette choices
retain their reference so later theme edits update the background. Clearing an
image or gradient suppresses its inherited value; Reset removes the scoped
override and restores inheritance. Reset Image also restores its layout fields.

Images come from the existing read-only Files chooser. Their validated raster bytes are retained as immutable portable settings assets;
object URLs are managed by `useBlobUrls`. Image settings reuse the shared focal
position, toggle, and number/unit controls for Cover, Contain, Tile, width, Repeat,
and Fixed background. Fixed images stay attached to the sample preview scrollport,
using a bounded sticky layer that follows preview resizing; they do not attach to
the surrounding Studio window. Repeat applies only to tiled images, and gradient
layers do not repeat. These are feature compositions of existing Library controls,
not new shared control variants. Selection does not mutate Files. Settings save through the owning global or fixture gateway, survive reload, and do not publish a hosted site.

Verify Image selection/replacement/removal, focal values, fixed background, all
three sizing modes, tile width units, Repeat, colour alpha and palette tracking,
gradient editing/clear, per-option Reset, Reset all, inherited global/site values,
and Undo/Redo. Check the website and Style Book at wide and narrow widths, and
check popup Escape dismissal and focus return.

## Shadows and Layout previews

Styles → Shadows offers the Gutenberg reference presets Natural, Deep, Sharp,
Outlined, and Crisp, plus temporary custom presets. Their reference values come
from [Gutenberg's theme defaults](https://github.com/WordPress/gutenberg/blob/trunk/lib/theme.json).
Outlined retains its two separate layers. Each preset can contain multiple Drop
shadow layers with colour, Outset/Inset, X/Y position, Blur, and Spread. Custom
presets support naming and deletion; default presets support scoped Reset.
A name-only site override stays hidden if its inherited custom preset is deleted;
Undo restores both the inherited layers and local name. A site with its own layers
retains its independent preset. Changes affect only the checkerboard specimen in the settings pane. No shadow
is automatically applied to the website or saved blocks. The editor composes
existing shared controls without introducing a new shared control variant.

Shadow lengths support px, em, rem, vw, and vh. Percentage shadow lengths are
omitted because CSS `box-shadow` does not accept them. The inline specimen maps
viewport units to its own container dimensions so Studio's window size cannot
misrepresent a narrow specimen. The serialiser retains valid CSS units.

Styles → Layout edits website design settings through a unit-based presentation adapter. It remains separate from the versioned, px-based `website-layout.ts` contract and template structure. The webpage and Style Book use 645px content and
1340px wide defaults. On the webpage, article content, images, and tables follow
the main content width; the document Header uses the wide width so its identity
and navigation have room to fit. Dividers also demonstrate the wide width, and
ordinary top-level blocks use the content width. Style Book uses its own specimen layout described above;
its tables retain the content-width limit and share the comparison table's
black grid, transparent centred header, and cell spacing. Both widths are
bounded by available space and centred. The initial 24px webpage padding preserves the
sample preview's existing gutter; the controls show this actual value.

Manual check: in Style Book → Typography, confirm the table matches the Home
sample and stays within the minimum preview width without horizontal overflow.
In the overview, resize through fit, 860px, 600px, 420px, and 320px. Check the
palette columns, paragraph stacking, shared label/text alignment, fluid type,
all four frame corners, and independent scrolling. Repeat with a fixed background.

Padding uses the canonical linked/unlinked axes and side controls. Block spacing
changes only the top-level production block renderer's gap; nested block gaps
remain owned by their blocks. Widths, padding, and spacing support the controls'
CSS length units. vw/vh values resolve against the measured sample preview
scrollport, rather than the Studio window. Identity fields remain separate from these Styles dimensions.

Both sections merge global and site overrides independently, use the existing
Styles Undo/Redo history, and participate in Reset styles. Layout supports
per-field and whole-section Reset. Saved website settings update the selected local fixture; preset packages and immutable document publications stay separate. Verify default and custom shadow layer editing, removal, naming,
reset, and history; check Layout normal/wide widths, linked/unlinked padding,
units, gaps, resets, and inherited scope values at wide and narrow preview sizes.

Layout places its short width description within Dimensions, with labelled content
and wide-width fields, linked padding axes, and scalar block-spacing controls.
Site Editor back arrows remain black until hover, when only the arrow turns blue.

Custom Shadows follows [Gutenberg’s Shadows panel](https://github.com/WordPress/gutenberg/blob/c63abff162c804f68cd4fc2f0d45e08628b5be8b/packages/edit-site/src/components/global-styles/shadows-panel.js)
and its adjacent `shadows-edit-panel.js` at the same WordPress 6.8 reference revision.
Add appends a numbered Shadow entry without leaving the list. Stable numeric
identity preserves the sequence after renaming; UUID suffixes retain scope-safe
identity and legacy entries remain readable. Deleted highest numbers may be reused,
as in the reference. Rename uses a cancellable draft and Save; Delete and Remove
all custom shadows require confirmation. Bulk removal hides effective custom
entries only in the current scope, preserving default overrides and one-step Undo.
All actions remain temporary preview state.


## Block style previews

Styles → Blocks opens a searchable catalogue of 32 targets. Alongside the original
Paragraph, Image, Heading, List, Quote, Button, Buttons, Code, Pullquote, Search,
Separator, and Table panes, it includes Group, Row, Stack, Grid, Columns, Column,
Section, Spacer, Embed, Footnotes, Field, Title, Subtitle, Featured image, Reading
time, Author, Date, Social Icons, LinkedIn, and TikTok. All use canonical content
blocks and the same renderer, with example document metadata supplied to dynamic
fields. Group defaults also inherit into Row, Stack, and Grid. Explicit content
formatting, including nested and responsive formatting, remains authoritative.

Plain is a Quote variation and receives Quote → Plain defaults. Pullquote remains
an explicitly marked reference specimen; its retained settings no longer style
ordinary Plain Quotes. Search remains an inert reference specimen, not an
insertable search block. Inline Math and nested List Items are not independent
content blocks. Template-owned Navigation, Page Link, Content slots, and site
identity need their own template adapters; product-specific code-backed Components
are deliberately outside this portable content-block catalogue.

The supported Styles panes have independent profiles in `block-style-profiles.ts`,
composed by `BlockStyleSections` from canonical Library controls. They do not
embed, filter or modify editor capability profiles. Editor variation selectors
apply a style to selected content; Styles variation rows navigate to that
variation's defaults. Both use their appropriate shared presentation component.

The read-only authenticated WordPress capture on 20 October 2026, with Kadence
deactivated, established this matrix. The installed version was not verified;
this is a dated configuration snapshot, not a promise about every Gutenberg release.

| Block | Distinct controls and variations |
| --- | --- |
| Paragraph | Display, Subtitle, Annotation; full typography including indent, columns, orientation and alignment; Link |
| Image | Rounded; Duotone; Margin; Border, Radius, Drop shadow; Enlarge on click |
| Heading | Display, Subtitle, Annotation; typography without indent or columns; Link |
| List | Text typography; Padding, Margin, Block spacing; Border, Radius; Link |
| Quote | Plain; background Image; Padding, Margin, Block spacing, Minimum height; Link and Heading |
| Button | Outline; typography with orientation and alignment; Padding and Width; Border, Radius, Drop shadow |
| Buttons | Typography without Colour; Padding, Margin and vertical/horizontal Block spacing |
| Code | Fira Code default; text typography; Padding and vertical Margin |
| Pullquote | Text alignment; background Image; Padding, Margin, Minimum height; Link |
| Search | Text typography; Margin; Border and Radius |
| Separator | Wide Line, Dots; background Colour/Gradient; vertical Margin; no Typography or Border |
| Footnotes | Text typography with Orientation, without Text alignment; background Colour only; Padding, Margin, Border, Radius and Link |
| Table | Stripes; text typography; Cell padding, outer Padding and Margin; Border without Radius |

Text typography means Colour, Font, Font size, Appearance, Line height, Letter
spacing, Decoration and Letter case. Unless the matrix says otherwise, text
blocks expose background Colour/Gradient and Border/Radius. Each desktop pane
has Advanced → Additional CSS declarations, validated by the canonical mapper.
Menus retain the shared Escape, outside-click, trigger-toggle and focus-return
behaviour. Typography options are required checked entries with individual
Reset actions when authored. Dropdown menus omit Close under the existing exception.

Theme variation reference values were cross-checked against the official
[Twenty Twenty-Five block styles](https://github.com/WordPress/twentytwentyfive/tree/trunk/styles/blocks),
including `01-display.json`, `02-subtitle.json` and `03-annotation.json`.
No third-party icon geometry is copied. Fluid `vw` references adapt to the
preview's `cqw` sizing contract. WordPress's Display custom numeric size field
is itself blank for its fluid clamp default; Studio preserves that presentation
until a numeric custom size is authored. The temporary Image chooser reads
existing Files only. Asset selection, Enlarge on click and Additional CSS remain
Default controls, following Studio's device-editing boundary. Search and Pullquote
retain the existing specimen adapters; no new persisted block type is introduced.

Controls → Block Styles panes (`/studio/ui/controls#block-style-panels`) uses the
same production pane with temporary history and Reset. It demonstrates all supported
profiles, variation navigation, duotone, shadow selection/layer editing and their
shared typography, colour, spacing, border and Advanced controls. The shared Border
control's optional unit list preserves existing editor defaults while the Styles
panes expose the captured six units: px, %, em, rem, vw and vh.

The Paragraph comparison on 20 October 2026 also checks the complete control
layout. Line height/Letter spacing and Columns/Decoration share a row when the
controls container is at least 300px wide, and stack below that width. Orientation
uses the catalogue Typography symbol in horizontal and rotated presentations,
with accessible names and native radio keyboard behaviour. Background reuses
`BackgroundSelection`, including its aligned swatches, row separators, selected
website palette, and alpha support. Line indent uses the shared
`ParagraphLengthSetting` input-first variant; its Reset belongs to the section
menu. The bounded shared stepper also supplies Columns. Advanced starts closed.
The block detail header contains Back and States; the Blocks list retains its
bulk Reset menu. These are Styles compositions, independent of editor inspectors.

The remaining eleven panes were individually rechecked against that live
configuration on 20 October 2026, including every section options menu. Heading
and Button pair Decoration/Orientation at wider control widths; List and the
other text panes keep Decoration full-width. Button has a percentage Width
preset/custom slider and linked Padding axes. Buttons has vertical-only Margin
and independent numeric/slider gap axes, initially 16px. Quote and Pullquote use
input-first Minimum height sliders. Image and Search omit border-style choices;
other panes retain them. Border pickers share the website palette and alpha controls. Border widths start linked without losing unequal
inherited sides. Image Duotone uses an unset/value swatch, and Image/Button show
the Shadow label. Quote's Elements menu additionally exposes H1–H6 colour rows.
Shared custom spacing and radius rows stack their sliders at narrow widths.

Reference block defaults are adapted from the pinned
[Twenty Twenty-Five theme.json](https://github.com/WordPress/twentytwentyfive/blob/62c10821880ac2242460e7ecf42727ce1a026047/theme.json).
Quote inherits Large, its left border, padding and gap; Code inherits Fira Code,
Medium, palette colours and padding; Pullquote inherits XXL and 1.2 line height;
Search inherits Medium and 1.6 line height; Button inherits Medium and its palette
and padding; Buttons inherits a 16px gap. These computed defaults are separate
from authored history: Reset resumes them, while site/device overrides and Undo
remain scoped. Plain cancels Quote's border/padding. The spacing scale includes
the reference's fluid lengths, adapted from viewport to preview-container units.
Font-size buttons use the current website preset catalogue, including custom
entries; Reset and history synchronise custom-size mode. Explicit image links
remain content-owned when Enlarge on click defaults are projected.

WordPress's specimen iframe was blank during this comparison, so pane controls,
menus and default values were checked live; content rendering was checked locally
against the canonical Studio renderer and pinned theme source. This does not
claim a pixel comparison of WordPress's unavailable specimen content.

`blocks-preview-model.ts` projects scoped defaults into fresh canonical blocks
before BlockRenderer renders the Style Book or Home sample. Explicit content
styles take precedence. Style Book's role typography yields to explicit block
wrapper properties; its specimen layout and table defaults remain intact.
Search applies the same canonical style-to-CSS mapper to its existing wrapper.

Block styles use session-only Undo/Redo and the owning saved website-settings adapter. Global Defaults
supplies individual properties; Test and Test 2 override properties independently.
Clearing an override or Reset resumes inheritance. Reset on the list clears the
current scope's block overrides; Reset on a detail clears only that block.
Reset styles, Undo, and Redo include these changes. Settings persist through the canonical Global Defaults or selected fixture owner; template structure and the universal interface preset remain separate.

Automated checks: `node --experimental-strip-types --test tests/site-editor-blocks.test.mjs tests/site-editor-style-book.test.mjs tests/site-editor-styles-menu.test.mjs`.
The renderer tests do not prove CSS layout. Manual checks: search the list,
open a specimen with the keyboard, edit size, colour, case, padding, and border,
and compare the Style Book and Home sample. Check Heading levels, List, Quote,
Pullquote, Table, and nested Button/Buttons overrides in rendered CSS. Exercise
site inheritance, Reset, Undo/Redo, menu Escape/focus return, 240px/420px panes,
and minimum/wide preview widths. Reload discards the sample changes.


### Block viewport states

Each block detail includes the shared States menu: VIEWPORT → Default, Tablet,
and Mobile. Default edits the baseline; Tablet and Mobile reuse the editor's
bounded `ParagraphStyle.responsive` maps and inherit unset values from Default,
independently of one another. Global and site device overrides merge per field.
A site font preset/custom size or solid/gradient choice replaces the inherited
alternative. Detail Reset clears only the selected viewport; list Reset clears
all current-scope block styles. Undo/Redo includes these edits.

Selecting a state requests Fit, 768px, or 390px from the canonical preview frame,
bounded by available space. State selection is the editing target; manually
resizing the preview changes what width is displayed without redirecting edits.
The selected menu checkmark identifies the editing target. View
selection and preview sizing do not create style history entries. Both the Home
preview and Style Book resolve responsive CSS against the preview container.

`ViewportStatesMenu` owns the same selected checkmark, initial selected-item focus,
arrow-key navigation, Escape, outside-click, trigger-toggle dismissal, and focus
return in Blocks and Controls → Preview frame. The Library specimen also exercises
the frame's `preferredWidth` contract; Reset remounts its temporary example.
Editor responsive-style provider defaults remain unchanged. Preview-only theme
values use bounded temporary device metadata alongside canonical responsive fields.

Checks: run the Blocks, responsive-styles, buttons-presentation, and
resizable-preview-frame test files, followed by type checking and the production
build. Verify all three states, independent device edits, site inheritance,
Reset/Undo/Redo, Search and grouped Button typography, keyboard dismissal, and
240px/420px panes. The current matrix was inspected read-only in the authenticated WordPress tab
after Andrew explicitly authorised access. No WordPress values were changed or saved.


## Identity inheritance

Site Title, Site Tagline, Site Logo and Site Icon in the temporary Site Editor
preview distinguish inherited, authored, and hidden values. Unset fields inherit
Global Defaults; authored text or a selected image overrides the default, with
empty or whitespace-only text deliberately remaining blank. Hide suppresses the field without
replacing its stored value. Reset removes either
an override or Hide choice and resumes inheritance. Turning Hide off restores the retained override, or resumes inheritance when
there was no override. Reset deliberately clears both the retained override and
visibility choice. Undo/Redo includes both values and visibility. Global Defaults has no
parent, so clearing its text leaves the preview blank. Existing Test and Test 2
starting text remains authored. Logo and Site Icon follow the same unset/inherit, Hide and Reset states.
Inherited images retain the Global Defaults Blob reference, while selecting an
image creates a site-specific override. Remove hides an image in a site; in
Global Defaults it clears the selected default. The global catalogue placeholders
remain illustrative and are not inherited assets. This is Andrew's explicit product direction, independent of WordPress's
site identity storage.

The sample website header and browser tab resolve the same effective title; the
header resolves the effective tagline. Settings show inherited text as regular editable text with an inheritance
description. Hidden fields retain their contents in grey. Changes use Identity
history and the owning saved settings adapter; Library specimens remain temporary.

Controls → Site identity (`/studio/ui/controls#identity-controls`) consumes the
production `IdentityControls`, `IdentityPreviewHeader` and `IdentityPreviewTab`,
with the same identity resolver, reducer and shared control stylesheet. It provides
Global Defaults, Test and Test 2, inherited and custom fields, Hide/Reset, Undo/Redo,
and an image chooser using bundled Landscape/Mountain examples. Specimen resources
never read Files or product stores. Reset example remounts its isolated history.

Removing a site-specific Logo or Site Icon clears that image override while retaining
its Hide setting. Revealing it then uses Global Defaults. Remove is offered only
for an authored image; Reset clears both the override and Hide. The Site Editor
and Controls Library share these actions and their Undo/Redo behaviour. A hidden
authored image remains replaceable; selecting a replacement preserves Hide.

Hidden Site Title and Tagline fields remain editable and visually dimmed. Typing
or clearing their text preserves Hide; revealing a cleared field leaves it blank
until Reset restores inheritance.
Both consumers use the same shared identity controls.

Site Editor settings sliders use the pointer cursor on their tracks and thumbs,
including while dragging. This local presentation leaves shared sliders elsewhere
with their existing grab/grabbing cursors and preserves disabled-slider feedback.

### 23 October 2026 parity follow-up

The live WordPress comparison confirmed percentage and absolute-unit Button widths;
new values retain px, %, em, rem, vw, or vh, and older bare numbers remain percentages.
Zero is retained. Button state editing resolves the viewport first, then the state,
and leaving Button cannot carry its state into another block's settings. Appearance
shows the effective selected state. Catalogue rows use the measured 42px rhythm,
with a 40px icon-led search field and no trailing chevrons. The compact Table preview
scales its canonical 640px specimen rather than squeezing columns into the pane.

Container panes expose typography, background, spacing, borders, and relevant
minimum dimensions. Columns and Social Icons have two-axis spacing; Column has
single spacing. Spacer and Embed expose their supported margins. Dynamic text
fields use shared typography and surface controls; Featured image uses the existing
image filter and border controls. These profiles and all specimen changes flow into
the UI Library through BlocksPreview, not a second implementation. Studio-specific
Cell padding and List alignment/spacing remain supported deliberately.


### Rendered Block Styles regression checks

From the ACM Studio repository, run the local development server with `npm run dev`.
Install the isolated browser once with `npx playwright install chromium`, then run
`npm run test:browser`. Set `STUDIO_BROWSER_URL` to another explicitly selected
local server if required. With an installed Google Chrome, use
`STUDIO_BROWSER_CHANNEL=chrome npm run test:browser` instead.

These Playwright checks open the memory-only Library specimen in a fresh browser
context at 1440px, 820px and 390px. They compare computed colour, font size and
padding between the inline preview and Style Book, exercise inherited Group
values and Reset, and check reference-only labels. They do not save website
settings or modify Test/Test2. This bounded check does not replace the full
editor editing, keyboard, popover and publication acceptance checks.

Group, Row, Stack and Grid resolve defaults through one shared family resolver.
Row/Stack/Grid authored values override Group per property, including device maps;
inspector Reset still removes only the current target's own values. Search and
Pullquote remain labelled reference-only specimens rather than insertable blocks.


Website Paragraph Line indent supports independent Tablet and Mobile values in
`previewResponsive`, using the existing validated website-settings contract.
With Indent all paragraphs off, the first paragraph after another block remains
unindented and consecutive paragraphs inherit the website indent. Turning it on
indents each paragraph. Explicit preceding-paragraph content indentation keeps
precedence, including zero. This website-default setting does not enable the
individual content inspector's responsive Line indent control or change its
storage envelopes.

Inherited Button defaults defer to each active, individually authored interaction
property; other default properties continue to apply. Focus includes keyboard
focus-visible. Image enlargement defaults apply only when the content has no
explicit destination and no legacy custom URL. The Library's Compare authored
styles specimen exercises these presentation boundaries without saving content.


The Edit field passes its canonical preceding sibling into the same website
projection used by Preview. Nested owners begin independent sibling lists;
projected child blocks retain their existing context. The Library's authored
styles example compares actual BlockField and BlockRenderer paragraph output,
including first/consecutive indentation and Indent all paragraphs.

### Container Button element colours

Group (and its Row, Stack and Grid layouts), Columns and Column expose an
Elements → Button colour row with Text, Background and Gradient tabs, following
the authenticated WordPress panel inspected on 25 October 2026. The same
`ElementColourSetting` supplies website-wide Colours → Elements and the memory-only
Library. Section retains its existing controls.

Optional `buttonTextColor`, `buttonBackgroundColor`, `buttonBackgroundGradient`
and `buttonGradientId` values belong to the existing website `blockStyles` owner.
They are a backwards-readable extension of WebsiteDesign, not document content or
a new store; existing fixture/global-library envelope versions remain unchanged.
The existing validator, scoped Styles history, global/site resolution and
responsive override path own these values. Reset removes the selected scope's
fields and resumes inheritance. Solid and gradient backgrounds are alternative
values and do not leave a stale inherited background behind.

Inherited CSS variables resolve the nearest container independently for text and
background. Container defaults override ordinary website Button defaults; explicit
Button base/device formatting and authored interaction states remain higher.
Website Button interaction-state settings also override the container's normal
colour in the corresponding state. The canonical BlockPreviewRules and
WebsiteDesignSurface render the same rules in Edit, Preview, Style Book, the
Library, and generated local fixture output. No projected values are saved into
authored blocks.

Run `node --test tests/container-button-elements.test.mjs` and
`npm run test:browser -- tests/browser/container-button-elements.spec.ts` from the
repository root. The Library comparison exercises nested per-field inheritance,
solid/gradient changes, authored backgrounds, device choices, hover, Reset, and
popup dismissal without writing website data.

### Actual fixture website presentation

Test and Test2 opt into the same Twenty Twenty-Five rendering baseline as the
comparison page and Style Book, including when saved global and site style maps
are empty. WebsiteDesignSurface resolves the existing role and block defaults
for rendering only. It does not select or save a variation, modify canonical
blocks, migrate sources, or change the default for other legacy consumers.
Explicit global/site settings and authored block, device, and interaction
properties remain authoritative. Resetting a fixture website property therefore
resumes the reference baseline rather than the former ACM fallback.

The shared reference baseline owns normal Quote typography through the Text role
and pill Button surfaces, including Outline. Quote appearance inherits authored
Text settings unless a Quote override supplies it. Shared structural rules fill an unconfigured Image
to its content width while retaining explicit inline image dimensions. Captions
and tables inherit their existing canonical role resolvers. With no saved Layout
content width, a fixture page provides 645px of content plus the shared horizontal
gutters; saved Layout values retain their existing semantics. Header width stays
independent. Navigation uses the shared Medium preset and its own normal/hover
link decoration until an explicit saved Links size or decoration overrides it;
authored Navigation and per-link values remain higher. This is a fixture presentation fallback, not adoption of the separate
versioned website-layout contract.

The retained Site Editor home frame's read-only preview removes the surrounding
editor canvas's horizontal padding, maximum width, and border. The website page
then owns the frame's 24px default gutters exactly once: a 390px frame provides
342px of content. This adapter is limited to hosted home Preview; ordinary
interactive three-pane editors keep their existing canvas dimensions.

Controls → Block Styles panes → Compare website presentation uses the real
WebsiteDesignSurface, BlockField, and BlockRenderer with temporary content,
empty design maps, Edit/Preview, device widths, saved Button roles, gutter choices,
authored override examples, and
Reset. Run `node --test tests/fixture-website-presentation.test.mjs` and
`npm run test:browser -- tests/browser/fixture-website-presentation.spec.ts`
from the repository root. The browser check compares the painted default and
authored states in both modes without changing fixture sources or stores.

Footnotes controls were rechecked against the installed WordPress Styles pane on 25 October 2026. Orientation uses the shared Horizontal/Vertical radio group; Background exposes Colour only. Previously saved text alignment and gradients remain readable and rendered until explicitly changed or reset. The current Gutenberg trunk supports additional background features, so this profile follows the inspected installation rather than claiming parity with every release.

### Assigned page preview sizing

Assigned templates use the canonical `TemplateSurface` width and maximum width,
including inside the hosted preview’s column layout. Empty pages still render
their assigned template; a Header and Content template has no body to display
until blocks are added. The memory-only browser regression renders production
components and styles at desktop and narrow widths without reading or saving
Test or Test2 records:

```sh
npm run test:browser -- tests/browser/template-surface.spec.mjs tests/browser/block-toolbar-library.spec.ts
```
