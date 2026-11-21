# Site Editor and block instructions

All code and documentation paths in these instructions are relative to the ACM Studio repository root.

## Site Editor preview

`/studio/site-editor` provides saved website Identity and Styles for Global Defaults,
Test, and Test2. Andrew authorised per-site overrides on 22 October 2026.
Global Defaults is stored as `websiteDesignDefaults` in global library v4;
fixture source v9 stores each site's `websiteDesign` independently of shared
TemplateStore originals. Earlier fixture/library versions remain readable.
Unset properties inherit Global Defaults; Reset removes the corresponding local
override. Text may remain explicitly empty, Hide preserves values, and explicit
Show overrides an inherited Hide. Reset clears both value and visibility choices.
Canonical IdentityControls remain shared with the memory-only Library specimen.
Styles includes Browse Styles, Background, Colours, Shadows, Layout, Blocks,
and Typography with saved per-property global/site inheritance, bundled font
family availability, element settings, and fluid size presets. Other sections
remain unavailable placeholders. See `docs/site-editor-styles.md` for scope and
reference adaptations. Blocks uses separate Styles-owned profiles captured from
WordPress's current Styles → Blocks panes, composing canonical Library controls
rather than embedding or filtering the content editor's ParagraphInspector.
Pages is available for Test and Test2, with shared List, Table and Grid
presentation, per-site view preferences, document-owned page commands, and a
memory-only Controls → Pages catalogue specimen. See `docs/site-editor-pages.md`.
Keep editor capabilities, content controls and variation application independent
from global block defaults and variation-default navigation. The supported panes
and all their supported controls are demonstrated in Controls → Block Styles panes.
Website theme fonts, fluid presets, duotone, shadows, background images,
variation defaults, and device overrides live in website design settings; never
materialise inherited presentation in saved document content.
Canonical BlockRenderer owns content presentation. Preview adapters target its
painted surfaces, preserve explicit content styles and use shared device ranges.
Block States reuses ViewportStatesMenu and canonical device style maps, with
separate temporary maps for preview-only theme values. Default, Tablet and Mobile
keep independent scoped overrides and Reset; selection remains the editing target
when the preview is manually resized. Controls → Preview frame shares the States
menu and frame sizing contract. See docs/site-editor-styles.md for the captured
per-block matrix, provenance and deliberate preview adaptations.
The earlier Paragraph defaults
experiment is removed from this preview; existing Styles tools are unchanged.
The shared `TwoLeftPaneWorkspace` composes existing Pane components into two left-hand panes: scope/navigation, then
Identity settings, followed by the preview. Shared composition owns placement,
responsive layout, and gap-free collapse/reopen behaviour; the Pane Library
Two Left Panes specimen consumes the same implementation. Scope uses the shared SelectControl;
text uses TextInput. Images are selected through StudioDialog, ImageChoiceGrid,
and useBlobUrls from existing Files in read-only mode. Existing portable raster
attachments own immutable 2 MiB image files (5 MiB transfers); Global Defaults
uses fixed Studio `work/global-design-media` ownership and fixture outputs receive
validated copies. No Blob URLs or image bytes enter settings JSON. Assets and
settings travel in local backups. Theme fonts and licence files accompany local
outputs. The existing exact-origin gateway, global Web Lock, typed peer broker,
process guard, CAS revisions, recovery history, and readback own saving. Hydrate
before enabling controls, preserve drafts on failed or stale saves, and never
write initial defaults over saved data. Previously saved browser Global Defaults
identity is adopted once through that gateway; former sample Test/Test2 records
are retained for recovery and never copied over real sites. Legacy site names and
blank taglines remain explicit overrides until Reset. Identity and Styles keep
separate session-only histories. Library specimens remain memory-only.

WebsiteDesignSurface, shared role resolvers, and canonical BlockRenderer own
normal Edit, Preview, hosted-home, and static output presentation. Editing rebases
only actual user changes onto canonical content, excluding projected inherited
values. Additional CSS is resource-free and scoped through one portable compiler.
Saving settings regenerates local output without capturing document publications;
no hosted publishing or deployment is implied.

