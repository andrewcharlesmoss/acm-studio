# ACM Studio project instructions

## Purpose and ownership

ACM Studio is ACM's editorial management and publishing workspace. It owns the
Gutenberg-style editor, structured content contracts, browser-local files,
drafts, previews and publishing workflow used by Andrew Moss and future ACM
projects.

The public personal presentation layer belongs to the separate
`andrew-moss` project. ACM Studio may render local previews and provide
portable publishing data, but it does not own the Andrew Moss public site.

## Shared standards

This project inherits the workspace `AGENTS.md` and `STYLE_GUIDE.md` baselines.
Use the shared default font stack, semantic HTML, keyboard-accessible controls,
visible focus states and restrained responsive layouts. Treat rendered browser
behaviour as the evidence for visual changes.

Use WordPress Gutenberg as ACM Studio's default behavioural, visual and
interaction reference. When implementing an editor feature, inspect the
upstream Gutenberg implementation, documentation or tests where practical and
mirror its conventions in ACM Studio's own architecture. Adapt the details to
ACM Studio's content model where necessary. An explicit user or product
direction to do something differently takes precedence; preserve that
intentional difference rather than reverting it to Gutenberg by default.

The table-action dropdown deliberately uses Gutenberg's system UI font stack
and measured compact menu dimensions instead of the shared Inter baseline.
These dimensions are a visual reference; its artwork comes from the ACM icon
collection. Keep the menu compact and do not infer CSS sizes from Retina
screenshots.

Studio interaction controls use original ACM artwork from the sibling
`@acm/icons` catalogue. Use its React adapter and optical scales, and keep
new shared symbols product-neutral. Preserve the `StudioIcon` and table-icon
wrappers as compatibility APIs. Do not trace or copy third-party paths.
Andrew explicitly authorised the Copilot keyboard mark
as a sourced brand exception on 26 September 2026. Its MIT-licensed Lobe Icons
SVG, provenance and licence are owned by `acm-icons/sources/copilot/`; preserve
the shared geometry and licence notices when previewing or exporting it.
Andrew authorised Inter-derived H1–H6 heading marks on 2 October 2026. These
shared font-outline assets use the pinned, licensed source in
`acm-icons/sources/inter/`; retain their provenance and licence notices.

The Studio UI Library at `/studio/ui` groups Workspace, Ribbon, Panes, Panels,
Icons and Styles. Styles edits the executable `@acm/styles` preset beside a
bundled canonical governance Style Guide. Draft controls update the specimen and
both source views immediately. In local development, Save Shared Styles uses a
fixed-target, revision-checked gateway to write the preset, generated guide token
table cells and Studio source bundle. Policy prose stays manually authored.
Saving borrows `studioWriteOwnership` or a bounded claim of its same Web Lock;
no unlocked fallback, browser store, Git commit or publication is permitted.
The gateway requires exact local-origin checks, expiring sessions, validation,
a process guard, recoverable replacements and readback. External changes block
stale saves and preserve the draft; Reload Source deliberately discards it.
The hosted build retains draft previews with saving unavailable. The source index
records the last committed guide revision, actual content digest and working-tree
status. Run `npm run styles:source` after guide edits or commits and verify with
`npm run styles:source:check`. See `docs/studio-ui-library.md` for scope and recovery.
Workspace composes the shared Ribbon and Pane specimens; Ribbon details live at
`/studio/ui/ribbon`, Pane details at `/studio/ui/panes`, and the broadly shared
icon catalogue at `/studio/ui/icons`. The prior `/studio/ribbon` and
`/studio/panes` routes redirect to their new sections. ACM symbols come from the
sibling `@acm/icons` package. The UK Keyboard collection lives at
`/studio/ui/icons?collection=keyboard`. Shared keycap assets are owned by
`@acm/icons/keyboard`. The collection covers the common UK ISO Mac and Windows
key families; layouts and hardware-dependent legends remain model-specific.
The Studio preview's default appearance and Reset to Default behaviour are
defined in `docs/studio-ui-library.md`; keep them separate from the shared
keyboard renderer's transparent backwards-compatible defaults.
The Panels section at `/studio/ui/panels` demonstrates the shared `@acm/panel`
card component. Product consumers own placement, width, resizing, visibility,
content and actions. Keep account data and behaviour in ACM Account.
This catalogue organisation does not replace
existing product icons or change their provenance. Ribbon definitions drive its
tree, inspector and renderer. All catalogue demo handlers remain memory-only
and independent of product stores or write ownership. See
`docs/studio-ui-library.md`, `docs/ribbon-library.md` and `docs/pane-library.md`.

