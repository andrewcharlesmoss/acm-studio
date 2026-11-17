# ACM icon specification — v0.35.1

## Contract and status

This development baseline versions stable semantic names, scale names, metadata,
SVG conventions and the React interface. Breaking changes increment MAJOR,
compatible additions MINOR, and compatible fixes PATCH, including during v0.x
development. The library uses original ACM artwork, the explicitly authorised MIT-licensed
Copilot mark from Lobe Icons, and licensed Inter-derived
keyboard and heading lettering, authored as editable
vector geometry for this project from 18 September 2026. No Apple or Gutenberg
paths are used. Familiar action metaphors do not imply affiliation. Distribution
is private; broader licensing is a separate decision.

## Social profile symbols — v0.12.1

Social Icons, LinkedIn and TikTok add three symbols for Studio's social-link
blocks. Each has original ACM geometry at the three optical scales. LinkedIn
uses a filled rounded tile with the letters cut out; TikTok uses a filled,
single-note silhouette. These follow Gutenberg's filled monochrome treatment
while retaining original ACM paths. Existing symbol names and consuming
interfaces remain compatible.

## Icon addition timestamps — v0.13.0

The generated `iconAddedAt` export maps each stable symbol ID to the ISO 8601 timestamp, including its UTC offset, of the first Git commit that added its master to this package. The checked-in `added-at.json` is the source of truth; it covers every catalogue symbol and is validated during generation. Committed entries record when the symbol entered the package history. New uncommitted entries carry a provisional local addition timestamp; reconcile those entries to the first introducing commit before a published package release. An addition timestamp does not establish publication or release. Consumers can sort timestamps as instants and display each stored timestamp with its offset.

## Icon modification timestamps

The generated `iconModifiedAt` export maps each stable symbol ID to the ISO 8601 timestamp, including its UTC offset, of the latest Git commit that changed that symbol's editable master SVG. The checked-in `modified-at.json` is the source of truth and is validated during generation. A symbol unchanged since its introduction has the same Added and Modified timestamp. Compatibility aliases share their canonical symbol's timestamps. This records artwork changes only; metadata-only edits do not change this value. Consumers should label it Modified to make that scope clear.


## Group layout refinement — v0.17.1

Group uses two overlapping rounded squares; Row and Stack use opposing open
brackets along their respective axes; Grid uses one frame with joined centre
divisions. Each has original ACM geometry at all three optical scales, following
familiar editor layout metaphors without copying Gutenberg paths. The stable
IDs and React contract are preserved. `layout.flow` also identifies the Group
block itself; `arrange.group` retains its separate object-grouping meaning.

## Group layout symbols — v0.14.0

Four original symbols identify the Group block's content flow, Row, Stack and
Grid layouts. Each symbol has authored Regular-S, Regular-M and Regular-L
geometry and stable `layout.flow`, `layout.row`, `layout.stack` and
`layout.grid` names. They distinguish block-flow arrangement from the existing
table column symbol. The addition is compatible with existing names and paths.

## Embed symbol — v0.15.0

`insert.embed` identifies the URL-based Embed block. Its original ACM artwork
shows a framed embedded-content mark at three optical scales; its stable name
and generated assets are exposed through the shared package catalogue.

## Studio block symbols — v0.16.0

Ten original product-neutral symbols identify reusable Components/template
slots, Buttons, Separators, Spacers, reading-time Clocks, Calendar dates,
external links, forward navigation and List Item indent/outdent. Each has explicit Regular-S,
Regular-M and Regular-L artwork and a stable semantic name. Studio uses these
catalogue entries in its Block Library and links each block symbol to its
shared entry. Existing symbols and consumers remain compatible.

## Pane direction symbol — v0.17.0

`navigation.chevron-right` adds a product-neutral horizontal chevron for
directional controls such as pane edges. Its Regular-S, Regular-M and
Regular-L variants retain open counters and the package's scale-specific
stroke weights. Consumers can rotate the same right-facing base geometry for
opposite directions.

## Social share symbol refinement — v0.12.2

The Social Icons symbol now uses the familiar three-node share mark, with filled
nodes and connecting strokes at all three optical scales. The catalogue metadata
names its share meaning. The stable symbol ID and consuming interfaces remain
compatible; the geometry is original ACM artwork.

## Shared adjustment and content-width controls — v0.11.0

The Adjust symbol adds original three-scale slider geometry for controls that
switch between presets and custom values. Default Width, Wide Width and Full
Width use a shared content frame with progressively wider inner blocks so a
block-width menu remains distinguishable from text alignment. These symbols
are reusable actions, not Studio-only drawings. This compatible addition leaves
existing names and paths unchanged.

## Content block symbols — v0.18.0

Twelve additive semantic entries identify Heading, List, Table, Code, Image,
Column, Document title, Featured image, Author, Publication date, Document content
and Social links blocks. Each has original independently proportioned Regular-S/M/L
geometry. Block metaphors follow Gutenberg recognition conventions; no Gutenberg
paths are copied or traced. The existing H formatter, bulleted formatting,
slashed inline Code, inline Image and selected Table cell symbols are preserved.
Button, Embed, Separator and Spacer retain stable IDs with refined original
short-wide, folded-frame, end-cap and diagonal-arrow artwork.

This is the private compatible development contract, not a published release.
The current inventory is 399 symbols and 1197 standalone optical SVGs.

## Geometry

