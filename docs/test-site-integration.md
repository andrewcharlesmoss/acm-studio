# Test local editing integration

## Scope and ownership

Test opens inside the existing `/studio` editor. Select Test above
Posts / Pages / Templates or open `/studio?site=test`. All three tabs, their
counts, editing commands, categories, parent-page choices and template editor
use the selected site's source. **Studio Drafts** opens the original browser
workspace, including the recovery copies. The former `/studio/sites/test` route
redirects into this shell. The site's Visit Site icon opens the independent
preview discovered through Project Ports.
The pane and homepage share Local and Production edit/view action groups.
Test has no Staging target. Production opens its registered hosted website in a
new tab; Production editing remains unavailable until a hosted content adapter
is connected. The Local pencil selects Test through the existing editor flow.

Test owns `content/site.json`, envelope v5 (`acm-test-site`, site ID `test`). It
contains a collection of canonical Studio documents, categories, recoverable Bin
entries and a template store. `homeDocumentId` identifies the retained home page;
editor selection is local to each tab and cannot change it. Envelopes v1–v3 remain
readable and normalise to the same editable collection before their next accepted
save. The home page's header, main and footer remain semantic Group blocks. The
normal block library, document actions and inspector are reused.

Andrew authorised the existing browser test pages/posts to join Test on
9 October 2026. The first writable connection copies the complete browser
collection and its templates, assignments, categories and Bin in one source
transaction, retaining IDs and original records. A source-level
`browserImportComplete` marker prevents repeat imports. Browser originals and
publication snapshots remain untouched in Studio Drafts; subsequent edits to
these recovery copies do not update Test. Colliding IDs or non-portable media
reject the import visibly and keep every original. There is no automatic import
into other registered sites.

Visual changes use the revision-checked disk gateway. Creation, assigned document
delete/restore and template assignment changes share the aggregate's history.
Page and Post panes also expose saved content from the gateway's retained source
history through Revisions. Restore uses the normal site save and Undo flow,
preserving current publication state and document relationships. See
[`document-revisions.md`](document-revisions.md) for behaviour and retention.
The home page is protected from deletion. Test Backup exports/restores only this
aggregate, including templates and Bin, through the same validated saving flow.
Restores require confirmation and retain the previous source in gateway history.
Explicit restore completes the browser import decision, including for v1/v2
backups, so an older backup is restored without copying browser drafts again.
Browser media packages cannot be imported into Test templates; portable URLs are
supported. Switching between Test and Studio Drafts uses full-page navigation;
leaving Test first waits for a successful save. Failed saves preserve the current
context and draft. Editing and Undo/Redo pause during that save. Cached browser
history restores reload from the current source before editing resumes.
Files and Back to Content retain the selected site.
Multiple ordinary Studio editor tabs can edit Test on the same browser origin.
The saving tab borrows the current Studio session's exclusive write ownership
and claims only the Test server lease. Other tabs submit validated changes to
that tab; they never write directly to the gateway. No second Web Lock is acquired.

The browser holds only a session, selection and unsaved draft. `dist/index.html`
is generated with the canonical Studio BlockRenderer and TemplateDocument.
Each document has a stable `/#document=<encoded-id>` local-preview link; repeated
slugs cannot select the wrong document. A small static router switches rendered
sections, preserves the home and compares hashes with DOM attributes. Dynamic
title/cover/date links use the same explicit permalink. Template assignments and
field visibility apply in Edit, Preview and generated output. Output records the
whole source revision. These are local-preview routes; physical per-slug files
and hosted publication remain outside this integration.
Direct image URLs are portable. Featured image selection also imports PNG,
JPEG, WebP and GIF files through the existing snapshot-saving owner. Portable
image contract v1 uses `/media/acm-<media UUID>-<SHA-256>.<extension>` references;
the browser media ID is not stored as a document field. The owner validates the
selected bytes and transfers them with the normal lease- and revision-checked
save. Peer tabs never receive gateway write authority. Images are copied without
resizing, limited to 2 MiB each and 5 MiB per transfer (32 attachments). The JSON
request ceiling is 8 MiB; the existing 500 KB document and 1 MiB source/output
limits remain unchanged. Older servers must advertise featured image support
before a client may save these references.