Andrew authorised actual Test/Test2 authored home previews and in-place editing on
22 October 2026. Selecting either fixture mounts the canonical `/studio` editor
inside a same-origin hosted-home frame. The current collection’s home ID is
resolved explicitly; missing source, home, or global templates show errors rather
than sample content. Click or keyboard activation opens the existing editor in
the retained frame and expands the outer workspace. Saved Identity and Styles
apply to the selected fixture through its existing broker. Hosted mode
restricts unrelated site/library navigation; existing page, media, history,
ownership, synchronisation, and gateway adapters remain canonical. Parent scope
changes use exact source/origin/site-checked fixed messages. Return and leave
pause mutation, confirm code/navigation decisions, and flush authored drafts only;
failed saving retains the frame and scope. No return/leave action publishes or
deploys. See `docs/site-editor-styles.md` for the hosted-home contract.

Site Editor collapse regression check: at 1440px, 820px, and 390px, hide
Navigation, hide Identity, reopen Navigation, then reopen Identity. Each collapsed
track must measure 0px; both Show buttons must remain within the viewport and
have separate hit targets. With both closed, the preview must start at x=0.
Check keyboard activation as well. This rendered-layout check is manual because
the normal Node test suite has no browser layout engine; state tests alone cannot
detect reserved grid columns or overlapping controls.

## Block presentation and media

Table cell and column alignment share `table-presentation.ts` and the canonical
TableAlignmentControls in content/template editors and the Block Library.
Explicit cell choices live in cellMetadata; columnStyles supplies defaults for
new rows. Legacy columnAlignments retain their previous semantics. Row heights
are minimums in every renderer. Table selection follows its actual figure,
including intentional authored padding. Heading line boxes retain visible glyph
overflow in both modes so a snug selection cannot clip descenders.


Quote block presentation stores block spacing and aggregate Heading foreground,
background colour, and gradient in canonical content styles. It requires workspace
v31, publication v23, template v0.35.0, clipboard v8, fixture source v14, and global
library v6; older envelopes remain readable but reject these new content fields.
Website Block Styles remains a separate owner. Explicit child Heading styles win,
and nearer Quote Heading settings override inherited element colours. Block
spacing belongs to the direct Quote owner and never inherits into nested Quotes. The shared
`controls/element-colour-setting.tsx` owns presentation; website adapters retain
palette references and gradient IDs. See `docs/studio-ui-library.md`.

Authored body Image Duotone uses bounded dark/light hex colours. An absent
override inherits website settings; explicit None (`null`) suppresses them.
Clear chooses None, while Reset removes the override. The canonical image
surface serves editing, previews, local publication, and enlarged images. HTML
inspection serialisation reuses the same SVG filter renderer and typed metadata;
neither path changes source bytes or captions.
The field requires workspace v32, publication v24, template v0.36.0, clipboard
v9, fixture source v15, and global library v7. Earlier Quote and aspect-ratio
introduction versions remain readable. The shared Duotone control has pane
and trigger-anchored toolbar variants; its existing website default is unchanged.

Authored body Images support a reversible crop rectangle, aspect-ratio presets,
zoom, quarter-turn rotation, fine straightening and horizontal/vertical flips.
The crop and transform are typed Image metadata; the original managed media bytes
remain immutable. The canonical Image renderer applies the same pixel-space
geometry in editing, preview, local publication, templates, fixture output,
HTML inspection and enlarged-image views. The Crop dialog uses StudioDialog,
with pointer and keyboard crop handles; Undo, Redo and Reset remain in the
existing editor history. This field requires workspace v47, publication v38,
template/package v0.58.0, clipboard v24, backup v24, Test/Test2 source v36 and
global template library v28. Older envelopes remain readable without crop
metadata and reject it when present.

