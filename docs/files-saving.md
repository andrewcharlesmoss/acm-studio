# Files saving across Studio tabs

Files is one browser-local library shared by all Studio routes. Ordinary file
and folder actions can be submitted from any connected tab. A single saving
tab holds the existing lifetime `acm-studio-writer-v1` Web Lock and performs
the IndexedDB writes; peer tabs never write the library directly.

## Commands and recovery

The `acm-studio-media-v1` BroadcastChannel contract accepts only validated
upload, create folder, update metadata, rename, colour, move and delete
commands. The saving tab serialises these with direct Design media writes.
Metadata edits compare the fields originally displayed with the current saved
fields. Independent changes merge; overlapping changes require review of the
latest details before Apply my change. Existing referenced-file and non-empty
folder deletion protection remains in force.

IndexedDB schema v2 adds operational command receipts and a library generation
to the existing assets and folders. Each ordinary command commits its receipt
and content changes in the same transaction. The submitting tab captures the
command before sending it. A reconnect resends that same captured request, so
later changes to a form cannot alter an action already awaiting confirmation.
A committed upload or deletion is acknowledged without repetition.
Requests expire after five minutes; receipts are retained for 24 hours, with a
10,000-action bound that rejects new actions rather than evicting live receipts.
Uploads are limited to 64 files, 100 MiB per file and 512 MiB per batch.

The saving owner advertises `image-renditions-v1` once its live media store
supports generation. A peer checks this capability before requesting sizes.
If an owner without it takes over mid-request, check the saved image before
retrying. Ordinary v1 commands retain their existing reconnect behaviour.

Restore and library replacement remain exclusive operations using the existing
restore permit. They atomically replace the library generation and clear its
operational receipts. Pending commands from the previous generation require
review; they cannot silently apply to restored content. Receipts and generation
are excluded from portable media exports and backups.

### Complete browser backups

A complete backup reads Files and the saved browser documents, revisions,
publications, templates, and designs together. This works from a read-only tab.
The editing tab can include pending document edits when their saved base still
matches. If Studio reports a conflict, keep that tab open, resolve the changes,
and retry. The optional shared template library comes from its own gateway.

If a tab or the browser closes during a full restore, reopen Studio at the
same address in the same browser profile. Before editing resumes, Studio checks
which Files generation committed and recovers its matching documents,
publications, designs and templates. Once recovery is acknowledged, later
edits take precedence. If another tab attempts a complete backup while recovery
is pending, Studio asks you to finish recovery and retry the export.

To make this possible after a browser restart, IndexedDB keeps one recovery
copy of those four records. A rollback preserves the original stored text,
including unreadable values. The copy contains no media blobs, stays in this
browser profile and is replaced by the next full restore. If recovery stays
blocked, keep the original profile intact. Restore a checked backup through
**Backup and restore** in a separate browser profile and inspect it there.

Every successful media write sends a small change notification. Open file
libraries read one coherent IndexedDB snapshot, retaining search, selection,
folder location and unfinished metadata fields. Content and template editors
also refresh media object URLs when the contents of an existing image change.
Removed-item drafts remain visible for copying or explicit dismissal. Failed
actions retain their intent while latest details are unavailable. Initial saving
failures are shown and retried automatically without an unlocked fallback.

Image insertion still requires permission to edit the destination document or
template. A picker rechecks the saved image before inserting it. Files command
availability does not grant permission to change an otherwise read-only editor.
Design's own media-export controls and full backup/import operations retain
their existing ownership requirements.

Replacing a body Image captures its document or template owner, block ID and
source when the picker opens. The current owning transaction checks them again;
a removed, retyped or independently replaced block leaves the picker open.
Replacement changes the media source and chosen alternative text while keeping
the block's identity, appearance, link and editorial settings. A selected media
caption replaces the block caption and its rich-text projection; an empty media
caption preserves the authored caption. A no-op preserves Undo and Redo. The
normal owner still reports and recovers any later asynchronous saving failure.

## Recovery compatibility

See [Storage formats](storage-formats.md) for the live IndexedDB version.
Only the owner opens the database for upgrade. The v3 migration renames the
asset store in one native transaction, preserving the original bytes and keys.
Unrecognised legacy rendition data aborts the upgrade. Read-only tabs open
the existing version without requesting an upgrade.

Before rolling back the UI or broker, export and verify a complete backup
using a compatible writer. Check the recovery build against a disposable copy
of the current schema. Older builds that explicitly request v1 or v2 cannot
open a database already at v3. Keep the database intact and use a compatible
forward fix if a candidate cannot read it.

## Manual verification

Keep two ordinary Studio tabs open and open Files in each. Rename or recolour
the same folder from each tab in turn; both views must update without reloading.
Start different names in both tabs, save one, then save the other: the second
must retain its name and offer a comparison with the latest saved name. Apply
my change and Use saved version must both work without silent replacement.
Restore the original name and colour after checking.

Retain unfinished text while the saving tab reloads: the remaining tab must
reconnect without remounting Files or discarding that text. Check creation,
upload, moves and deletion only with authorised disposable records. Permanent
deletion and full restore checks require a defined recovery position. Also check
an image picker when another tab removes its image: insertion must not use the
stale picker record, and typed alternative text must remain available.

### Media database verification

Run `STUDIO_BROWSER_CHANNEL=chrome npx playwright test tests/browser/media-store-adapter.spec.ts`
against a disposable Studio origin to exercise native IndexedDB, broker handling,
original-byte preservation, and restore ownership loss.