The Studio UI Library defines the shared Ribbon and Pane tab indicator rule.
`docs/studio-ui-library.md` is the canonical specification;
`@acm/ribbon` supplies the reusable Ribbon implementation and Pane components
follow the same geometry. Product consumers may theme indicator colours but
should not replace this behaviour.

Studio interface text uses Gutenberg's 13px system UI baseline through
`--studio-ui-font` and `--studio-ui-size`. Do not introduce interface text
smaller than that token: use hierarchy, weight, colour and spacing instead.
Article and block content may retain their content-specific typography.

ACM Studio's Focus Outline preference applies to every `/studio` route,
including the editor, appender and portalled overlays. On shows focus outlines
for pointer and keyboard input, Off hides them, and Keyboard Only is the default.
Andrew explicitly authorised Off as an accessibility exception for this scope;
keyboard navigation, editing carets and selected-item markings remain available,
and forced-colours mode retains visible focus. Public article routes are outside
this scope. The Library header and editor View menu share the setting. Its exact
enumerated preference is saved through `studioWriteOwnership`, using the existing
writer or a bounded claim of the same Web Lock; load the latest preference before
writing and never save without ownership. A denied or failed save applies only
to the current page and must be reported visibly. See `docs/studio-ui-library.md`.

Decorative focus selectors consult the document's `data-studio-focus-visible`
flag through the zero-specificity `:where(html:not([data-studio-focus-visible="false"]) *)`
guard on the focus branch. This includes borders, shadows, SVG handle marks,
and parent, sibling, or pseudo-element rings in portalled overlays. Preserve
hover and active branches, semantic selections, authored content focus styles,
and forced-colours overrides. `tests/focus-decoration-contract.test.mjs` checks
the application stylesheets for new unguarded decorations. Shared package
adaptations belong at Studio's consumer boundary.

The Pane section of the Studio UI Library documents the shared internal Pane
components used by Studio Navigation, Block Library, Editor Inspector, Design
Pages/Layers and Design Properties. Its component contract is v1.3.0; see
`docs/pane-library.md`. Catalogue fixtures and demo state remain separate from
product stores and write ownership. Product data, commands and pane-specific
behaviour remain owned by their existing features. Pane specimens permit
temporary edge resizing, with contained horizontal scrolling at narrow widths;
collapse controls remain available. Studio Navigation and Editor Inspector
adopt the shared resizing contract. Other product panes retain their existing
widths and responsive behaviour.

Styles → Interactions owns one neutral hover background in the executable
`@acm/styles` preset, shared by disclosure headings, neutral controls, menu items
and list items. It defaults to `#F0F0F0`. Selected, pressed, disabled and
destructive states keep their own treatments. The Controls → Accordion specimen
has no separate colour preference; see `docs/studio-ui-library.md`.
Styles → Interactions also owns interface selection colour, independent of
palette Accent. Its v0.8.0 executable preset reads v0.1.0–v0.7.0; the default
`#0088FF` feeds the stable Studio alias, including portalled selections. Local
saves refresh loaded tabs without remounting drafts. Focus and action states
retain their separate roles.
Styles → Interactions owns Control accent colour (`#3858E9`) for enabled
toggles and standard sliders. @acm/styles derives hover by darkening each sRGB
channel by 12%, and pressed by darkening hover a further 12%. Controls examples
inherit the shared colour without temporary colour pickers; their reset affects
example values only. Specialist hue and alpha tracks remain separate.

