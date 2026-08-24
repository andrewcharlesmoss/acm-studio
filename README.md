# ACM publishing foundation

A local, database-free and login-free foundation for the future Andrew Charles
Moss publishing system.

The public site places projects at the top of the hierarchy and preserves
writing as a connected archive. The Studio route provides a Gutenberg-style
editor for pages and posts, with structured blocks, local autosave, preview and
portable JSON export. It does not claim to be a production publishing system.

## Included

- Project-led homepage and index
- Individual project routes
- Writing archive and article routes
- Typed, portable content records
- Structured, provider-independent content blocks
- Page and post library with create, duplicate and delete actions
- Searchable nine-block inserter and reorderable editing canvas
- Document settings, block settings, undo/redo and preview
- Local autosave and individual or workspace JSON export
- Integrated local file manager with uploads, folders, search and file details
- Managed image insertion using stable media references
- Explicit local publish, update and unpublish workflow for posts
- Browser-local posts in the Writing archive with working public-style URLs
- Complete backup download containing drafts, publications, folders and files
- Checked restore preview with explicit replacement confirmation and rollback
- Responsive ACM presentation using `Inter, sans-serif`

## Deliberately excluded

- Hosted database and object storage
- Login, accounts and permissions
- Production publishing and deployment
- WordPress migration
- Plugins, themes, comments and newsletters

Studio files are stored as real blobs in this browser using IndexedDB. They are
device-local working files, not backups or securely published media.
Published posts use a separate browser snapshot, so editing an existing post
does not change its public version until **Update** is selected.
The Backup workspace creates a single JSON recovery file. Because it contains
the actual media data as well as private drafts, it should be stored securely.

The scope and next decision gate are recorded in
[`docs/FOUNDATION.md`](docs/FOUNDATION.md).

## Local checks

```bash
npm run dev
npm run build
npm test
npm run lint
```
