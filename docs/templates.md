# Template editing

Templates are Studio-owned browser-local designs. Open **Templates** beside
**Pages** and **Posts** in the Content Studio, or use the dashboard shortcut,
then create a named set and edit its Page, Post, Header or Footer. The Content
Studio keeps the template library and editor in the same workspace, so changing
mode does not discard the current content selection or require a separate
editing session. Each set starts with a neutral Inter design. Social/support
links are empty until a real destination is supplied. Templates remain a
separate reusable presentation data type even though they share the content
editor shell.

The canvas, ordinary block controls, List View and history are shared with the
content editor. The editing breadcrumb identifies the selected set and target.
When the same local Studio is open in more than one browser tab, one tab owns
browser persistence and the others synchronise edits through it. A peer tab
stays paused until it has installed the owner's latest Content and Template
snapshots, then reports that it is synchronised; compatible edits merge and
only overlapping changes require an explicit choice. An edit already being
sent remains local during an ownership handover and is either rebased onto the
latest stored snapshot or presented for explicit conflict resolution.
**Preview Content** selects an existing document; **Width** provides desktop,
tablet and mobile canvas sizes. Zoom is independent of that viewport choice and
is available from the toolbar or with Command/Ctrl + plus/equal, Command/Ctrl +
minus/underscore and Command/Ctrl + 0 to reset to 100%. These shortcuts only
belong to the focused template workspace and leave text, code and form editing
to the browser. The Template inspector owns identity, navigation and
social/support links; Styles applies to the whole set. Ordinary paragraph style
overrides take precedence over the set's tokens.
The block inserter also offers Social Icons. Add LinkedIn and TikTok inside it,
then select each child in the canvas or List View to enter its profile URL.
The parent controls orientation, justification, size, labels and whether links
open in a new tab. Existing footer social/support template elements remain
readable; authors can replace or supplement them with the block.
The Copyright setting supports `{copyright}` (©), `{year}` (the current year)
and `{site-title}` (the Site Name). Values resolve when a template is rendered;
unknown brace-wrapped text remains unchanged. New template sets use
`© 2026 Andrew Moss. All Rights Reserved.` in the shared Footer part. Existing
authored footer text and published snapshots keep their saved copyright value.
Templated bodies and ordinary template blocks display dividers in every
preview and publication surface. Standalone Header/Footer targets use the same
semantic region and responsive styling as their composed references.

The shared shell uses two output breakpoints: 780px changes the Header to a
wrapped tablet layout, and 620px stacks and centres the Header and Footer. These
breakpoints are deliberately aligned with the 768px tablet and 390px mobile
preview widths while leaving the 1200px desktop preview in the full three-area
layout. The Footer places the configurable brand on the left, copyright in the
centre and user-supplied social/support links on the right. Narrow layouts keep
that order and centre each area. The Header only renders configured navigation
links; Studio does not invent destinations.

Groups and Sections use the same Gutenberg-style layout controls in ordinary
documents and templates. Choose Stack, Row or Columns, then set horizontal and
vertical alignment, a shared spacing preset or bounded custom gap, separate
horizontal and vertical padding, full or constrained width, and (for Columns)
the number of columns. The optional Stack at setting uses only the shared
780px tablet or 620px mobile breakpoint; blocks cannot create arbitrary
breakpoints. Section remains a semantic `section` element. Existing groups and
sections without these optional fields retain their earlier rendering.

The dedicated Columns block is different from a Group set to a columns layout:
it contains individually selectable Column blocks, each with its own child
blocks, width and vertical alignment. Its preset buttons follow the WordPress
Columns order: 100, 50/50, 33/66, 66/33, 33/33/33, then 25/50/25. Authors can
also add columns up to six, resize a selected column while proportionally
adjusting its siblings, and choose whether columns stack at the shared tablet
or mobile breakpoint. Column content remains editable and selectable in both
documents and templates.

Spacer is a Design block with the same spacing presets and a bounded custom
height. It is a selectable, keyboard-focusable outline while editing, but
Preview and local publication emit only empty space with `aria-hidden` output.
It can be nested, moved, duplicated, removed and restored through editor
history like any other block.

