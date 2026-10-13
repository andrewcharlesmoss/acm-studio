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
and content changes in the same transaction. A reconnect resends the same
request, so a committed upload or deletion is acknowledged without repetition.
Requests expire after five minutes; receipts are retained for 24 hours, with a
10,000-action bound that rejects new actions rather than evicting live receipts.
Uploads are limited to 64 files, 100 MiB per file and 512 MiB per batch.

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
