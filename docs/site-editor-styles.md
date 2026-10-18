# Site Editor style preview

Browse Styles in `/studio/site-editor` follows the Twenty Twenty-Five reference:
nine full variations, nine colour palettes, and eight typography pairings. The
three grids share one choice presentation, with named buttons, pressed states,
keyboard focus, and native button activation. Existing Pane, two-left-pane,
header actions, and history controls remain canonical.

Selections are memory-only. Global Defaults supplies both dimensions; Test and
Test 2 can independently override palette and typography. A full variation sets
both. Use Global Defaults removes both site overrides. Undo/Redo and platform
shortcuts affect the current section's preview history. Identity history remains
independent. Leaving or reloading the page discards the preview. No site source,
shared interface preset, template, or saved style is changed. Other Styles
categories and the header actions remain unavailable.

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

The behavioural reference is Gutenberg v19.3.0, revision
`1ff81b42269288bb7ed3415d76558331670ce401`, specifically
[`preview-styles.js`](https://github.com/WordPress/gutenberg/blob/1ff81b42269288bb7ed3415d76558331670ce401/packages/edit-site/src/components/global-styles/preview-styles.js),
`preview-iframe.js`, and `variations/variation.js`. Studio uses its existing native
buttons and CSS rather than importing Gutenberg's iframe or motion runtime.
Unlike that reference's reduced-motion suppression of the hover view, Studio
shows the name instantly so it remains available to users with reduced motion.
The palette wash is capped below full opacity to keep names readable against
the dark reference palettes at Studio's smaller card sizes.

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
`node --test tests/site-editor-browse-styles.test.mjs tests/site-editor-styles-menu.test.mjs tests/site-editor-identity-preview.test.mjs`,
focused ESLint, and `npm run build`. In a browser, open Styles → Browse Styles;
check all three groups, full and independent choices, scope switching, global
inheritance and site reset, Undo/Redo, Back focus return, keyboard activation,
and the existing pane collapse/reopen controls. Check desktop, tablet, and mobile
layouts; reload to confirm preview reset.