All variants use a 24 × 24 viewBox, currentColor, rounded joins and caps. Regular-M
starts with a 1.75-unit stroke; Regular-S uses 2 units and slightly contracted,
simplified geometry to maintain open counters at 16px; Regular-L uses 1.5 units
and slightly expanded geometry at 32px. Medium is optimised for 24px, and can
also serve existing 22px controls. Small and large paths have their own explicit
coordinates in each master, not only different CSS dimensions. Small table
symbols omit the unimportant outer cell divisions. Delete retains two spaced
interior marks at all three scales. Optical correction is deliberate and reviewable.

Scale describes optical geometry, independently of the control's size. Check
against Inter at 16/24/32px, on light and dark surfaces and in real controls.
Filled details are used where they clarify a symbol, including selected cells,
redaction and the Paragraph head. A filled path may explicitly suppress the
inherited outline when that outline would distort its intended weight.
No embedded text fonts, images, scripts, links, external resources or styles.

## Masters and generation

Each SVG master has title/description metadata and exactly three groups named
Regular-S, Regular-M and Regular-L. Each group contains paths with absolute
M/L/C/Q/Z commands. The root carries outline presentation attributes. To view
one variant in a vector editor, hide the other two named groups in its layers
panel; all groups coexist for editing. For an unambiguous standalone preview,
open the generated dist/svg/<name>/Regular-M.svg (or S/L) after building.
The build validates the narrow grammar, emits individual safe SVGs and derives
portable geometry and declarations. Never edit generated paths independently.
`npm run check` verifies distribution byte-for-byte against masters.

## Golden reference and review

The golden set is undo, redo, select, image, text, delete, lock, unlock, zoom in,
zoom out and cell/row/column/combined highlighting. Inspect the actual-size
specimens before approving adoption. The initial delivery remains a catalogue
review: product-wide replacement is not authorised by this specification.

## Accessibility and naming

Names describe meaning (action.undo, security.lock), not implementation. The
React adapter is decorative by default and uses aria-hidden and focusable=false.
A non-empty label opts into role=img and aria-label. Interactive names and
pressed/expanded state stay on controls. Do not convey meaning only by colour.

## Object editing and arrangement batch

v0.2.0 adds 13 symbols and 39 optical variants, giving 69 symbols and 207
standalone SVGs. Copy and Paste cover clipboard actions; Group and Ungroup
describe shared and separate object boundaries. Six object-alignment symbols
use unequal outlined bars and a reference line, keeping text alignment a
separate future family. Layers uses stacked planes, Crop uses intersecting
corners, and Rotate pairs a curved arrow with an angled object.

Copy uses portrait sheets; Duplicate retains square objects and Pages retains
page-content lines. Group has one boundary around two filled objects; Ungroup
gives each object its own boundary, distinct from Selection Outline's handled
single object. Crop has crossing edges, unlike Fit Canvas's inward arrows.
Rotate keeps a visible object beneath its arrow, unlike Undo or Refresh. These differences
are semantic and must survive at all three intended sizes.

The Ungroup variants retain two separate object frames and open space between
them at every scale. Small variants retain larger counters and wider gaps;
centre guides stop at object edges rather than cutting through the outlined bars. Each scale has
explicit adjusted paths. Existing symbols, golden membership, React props and
asset paths remain compatible. This batch is for catalogue review only.

## Text editing and formatting batch

v0.3.0 adds 16 shared text editing and formatting symbols with 48 optical
variants, giving 85 symbols and 255 standalone SVGs. They belong to ACM Icons
and can serve any appropriate interface; Studio's catalogue is their current
review surface, not their ownership boundary. This increment does not adopt
the symbols into product controls.

Bold, Italic, Underline and Strikethrough use original path-drawn letterforms.
The four text-alignment symbols use text lines without object rectangles or
external reference guides. Their labels explicitly say Text to distinguish
them from object alignment. Link and Unlink share a diagonal chain family;
Unlink removes the connecting stroke and separates the open ends.

Bulleted List and Numbered List use two rows; the latter has original path-drawn
1 and 2 numerals, distinct from the circled Numbered Step symbol. Paragraph uses
a filled head and two solid stems, Heading an H without a level number, Quote
two quotation marks and Code opposing angle brackets with a central slash. No
fonts or external artwork are embedded, traced or copied.

Each scale uses its own coordinates and proportions. Preserve the Bold counters,
Paragraph's distinct stems, the gap beneath Underline, Unlink's visible break
and the legibility of both list numerals at 16px. Bold uses an original filled
contour with reversed inner paths to retain two open counters; filled bullets
are small emphasis marks. Both use the existing path grammar and retain the
scale-specific stroke widths. Existing 69 symbols, metadata, golden membership,
React props and asset paths are unchanged.

## General interface actions and feedback batch

v0.4.0 adds 12 shared symbols and 36 optical variants, giving 97 symbols and
291 standalone SVGs. Add, Remove, Settings, More Actions, Menu, Filter,
Sort Ascending, Sort Descending, Information, Help, Warning and Error are
product-neutral symbols owned by ACM Icons. Studio remains the review surface;
this increment does not adopt the new symbols into working product controls.

Add and Remove share equal-length strokes. Settings has eight outlined teeth
and an open centre; optical variants adjust tooth width, depth and counter
size independently. More Actions uses three separated filled dots. Menu uses
three equal lines, distinct from the text-alignment family's four lines.
Filter retains the existing Clear funnel language without its cross. The sort
pair keeps three unequal bars while reversing the adjacent arrow.

