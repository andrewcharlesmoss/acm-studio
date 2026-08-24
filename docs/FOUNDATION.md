# ACM publishing foundation

## Product direction

Andrew Charles Moss is the organising identity. Projects are the primary public
surface, while writing remains visible as a useful, long-lived archive. The
eventual product is a coherent publishing system, not a general WordPress clone.

## What this foundation proves

1. A project-led public hierarchy can comfortably contain independent products.
2. Articles can remain first-class content and connect back to relevant projects.
3. Structured content blocks can be rendered without binding content to an
   editor or storage provider.
4. A Gutenberg-style Studio can demonstrate the future page and post workflow
   before database, authentication and deployment decisions are made.

## Included now

- Public home, project index, project detail, writing index and article detail.
- Typed sample content for projects and articles.
- Structured paragraph, heading, quote, list, code, image, embed, button and
  divider blocks.
- A page and post library with local create, switch, duplicate and delete actions.
- A searchable block inserter, reorderable canvas and contextual block settings.
- Document settings for status, address, description, page/post metadata and SEO.
- Local autosave, undo/redo, preview and individual or workspace JSON export.
- An integrated browser-local file manager with multi-file upload, folders,
  search, type filters, sorting, grid/list views and storage totals.
- File metadata, rename, move, download and delete operations.
- Stable media IDs connecting managed images to page and post blocks.
- Validated post publication with explicit publish, update and unpublish actions.
- A browser-local Writing archive and article route for published Studio posts.
- Separate editable and published snapshots, preventing draft edits from leaking
  into the visible article before an explicit update.
- Complete browser-local backup export covering the workspace, publication
  snapshot, media folders and original file bytes.
- Validated restore preview, explicit replacement confirmation and rollback if
  replacement cannot complete.
- Responsive, accessible presentation with shared ACM design tokens.

## Explicitly deferred

- Hosted database, object storage, accounts, login, roles and MFA.
- Production publishing, WordPress import and URL redirects.
- Durable revisions, scheduling, taxonomy management and public search.
- Comments, forms, newsletters, analytics, plugins and themes.

## Next decision gate

Before adding persistence, review the public hierarchy and block-editing interaction.
Only then choose a database, media store and authentication provider. The chosen
providers must sit behind application-owned content and publishing boundaries.

## Local file boundary

The file manager stores actual file blobs and metadata in browser IndexedDB.
This is appropriate for proving the complete editorial workflow, but it is not
authoritative storage: clearing browser data removes the library, other devices
cannot see it, and exported content JSON does not contain the file bytes. The
future durable implementation should preserve the media record shape while
moving metadata to application-owned persistence and blobs to object storage.

## Local publication boundary

Studio autosaves editable documents separately from the browser's publication
snapshot. Publishing validates the title, excerpt, address and content, then
copies the post into that snapshot. Later edits remain private until **Update**
is selected; **Return to draft** removes the public snapshot. The Writing
archive and article URL read this snapshot on the same browser only. Clearing
browser data, changing browser or changing device removes access to these local
publications, and search engines cannot index them.

## Backup boundary

The Backup workspace serialises content, publication snapshots, media metadata
and media bytes into one ACM Studio JSON backup. Restore first validates the
format and displays counts before replacement is enabled. It replaces the local
workspace only after a confirmation and rolls back to the previous browser data
if the operation fails. The backup is portable but unencrypted; it may contain
private drafts and original files and must therefore be stored securely.
