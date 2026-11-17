# ACM Icons

ACM SVG symbols, including licensed Inter-derived keyboard and heading lettering and the
MIT-licensed Copilot brand mark from Lobe Icons. See [its provenance](sources/copilot/README.md). Private development package `@acm/icons`
v0.33.0; no package release or product-wide icon replacement has occurred.

The current library contains 399 symbols, each with Regular-S/M/L geometry,
providing 1197 standalone SVGs. This includes 154 UK keyboard key identities
across 144 active keyboard symbols, plus retained legacy keyboard symbols.

## Setup and use

From `acm-icons`, run `npm run build` and `npm test` with Node.js 22 or later.
The asset generator needs no dependencies. A React consumer supplies React 18+.
From Studio, install `@acm/icons` with `file:./packages/acm-icons`.

Import `iconNames`, `iconMetadata`, `iconGeometry` and `svgAssetPath` from
`@acm/icons`; import `AcmIcon` from `@acm/icons/react`. For example:

```tsx
<AcmIcon name="action.undo" scale="Regular-M" size={24} />
<AcmIcon name="security.lock" label="Locked" />
```

Unlabelled icons are decorative. Meaningful standalone icons require `label`.
Use the `svgAssetPath(name, scale)` package subpath with your bundler's asset
resolver, or consume `@acm/icons/svg/action.undo/Regular-M.svg` directly.
Metadata and geometry have no React dependency. Metadata also ships as JSON.

## Structure

- `masters/`: one editable SVG containing three independently editable scale groups.
- `catalogue.json`: symbol meanings, search keywords and provenance.
- `scripts/build.mjs`: strict SVG validation and deterministic generation.
- `dist/`: generated portable SVG assets, geometry, metadata and TypeScript types.
- `src/`: small React adapter using normal SVG elements.
- `tests/`: contract, asset safety and generation tests.

Review the golden reference collection and full library at Studio's
`/studio/ui/icons` route. See [Specification](SPECIFICATION.md) and
[Changelog](CHANGELOG.md). Product commands and Ribbon layouts belong to their
consumers, not this package.

## UK keyboard collection

The common full-size UK ISO keyboard inventory is available through
`@acm/icons/keyboard`:
`keyboardKeys`, `keyboardAsset` and `createKeyboardSvg`. For React, import
`AcmKeycap` from `@acm/icons/keyboard/react`. Choose `mode="keycap"` or
`mode="symbol"`; both use the same master artwork, while the Space keycap is deliberately blank and its bare symbol retains the word. Mac modifier
keycaps add larger Inter-outline word captions across their full width, while
bare symbols show the marks alone. See the font-free
collection at Studio's `/studio/ui/icons?collection=keyboard` route. It covers
UK Mac and Windows legends, including platform-specific keys and optional
hardware examples; layouts and function-row markings vary by model.

Keyboard appearance accepts `colour`, `borderColour` and `fillColour` (six-digit
hex values; `none` for transparent fill). These apply to both React and SVG
exports. See the specification for Inter provenance and regeneration.
