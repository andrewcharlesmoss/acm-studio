# Local site integration instructions

All code and documentation paths in these instructions are relative to the ACM Studio repository root.

## Project Ports local navigation

The homepage discovers local website addresses through the dev-only
`/__studio/local-projects` bridge. It sends only the existing Project Ports
`snapshot` request to the user-owned Unix socket and exposes approved project
IDs, availability and validated localhost URLs. It never starts, stops or
reconfigures services, and does not expose commands, logs, paths or environment
values. Discovery refreshes every 15 seconds while visible and on window focus.
Discovered site statuses offer a compact manual Refresh action. It rechecks the
shared snapshot for every site, remains available for healthy or stale status,
and disables while a discovery request is pending; repeated activation cannot
start duplicate manual checks. Progress announcements are reserved for manual
checks; routine polling and Visit checks stay quiet unless status changes. Studio's own known browser address needs no check.
A failed refresh retains the last validated snapshot in memory only and labels
its status as out of date; a successful stopped or removed result replaces it.
Visit always rechecks the current address and closes its temporary tab if that
read fails, becomes superseded, or its link is no longer mounted. It never opens
a retained address after a failed read. Multiple running web addresses require a
choice in Project Ports. No registry-file fallback guesses running state.
The bridge is absent from production builds; ACM Studio itself retains its
relative `/studio` link on every host.

## Test local website editing

Andrew has authorised the local Test integration inside `/studio?site=test` and
changes to the sibling `test` project for this fixture. The canonical source is
Test's `content/site.json` ([current storage formats](storage-formats.md)), containing documents,
categories, Bin and templates; visual edits use one revision-checked gateway.
Test drives the selected site's Posts, Pages and Templates lists and commands.
Andrew authorised copying the existing browser test documents, templates and
assignments into Test on 9 October 2026. Import once in an aggregate transaction,
retain IDs and browser originals in Studio Drafts, reject collisions/non-portable
media visibly and never silently repeat the import. The Test projection is never
inserted into browser stores. Protect the home page, keep selection tab-local,
and use full-page context switches after saving Test. Test backup/restore owns
only its aggregate; shared browser media remains separately owned.
The existing Studio session owns the Web Lock and the Test saving adapter borrows
it. Andrew authorised multiple ordinary editor tabs to edit local Test on
7 October 2026: peers submit validated transactions through the existing typed
tab-synchronisation contract, while only the owner saves under the server lease
and revision checks. Tokens remain private to each tab. Keep independent-edit
merging, explicit overlap choices, pending-draft preservation and fresh-source
handover; never grant peer tabs direct gateway write access.
The normal block library and inspector are reused. All Studio routes retain one lazy Test/Test2/global-template broker runtime under
the existing global writer lock, independently of visible or cached editor routes.
Visible editors keep their draft/history adapters and submit as peers; they do
not create another primary. Exclusive import/restore actions still require the
same document’s actual writer lock. Reconnect preserves drafts and
peer transaction receipts; an uncertain save across owner replacement requires
explicit review unless fresh source confirms it. Cached-page return must not
force a reload that discards unsaved input. Prompts are deferred with no
prompt panel in the current editor. `dist/index.html` is generated using Studio's
canonical BlockRenderer, assigned TemplateDocument and Test's scoped styles.
Local document links use stable hash routes in the single generated file; physical
per-slug output and hosted publication require separately scoped work. Do not add another authoritative
browser store or add an unrestricted project coding bridge.

The shared process guard automatically reclaims valid stale writer locks only
when an OS process probe returns ESRCH. A root-scoped exclusive loopback bind
serialises recovery and remains held for the writer lifetime; there is no
alternative-port fallback. Live or reused PIDs, uncertain probes, unsafe guards,
and binding failures remain blocked. Test, Test2, and global templates use this
same guard; source/output recovery and browser draft reconciliation remain
required. See `docs/test-site-integration.md` for the endpoint contract.

The dev-only Test gateway requires exact local-origin checks, expiring session
tokens, browser write ownership, server leases/process guard, document validation,
CAS revisions and recoverable output transactions. Prompt sessions are ephemeral,
run in an empty temporary directory with verified tools/connectors disabled and
read-only network-denied permissions; only structured proposals reach the gateway.
No hosted publishing or external editor synchronisation is authorised by this
local integration. See `docs/test-site-integration.md` for configuration, supported
capabilities, commands, conflict handling, protocol details and recovery.

