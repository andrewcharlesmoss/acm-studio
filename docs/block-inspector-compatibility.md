# Block inspector compatibility

ACM Studio uses Gutenberg as its reference for block settings. The comparison
below covers every Studio block type available in the editor on 29 September
2026. WordPress controls vary with its theme, registered block supports and
media services. Studio stores portable typed blocks and provides local previews;
these settings do not turn its data into WordPress block markup.

## Compatibility approach

Inspect Gutenberg v24.1.0-rc.1 block definitions and inspector source, its
[Block Supports reference](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/),
documentation and tests to understand each block's content structure, saved
attributes, controls and rendering behaviour. Do not substitute trunk for the
pinned source. Preserve the meaning and editable
structure of content that a future WordPress importer maps into Studio. An
inspector control is useful only when Studio can store, preview and export its
effect reliably; copying every control would not by itself make an import
faithful.

Studio owns its typed content model and editing interface. Match Gutenberg's
familiar behaviour where it helps, but allow a better Studio interaction when
the underlying content remains representable. Record intentional differences
and unsupported attributes here. Before claiming import compatibility, test
realistic WordPress block fixtures, including nested content and unsupported
blocks, and verify that no source content is silently discarded. WordPress blog
import remains future work, not a capability supplied by this inspector review.

For the Block Library and shared-controls work, the pinned upstream source
comparison is [Gutenberg v24.1.0-rc.1 at `e3ac73cd69d472341b66c43cb77be36e838f868e`](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e),
verified on 30 September 2026. On 1 October 2026, the current WordPress 7.1
documentation and moving Gutenberg `trunk` Button declaration were also checked
for Button state controls; the declaration is at
[`packages/block-library/src/button/block.json`](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/button/block.json).
`trunk` is a moving reference, not an immutable baseline. The pinned source
remains the repeatable reference for other block declarations and inspector
code. The rendered Paragraph library specimen was checked locally on 2 October:
its single settings panel shows the HTML anchor, Additional CSS class(es) and
Additional CSS fields in the Advanced section, with no nested Block/Studio
tabs. The current WordPress Paragraph inspector was also checked and exposes
the same three fields. The local desktop screenshot and accessibility tree
confirm that the fields below the anchor continue down the panel; a cropped
view of its top does not show them. This was the earlier limited Paragraph
check; the dated six-block audit below records the subsequent scope and remaining
model/theme gaps. Browser evidence is recorded separately from source support.
Paragraph Background colour/gradient and the three Gutenberg Advanced fields
remain available in the single Block inspector. The nested Studio tab has been
removed. The capability profile continues to record whether a setting comes
from Gutenberg or ACM; ACM-only style options remain hidden from the inspector.
Existing saved values remain in the typed model and continue to render; hiding a
control does not migrate or delete its data. Essential content fields for
Studio-specific blocks and standalone social links remain in the same panel so
their essential content can still be edited. The document-level Studio tab is
unchanged.

### Reused controls and ownership

Block pane settings are composed from shared control modules where the data
contract and interaction match. `ParagraphInspector` supplies shared
typography, background, dimensions, border and element settings to supported
text and layout blocks. `BackgroundSelection` and its colour/gradient pickers,
`BoxLengthSetting`, `ParagraphLengthSetting`, `PresetNumberSetting`,
`BorderSettings`, `ImageDimensionsSetting` and `FocalPositionSetting` are reused
by their consumers. `LayoutInspector` is shared by Group and Section; Columns
and Column keep their distinct contracts. Block-specific content and media
fields stay in their owning inspectors. Extract a control only when its state
and behaviour are genuinely shared.

The nested List Item has its own capability profile attached to List, rather
than being added to the top-level `ContentBlock` inventory. Its profile owns
the supported style fields used by the inspector and workspace validator, and
the List catalogue shows its separate control inventory.

The profiles and table below describe Gutenberg-owned pane controls. Gaps that
depend on missing content structures or media services remain explicit; do not
add controls that cannot preserve and apply their values.

The earlier audit consolidated Quote attribution and List type,
Document Title level, Post Author and Post Date alignment, LinkedIn and TikTok
profile URLs, and Columns/Column vertical alignment into the unified Block
inspector because these are available in Gutenberg's block interface.
This is a capability comparison, not a claim of identical placement. Gutenberg
puts List type and Quote text alignment, Document Title level, Post Author/Post
Date alignment and Columns/Column vertical alignment in canvas BlockControls;
Studio intentionally consolidates those Gutenberg-owned settings in its one
block settings panel. Quote text alignment remains in its block toolbar so the
same action is not repeated in both places. Quote attribution and Table caption are canvas content
fields in Gutenberg. Studio provides rich citation editing on the canvas and retains a plain pane field
for compatibility; Table caption is edited on the canvas.
Retained attributes without a current inspector editor include Separator text
colour, Featured Image focal/text alignment, Code language, legacy responsive
stacking and Group Columns layout, and Section minimum width. The Separator
`hr`/`div` selector follows Gutenberg's Advanced control, as verified in the
pinned [Separator editor](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/separator/edit.jsx).
Studio currently retains a separator ARIA role on `div`; Gutenberg's `div` is
non-semantic, so that accessibility difference remains open. Group content/wide
widths, separate Social Icons gap axes, Reading Time prefix/presentation and
Document Subtitle style options are available in the current implementation.
Field data, whitelisted Component string properties and Section role remain
editable; Component identity/arbitrary data and Section source are not editable.
The Embed player title, URL and caption are canvas controls.

