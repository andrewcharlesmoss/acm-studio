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

The existing v1 channel recognises a reserved image-size generation command,
but the current saving owner does not advertise or execute it. A connected tab
must see the `image-renditions-v1` capability before sending that command. If an
owner without that capability takes over while a request is pending, its result
is uncertain and the tab asks the user to check the current image. Ordinary v1
commands retain their existing reconnect behaviour. Image-size generation and
the versioned media migration remain unavailable until their storage and backup
paths are integrated.

Restore and library replacement remain exclusive operations using the existing
restore permit. They atomically replace the library generation and clear its
operational receipts. Pending commands from the previous generation require
review; they cannot silently apply to restored content. Receipts and generation
are excluded from portable media exports and backups.

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

The v2 upgrade adds operational stores without changing asset or folder records.
Do not delete the database to recover from a saving error. Export a full backup
through v2-compatible Studio before reverting application code. Retain the
version-independent reader and v2 schema support when rolling back the command
UI or broker: a historic reader that explicitly opens schema v1 cannot reopen
an upgraded database. Restore content through the owned replacement flow;
IndexedDB schema versions are not downgraded.

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