Featured image imports use portable image contract v1: the existing snapshot
owner copies bounded validated raster bytes into the selected fixture's
`content/media/` and `dist/media/`, with UUID/content-digest filenames. Peer tabs
still submit snapshot transactions and never write the gateway directly. Site
backups and unsaved-draft exports include those bytes; copies remain immutable
for publications, Bin and history. Other browser-local media IDs and blob URLs
remain prohibited in fixture sources. See the integration document for limits,
backup versioning and failure handling. Interface wording is “Featured image”;
the existing `coverImage` and `cover-image` storage names remain compatible.

### Second local fixture

Andrew authorised Test2 (`test2`) on 9 October 2026. `/studio?site=test2` uses
the same local integration with an independent v9 source in sibling
`test2/content/site.json`. Only fixed IDs `test` and `test2` are accepted.
Each owns separate gateway sessions, leases, process guards, revisions, history,
wake channels and synchronisation rooms. Every ordinary Studio shell retains
both inactive brokers so its global Web Lock owner can save peers from either
fixture. Backups must match the selected site. Switching flushes the current
draft and loads the new context in a full page; failed saves stop the switch.
Test and Test2 each have private Staging and Production Sites entries alongside
Local. Studio local saves do not publish, and hosted editing is not connected.
Their hosted identities and manual publication procedures belong to the
respective sibling `test/AGENTS.md` and `test2/AGENTS.md` files.
Project Ports owns both preview services. `STUDIO_TEST2_PATH` is the optional
server-only Test2 root override; roots must differ.

Test and Test2 navigation belongs to standard Navigation elements inside the
shared Header. Fixture source v15 (reading v1–v14) owns named `navigationMenus`, a
`defaultNavigationMenuId`, and `navigationAssignments` keyed by the shared
Navigation block’s site-local ID. The legacy `siteNavigation` IDs and
`TemplateSet.navigation` default-menu projection remain readable for recovery
and compatibility; new site menu links are stored in `navigationMenus`.
Older collections migrate to one deterministic “Navigation” menu. Its links
remain explicitly authored after migration and are not rebuilt from page/post
lists. Each Navigation block can select a site menu; unassigned blocks use the
site default. Menu deletion reassigns affected blocks to the default, selecting
a new default first if the deleted menu was the old default. The shared Header
role remains protected; removing its Navigation element hides the menu and Undo
can restore it. Edit Navigation uses the site-owned menu editor and shared link
controls. Site Editor menu edits and assignments wait for the Review changes
dialog before their existing local writer saves them; keyboard Undo/Redo remains
available while the visible History/Saved strip is replaced. See
`docs/test-site-integration.md` for migration, import limits and view behaviour.


Navigation authoring follows Gutenberg's Menu, Settings and Styles pane groups.
Site-owned menu links remain canonical typed entries in `navigationMenus`; the
default menu is mirrored to the legacy `TemplateSet.navigation` projection for
older renderer and editor contracts. Per-link selection is transient. Nested
submenus, new-tab/rel/description fields, flex
layout, spacing, typography, root and submenu/overlay colours and Off/Mobile/
Always overlays round-trip through template v0.29.0. Legacy menus retain their
existing visibility. Runtime interaction is shared between React previews and
generated fixture HTML, with no hydration requirement or second menu store.
The visual appender opens a destination picker. Choosing a suggested destination
inserts and selects the link immediately; pressing Enter submits a validated
custom destination with that URL as its initial label. Edit its label and other
link settings after insertion in the selected link's pane; do not require a
second Apply step in the picker.
The typed `SiteLink` menu does not store automatic Page Lists or non-link menu
inner blocks. Studio's optional generated Page List and Search are instead
versioned Navigation-node settings described in `docs/templates.md`. Other
non-link menu inner blocks remain outside the supported adaptation.

Page link is a selectable Navigation child backed by the existing canonical
`SiteLink` entry, not a document-body block or second menu store. Its contextual
Block Library entry inserts only with a Navigation owner. Content edits the
label, destination, new-tab, description and rel fields; Settings owns CSS
classes; Styles reuses shared typography controls. Template v0.28.0 adds bounded
per-link typography and CSS classes while reading v0.1.0–v0.27.0. Bold and Italic
apply to the complete plain-text label; rich inline label fragments and
WordPress entity synchronisation remain unsupported. Dragging reorders siblings
only; cancelled or stale drags cannot change the menu.

### Navigation overlay controls and layouts

Template v0.29.0 adds Show icon button, two-line and three-line menu icons,
and an optional `overlayPartId`. Older menus retain their three-line icon;
hiding the icon uses visible Menu and Close text. Off hides the overlay controls
without discarding their saved values. Mobile follows Gutenberg's 600px
small-screen breakpoint in the available Header row, independent of menu length.
Always uses an overlay at every width. Active Test or
Test2 Navigation panes edit canonical site links through their existing owner,
revision checks and site history. No active site means read-only links, including
another site selected only for preview. Header layout and styling stay global.

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