Immutable copies live in the selected fixture's `content/media/` and
`dist/media/`. The gateway validates raster signatures, content digests and fixed
filenames, refuses symlinks and changed existing bytes, and installs copies before
committing source/output. Interrupted imports may retain unreferenced files;
this phase performs no image deletion. Publications, Bin entries and source
history therefore retain their image versions. A normal save or global preview
refresh repairs missing output copies from the canonical image files.
Studio reads them through a fixed-site, same-origin dev-only image route; local
website output uses the relative `/media/` reference. Temporary object URLs give
the selecting tab an immediate preview and never enter saved data.

Local site backup envelope v1 (`acm-local-site-backup`) includes referenced image
bytes, the site ID, source and optional global library. Old JSON source backups
remain readable. Restore validates all bytes before staging copies through the
existing browser media broker, then uses the normal site owner save. Backups are
limited to 10 MiB, with the same 5 MiB/32-image bundle limit. Unsaved-draft exports
also include referenced image bytes. Failed imports retain the picker, selection
and alternative text; the document is shown only after its save acknowledgement.

Browser media IDs, background media IDs and blob URLs remain prohibited in site
sources. This adapter applies to featured images; other browser-managed media
uses still require their own supported portable import. No hosted publication is
implied by a local image import.

Prompts are deferred. There is no prompt panel in the current editor. The
previous confined proposal service remains dormant and does not expand visual
editing permissions. Local saves do not publish or deploy through Sites.

## Local configuration and commands

Project Ports owns the Test preview server and its lifecycle. Its current URL is
`http://localhost:3005/`; Studio discovers it through the existing local bridge.
The Studio gateway resolves `STUDIO_TEST_PATH` server-side; its default is the
canonical sibling `../test` project. `STUDIO_CODEX_BIN` may select the installed
Codex executable. These are optional private local settings, never browser input. Explicit Codex
configuration is preferred. If it is absent, the adapter searches the server
PATH, then documented Codex/ChatGPT macOS application bundle locations, accepting
only an existing executable file. An explicit invalid setting fails closed.

From the ACM Studio root:

- `npm run dev` starts the Studio integration through its development server.
- `node --test tests/test-site-store.test.mjs` checks gateway and confinement
  failures without touching the real Test project.
- `node --experimental-strip-types --test tests/test-site-recovery-hooks.test.mjs`
  checks lease/session expiry, competing owners, pending edits, recovery exports
  and uncertain saves for both fixtures using disposable sources.
- `npm run typecheck`, `npm run lint` and `npm run build` check the application.
- `node scripts/render-test-site.mjs` is a one-time bootstrap for an approved
  initial `content/site.json`. It preserves the previous HTML in
  `.studio/original-index.html` and refuses an existing state file or writer lock.
  It is not the normal save command and must not overwrite an initialised site.

The gateway and prompt service are development-only. Building or committing
source does not push, save a Sites version or deploy the website. The existing
Sites project binding remains the separate publishing target.

## Saving, history and conflicts

A browser session uses an expiring random token, exact local origin checks and
Test-only operations. The Studio Web Lock permits one persistence coordinator;
the server's renewable owner lease and process guard coordinate file writes.
`.studio/writer.lock` contains a process identity; a second Studio process fails
closed while it exists. Vite's awaited close hook drains each fixture's queued
saves and removes only its own lock before a clean shutdown or restart completes.
An identity-checked synchronous exit fallback removes this process's own guards
when the bundled Miniflare signal handler exits before asynchronous cleanup can
finish. Source/output transaction recovery still applies to interrupted saves.
Forced termination such as SIGKILL may leave a stale guard requiring the recovery
procedure below.

Each save includes the SHA-256 revision it was based on. The service validates the
whole document, generates output, rejects source or output beyond the shared
1 MiB readable-file limit, rechecks source/output freshness, then saves
through temporary files and atomic replacements. Requests are serialised.
`.studio/state.json` records output hashes and a pending transaction. After an
interruption, reconnecting regenerates output only when the source and output
match a known pending state. Unknown external file changes stop editing and are
preserved. Do not edit generated HTML directly.

Test uses a separate room in the existing typed tab-synchronisation system.
Session tokens are never broadcast. Edits to independent block properties merge
automatically; overlapping changes require **Use Other Change** or **Use My
Change**. Paragraph text is one property, so simultaneous edits to the same
paragraph require review rather than character-by-character merging. A choice
uses the latest saved state and retains unrelated changes from other tabs.

