# Template editing

Templates are Studio-owned designs. Studio Drafts, Test and Test2 use one canonical global library. Studio Drafts keeps its original browser designs as recovery copies, with existing assignments resolved through shared IDs and retained migration aliases. Open **Templates** beside
**Pages** and **Posts** in the Content Studio, or use the dashboard shortcut,
then open or create an individual Page, Post, Header or Footer. The Content
Studio keeps the template library and editor in the same workspace, so changing
mode does not discard the current content selection or require a separate
editing session. New templates start with a neutral Inter design. Social/support
links are empty until a real destination is supplied. Templates remain a
separate reusable presentation data type even though they share the content
editor shell.

The canvas, ordinary block controls, List View and history are shared with the
content editor. Each entry opens directly from a single list without choosing or naming a set.
When the same local Studio is open in more than one browser tab, one tab owns
browser persistence and the others synchronise edits through it. A peer tab
stays paused until it has installed the owner's latest Content and Template
snapshots, then reports that it is synchronised; compatible edits merge and
only overlapping changes require an explicit choice. An edit already being
sent remains local during an ownership handover and is either rebased onto the
latest stored snapshot or presented for explicit conflict resolution.
Global templates open with **Preview With → Neutral**: sample identity, menu
links and page/post documents. **Preview With → Test / Test2** supplies that
site's content without changing the editing site, URL, saved sources or history.
The choice is temporary and returns to Neutral on a fresh load. Loading or
unavailable site content is identified while neutral examples remain visible.
**Preview Content** selects a document from the chosen preview; **Width** provides desktop,
tablet and mobile canvas sizes. Zoom is independent of that viewport choice and
is available from the toolbar or with Command/Ctrl + plus/equal, Command/Ctrl +
minus/underscore and Command/Ctrl + 0 to reset to 100%. These shortcuts only
belong to the focused template workspace and leave text, code and form editing
to the browser. Template design controls edit global originals. Identity, navigation links and
social/support links are supplied by the preview choice and remain read-only. Styles lists the entries sharing its presentation settings.
Ordinary paragraph style overrides take precedence over those tokens.

Template Edit and Preview use a white canvas without a shadow and the same pale
off-page background as the content editor. These workspace colours do not
override authored template or block backgrounds.

The block inserter also offers Social Icons. Add LinkedIn and TikTok inside it,
then select each child in the canvas or List View to enter its profile URL.
The parent controls orientation, justification, size, labels and whether links
open in a new tab. Existing footer social/support template elements remain
readable; authors can replace or supplement them with the block.
The Copyright setting supports `{copyright}` (©), `{year}` (the current year)
and `{site-title}` (the Site Name). Values resolve when a template is rendered;
unknown brace-wrapped text remains unchanged. The initial neutral Footer uses
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
value. Title, Subtitle and Featured Image are also selectable dynamic blocks;
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

Templates and shared parts support Rename, Duplicate, Move to Bin and Export
from their individual action menus. Create a Page, Post, Header or Footer directly
from the library, including when it is empty. Creation uses the same internal
library context regardless of which entry was previously selected. **Save as
Template** asks for the template name and reusable defaults, with no destination
set. Imports appear as individual entries in the same list; older multi-entry
packages remain readable. Export includes only the selected entry and its
referenced shared parts and overlays, with the required presentation and media.
New, duplicated and imported layouts do not become the default automatically.
Enabling a default clears other defaults of that document kind. Existing legacy
flags are retained until deliberately changed.

Named-set management is not offered. Legacy backing context IDs remain internal
compatibility data because they own styles, site identity, menu links and shared
part references. They are not displayed as library groups or editable names.
Existing contexts are not merged: doing so would replace different styles and
menus. Existing templates still share their original parts; new library entries
share the unnamed creation context. Part and Overlay pickers retain those
reference boundaries, so a legacy part from another context is not automatically
copied or linked into a new template. Cross-context shared references require a
separate versioned contract change.