Document metadata blocks are available in the shared editor's **Other**
inserter group. Reading Time calculates from the document body at 220 words per
minute and supports a badge or plain presentation. Post Author reads the
editable document author and can show initials; Post Date reads the selected
publication date with long, short or ISO formatting and an optional clock
icon. These are ordinary removable blocks, not template elements. Their values
remain visible in the Document inspector even when a block is absent, and a
missing author or date produces an editor prompt without inventing a Preview
value. Title, Subtitle and Cover Image are also selectable dynamic blocks;
templates may supply their display defaults while documents can choose Use
Template, Show or Hide locally.

Templates can also insert Reading Time, Post Author and Post Date as dynamic
blocks. Their values resolve from the preview document, while Reading Time
always counts the document body rather than template text. The legacy
post-metadata element remains readable but is not offered as a new insertion.
For compatibility, the legacy post-metadata element keeps its category but
does not repeat reading time or publication date when the document uses the
new metadata blocks.

**Add Template Element** inserts identity, navigation, document metadata,
content or a shared-part reference. The block library also offers Content for
Page/Post templates. Selecting an ordinary group before insertion adds the new
block or element inside that group. List View supports nested selection,
movement and removal. Content is optional while exploring, and a Page/Post
template may contain at most one Content element. Shared parts cannot contain Content, reference a missing
part, form cycles or expand beyond the bounded rendering budget. A shared-part
editor lists the templates which use it. HTML editing is unavailable in this
increment because its parser does not preserve these template contracts.

Choose **Site Template** in a page/post inspector to apply a compatible layout.
The body and legacy Default/Wide/Landing metadata remain independent. Choose
**Existing Presentation** to remove the assignment. In content Edit mode, the
body and document metadata remain editable inside the template; shared regions
offer **Edit Header** / **Edit Footer** navigation. Set changes immediately affect
assigned drafts. Page documents remain drafts/previews. Publishing or updating
a local post captures a separate template snapshot and media references; later
design changes do not alter that published snapshot until **Update**.

Template sets support Rename, Duplicate, Move to Bin, Import and Export.
Additional page/post layouts and header/footer variants can be created, renamed
and duplicated within a set. A set may have no active templates while layouts
are in the Bin. Assigned templates and sets cannot be moved to the Bin until
their documents are reassigned, restored from the Bin or permanently deleted.
Shared parts must have no references before they can be moved. A set cannot be
moved while one of its entries remains in the Bin. Duplicate sets are
independent copies, including managed images; templates within a set deliberately
share that set's parts.

The Studio Bin also holds deleted pages and posts, template entries and template
sets. Restore returns an item to its original workspace or set. A post restored
from the Bin also regains its local published snapshot. Items remain in the Bin
until they are individually permanently deleted with confirmation; the Bin does
not empty itself. The Bin is included in full Studio backups.

## Storage and portable contract

Title and Featured Image settings survive the shared editor projection and template saves, including block alignment, image dimensions, aspect ratio, fit, focal position, link behaviour and visual styling. Fixed-image and hidden-image settings remain template-owned.

The template-store and JSON package schema is **v0.25.0** (`0.25.0` in JSON).
`TemplateSet`, `PageTemplate`, `TemplatePart`, `TemplateNode`, `SiteStyles` and
`TemplateAssignment` are defined in `app/studio/template-model.ts`. `SiteStyles`
is the versioned `UniversalStylePreset` contract from `@acm/styles`, and newly
created sets receive an independent clone of its universal defaults. Assignments
reference Studio document IDs. The local-storage key is
`acm-studio-templates-v1`; an absent key means no templates. Invalid or unsupported
data disables template writes without replacing the original value. **Export
Original Data** retains its raw contents for recovery.

Title-placeholder migration applies only when validating an active store or
portable package from v0.11.0 or earlier. Default Page/Post templates migrate
the adjacent plain Heading `Title` and Paragraph `Subtitle` pair only at the
canonical root position: immediately after an optional leading Header part
reference, with a root Content element following the pair. This conservative
shape recognises legacy defaults whose `isDefault` flag was omitted while
leaving nested or otherwise ambiguous authored copy intact. It preserves both
node IDs, the heading level and text alignment, and applicable visual styles.
The conversion does not run on v0.12.0 or v0.13.0 title placeholders or rewrite
later template edits.

Separately, active-store and package validation at every supported schema
version folds legacy paragraph `style` values on dynamic subtitles into
`visualStyle`, with existing `visualStyle` values taking precedence. This
normalisation is idempotent: after the first validation, the legacy field is
absent from the active subtitle record. Bin entries and immutable published
snapshots retain their legacy values for recovery and remain readable.