Andrew authorised an exception to the visible-close-control rule on 11 October
2026 for compact editor toolbar dropdowns: omit Close buttons and rows, following
the Gutenberg reference. Escape closes the topmost dropdown and returns focus to
its trigger; clicking outside or clicking the trigger again also dismisses it.
Dialogs, inspector menus and larger editing popovers retain visible close controls.

Every floating inspector box or menu opens on the workspace-facing left of its
owning right pane, regardless of block type. This applies to live editors and
UI Library specimens, including control menus, colour and gradient editors,
font-size units and document settings. Declare `data-inspector-popover-owner`
on the actual pane boundary and use the shared inspector-popover positioning
contract; never position from the section button's horizontal coordinate.
Portal children retain their original pane owner. Nested editors may extend
further left of their parent popup. Keep overlays within the visible viewport
as far as available space allows, without automatically flipping to the right.
Reposition on pane/popup resize and scrolling, and preserve close controls,
Escape dismissal and focus return. See `docs/pane-library.md`.

Posts, pages, and template block editors share View → Responsive styles. Desktop
edits the shared baseline; Tablet (>480px and ≤782px) and Mobile (≤480px) have
independent bounded ParagraphStyle overrides inheriting Desktop. Turning the
session toggle off preserves overrides and edits Desktop at any preview width.
Device inspectors expose supported typography, colours, borders, and spacing;
native layout/content, assets, Advanced fields, interaction states, and shared
site styles remain Desktop controls. Fit-text blocks retain shared fitted sizing.
Block toolbars remain shared. Canonical CSS mappers emit escaped device deltas;
editor container queries and local publication media queries share the ranges.
See `docs/responsive-styles.md` for contracts and acceptance checks.

The main content editor, template editor and Mini Golf editor remain
three-pane desktop workspaces at narrow viewport widths. They keep a minimum
workspace width and scroll horizontally until a dedicated mobile arrangement is
designed; do not reflow their editing panes as a responsive fix.

Edit and Preview must share block presentation rules, including typography,
colours, spacing and dimensions. Use the Studio variant of `BlockRenderer`
for editor previews, not the public article's prose theme. Keep selection
controls and empty-field prompts editor-only; excerpts are metadata, not
additional body content. Verify both modes when changing a block's appearance.

Document featured-image controls show the resolved image with overlaid Replace
and Remove actions. Featured-image selection uses existing Files alternative
text directly; body-image insertion retains its description dialog. Template
featured-image actions use the shared centred image overlay.
Hidden template images remain recoverable through Restore in authoring Edit.

Every block must be content-fitting by default. Optimise each block's height
and width from its actual content: avoid gratuitous `min-height`, fixed
heights, vertical padding, margins or line-height that create empty space,
especially around dynamic metadata blocks. Keep top and bottom spacing visually
balanced and use the shared compact block gap for ordinary block separation.
Intentional dimensions — such as cover-image framing, image placeholders,
code/table editing surfaces and user-configured Spacer blocks — must remain
explicit in the owning block's styles and behave consistently in Edit, Preview
and local publication. Check the result in Edit and Preview, including narrow
layouts and 200% zoom, before treating a block-style change as complete.

## Foundation boundary

- This phase is deliberately database-free and login-free.
- Sample content is application-owned and lives in `app/content/`.
- The Studio is a local prototype. It may use browser storage for a draft, but
  must not imply that content is securely or durably published.
- Do not add plugins, themes, comments, membership, newsletter automation,
  analytics, scheduling or multi-user permissions during the foundation phase.
- Do not publish or deploy without an explicit request.

