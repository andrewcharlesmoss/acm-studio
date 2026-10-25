# ACM Studio

ACM Studio is ACM's local editorial management and publishing workspace. It is
the control plane for structured content, media, drafts, previews and future
publishing contracts across ACM projects.

The separate `andrew-moss` project owns Andrew Moss's public personal
presentation layer. ACM Studio does not replace that site; it prepares and
manages the content that future ACM sites may consume through explicit
contracts.

## Included

- **Site registry** at `/`: equal cards in alphabetical order for projects with
  actual hosted sites. Identified Production and Staging environments share a
  project card. Studio owns the verified site URLs and available actions in
  `app/studio/project-registry.ts`; shared libraries remain in the UI Library.

- **Templates** at `/studio/templates`: edit one shared design library for Studio Drafts, Test and Test2, with
  reusable page/post layouts, shared headers and footers, site identity,
  navigation and styles. Use **Site Template** in a document's inspector to
  apply a design. Templates share the block editor, List View, media library,
  undo/redo and responsive previews. JSON packages include managed images;
  full backups include original browser templates, assignments and shared recovery snapshots. See [Template editing](docs/templates.md).

- **Studio UI Library** at `/studio/ui`: compare the Ribbon and both panes around
  one workspace. **Ribbon** at `/studio/ui/ribbon` documents shared components
  and isolated ACM Studio/ACM Account examples; **Panes** at `/studio/ui/panes`
  covers the shared v1.0.0 component contract, skeletons, resizing and Studio
  examples; **Panels** at `/studio/ui/panels` demonstrates the shared card panel;
  **Icons** at `/studio/ui/icons` browses the original shared symbols
  at three scales; **Styles** at `/studio/ui/styles` explores the universal
  `@acm/styles` preset in a non-persistent preview sandbox. `/studio/ribbon` and
  `/studio/panes` redirect to their sections.
  See [Studio UI Library](docs/studio-ui-library.md), [Panel details](docs/panel-library.md),
  [Ribbon details](docs/ribbon-library.md),
  [the command inventory](docs/ribbon-command-inventory.md) and
  [Pane details](docs/pane-library.md).

The control centre lists the sites and environments currently connected to
ACM Studio. The separate Mini Golf project is not integrated with Studio; its
own project and hosted sites remain independent.

The existing content editor remains available at `/studio`.

The Publish date picker uses this device's local time zone. Its UTC offset
follows the selected date, including daylight-saving changes; saved timestamps
use UTC ISO format. Studio has no separate site time-zone setting.

- Gutenberg-style editing for pages and posts
- Reading Time, Post Author and Post Date blocks under the **Other** inserter
  group, with document-level metadata controls and shared Edit/Preview/publication rendering
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

Post metadata is editable rather than baked into the document canvas. Existing
posts are upgraded once to include Reading Time, Post Author and Post Date
blocks; the underlying author and publication date remain document fields, so
removing a display block does not lose metadata. Reading time uses 220 words
per minute, excludes metadata and image alternative text, and counts nested
ordinary content once. Workspace data uses version 25 with readers for versions 2–24; local publication
snapshots use version 18 and backups use version 5, with readers for their earlier
formats.

The architecture and next decision gate are recorded in
[`docs/FOUNDATION.md`](docs/FOUNDATION.md).

The design canvas architecture and supported first-release behaviour are
recorded in [`docs/design-canvas.md`](docs/design-canvas.md).

## Local checks

Run these commands from `/Users/andrewmoss/Documents/Codex/_Projects/acm-studio`:

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run lint
```

`npm run typecheck` uses `tsconfig.typecheck.json`, which resolves React types
from Studio's installed dependencies for shared packages consumed as source.
The runtime/build configuration stays in `tsconfig.json`. The obsolete
`app/studio/ui/blocks/paragraph/page 2.tsx` copy is preserved but excluded from
typechecking; the active Paragraph route is `page.tsx`.
ESLint also excludes local numbered copies ending in ` 2` or ` 3`; canonical
source and test files remain covered by the normal lint command.

Test module loading is owned by `tests/production-module.mjs`. Use
`loadProductionModule` for normal ESM imports and `createIsolatedModuleLoader`
for isolated hook and synchronisation harnesses. Both use the same source
resolution and raw-text import handling. Keep React, storage, locks, timers and
messaging fakes in the harness through `globals`, import-name `overrides`, or
root-relative `fileOverrides`; create one loader per simulated tab to keep its
module cache independent. `sourceOverrides` supplies alternate source files for
mutation checks while retaining the original import paths. Protocol fixtures
that deliberately reload modules can set `cache: false`. `resolveImport` handles
dynamic mocks and delegates ordinary imports to its shared `fallback` callback;
`transformSource` supports explicitly scoped private-export fixtures.

Complete-source fixtures with their own explicit context use
`evaluateProductionModule`. Existing host-realm fixtures use
`createHostModuleEvaluator` so their returned objects retain the host prototypes.
Vite integration fixtures use `loadViteModule`, retaining their source-package and
React deduplication settings. All these entry points belong to the same shared
loader. Add loading behaviour and regression coverage there rather than copying
it into a harness. `tests/test-loader-contract.test.mjs` enforces that boundary.
The explicit exceptions in `tests/source-extraction-fixtures.mjs` compile only
selected declarations, callbacks, expressions or sliced function bodies; generated
publication-script fixtures also retain their own browser-script execution.

## Documentation

- [`AGENTS.md`](AGENTS.md) — project scope, boundaries and verification
- [`CHANGELOG.md`](CHANGELOG.md) — notable project changes
- [`docs/FOUNDATION.md`](docs/FOUNDATION.md) — architecture and local limits
- [`docs/editor-parity-progress.md`](docs/editor-parity-progress.md) — Gutenberg
  comparison evidence, corrected issues and outstanding verification

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

## Test local website integration

Select Test in Studio's Sites navigation to edit its local header, body and
footer inside the existing editor, using the normal block library and inspector.
The disk document and local preview share revision-checked saves. Prompts are deferred. See [Test integration](docs/test-site-integration.md)
for configuration, supported blocks, verification and recovery.
