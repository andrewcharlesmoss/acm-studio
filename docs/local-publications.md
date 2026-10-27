# Browser-local publications

Studio Drafts Pages and Posts share the owned publication snapshot store and
renderer. Publish captures blocks, metadata, featured image, effective document
visibility, and a self-contained template snapshot. Later draft edits do not
change that capture. Save replaces a published capture; Save Draft only saves
authored workspace data. Existing status-only Published Pages gain their first
capture when Save is deliberately selected.

Pages use `/pages/<slug>`; Posts use `/writing/<slug>`. The Writing archive reads
Posts only. Addresses are unique within each kind, so a Page and Post can share
a slug. Link suggestions and dynamic document links use the same address helper.

Returning a publication to Draft, Pending, or Private withdraws its capture.
Scheduled captures are withheld until their date by the local preview browser;
there is no server scheduler. Password gates reuse the existing local preview
implementation and do not secure browser storage or create hosted access control.

Moving a document to Bin retains its publication and template assignment while
withdrawing its local view. Restore recovers them through the existing rollback
flow. Backups retain both kinds, including Bin captures. Active and binned
captures protect referenced media. No hosted publication is performed.

Publication envelope v20 reads v1–v19, treating absent kinds as Posts. The legacy
`posts` collection holds typed captures to preserve existing storage and backup
boundaries. Workspace v27 reads v2–v26 and permits Page captures in Bin; older
explicit workspace versions cannot claim this capability. Unreadable persisted
publications block mutations and remain recoverable.

## Manual acceptance

Use a separate example Page, leaving existing content unchanged. Publish its
first paragraph and open View page. Change the paragraph in Studio and reload
the local page: the first version remains. Save and confirm the new version
appears. Return to Draft and confirm the local view is unavailable. Republish,
move to Bin, and restore; the captured version returns. Confirm the Page does
not enter Writing, and inspect its publication at desktop and mobile widths.

The implementation was checked through this browser flow on 16 October 2026.
The disposable example remains recoverable in Bin. TypeScript, targeted ESLint,
and the production build were checked. Automated tests were not run or added;
existing canonical-version expectations were updated for the envelope changes.


Image and Featured Image support Classic (3:2), Classic Portrait (2:3), and
Tall (9:16) aspect ratios. These values require workspace v30, publication
v22, template store/package/snapshot v0.34.0, clipboard v7, fixture source v13,
and global template library v5. Older versions remain readable and reject new
values in identifiable Image and Featured Image data. Ambiguous legacy
ratio-only recovery overrides remain readable and are never applied to live
global designs; see `docs/test-site-integration.md`. Backup envelopes retain
their existing versions and validate the versioned payloads they contain.


Quote content presentation adds portable block spacing and aggregate Heading
foreground, background colour, and gradient. These fields require workspace v31,
publication v23, template store/package/snapshot v0.35.0, clipboard v8, fixture
source v14, and global template library v6. Earlier envelopes remain readable,
including the previous image-ratio formats, but reject the new content fields.
Website design settings with similarly named fields retain their separate
ownership and version history. Backup envelope versions are unchanged.


## Authored Image Duotone

Authored Image Duotone is frozen with publication content and retained in HTML export without changing source files or captions. See [the authored Image contract](templates.md#authored-image-duotone) for None, inheritance, and format compatibility.
