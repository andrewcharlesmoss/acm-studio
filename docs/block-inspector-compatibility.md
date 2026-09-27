# Block inspector compatibility

ACM Studio uses Gutenberg as its reference for block settings. The comparison
below covers every Studio block type available in the editor on 27 September
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

| Studio block | WordPress reference | Studio inspector support | Remaining difference |
| --- | --- | --- | --- |
| Paragraph | [Paragraph](https://wordpress.org/documentation/article/paragraph-block/) | Text alignment; None, Wide and Full block-width alignment; optional Typography, Dimensions, Border and Elements controls with per-section Reset all; preset and custom font sizes in px/em/rem/vw/vh, nine Appearance weights with italic variants, linked axes or separate sides for padding and margin, linked or separate border widths and corner radii, background, line indent, text columns, drop cap, fit text, orientation and advanced fields. | WordPress theme-defined font size and Appearance presets, richer palette and border-style pickers and text shadow are not yet supported. Core Paragraph does not expose Additional CSS classes. |
| Heading | [Heading](https://wordpress.org/documentation/article/heading-block/) | Level, text alignment, None/Wide/Full block-width alignment, Fit text, orientation and shared visual settings. | Gutenberg's text shadow, theme presets and some toolbar details remain unsupported. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Attribution, text alignment, None/Left/Right/Wide/Full block alignment, Default or Plain style, and shared visual settings. | Gutenberg's background images and multi-paragraph quote editing are not modelled. Centre is intentionally absent because the upstream Quote block does not declare it. |
| List | [List](https://wordpress.org/documentation/article/list-block/) | Bullets or numbers; None/Wide/Full block-width alignment; ordered styles for numbers, letters and Roman numerals; start value, reverse order, inline-formatted item content, item-scoped text formatting and links for top-level Lists, and shared visual settings. Existing plain-string items remain readable. | Nested List Item blocks and indentation are not yet supported. The block HTML editor rejects nested lists instead of flattening them. List items do not yet have per-item inspector settings. Footnotes and inline images are unavailable from the List formatting menu because their insertion handlers currently target whole text blocks. Formatting controls for Lists placed inside container blocks remain unavailable. |
| Table | [Table](https://wordpress.org/documentation/article/table-block/) | None/Left/Centre/Right/Wide/Full block alignment, per-column Left/Centre/Right content alignment, fixed or adaptive cell widths, header/footer, caption, Default or Stripes style, and shared visual settings. | Cells and the caption remain plain text; WordPress cell-level rich text, links, tag/scope and spanning attributes are not yet supported. |
| Code | [Code](https://wordpress.org/documentation/article/code-block/) | None/Wide block-width alignment, language and shared visual settings. | Language selection and highlighting are Studio additions. Gutenberg's Code block does not offer Full width. |
| Image | [Image](https://wordpress.org/documentation/article/image-block/) | None/Left/Centre/Right/Wide/Full block alignment; source, alternative text or decorative state, caption, custom/image-file/lightbox link destination, display width and height, aspect ratio, cover/contain scale, focal position, Default/Rounded style, margin, border, shadow and advanced fields. Legacy Wide display records migrate to the shared alignment contract. | Resolution variants, media-editor crop/rotate/flip and duotone filters need a managed derivative pipeline; Studio does not offer controls that would falsely imply those files exist. Current Gutenberg Image dimensions also use pixel values. |
| Embed | [Embed](https://wordpress.org/documentation/article/embed-block/) | None/Left/Centre/Right/Wide/Full block alignment, title, URL, plain-text caption, margin and advanced anchor/classes. | Studio renders a safe resource card; Gutenberg's rich-text caption, provider content, responsive embed and provider-specific transforms remain unsupported. |
| Button | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Label, link/new-tab target, title and rel attributes, Fill/Outline appearance, 25/50/75/100% width, text alignment and shared visual settings. | Studio has one Button block, not a nested Buttons container; per-state hover/focus/active styles are not modelled. |
| Divider | [Separator](https://wordpress.org/documentation/article/separator-block/) | None/Centre/Wide/Full block alignment; Default, wide and dots styles; colour, margin and advanced fields. | Theme-dependent alignment presets are not imported. |
| Spacer | [Spacer](https://wordpress.org/documentation/article/spacer-block/) | Height, optional width, px/em/rem/vw/vh units, margin and advanced anchor/classes. | Current [Gutenberg controls](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/spacer/controls.js) exclude %, although the documentation still lists it. Gutenberg switches between height and width controls according to parent orientation; Studio exposes both. Flex-child fill controls and drag handles are not modelled. |
| Group | [Group](https://wordpress.org/documentation/article/group-block/) | None/Wide/Full outer block-width alignment; stack/row/columns inner layout, alignment, gap, padding, responsive stacking, semantic HTML element, ARIA label and shared visual settings. | Gutenberg's background-image, shadow, minimum dimensions, sticky positioning, allowed-block and template-lock controls are not yet modelled. |
| Columns and Column | [Columns](https://wordpress.org/documentation/article/columns-block/) | None/Wide/Full outer block-width alignment; WordPress-ordered layout presets, count, inner content width, vertical alignment, responsive stacking and shared visual settings. | WordPress's theme-specific width and style presets, allowed-block and template-lock controls are not imported. Columns and each nested Column retain separate settings. |
| Document Title | [Title](https://wordpress.org/documentation/article/title-block/) | Heading level, post link, new-tab target and rel, text alignment, None/Wide/Full block-width alignment and shared visual settings. | Title content is owned by document metadata. Gutenberg defaults this block to H2, which Studio now follows. |
| Post Author | Studio composite based on the deprecated [Post Author block](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/post-author/block.json) | Prefix, avatar, alignment and shared visual settings. | Current Gutenberg composes separate Avatar, Author Name and Author Biography blocks. Studio keeps this insertable convenience block because author identity is owned by document metadata; initials replace a profile image. |
| Post Date | [Post Date](https://wordpress.org/documentation/article/post-date-block/) | Date format, post link, alignment and shared visual settings. | Source date is owned by document metadata. The clock icon is a deliberate Studio presentation option and has no Gutenberg counterpart. |
| Document Subtitle, Reading Time | Studio-specific | Content-specific options plus shared visual settings. | No exact Gutenberg core counterpart. |
| Section | Studio-specific semantic Group | Layout and shared visual settings. | Section role and source metadata are Studio-owned. |
| Cover Image | [Featured Image](https://wordpress.org/documentation/article/post-featured-image-block/) | None/Left/Centre/Right/Wide/Full block alignment, post link/new-tab/rel, width, height, aspect ratio, scale and focal position. | It displays document cover metadata. Gutenberg's size variants, first-post-image fallback, overlay, duotone and full border/shadow controls remain unsupported. It is not the content-bearing Cover block. |
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

Typography options follow the order in the WordPress Typography reference.
Gutenberg's available controls can vary with the selected block and theme, so
Studio may expose a supported option such as Font family or Orientation even
when it does not appear in a particular WordPress site's menu. The inspector's
options menus appear beside the pane at desktop widths, and their Reset all
footer remains visible while long option lists scroll.

Dimensions and Border retain CSS shorthand strings in the current block style
contract. This preserves existing single-value drafts while allowing two-axis
spacing and four side or corner values. The pane follows Gutenberg's grouped
controls and uses Studio's neutral slider and focus colours. The Border menu
offers Border and Radius; legacy saved shadows still render and are removed by
that section's Reset all command, but are no longer offered as a new option.

The inspector follows Gutenberg's section order and optional-control menu
pattern for the shared appearance settings. A checked menu item shows its
control. Removing it clears that setting from the block; Reset all clears the
section's visible settings together. Studio keeps its own neutral colour
palette. Paragraph line indent and text columns use CSS properties, and drop
cap uses the first-letter treatment in both editing and rendered output.
Fit text measures a Paragraph or Heading at its available width after rendering, then
updates its size when the text, font or width changes. It fits short text on one
line and bounds the size between 13px and 120px; longer text wraps at the
minimum size instead of overflowing. It temporarily takes
precedence over a chosen font size and text-column count; those settings remain
stored and reappear when Fit text is turned off. Vertical orientation temporarily
suspends the horizontal Fit text measurement while keeping its setting; returning
to horizontal orientation restores it.