Assigned templates cannot be moved to the Bin until their documents are
reassigned, restored from the Bin or permanently deleted. Referenced shared
parts remain protected. Restore returns individual entries to the same flat
library with their original IDs and references. Legacy binned collections remain
recoverable through the Bin. A restored post also regains its local published
snapshot. The Bin does not empty itself and is included in full Studio backups.

## Storage and portable contract

Title and Featured Image settings survive the shared editor projection and template saves, including block alignment, image dimensions, aspect ratio, fit, focal position, link behaviour and visual styling. Fixed-image and hidden-image settings remain template-owned.

The template-store and JSON package schema is **v0.31.0** (`0.31.0` in JSON).
`TemplateSet`, `PageTemplate`, `TemplatePart`, `TemplateNode`, `SiteStyles` and
`TemplateAssignment` are defined in `app/studio/template-model.ts`. `SiteStyles`
is the versioned `UniversalStylePreset` contract from `@acm/styles`, and newly
created library contexts receive an independent clone of its universal defaults. Assignments
reference Studio document IDs. The local-storage key is
`acm-studio-templates-v1`; an absent key means no templates. Invalid or unsupported
data disables template writes without replacing the original value. **Export
Original Data** retains its raw contents for recovery.

Template pane colour controls edit the palette stored with the current template
context. Each modified colour can be reset independently to its current
`@acm/styles` global default. These values remain context-specific after editing;
the editor preview's colour picker supports pointer dragging and keyboard input.
The saturation/brightness plane previews a drag locally and commits its final
colour on pointer release, keeping the picker open while the global save is in
progress.

Body Typography and Shared Layout also offer individual Reset actions only
where values differ from the shared default. Resets use the latest successfully
loaded saved shared styles; unsaved UI Library previews are not defaults.
Offline and hosted sessions retain their last valid or bundled defaults.
Size, line height and letter spacing reset only the desktop metric shown in
the pane, preserving tablet and mobile values. Each reset uses template history
and can be undone. Reset all styles restores the palette, complete body
typography (including responsive metrics) and shared layout in one undoable
action. Other typography roles, blocks and site-owned links remain intact.

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

Templates live in the integrated Content Studio at `/studio?mode=templates`.
The old `/studio/templates` route redirects there, preserving the selected
`set` and `target` query parameters. The Templates badge counts individual
Page/Post templates and shared Header/Footer parts. Selecting an entry opens
the editor directly. **Templates** returns to the single library list.
Create, Rename, Duplicate, Export, Import and protected Bin actions use the
existing ownership and template storage contracts. Legacy `set` IDs remain opaque
route parameters so entries with matching IDs in different old contexts remain
unambiguous. A missing target returns to the list instead of editing another item.

Layout options, Spacer, document metadata, dynamic document-field blocks,
root-level Group sticky positioning, Gutenberg's Huge Social Icons size and
managed Quote/Group background images are additive to the existing typed block
contract. Group Row and Stack layouts also support Gutenberg's Space between
justification. Table cells preserve per-cell header tags and scope. Workspace
data is now version 25, with readers for versions 2–24; local publication
snapshots are version 18 with readers for versions 1–17. Full backups use
version 5 and read versions 1–4; they include both browser recovery templates and
a validated shared-library snapshot when available. Template packages are v0.31.0, with readers for v0.1.0–v0.30.0.
Group HTML elements, ARIA labels and block alignment, Columns alignment and
Section visual styles round-trip through the editor, owned storage, portable
packages and local publication snapshots. Resetting a field clears it rather
than recovering an earlier source value. Root output uses padding-relative
Wide/Full expansion; constrained Groups pass alignment to their child wrappers.
The v0.25 reader retains Math, inline Image and extended Language objects.
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
their existing presentation. A Featured Image template element may optionally
store a managed fixed image; when absent, it continues to resolve from each
document's featured image. A hidden Featured Image element remains invisible in both
document Edit and Preview; it does not create an editing placeholder or discard
the stored image. The document inspector retains featured-image access. Header,
title and metadata elements belong to the assigned template, while their values
resolve from the document and site.