Authored body Covers support the same reversible pixel-space crop and transform
metadata as Images, using the shared crop editor and renderer while retaining the
original managed media bytes. The crop is available from the selected Cover's
toolbar and survives HTML inspection, local publication, templates, clipboard,
backup, global templates and Test/Test2. It requires workspace v53, publication
v44, template/package v0.64.0, clipboard v30, backup v30, Test/Test2 source v42,
and global template library v34. Earlier envelopes remain readable without Cover
crop metadata and reject it when under-versioned.

Authored body Covers can use either a validated HTTPS provider URL or a separate
validated direct native video URL as a video background. Provider URLs retain
the fixed YouTube, Vimeo, TikTok and VideoPress mappings; the renderer keeps the
sandboxed player behind the Cover overlay and inner content. Provider video
backgrounds require workspace v54, publication v45, template/package v0.65.0,
clipboard v31, backup v31, Test/Test2 source v43 and global template library v35.
Earlier envelopes remain readable without provider video background data and
reject it when under-versioned. Animoto provider resolution and managed video
uploads remain unsupported.

Native Cover video backgrounds render a direct video source beneath the overlay
and inner blocks, with the image fallback retained for reduced-motion preferences.
Cover-to-Video is offered only when conversion preserves the authored data; it
retains ID, alignment, caption/title and editorial metadata, and rejects populated
children, provider sources, image or overlay presentation, style overrides,
locks, and parent-block restrictions. The distinct native source requires
workspace v56, publication v47, template/package v0.67.0, clipboard v33, backup
v33, Test/Test2 source v45 and global template library v37. Earlier envelopes
remain readable without native Cover video sources and reject them when
under-versioned. Sources are direct HTTPS or root-relative file URLs; provider
permalinks and managed video uploads are not accepted.

Authored body Video blocks use a separate native HTML video element and accept a
direct safe HTTPS or local video URL, caption, poster URL and playback settings.
Provider page URLs remain Embed sources and do not become native media. Video
blocks require workspace v55, publication v46, template/package v0.66.0,
clipboard v32, backup v32, Test/Test2 source v44 and global template library
v36. Earlier envelopes remain readable without Video blocks and reject them
when under-versioned. Upload/Media Library selection and caption tracks remain
unsupported. Cover-to-Video is available only for native Cover sources when
Gutenberg's conversion loses no authored data; provider permalinks do not qualify.

Authored body Image resolution pins require workspace v35, publication v27,
template v0.39.0, clipboard v12, and global template library v10. Older envelopes
remain readable when they contain no pins and reject pins rather than silently
dropping them. Image rendition bytes travel with the full backup media contract.
The Test/Test2 fixture source remains v18 and deliberately excludes browser-managed
body media; its external-URL images do not expose local rendition choices.

Authored Featured Image Duotone uses the shared bounded dark/light colour
contract, with absent values inheriting website settings, explicit None
suppressing them, Clear selecting None, and Reset removing the override. The
canonical Featured Image surface renders it in editing, previews, local
publication and generated HTML. Featured Image Duotone was introduced in
workspace v34, publication v26, template v0.38.0, clipboard v11, fixture source
v17 and global library v9. Current readers retain that field in workspace v40,
publication v32, template v0.49.0, clipboard v18, fixture source v27, backup v15 and global library v20; earlier
envelopes remain readable and reject it.

Featured Image overlay colour, gradient and 0–100 opacity are authored content
on the Main editor Featured Image block. The canonical FeaturedImage surface
renders the overlay in Edit, Preview, templates and local publication. Its
absence has WordPress's dimRatio 0 behaviour. It is separate from Site Editor
website defaults. The field requires workspace v40, publication v32, template
v0.49.0, clipboard v18, backup v15, Test/Test2 source v27 and global template
library v20; older envelopes remain readable and reject it.

## Layout and responsive blocks

Group Grid's Fill available space setting stores whether empty auto-fit tracks
collapse. It requires workspace v36, publication v28, template v0.42.0,
clipboard v14, backup v8, Test/Test2 fixture source v20 and global library v13.
Earlier envelopes remain readable and reject the setting. Section Grid does not
use this Group-only field.

