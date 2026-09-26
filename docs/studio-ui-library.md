# Studio UI Library

## Purpose and organisation

Open `/studio/ui` from the Studio dashboard or its content and template tools.
The library has six sections:

- **Navigation** — the reusable top-level Application Section Navigation
  component, with an isolated interactive example.
- **Workspace** — application section navigation, a combined live Ribbon and
  two resizable panes around a centre workspace, assembled from the shared
  components and temporary fixtures.
- **Ribbon** — Ribbon component structure, controls and isolated Studio/Account
  product examples.
- **Panes** — shared Pane structure, optional regions, resize/collapse behaviour
  and isolated Studio examples.
- **Icons** — original shared ACM symbols, metadata, provenance and optical
  specimens at 16, 24 and 32px.
- **Styles** — the executable universal style preset, editable in a local preview
  sandbox with a live specimen. Sandbox edits remain in component state and do
  not alter templates, products or the shared baseline.

Navigation is `/studio/ui/navigation`, the Ribbon section is
`/studio/ui/ribbon`, Panes is `/studio/ui/panes`, Icons is `/studio/ui/icons`,
and Styles is `/studio/ui/styles`. `/studio/ribbon` and `/studio/panes` remain
compatible redirects. Studio navigation links to the combined library.

## Ownership boundaries

The library groups reference views without combining package ownership. The
sibling `@acm/icons` package owns original symbol artwork and metadata; the
sibling `@acm/styles` package owns the executable universal style values and
CSS custom-property exports. The governance Style Guide remains authoritative
for policy. The Ribbon and Pane implementations remain in their existing
modules and retain their own contracts. Workspace composes the shared
components and includes the generic Application Section Navigation specimen;
it does not copy either implementation or use product stores. Application
section navigation owns the visual relationship between top-level product
sections; consumers supply the labels, routes, permissions and active section.
The Navigation section demonstrates that shared component directly; Workspace
shows how it composes with the Ribbon and panes.

All fixtures and interactions remain temporary component state. The library
does not call product APIs, use write ownership or read/write browser storage.
Ribbon icon usage in the inspector means examples in the Ribbon catalogue only;
it is not an exhaustive inventory of use throughout ACM products.

The Icons inspector downloads the selected original symbol as SVG at its chosen
16, 24 or 32px optical size. PNG downloads use the same optical geometry at
three times the selected pixel dimensions and retain a transparent background.

Styles previews the `@acm/styles` v0.1.0 preset beside the full written
workspace Style Guide. Hovering or focusing a specimen or setting shows its
baseline, current sandbox value, guide excerpt and exact line; clicking or
tapping pins the source selection. The guide view records its source commit and
content digest. Its generated line index is bundled with Studio, so the hosted
page does not read another repository at runtime. After committing a guide
change, run `npm run styles:source` from the ACM Studio root to refresh that
bundle; `npm run styles:source:check` verifies it without writing files.
Responsive typography, semantic colour, button and layout controls change only
the current React state. Reset All restores the package default; the page does
not publish a global baseline or save project settings.

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

In a browser, inspect all six sections, the legacy redirects, section-navigation
selection, Ribbon and Pane
specimen interactions, icon search/selection/provenance, and the combined
Workspace with both panes expanded, resized and collapsed. Check keyboard
navigation and focus, desktop/tablet/mobile widths, and verify narrow preview
overflow stays inside the Workspace frame while the page itself remains usable.
For Styles, check palette, typography, button and layout controls, inherited
responsive values, property/section/global resets, and contained mobile preview
scrolling. Check hover, focus and pinned guide references, exact source lines,
search navigation and responsive panel selection; verify that edits are not
written to browser storage.

## UK keyboard collection

The Icons section groups interface icons and the complete common UK ISO Keyboard
collection at `/studio/ui/icons?collection=keyboard`. It presents 150 key
identities across 135 keyboard symbols: letters, number-row and punctuation
legends, modifiers, editing/navigation keys, function keys, numeric keypad,
Mac-specific legends and optional Windows hardware keys. The Mac British/Irish
section/plus-minus key and grave/tilde key are distinct from the Windows UK
not/broken-bar top-left key. The collection includes Mac F1–F12 action legends,
separate F1–F19 keys, and a Copilot mark based on Andrew's supplied reference.
Function assignments and optional keys vary by model, OS and manufacturer;
this is a catalogue of common key types rather than a model-exact physical
layout.

The sibling `@acm/icons` v0.9.0 package owns the glyph masters, shared square,
wide, tall and UK ISO keycap frames, platform metadata and SVG composer. It
contains 257 symbols overall, including the 119 existing interface icons.
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
exports use the displayed dimensions exactly. A, 3/£, key labels and Mac
modifier symbols use licensed Inter v4.1-derived path geometry. Mac function-row
action pictograms use original ACM vector geometry, enlarged above their
separate outlined F-key legends; Forward Delete uses its symbol alone. Imported
SVGs do not require fonts. Shared keys show primary/Shift legends; alternate
layers and every physical key width are outside this set.

Export bounds and outer padding remain unchanged. Inter sources and licensing
belong to ACM Icons; Studio neither embeds nor loads the font for key artwork.