Featured images use the same Featured Image presentation in document Edit,
Preview, template authoring and UI Library examples. Empty covers share a 16:9
placeholder unless authored dimensions or aspect ratio specify another size.
Resolved images retain their natural size or explicit width, height, scaling and
focal position. Template authoring uses the same neutral placeholder in both
modes for dynamic covers; fixed covers resolve their own image. Editing actions
overlay the shared box without adding spacing. Explicitly removed document
covers remain absent; template placeholders do not modify saved image data.

The document inspector previews the selected featured image with overlaid
Replace and Remove actions. Files applies a featured image directly using its
existing alternative text; ordinary body-image insertion retains its description
dialog. Template image actions use the shared centred overlay. A hidden template
image offers Restore in authoring Edit; it remains absent from document views
and template Preview.

Global template peers reconnect their saving channel on foreground refresh.
Other Studio routes can wake the same global broker under the existing writer
lock. Connection status reflects saving availability. Exact own acknowledgements
retain Undo; foreign changes and merged acknowledgements clear whole-design
history so Undo cannot revert another tab's work. Unavailable insertion lines
are hidden until editing resumes.

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
Browser-managed package imports use
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
Welcome replies include up to 500 recent accepted transaction IDs. A peer uses
receipts for its own submissions in the same coordinator session to recognise
saved keystrokes before rebasing newer typing, including after a transport
timeout. Missing receipts remain conservative; actual competing edits still
require review. Queued edits use the committed revision known when dispatched,
so an update arriving before its acknowledgement cannot create a future revision.
Storage keys, sync protocol v2 and the lifetime writer lock are unchanged.

A missed heartbeat first probes the saving connection before pausing editing.
Each connection keeps one outstanding snapshot handshake, so subsequent
heartbeats cannot invalidate a delayed reply. Disconnected sessions retry
automatically; Try Editing Here and returning to the window also probe the
existing channel while retrying safe lock acquisition. A new owner's heartbeat
can recover a missed announcement, including when its revision starts lower.
The interface reports local saving state without assuming the saving runtime
belongs to a visible second tab. Unresponsive saving still pauses editing;
reconnection never steals the writer lock or discards a pending draft/conflict.
Workspace input, Undo and Redo register their pending draft synchronously,
before React renders or starts an automatic save. A reconnect reply arriving
in that gap rebases the draft rather than replacing the newest keystrokes.
This also applies to the saving owner: incoming peer updates merge independent
changes and retain genuine overlaps for review. Delayed render effects cannot
replace the current snapshot or submit an older version as a new edit. Saving
checks the current snapshot again immediately before submitting it.

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


## Navigation authoring