Template Content exposes a bounded HTML element choice (`div`, `main`, `section`,
or `article`) in its Advanced inspector. It is persisted by the existing template
node contract and rendered consistently in template editing and previews. The
field requires template v0.42.0, Test/Test2 fixture source v20 and global
template library v13; older envelopes remain readable and reject it. Content
Button foreground, solid background or gradient follows the same envelope
versions and is rejected on non-Content template nodes and ordinary document
blocks.

Group Row and Stack layouts expose Gutenberg-style Allow sizing on children.
Direct children then expose Fit, Grow, Max width and Fixed flex sizing in the
Block inspector. Store this setting with the Group and sizing with the child's
shared visual style, render sizing on the canonical child wrapper, and keep both
controls desktop-only. Their versioned fields require workspace v37, publication
v29, template v0.43.0, clipboard v15, backup v9, Test/Test2 source v21 and
global template library v14; older envelopes remain readable when they do not
contain this field and reject it otherwise.

When a Row stacks at its configured breakpoint, suspend its direct children's
Row width sizing so it does not become a height. Preserve separately authored
flex CSS on children without Row sizing, and restore the Row sizing when the
layout becomes horizontal again.
Columns-to-Row conversion preserves Column widths and the original stacking
breakpoint without changing the defaults for newly inserted Rows.
Editor and publication document surfaces provide the `studio-document` named
container through `studio-responsive-container`. Embedded renderers must use
that boundary so Rows follow the space available to their document; uncontained
renderers fall back to the browser viewport.

Column widths support px, em, rem, vw and vh fixed tracks alongside legacy
proportional flexible widths. The field requires workspace v38, publication v30,
template v0.44.0, clipboard v16, backup v10, Test/Test2 source v22 and global
template library v15; older envelopes remain readable when they do not contain
the field and reject it otherwise. Changing a Columns count preserves existing
fixed tracks and redistributes only flexible tracks. Resizing a flexible track
redistributes among flexible siblings; changing a fixed track to a flexible
percentage uses that same parent-owned width command.

Group Grid direct children expose bounded column and row spans, rendered on the
shared visual frame. The feature requires workspace v42, publication v34,
template v0.51.0, clipboard v20, backup v17, Test/Test2 source v29 and global
template library v22; older envelopes remain readable when they do not contain
spans and reject them otherwise. Expanded Group Grid limits (up to 16 columns/spans and a zero minimum column
width) require workspace v65, publication v56, template/package v0.77.0,
clipboard v42, backup v45, fixture source v56 and global library v48. The gates
check inactive layout values and nested content before migrating older envelopes.
The same versions introduce Group/Content-slot `gapLength` (a single bounded CSS
length), finite reference fluid padding/margin and zero Fixed/Max flex-child
dimensions. Explicit gap edits write
`gapLength` and clear numeric gap fields; legacy unequal numeric gaps retain their
original rendering until edited. When both representations are imported, the
explicit `gapLength` wins. Recovery bindings are checked before normalisation,
including scalar property overrides resolved against their local template bases.
Content/wide widths, flex child sizes and Group spacing offer px, %, em, rem, vw
and vh; legacy ch values remain retained and displayed as unavailable choices.
New Row defaults to no wrapping; new Stack defaults to wrapping. Variation
selection restores layout-owned defaults, while Orientation retains compatible
Flex settings. Navigation breakpoints measure the containing preview viewport,
not a narrow Grid track; opened mobile overlays remain open when resized.
Section and Columns keep their previous bounds. Stable Grid placement remains automatic;
experimental manual cell placement is outside the supported comparison scope.

## Navigation and text blocks

Navigation Search exposes display width independently from its input width,
using px, %, em, rem, vw or vh on the outer Search item. This requires template
v0.52.0, backup v18, Test/Test2 source v30 and global template library v23;
older envelopes remain readable without the field and reject it when present.