Information uses a separate dot and short lowercase i stem, distinct from the
circled Numbered Step. Help uses a question mark. Warning's triangle and Error's
circle remain distinct without colour; Error also retains its enclosing circle
to distinguish it from Close. All glyph details are original path geometry.

Each master contains explicit Regular-S/M/L geometry with the existing stroke
widths. Keep dot gaps, gear counters, arrowheads and interior feedback marks
legible at 16px. All previous 85 symbols, metadata, stable IDs and asset paths,
the 14-symbol golden set and the React contract are unchanged.

## Studio hover editing batch

v0.5.0 adds nine reusable symbols for block reordering and text editing,
bringing the catalogue to 106 symbols and 318 standalone SVGs. The additions
are Reorder, Move Up, Move Down, Footnote, Keyboard Input, Language, Math,
Subscript and Superscript. Studio consumes these through the shared icon
package; they remain product-neutral ACM symbols.

Reorder uses a two-column, six-dot filled grip with scale-specific dot sizes so
the mark keeps a consistent visual weight at 16px, 24px and 32px. Move Up and
Move Down use distinct chevrons.
Footnote pairs a raised reference mark with three separated text lines, keeping
the marker clear at 16px. Keyboard Input uses a framed key layout; Language
uses a globe grid; Math combines a radical and expression mark. Subscript and
Superscript place a small numeral below or above the baseline. Paragraph uses a
filled head and two solid stems to keep its
familiar typographic meaning at toolbar size. All variants use original ACM
path geometry and independent optical proportions at Regular-S/M/L.

## v0.5.4 optical refinements

Subscript and Superscript use curved, open 2 numerals that remain legible next
to the x at 16px. The four layer-order symbols use two overlapping sheets and
a horizontal direction arrow. Send to Back and Bring to Front add a terminal
bar, distinguishing movement to the far end from a single step. Row Height and
Column Width use three evenly spaced guides instead of tightly packed marks.
Editable Backup uses a document with a downward save arrow, distinct from Code
and the outward export arrows. Rotate brings its curved arrow and object closer
together at small sizes. Semantic names and consuming controls are unchanged.

## v0.5.5 clarity refinements

Group and Ungroup share two filled object marks; a common boundary versus two
separate boundaries makes the action legible at toolbar size. Selection Outline
uses four filled selection handles around one object. Fit Canvas pairs a canvas
frame with opposing inward arrows, separating it from selection handles.
Export Page remains the visual anchor for the export family. Export Selected
uses selection corners and Export All uses layered pages; both now share Export
Page's outward arrow. The seven semantic names, package interface and catalogue
count remain unchanged.

## v0.5.6 text and help refinements

Quote uses two filled closing marks with open counters and scale-specific tails.
Help keeps its question mark clear of the surrounding circle and uses a solid
terminal dot. Numbered List uses filled, hand-drawn numerals aligned with the
two text rules. All three preserve their semantic names and consuming APIs.

## v0.5.7 arrangement and status refinements

The four layer-order symbols leave more room between the overlapping sheets and
direction arrow. A shorter arrow marks one position; a longer arrow and a clear
terminal bar mark movement to the far end. Sort Ascending and Sort Descending
use three legible unequal rules with opposing arrows at all three scales.
Warning has a solid, scale-specific exclamation mark that remains distinct at
16px. Semantic names, asset paths and consuming APIs are unchanged.

## v0.5.8 recognition refinements

Hide uses a wider eye, interrupted iris and separated slash. Snapping uses a
horseshoe magnet; its off variant interrupts the outline around the slash.
Selection Outline separates four larger handles from the frame. Settings uses
six broad teeth and a more open centre. Footnote places a raised reference at
the right of body text, above separate note rules.

The one-step layer actions use two overlapping objects and a separate vertical
arrow. Bring to Front and Send to Back use three planes with a filled endpoint,
making their distinction independent of a small terminal bar. These designs
supersede the earlier geometry descriptions for the same ten symbols. Each
retains independent Regular-S/M/L geometry, original ACM provenance and its
existing semantic ID. The 106-symbol inventory and React contract are unchanged.

## v0.5.9 Snapping Off refinement

Snapping Off leaves transparent clearance on both sides of its diagonal slash.
The retained inner and outer lower curves preserve the horseshoe silhouette;
the right pole keeps its end-cap detail. Small-scale contours leave more room
around the slash without background-coloured masks. Its semantic ID, metadata,
React contract and the other 105 symbols are unchanged.

## Files, media and table actions

v0.6.0 adds 13 symbols and 39 optical variants, giving 119 symbols and 357
standalone SVGs. Upload and Download share a tray and opposing arrows; Show
completes the Hide eye family. Audio uses a musical note pair and Video uses a
play mark inside a media frame. Archive uses a closed storage box; Restore
opens that box around an outward arrow, distinct from Reset and Undo.

The six table actions place an addition mark above, below, left or right of
the table, or a minus beside its rows or columns. Small variants retain only
the meaningful row or column divisions. Medium and large variants restore
secondary cell divisions as space permits. The operation marks remain separate
from the grid at all scales, and deletion marks remain horizontal.

All new masters use explicit optical geometry. The previous 106 symbols,
metadata, golden membership, React interface and asset paths are unchanged.
Studio exposes the additions for review and SVG/PNG download; adoption into
working product controls is separate from this catalogue increment.

## UK keyboard collection — v0.10.8

