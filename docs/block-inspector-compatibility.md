# Block inspector compatibility

ACM Studio uses Gutenberg as its reference for block settings. The comparison
below covers every Studio block type available in the editor on 29 September
2026. WordPress controls vary with its theme, registered block supports and
media services. Studio stores portable typed blocks and provides local previews;
these settings do not turn its data into WordPress block markup.

## Compatibility approach

Inspect [Gutenberg's block source](https://github.com/WordPress/gutenberg/tree/trunk/packages/block-library/src),
documentation and tests to understand each block's content structure, saved
attributes, controls and rendering behaviour. Preserve the meaning and editable
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

For the Block Library and shared-controls pilot, the pinned upstream source
comparison is [Gutenberg v24.1.0-rc.1](https://github.com/WordPress/gutenberg/tree/v24.1.0-rc.1),
captured on 29 September 2026. This source tag is the repeatable code reference
for control ownership and colour-indicator geometry; Andrew's supplied editor
captures remain the direct visual acceptance references for those states.
Paragraph Background colour/gradient and Advanced anchor, class and Additional
CSS controls remain in Block, matching the current reference. ACM-only Paragraph
options — Font family, Orientation, Text shadow, Minimum height, Minimum width
and Shadow — stay in Studio. Managed background-image controls are not exposed
for Paragraph in this pilot.

When a selected block has ACM-only settings, its inspector shows scoped Block
and Studio tabs. Gutenberg-aligned controls stay under Block. Field and
Component open on Studio because their controls are entirely ACM-specific.
Section role/source, Reading Time, Post Author, Post Date, Code language,
Embed card title, and selected container and social-icon controls live under
Studio. Document Title, Document Subtitle and Cover Image controls stay under
Block. The existing document and pane tabs keep their current ownership and
behaviour.

Advanced block settings follow each corresponding core block's declared
supports. Studio exposes HTML anchor and additional class controls only where
the mapped block supports them. Group also exposes its semantic HTML element
and ARIA label. Individual LinkedIn and TikTok icons keep their own anchor and
additional class settings.
Paragraph supports selector-free Additional CSS declarations scoped to that
block and stored with its typed presentation settings. Arbitrary per-instance
CSS remains unavailable because Studio has no CSS author capability model or
scoped-CSS rendering contract. Allowed-block selection remains unavailable
until it can constrain every nested insertion path without discarding existing
content.

| Studio block | WordPress reference | Studio inspector support | Remaining difference |
| --- | --- | --- | --- |
| Paragraph | [Paragraph](https://wordpress.org/documentation/article/paragraph-block/) | Text alignment; None, Wide and Full block-width alignment; optional Typography, Dimensions, Border and Elements controls with per-section Reset all; preset and custom font sizes in px/em/rem/vw/vh, nine Appearance weights with italic variants, linked axes or separate sides for padding and margin, Gutenberg-shaped Border and Radius controls, background, link Default and Hover colours with low-contrast indicators, line indent, text columns, drop cap, fit text and Advanced HTML anchor, Additional CSS class(es), and Additional CSS. | Match the Paragraph inspector in Andrew's current WordPress editor: Typography's hidden-options menu starts with checked, disabled Colour and Size when no explicit font size is set; when a size is set, Size is replaced by the enabled Reset Size action. Optional controls follow in this order: Appearance, Line height, Letter spacing, Line indent, Columns, Decoration, Letter case, Drop cap and Fit text. Dimensions offers Padding then Margin; Border offers Border then Radius. The Border control groups width, colour and style, while Studio retains their existing typed values. Link Default and Hover colours are independent. A warning appears below the palette and on the Link row below a 4.5:1 contrast ratio. Contrast is checked against an explicit opaque block background, sampled opaque block gradient, or the Studio surface; image and unsupported/translucent colours are not assessed. Font family, Orientation and Text shadow are absent from the Block tab in Andrew's current reference; Minimum height, Minimum width and block Shadow are also ACM-only Paragraph controls. These live in the separate Studio tab with source badges. Gutenberg trunk declares some typography capabilities in other configurations (some experimental or settings-gated); Studio's badge means “not shown in Andrew's current reference”, not “never supported by Gutenberg”. Line indent follows Gutenberg's adjacent-paragraph behaviour. Studio keeps drop cap available independently of theme capability, but suppresses it for aligned paragraphs following Gutenberg's alignment rule. Additional CSS stores declaration text and applies safe, selector-free declarations to that block. Selectors, at-rules, external URLs, CSS escapes and `!important` are not applied. Theme-defined font/colour presets and registered style variations are not imported. |
| Heading | [Heading](https://wordpress.org/documentation/article/heading-block/) | Level, text alignment, None/Wide/Full block-width alignment, Fit text, orientation, text shadow and shared visual settings. | Theme presets and some toolbar details remain unsupported. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Attribution, text alignment, None/Left/Right/Wide/Full block alignment, Default or Plain style, minimum height and shared visual settings, including managed background images with cover/contain/fixed size, repeat and focal position. | Multi-paragraph quote editing is not modelled. Centre is intentionally absent because the upstream Quote block does not declare it. |
| List | [List](https://wordpress.org/documentation/article/list-block/) | Bullets or numbers; None/Wide/Full block-width alignment; ordered styles for numbers, letters and Roman numerals; start value, reverse order, inline-formatted item content, item-scoped text formatting and links for top-level Lists, and shared visual settings. Existing plain-string items remain readable. | Nested List Item blocks and indentation are not yet supported. The block HTML editor rejects nested lists instead of flattening them. List items do not yet have per-item inspector settings. Footnotes and inline images are unavailable from the List formatting menu because their insertion handlers currently target whole text blocks. Formatting controls for Lists placed inside container blocks remain unavailable. |
| Table | [Table](https://wordpress.org/documentation/article/table-block/) | None/Left/Centre/Right/Wide/Full block alignment, per-column Left/Centre/Right content alignment, fixed or adaptive cell widths, header/footer, caption, Default or Stripes style, and shared visual settings. | Cells and the caption remain plain text; WordPress cell-level rich text, links, tag/scope and spanning attributes are not yet supported. |
| Code | [Code](https://wordpress.org/documentation/article/code-block/) | None/Wide block-width alignment, shared visual settings and shadow. | Language selection and syntax highlighting are Studio additions, kept in the Studio tab. Gutenberg's Code block does not offer Full width or minimum dimensions. |
| Image | [Image](https://wordpress.org/documentation/article/image-block/) | None/Left/Centre/Right/Wide/Full block alignment; source, alternative text or decorative state, caption, custom/image-file/lightbox link destination, display width and height, aspect ratio, cover/contain scale, focal position, Default/Rounded style, margin, border, shadow and advanced fields. Legacy Wide display records migrate to the shared alignment contract. | Resolution variants, media-editor crop/rotate/flip and duotone filters need a managed derivative pipeline; Studio does not offer controls that would falsely imply those files exist. Current Gutenberg Image dimensions also use pixel values. |
| Embed | [Embed](https://wordpress.org/documentation/article/embed-block/) | None/Left/Centre/Right/Wide/Full block alignment, URL, plain-text caption, margin and advanced anchor/classes. | Studio renders a safe resource card and keeps its card title in the Studio tab; Gutenberg's rich-text caption, provider content, responsive embed and provider-specific transforms remain unsupported. |
| Button | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Label, link/new-tab target, title and rel attributes, Fill/Outline appearance, 25/50/75/100% width, text alignment and shared visual settings. | Studio has one Button block, not a nested Buttons container; per-state hover/focus/active styles are not modelled. |
| Divider | [Separator](https://wordpress.org/documentation/article/separator-block/) | None/Centre/Wide/Full block alignment; Default, wide and dots styles; `hr` or `div` element; palette colour, margin and advanced fields. | Theme-dependent alignment presets are not imported. |
| Spacer | [Spacer](https://wordpress.org/documentation/article/spacer-block/) | Height, optional width, px/em/rem/vw/vh units, margin and advanced anchor/classes. | Current [Gutenberg controls](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/spacer/controls.js) exclude %, although the documentation still lists it. Gutenberg switches between height and width controls according to parent orientation; Studio exposes both. Flex-child fill controls and drag handles are not modelled. |
| Group | [Group](https://wordpress.org/documentation/article/group-block/) | None/Wide/Full outer block-width alignment; stack/row/columns and responsive grid layouts, grid maximum columns and minimum column width in pixels, root-level sticky positioning, alignment, independent horizontal and vertical gaps, padding, minimum height/width, managed background images with cover/contain/fixed size, repeat and focal position, Studio responsive stacking, semantic HTML element, ARIA label, HTML anchor, additional CSS classes and shared visual settings. | Per-instance Additional CSS, allowed-block and template-lock controls are not yet modelled. Gutenberg also permits CSS units for the grid minimum column width; Studio currently stores pixels. |
| Columns and Column | [Columns](https://wordpress.org/documentation/article/columns-block/) | None/Wide/Full outer block-width alignment; WordPress-ordered layout presets, count, inner content width, vertical alignment, independent horizontal and vertical gaps, Studio responsive stacking, HTML anchor, additional CSS classes and shared visual settings. | WordPress's theme-specific width and style presets, per-instance Additional CSS, allowed-block and template-lock controls are not imported. Columns and each nested Column retain separate settings. |
| Document Title | [Title](https://wordpress.org/documentation/article/title-block/) | Heading level, post link, new-tab target and rel, text alignment, None/Wide/Full block-width alignment and shared visual settings. | Title content is owned by document metadata. Gutenberg defaults this block to H2, which Studio now follows; its core Title block declares no minimum dimensions or text shadow. |
| Post Author | Studio composite based on the deprecated [Post Author block](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/post-author/block.json) | Prefix, avatar, alignment and shared visual settings. | Current Gutenberg composes separate Avatar, Author Name and Author Biography blocks. Studio keeps this insertable convenience block because author identity is owned by document metadata; initials replace a profile image. |
| Post Date | [Post Date](https://wordpress.org/documentation/article/post-date-block/) | Date format, post link, alignment and shared visual settings. | Source date is owned by document metadata. The clock icon is a deliberate Studio presentation option and has no Gutenberg counterpart. |
| Social Icons | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | LinkedIn and TikTok children; Default, Logos Only and Pill Shape styles; block alignment, justification, orientation, wrapping, Small/Normal/Large/Huge icon sizes, one Gutenberg-style Gap value, text labels and new-tab links; shared foreground/background colours, dimensions, border and Advanced settings. | The supported catalogue intentionally contains only LinkedIn and TikTok. Studio applies parent foreground/background settings to the icon controls and keeps separate horizontal/vertical gaps in the Studio tab. |
| LinkedIn and TikTok | [Social Icons](https://wordpress.org/documentation/article/social-icons/) | Each icon has a profile URL, text label, link `rel`, HTML anchor and additional CSS classes. They can be inserted as standalone Widgets or as children of Social Icons. | Studio retains the ACM icon catalogue artwork and does not add other social platforms in this phase. |
| Document Subtitle, Reading Time | Studio-specific | Content-specific options plus shared visual settings. | No exact Gutenberg core counterpart. |
| Section | Studio-specific semantic Group | Stack, Row, Columns and responsive Grid layout with maximum columns and minimum column width; shared visual settings. | Section role and source metadata are Studio-owned. |
| Cover Image | [Featured Image](https://wordpress.org/documentation/article/post-featured-image-block/) | None/Left/Centre/Right/Wide/Full block alignment, post link/new-tab/rel, width, height, aspect ratio, scale, focal position, border, radius and shadow. | It displays document cover metadata. Gutenberg's size variants, first-post-image fallback, overlay and duotone remain unsupported. It is not the content-bearing Cover block. |
| Field | Studio-specific | Content controls. | No exact Gutenberg core counterpart. |
| Column, Component | Studio-specific nested/system types | Controls appear when their owning structure selects them; neither is offered as a top-level inserter item. | No exact Gutenberg core counterpart for Component; Column maps only inside Columns. |
| Footnotes | [Footnotes](https://wordpress.org/documentation/article/footnotes-block/) system block | Notes are edited on the canvas; typography, colours, background, dimensions, border and advanced fields use the shared inspector. Older saved shadow styles still render and can be cleared with Border Reset all. | Studio stores notes in one system-managed block rather than Gutenberg's inline-reference structure and does not offer it in the top-level inserter. |

Outer block alignment follows Gutenberg's saved `alignleft`, `aligncenter`,
`alignright`, `alignwide` and `alignfull` class conventions while remaining a typed Studio field. It is
separate from text alignment and from a container's inner content-width
setting. The toolbar keeps Gutenberg's None, Wide width and Full width order;
Code offers only None and Wide width because that is the upstream core block's
declared support. Each block receives only the options declared by its upstream
counterpart, in the same order.

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
controls; capabilities found only in other Gutenberg configurations belong in
the block's Studio tab, with the compatibility reason recorded here. The
inspector's options menus appear beside the pane at desktop widths, and their
Reset all footer remains visible while long option lists scroll.

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

The inspector follows Gutenberg's section order and optional-control menu
pattern for Typography, Dimensions, Border and Elements. Core default controls
declared for each mapped block remain visible and are omitted from that
section's optional-control menu; optional controls stay in the menu in the
corresponding Gutenberg order. Where a retained style option has no equivalent
support in the selected core block, the menu groups it after the Gutenberg
options under a labelled Studio section with a divider. ACM-only block settings
remain in that block's Studio tab. ACM-only metadata blocks retain their Studio
defaults. A checked menu item shows its control. Removing it clears that
setting from the block; Reset all clears the section's visible settings
together. Foreground and background swatches come from the executable Style
Guide palette. Paragraph line indent is stored on its Paragraph and applies to
the immediately following Paragraph, matching Gutenberg's adjacent-block
selector. Text columns use CSS columns, and drop cap uses the first-letter
treatment in both editing and rendered output.
Fit text measures a Paragraph or Heading at its available width after rendering, then
updates its size when the text, font or width changes. It fits short text on one
line and bounds the size between 13px and 120px; longer text wraps at the
minimum size instead of overflowing. It temporarily takes
precedence over a chosen font size and text-column count; those settings remain
stored and reappear when Fit text is turned off. Vertical orientation temporarily
suspends the horizontal Fit text measurement while keeping its setting; returning
to horizontal orientation restores it.