Andrew has explicitly authorised the local template editor described in
`docs/templates.md`. This is a bounded extension of the foundation: Studio owns
one flat template library, shared header/footer parts, scoped styles and page/post
assignments. Named-set authoring is not offered. Legacy backing context IDs remain
internal for compatibility; preserve their styles, references, assignments and
Bin recovery rather than destructively combining them. New entries use the
unnamed library context independently of the current selection. See
`docs/templates.md` for the retained shared-reference boundary. It is not a general theme/plugin system or an external-site
integration. Keep templates separate from content bodies and Design canvas data.
The shared editor uses explicit template/part targets and a transient block
projection; never persist that projection as a page or post. HTML template editing
is disabled until references and dynamic elements can round-trip safely.
Template packages and stored template contracts use v0.32.0 and read versions
v0.1.0 through v0.31.0. Group semantic elements, ARIA labels and block alignment,
Columns alignment and Section visual styles survive the template projection.
Published local posts retain an immutable design snapshot
until Update. Template/media imports and full restore use the shared ownership
coordinator, with complete rollback and reload before editing resumes. Invalid
existing data must remain recoverable.
Workspace data uses version 26 and reads versions 2–25. Local publication
snapshots use version 19 and read versions 1–18. Publications freeze the effective
document-field visibility from their selected template and document overrides;
older snapshots without that policy retain Show defaults. Inline Math objects require
workspace 24 and publication 17 or later; Footnote objects remain readable in workspace 23 and
publication 16. Legacy marked-text references and equations remain readable.
Studio block clipboard envelopes use version 5 and read versions 1–4. Partial
selections carry referenced document note companions; paste attaches them outside
restricted child lists within the same content/history transaction. Math objects
require clipboard 4; Footnote companions remain readable in clipboard 3. Cut may remove
the source only after a reader-valid copy and unchanged block/note ownership.

Deleted pages, posts, template entries and unassigned template sets move to the
local Studio Bin. Keep their assignments, local publication snapshots and
referenced media recoverable; full backups include Bin contents. Only explicit,
individually confirmed permanent deletion removes an item from the Bin. Referenced
shared parts, assigned templates/sets and sets with binned entries stay protected
until their dependencies are resolved.

## Git and deployment mapping

- This repository currently has only `main`; treat it as the production branch
  and use `Local → Main` unless a documented staging branch or independent
  staging target is added later.
- The tracked `.openai/hosting.json` identifies the ACM Studio Sites project.
  Sites publishing is a separate, explicitly authorised operation; the hosting
  file does not establish an automatic Git trigger.
- Before publishing, verify the selected Sites target, exact saved source
  revision, deployment status and hosted result. Keep any future staging Sites
  project separate from production and document its mapping before use.

## Content architecture

- `Project`, `Article`, `MediaReference` and structured `ContentBlock` records
  are the canonical foundation domains.
- Store article bodies as typed blocks, not editor-specific HTML.
- Keep content portable and provider-independent.
- Keep public rendering independent from the future persistence provider.
- Connect future account, storage and publishing capabilities through explicit
  contracts rather than coupling them to the content model.
- Use stable slugs and make missing records fail clearly.

## Commands

- Run `npm run dev`, `npm run build`, `npm test` and `npm run lint` from the
  repository root.

## Verification

- Run the production build and focused tests for every material change.
- Check representative Studio, preview and detail routes.
- Verify local editing, selection, reordering, file management, preview and
  export flows in a real browser before treating visual work as complete.
- Report anything not tested or intentionally deferred.

## Local write ownership

Page and Post panes expose a clickable saved-revision count and full comparison
screen, with a chronological slider, Previous/Next and Removed/Added source
columns. Optional arbitrary comparison uses two labelled native ranges; the To
version is restored. Complete typed block differences remain inspectable alongside
the canonical HTML inspection format. Browser revisions live in
the owning workspace v26 aggregate, retained independently of Undo with a
100-record / 2 MiB budget. Test and Test2 read validated selected-document
records from their existing bounded gateway history. Browsing is read-only;
restoration saves current content first, restores only editorial fields through
the existing history route, and awaits the normal owning save acknowledgement.
Publication state, categories, parent and template assignments stay current.
Retained browser revisions protect their media and travel in workspace exports
and full backups. Mini Golf's isolated workspace is outside this control.
See `docs/document-revisions.md`.

