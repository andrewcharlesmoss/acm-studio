# Block icon references

ACM Icons owns all block artwork. `app/studio/block-library-icons.tsx` is the
single product mapping used by block tiles, inspector summaries, List View and
generic transform controls. Heading level choices deliberately retain H1–H6
labels. The UI Library [Block Symbols collection](/studio/ui/icons?collection=blocks)
uses the full canonical block library, including non-insertable system types;
this does not make those types insertable. Every symbol links to its shared
catalogue entry, three optical scales and exports.

The reference is Gutenberg v24.1.0-rc.1, commit
[`e3ac73cd69d472341b66c43cb77be36e838f868e`](https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src).
Its icon silhouettes establish familiar meanings. The vectors are independently
authored ACM artwork; no Gutenberg paths are copied or traced. The shared
package's compatible private development contract is v0.21.1, not a published
release. Its reviewed local dependency commit is
`dda5977a978bd0766af64a2daa4e5a74054865dd`. Regular-S/M/L are drawn for 16/24/32px respectively.

| Studio block | Shared symbol | Gutenberg reference or deliberate adaptation |
| --- | --- | --- |
| Paragraph | `text.paragraph` | Paragraph pilcrow |
| Heading | `block.heading` | Heading filled bookmark; H formatter kept separately |
| List | `block.list` | List rules with middle bullet; inline list formatter kept separately |
| Quote | `text.quote` | Quote closing marks |
| Table | `block.table` | Table frame with spanning header; selected-cell symbol kept separately |
| Code | `block.code` | Opposed chevrons; slashed inline Code kept separately |
| Footnotes | `text.list-numbered` | Footnotes numbered list; inline reference mark kept separately |
| Image | `block.image` | Image mountain frame; generic inline Image kept separately |
| Embed | `insert.embed` | Embed folded code frame |
| Group | `layout.flow` | Group overlapping rounded squares |
| Columns | `layout.columns` | Columns three-panel frame |
| Column | `layout.column` | Column filled central column |
| Section | `arrange.group` | ACM semantic section; no exact core equivalent |
| Button | `insert.button` | Button short wide labelled frame |
| Field | `insert.text` | ACM form field; no exact core equivalent |
| Separator | `layout.separator` | Separator rule with end caps |
| Spacer | `layout.spacer` | Spacer opposed diagonal arrows |
| Title | `document.title` | Post Title initial above body rules |
| Document Subtitle | `text.paragraph` | ACM subtitle; no exact core equivalent |
| Featured Image | `document.featured-image` | Post Featured Image landscape above body rules |
| Reading Time | `time.clock` | ACM reading-time clock; no exact core equivalent |
| Author | `account.author` | Post Author person above body rules |
| Date | `document.date` | Post Date calendar with filled header and day numeral |
| Social Icons | `social.block` | Social Links three small outlined square share nodes; generic filled share kept separately |
| LinkedIn | `brand.linkedin` | Original ACM monochrome brand treatment |
| TikTok | `brand.tiktok` | Original ACM monochrome brand treatment |
| Component | `component.block` | ACM reusable component; no exact core equivalent |
| Template Content | `document.content` | Post Content four body rules |

Reusable symbol ownership and provenance live in `acm-icons/catalogue.json`,
editable masters and `SPECIFICATION.md`. No isolated Studio block drawings are
introduced. Generic formatting, selected-cell and account-card symbols retain
their established contracts.

The governing workspace Style Guide is unversioned at committed snapshot
`38fc70055f73d4dde2e4b376279f06caf3e2e54a` (1 October 2026). Project icon ownership
and review requirements are recorded in the respective `AGENTS.md` files.

Heading level marks are separate shared symbols: `text.heading-one`,
`text.heading-two`, `text.heading-three`, `text.heading-four`,
`text.heading-five` and `text.heading-six`. The inspector header, H1–H6 selector
and canvas toolbar use these catalogue assets; the generic `block.heading`
bookmark still identifies the block in the Block Library. Each level has
Small/Medium/Large optical artwork, metadata, addition date and SVG/PNG export
through Interface Icons.

The level marks use licensed Inter v4.1 filled outlines, as requested on
2 October 2026. Their reproducible converter and pinned font live in ACM Icons;
Small/Medium/Large adjust weight and cap height for their intended sizes.
They need no runtime font. Catalogue provenance and SVG exports retain the
SIL OFL 1.1 notice; the generic Heading block and formatting icons keep their
existing artwork.