Navigation also supports a distinct Home Link menu item. Its editable label and
presentation are retained, while rendering resolves the destination from the
owning template's home URL or the selected Test/Test2 site's current
`homeDocumentId`. This requires template v0.53.0, Test/Test2 source v31, backup
v19 and global template library v24; older envelopes remain readable without
the field and reject it when present.

Navigation Page List is a normal selectable block inside Navigation, available
from the Blocks inserter when Navigation is selected. It has its own inspector,
Styles and block toolbar; do not expose an Add/Remove Page List setting on the
Navigation toolbar. Its content is stored in the versioned Navigation template
tree and remains unavailable as a standalone document-body block.

The Post Date toolbar's Change Date picker stores a canonical UTC timestamp on
the block; resetting it restores the owning document's date. The field requires
workspace v39, publication v31, template v0.45.0, clipboard v17, backup v11,
Test/Test2 source v23 and global template library v16. Older envelopes remain
readable when they do not contain a Post Date override and reject it otherwise.

Navigation supports an optional automatic Page List child derived from the
current site's page records and parent hierarchy. The shared Navigation element
renders it in Edit, Preview, local fixture output and published snapshots; fixture
publication lists include only published pages. Its root-menu position can be
moved before or after menu links and is saved in the versioned template
Navigation node. The setting requires template v0.46.0, Test/Test2 source v24,
backup v12 and global template library v17. Navigation also supports an
optional Search control in the root menu. Test and Test2 output searches local
published pages and excludes password-protected or not-yet-available scheduled
pages; draft previews search the selected fixture's documents. Browser-local
publication Search reads the validated publication snapshot and indexes title,
summary and visible body text; it omits drafts and has no server-side results
page. Search requires template v0.48.0, Test/Test2 source v26, backup v14 and
global template library v19. Older envelopes remain readable without Search and
reject it when present.
Social Icons, Site Title and other arbitrary Navigation inner blocks remain
outside the typed contract.

Code supports a Code-only Monospace font-family choice, plus selected-text Bold,
Italic and safe Link marks while retaining
`code` as its exact canonical source. Optional Code runs may contain only those
marks, and their text must concatenate exactly to `code`. The painted surface
escapes syntax-highlighted source before applying marks; HTML inspection keeps
literal whitespace and round-trips these marks. The Monospace choice is stored
in Code's existing visual style; unset values retain the block's existing
monospace appearance, and other block types reject this family. Workspace v44,
publication v36, template v0.56.0, clipboard v22, backup v22, Test/Test2 source
v34 and global template library v27 carry the choice. Code runs remain supported
from workspace v43, publication v35, template v0.55.0, clipboard v21, backup
v21, fixture source v33 and global library v26. Older envelopes reject fields
they cannot preserve rather than dropping them.

Pullquote is a distinct stored content/template block alongside Quote, not a Quote
style alias. It reuses the canonical quotation editor, rich citation, renderer and
style controls. It requires workspace v57, publication v48, template/package
v0.68.0, clipboard v34, backup v34, fixture source v46 and global library v38.
Earlier envelopes remain readable and reject the new type and Group allowlists.
See `docs/studio-ui-library.md` for the live Gutenberg reference and adaptation.

Paragraph padding, margin and border widths retain independently authored sides,
and border radii retain independently authored corners; absent values continue to
inherit the website block style. It requires workspace v58, publication v49,
template/package v0.69.0, clipboard and backup v35, fixture source v47 and
global template library v39. Earlier envelopes reject these per-side and per-corner fields.

Local block Font choices use the current Site Editor font availability and the shared
preview menu. Existing fixed font IDs remain readable. Site Editor fonts use bounded
shared IDs and require workspace v59, publication v50, template/package v0.70.0,
clipboard and backup v36, fixture source v48, and global template library v40.
Earlier envelopes reject these IDs. Disabled site fonts retain authored selections
and render their CSS fallback. Responsive overrides use the same contract.