The Mini Golf Scorecard pilot at `/studio/sites/mini-golf-scorecard` is a local
page-content and layout draft only. Its repository uses a separate storage key
and the same write-ownership coordinator; it must not use the legacy Studio's
media, publications or backup stores. Site navigation uses full-page links to
reset editing state. Preview may run the shared Mini Golf game locally with isolated, owner-gated
session storage. Page authoring and game sessions remain separate. Writes to the
Mini Golf project or live site are not part of the page-draft pilot.

Mini Golf drafts use envelope version 14 and read versions 1–13; page
definitions use version 6 and read versions 1–5. Math objects require draft envelope 13 and page definition 5 or later; their
Footnote predecessors remain readable.

Mini Golf runtime Preview uses an ephemeral block projection for calculated
fields and repeated leaderboard cards. The first player retains the authored
block IDs; subsequent instances receive collision-safe presentation IDs. Shared
notes retain one visible owner, and navigation uses the projected reading order.
Keep this projection out of drafts, content history, game-session persistence and
exports; authored records remain the saved source of truth. Edit and Preview
reuse the player-text binding.

Mini Golf staging and prod are separate site entries with separate browser
page-draft keys. The original pilot route/key belongs to prod and must remain
compatible. Staging currently uses the public prod capture as an explicitly
labelled starting reference, not an authenticated staging capture.

The main Studio and Mini Golf page routes use the shared `StudioEditor` module,
which composes the canonical `StudioCanvas` and `StudioInspector`. Site
specific page appearance belongs in scoped theme styles and site data, not in a
second editor implementation. Extend the typed block model and versioned
migration when the inherited page needs another editable layout element.

Andrew has authorised a separate Codex integration to edit the actual local
`mini-golf-scorecard` project from Studio. This does not authorise deployment:
publishing remains manual for Studio-originated coding requests, overriding
the Mini Golf project's automatic-release policy for those requests. Do not
expose private task history through static assets. Before enabling coding,
establish safe task-runtime ownership; browser write ownership alone cannot
exclude concurrent desktop Codex writers.

Site Settings is dev-only. Its initial snapshot at ignored
`work/site-settings.json` contains only non-value metadata and remains denied
to direct Vite file access. Connect to Sites explicitly loads fresh settings
through a separate ephemeral Codex app-server connection; it never starts a
model turn. The settings service permits only its exact two project IDs and
named settings tools, never arbitrary RPC, deployment or site deletion.
Hosted settings edits are authorised through explicit per-operation review and
confirmation. Keep exact-local-origin checks, session-bound expiring one-shot
confirmations, owner checks, pre-save freshness checks and post-save readback.
Uncertain dispatched writes block subsequent writes until the user checks Sites
and restarts the local server. Do not silently retry. Sites supplies no atomic
compare-and-swap for these tools: warn against concurrent external edits.
Never return existing variable values or access lists, persist replacement
values, echo provider errors or record settings payloads in logs. Replacement
values may exist transiently for confirmation, with deletion on cancel/expiry.
Environment updates affect only selected keys and require separate deployment
approval. Rich access lists, analytics and database management remain in Sites.

All browser persistence must use `studioWriteOwnership` in
`app/studio/write-ownership.ts`. Keep the lifetime Web Lock across workspace,
publication, media and restore operations. Do not add an unlocked fallback.
A new writer must load the current persisted snapshot before enabling edits.
Restore uses its scoped permit, drains existing media work and keeps editing
paused until reload or a complete rollback. Preserve read-only browsing and
exports when another tab owns editing.

Ordinary Files actions use the `acm-studio-media-v1` command broker: any connected
Studio tab may submit, while the lifetime Web Lock owner alone saves. IndexedDB
v2 commits command receipts with mutations, and library replacement renews its
generation to block stale replay. Keep field-level conflict review, unfinished
text and removed-item recovery visible. Notifications refresh open libraries
and editor media URLs. Full replacement remains exclusive and image insertion
retains the destination editor's own permission. See `docs/files-saving.md`.