An ordinary browser-draft editor tab can serve Test when another tab requests it.
Other Studio routes, including Design Canvas and the UI Library, mount lazy
Test and Test2 brokers too. They borrow the existing global writer lock when
woken by an editor; they do not acquire a second lock or save directly as peers.
Full-page site switches release the prior session. Another editor tab can take over,
loading the current source and rebasing pending edits before saving. Tabs retain
their own navigation, selection and unsaved draft. The owner checks and renews
its lease through an ownership-gated claim in the background and on foreground
return. This can reacquire a lease released by page-hide without displacing a
live owner; peers continue to read without claiming. An expired session or an
explicit lease rejection reconnects automatically after any save settles,
keeping the pending draft and its original base. The fresh saved source passes
through the existing owner/peer reconciliation before editing resumes;
overlapping edits require a choice.

The Studio writer acquisition is also cancelled on page-hide, revoking saving
authority before a cached history document's broker is suspended. Any
in-flight writes or restore finish before the physical lock is released.
Returning editor and Design Canvas pages retry acquisition and load fresh saved
data through their existing draft reconciliation before editing resumes.
Cached editor pages retain their in-memory draft instead of forcing a reload.

Visibility, page-show and focus events also refresh the connection. Foreground
return also retries the existing typed peer handshake directly,
so suspended background timers don't leave an otherwise available saving tab
disconnected. This retains pending drafts and transaction receipts; it does not
discard drafts or replay an uncertain gateway save.
Claiming still requires the Studio write lock, and stale writes remain denied. Other
failures pause editing and offer **Reconnect** and **Export Draft**; unknown save
failures are not retried automatically.

This arrangement covers Studio tabs on the same
origin. It does not synchronise separate browsers, different ports or hosted
sites.

`.studio/history/` retains up to 100 source revisions. In-session visual changes
share Undo/Redo within each tab. Reloading, handover or receiving another tab's
saved changes clears obsolete in-session history, preventing old Undo snapshots
from overwriting newer work.

On a connection failure or conflict, the current draft remains in memory.
**Export Draft** downloads the draft, base revision and any preserved prompt
proposal. **Reconnect** keeps and reconciles the draft for every connection
failure. Peer gateway renewal retains its synchronisation session and transaction
receipts. A missing request may retry with the same transaction ID against the
same owner, which deduplicates accepted and in-flight requests. If the owner
changes and an outstanding save cannot be confirmed from the fresh source,
Studio retains both versions for an explicit choice rather than replaying it.
An unreconciled draft's export retains its original saved base revision, even
when reconnecting has loaded a newer source. Once the draft is reconciled, its
base advances to that saved source. Late commit acknowledgements refresh the
save status after a suspended saving tab resumes.
An uncertain gateway response also requires fresh readback; an unresolved
outcome requires review. Do not rely on browser memory surviving a closed tab; export
unsaved content before leaving.

For a stale process guard after a crash, stop the owning Studio server and check
its recorded PID against the running process list. Remove only the affected fixture's
`.studio/writer.lock` after establishing that its owning process is gone, then
restart/reconnect. Never delete state, history or the source as a lock repair.
Review externally changed files against source history before resolving a hash
conflict; preserve copies and choose a reviewed source/output pair deliberately.

## Deferred prompt implementation

The prompt adapter uses a fresh empty temporary directory and an ephemeral
Codex app-server thread. It receives only the document snapshot and request.
It discovers inherited MCP names/transports, then starts a second process with
all those servers disabled and harmless dummy transports. Apps, plugins,
remote plugins, shell, unified execution, hooks, multi-agent, memories, JS REPL,
code mode and web search are disabled. Effective filesystem/network permissions (including inherited profile extras),
configuration and paginated MCP
tool surfaces are checked before any model turn; unexpected tools fail closed.

The verified local protocol uses a fresh named permission profile `studio_proposal_<random>`
(minimal filesystem read, network disabled), approval policy `never`, and a
structured `outputSchema`. Legacy `sandboxPolicy.readOnly.access` is rejected by
this installed runtime; do not substitute it without verifying the protocol.
The returned thread must resolve to read-only with network access disabled.
All server-initiated requests are rejected; unexpected completed tool items
reject the proposal. Processes and temporary directories are closed after each
request. A prompt never directly writes Test files or uses hosted connectors.

An accepted proposal must retain its base revision and pass the same document
validator as visual edits. The UI checks that its draft is unchanged before
accepting it, and the save gateway checks the revision again. Unsupported
requests leave the document unchanged and explain the limitation. Timeouts and
uncertain failures are not retried automatically.

## Verification boundary

