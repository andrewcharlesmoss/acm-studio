# Document revisions

## Using saved versions

Open a page or post, choose its **Page** or **Post** pane, then click the number
beside **Revisions**. The number counts distinct retained editorial versions,
including current saved content and labelled legacy recovery snapshots. If the
count is not available yet, **View** opens the history and reports any load error.

The full comparison screen follows the
[WordPress classic revisions reference](https://wordpress.org/documentation/article/revisions/#classic-revisions)
shown by Andrew on 11 October 2026. Its timeline runs oldest to newest. Drag the
slider or use **Previous** and **Next** to select a version. Keyboard arrows,
Home and End use native range behaviour. By default, **Removed** and **Added**
compare that version with its preceding retained version. The earliest version
compares with empty content. Dates identify both sides of the comparison.
**Compare any two revisions** adds a separately labelled **From** slider;
**To** remains the version eligible for restoration. Studio uses two native
ranges rather than WordPress's combined two-handle slider.

Title and content show unchanged lines alongside removals and additions, with
additional highlighting for changed words. Content uses Studio's canonical HTML
inspection format, rendered as escaped text. Changed editorial fields have their
own sections. Expand **Block data changes** for the complete typed block diff,
including settings absent from that HTML format. Large changed regions use a
bounded comparison and remain complete; long lines receive whole-line highlights.
Long tables reveal 500 lines at a time through **Show More Lines**.

Browsing never replaces the current draft. **Go to Editor**, the close control
or Escape returns to the editor and restores focus to the Revisions count.

**Restore this revision** first waits for the current draft to be saved. It then
restores the selected document through the existing Undo history and save flow,
and closes after saving is confirmed. A failed or conflicting save stays visible;
the draft and Undo remain available. Closing a pending dialog does not cancel a
dispatched save. **Undo** reverses restoration; **Redo** reapplies it.

Restoration includes the title, subtitle, slug, excerpt, author, tags, SEO fields,
blocks, featured image and document display overrides. It preserves the current
document ID and kind, publication status and dates, categories, parent and
template assignments. Other documents, site menus and global templates are
unaffected. Restoring a published document does not republish its frozen browser
publication snapshot. A local Test or Test2 save updates its generated local
preview through the existing gateway; it does not publish to the hosted site.

Browsing remains available when editing is read-only; restoration requires a
writable connection. Dirty HTML must be applied or discarded before restoration.

## Storage and retention

Studio Drafts stores revisions atomically with successful owning workspace saves
in envelope v25, reading v2–v24. Unchanged content does not create another
revision. Older browser documents acquire an initial baseline on their next
save; earlier versions cannot be reconstructed. History retains up to 100 records
across the workspace and at most 2 MiB of serialised revisions, evicting oldest
records first. An individual oversized document may have no retained revision.
This is local recovery history, not an unlimited or remote backup.

Undo does not remove saved revisions. Workspace exports and full Studio backups
include fresh persisted history. Referenced browser media cannot be deleted while
a retained revision needs it. Moving a document to the Bin retains its history;
permanent deletion removes that document's revision records on the owning save.

Test and Test2 use their existing `.studio/history` aggregate snapshots, bounded
to 100 retained files, plus current source. The read-only, session-bound gateway
validates each source and hash and returns only the selected document. The dialog
collapses repeated content. New gateway saves record hash-bound confirmation
metadata after the source and preview transaction succeeds. Unmarked legacy
files remain available as **Retained snapshot**, using file times; they can
include recovery candidates that were never saved successfully and are not
claimed as confirmed saved versions. Current source is always confirmed.
Retention depends on saves anywhere in that site, so each document does not have
100 guaranteed versions. Site backup files contain the current aggregate, not
the gateway's disk history. No second browser history store is introduced.

The isolated Mini Golf editor does not expose this control. Its existing Undo
and storage contracts remain separate.