### Global local-fixture template originals

Studio Drafts, Test and Test2 use the Studio-owned canonical `work/global-template-library.json`
([current global library contract](storage-formats.md)), saved through the fixed-target, exact-origin,
Web-Lock-owner gateway with CAS revisions and recoverable source history.
Templates opens originals independently of the selected site. Navigation belongs
inside the shared Header; no separate Navigation original is offered. The v3
library records the stable Header role and retains the retired Navigation design
for recovery. Legacy siteNavigation references remain private site menu owners,
not rendered parts. Effective global sets read that one canonical site menu;
ordinary saves preserve other raw recovery menus. Existing Presentation and
custom templates without a Header receive the shared Header as a fallback;
assigned templates already containing a visible Header do not receive another.
Old Navigation editor addresses open Header. Owned gateway initialisation
migrates the global library with exact prior-source history and readback;
read-only loading projects the migration without writing. The first owned read
in each gateway process refreshes both outputs for the current global revision
and records success in memory; successful saves update the same refresh marker.
Site documents,
assignments, publications and menu links remain unchanged. Template designs
are global and cannot be customised per site. Identity, authored menu links,
social links and assignments remain site-owned. Source v5 retains stable aliases
and legacy design/override records for recovery, reading v1–v4; these records do
not alter effective global designs and normal content saves preserve them.
Global edits refresh both generated previews from fresh sources without changing
site source revisions. Read-only bootstrap never permits persistence before owned
initialisation. Legacy entry URLs map to originals. New originals are available
to every site. Manage dependencies bulk replaces or detaches assignments across
Studio Drafts, Test and Test2 through their existing owners. Active, published,
binned, default and structural references protect removal; raw recovery designs
and source history remain recoverable without blocking unused originals. Unused
originals move to the global Bin with Undo and Restore; permanent removal is not
offered. Global/fixture mutations and browser reference writes are ordered under
the existing owner and revision checks to reject stale reintroduction. Library export/import and site backups
preserve originals and recovery records. See `docs/templates.md` and
`docs/test-site-integration.md`. No hosted publication is implied.

Studio Drafts materialises the same global originals through its existing browser
template session. Retain raw designs, Bin records, identity, links and assignments
for recovery; never replace original artwork during assignment saving. Match
ancestry by stable IDs and retained fixture aliases, never by names. Unmatched
active assignments preserve their recovery presentation and offer explicit
reassignment in the document inspector. Save as template in Studio Drafts writes
a retained shared original. Creation does not offer an Undo that removes
protected originals; ordinary shared design edits retain Undo/Redo. Full browser backups carry a validated shared snapshot when available; browser restore does
not implicitly replace the global library. See `docs/templates.md`.

### Local fixture publication

Global originals also use a lazy broker on other Studio routes under the same
writer lock. Foreground refresh reconnects disconnected global peers. Exact own
save acknowledgements retain local Undo; foreign or merged saved designs clear
whole-design history so Undo cannot revert another tab's properties.

Test and Test2 source v8 retains independent document publication snapshots and
template assignments. Save Draft and automatic saving change authored documents
only. Publish/Save atomically replaces the selected publication through the
existing owned, revision-checked source/output transaction. Static local output
uses publications; explicit Studio draft previews use authored documents. Legacy
sources seed publication snapshots from their pre-edit documents on the first
owned content transaction, preserving existing output. Global designs and site
navigation remain shared/live. Bin hides a publication while retaining its
snapshot for recovery. This never deploys to a hosted site.


Test and Test2 posts and pages, including the authored home page, share all five
document status and UTC date controls. Draft, Pending and Private withdraw the
local publication. Published captures the draft through the owning revision-checked
save. Scheduled captures a future snapshot for the local preview browser's display
timer; this is not a server scheduler or hosted publication. Password protected
reuses the shared salted PBKDF2 local preview gate; editorial and static source
remain local plaintext, so do not describe it as hosted security. Sticky is a
post-only editorial flag shared with Studio Drafts. It is saved
through normal owned draft transactions and enters a local publication only on
Publish, Schedule or Update. Fixtures currently have no post archive, so it does
not reorder document navigation or the manually ordered editor list. Source v8
permits an absent home publication while retaining the
required authored home document and v1–v7 readers; a withheld home shows a neutral
unavailable message. Date edits, Now and backdates stay draft metadata until
capture. See `docs/test-site-integration.md` for this deliberate local extension.

Browser-local Pages and Posts share immutable publication snapshots and the same
draft/publication actions. Pages use `/pages/<slug>` and stay out of Writing.
Preserve snapshot media, templates, and Bin recovery; see
`docs/local-publications.md` for contracts and verification.
