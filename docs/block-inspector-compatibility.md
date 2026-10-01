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
code. The rendered Paragraph library
specimen was checked locally on 30 September: it shows one settings panel, the
Gutenberg HTML anchor and CSS class fields, and no nested Block/Studio tabs.
Other block-specific interactions, theme-dependent ordering and popover
behaviour remain unverified in this pass.
The 1 October implementation checks used source, rendered-markup unit tests
and the browser accessibility tree. The browser did not provide a reliable
visual capture, so cross-section desktop/tablet/mobile appearance, keyboard
interactions and 200% zoom remain to be visually verified.
Paragraph Background colour/gradient and the HTML anchor remain available in
the single Block inspector. The nested Studio tab has been removed. The
capability profile continues to record whether a setting comes from Gutenberg
or ACM, but ACM-only style options are hidden from the inspector for now.
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

The audit moved Quote attribution and text alignment, List type, Table caption,
Document Title level, Post Author and Post Date alignment, LinkedIn and TikTok
profile URLs, and Columns/Column vertical alignment into the unified Block
inspector because these are available in Gutenberg's block interface.
This is a capability comparison, not a claim of identical placement. Gutenberg
puts List type, Quote text alignment, Document Title level, Post Author/Post
Date alignment and Columns/Column vertical alignment in canvas BlockControls;
Studio intentionally consolidates those Gutenberg-owned settings in its one
block settings panel. Quote attribution and Table caption are canvas content
fields in Gutenberg; Studio keeps their typed content editable in that same
panel. Their ownership and saved values match, while placement is intentionally
consolidated.
ACM-only choices such as Separator text colour, Cover Image focal positioning,
Code language, responsive stacking breakpoints, separate social-icon axis gaps,
Quote managed background images, Quote minimum height, Group/Section minimum width,
and the Separator `hr`/`div` selector are no longer exposed there. Studio-only
fields required to edit custom block content, including Field data, Component
data, Section role and the safe Embed card title, remain available in that same
panel. Reading Time and Document Subtitle retain their current saved values and
rendering, while their ACM-only inspector options are hidden.

Advanced block settings follow each corresponding core block's declared
supports. Studio exposes HTML anchor and additional class controls only where
the mapped block supports them. Group also exposes its semantic HTML element
and ARIA label. The shared Advanced inspector currently exposes the selector-
free Additional CSS field for Paragraph, Heading, Quote, List, Table, Code,
Image, Embed, Button, Separator, Spacer, Group, Section, Columns, Column,
Footnotes and Social Icons, plus Document Title, Cover Image, Post Date and
Post Author. Individual LinkedIn and TikTok children expose their own anchor
and additional class fields, without Additional CSS. The ACM Section follows
Group-style Advanced fields while keeping its role metadata Studio-owned.
The field's selector-free declarations use typed
presentation settings and the supported safe subset is applied to the block's
rendered element; selectors, at-rules, external URLs, CSS escapes and
`!important` are not applied. Gutenberg restricts this field to users with the
`edit_css` capability; Studio has no user-role capability model.
This shared Advanced coverage follows `advancedBlockTypes` in
`app/studio/blocks/capability-profiles.ts`. The Studio-specific Section maps
its Advanced appearance to the corresponding Group-style settings.
Allowed-block selection remains unavailable until it can constrain every
nested insertion path without discarding existing content.

