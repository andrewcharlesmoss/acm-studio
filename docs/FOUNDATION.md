# ACM Studio foundation

## Product direction

ACM Studio is the editorial control plane for the ACM ecosystem. It owns the
structured content model, Gutenberg-style editing, media management, local
publication workflow and future publishing contracts.

Andrew Moss is a separate public presentation project. ACM Studio can provide
portable content and local previews for that site, but the two projects must
remain separate until an explicit publishing contract connects them.

The eventual product is a coherent publishing system, not a general WordPress
clone.

## What this foundation proves

1. Structured content can be edited without binding it to one editor or storage
   provider.
2. Articles and project content can remain portable across future ACM sites.
3. A browser-local Studio can demonstrate the editorial workflow before database,
   authentication and deployment decisions are made.
4. Media, draft, publication and backup boundaries can be made explicit early.

## Included now

- Typed sample content for projects and articles.
- Structured paragraph, heading, quote, list, code, image, embed, button and
  divider blocks.
- A page and post library with local create, switch, duplicate and delete actions.
- A searchable block inserter, reorderable canvas and contextual block settings.
- Document settings for status, address, description, page/post metadata and SEO.
- Local autosave, undo/redo, preview and individual or workspace JSON export.
- An integrated browser-local file manager with uploads, folders, search, type
  filters, sorting, grid/list views and storage totals.
- Stable media IDs connecting managed images to page and post blocks.
- Explicit publish, update and unpublish actions for local post snapshots.
- Complete browser-local backup export covering content, publication snapshots,
  media metadata and original file bytes.
- Validated restore preview, explicit replacement confirmation and rollback if
  replacement cannot complete.

## Explicitly deferred

- Hosted database, object storage, accounts, login, roles and MFA.
- The publishing contract between ACM Studio and Andrew Moss.
- Production publishing, WordPress import and URL redirects.
- Durable revisions, scheduling, taxonomy management and public search.
- Comments, forms, newsletters, analytics, plugins and themes.

## Next decision gate

Before adding persistence or authentication, define the publishing contract
between ACM Studio and consuming ACM sites. Only then choose a database, media
store and authentication provider. Providers must sit behind application-owned
content and publishing boundaries.

## Local file boundary

The file manager stores actual file blobs and metadata in browser IndexedDB. It
is appropriate for proving the complete editorial workflow, but it is not
authoritative storage: clearing browser data removes the library, other devices
cannot see it and exported content JSON does not contain the file bytes.

## Local publication boundary

Studio autosaves editable documents separately from the browser's publication
snapshot. Publishing validates the title, address and content, then copies the
post into that snapshot. The excerpt is optional: when it is blank, Studio
generates a short summary from the post's opening content, using the title when
the content has no extractable text. Later edits remain private until **Update**
is selected. The local preview and writing routes read this snapshot on the same
browser only.

## Backup boundary

The Backup workspace serialises content, publication snapshots, media metadata
and media bytes into one ACM Studio JSON backup. Restore validates the format
before replacement is enabled and rolls back to the previous browser data if the
operation fails. The backup is portable but unencrypted and may contain private
drafts and original files.