The catalogue-only documentation projection records availability separately
from runtime profiles. Capability categories do not imply the pane's visual
order. Recorded Gutenberg defaults are distinct from Studio insertion defaults;
these records do not constitute a fresh upstream parity certification.

Advanced block settings follow each corresponding core block's declared
supports. Studio exposes HTML anchor and additional class controls only where
the mapped block supports them, with List Item Additional CSS classes and
declarations explicitly recorded as an ACM extension below. Group also exposes
its semantic HTML element and ARIA label. The shared Advanced inspector
currently exposes the selector-free Additional CSS field for Paragraph,
Heading, Quote, List, List Item, Table, Code,
Image, Embed, Button, Separator, Spacer, Group, Section, Columns, Column,
Footnotes and Social Icons, plus Document Title, Cover Image, Post Date and
Post Author. Individual LinkedIn and TikTok children retain saved Advanced attributes
but have no child Advanced editor. The ACM Section follows
Group-style Advanced fields while keeping its role metadata Studio-owned.
The field's selector-free declarations use typed
presentation settings and the supported safe subset is applied to the block's
rendered element; selectors, at-rules, external URLs, CSS escapes and
`!important` are not applied. Gutenberg restricts this field to users with the
`edit_css` capability; Studio has no user-role capability model.
This shared Advanced coverage follows `advancedBlockTypes` in
`app/studio/blocks/capability-profiles.ts`. The Studio-specific Section maps
its Advanced appearance to the corresponding Group-style settings.
Group Allowed Blocks follows Gutenberg's separate section after Advanced. It
filters nested block choices and rejects disallowed insertions while preserving
existing children when the allow-list changes. Social links remain children of
the Social Icons block; Groups allow the Social Icons container rather than
offering LinkedIn and TikTok as direct nested choices.

