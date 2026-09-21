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
content or a shared-part reference. Selecting an ordinary group before insertion
adds the new block or element inside that group. List View supports nested
selection, movement and removal. Every Page/Post template must retain exactly
one Content element. Shared parts cannot contain Content, reference a missing
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

Template sets support Rename, Duplicate, Delete, Import and Export. Additional
page/post layouts and header/footer variants can be created, renamed and
duplicated within a set. Reassign documents and replace part references before
deleting an item they use. Revert an assigned document to Existing Presentation
before deleting that document. Duplicate sets are independent copies, including
managed images; templates within a set deliberately share that set's parts.

## Storage and portable contract

The template-store and JSON package schema is **v0.3.0** (`0.3.0` in JSON).
`TemplateSet`, `PageTemplate`, `TemplatePart`, `TemplateNode`, `SiteStyles` and
`TemplateAssignment` are defined in `app/studio/template-model.ts`. Assignments
reference Studio document IDs. The local-storage key is
`acm-studio-templates-v1`; an absent key means no templates. Invalid or unsupported
data disables template writes without replacing the original value. **Export
Original Data** retains its raw contents for recovery.

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

Layout options, Spacer, document metadata and dynamic document-field blocks are
additive to the existing typed block contract. Workspace data is now version 5,
with readers for versions 2–4; local publication snapshots and full backups are
version 4, with readers for their earlier versions. Template packages are
v0.3.0, with readers for v0.1.0 and v0.2.0. Each Page/Post template may supply
Author, Category, Tags and Parent page defaults plus display defaults for
dynamic fields; legacy set-level defaults remain a fallback. Documents record
explicit value and display overrides, including empty values;
removing an assignment materialises the resolved values before detaching it.
Existing documents migrate with local overrides so their appearance does not
change. Older saved blocks and packages omit the new fields and continue using
their existing presentation.

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
own typed model and uses its established Gutenberg-provenance controls.

This feature does not migrate WordPress, apply designs to other project
repositories, alter Mini Golf drafts, add archives/listings, synchronise sets
between sites or publish online. Hosted settings and Design canvas remain
separate product capabilities. No release or deployment is implied by a local
template save or publication snapshot.
