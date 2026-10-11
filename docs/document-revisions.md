# Document revisions

## Using saved versions

Open a page or post, choose its **Page** or **Post** pane, then open **Revisions**
and choose **Browse saved versions**. Select a saved date to preview that version.
Browsing never replaces the current draft. Close or press Escape to return to it.
The preview shows saved editorial content using the current block renderer, not
a historical template or published website snapshot. Preview links cannot navigate.

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
