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
| Paragraph | [Paragraph](https://wordpress.org/documentation/article/paragraph-block/) | Alignment; optional Typography, Dimensions, Border and Elements controls with per-section Reset all; background, line indent, text columns, drop cap, fit text and advanced fields. | WordPress theme presets and custom CSS editor are not yet supported. |
| Heading | [Heading](https://wordpress.org/documentation/article/heading-block/) | Level, alignment, Fit text and shared visual settings. | Gutenberg's text shadow and writing mode, theme presets, block-wide/full alignment, and some toolbar details remain unsupported. |
| Quote | [Quote](https://wordpress.org/documentation/article/quote-block/) | Attribution, text alignment, Default or Plain style, and shared visual settings. | Gutenberg's separate block alignment (including wide/full), background images and multi-paragraph quote editing are not modelled. |
| List | [List](https://wordpress.org/documentation/article/list-block/) | Bullets or numbers; ordered styles for numbers, letters and Roman numerals; start value, reverse order, inline-formatted item content and shared visual settings. Existing plain-string items remain readable. | Nested List Item blocks and indentation are not yet supported. The block HTML editor rejects nested lists instead of flattening them. List items do not yet have the full Gutenberg formatting toolbar or per-item inspector. |
| Table | [Table](https://wordpress.org/documentation/article/table-block/) | Fixed or adaptive cell widths, header/footer, caption, Default or Stripes style, and shared visual settings. | Cells remain plain text; WordPress cell-level rich text and links are not yet supported. |
| Code | [Code](https://wordpress.org/documentation/article/code-block/) | Language and shared visual settings. | Language selection and highlighting are Studio additions. |
| Image | [Image](https://wordpress.org/documentation/article/image-block/) | Source, alternative text or decorative state, caption, link/new-tab target, display width, aspect ratio, cover/contain scale, focal position, margin, border, shadow and advanced fields. | Resolution variants, media-editor crop/rotate/flip, duotone filters and height presets need a managed derivative pipeline; Studio does not offer controls that would falsely imply those files exist. |
| Embed | [Embed](https://wordpress.org/documentation/article/embed-block/) | Title, URL, plain-text caption, margin and advanced anchor/classes. | Studio renders a safe resource card; Gutenberg's rich-text caption, provider content, alignment, responsive embed and provider-specific transforms remain unsupported. |
| Button | [Buttons](https://wordpress.org/documentation/article/buttons-block/) | Label, link/new-tab target, primary/secondary appearance and shared visual settings. | Studio has one Button block, not a nested Buttons container; per-state hover/focus/active styles are not modelled. |
| Divider | [Separator](https://wordpress.org/documentation/article/separator-block/) | Default, wide and dots; colour, margin and advanced fields. | Theme-dependent alignment presets are not imported. |
| Spacer | [Spacer](https://wordpress.org/documentation/article/spacer-block/) | Height, optional width, px/em/rem/vw/vh units, margin and advanced anchor/classes. | Current [Gutenberg controls](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/spacer/controls.js) exclude %, although the documentation still lists it. Gutenberg switches between height and width controls according to parent orientation; Studio exposes both. Flex-child fill controls and drag handles are not modelled. |
| Group | [Group](https://wordpress.org/documentation/article/group-block/) | Stack/row/columns layout, alignment, gap, padding, responsive stacking and shared visual settings. | Gutenberg's theme layout presets are not imported. |
| Columns and Column | [Columns](https://wordpress.org/documentation/article/columns-block/) | WordPress-ordered layout presets, count, width, vertical alignment, responsive stacking and shared visual settings. | WordPress's theme-specific width and style presets are not imported. |
| Document Title | [Title](https://wordpress.org/documentation/article/title-block/) | Alignment and shared visual settings. | Title content is owned by document metadata. |
| Post Author | [Post Author](https://wordpress.org/documentation/article/post-author-block/) | Prefix, avatar, alignment and shared visual settings. | Author identity is owned by document metadata; initials replace a profile image. |
| Post Date | [Post Date](https://wordpress.org/documentation/article/post-date-block/) | Date format, icon, alignment and shared visual settings. | Source date is owned by document metadata. |
| Document Subtitle, Reading Time | Studio-specific | Content-specific options plus shared visual settings. | No exact Gutenberg core counterpart. |
| Section | Studio-specific semantic Group | Layout and shared visual settings. | Section role and source metadata are Studio-owned. |
| Cover Image | Studio-specific dynamic field | Alignment. | It displays document cover metadata, rather than behaving as Gutenberg's content-bearing Cover block. |
| Field, Component | Studio-specific | Content or component controls. | No exact Gutenberg core counterpart. |
| Footnotes | [Footnotes](https://wordpress.org/documentation/article/footnotes-block/) | Notes are edited on the canvas; typography, colours, background, dimensions, border, shadow and advanced fields use the shared inspector. | Studio stores notes in one block rather than Gutenberg's inline-reference structure. |

The shared appearance controls are deliberately limited to the project's
font stack: Inter, Helvetica Neue, Helvetica and Arial. Existing document
records and template snapshots keep their previous appearance unless a block
setting is changed. A WordPress feature in the final column is a compatibility
gap, not an available control.

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
stored and reappear when Fit text is turned off.