The recovery-hook suite runs the production hook, synchronisation, ownership
coordinator and file gateway. It pauses browser callback delivery and advances
the gateway clock to reproduce suspension, page-hide release and expiry. It
checks competing leases, independent-change merging, overlap choices, peer
timeouts, recovery exports and lost save responses. These are controlled
lifecycle simulations; they do not establish macOS sleep or a browser's actual
back/forward cache behaviour.

Completion requires Test to open within the existing Studio shell while the left
pane retains its tools and shows the selected site’s tab counts and document lists. Verify the
full block library and standard inspector, visual edits saved to the actual local
website, ordinary blocks such as List / Table / Separator, Edit / Preview
agreement, reload persistence, Undo / Redo and switching to browser documents
without writing either context’s changes into the other. Confirm browser recovery originals, one-time import, site-scoped templates/backup/Bin, stable home and Back/Forward context. Verify two editable tabs, independent-edit merging,
overlap choices against newer saved changes, latest-keystroke preservation,
owner handover, failed saves retaining drafts and the recovery boundary.
Use representative desktop and narrow views with
Studio's declared horizontal-scroll behaviour.

Prompt evidence from the earlier implementation is historical and deferred; it
does not establish acceptance of the current interface. Hosted publishing and independent hosted prompt editing remain outside this integration.

## Test2 and switching between local fixtures

The registered local fixtures are Test (`test`) and Test2 (`test2`). Test2 starts
with a copy of Test's current collection and adjusted home/site identity; later
edits are independent. Both appear in the Sites pane in content and template
workspaces. Switching saves the current draft before a full context load; a
failed save retains the current site and draft.

Test2 source belongs to sibling `test2/content/site.json`, using v5 and reading v1–v4. Legacy
v1/v2 sources remain Test-only. The shared endpoint keeps its existing token
header but selects one of two fixed stores. Browser input never selects a path.
Source, recovery state, history, sessions, lease and process guard are separate.
Server and browser validation require the document's site ID to match that store.
Backup restore rejects another site's document. Wake and tab-sync channels are
scoped to the site; both brokers mount in an ordinary Studio shell so the global
Web Lock owner can serve peers from either site.

`STUDIO_TEST2_PATH` optionally overrides the canonical Test2 root on the server;
Test and Test2 roots must differ. From ACM Studio,
`node scripts/render-test-site.mjs test2` performs approved initial bootstrap
only. Do not copy `.studio`, Git metadata or Test's hosting binding. Project
Ports manages Test2's `test2-web` static preview service, initially at
`http://localhost:3006/`. Studio resolves its current port at visit time.
Test2 has a private Production Sites target at
`https://test2.andrewcharlesmoss.chatgpt.site`, with no staging. Its hosting
binding and manual publication procedure belong to `test2/AGENTS.md`.
Local saves, commits and previews do not publish; hosted editing is not connected.

## Website views

For local Test and Test2 content, the header's View menu offers Editing View,
Website View and Full Preview. Editing View retains the existing authoring
canvas and panes. The top menu is the standard Navigation element in a shared
Navigation part, referenced by the aggregate's `siteNavigation` set/part IDs.
Edit Navigation opens that selected block in the template editor. The Block
inspector edits labels, destinations and link order, and adds or removes links;
normal block commands and the site's shared Undo history apply. Preview links
select the document through the existing editor command. The same part surrounds
Existing Presentation and assigned templates in all views and local output.

Existing Presentation renders a selected document's featured image inside its
root Main group, following the site header. Documents without that region show
it before their body. This is transient presentation content, not an inserted
or saved body block. An authored Featured Image block retains its own placement;
removed and hidden images remain absent. Edit, Preview and generated output
reuse the shared image box. Generated output resolves the publication snapshot's
image, while an explicit draft preview resolves the authored draft's image.

Legacy collections seed their current document links with deterministic IDs;
the next accepted owned save stores v5 through the existing revision gateway.
Migration requires one free template-set slot; an existing collection at the
100-set limit is retained and reports that capacity problem instead of
installing an invalid migrated draft.
Subsequent document additions, renames or Bin moves do not overwrite authored
menu links. The one-time browser import appends its document links within the
same aggregate transaction, preserving the original browser records. The
existing Navigation limits apply: at most 100 links with 160-character labels;
legacy seeds use the first 100 documents and truncate labels at that boundary.
The referenced set and part cannot move to the Bin while supplying the site
menu, and validation rejects dangling references. Removing the Navigation block
hides the menu without regenerating it; Undo or Add Template Element restores
it. Navigation has its own template colour/typography scope. Its top-level
bar deliberately fills the page width with 16px vertical and 24px horizontal
padding, without the normal template card radius; document bodies and
page/post template assignments remain unchanged.

