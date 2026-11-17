# Changelog

## Unreleased

### Added

- Add Universal Style Preset schema v0.12.0 with px, em, rem, vw and vh
  website button border widths; earlier numeric widths remain pixels.

- Add Universal Style Preset schema v0.11.0 with unit-aware layout spacing,
  content width, radius and border width. Package v1.2.0 migrates older pixel
  values to explicit `px` metrics.

### Added

- Add Universal Style Preset schema v0.10.0 with WordPress-compatible font-size
  and letter-spacing units and unitless-only line height. Package v1.1.0 reads
  v0.1.0–v0.9.0 and migrates legacy em line height to its unitless number.

- Add interface preset v0.2.0 shared template-part selection colour; v0.1.0 inputs retain their block selection colour as the CSS fallback.

- Add the independently versioned Interface Style Preset v0.1.0 and `--acm-ui-*`
  CSS exports. Package v0.11.0 keeps the universal website preset unchanged.

- Add schema v0.9.0 Block selection colour, independent of Alert and interface
  selection. Package v0.10.0 reads v0.1.0–v0.8.0 with `#FF383C` as the default.

- Add schema v0.8.0 Workspace Background with its own semantic colour token.
  Package v0.9.0 reads v0.1.0–v0.7.0 with the existing `#F8FAFC` default.

- Add schema v0.7.0 Control accent colour and derived hover/pressed CSS tokens.
  Package v0.8.0 reads v0.1.0–v0.6.0 with the existing `#3858E9` default.

- Add schema v0.6.0 interface selection colour, separate from Accent. Package
  v0.7.0 reads v0.1.0–v0.5.0 with the existing `#0088FF` selection default.

- Consolidate neutral hover groups into one v0.5.0 preset setting, with strict
  legacy migration and compatibility CSS aliases.

- Add v0.4.0 preset hover backgrounds for neutral controls, menu items and list
  items; migrate older presets while preserving disclosure values.

- Add the v0.3.0 preset `interactions.disclosureHoverBackground` token and CSS
  variable. Validation migrates v0.1.0 and v0.2.0 inputs with the default value.

- Add the reusable Text action CSS variant and product-theme tokens for Clear
  and Reset, with shared hover, pressed, focus and disabled states. Package
  v0.3.1 retains the v0.2.0 saved preset contract.

- Add individual Helvetica Neue, Helvetica, Arial and generic sans-serif
  choices to match the shared Inter fallback stack. Preserve version 0.1.0
  presets and existing System Sans and Georgia values.

- Add the framework-neutral universal ACM visual preset, validation and CSS
  exports, with locally bundled Inter variable font assets.

### Changed

- Document Studio’s explicit local authoring of the canonical shared preset,
  including synchronised guide tables and the package’s value ownership.

### Fixed

- Darken the universal Base button blue to `#0074D9` so white button text meets
  readable contrast while keeping the existing palette accent unchanged.