Template data at v0.1.0 through v0.6.0 is migrated in memory to the nested
style contract. Legacy colours, typeface, body size, heading and metadata
typography, buttons and layout values are converted to explicit values that
preserve the template's previous rendering. The same conversion is used for
active sets, Bin entries, imported packages, backups and template snapshots.
Existing published snapshots keep their original version and captured values;
later template edits do not change them. Publishing a changed design records a
snapshot using the current schema only through the normal **Update** action.

The explicit shared-editor target supplies template blocks and an inspector.
Dynamic elements are projected into block-command handles only in memory;
that projection is never stored as article content. Imported group metadata
cannot impersonate these reserved handles. The renderer supplies dynamic
content from the actual preview/document record and scopes design tokens to
the template surface.

The integrated Content Studio route uses `?mode=templates` and retains the
`/studio/templates` route as a portable deep link. Both entry points mount one
workspace and one template synchronisation session. The Templates badge counts
template sets, not individual Page/Post templates or shared parts. In the
integrated route, sets and their Page/Post/Header/Footer entries appear in the
same library pane as content; selecting an entry opens the editor directly
without a separate template-library page.

Layout options, Spacer, document metadata, dynamic document-field blocks,
root-level Group sticky positioning, Gutenberg's Huge Social Icons size and
managed Quote/Group background images are additive to the existing typed block
contract. Group Row and Stack layouts also support Gutenberg's Space between
justification. Table cells preserve per-cell header tags and scope. Workspace
data is now version 24, with readers for versions 2–23; local publication
snapshots are version 18 with readers for versions 1–17, and full backups remain
version 4. Template packages are v0.25.0, with readers for v0.1.0–v0.24.0.
Group and Section templates support the Grid layout with a maximum
column count. Group additionally supports Auto/Manual arrangement and minimum
column width in px, em, rem or vw; Section retains its pixel-based minimum.
Local publications freeze the effective visibility of Title, Subtitle, Cover
image, Author, Date and Reading Time from the exact selected template and document
overrides. Template or draft changes affect an existing publication only after
Update. Older snapshots without a saved visibility policy keep Show defaults.
Each Page/Post template may supply
Author, Category, Tags and Parent page defaults plus display defaults for
dynamic fields; legacy set-level defaults remain a fallback. Documents record
explicit value and display overrides, including empty values;
removing an assignment materialises the resolved values before detaching it.
Existing documents migrate with local overrides so their appearance does not
change. Older saved blocks and packages omit the new fields and continue using
their existing presentation. A Cover Image template element may optionally
store a managed fixed image; when absent, it continues to resolve from each
document's cover image.

The content and template inspectors share Document/Template, Block and Styles
tabs and a field catalogue. Page and Post documents expose the same ordered
controls. Document fields show their resolved value, whether the value is a
Template Default or Document Override, and whether the field is displayed in the
document, template, both or nowhere. **New from template** is an accessible
in-workspace dialogue that creates an independent empty body with inherited
defaults; **Save as template** is an accessible dialogue that preserves the
template structure while excluding ordinary document text, media and publication
state. Author, Category, Tags and Parent page are optional defaults when saving.
New fields are validated at workspace, HTML, backup, restore and publication
boundaries rather than being discarded.

Portable packages use `format: acm-studio-template-set`, contain one set and all
referenced managed images as base64, and are limited to 50 MB. Imports validate
the complete package, allocate new set/template/part/node/link/media IDs and
rewrite references. Image URLs remain external references; packages only embed
managed library files. Missing managed files prevent export rather than silently
producing an incomplete copy.

Templates share `studioWriteOwnership` with workspace, publication and media
stores. The host owns one lock lifecycle; template state loads after acquisition.
Same-origin Studio tabs synchronise workspace and template edits through a
validated BroadcastChannel coordinator. Compatible changes merge, while
overlapping field, deletion or ordering changes require a visible conflict
choice. Block insertions and deletions do not count as reorders: they can merge
when they affect different block IDs. Insert operations use neighbouring block
IDs to retain their intended placement if another tab deletes a block. This is
sync protocol v2: an older open tab cannot write through the new coordinator
until it reloads. If another tab reverses an insertion's two neighbours,
Studio asks for an explicit order choice instead of saving a shifted block.
If both tabs reorder the same list, a local-order choice keeps blocks added
elsewhere and honours blocks deleted elsewhere. An edit inside a group removed
in another tab remains unresolved
rather than silently disappearing. Remote updates clear local undo/redo history
so an older whole snapshot cannot overwrite a change made in another tab.
Synchronous validated saves report Saving then Saved, and storage errors remain
visible. If coordination is unavailable, the tab remains safely read-only.
Import and set duplication use
the exclusive restore transaction: drain pending media work, stage new media and
templates, roll both back on failure, and reload the installed snapshot after
success. Incomplete rollback blocks editing. Retain the source package/backup
during recovery.

