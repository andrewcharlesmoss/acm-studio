# ACM Studio

ACM Studio provides reusable ACM tools and retains a local editorial management
and publishing prototype. Current work prioritises the holistic redesign of
the existing WordPress site at `andrewmoss.me`, using that site to establish a
practical shared ACM design foundation. ACM Account integration with WordPress
follows that website phase, ahead of returning to Loquafy. Studio's
custom content and site editors take a back seat; reusable tools remain active.
See [Project direction and lessons](docs/project-direction.md).

The live WordPress website and the separate Sites-based `andrew-moss` project
are distinct from this repository. The features below describe existing Studio
capabilities, not an automatic publishing connection to either personal site.

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
  `@andrewcharlesmoss/styles` preset in a non-persistent preview sandbox. `/studio/ribbon` and
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
workspace creates a checked binary recovery file containing private drafts and original
media and should therefore be stored securely.

Complete backups keep media as binary files and verify their checksums before restoration.
Existing JSON backups remain readable within their original 100 MiB limit. If a saved
workspace cannot be read or has an unsupported structure, Studio preserves
the original value and disables autosave. Restore a valid backup to resume;
do not clear browser data if the unreadable value still needs recovery.

Post metadata is editable rather than baked into the document canvas. Existing
posts are upgraded once to include Reading Time, Post Author and Post Date
blocks; the underlying author and publication date remain document fields, so
removing a display block does not lose metadata. Reading time uses 220 words
per minute, excludes metadata and image alternative text, and counts nested
ordinary content once. See [Storage formats](docs/storage-formats.md) for the current writers and supported readers.

The architecture and next decision gate are recorded in
[`docs/FOUNDATION.md`](docs/FOUNDATION.md).

[Motion Assets](docs/motion-assets.md) covers sketch animation projects and SVG, Lottie, and local transparent MOV export.

The design canvas architecture and supported first-release behaviour are
recorded in [`docs/design-canvas.md`](docs/design-canvas.md).

## Clean checkout setup

Studio pins Icons, Panel, Ribbon, and Styles to private GitHub Packages
releases from the independent `packages` repository. A clean `npm ci` requires
read access to that registry. The workspace style guide remains in the
independent `workspace-governance` repository. For a reproducible build, check
out the verified guide revision alongside Studio. From a new parent directory
with access to both GitHub repositories, run:

```bash
git clone https://github.com/andrewcharlesmoss/acm-studio.git
git clone https://github.com/andrewcharlesmoss/workspace-governance.git
git -C workspace-governance checkout --detach fb55921934ed8874466647778968a9867152f1e1
cd acm-studio
npm ci
npm run build
```

For an unpublished local revision, use the path to the local governance repository
as the source of the second clone.

The guide revision is a build input; advance it deliberately and verify Studio
when the guide changes. Local development continues to use the adjacent working
copy of the guide and its revision-checked editing gateway. Original Git histories are
retained locally in `_Recovery/acm-packages-2026-11-22`, alongside `_Projects`.
These local source revisions were imported without rewriting their histories:

| Package | Historical source revision |
| --- | --- |
| `@acm/icons` | `69e23840d52a9f6bd2576b484c13b3a3e6d5095a`, plus the reviewed Files illustration edit |
| `@acm/panel` | `729dbc6dad4f5c1da38c9d3c0d18ab09c2b24ab6` |
| `@acm/ribbon` | `7f9ed087fe18bdf7233a1fca7b98e7b439c83c57` |
| `@acm/styles` | `83d2db2a907137f38f423d8080bbde98cee21cf8` |

The archive is local-only and is not included in a normal Studio GitHub push.
It retains the historical branches and uncommitted files. In particular, Icons
commit `c23b378` contains Mobile and Update Linked Media artwork that differs
from Studio; restoring it requires a separate design review.

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
resolution and raw-text import handling. ESM loading uses Node’s native module
graph with scoped TypeScript, TSX, CSS, and raw-text hooks, preserving cycles
and shared dependency identity without expanding dependencies into data URLs.
Synchronous hooks are used where available, with asynchronous hooks for older
supported Node versions. Keep React, storage, locks, timers and
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
- [`docs/project-direction.md`](docs/project-direction.md) — current priorities,
  the personal website pilot, shared theme direction, and lessons learned
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
