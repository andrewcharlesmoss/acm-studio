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
collection at `/studio/ui/icons?collection=keyboard`. It presents 154 key
identities across 144 active keyboard symbols: letters, platform-specific
number-row and punctuation
legends, modifiers, editing/navigation keys, function keys, numeric keypad,
Mac-specific legends and optional Windows hardware keys. The Mac British/Irish
section/plus-minus key and grave/tilde key are distinct from the Windows UK
not/broken-bar top-left key. Mac number 2 has @ and a small € marking; Mac 3
has £ and a small # marking; the Mac apostrophe key has a double-quote Shift
legend. Windows variants retain their UK legends. The collection includes Mac F1–F12 action legends,
separate F1–F19 keys, and a Copilot mark based on Andrew's supplied reference.
Function assignments and optional keys vary by model, OS and manufacturer;
this is a catalogue of common key types rather than a model-exact physical
layout.

The sibling `@acm/icons` v0.10.5 package owns the glyph masters, shared square,
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
font-metric scales and baselines, natural punctuation sizes, fixed stacked
legend positions and intentional two-line names. Secondary marks on Mac number
2/3 and apostrophe keys follow the supplied keyboard reference. Left/right Mac
Command, Option and Control variants align their symbols to match their key
positions. Their wide keycaps show larger Inter-outline word captions beneath
the symbols; bare-symbol exports show the marks alone. Mac function-row artwork
uses larger pictograms in a common band above the F numbers. Brightness Down
and Up use small and large suns without additional minus/plus marks;
Touch ID and Power have separate symbols, AltGr has its own legend, and the
Context Menu key uses a menu symbol. Copilot uses the MIT-licensed monochrome
brand SVG from Lobe Icons, with one preserved ribbon shape at all three scales.
Its pinned source and licence live in `acm-icons/sources/copilot/`; SVG downloads
retain the licence notice. This is an explicitly authorised exception to the
original ACM artwork rule. The Spacebar
keycap is blank and spans more catalogue columns so its long frame remains
visible; numeric zero also spans two columns. Bare-symbol mode retains the
Space legend. Windows-only physical keys
do not appear in the Mac filter. SVGs do not require fonts. Shared keys show
primary/Shift legends; alternate layers and every physical key width are outside
this set.

Square, wide, tall and ISO keycap dimensions and transparent outer padding remain
unchanged. Backspace, Spacebar and Shift use the new proportions documented
above. Inter sources and licensing belong to ACM Icons; Studio neither embeds
nor loads the font for key artwork.