Acknowledgements for older edits do not replace newer unsaved canvas state.
The coordinator reports committed snapshots separately from optimistic display
updates. Each accepted local transaction advances the pending-edit baseline;
only the remaining changes are rebased during writer handover. Selection IDs
and timestamps do not count as unsaved shared content. Welcome replies are
matched to the requesting session, so opening another tab cannot reset a peer.
Storage keys, sync protocol v2 and the lifetime writer lock are unchanged.

When a conflict is resolved in favour of the local version, Studio applies the
local changes to the latest saved version while retaining unrelated edits from
the other tab. A failed save remains visible and retryable; a structural change
that cannot be merged automatically says to keep the tab open for review.
Automatic workspace saving pauses during conflict review. An unresolved choice
survives a synchronisation-session restart or writer handover within the same
mounted editor. It is still held only in tab memory, not durable recovery
storage: copy unsaved content before reloading or closing the tab.
An already-open conflict from an older client still requires explicit review;
updating the code does not choose either version automatically. Hot replacement
can preserve a conflict while the hook remains mounted, but is not a backup.
Reload only after confirming a save or receiving and checking an export file.

Full Studio backups include templates and assignments. Older backups without
template data restore as having none. Restore rollback covers workspace,
publications, designs, templates and media. Referenced template images and images
in published template snapshots cannot be deleted from Files until those
references are replaced or the post is unpublished.

## Verification and boundaries

Run from the ACM Studio root:

```sh
node --experimental-strip-types --test tests/template-system.test.mjs
npm test
npm run lint
npm run typecheck
git diff --check
```

Focused tests cover model/projection invariants, shared-versus-copied designs,
unsafe imports, bounded reference expansion, ownership, storage failure,
transaction rollback, backup compatibility, nested media, snapshots and renderer
output. Browser QA additionally exercises editor interactions, reload, selectors,
keyboard use, responsive layouts and publication Update behaviour.