The Navigation element follows the project's pinned Gutenberg reference
(v24.1.0-rc.1, commit `e3ac73cd69d472341b66c43cb77be36e838f868e`),
with the Menu, Settings and Styles organisation shown in Andrew's Gutenberg
screenshots on 9 October 2026. The current
[Navigation documentation](https://wordpress.org/documentation/article/navigation-block/)
is a supplementary behavioural reference.

Navigation appears under **Theme** in the template editor's Block Library and
can be inserted at the root or inside an ordinary Group, Column or Section,
subject to structural child rules. It creates the existing
typed template element and uses the set's shared menu; it does not create a
new page-body block type. The isolated UI Library example at
`/studio/ui/blocks/navigation` uses the same canvas and inspector with temporary
links, Undo/Redo and Reset Example.

- **Menu** shows a compact hierarchy. Selecting an entry selects its canvas
  link. Labels can be edited inline; the link toolbar supports moving,
  duplication, deletion, link editing and adding a submenu. The existing link
  picker offers the site's documents, safe custom destinations, new-tab and
  nofollow controls. Selecting a menu entry opens its individual Page link pane;
  the compact menu list uses contextual row actions and a left-aligned blue
  appender. Fixture suggestions use stable document hash routes.
- **Settings** offers Off, Mobile and Always overlay visibility, click or hover
  submenus, submenu arrows and the navigation landmark's accessible label.
  Mobile uses the template surface's 600px container boundary, so it responds
  to the site viewport rather than the surrounding Studio window.
- **Styles** reuses the shared typography, colour and flex-layout controls.
  Text, Background, Submenu and overlay text, and Submenu and overlay background
  are independently editable. Root layout supports justification, horizontal
  or vertical orientation, wrapping and a 0–120px block gap. The Colour options
  menu controls visible rows and resets their values together; Layout options
  expose wrapping and block spacing. Advanced starts collapsed.

The live and library inspectors share 16px gutters, full-width selected icon-tab
indicators and a white pane surface. All interface text retains the shared 13px
system baseline. Menu controls use original ACM catalogue artwork; custom
overlay-template authoring remains outside the typed contract below.

Template v0.27.0 added Navigation settings and recursive links. v0.28.0 adds
per-link typography and CSS classes while retaining v0.1.0–v0.27.0 stores,
snapshots and packages, including prior inline objects.
A menu has at most 100 entries in total and five nested submenu levels below
its root. Duplicate operations renew every descendant ID. Fixture imports
claim recursive IDs and reject an over-capacity import without truncating
existing menu content. Removing a parent removes its descendants in the same
undoable transaction. An empty navigation landmark remains available to edit.

Selection never becomes saved content. Every change uses the current template
history and the selected site's revision and write-ownership path. Edit,
Preview, Website View and generated local HTML reuse the authored menu and
presentation. Runtime overlays use native disclosure semantics, a visible
close control, Escape dismissal, focus return and contained keyboard cycling;
submenus remain keyboard-operable regardless of the hover preference.

This is a Studio-owned typed menu: it does not import WordPress menu entities,
create automatic Page Lists or accept arbitrary menu inner blocks. The portable disclosure runtime is an
intentional adaptation of Gutenberg's WordPress runtime. Hosted publishing
remains a separate authorised operation.

Navigation overlays fill the preview page in Studio; layout containment on that
preview keeps the surrounding editor controls available. Standalone local output
uses the browser viewport.

Website View and Full Preview retain their scripts-only sandbox, which blocks
new-tab destinations. Check the authored new-tab behaviour on the local website;
generated output retains the link target and `noopener noreferrer` isolation.

### Page link children

Each Navigation entry is independently selectable as **Page link**. Its Content
pane groups Text, Link to, Open in new tab, View, Description and Rel attribute.
View opens a suggested fixture document on the local website in a new tab,
using the Sites pane’s fresh Project Ports address check. Safe custom
destinations also open in a new tab. Description is rendered as the link’s title attribute. Settings
contains collapsed Advanced controls for CSS classes. Styles uses the existing
shared typography controls; unspecified values inherit from Navigation.

The item toolbar provides parent Navigation selection, sibling drag/reordering,
link editing, submenu insertion, whole-label Bold/Italic, duplication and
removal. Command/Ctrl+B and I format the complete label. Rich inline fragments
and WordPress menu entities are not part of this typed contract.

Page link appears in the template Block Library when a Navigation is selected.
Insertion adds a canonical `SiteLink` after the selected entry, or at the end
of the root menu. It does not create a standalone body block or persist the
transient editor projection. The UI Library entry at
`/studio/ui/blocks/page-link` uses these same controls with temporary history.
Both link edits and insertion follow the existing template Undo/Redo, owned
saving and revision checks. Older version envelopes containing the new style
fields are rejected; the next save writes the current template version.

### Navigation overlay controls and layouts

Template v0.29.0 adds Show icon button, two-line and three-line menu icons,
and an optional `overlayPartId`. Older menus retain their three-line icon;
hiding the icon uses visible Menu and Close text. Off hides the overlay controls
without discarding their saved values. Mobile uses the existing 600px container
breakpoint; Always uses an overlay at every width.

Overlay templates are shared `TemplatePart` records with kind `overlay` in the
same set. The inspector's + creates, assigns and opens a part in one undoable
transaction through the existing template saving adapter. Default clears the
reference; Edit overlay opens the existing block editor. The initial Stack
contains one Navigation with the same canonical links. Its layout, colours,
spacing and additional blocks are editable. Close remains runtime-owned.
A single root Group fills the overlay viewport; this intentional frame sizing
does not alter ordinary block dimensions.

Overlays cannot contain Content slots or Navigation that opens another overlay,
including through shared-part references. References must stay in the same set,
remain acyclic and participate in expansion limits, cloning, duplicate-set ID
renewal, usage lists, Bin recovery and deletion protection. Overlay parts are
selected through Navigation rather than inserted as ordinary shared references.
The React preview and generated fixture HTML render the same layout and reuse
the same focus containment, Escape dismissal and focus-return runtime.

## Global templates

Templates reuses `StudioViewMenu` in the main header, including the shared
Responsive styles checkbox while a canvas is visible. Supported block styles
use independent Tablet/Mobile overrides; shared template styles and unsupported
marker settings remain Desktop controls. See [Responsive block styles](responsive-styles.md).
Focus Outline is available
throughout this section. Desktop, Tablet, and Mobile appear only while a
template canvas is visible and use the same viewport widths as Posts and Pages
in both Edit and Preview. Viewport selection is tab-local and separate from the
content editor's viewport. The template list, image picker, and site menu-item
editor expose Focus Outline without canvas controls. Document-only view modes,
Show Template, and Preview in New Tab are omitted. Standalone template specimens
retain their local Width control when no header view controls are supplied.

Template authoring surfaces share their rendered spacing with Preview. Their
editor wrappers add no border dimensions or toolbar reserves; selected controls
overlay the content without moving it. Shared canvas rules expose the toolbar
reserve as variables, which retain the content editor's existing defaults.
Template authoring alone sets them to zero and uses the canonical template gap.
Root template and standalone shared-part wrappers follow the same rule.
Column insertion controls also overlay the layout rather than adding height.
Both modes use the same resolved sample document; authoring placeholders for
Title and Subtitle remain consistent, and hidden featured images occupy no space.
Global-original Navigation uses the shared runtime layout in both modes, with
canvas-link selection retained for read-only inspection of site-owned links.

The Templates list opens one global library independently of the selected site.
The chosen Posts, Pages, or Templates tab travels with site and Studio Drafts
navigation through the URL, independently of each context's active document.
Global template targets may travel too; site-owned targets don't cross contexts.
Every site uses the original layout and styles. There are no site template design
customisations, colour overrides or reset controls. Old site-scoped entry URLs
map through stable aliases to the canonical original. Context and entry IDs remain
internal compatibility identifiers; equal names never establish shared ownership.

Global originals are saved through a local, exact-origin, ownership-protected CAS
gateway to `work/global-template-library.json` (global contract v3, reading v1–v2). The file is
server-readable and is the source for both generated local websites. The first owned read in each gateway process also refreshes both outputs for the
current global revision, completing recovery when the source migration was already
saved before a restart. Later reads skip that refresh after both outputs succeed.
A save refreshes both previews from fresh site sources without changing site revisions.
Each HTML output records the global revision independently. Partial refresh
failures preserve the saved original and identify the affected preview; reconnect
before retrying. Source replacement retains revisioned recovery copies in
`.studio/global-template-history/`. Both directories contain local data rather
than committed application source.

The first owning session initialises originals from validated fixture sources.
Shared IDs and entry kinds establish existing common ancestry; the explicit
`siteNavigation` role retains each fixture’s canonical menu content owner. In v3,
the shared Header contains Navigation. The separate Navigation original is retired
into `navigationRecovery`; its now-empty context and stable aliases remain private
content carriers. The active library offers Header, Post, Page and Footer.
The explicit `header` role identifies the shared fallback without matching names.
Existing Presentation and custom templates lacking a visible Header receive this
Header; assigned templates already containing a Header render it once.
Old Navigation editor addresses resolve to Header. Migration preserves site sources,
assignments, publication records and all links. Only owned gateway initialisation
persists v3, retaining the exact previous source in revision history and checking
readback; a read-only read never writes. Ambiguous existing Header roles block
migration for explicit recovery rather than guessing.
Existing local designs and previously stored override patches remain recoverable
in the site source and backups, but never affect the rendered global design.
Ordinary content saving preserves those legacy records. Unbound legacy designs
are not offered as independent site templates. New global originals become
available to every site through stable IDs.

Identity, authored menu links, social links, document assignments and document
content remain site-owned. The template canvas defaults to neutral examples,
with optional Test and Test2 previews. These render projections never enter the
saved original or a site source; editing template design changes the original for every site.
The site adapter rejects design edits even if a caller bypasses the interface.
Site source v5 retains compatibility bindings and legacy recovery data while
reading v1–v4. No new site presentation override patches are authored. Legacy menu and social per-link styles
are stripped recursively from effective links and retained by link ID during
content saves for recovery. Site-only link style or CSS changes are rejected.

Before initialisation, readers can browse a deterministic read-only projection;
site writes remain paused. An older owning tab must reconnect before global
editing becomes available. There is no unlocked persistence fallback. Original
editing uses the existing typed tab broker: compatible peer edits merge and
an overlap requires an explicit choice. Failed or uncertain saves preserve the
local draft and offer a complete library export before reload or conflict choice.
Dedicated previews load originals read-only. Unused originals may move to the global
Bin once current assignments, published selections, default choices and shared-part
or navigation references are resolved. Retained designs and source history remain
recoverable and do not alone prevent a move.

**Export Saved Global Library** includes originals and migration bindings.
Import restores originals after explicit confirmation; it does not enable site
design edits. Site backups include the global library alongside the aggregate.
A site restore refuses a different library: restore that library explicitly first,
then restore the site. Entry packages carry portable designs and create a new
global original rather than silently matching a name. Local publication snapshots
remain frozen until their existing Update action.

### Editing a site’s navigation items

In Templates, **Edit navigation** is available in Studio Drafts, Test and Test2.
**Navigation target** chooses Studio Drafts, Test or Test2 and initially matches
the selected context. It is independent of **Preview With**: changing either
choice does not change the other or switch the sidebar's site context. The menu
editor names its editing target. Use **Add navigation link**, select a row to edit
its text or destination, and use its options menu to move or delete it.

Test and Test2 use their existing local aggregate autosave, Save acknowledgement,
Undo/Redo history and conflict recovery. Studio Drafts uses its existing browser
template ownership and synchronisation session; navigation-only transactions
retain recovery designs, stable aliases, assignments and Bin records. A missing
retained Navigation record is materialised from its shared projection without
clearing the existing menu. No global original is edited by a menu transaction.
Only authored menu content changes. Colours, alignment and other presentation
remain inherited from the Navigation element within the global Header, including at Tablet and
Mobile preview widths.

Changing the navigation target, closing the editor, or choosing another Studio
screen settles inline fields and waits for the owning save acknowledgement.
Invalid input, unresolved link popovers, conflicts and save failures keep the
current editor and draft available. Browser Back and Forward remain paused until
the navigation editor is closed. Escape dismisses open menus/popovers first,
then closes navigation editing and returns focus to **Edit navigation**.

### Studio Drafts and the shared library

The Templates badge shows the same shared-library count in the Posts, Pages
and Templates views. Studio Drafts owns its content and assignments, identity, menu links
and social links; shared originals own presentation. Existing browser template
sets remain in their original storage for recovery and media protection. A
read-only projection resolves their IDs against shared originals without
replacing those stored designs. Assignment changes use the existing browser
writer, synchronisation and Undo history. New shared references append any
missing reader-valid records without replacing existing artwork. Save as template
in Studio Drafts creates a retained global original. Creating an original does
not advertise Undo that would remove it; shared design edits retain Undo/Redo
in Templates. Unused originals support Move to Bin, Undo and Restore. Published browser snapshots retain their immutable
presentation until Update.

Ambiguous or unmatched active assignments preserve the old presentation and
pause editing. The document inspector offers an explicit shared-template choice
or Existing Presentation; resolving one document preserves all other
assignments. Names alone never establish ancestry. Unmatched deleted documents
and legacy template Bin entries remain recoverable in full backups for manual
recovery. Importing a design renews its IDs and does not automatically resolve
a deleted document’s original assignment. Such documents remain in the Bin.
Legacy designs cannot be restored over a shared original from the browser Bin.

Backup v5 includes the raw browser originals and, when loaded, the shared library
as a recovery snapshot. Shared and migration-base media references must be
present in the backup. Browser restore restores local content and assignments
against the current shared library. It does not replace global originals for
all workspaces. A checked backup offers Export shared templates from backup;
use the Templates import workflow to recover those designs deliberately.

### Library entry ordering

Posts, Pages, and Templates in Studio Navigation can be dragged before or after
another entry in the same tab. Alt+Up and Alt+Down move the focused entry by one
position. The insertion line marks the destination; cancelled, stale, foreign,
and unavailable drags do not change saved data. Selection remains on its stable
ID and normal Undo/Redo applies.

Document ordering changes only occupied slots of its own kind in the existing
workspace/site aggregate. It does not alter document fields, publication
snapshots, or authored site navigation. TemplateStore v0.30.0 keeps a validated
`libraryOrder` array of `{ id: "setId/entryId", setId, entryId }` records. Legacy
readers materialise the existing list sequence; missing new entries append in
their existing sequence. Removed/Bin references remain inert and bounded so
restoration can recover their position. The order may mix templates and shared
parts from different retained contexts without moving their designs. Full
backups and shared-library imports retain the metadata; single-entry exports
retain their existing dependency context.

Ordering uses each domain's existing owner, saving gateway, revision checks,
and tab synchronisation. Independent field edits can merge with a move;
concurrent changes to the same list order require the existing conflict choice.

### Common Advanced fields

Buttons, LinkedIn, TikTok, Reading Time, Navigation and Page link expose HTML
anchor, Additional CSS class(es), and Additional CSS through the shared controls.
Navigation retains Accessible label as its fourth field. Page link anchors and
bounded CSS declarations require template v0.31.0; older packages remain readable.
Edit, Preview and local output use the same safe anchor, class and declaration
helpers. Only one presentation owns each link anchor. The shared navigation runtime
hands the ID between desktop and overlay copies when the existing container
breakpoint changes, including custom overlay submenus. Classes and appearance
remain the same.

### Container block availability

Studio does not expose Manage allowed blocks during the foundation phase. The
editor offers every structurally supported block in each container. Legacy
`allowedBlocks` metadata remains validated and preserved in drafts, templates,
HTML round trips, and backups for recovery, but does not filter insertion, paste,
movement, or transforms. Structural child rules and template-specific restrictions
remain enforced.

### Manage dependencies and the global Bin

Each template’s context menu offers **Manage dependencies**. Its grouped inventory
shows Studio Drafts, Test and Test2 document assignments, published local layouts,
documents in the Bin and default choices. Select individual uses, an owner or all
assignments, then review a same-kind replacement or **Existing presentation**
detachment. Detachment freezes inherited author, category, tags and parent values;
content bodies and editorial statuses remain unchanged. Fixture publication layout
changes update the local preview without recapturing draft content. Browser
publications already carry independent immutable design snapshots.

Each owner saves through its existing writer and revision checks. Studio Drafts
prepares editorial metadata before saving assignments, keeping the old layout if
assignment saving fails. Results distinguish completed saves and partial failures;
later owners stop after a failure, and completed saves are not rolled back over
newer edits. Refresh the selection before retrying stale dependency rows.

Shared-part and site-navigation references appear as protected dependencies. Open
the referencing template to resolve them. Raw recovery designs and source history
remain available, including legacy aliases; names never establish ownership.

Move to Bin is enabled only when no active dependencies remain. The gateway checks
fresh fixture sources and the existing browser writer’s current reference inventory.
A shared mutation queue orders local fixture assignment saves and global removal;
browser reference writes use the existing ownership coordinator and a corresponding
reference gate. Removed originals cannot be reintroduced by stale assignment saves.

The Bin has a separate **Global templates** section in every site context. Command+Z
(or Ctrl+Z) reverses a move and **Restore** brings back the same original IDs and
design, including required shared parts. Redo remains available through ordinary
shared history. Foreign saved changes clear that whole-design history to avoid
reverting another tab. Global permanent deletion is unavailable. Bin records and
backing contexts remain in library v2 exports and backups; v1 remains readable.