## Project Ports local navigation

The homepage discovers local website addresses through the dev-only
`/__studio/local-projects` bridge. It sends only the existing Project Ports
`snapshot` request to the user-owned Unix socket and exposes approved project
IDs, availability and validated localhost URLs. It never starts, stops or
reconfigures services, and does not expose commands, logs, paths or environment
values. Discovery refreshes every 15 seconds while visible and on window focus;
opening rechecks the current port. Multiple running web addresses require a
choice in Project Ports. No registry-file fallback guesses running state.
The bridge is absent from production builds; ACM Studio itself retains its
relative `/studio` link on every host.

## Test local website editing

Andrew has authorised the local Test integration inside `/studio?site=test` and
changes to the sibling `test` project for this fixture. The canonical source is
Test's `content/site.json` v8 (backwards-readable v1–v7), containing documents,
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
The normal block library and inspector are reused. Other Studio routes retain lazy Test/Test2
brokers under the existing global writer lock. Reconnect preserves drafts and
peer transaction receipts; an uncertain save across owner replacement requires
explicit review unless fresh source confirms it. Cached-page return must not
force a reload that discards unsaved input. Prompts are deferred with no
prompt panel in the current editor. `dist/index.html` is generated using Studio's
canonical BlockRenderer, assigned TemplateDocument and Test's scoped styles.
Local document links use stable hash routes in the single generated file; physical
per-slug output and hosted publication require separately scoped work. Do not add another authoritative
browser store or enable unrestricted writes in the Mini Golf Codex bridge.

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
the same local integration with an independent v8 source in sibling
`test2/content/site.json`. Only fixed IDs `test` and `test2` are accepted.
Each owns separate gateway sessions, leases, process guards, revisions, history,
wake channels and synchronisation rooms. Every ordinary Studio shell retains
both inactive brokers so its global Web Lock owner can save peers from either
fixture. Backups must match the selected site. Switching flushes the current
draft and loads the new context in a full page; failed saves stop the switch.
Test2 has a private Production Sites entry alongside Local, with no staging.
Its hosted identity and manual publication procedure belong to sibling
`test2/AGENTS.md`; Studio local saves do not publish and hosted editing is not
connected.
Project Ports owns both preview services. `STUDIO_TEST2_PATH` is the optional
server-only Test2 root override; roots must differ.

Test and Test2's top menu belongs to a standard Navigation element in a shared
Navigation template part, referenced by the aggregate's `siteNavigation` IDs.
The next owned save migrates older collections with deterministic document links.
After migration the links are explicitly authored, not rebuilt from page/post
lists. The shared set/part remain protected while referenced; removing its
Navigation block hides the menu and Undo can restore it. Edit Navigation uses
the existing template editor and Block link controls. See
`docs/test-site-integration.md` for migration, import limits and view behaviour.


Navigation authoring follows Gutenberg's Menu, Settings and Styles pane groups.
Links remain canonical typed entries in `TemplateSet.navigation`; per-link
selection is transient. Nested submenus, new-tab/rel/description fields, flex
layout, spacing, typography, root and submenu/overlay colours and Off/Mobile/
Always overlays round-trip through template v0.29.0. Legacy menus retain their
existing visibility. Runtime interaction is shared between React previews and
generated fixture HTML, with no hydration requirement or second menu store.
WordPress menu entities, automatic Page Lists and non-link menu inner blocks
are outside this typed menu contract. See
`docs/templates.md` for the reference and supported adaptation.

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


### Global local-fixture template originals

Studio Drafts, Test and Test2 use the Studio-owned canonical `work/global-template-library.json`
(global library contract v2, reading v1), saved through the fixed-target, exact-origin,
Web-Lock-owner gateway with CAS revisions and recoverable source history.
Templates opens originals independently of the selected site. Template designs
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
protected originals; ordinary shared design edits retain Undo/Redo. Full browser backups use v5, read
v1–v4 and carry a validated shared snapshot when available; browser restore does
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