WordPress's [Template Editor](https://wordpress.org/documentation/article/template-editor/)
and [Template Part block](https://wordpress.org/documentation/article/template-part-block/)
were the behavioural references inspected on 19 September 2026: explicit
template context, dynamic document slots and reusable parts. Studio keeps its
own typed model and uses controls from the reusable ACM Studio icon collection.

This feature does not migrate WordPress, apply designs to other project
repositories, alter Mini Golf drafts, add archives/listings, synchronise sets
between sites or publish online. Hosted settings and Design canvas remain
separate product capabilities. No release or deployment is implied by a local
template save or publication snapshot.

### Content-slot and dynamic presentation settings

Content elements preserve Group content/wide-width inheritance, custom CSS lengths,
block spacing and shared visual styles through the transient editor projection and
v0.20.0 packages. Projection children remain empty in saved templates. Editing a
slot changes its presentation, while each document continues to own its body.

Body width alignment shares one Content-slot layout in Edit, Preview and local
publication. None uses the content limit; Wide width uses the wide limit and
half the page gutter on each side; Full width reaches the root template surface
edges when the Content slot has no authored inset. Content padding and borders
remain in effect. Custom content and wide sizes remain centred and bounded by the
available space. Nested Content slots fill their own containers without borrowing the page
gutter. Intentionally narrow containers can therefore make two width choices
look the same.

Title supports Paragraph as well as H1–H6. Author prefix/initials, Date icon and
Reading Time prefix/presentation are explicit ACM additions. Reading Time offers
word count and a 200–250 wpm range while retaining the 220 wpm default. Date custom
formatting uses the bounded tokens documented in the compatibility guide; last
modified reads the document timestamp. New local publications capture that value;
legacy snapshots without it remain without a confirmed modified date.

The preceding Table contract generation (workspace v21, publication v14 and
template v0.22.0) introduced the following boundaries. Table sections retain flat
row coordinates with explicit header/footer row counts.
Legacy flags still identify one row per section when counts are absent. Workspace
v21, local publication v14 and template v0.22.0 writers preserve multiple section
rows; their preceding versions remain readable without changing saved content.
Mini Golf page-definition exports use version 2 and read version 1. The backup
envelope remains version 4 and the Mini Golf draft envelope remains version 10;
contained workspace/template/publication payloads carry their own versions.


Button labels optionally retain rich runs alongside their plain label projection.
Interactive inline links and footnote references are excluded from a Button label;
the Button owns its outer link. Workspace v22, publication v15 and template
v0.23.0 retain that formatting. Mini Golf page definitions use version 5 and read
versions 1–4; its draft envelope uses version 13 and reads versions 1–12. The latest
draft generation preserves removed authored source elements on reload. The outer
backup envelope remains version 4. Legacy plain labels remain valid.


### Inline Footnote compatibility

New references occupy one logical U+FFFC slot, with their note identity stored in
an `inline` record. The placeholder is never displayed or counted as prose.
Workspace 23, publication 16, template v0.24.0, Mini Golf draft 12/page
definition 4 and clipboard 2 introduced Footnote objects; clipboard 3 added
partial-selection note companions. Those generations and their successors remain
readable. Earlier envelopes carrying inline run metadata are rejected rather
than interpreted as ordinary text. Validated legacy marked-text references are
canonicalised in memory when readers activate a document; reading alone does
not save that migration. Existing persisted data remains recoverable until an
authorised owned write records the current contract.


### Inline Math compatibility

New Math uses one logical U+FFFC object, rendered through one shared safe
presentation module in Edit, Preview and HTML export. Generated KaTeX children
are never saved content. Selected text seeds LaTeX immediately; an empty caret
inserts an editable placeholder. Toggling Math off restores the selected current
source. Unchanged source retains the original selected text's formatting.

Math objects require workspace 24, publication 17, template/package v0.25.0,
Mini Golf draft 13/page definition 5 and block clipboard 4. Their immediate
predecessors still accept Footnote objects, but reject under-versioned Math.
The outer backup envelope remains version 4.

Legacy Math marks may contain authored prose different from the expression and
may span formatting boundaries. They render as one equation and edit in place;
removing Math reveals that exact prose and formatting. They are not automatically
converted to objects. MathML input and accessible descriptions are retained ACM
additions. Unsafe MathML stays in the transient editor and cannot replace saved
content. Invalid LaTeX remains recoverable as source with parse feedback.

Closing an empty expression removes its placeholder only while the same
document, block and rich field remain writable and unchanged. Ownership loss
irrevocably discards the transient editor without a late write. A placeholder
whose cleanup was denied remains recoverable in the saved record and renders
without a visible U+FFFC character.

Native rich-text paste reads the typed Math descriptor from detached clipboard
HTML before inserting validated runs. It retains the expression, description
and source formatting without treating generated KaTeX text as authored prose.
Malformed mathematical clipboard content leaves the current field unchanged
with feedback. Ordinary pasted text, escaped code and comments keep native
paste behaviour. A mixed Math/Footnote selection requires the block Copy action
so referenced note content travels with it.


### Inline Language compatibility

Language uses a `bdo` element with a language tag and explicit LTR/RTL direction,
matching the pinned Gutenberg direction override. Existing `span lang` imports
remain readable. Empty language permits a direction-only format. Expanded tags
accept bounded syntax including singleton extensions and private use; this is
not a complete BCP 47 registry validation. Previously accepted historical tags,
including long values, remain recoverable without truncation.

Empty and expanded Language values use the same unfinished local generation as
Math: workspace 24, publication 17, template/package v0.25.0, Mini Golf draft 13,
page definition 5 and clipboard 4. Older envelopes reject these values before
migration; ordinary historical Language values remain readable. Detection walks
nested rich fields and Math source-recovery runs. No release is implied.

The checked menu removes an active format, including a contiguous equal-format
extent at a caret. A mixed selection opens a fresh form with empty language/LTR
rather than editing one selected run's attributes. Caret application changes
pending typing formats and creates no document history until text is inserted.
Selected application/removal is one document operation. The shared field resolver
and deferred focus guard retain the captured document, field and expected runs.