| Studio block | WordPress reference | Studio inspector support | Remaining difference |
| --- | --- | --- | --- |
| Paragraph | [Paragraph](https://wordpress.org/documentation/article/paragraph-block/) | Text alignment; None, Wide and Full block-width alignment; optional Typography, Dimensions, Border and Elements controls with per-section Reset all; preset and custom font sizes in px/em/rem/vw/vh, nine Appearance weights with italic variants, linked axes or separate sides for padding and margin, Gutenberg-shaped Border and Radius controls, background, link Default and Hover colours with low-contrast indicators, line indent, text columns, drop cap, fit text and the Advanced HTML anchor, additional CSS classes and Additional CSS declarations. | Match the Paragraph inspector in Andrew's current WordPress editor: Typography's hidden-options menu starts with checked, disabled Colour and Size when no explicit font size is set; when a size is set, Size is replaced by the enabled Reset Size action. Optional controls follow in this order: Appearance, Line height, Letter spacing, Line indent, Columns, Decoration, Letter case, Drop cap and Fit text. Existing Text shadow values remain stored and rendered, but the control is hidden to match Gutenberg. Dimensions offers Padding then Margin; Border offers Border then Radius. The Border control groups width, colour and style, while existing typed values remain intact when a control is hidden. Link Default and Hover colours are independent. A warning appears below the palette and on the Link row below a 4.5:1 contrast ratio. Contrast is checked against an explicit opaque block background, sampled opaque block gradient, or the Studio surface; image and unsupported/translucent colours are not assessed. Font family and Orientation are Gutenberg capabilities gated by theme/editor typography settings and remain disabled because they are absent from Andrew's current reference. Minimum height, Minimum width and block Shadow are ACM additions and are hidden. Existing values remain stored and rendered. Paragraph Additional CSS uses Gutenberg's description but applies safe declarations only; selectors, at-rules, external URLs, CSS escapes and `!important` are not applied. Gutenberg restricts the field to users with the `edit_css` capability; Studio currently has no role-based capability model. Other Gutenberg configurations can declare additional typography capabilities (some experimental or settings-gated); the profile records source ownership without creating another inspector tab. Line indent follows Gutenberg's adjacent-paragraph behaviour. Drop cap is available independently of theme capability, but is suppressed for aligned paragraphs following Gutenberg's alignment rule. Theme-defined font/colour presets and registered style variations are not imported. |
| Heading | [Heading](https://wordpress.org/documentation/article/heading-block/) | Selected-level H1–H6 header and summary buttons, Fit text and shared visual settings. Text alignment and None/Wide/Full block-width alignment remain in the canvas toolbar. | The default Heading background follows the supplied theme capture: Colour and Gradient without Image. Saved image backgrounds remain rendered and editable. Font family, Orientation and Text shadow follow the captured theme configuration and remain hidden, with saved values retained. Theme presets and WordPress-specific fit-to-container metrics remain unsupported. Gutenberg toolbar availability varies with selection and theme capabilities; this inventory focuses on the inspector pane. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Editable inner Paragraph, Heading, List, Quote and Image blocks; rich citation; Default/Plain style; shared typography, dimensions, background, border and Advanced settings. | Heading Elements and a configurable allowed-block policy remain unsupported. Citation supports guarded inline-image insertion and editing; footnote insertion is unavailable. |
| List and List Item | [List](https://wordpress.org/documentation/article/list-block/) and [List Item](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/list-item) | Recursive List editing, ordered marker/start/reverse controls and item-scoped formatting remain available. Selected List Items use the shared style editor for text colour, family, appearance, size, line height, letter spacing, decoration, case, background, padding/margin, border/radius and link Default/Hover. Advanced retains anchor, classes and safe Additional CSS. | Plain-string items remain readable. Item text colour and CSS fields are ACM extensions to the recorded pinned List Item contract. Single-item Footnote and inline-image insertion preserve the item and its nested content; Footnote notes use a document-level owner. Insertion across multiple List Items remains unavailable. |
| Table | [Table](https://wordpress.org/documentation/article/table-block/) | None/Left/Centre/Right/Wide/Full block alignment, per-column Left/Centre/Right content alignment, fixed or adaptive cell widths, header/footer, caption, Default or Stripes style, padding, border and typography. | Caption and cells support rich text in the canvas, with plain-text mirrors preserving legacy saved rows. Per-cell `th`/`td` tags and header scope are retained through rendering, HTML round-trips, and structural row/column edits; the inspector has no direct controls for editing this metadata. Cell spanning (`colspan`/`rowspan`) is not supported. |
| Code | [Code](https://wordpress.org/documentation/article/code-block/) | None/Wide block-width alignment, shared visual settings and shadow. | Language selection and syntax highlighting are hidden ACM additions. Gutenberg's Code block does not offer Full width or minimum dimensions. |
| Image | [Image](https://wordpress.org/documentation/article/image-block/) | None/Left/Centre/Right/Wide/Full block alignment; source, alternative text or decorative state, rich-text caption edited below the image in the canvas, custom/image-file/lightbox link destination, display width and height, aspect ratio, cover/contain scale, focal position, Default/Rounded style, margin, border, shadow and Advanced anchor/classes/safe Additional CSS. Legacy plain-text captions remain readable and are mirrored in the existing caption field for summaries and reading time. Legacy Wide display records migrate to the shared alignment contract. | Resolution variants, media-editor crop/rotate/flip and duotone filters need a managed derivative pipeline; Studio does not offer controls that would falsely imply those files exist. Current Gutenberg Image dimensions also use pixel values. |
| Embed | [Embed](https://wordpress.org/documentation/article/embed-block/) | URL placeholder; validated YouTube, Vimeo and TikTok players; rich caption; original-content link; retry; canvas URL/player title editing; shared margins and full Advanced settings. | Generic oEmbed, unsupported providers and provider-specific transforms remain unsupported. Cross-origin playback is controlled by the provider. |
| Button | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Label, link/new-tab target, title and rel attributes, Fill/Outline appearance, 25/50/75/100% width in Dimensions, text alignment and shared visual settings. Default, Hover, Focus and Active styles use the same Colour, Background, Typography, Dimensions (including width and margin) and Border controls. State styles are stored independently, reset independently and preview on the canvas by default. Advanced includes HTML anchor, additional CSS classes and safe Additional CSS. | Focus styling applies to both `:focus` and `:focus-visible` so keyboard focus receives the same configured treatment. Gutenberg's separate HTML element control is deferred because this model defines Button as a link and has no native button action contract. |
| Buttons | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Button-only container, justification, horizontal/vertical orientation, wrapping, separate gaps, shared styling and automatic wrapping of newly inserted Buttons. | Existing standalone Button records remain compatible. |

| Separator | [Separator](https://wordpress.org/documentation/article/separator-block/) | Default/Wide/Dots, `hr`/`div` element choice, background colour/gradient, margin and Advanced. | Theme-dependent alignment presets are not imported. Legacy text-colour values remain stored. |
| Spacer | [Spacer](https://wordpress.org/documentation/article/spacer-block/) | Height by default; Width when the immediate Group or Section parent uses Row; px/em/rem/vw/vh units, margin and advanced anchor/classes/safe Additional CSS. Existing inactive-axis values remain stored. The axis follows the parent Row setting when responsive styles stack it at narrow widths. | The pinned [Gutenberg Spacer implementation](https://github.com/WordPress/gutenberg/tree/v24.1.0-rc.1/packages/block-library/src/spacer) excludes %, although the documentation still lists it; percentage units are not a gap against the pinned source. When a horizontal Spacer has no saved width, Studio uses an ACM fallback of 100px. Flex-child fill controls and drag handles are not modelled. |
| Group | [Group](https://wordpress.org/documentation/article/group-block/) and [Grid](https://wordpress.org/documentation/article/grid-block/) | Group/Row/Stack/Grid variations; inherited or custom content and wide widths for Group/Stack; Row wrapping; justification/alignment; Auto/Manual grid count and minimum width in px/em/rem/vw; independent gap axes including flow; shared styles, root Sticky, Advanced and allowed blocks. | Legacy unrestricted Groups are labelled explicitly and retain their width until changed. Legacy Columns layout and responsive breakpoint remain stored without pane controls. Flex-child Fill/Fit/fixed sizing, Grid child spans/placement, descendant Heading/Button colours and locks remain unsupported. Manual Grid means an explicit column count, not manual child placement. |
| Columns and Column | [Columns](https://wordpress.org/documentation/article/columns-block/) | Count, mobile stacking, alignment, independent horizontal/vertical gaps, shared styles and Advanced. Each Column has percentage width, alignment, block gap and allowed-block management. Restrictions apply to insertion, duplication, paragraph splitting and multi-paragraph paste, preserving existing children. | Legacy layout presets, inner content width and tablet breakpoint have no pane control. Column width remains percentage-only; theme presets, child sizing, locks and background-image selection remain unsupported. Reducing count retains existing content. |
| Title | [Title](https://wordpress.org/documentation/article/title-block/) | H1–H6 or Paragraph, link/target/rel, text and block alignment, shared styles and managed background-image selection. | Text remains document metadata. Default H2 is preserved. Theme font presets remain unsupported. |
| Author | [Post Author](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/post-author) | Alignment, shared styling and the existing ACM prefix/initials-avatar controls. | Document settings own the author text. Remote avatars, author links, biography and newer Author sub-block composition remain unsupported. |
| Date | [Post Date](https://wordpress.org/documentation/article/post-date-block/) | Long/Short/ISO/Custom formatting, published or last-modified source, post link, alignment, styling and optional ACM clock icon. | Document metadata owns timestamps. Custom format accepts Y/y/m/n/F/M/d/j/l/D/H/G/h/g/i/s/a/A, backslash literals and up to 128 characters, using the browser timezone. Relative formatting is unsupported. New local publications preserve modification timestamps; legacy snapshots without one do not fabricate a modified date. |
| Social Icons | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | LinkedIn/TikTok children, styles, justification/orientation/wrap, size, labels, link target, colours and independent horizontal/vertical gaps. | The ACM palette does not reproduce theme gating. Other social networks remain unsupported. Saved social-child Advanced fields have no pane control and are labelled accordingly. |
| LinkedIn and TikTok | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | Profile URL, text label and link `rel` remain available in the unified inspector. Gutenberg edits the URL with its canvas LinkControl. They can be inserted as standalone Widgets or as children of Social Icons. | Gutenberg requires a Social Links parent; Studio also permits a standalone widget. Studio retains the ACM icon catalogue artwork and does not add other social platforms in this phase. Additional CSS metadata is hidden. |
| Document Subtitle, Reading Time | [Time to Read](https://wordpress.org/documentation/article/time-to-read-block/) for Reading Time; Subtitle is ACM-specific | Subtitle alignment and shared style controls; Reading Time alignment, time/word-count mode, range and ACM prefix/badge/plain presentation. | Reading time uses ACM counting: 220 words/minute by default, 200–250 for a range, rounded up with a one-minute minimum. Counts body text, captions, code, buttons, field labels/values and footnotes; excludes dynamic metadata, image alternative text and social-link labels. This is an adaptation, not the upstream numeric algorithm. |
| Content | [Content](https://wordpress.org/documentation/article/post-content-block/) | A real template-slot inspector exposes inherited/custom content and wide widths, block spacing, shared styling/background and Advanced. Library Edit and Preview use the production slot contract with an isolated temporary body. | Slot settings round-trip through template projection and packages; projection children never become the saved document body. Query Loop context is unsupported. |
| Section | Studio-specific semantic Group | Stack, Row, Columns and responsive Grid layout with maximum columns and minimum column width; shared visual settings and Group-style Advanced anchor, classes and safe Additional CSS. | Section role and source metadata are Studio-owned. Minimum width is hidden and retained as an ACM addition. |
| Featured Image | [Featured Image](https://wordpress.org/documentation/article/post-featured-image-block/) | Block alignment, post link/new-tab/rel, width, height, aspect ratio, Cover/Contain/Fill scale, padding, margin, border, radius and shadow. | Focal position and text alignment are hidden ACM additions. It displays document cover metadata. Gutenberg's size variants, first-post-image fallback, overlay and duotone remain unsupported. It is not the content-bearing Cover block. |
| Field | Studio-specific | Content controls. | No exact Gutenberg core counterpart. |
| Column, Component | Studio-specific nested/system types | Controls appear when their owning structure selects them; neither is offered as a top-level inserter item. | No exact Gutenberg core counterpart for Component; Column maps only inside Columns. |
| Footnotes | [Footnotes](https://wordpress.org/documentation/article/footnotes-block/) system block | Notes are edited on the canvas; typography, colours, background, dimensions, border and advanced fields use the shared inspector. Older saved shadow styles still render and can be cleared with Border Reset all. | Studio stores notes in one system-managed block rather than Gutenberg's inline-reference structure and does not offer it in the top-level inserter. |

### Individual Button editing

Button labels retain a matching plain projection and optional rich runs. The
individual Button toolbar owns its outer destination: Link opens its editor,
an active Unlink clears URL/target/rel, and Command/Ctrl+K opens editing from
the owning label, toolbar or frame. Shift+Command/Ctrl+K unlinks. Native form
editing keeps its shortcuts. The shared Link destination control supplies
preview, URL validation, internal suggestions, new-tab and nofollow options,
copy feedback and an isolated Controls specimen. Applying leaves the label,
title and appearance intact; stale drafts are rejected and unchanged settings
create no history entry. Studio deliberately dismisses the entire popup on
Escape, following Andrew's overlay direction; the pinned core Button can retain
its preview. Inline links and footnotes are unavailable inside an already linked
Button label. Enter, merging, arbitrary width units, persistence interaction and
200% zoom remain separate open verification rows.


## Library profiles and comparison evidence

The Studio UI Library now covers all 28 `ContentBlock` types and the separate
template Content slot. Each `/studio/ui/blocks/{type}` page uses its block's
capability profile, the production editing field, `BlockInspector` and Studio
`BlockRenderer`. The Paragraph route remains `/studio/ui/blocks/paragraph`.
Profiles record the upstream mapping, inspector section and option order,
control provenance, visible defaults, fields owned by Reset, control
dependencies, conditional availability, nesting and documented gaps. The
editor presents one block-settings panel; it uses Gutenberg controls for core
blocks and keeps essential content fields available for Studio-specific types.
Essential ACM controls and Subtitle styling are available in the unified pane.
Other model-only fields are labelled as having no inspector control. Theme-disabled
controls are separately labelled; neither is presented as an available setting.
The catalogue presents the profile inventory, not a generated rendering of
every specialised control.

The block definitions and inspector implementations were checked against the
immutable Gutenberg commit above, including each mapped block's declared
supports and inspector source. The current [WordPress Block Supports
reference](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/)
explains why availability can also depend on theme settings; it is background
guidance, not a substitute for pinned code. Source-derived ownership and
conditional controls are recorded in the profiles. Rendered Gutenberg pane
ordering, active-theme presets and interaction states still require Andrew's
captures or an accessible WordPress editor to verify.

List Items are recursively represented and have independent inspector settings;
the remaining List gaps are listed above. Table cells and caption support rich text; cell spanning remains unsupported.
Studio also lacks the managed media derivative pipeline needed for Image
resolution variants and crop/rotate/flip tools. Theme-dependent presets and
provider services are documented in the table above; the library does not
claim those capabilities are implemented.

Outer block alignment follows Gutenberg's saved `alignleft`, `aligncenter`,
`alignright`, `alignwide` and `alignfull` class conventions while remaining a typed Studio field. It is
separate from text alignment and from a container's inner content-width
setting. The toolbar keeps the recorded None, Wide width and Full width order;
Code offers only None and Wide width in the current Studio implementation.
Exact upstream order and ownership remain unverified where the pinned source
or Andrew's captures were unavailable.

The shared appearance controls are deliberately limited to the project's
font stack: Inter, Helvetica Neue, Helvetica and Arial. The Appearance menu
offers the standard weight range; fallback fonts may synthesise weights they do
not supply. Custom font sizes use px, em, rem, vw or vh and are stored separately from
the five Studio presets, with only one active size at a time. Existing document
records and template snapshots keep their previous appearance unless a block
setting is changed. A WordPress feature in the final column is a compatibility
gap, not an available control.

Typography options follow the order in Andrew's current WordPress editor.
Gutenberg's available controls can vary with the selected block, WordPress
version and active theme. For each block, compare with that editor's visible
controls and record other Gutenberg configurations here without adding a second
inspector tab. The inspector's options menus appear beside the pane at desktop
widths, and their Reset all footer remains visible while long option lists
scroll.

Dimensions and Border retain CSS shorthand strings in the current block style
contract. This preserves existing single-value drafts while allowing two-axis
spacing and four side or corner values. Group and Columns layout gap now stores
independent horizontal and vertical axes, with the previous scalar gap retained
as a fallback for existing drafts. The pane follows Gutenberg's grouped
controls and uses the shared catalogue slider accent and Studio focus colours. The Style Guide
palette provides the foreground and background colour swatches; Studio does
not expose arbitrary theme palette extensions. Minimum height and width are
stored in the shared style record and offered for mapped blocks that support
them in Gutenberg. Existing saved minimum-size and shadow values remain stored and rendered
on other blocks, but unsupported controls stay hidden and supported-field resets preserve them. The Border menu offers only the
controls supported by the mapped block.

The inspector follows the recorded section order and optional-control menu
pattern for Typography, Dimensions, Border and Elements. Core default controls
recorded for each mapped block remain visible and are omitted from that
section's optional-control menu; optional controls follow their recorded order.
Only controls classified for Gutenberg appear in these menus. ACM-only values
remain preserved but hidden, except essential content controls required to edit
Studio-specific blocks. A checked menu item shows its control. Removing it
clears that setting from the block; Reset all clears the section's visible
settings together. Foreground and background
swatches come from the executable Style Guide palette. Paragraph line indent
is stored on its Paragraph and applies to the immediately following Paragraph.
Text columns use CSS columns, and drop cap uses the first-letter treatment in
both editing and rendered output. Exact upstream order and ownership remain
unverified where the pinned source or Andrew's captures were unavailable.
Fit text measures a Paragraph or Heading at its available width after rendering, then
updates its size when the text, font or width changes. It fits short text on one
line and bounds the size between 13px and 120px; longer text wraps at the
minimum size instead of overflowing. It temporarily takes
precedence over text-column count. Enabling Fit text clears preset and custom font sizes in one update; choosing either size switches Fit text off. Text columns remain stored and reappear when Fit text is turned off. Vertical orientation temporarily
suspends the horizontal Fit text measurement while keeping its setting; returning
to horizontal orientation restores it.

### Background gradient contract

Background Colour and Gradient use stacked rows in the shared editor/library
control. The gradient popover follows Gutenberg's colour-stop bar, Linear/Radial
type selector, linear angle input and dial, and twelve circular default presets.
Stops use a hover/focus plus on the bar, committing a new point only when its
colour changes. A separate popup supplies saturation/brightness, hue, alpha and
Hex/RGB/HSL inputs; removal appears only above two points. Dragging moves whole
percentage steps without crossing neighbours; left/right arrows move ten points.
There is no separate Add stop, Position or Done control. Studio retains a visible
close button, Escape focus restoration and a two-to-twenty-point safety bound.
The picker is implemented in Studio-owned code using ACM icons.
Custom gradients store bounded, ordered percentage stops with hex colours rather
than arbitrary CSS. Legacy sunrise, ocean, forest and violet values keep their
original appearance. Workspace v14, publication v7 and template v0.14.0 readers
accept previous supported versions; older builds cannot read these new formats.

Reference: [Gutenberg gradient picker](https://github.com/WordPress/gutenberg/tree/trunk/packages/components/src/custom-gradient-picker)
and [default gradient palette](https://github.com/WordPress/gutenberg/blob/trunk/lib/theme.json),
inspected on 1 October 2026.

### Colour palette interaction

The shared colour picker uses a preview card showing the current colour, its ACM
palette role and actual `--acm-color-*` token when applicable. Theme swatches use
six columns, tooltips and a contrasting selected checkmark; clicking a selected
swatch clears it. Clear also removes the active colour. The preview opens the
Studio-owned saturation/brightness, hue and Hex/RGB/HSL surface. Solid colours
remain opaque six-digit hex values; gradient points retain alpha support. Link
Default and Hover remain independent and preserve their contrast warnings.
Each popup has a visible close control and Escape restores its opener.

Reference: [Gutenberg colour palette](https://github.com/WordPress/gutenberg/blob/trunk/packages/components/src/color-palette/index.tsx), inspected on 1 October 2026.

## Six text-block pane audit — 2 October 2026

This bounded audit uses the unversioned shared Style Guide at
`/Users/andrewmoss/Documents/Codex/_Projects/workspace-governance/STYLE_GUIDE.md`,
last-file commit `38fc70055f73d4dde2e4b376279f06caf3e2e54a` (1 October 2026),
and the unversioned project instructions as read on 2 October 2026.
The immutable behaviour baseline is Gutenberg v24.1.0-rc.1,
[`e3ac73cd69d472341b66c43cb77be36e838f868e`](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e).
The relevant `block.json` and `edit.jsx` sources are under
[`packages/block-library/src`](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src),
with shared option/reset semantics in
[`global-styles/typography-panel.js`](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-editor/src/components/global-styles/typography-panel.js).
Andrew's live WordPress Paragraph capture supplies the current theme configuration;
source support alone does not make a theme-gated control visible.

All six panes now reuse the bordered Colour row, stacked Background rows,
segmented linked/split spacing control with custom units, compact grouped Border
control, optional-controls menu and section reset. Typography precedes Background,
Dimensions, Border and Elements. Colour and Size are mandatory default controls;
without explicit values their menu entries are checked and disabled. Customisation
makes their individual Reset actions and section Reset all available. Optional
controls appear for saved values or explicit reveal; hiding clears their owned
values. Reset all keeps mandatory controls, hides optional controls and clears only
supported, enabled fields in that section. Retained ACM-only and theme-disabled
values survive these resets. Revealing an optional control also permits resetting
its visibility, even before a value has been entered.

| Block | Audited supported pane contract | Intentional adaptations and remaining gaps |
| --- | --- | --- |
| Paragraph | Colour/Size; optional Appearance, Line height, Letter spacing, Line indent, Columns, Decoration, Letter case, Drop cap and Fit text; Colour/Gradient background; optional Padding/Margin, Border/Radius and Link Default/Hover; Advanced anchor/classes/safe declarations. | Current theme hides Font, Orientation and Text shadow. Drop cap is disabled for aligned text. Line indent follows the adjacent-paragraph rule. Safe declarations exclude selectors and executable/external CSS. |
| Heading | H1–H6 summary buttons and selected-level header; common typography plus Fit text; Colour/Gradient background with existing image controls retained; optional Padding/Margin and Border/Radius/Shadow; Link Default/Hover and Advanced. | Level is changed in the summary or toolbar; text alignment remains in the toolbar. Font, Orientation and Text shadow follow the captured theme configuration. Studio owns bounded fit measurement rather than WordPress metrics. |
| List | Common typography; Colour/Gradient background; optional Padding/Margin, Border/Radius and Link Default/Hover; Advanced. Ordered lists additionally expose marker style, signed Start value and Reverse order through the shared Settings tools panel. | List type remains in the pane. Start accepts integers from −100000 to 100000; blank removes the explicit start and reverse-off removes the explicit flag. Existing recursive List editing is retained. No image background, shadow or minimum height controls are added. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Editable inner Paragraph, Heading, List, Quote and Image blocks; rich citation; Default/Plain style; shared typography, dimensions, background, border and Advanced settings. | Heading Elements and a configurable allowed-block policy remain unsupported. Citation supports guarded inline-image insertion and editing; footnote insertion is unavailable. |
| Table | Settings/Styles icon tabs. Settings contains Fixed width cells, Header/Footer when created, and full Advanced fields. Styles contains plain Default/Stripes buttons, common typography, Colour/Gradient background, optional Padding/Margin and default Border. New tables use Column count and Row count (2 each) followed by Create Table. | Header/footer move existing first/last rows without discarding cell content; local history supports undo. Caption remains canvas content outside the styled table. Spacing applies to the figure; typography, colour, border and safe text declarations apply to the table. No radius, shadow, image or Link controls. Cell spanning and direct inspector tag/scope editing remain unsupported. |
| Code | Full common typography; Image/Colour/Gradient background; optional Padding and independently linked/split Top/Bottom Margin; default Border, optional Radius/Shadow and Advanced. | None/Wide outer alignment only. Existing horizontal margin values remain retained when Top/Bottom are edited. Language highlighting is an ACM capability hidden from the Block pane. No Link, minimum dimensions or Fit text. |
| Selected List Item | Shared item-owned typography, background, dimensions, border/radius and Link Default/Hover; Advanced anchor/classes/safe declarations. | Text colour and CSS fields are ACM extensions. Item updates preserve sibling items, nested lists and parent List styling. |

The shared native `ToggleSetting` owns drop cap, Fit text, table section/layout,
reverse-order and image-repeat switches. `StyleVariationSetting` owns the two
Quote preview choices and Table label buttons; their commands preserve content and other styles.
Both have working Controls-library specimens. Image configuration appears below
the contiguous Image/Colour/Gradient rows, not between them. Heading, Quote and Code
use the existing owner-gated media chooser; catalogue examples use temporary local
SVG media independent of product stores. Background Reset all also clears image
size, repetition and focal-position fields while retaining foreground/link colours.
Unlinking default spacing changes control state only; an empty custom measurement
clears the value while explicit zero remains valid.

This is a six-block pane comparison within Studio's model, not a claim of complete
WordPress import compatibility, theme preset parity or nested Quote parity.

Ordered List and Table Settings reuse the same tools-panel owner as style sections.
Their controls are shown by default; unlike optional style controls they cannot be
hidden independently. Unchanged controls have checked, disabled menu entries;
customised controls offer Reset followed by their label. Reset all restores the
settings defaults in one update. List numbering resets preserve ordered type,
items, nesting and presentation. Table section switches add an empty header or
footer row independently of body rows. Disabling a section or resetting its setting removes that section,
matching Gutenberg; Undo restores removed content. Surviving body text, rich
runs, cell metadata and saved sizing stay attached to their rows. Fixed-width
cells use fixed layout; disabling it lets column widths follow their content.
Edit and Preview use the same section and layout rules. Studio retains its
portable flat row array and section flags; existing saved tables need no migration.

### Verification evidence and limits

On 2 October 2026 the isolated, memory-only library specimens for Paragraph,
Heading, List, Quote, Table and Code were checked in Edit and Preview. The browser
checks covered typography/reset and Fit text transitions, supported background
images and their conditional options, list numbering/reversal, split spacing,
style choices, table styling/caption ownership and Settings reset followed by
Undo. At that point, Table Settings reset retained all three rows and cell
content; this section-reset behaviour was superseded on 3 October 2026. New Toggle and Style
variation Controls specimens were rendered, with compact Border and independent
Code Top/Bottom spacing available through the same production components.

Desktop (1152px), tablet (768px) and mobile (390px) catalogue pane/popup and keyboard
states were checked. At narrow widths the popup remains constrained to the
viewport when space on the pane's left is unavailable, following the documented
pane positioning rule. Actual browser zoom at 200% remains unverified with the
available DOM-only browser controls. The live WordPress comparison covered
Paragraph before the reference Mac session locked; other blocks' source-derived
capabilities are based on the pinned implementation, not a claim of live visual
comparison against every Gutenberg pane.

Focused model/control checks and the complete block-preview suite cover default
reset eligibility, preservation of hidden values, Fit text/size exclusivity,
Settings content preservation, signed list validation and semantic HTML
round-trips, table presentation/naming and managed Heading/Code backgrounds.
Production build and no-write typecheck are required separately. These checks do
not establish WordPress import compatibility, public deployment or parity with
other theme configurations.

### Heading pane reference

The supplied Gutenberg capture is the visual baseline for Heading: a selected-level
mark and title, the full description, H1–H6 buttons, then Typography, Background,
Dimensions, Border, Elements and Advanced. The level selector is the registered
Heading level control at `/studio/ui/controls/heading-level`. Its buttons update
only the existing `level` attribute and never open the Block Library. Font-size
presets reuse the shared rectangular, undivided control. Alignment stays in the
canvas toolbar instead of adding a separate Text accordion.

The upstream [Heading definition](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/heading/block.json)
was checked on 2 October 2026. Current trunk supports image backgrounds; the
supplied theme capture does not show that default. Studio follows the capture
for new Headings while retaining the rendering, editing and reset of saved image
backgrounds. This is a theme-specific presentation choice, not an upstream
capability claim.

### Structural editing and embeds — priority 2

Quote now contains editable Paragraph, Heading, List, Quote or Image blocks and a
rich citation. Legacy single-text Quotes remain readable and materialise inner
content on editing. Citation supports formatting, links and guarded inline-image insertion and
editing; footnote insertion is unavailable for citations. Transforms retain inline runs
for text-only Quotes and are unavailable when a Quote contains non-text content.

Buttons is a Button-only parent with justification, orientation, wrapping and
horizontal/vertical gaps. New standalone Button insertions create a Buttons
parent; existing standalone Button records continue to render. Both types have
catalogue specimens and share the existing ACM button symbol.
Their Edit/Preview presentation now shares group typography fallbacks and
gap-adjusted percentage widths, including child interaction-state widths.
The content Outline variation uses a transparent fill and current-colour border
by default. The Library can apply the real template styles temporarily to both
modes. Direct rich label editing, own-link toolbar and sibling insertion parity
remain unverified; see the dated progress record.

Heading Enter splits the heading; Enter at its end creates a Paragraph. Backspace
at the start merges adjacent text blocks; at the start of the first Heading it
converts to a Paragraph or removes an empty Heading when another block follows.
List Enter splits an item, Enter on an empty item exits or outdents, and Backspace
/Delete at adjacent item boundaries merges text/runs and nested lists. Splitting
an ordered list preserves its numbering, including reversed numbering.

List Item outdent carries the following items beneath the moved item to preserve
reading order, following the pinned Gutenberg List Item operation. ACM can own
multiple child Lists: later parent child Lists also follow the moved item, and
existing child wrappers remain distinct to preserve their markers and metadata.
Split tails receive document-unique IDs without duplicating wrapper anchors or
notes. Moves that require an ordered start outside the stored content range are
unavailable. Return checks the original item rather than its selected split
fragments: selected nonempty text splits normally, while an empty nested item
outdents with its children. Root empty Return creates a Paragraph and promotes
intact child List wrappers before the source suffix; this preserves ACM's
multiple marker/style/metadata owners instead of flattening Gutenberg's one
child List. Virtual empty Lists also exit. The source owner remains on the
prefix, otherwise suffix, otherwise the converted Paragraph, with supported
alignment and site role retained. Conflicting sole-owner anchors refuse exit.
Legacy Footnote/Image/Math marks count as content. The complete proposal must
satisfy reader, parent, lock and reference contracts before focus can follow it.
Rich-text Shift+Enter now inserts one authored soft break, preserves repeated
breaks through typing and refocus, and distinguishes terminal editor filler from
saved content. Parsing, rendering and caret offsets share that contract across
rich-text hosts. Modern Paragraph runs do not split at blank lines on refocus;
legacy plain text retains its existing paragraph projection. The Library's
typed rich text uses its temporary document history for standard Undo/Redo;
ordinary form fields and independent overlay editors retain native text history.
Nested Backspace and forward Delete now merge adjacent lines in reading order:
parent/first-child and trailing-descendant/next-ancestor-sibling boundaries share
one operation. ACM's multiple child wrappers remain intact, preserving their
markers, appearance and ownership. Removing a protected wrapper, conflicting
item anchors or zero-text legacy inline objects refuses the merge. Structural
updates require an unchanged source through nested containers and the Library,
and focus follows only accepted updates. Root/document boundary commands still
require correction. Native
terminal-BR paste, IME, saved-document replay/export and the wider input/context
matrix remain unverified; these bounded checks do not close the whole List row.

Embed constructs iframe players only for recognised HTTPS YouTube, Vimeo and
TikTok video URLs. The same renderer is used in Edit, Preview and local published
content. Vimeo unlisted hashes are retained. Other URLs have an explicit
unavailable message and an original-content link. Retry remounts the player; a
loaded iframe does not prove media playback. This is a bounded provider subset,
not generic WordPress oEmbed parity. No remote HTML, provider scripts or server
fetching is introduced. Provider sources: [YouTube player parameters](https://developers.google.com/youtube/player_parameters),
[Vimeo player SDK](https://github.com/vimeo/player.js/) and
[TikTok embedded player](https://developers.tiktok.com/doc/embed-player/).

These additive records use workspace version 18, publication version 11 and
template v0.19.0, retaining readers for prior versions.

## Controls and catalogue completion — 2 October 2026

This bounded follow-up implements audit priorities 3 and 4. It adds the controls
listed above and corrects ownership, availability and reusable-control dependencies.
The earlier pinned-source audit remains the comparison baseline. Fresh pinned GitHub
fetches were unavailable in this follow-up; current WordPress Date, Content, Group
and Time to Read documentation supplied supplementary evidence. No complete parity
claim is made for the unsupported features above.

New layout and dynamic presentation attributes are optional. Workspace schema v19
reads v2–v18; local publication schema v12 reads v1–v11; template schema v0.20.0
reads v0.1.0–v0.19.0. Existing unrestricted Group layouts and 220 wpm estimates
remain compatible. All catalogue edits remain temporary component state.

### Table simplification — 3 October 2026

The Table inspector separates Settings and Styles, following the supplied
Gutenberg reference and current upstream `table/edit.jsx` and `block.json`.
New Table insertion stores an uncreated `rows: []` placeholder. Its counts
are temporary component state; Create Table commits one grid change and focuses
the first cell. Counts are whole numbers from 1 to 100; a blank field uses 2.
Preview omits an uncreated Table; the editable HTML representation retains an
empty table so it can round-trip as a placeholder. Existing populated tables
remain unchanged.

Row/column drag resizing, keyboard resizing and double-click fitting have been
removed. Existing explicit sizing remains readable in Edit and Preview; new
tables use content-fitting row heights and fixed equal-width or adaptive columns.
Column alignment, the six row/column actions, rich cells and caption remain.
Settings contains full HTML anchor, classes and safe Additional CSS; Styles
retains upstream-supported text, colour, spacing and border features.

The inspector tabs use shared Settings and Styles icons with linked catalogue
usage records. The Styles symbol is original ACM artwork, not an upstream path.


On 3 October 2026, Table section toggles and Reset were checked in the isolated
library specimen. Header and footer rows were inserted separately, removal left
body rows intact, and Undo restored removed content. Fixed and adaptive layouts
were verified in Edit and Preview, with keyboard toggle input and 768px/390px
viewports. Section-only legacy tables are covered by validation regression checks.
The live canvas also cleared stale cell selections after inserting a header or
removing a selected footer; formatting then left surviving cells unchanged. All
temporary live-document changes were undone. The production build, type check
and focused table tests passed. One broader preview test has
an existing stale assertion that omits the explicit-row-height CSS class.

## Overnight parity follow-up — 4 October 2026

The current full-scope control inventory, corrections, verification evidence and
remaining work are tracked in [Editor Gutenberg parity progress](editor-parity-progress.md).
That record distinguishes source comparison from rendered verification and does
not supersede the intentional product boundaries documented here.