The additive `@acm/icons/keyboard` subpath contains 154 common UK ISO key
identities across 144 active keyboard symbols. It covers A–Z, UK number-row
and punctuation legends, common and platform-specific modifiers, editing and
navigation keys, F1–F19, numeric keypad keys, Mac-specific modifiers and
function-row actions, and hardware-dependent Windows keys including Copilot.
The full catalogue contains 269 symbols and 807 standalone optical SVGs; the
119 interface symbols remain a separate collection. Earlier standalone
keyboard symbols are retained for compatibility.

UK Mac and Windows top-left punctuation differ: the Mac British/Irish key uses
section/plus-minus markings, while the Windows UK key carries grave, shifted
not and AltGr broken-bar legends. Mac grave/tilde is a separate key. Mac number 2 shows @ and a secondary €;
Mac number 3 shows £ and a secondary #; the Mac apostrophe key shows a shifted
double quote. Windows-specific keys, including Backspace, Delete, Insert, Print Screen, Scroll Lock, Pause/Break and Num Lock, are excluded from the Mac filter. The UK
ISO Return silhouette is tall. The 154 identities are common key types rather
than a model-exact physical layout:
optional laptop keys, hardware differences and function-row markings vary.
Mac F1–F12 action keys and F1–F12 function keys are both represented; extended
Mac F13–F19 are separate examples. Windows Copilot and context-menu keys are
optional or mutually substituted on some hardware.

`@acm/icons/keyboard/react` supplies `AcmKeycap`; labels opt into accessible
image semantics, otherwise artwork is decorative. Square, wide, tall, ISO,
Backspace, Spacebar, numeric-zero and left/right Shift frames compose the same validated
master paths. The added frames measure 84 × 48, 240 × 48, 96 × 48, 84 × 48 and 96 × 48
units respectively; existing frame dimensions remain unchanged. Keycaps are
illustrative, not hardware dimensions. The glyph scales retain their optical
roles; complete keycaps are intended for 48px or taller use. Symbols are also
available separately through AcmIcon. Studio provides platform, section and
search filters plus keycap/symbol and colour/export controls.

