# ACM Studio project instructions

## Purpose and ownership

Current priorities are recorded in [Project direction](docs/project-direction.md)
(12 November 2026). Prioritise the holistic redesign of the existing WordPress
site at `andrewmoss.me` and use it to prove a reusable ACM design foundation.
ACM Studio's reusable tools remain active; expansion of the custom Gutenberg
equivalent, content editor, and Site Editor takes a back seat unless explicitly
scoped again. Existing editor contracts below govern retained behaviour and
recovery; they do not establish a priority to resume parity work. Follow the
website phase with a bounded ACM Account/WordPress integration pilot, then return
to Loquafy. Keep preparation bounded. The live WordPress site and the separate
Sites-based `andrew-moss` repository are distinct targets.

Project direction also records the agreed future WordPress ownership of shared
website styles, derived `@acm/styles` distribution and guide display, and keeping
Loquafy's marketing site and application outside WordPress. This is not an
implemented migration: the Markdown style-value source and existing controls
remain authoritative until a separately scoped transition is verified. Preserve
ACM-owned Ribbon, Pane, Panel, and specialist interface styling throughout.

ACM Studio is ACM's editorial management and publishing workspace. It owns the
Gutenberg-style editor, structured content contracts, browser-local files,
drafts, previews and publishing workflow used by Andrew Moss and future ACM
projects.

The public personal presentation layer belongs to the separate
`andrew-moss` project. ACM Studio may render local previews and provide
portable publishing data, but it does not own the Andrew Moss public site.

## Shared packages

The canonical ACM Icons, Panel, Ribbon, and Styles packages live in
`packages/acm-icons`, `packages/acm-panel`, `packages/acm-ribbon`, and
`packages/acm-styles`. They keep their package identities and public exports
for other ACM consumers. The original repositories retain their histories and remain historical
checkouts; preserve their branches and uncommitted work.

For a reproducible checkout, follow the guide revision and commands in README.
The adjacent workspace-governance checkout remains the canonical style source.

## Task-specific instructions

Read the applicable instructions before changing a feature or its contracts.

- For Studio interface work, including shared controls, the UI Library, icons, typography, focus, popovers, responsive editors and drag placement, read the [Studio interface instructions](docs/studio-interface-instructions.md).
- For Project Ports discovery, Test or Test2 editing, navigation, global fixture templates and local publication, read the [local site integration instructions](docs/local-site-instructions.md).
- For Site Editor previews, shared styles, media, layout or block compatibility in Edit, Preview and published output, read the [Site Editor and block instructions](docs/site-editor-instructions.md).
- For work spanning these areas, apply each relevant guide. Load the saved state before enabling edits, keep drafts recoverable after failed or stale saves, and use the owner of the selected site for writes.

## Shared standards

This project inherits the workspace `AGENTS.md` and `STYLE_GUIDE.md` baselines.
Use the shared default font stack, semantic HTML, keyboard-accessible controls,
visible focus states and restrained responsive layouts. Treat rendered browser
behaviour as the evidence for visual changes.