Website View renders the current aggregate draft through
`renderTestSite`, the same renderer used for local output, in a sandboxed iframe
without access to Studio's origin or stores. It starts on the selected document
and includes the site's navigation, templates and styles. Preview links can
browse other documents without changing the editor selection.

Desktop is 1200 × 800, Tablet 768 × 1024 and Mobile 390 × 844. Fit scales this
fixed browser viewport to the available space; 100% shows its actual pixels with
scrolling. Zoom controls and Command/Ctrl + plus, minus and zero work when the
preview workspace itself is focused. They do not capture editing or iframe
shortcuts. Full Preview hides the side panes and uses the available workspace
as its browser viewport. Its toolbar returns to Website View or Editing View.
These transient views do not save, publish or change the source. Unsaved Code
Editor text requires the existing discard confirmation before switching views.
The original browser draft and template editors retain their current views.

## Global template ownership

Test and Test2 retain separate documents, identity, authored menu links,
assignments, history and save revisions. Template designs belong solely to
Studio's canonical local library, described in `templates.md`; individual sites
cannot edit their layout or styles. Source v5 retains compatibility bindings,
legacy designs and any previously stored patches for recovery, reading v1–v4.
Those patches do not affect rendering. Normal content saves preserve the legacy
records instead of replacing them with the effective global design.

Global saves use their own CAS revision and refresh local output from fresh site
snapshots. Preview-only refresh does not alter `content/site.json` or its revision.
HTML includes `acm-global-template-revision` alongside the fixture revision.
Publication snapshots, Bin records and assignment IDs remain recoverable. Old
direct template URLs resolve to originals. Backups carry the global library;
restoring a mismatched library is a separate explicit step. Read-only bootstrap
never permits persistence before owned initialisation.

## Save Draft and local Publish

Posts and Pages use the shared Publishing inspector section. Status and UTC
publication time come from the retained publication snapshot, independently of
unsaved authored changes; legacy collections use their pre-migration documents.
The section exposes only Publish or Update through the same guarded local
publication command as the header. Status and time are read-only here. Scheduling,
privacy, password protection, sticky posts, and Return to Draft aren't offered
by this local site workflow. Studio Drafts retains its existing controls.

Fixture source v6 reads v1–v5 and stores `publications` separately from authored
`documents`. Each snapshot retains the document and its resolved template
assignment. Save Draft and autosave preserve these snapshots. Publish (or the single blue Save action
for a published document) replaces only the selected snapshot and flushes through
the existing gateway with ownership, revision checks and source/output rollback.
The generated local website renders snapshots. Studio’s explicitly labelled
Current draft preview still renders authored edits. Global template design edits
and site menu changes continue to update the shared presentation.

The first owned content change seeds legacy publication snapshots before applying
the edit, preserving the existing local preview. Binned documents are omitted
from rendering but their publication remains recoverable in the aggregate.
Backups include snapshots. Editing Undo/Redo preserves the current publication
boundary and cannot republish an older history entry. Permanent deletion removes
the retained publication once its Bin record is removed. Existing size limits remain enforced; a
publication too large for the gateway fails visibly. No hosted deployment occurs.

Undoing creation of a newly published document removes that document from the
local site together with its snapshot. Redo restores the authored document;
Publish is required to make it visible again.

### Editable publication status and dates

Test and Test2 reuse the shared document Publishing controls for both posts and
pages. Draft and Pending are saved editorial states and withdraw that document's
local publication; Published captures the current draft through the existing
owner, lease and revision-checked transaction. The required home page remains
Published-only. Legacy publication snapshots remain readable without changing
pre-edit output.

Date edits, including Now, are undoable draft metadata. Publish or Update uses
that selected UTC date, falling back to the previous publication date or the
current time. Backdating is supported. Future dates, Scheduled, Private,
password protection and Sticky are unavailable in this fixture integration.
There is no automatic scheduler, access-protected publication or pinned archive.
Ordinary Save Draft never replaces a publication snapshot. Explicit publication
commands are preserved across content Undo/Redo, and save failures retain the
draft with visible feedback. This remains local only; no hosted publication is
implied. Production regression coverage is in
`tests/site-publication-controls.test.mjs` and the existing local-site suites.
