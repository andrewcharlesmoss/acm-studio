# ACM Studio

ACM Studio is ACM's local editorial management and publishing workspace. It is
the control plane for structured content, media, drafts, previews and future
publishing contracts across ACM projects.

The separate `andrew-moss` project owns Andrew Moss's public personal
presentation layer. ACM Studio does not replace that site; it prepares and
manages the content that future ACM sites may consume through explicit
contracts.

## Included

- Gutenberg-style editing for pages and posts
- Typed, portable content records and structured content blocks
- Page and post library with create, duplicate and delete actions
- Searchable block inserter and reorderable editing canvas
- Document settings, block settings, undo/redo and preview
- Browser-local autosave, local publication and update workflows
- Integrated local file manager with uploads, folders, search and file details
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

The architecture and next decision gate are recorded in
[`docs/FOUNDATION.md`](docs/FOUNDATION.md).

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
