# ACM Styles

ACM Styles provides framework-neutral types, validation and CSS exports for the
ACM visual baseline. The workspace governance Style Guide is the only stored
source of style values; ACM Studio parses its token tables and supplies the
resulting values to this package's exports.

The package exports the UniversalStylePreset and InterfaceStylePreset types,
validation, CSS custom-property maps and responsive CSS
output. Preset values are passed in from the parsed Style Guide rather than
stored in this package.

Import styles.css only for the package wrapper class. Import fonts.css when the
local Inter font is required. The bundled upright and italic variable fonts
are under src/fonts, with their full SIL Open Font License in the same folder.
The Studio Styles editor offers the documented fallback chain — Helvetica
Neue, Helvetica, Arial and generic sans-serif — as individual choices. These
use fonts available on the host and need no bundled files. Existing presets
using the earlier System Sans and Georgia choices remain readable, though the
editor no longer offers them.

This is a local package. It has no runtime framework dependency.

## Editing the shared preset

The canonical values live in `../../../workspace-governance/STYLE_GUIDE.md`. ACM
Studio parses and validates its token tables, then supplies the resulting
in-memory presets to this package's CSS exports. Its local Styles editors save
only the Markdown guide through the existing revision-checked gateway. Studio
owns that gateway, write ownership and recovery; this package owns types,
validation and CSS export rules. Consumers that bundle styles must include the
canonical guide as a build input. Project-owned copies and branding overrides
remain separate. The website schema is v0.10.0 and reads v0.1.0–v0.9.0. One neutral hover background
covers disclosure headings, neutral controls, menu items and list items.
For v0.4.0, migration chooses the first non-default colour in neutral-control,
disclosure, menu-item and list-item order; otherwise it keeps the neutral-control
value. v0.3.0 uses disclosure; v0.1.0/v0.2.0 use `#F0F0F0`. The four earlier CSS
variables remain compatibility aliases of the canonical neutral hover value.
See `../../docs/studio-ui-library.md` for saving and recovery.

## Text actions

Use `class="acm-button acm-button-text"` on a semantic button for compact actions
such as Clear and Reset. It works without the preset wrapper and centralises
normal, hover, pressed, focus and disabled states. Products may theme
`--acm-action-color`, `--acm-action-hover-color`, `--acm-action-active-color`,
`--acm-action-disabled-color`, `--acm-action-hover-background`,
`--acm-action-active-background` and `--acm-action-min-height`.
The default text action uses the existing darker accent for readable text;
ACM Studio derives its text action colour from the shared semantic Accent
(`palette.accent` / `--acm-color-accent`) and uses a compact 32px target.
Keep native `disabled` semantics when an action is unavailable. Consumers using
`aria-disabled` must prevent activation themselves.

This additive CSS contract is v0.3.0. The UniversalStylePreset data contract is
v0.12.0 and its validator migrates earlier saved preset versions. Website button
border widths support px, em, rem, vw and vh; earlier numeric widths remain
pixels. Percentages are unavailable because CSS border width does not accept
them. Layout
spacing and content width accept px, %, em, rem, vw and vh; corner radius
accepts px, %, em and rem; border width remains px. Earlier pixel-only layout
values migrate to explicit px metrics. Font-size
units are px, em, rem, vw and vh; line height is unitless; letter spacing is px,
%, em, rem, vw and vh. Legacy line-height em values migrate to the equivalent
unitless number. Percentage letter spacing exports as its equivalent em value.

`interactions.selectionColour` exports `--acm-interaction-selection-colour`
(default `#0088FF`) for interface selections, independently of palette Accent.

Control accent colour is shared by toggles and standard sliders. The CSS export
derives hover by multiplying each sRGB channel by 0.88 and rounding; pressed
repeats the operation on hover. These derived states are not saved settings.

`palette.workspaceBackground` exports `--acm-color-workspace-background`
for the space surrounding editing content. It defaults to `#F8FAFC`, independently
of pane and authored document surfaces. Earlier presets migrate with this default.

Block selection uses `interactions.blockSelectionColour` (`#FF383C`), exported
as `--acm-interaction-block-selection-colour`. It is independent of Alert and
interface selection. Older presets migrate to the same red default.

The interface preset v0.2.0 adds `colours.sharedBlockSelection` for shared template-part selection. Legacy v0.1.0 presets remain valid and use their existing block selection colour for the shared-selection CSS variable.