UK layout references, checked on 26 September 2026:
- [Apple keyboard identification](https://support.apple.com/en-gb/102743)
  establishes the British/Irish ISO family and tall Return form.
- [Microsoft United Kingdom layout](https://learn.microsoft.com/en-us/globalization/keyboards/kbduk.html)
  identifies the number-row 3 and its shifted Pound sign.
- [Apple modifier conventions](https://support.apple.com/en-gb/102650)
  identifies Command, Option and Shift markings.

References establish key meaning and layout. Key frames and ordinary symbols
are ACM artwork. Copilot is the authorised brand exception: the monochrome
SVG is sourced from Lobe Icons under MIT, with its source, pinned revision,
licence and reproducible conversion in `sources/copilot/`. It is a community
brand asset, not original ACM artwork or an official Microsoft distribution.
Copilot preserves one geometry across all three scale names. SVG exports retain
the MIT notice; the package also includes the source licence.
Names identify the keyboard function and do not imply brand affiliation.
Primary/Shift legends are represented, with selected physically printed third
legends from the UK references. Complete alternate keyboard layers and composed
shortcuts are outside this inventory. Function-row assignments vary between
models and OS versions. Existing symbols and renderer compatibility defaults
are unchanged.

Generated number-row and punctuation pairs use their actual painted bounds to
occupy separate upper and lower optical bands. Every generated pair retains at
least two viewBox units of painted separation at Regular-S, Regular-M and
Regular-L. The Mac apostrophe key places the shifted double quote above the
primary apostrophe. Mac 2/3 and the Windows top-left key keep their smaller
secondary marks aligned with the primary legend in the lower band.


## Full-size UK keyboard layouts — in progress

The additive `@acm/icons/keyboard/layout` export composes existing keycap
geometry into illustrative Mac and Windows UK ISO layouts with navigation and
numeric keypads. The Mac layout follows Andrew's supplied black and white UK
full-size keyboard photographs from 10 November 2026: the unlabelled circular
Touch ID sensor sits after F12, F13–F19 are present, Fn / Globe is at the lower
left, and the Home/End, Page Up/Down, arrow, editing and keypad legends reflect
that reference. The upper-left navigation utility key is reproduced as an
unidentified pictogram; its function is not inferred. The photos show one model;
hardware and legends vary, and these drawings do not claim exact dimensions.
Standalone Fn / Globe and fingerprint Touch ID assets remain unchanged. Mac-only
key variants keep Windows artwork and the existing individual key identities
compatible. Full-keyboard export also shows the Caps Lock indicator and tactile
marks on F, J and keypad 5. The composition preserves glyph proportions and
licensed lettering notices.
`fullKeyboardLayout` provides geometry; `createFullKeyboardSvg` generates a
font-independent SVG with validated colours. Studio previews the same SVG and
exports SVG or PNG. Individual key contracts are unchanged.

## Fn / Globe and Touch ID refinement — in progress

The Fn / Globe artwork uses a lighter globe stroke to keep its small meridians
open, while retaining the licensed Inter-derived `fn` lettering. Touch ID uses
separate, open fingerprint ridges at each optical scale. Both are original ACM
artwork; Apple hardware markings vary. Their hand-tuned masters are retained by
the keyboard generator. Fn / Globe and the fingerprint Touch ID key appear in
the full keyboard; the sensor-ring variant remains available separately.

## Keyboard lettering and appearance

Keyboard text legends use Inter v4.1-derived filled outlines; symbol artwork
and custom Mac function-row pictograms use original ACM vectors. Generated text
uses consistent font-metric scale and baseline bands for letters, digits and
ordinary punctuation, preserving the natural relative sizes of small marks.
Stacked legends have shared upper/lower positions, with each line fitted to the available width; selected long labels use
intentional two-line layouts. The long Spacebar specimen spans more catalogue columns and its exported keycap is blank, matching the physical reference; bare-symbol mode retains the Inter-outlined Space legend. Double-digit F keys keep the same type scale as
F1–F9. Mac modifier keycaps place larger Inter-outline word captions directly
in the 72 × 48 frame beneath their symbols, aligned for left/right variants.
The left and right Command symbols sit towards the outer ends of their captions,
as in the supplied full-size UK Mac keyboard photographs. The full layout uses
a narrower left Command and a wider right Control key to match those photographs.
Bare symbol exports retain only the modifier mark; Shift and Delete also use
the symbol alone, and Fn has a clear painted gap beside its globe at all three
optical scales. Mac F1–F12 action pictograms occupy a compact upper band above the
F-number, with clear painted separation at all three optical scales. Brightness uses
small and large suns without extra minus/plus marks,
Mission Control uses one large and two small windows, and media keys use
separate pause bars. Focus uses a broad crescent with size-specific contours,
separate from its F6 legend. Touch ID and Power are distinct; AltGr has its own legend;
the Context Menu key has a menu pictogram. Copilot uses the sourced filled ribbon silhouette with a transparent central opening. No text nodes or runtime font
dependency are introduced.
Inter source and SIL OFL 1.1 notices live in `sources/inter/`; the licence
accompanies the package.
Existing third-party icon-copying restrictions remain in force.

The reproducible converter is `scripts/generate-keyboard-lettering.py`, using
Python and fonttools v4.60.1. From the package root, run it in an environment
with that dependency, then run `npm run build` and `npm test`:

```sh
python3 -m venv /tmp/acm-icon-font-tools
/tmp/acm-icon-font-tools/bin/pip install fonttools==4.60.1
/tmp/acm-icon-font-tools/bin/python scripts/generate-keyboard-lettering.py
npm run build
npm test
```

It verifies the font SHA-256 before generating masters and uses Inter text
optical size 14 with weights 550/500/450 for S/M/L. Do not hand-edit generated
text masters; adjust the converter and regenerate. Other masters remain
editable.

`AcmKeycap`, `keyboardAsset` and `createKeyboardSvg` accept independent six-digit
hex `colour` (symbol), `borderColour` and `fillColour`. A fill of `none` is
transparent; it remains the default. An omitted border follows the symbol.
The React default still inherits currentColor; SVG export defaults to dark ink.
Filled glyphs use the selected symbol colour. Bare-symbol mode omits the entire
frame, including its fill and border. Only the keycap shape is filled; space
outside it remains transparent. Existing symbol viewBoxes and outer transparent
padding are unchanged. The Backspace, Spacebar, numeric-zero and Shift proportions
above intentionally differ from square keys; all other keycap dimensions remain unchanged. Tighter export bounds are deferred at Andrew's
request.

Studio starts its preview with a filled Default preset: off-black symbol and
border, off-white keycap, and light preview surface. Its Outline and Dark
presets and Reset to Default affect Studio presentation only. Custom
symbol/fill/border colours and transparent fill remain available; border colour
initially follows the symbol but can be unlinked. Preview and SVG/PNG exports
share these settings. The reusable React renderer keeps its currentColor and
transparent-fill defaults, and the SVG composer keeps its dark-ink and
transparent-fill defaults for compatibility.

## Heading levels — v0.19.0

Six symbols identify H1–H6 through stable `text.heading-one` to
`text.heading-six` entries. Small, Medium and Large masters retain explicit
optical geometry. In v0.19.1, Andrew authorised replacing the original drawn
marks with Inter v4.1-derived filled outlines. They use the same pinned source
and SIL OFL 1.1 licence as keyboard lettering, with no runtime font dependency.
They supplement the generic `text.heading` formatter and `block.heading`
identity. Studio consumes them for its inspector and canvas level controls.
This compatible private development increment is not a published release.

Regenerate Heading masters with the same pinned fonttools v4.60.1 environment:

```sh
/tmp/acm-icon-font-tools/bin/python scripts/generate-heading-lettering.py
/tmp/acm-icon-font-tools/bin/python scripts/generate-heading-lettering.py --check
npm run build
npm test
```

The converter validates the Inter source digest and uses optical size 14.
Small/Medium/Large weights are 600/550/500, with cap heights 11/12/12.5
viewBox units. Painted bounds are centred; glyph spacing and relative numeral
proportions come from Inter. Filled paths suppress the inherited stroke, so
rounded icon caps do not soften the typeface. Do not hand-edit these generated
masters; adjust the converter and regenerate. Catalogue metadata and SVG
exports carry the font provenance and SIL OFL notice. The other icons retain
their existing artwork and provenance.

## Styles — v0.20.0

`view.styles` identifies appearance controls with an original half-filled circle.
Its three explicit optical scales use the existing stroke weights and adjusted
circle radii. It supplements Settings without copying upstream paths. This is
a compatible private development increment, not a published release.

## Caption — v0.21.0

`text.caption` identifies a caption visibility control for tables or media. Its
original ACM frame and three lower text marks have independently proportioned
Small, Medium and Large geometry. It preserves the shared 24-unit viewBox and
currentColor contract. This compatible private development addition is not a
published release; no Gutenberg paths are copied or traced.

## Horizontal alignment fill — v0.21.1

`arrange.align-left`, `arrange.align-centre-horizontal` and
`arrange.align-right` use filled object rectangles at all three optical scales.
The existing guide lines, proportions, semantic names and React contract remain
unchanged. This compatible private development refinement is not a release.

## List View — v0.22.0

`view.list` adds an original three-rule stepped outline for viewing document
blocks as a list. Regular-S, Regular-M and Regular-L retain equal rule lengths
with optical adjustments to stroke and painted bounds. Its semantic name,
metadata and React interface are compatible additions; no Gutenberg artwork
is copied or traced. This private development increment is not a release.

## Corner indicators — v0.23.0

Five original symbols identify all box corners and the four individual corners,
using stable `layout.corners` and `layout.corner-*` names. Each has explicit
Regular-S/M/L geometry. Consumers may layer one corner over the four-corner
symbol to emphasise the selected corner while keeping the others visible.
The compatible private development increment is not a published release.

## Spacing side indicators — v0.24.0

Seven original symbols identify all sides, both axes and each individual side.
Stable `layout.sides-*` and `layout.side-*` names have explicit Regular-S/M/L
geometry. Consumers may layer active sides over the all-sides symbol.
This compatible private development increment is not a published release.

## Link action optical correction — v0.24.1

The stable `action.link` symbol now depicts a horizontal connected chain.
`action.unlink` uses the same chain with a diagonal break mark. Both retain
their existing names, metadata, three optical scales and consumer contracts.
This corrects the shared artwork without changing the action API; the private
compatible development increment is not a published release.

## Link action contour refinement — v0.24.2

Link and Unlink use original filled contours with a flatter oval chain, square
open ends and a short connector. Unlink adds a steeper diagonal break mark.
The optical variants retain stable IDs and consumer contracts; this is a
compatible private development refinement, not a package release.

## Layout alignment controls — v0.25.0

Ten additive `layout.justify-*` and `layout.align-*` symbols identify horizontal
and vertical layout alignment, spacing and stretching. Each uses one filled
content bar with perpendicular edge or centre guides, with independent
Regular-S/M/L proportions. Space Between has a short bar between two guides;
Stretch has a wide bar. The original ACM geometry follows familiar editor
metaphors without tracing or copying Gutenberg paths. Existing `arrange.*`
object-alignment symbols and `text.justify` remain unchanged. Studio uses this
family in its shared Group toolbar and inspector choices. This compatible
private development increment is not a published package release.

## Compact menu — v0.26.0

`navigation.menu-compact` adds original two-line menu artwork at all three
optical scales. It complements the existing three-line `navigation.menu` without
changing its geometry. This compatible private development contract is not a
published package release.

## Document creation — v0.27.0

`document.new-post`, `document.new-page` and `document.from-template` add three
original document-creation symbols at Regular-S, Regular-M and Regular-L. The
post uses a titled page with body lines, the page uses a blank sheet with a plus,
and the template symbol layers a reusable layout behind a new document. Their
stable catalogue names and metadata make the symbols available to any suitable
consumer. This compatible private development increment is not a published
package release.

## Header and Footer — v0.28.0

`layout.header` and `layout.footer` add original page-frame symbols with filled
top and bottom bands. Their Regular-S/M/L variants have explicit optical
geometry and stable, product-neutral catalogue names. Studio uses these symbols
for template-part creation actions. Existing symbols and renderer contracts
remain compatible. This private development increment is not a package release.


## Free rotation — v0.29.0

`arrange.rotate-free` adds opposing curved arrows for direct object rotation.
The original ACM artwork has compact, round proportions and explicit S/M/L
optical geometry. It is distinct from `arrange.rotate`, which retains its
angled-object action metaphor. Studio uses the new mark inside its rotation
handle. Existing names, geometry and renderer contracts remain compatible;
this private development increment is not a published package release.


## Vertical object alignment fills — v0.29.1

Align Top, Centre Vertically and Align Bottom use solid object bars at all
three optical scales, matching their horizontal alignment counterparts. Guide
lines, geometry, semantic IDs and renderer contracts remain unchanged. This
compatible artwork fix is a private development increment, not a release.

## General website symbols — v0.30.0

49 original symbols complete the requested website icon inventory:
communication, commerce, people, locations, security, capture and gallery media,
content metadata, rating states, devices, panes, and directional variants. Each
editable master has explicit Regular-S/M/L paths and the established stroke
weights. Small receipt, storefront, payment, and verse variants omit secondary
details to preserve open space. Star Half uses a filled left contour inside the
same star outline.

Existing Share artwork remains canonical at `social.icons`. Straight Left/Right
and Up Right arrows retain `navigation.back`, `navigation.forward`, and
`insert.arrow`. Up/Down chevrons retain `arrange.move-up` and
`arrange.move-down`; small chevrons use their Regular-S optical variants. Search
keywords expose these equivalents without duplicating artwork. Previous and Next
add double chevrons, separate from straight navigation arrows. The new entries
are catalogue assets only; they do not add website editing capabilities.
Existing IDs, artwork, golden membership, React interface, and keyboard assets
remain unchanged.

This compatible private development increment is not a package release or
deployment. Addition timestamps remain provisional until reconciled with the
introducing commit before a published release.

## Site design symbols — v0.31.0

Six original symbols add a website identity globe, navigation compass, structural
template frame, serif Aa typography mark, colour droplet, and striped background
disc. Each has explicit Regular-S/M/L geometry. Familiar editor metaphors follow
Andrew's Gutenberg visual references without copied or traced third-party paths
or font outlines. Existing Styles, Single Page, Symbol, and Shadow entries remain
canonical for their matching Site Editor uses. Template Layout serves both
template navigation and layout settings. Existing icons and rendering contracts
remain unchanged. This compatible private development increment is not a release.

## Open-eye preview — v0.32.0

`view.preview` adds an original open upper eyelid and filled pupil for appearance
previews at all three optical scales. The existing closed-outline eye `view.show`
visibility symbol remains unchanged. Studio uses Preview for its Style Book
toggle and exposes the same canonical artwork in its Icons catalogue. This
compatible private development increment is not a published package release.

## Laptop preview — v0.33.0

`device.laptop` adds an original laptop outline for preview and View controls.
The three optical scales retain a broad screen, narrow hinge gap and wider base
at 16px, 24px and 32px. It is distinct from `device.desktop`, which depicts a
monitor on a stand. This compatible private development increment is not a
published package release.

## Social Link service icons — v0.34.0

The Social Link service inventory contains 44 ACM monochrome service symbols
for the WordPress 7.1 built-in services. LinkedIn and TikTok use their established
artwork under `social.service.linkedin` and `social.service.tiktok`; their former
`brand.linkedin` and `brand.tiktok` names remain compatibility aliases in geometry,
metadata, timestamps, React and SVG exports. `iconNames` enumerates only canonical
names; `resolveIconName` maps legacy names for catalogue navigation. Link, Mail
and RSS reuse the existing
catalogue chain, envelope and RSS marks. Each symbol has explicit Regular-S,
Regular-M and Regular-L geometry, searchable service metadata, and a stable
`social.service.*` name. Artwork is independently generated ACM geometry;
metadata identifies the supplied screenshot or consulted visual reference when
recorded, and flags entries whose visual reference is not recorded. These are
not official assets. The icon guidance permits visual reproduction while
continuing to prohibit copied source paths and downloaded artwork.
`social.service.x` uses an outlined diagonal band and a crossing solid stroke,
following the supplied X reference. The compatible development increment changes no existing symbol IDs or
renderer contract and is not a published package release.

## Social brand-colour variants — Unreleased

Social service symbols provide an additive `brand` variant through `AcmIcon` and
`@acm/icons/social-brand`. The existing default `currentColor` geometry remains
unchanged, including legacy LinkedIn and TikTok aliases. The brand asset and
self-contained SVG export use package-owned geometry, bounded colours and unique
React gradient IDs; callers cannot inject SVG markup or paint values.

Single-colour treatments use the [WordPress Social Link logos-only palette](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/social-link/socials-without-bg.scss)
as a reference, with Mastodon updated to the current official `#6364FF` brand
colour from its [Brand Toolkit](https://joinmastodon.org/branding), and Dropbox
updated to its official [Dropbox Blue](https://brand.dropbox.com/color). Google,
Instagram, Snapchat, Flickr and TikTok use generated multicolour interpretations
informed by their public brand presentations, including
[Google's updated G](https://blog.google/company-news/inside-google/company-announcements/gradient-g-logo-design/),
[Instagram's identity](https://www.meta.com/brand/resources/instagram/instagram-brand/),
[Snapchat's Ghost](https://www.snap.com/brand-guidelines),
[Flickr’s colour mark](https://www.flickr.com/photos/flickr/53510883273/), and
[TikTok's design guidance](https://developers.tiktok.com/docs/en/getting-started-design-guidelines).
These are ACM reproductions, not official assets or a claim of exact brand parity;
no third-party paths or source artwork were copied. Some brand marks are inherently
monochrome. Brand names and marks remain the property of their respective owners.

## Inherited value indicator — Unreleased

`state.inherited` adds an original parent-to-child symbol at all three optical
scales for values inherited from a broader scope. It is product-neutral, and
consumers supply the accessible meaning and colour. Its outlined parent block sits above a downward arrow, communicating
the source and direction of inheritance at small control sizes.

## Status colour appearance

The optional `status` React variant takes the resolved universal semantic colour value
for Information, Warning, Caution, Error and Published. The mapping is exposed
by `@acm/icons/status-colours` so consumers can resolve the same roles for
portable exports. Default monochrome artwork and all optical scales remain
available. A contrasting black or white glyph is chosen against the filled status colour. Colour complements the icon's shape and accessible label.

## File and media colour appearance — Unreleased

The optional `media` React variant colours Files, Image, Audio, Video and
Gallery with the resolved universal Accent value. The colour treatment applies
Accent consistently to each symbol's strokes and existing filled details, while
preserving its original geometry. `@acm/icons/media-colours`
exposes the supported names and portable SVG export. Default monochrome artwork
and all optical scales remain available; the colour reinforces each symbol's
shape rather than carrying its meaning alone.

### Annotation colour appearance — Unreleased

Highlight and Redaction provide optional palette-resolved artwork with a contrasting keyline and palette text ink; Highlight adds a yellow marker stroke. The default artwork remains monochrome. The React adapter and `@acm/icons/annotation-colours` export share the same paths.

### Feature colour appearance — Unreleased

Designs and Shapes offer optional Accent artwork with a contrasting keyline. Lock, Unlock, Key and Shield use optional gold and neutral artwork through `@acm/icons/security-colours`; colour conveys no security status. The React adapter shares paths with the matching `@acm/icons/feature-colours` and `@acm/icons/security-colours` exports. The earlier Accent security variant remains available for compatibility.

### Illustration colour appearance — Unreleased

Files, Image, Audio, Video, Gallery, Designs and Shapes offer palette-resolved illustrations through `@acm/icons/illustration-colours`. Their colours describe visual elements rather than status. Existing media and feature variants remain available. React and SVG exports use the same paths.

## Mac platform mark — in progress

`brand.apple` is an original ACM interpretation of the Apple platform mark,
a visual reference for identifying Mac keyboard layouts, not an official asset.
Apple owns its trademark; its public [trademark guidance](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html)
contains restrictions on use. Andrew confirmed permission to use the Apple logo
in ACM Studio on 10 November 2026; use elsewhere requires its own rights check.
The shared Windows key mark identifies Windows.

## UK Mac reference key variants — Unreleased

Sixteen additive Mac-specific key identities describe the supplied UK full-size
reference without changing existing Windows or individual-key identities.
Keyboard drawings are original ACM geometry, not copied Apple path data.
The lower-case Escape and keypad asterisk use the pinned Inter v4.1 source and
SIL OFL 1.1 licence. The named navigation utility symbol is a visual representation
only: its function is unknown from the photographs. Mac F7, F9 and F10 have
reference-aligned rewind, fast-forward and speaker-only marks. Symbol artwork
and lettering are reproducible by `PYTHONPATH=<fonttools-4.60.1> python3
scripts/generate-keyboard-lettering.py` from the package root. Original asset
IDs, standalone fingerprint Touch ID and existing Fn / Globe remain available.

## Compact action optical refinements — Unreleased

Horizontal and vertical ellipses share three filled circular dots with matching
optical weight and spacing at each scale. Explicit stroke suppression keeps
their diameter predictable. At 16px, dots remain at least two pixels wide.
Create from Template simplifies its rear sheet and keeps one body rule;
Snapping Off omits the small pole divider and opens the inner curve. The six
small table actions retain only their directional row or column division and
leave at least one rendered pixel between the grid and operation mark.
Composite Medium and Large artwork, semantic IDs, metadata, provenance, and
renderer contracts remain unchanged. Studio's existing catalogue specimens and
consumers inherit the canonical regenerated assets. No release is implied.

## Website identity and cast shadow — Unreleased

`site.identity` uses a browser frame with a separate header, a solid brand tile,
and a short name rule. It replaces the earlier abstract globe while preserving
the website-branding meaning. `view.shadow` uses an outlined foreground square
and a solid lower-right cast shadow instead of a sun. Transparent clearance
separates the foreground and shadow without a background-coloured mask. Both
retain independently authored S/M/L geometry, stable IDs, original ACM
provenance, and existing renderer contracts. Catalogue search terms describe
the revised artwork. Existing Studio specimens and consumers inherit the shared
assets. This refinement does not establish a release.

## Copy and Duplicate distinction — Unreleased

Copy retains overlapping portrait sheets. Duplicate retains overlapping square
objects and adds a centred plus inside the front object at each optical size.
The plus distinguishes creating another item from copying to the clipboard.
Both symbols retain their stable IDs, original ACM provenance, and renderer
contracts. Studio and other consumers inherit the regenerated artwork.

## Outline and filled appearances — Unreleased

Home, Files, Search, Copy, Duplicate, Archive, Delete, Bell, Envelope,
Calendar, Tag, Select, Shield, Comment, Desktop, Locked, Unlocked, Plus Circle,
Error, Published, Inherited, Zoom In, Zoom Out, Designs, Shapes, Numbered
Step, Filter, Button, Clock, and Layers offer Filled beside Outline at all three
optical sizes. Colour, Tip, Rotate, Category, Block Default, Single Page, Pages,
New Page, Receipt, Clear, New Post, Editable Backup, Fit Canvas, Tablet,
Featured Image, Author, Capture Video, Block Meta, and Key also offer Filled at
all three scales. Adjust, Keyboard Input, Image block, Embed, Columns, Grid
Layout, Drawer Left, Drawer Right, Template Layout, and Table block also offer
Filled. Social links block, Show, Paste, Cover, Account Record,
All Items, and Component also offer Filled.
Snapping, Language, Map Marker, Capture Photo, and Image also offer Filled.
Insert and delete row and column actions, Store, and Twitch also offer Filled.
Warning, Help, Caution, Mobile, Video, Column, Caption, Group, Ungroup, and Site Identity also offer Filled.
Gallery, WhatsApp, Settings, Instagram, Dribbble, Highlight, Edit, and Create from Template also offer Filled.
Shadow, Send Backward, Send to Back, Information, and Save to Media also offer Filled.
Payment, CodePen, and Publication date also offer Filled.
Filled is a paint treatment of the same canonical paths in `masters/`:
faces become solid, while existing details are cut out or retain their original
strokes. No second SVG drawing or independent coordinates are maintained.
React and portable SVG export apply the same treatment. Upload and Download
remain Outline only: their open arrows and trays have no enclosed face, and a
solid chevron would introduce a false flat edge. The small Search lens is
slightly contracted in the shared master so its existing handle stays clear
beside the solid face at 16px; Outline inherits the same optical correction.
A change to an outline master therefore carries through to its filled form.
The `appearance` prop is independent of the established colour-variant prop;
outline remains the default. Filled appearance rejects colour variants until those
combinations have defined paint treatments. `@acm/icons/filled` exposes
capability discovery and a matching portable SVG export. Other icons retain
their existing default artwork and reject a filled request. IDs remain stable.
