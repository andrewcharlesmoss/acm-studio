# ACM Studio

ACM Studio is ACM's local editorial management and publishing workspace. It is
the control plane for structured content, media, drafts, previews and future
publishing contracts across ACM projects.

The separate `andrew-moss` project owns Andrew Moss's public personal
presentation layer. ACM Studio does not replace that site; it prepares and
manages the content that future ACM sites may consume through explicit
contracts.

## Included

- **Templates** at `/studio/templates`: create independent site designs with
  reusable page/post layouts, shared headers and footers, site identity,
  navigation and styles. Use **Site Template** in a document's inspector to
  apply a design. Templates share the block editor, List View, media library,
  undo/redo and responsive previews. JSON packages include managed images;
  full backups include templates and assignments. See [Template editing](docs/templates.md).

- **Ribbon Library** at `/studio/ribbon`: inspect shared components, try isolated
  ACM Studio and ACM Account examples, and browse original three-scale SVG icons.
  See [Ribbon Library](docs/ribbon-library.md) for setup and verification, and
  [the command inventory](docs/ribbon-command-inventory.md) for complete coverage.

- First site pilot: open Mini Golf Scorecard from the control centre and edit
  its inherited home page with the same Gutenberg-style block editor used by
  Studio, including block insertion, rich text, tables, reordering, undo/redo,
  page settings, Preview and a constrained **Edit as HTML** view for supported
  block markup.

Mini Golf staging and production appear separately on the control centre and
backstage sidebar. Their browser page drafts are isolated. Staging currently
uses the public production capture as a labelled starting reference.

The **Codex Tasks** view reads existing Mini Golf task text through a dev-only
local bridge, including archived tasks. It does not expose history in the
hosted build. Set `STUDIO_CODEX_BIN` or `STUDIO_MINI_GOLF_PATH` locally if the
default `codex` executable or sibling project location differs. Coding requests
are disabled server-side pending verification of execution confinement and
single-writer handling. The interface uses Studio's light theme; dark mode is
not implemented yet. Local source changes are authorised, but deployment from
this workflow remains manual.

**Site Settings** initially shows an optional dated snapshot from ignored
`work/site-settings.json`. Choose **Connect to Sites** to use the local signed-in
Codex connection for fresh settings and owner-only editing. Review and confirm
each name, URL, basic sharing, custom-domain or variable change before saving.
Existing variable values never reach the browser; new values are held only in
memory, including a confirmation that expires after five minutes. Nothing is
deployed automatically. Environment changes require a separate deployment.

The bridge is development-only and never exposes raw RPC or arbitrary tools.
It uses an ephemeral Codex connection without generating coding turns or
persisting tasks. Exact-origin checks, session tokens, owner checks and
one-shot confirmations protect the write path. Check freshness before saving;
avoid editing the same setting in Sites simultaneously because the provider
does not offer an atomic conditional update. An uncertain save blocks further
saves: check the actual site settings, then restart local Studio. Detailed
sharing, analytics, database management and deletion still open in Sites.
Snapshots remain excluded from builds and direct Vite file access.

The Mini Golf pilot is deliberately a small content and layout editor at
`/studio/sites/mini-golf-scorecard`. A source-aligned presentation adapter
(Mini Golf revision `0d2df8bd31f277df31522aa47ca6bf785888c460`) supplies the
course background, account/setup panels, scorecard, leaderboard, sharing panel
and footer. The shared `StudioEditor` module supplies the Gutenberg-style
controls; game behaviour remains inactive. Pages omit post-only cover image,
reading-time and author metadata. It uses separate browser storage and the
existing Studio write lock. Files, backup restore, game behaviour and
publication are outside this first slice.

**Files & Code** provides a read-only snapshot of the Mini Golf project's source,
configuration, tests and assets, with file search, a folder tree and image
previews. It includes local uncommitted changes, so it can differ from the
captured public webpage. Private environment files, dependencies and generated
output are excluded. See [the pilot notes](docs/mini-golf-page-pilot.md) for the
snapshot boundaries and refresh procedure.

The existing content editor remains available at `/studio`.

- Gutenberg-style editing for pages and posts
- Typed, portable content records and structured content blocks
- Page and post library with create, duplicate and delete actions
- Searchable block inserter and reorderable editing canvas
- Document settings, block settings, undo/redo and preview
- Browser-local autosave, local publication and update workflows
- Integrated local file manager with uploads, folders, search and file details
- Local design canvas at `/studio/designs` with named pages, image composition,
  annotation tools, editable design backups and image export
- Stable media references for managed images
- Complete browser-local backup and checked restore workflow
- Local preview and writing routes for testing published snapshots

## Deliberately excluded

- Hosted database and object storage
- Login, accounts and permissions
- Production publishing and deployment
- Ownership of the Andrew Moss public website
- WordPress migration
- Plugins, themes, comments and newsletters

Studio files are stored as blobs in this browser using IndexedDB. They are
device-local working files, not backups or securely published media. The Backup
workspace creates a JSON recovery file containing private drafts and original
media and should therefore be stored securely.

Backups are limited to 100 MB and checked before restoration. If a saved
workspace cannot be read or has an unsupported structure, Studio preserves
the original value and disables autosave. Restore a valid backup to resume;
do not clear browser data if the unreadable value still needs recovery.

The architecture and next decision gate are recorded in
[`docs/FOUNDATION.md`](docs/FOUNDATION.md).

The design canvas architecture and supported first-release behaviour are
recorded in [`docs/design-canvas.md`](docs/design-canvas.md).

## Local checks

Run these commands from `/Users/andrewmoss/Documents/Codex/_Projects/acm-studio`:

```bash
npm run dev
npm run build
npm test
npm run lint
```

## Documentation

- [`AGENTS.md`](AGENTS.md) — project scope, boundaries and verification
- [`CHANGELOG.md`](CHANGELOG.md) — notable project changes
- [`docs/FOUNDATION.md`](docs/FOUNDATION.md) — architecture and local limits

## Safe local editing

Studio permits one editing tab per browser origin using the Web Locks API.
Other tabs remain read-only for browsing, preview and export. Close the editing
tab, then select **Try Editing Here** in another tab to load the latest saved
workspace before editing. Browsers that cannot acquire a Web Lock remain
read-only rather than save without coordination.

The same ownership covers drafts, local publications and media. Restore pauses
new writes and waits for current media operations before capturing recovery
state. A successful restore requires a reload before editing; incomplete
rollback keeps editing paused so the remaining data is not overwritten.