Use WordPress Gutenberg as ACM Studio's default behavioural, visual and
interaction reference. Whenever investigating or implementing a
WordPress/Gutenberg block or editor feature, use WordPress Playground at
https://playground.wordpress.net as a required live reference. Exercise the
relevant controls and states there to establish runtime behaviour. Cross-check
those observations against the [WordPress Block Editor documentation](https://wordpress.org/documentation/article/wordpress-block-editor/)
for user-facing workflows and the [Block Editor Handbook](https://developer.wordpress.org/block-editor/)
for developer-facing APIs and architecture, then consult upstream
implementation and tests where available. Use the
[Gutenberg repository](https://github.com/WordPress/gutenberg) as the primary
source for block-editor features; consult
[WordPress core development](https://github.com/WordPress/wordpress-develop)
when behaviour depends on core integration. Documentation and source alone do
not establish runtime behaviour. When documenting findings, record the
WordPress version, editor context and controls the Playground build does not
expose. State verification limitations and use documentation and source as
supporting evidence. Adapt the observed conventions to ACM Studio's own
architecture and content model where necessary. An explicit user or product
direction to do something differently takes precedence; preserve that
intentional difference rather than reverting it to Gutenberg by default.

When inspecting live references, reuse a relevant tab that is already open.
If it is open in Chrome but absent from the Codex built-in browser, use the
existing Chrome tab rather than creating a duplicate. Avoid opening new tabs
unless preserving current user work requires it, and close temporary reference
tabs when finished.

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
Template packages and stored template contracts write v0.77.0 and read versions
v0.1.0 through v0.76.0. Per-level Group H1–H6 foreground and background maps,
Navigation Page List blocks, and Extra Black normal/italic Appearance values
were introduced in v0.74.0 and remain readable from that version; v0.73.0 and
older reject these additions. Group maps remain responsive through Edit, Preview
and static output. Extra Black values require workspace v63, publication v54,
template v0.74.0, clipboard v40, backup v42, fixture source v53 and global
library v45. Group semantic elements, ARIA labels, block alignment, per-level
heading maps and Group-owned Button element colours, Columns alignment, Section
visual styles, and Content-slot HTML elements survive the template projection.
Content Button colours remain scoped to the template Content slot; ordinary
content and other template elements reject those Content-slot fields.
Published local posts retain an immutable design snapshot
until Update. Template/media imports and full restore use the shared ownership
coordinator, with complete rollback and reload before editing resumes. Invalid
existing data must remain recoverable.
Workspace data uses version 65 and reads versions 2–64. Local publication
snapshots use version 56 and read versions 1–55. Publications freeze the effective
document-field visibility from their selected template and document overrides;
older snapshots without that policy retain Show defaults. Inline Math objects require
workspace 24 and publication 17 or later; Footnote objects remain readable in workspace 23 and
publication 16. Legacy marked-text references and equations remain readable.
Classic, Classic Portrait and Tall image aspect ratios require workspace v30,
publication v22, template v0.34.0, clipboard v7, fixture source v13, and global
template library v5 or later. Selecting a
non-original ratio clears an explicit image height so the frame uses that ratio.
Studio block clipboard envelopes use version 42 and read versions 1–41. Full
backup envelopes use version 45 and read versions 1–44. Backup v38 retains
foreign pre-v7 media revision values in inert, versioned `backupRecovery` metadata
and assigns a fresh active revision. Older colliding recovery fields are retained
inside that envelope; restore and re-export preserve them. Test/Test2 fixture
sources use version 56 and read versions 1–55. The global template library uses
version 48 and reads versions 1–47. Unset custom gradients require fixture
source v49 and global library v41;
local site backup envelopes use v2 and read v1. New Social Link service children require
workspace v50, publication v41, template v0.61.0, clipboard v27, backup v27,
fixture source v39, and global library v31. Cover content positioning requires
workspace v51, publication v42, template v0.62.0, clipboard v28, backup v28,
fixture source v40, and global library v32. Earlier envelopes reject the field
rather than silently dropping it. Earlier envelopes preserve legacy
LinkedIn/TikTok records and reject the new generic service data. Partial
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

- `main` is ACM Studio’s production branch. Use it for ordinary sequential
  work. For genuinely concurrent tasks, use a task branch in a separate Git
  worktree, following the workspace branch and checkout policy. Keep each task
  branch scoped to its coherent task and review its changes before integration.
- ACM Studio has no staging branch or separate staging target. Do not create a
  staging branch or target without an explicitly authorised project decision.
  Integrate reviewed task work into `main` only when the applicable verification
  and deployment authorisation requirements are met.
- The tracked `.openai/hosting.json` identifies the ACM Studio Sites project.
  Sites publishing is a separate, explicitly authorised operation; the hosting
  file does not establish an automatic Git trigger.
- Before publishing, verify the selected Sites target, exact saved source
  revision, deployment status and hosted result. Keep any future staging Sites
  project separate from production and document its mapping before use.

Editor Options → Preferences owns the optional block-toolbar spacing setting. It
defaults off and is saved through the Studio preference ownership and broker
contract. When enabled, content and template canvases reserve toolbar space;
when off, toolbars overlay content. The Workspace header specimen uses temporary
state and Reset rather than the saved preference. Preferences also owns the
selected-block outline mode: Toolbar hover shows the shared outline while the
block type, drag, or move controls are hovered or keyboard-focused; Always is
the default and preserves the current selected outline; Off hides that selected
outline. These modes apply to content and template editors through the canonical
selection frame and do not change hover outlines, keyboard focus indicators,
multi-selection shading, or preview/public presentation.

## Content architecture

The isolated shared website layout contract v0.1.0 lives in
`app/studio/website-layout.ts`; see `docs/website-layout.md`. It defines pure
defaults/profile/template resolution and explicit legacy capture. Styles → Website
Styles → Layout is a memory-only generic block editor preview with no Save or
site bindings. It reuses TemplateEditor/StudioEditor with isolated example nodes,
canonical width and gutter controls and a scoped preview geometry adapter. There
is no profile/template selector. Layout and content history stay separate; Reset
Preview recreates the example and restores layout defaults. Do not wire the
contract into existing sites or stores without a separately verified, versioned
adoption that preserves existing site appearance.

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
and full backups. The separate Mini Golf project is outside Studio's revision
control.
See `docs/document-revisions.md`.

Mini Golf is not integrated with ACM Studio. Its project source, local drafts,
game sessions and hosted sites remain outside this repository and must not be
read or changed from Studio. If Studio integration is requested again, build a
fresh integration on the shared editor and storage boundaries; do not restore
the retired routes, runtime or bridges as-is. Legacy typed records remain only
for compatibility and recovery.

All browser persistence must use `studioWriteOwnership` in
`app/studio/write-ownership.ts`. Keep that per-document coordinator stable across
development module refreshes, including its subscribers, lifetime lock, and pending
writes. Explicit disposal drains writes before a replacement can acquire ownership. Keep the lifetime Web Lock across workspace,
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
