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
saved style is changed. Typography is also available; other Styles categories,
Style Book and Additional CSS remain unavailable.

The sample website demonstrates the reference palette and heading/body font
pairing. It does not import the theme's block-specific styling or template system.
Reference fonts are deliberately confined to specimens and the Styles webpage
preview; Studio's controls retain their existing system UI typography.

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
trigger retains interface typography. Only bundled normal font weights are offered; italic font installation is not
implied. Semantic website specimens demonstrate every element and heading level.

The owning Styles reducer retains property-level global/site overrides, preset
changes, font availability, and Undo/Redo in the existing temporary history.
Resetting an element removes that scope's authored properties and reveals its
inherited values. Activating any Typeset, including the currently selected one,
clears that scope's custom element settings while preserving its size presets
and enabled font families. Identity history remains separate.

Font Library uses `StudioDialog`, supports family availability and normal-weight
specimens, and commits draft family changes only through Update Preview. Cancel
or Escape discards the dialog draft. Fonts lists the active Typeset's declared families, enabled extras, and families
used by resolved element overrides, deduplicated and sorted alphabetically by
English display name. The Typeset metadata retains Default's declared Fira Code
family even though its body and headings use Manrope. Other Typesets do not
implicitly retain Default's families. Declared and authored in-use families
remain available. Font Library and element Font choices use the same order. This is a deliberate bounded adaptation: it manages the nine
already bundled families together, without individual face installation, file
upload, external font providers, or persistent font storage. Available face
counts describe only this bundled subset. Variable fonts are one variable face;
their weight samples illustrate positions in its range.

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
omits Size; individual heading levels retain it. Decoration is not offered.
The menu is 240px wide to match WordPress. It may overlap the Typography pane
when space before the pane is insufficient and remains within the viewport on
the workspace-facing side. It omits Close and retains Escape, outside-click,
trigger-toggle dismissal, and focus return. Reset all uses the existing element
reset history.