| Studio block | WordPress reference | Studio inspector support | Remaining difference |
| --- | --- | --- | --- |
| Paragraph | [Paragraph](https://wordpress.org/documentation/article/paragraph-block/) | Text alignment; None, Wide and Full block-width alignment; optional Typography, Dimensions, Border and Elements controls with per-section Reset all; preset and custom font sizes in px/em/rem/vw/vh, nine Appearance weights with italic variants, linked axes or separate sides for padding and margin, Gutenberg-shaped Border and Radius controls, background, link Default and Hover colours with low-contrast indicators, line indent, text columns, drop cap, fit text, text shadow and the Advanced HTML anchor, additional CSS classes and Additional CSS declarations. | Match the Paragraph inspector in Andrew's current WordPress editor: Typography's hidden-options menu starts with checked, disabled Colour and Size when no explicit font size is set; when a size is set, Size is replaced by the enabled Reset Size action. Optional controls follow in this order: Appearance, Line height, Letter spacing, Line indent, Columns, Decoration, Letter case, Drop cap, Fit text and Text shadow. Dimensions offers Padding then Margin; Border offers Border then Radius. The Border control groups width, colour and style, while existing typed values remain intact when a control is hidden. Link Default and Hover colours are independent. A warning appears below the palette and on the Link row below a 4.5:1 contrast ratio. Contrast is checked against an explicit opaque block background, sampled opaque block gradient, or the Studio surface; image and unsupported/translucent colours are not assessed. Font family and Orientation are Gutenberg capabilities gated by theme/editor typography settings and remain disabled because they are absent from Andrew's current reference. Minimum height, Minimum width and block Shadow are ACM additions and are hidden. Existing values remain stored and rendered. Paragraph Additional CSS uses Gutenberg's description but applies safe declarations only; selectors, at-rules, external URLs, CSS escapes and `!important` are not applied. Gutenberg restricts the field to users with the `edit_css` capability; Studio currently has no role-based capability model. Other Gutenberg configurations can declare additional typography capabilities (some experimental or settings-gated); the profile records source ownership without creating another inspector tab. Line indent follows Gutenberg's adjacent-paragraph behaviour. Drop cap is available independently of theme capability, but is suppressed for aligned paragraphs following Gutenberg's alignment rule. Theme-defined font/colour presets and registered style variations are not imported. |
| Heading | [Heading](https://wordpress.org/documentation/article/heading-block/) | Level, text alignment, None/Wide/Full block-width alignment, Fit text, orientation, text shadow and shared visual settings. | Theme presets and fit-to-container measurement remain unsupported. Gutenberg toolbar availability varies with selection and theme capabilities; this inventory focuses on the inspector pane. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Default or Plain style, attribution and text alignment, None/Left/Right/Wide/Full block alignment and shared visual settings. | Multi-paragraph quote editing is not modelled. Centre is intentionally absent because the upstream Quote block does not declare it. Quote minimum height and managed background image are retained in saved data and rendering but hidden as ACM-only inspector options. |
| List and List Item | [List](https://wordpress.org/documentation/article/list-block/) and [List Item](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/list-item) | List type, ordered numbering style, start value, reverse order, None/Wide/Full block-width alignment, recursive nested items with Tab/Shift+Tab indentation, independently selected List Items with anchor, background colour, gradient, link colour, font size, line height, margin and padding controls, item-scoped inline formatting and links, and shared visual settings on the List. Existing plain-string items remain readable. The List Item contract does not declare text-colour support. Gutenberg's block-level indent/outdent toolbar controls, and footnote or inline-image insertion from List Item formatting, remain absent. |
| Table | [Table](https://wordpress.org/documentation/article/table-block/) | None/Left/Centre/Right/Wide/Full block alignment, per-column Left/Centre/Right content alignment, fixed or adaptive cell widths, header/footer, caption, Default or Stripes style, padding, border and typography. | Caption text is plain text rather than Gutenberg's rich-text canvas field. Cells remain plain text; WordPress cell-level rich text, links, tag/scope and spanning attributes are not yet supported. |
| Code | [Code](https://wordpress.org/documentation/article/code-block/) | None/Wide block-width alignment, shared visual settings and shadow. | Language selection and syntax highlighting are hidden ACM additions. Gutenberg's Code block does not offer Full width or minimum dimensions. |
| Image | [Image](https://wordpress.org/documentation/article/image-block/) | None/Left/Centre/Right/Wide/Full block alignment; source, alternative text or decorative state, caption, custom/image-file/lightbox link destination, display width and height, aspect ratio, cover/contain scale, focal position, Default/Rounded style, margin, border, shadow and Advanced anchor/classes/safe Additional CSS. Legacy Wide display records migrate to the shared alignment contract. | Resolution variants, media-editor crop/rotate/flip and duotone filters need a managed derivative pipeline; Studio does not offer controls that would falsely imply those files exist. Current Gutenberg Image dimensions also use pixel values. |
| Embed | [Embed](https://wordpress.org/documentation/article/embed-block/) | None/Left/Centre/Right/Wide/Full block alignment, URL, plain-text caption, margin and advanced anchor/classes. | Studio renders a safe resource card and retains an essential editable card title in the unified inspector; Gutenberg's rich-text caption, provider content, responsive embed and provider-specific transforms remain unsupported. |
| Button | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Label, link/new-tab target, title and rel attributes, Fill/Outline appearance, 25/50/75/100% width in Dimensions, text alignment and shared visual settings. Default, Hover, Focus and Active styles use the same Colour, Background, Typography, Dimensions (including width and margin) and Border controls. State styles are stored independently, reset independently and preview on the canvas by default. Advanced includes HTML anchor, additional CSS classes and safe Additional CSS. | Studio has one Button block, not a nested Buttons container. Focus styling applies to both `:focus` and `:focus-visible` so keyboard focus receives the same configured treatment. Gutenberg's separate HTML element control is deferred because this model defines Button as a link and has no native button action contract. |
| Separator | [Separator](https://wordpress.org/documentation/article/separator-block/) | Default, wide and dots styles; Gutenberg-style background colour and gradient applied to the rule; margin and advanced fields. | The ACM `hr`/`div` selector and legacy text-colour values remain stored and rendered but are hidden. Theme-dependent alignment presets are not imported. |
| Spacer | [Spacer](https://wordpress.org/documentation/article/spacer-block/) | Height by default; Width when the immediate Group or Section parent uses Row; px/em/rem/vw/vh units, margin and advanced anchor/classes/safe Additional CSS. Existing inactive-axis values remain stored. The axis follows the parent Row setting when responsive styles stack it at narrow widths. | The pinned [Gutenberg Spacer implementation](https://github.com/WordPress/gutenberg/tree/v24.1.0-rc.1/packages/block-library/src/spacer) excludes %, although the documentation still lists it; percentage units are not a gap against the pinned source. When a horizontal Spacer has no saved width, Studio uses an ACM fallback of 100px. Flex-child fill controls and drag handles are not modelled. |
| Group | [Group](https://wordpress.org/documentation/article/group-block/) | None/Wide/Full outer block-width alignment; stack/row/columns and responsive grid layouts, grid maximum columns and minimum column width in pixels, root-level sticky positioning, alignment, independent horizontal and vertical gaps, padding, minimum height, managed background images with cover/contain/fixed size, repeat and focal position, semantic HTML element, ARIA label, HTML anchor, additional CSS classes, safe Additional CSS and shared visual settings. | ACM minimum width and the responsive stacking breakpoint are hidden and retained in saved data and rendering. Allowed-block and template-lock controls are not yet modelled. Gutenberg also permits CSS units for the grid minimum column width; Studio currently stores pixels. |
| Columns and Column | [Columns](https://wordpress.org/documentation/article/columns-block/) | Columns exposes count, the default-on mobile stacking toggle and vertical alignment; each Column exposes width, vertical alignment and block gap. Both expose shared Advanced anchor, classes and safe Additional CSS. | ACM layout presets, inner content width and the tablet stacking breakpoint are hidden. WordPress's theme-specific width and style presets, allowed-block and template-lock controls are not imported. Column width currently accepts percentages only. Columns and each nested Column retain separate settings. |
| Document Title | [Title](https://wordpress.org/documentation/article/title-block/) | Heading level, post link, new-tab target and rel, text alignment, None/Wide/Full block-width alignment and shared visual settings. | Title content is owned by document metadata. Gutenberg defaults this block to H2, which Studio follows; its core Title block declares no minimum dimensions or text shadow. |
| Post Author | Studio composite based on the deprecated [Post Author block](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/post-author) | Alignment and shared visual settings remain available in the unified inspector. | Current Gutenberg composes separate Avatar, Author Name and Author Biography blocks. Studio keeps this insertable convenience block because author identity is owned by document metadata; initials replace a profile image. Prefix and initials-avatar controls are hidden ACM additions. |
| Post Date | [Post Date](https://wordpress.org/documentation/article/post-date-block/) | Date format, post link, alignment and shared visual settings. | Source date is owned by document metadata. The optional clock icon has no Gutenberg counterpart and is hidden. |
| Social Icons | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | LinkedIn and TikTok children; Default, Logos Only and Pill Shape styles; block alignment, justification, orientation, wrapping, Small/Normal/Large/Huge icon sizes, one Gutenberg-style Gap value, text labels and new-tab links; foreground/background colours, dimensions, border and Advanced settings. Gutenberg's colour controls require theme colour or gradient support and no selected style variation; Icon background is omitted in Logos Only mode. | Studio's local palette is always available for the supported specimen, without theme-support gating. The catalogue intentionally contains only LinkedIn and TikTok; separate horizontal/vertical gaps are hidden ACM additions. |
| LinkedIn and TikTok | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | Profile URL, text label and link `rel` remain available in the unified inspector. Gutenberg edits the URL with its canvas LinkControl. They can be inserted as standalone Widgets or as children of Social Icons. | Gutenberg requires a Social Links parent; Studio also permits a standalone widget. Studio retains the ACM icon catalogue artwork and does not add other social platforms in this phase. Additional CSS metadata is hidden. |
| Document Subtitle, Reading Time | Studio-specific | Document Subtitle content is edited on the canvas; Reading Time is generated from document content. | ACM-only alignment, prefix and presentation options are hidden. Existing values remain stored and continue to render. |
| Section | Studio-specific semantic Group | Stack, Row, Columns and responsive Grid layout with maximum columns and minimum column width; shared visual settings and Group-style Advanced anchor, classes and safe Additional CSS. | Section role and source metadata are Studio-owned. Minimum width is hidden and retained as an ACM addition. |
| Cover Image | [Featured Image](https://wordpress.org/documentation/article/post-featured-image-block/) | Block alignment, post link/new-tab/rel, width, height, aspect ratio, Cover/Contain/Fill scale, padding, margin, border, radius and shadow. | Focal position and text alignment are hidden ACM additions. It displays document cover metadata. Gutenberg's size variants, first-post-image fallback, overlay and duotone remain unsupported. It is not the content-bearing Cover block. |
| Field | Studio-specific | Content controls. | No exact Gutenberg core counterpart. |
| Column, Component | Studio-specific nested/system types | Controls appear when their owning structure selects them; neither is offered as a top-level inserter item. | No exact Gutenberg core counterpart for Component; Column maps only inside Columns. |
| Footnotes | [Footnotes](https://wordpress.org/documentation/article/footnotes-block/) system block | Notes are edited on the canvas; typography, colours, background, dimensions, border and advanced fields use the shared inspector. Older saved shadow styles still render and can be cleared with Border Reset all. | Studio stores notes in one system-managed block rather than Gutenberg's inline-reference structure and does not offer it in the top-level inserter. |

## Library profiles and comparison evidence

The Studio UI Library now covers all 27 `ContentBlock` types and the separate
template Content slot. Each `/studio/ui/blocks/{type}` page uses its block's
capability profile, the production editing field, `BlockInspector` and Studio
`BlockRenderer`. The Paragraph route remains `/studio/ui/blocks/paragraph`.
Profiles record the upstream mapping, inspector section and option order,
control provenance, visible defaults, fields owned by Reset, control
dependencies, conditional availability, nesting and documented gaps. The
editor presents one block-settings panel; it uses Gutenberg controls for core
blocks and keeps essential content fields available for Studio-specific types.
ACM-only style values are not exposed while the Gutenberg-focused inspector is
being established. Existing saved values remain intact and continue to render.
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
the remaining List gaps are listed above. Rich-text table cells remain an
unsupported typed-model capability.
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
controls and uses Studio's neutral slider and focus colours. The Style Guide
palette provides the foreground and background colour swatches; Studio does
not expose arbitrary theme palette extensions. Minimum height and width are
stored in the shared style record and offered for mapped blocks that support
them in Gutenberg. Existing saved minimum-size and shadow values remain visible
on other blocks so Reset all can clear them. The Border menu offers only the
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
precedence over a chosen font size and text-column count; those settings remain
stored and reappear when Fit text is turned off. Vertical orientation temporarily
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
