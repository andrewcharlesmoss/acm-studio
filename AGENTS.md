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
Its upstream SVG provenance and licence are recorded in
`docs/third-party/gutenberg.md`. Check that record before distributing these
assets; do not redraw the icons or infer CSS sizes from Retina screenshots.

Studio interaction controls use source-faithful Gutenberg SVGs through
`app/studio/studio-icons.tsx`. Do not introduce Unicode glyphs or manually
redrawn paths for new Studio controls; add the upstream source, revision and
provenance to `docs/third-party/gutenberg.md` when extending the icon set.

Studio interface text uses Gutenberg's 13px system UI baseline through
`--studio-ui-font` and `--studio-ui-size`. Do not introduce interface text
smaller than that token: use hierarchy, weight, colour and spacing instead.
Article and block content may retain their content-specific typography.

Edit and Preview must share block presentation rules, including typography,
colours, spacing and dimensions. Use the Studio variant of `BlockRenderer`
for editor previews, not the public article's prose theme. Keep selection
controls and empty-field prompts editor-only; excerpts are metadata, not
additional body content. Verify both modes when changing a block's appearance.

## Foundation boundary

- This phase is deliberately database-free and login-free.
- Sample content is application-owned and lives in `app/content/`.
- The Studio is a local prototype. It may use browser storage for a draft, but
  must not imply that content is securely or durably published.
- Do not add plugins, themes, comments, membership, newsletter automation,
  analytics, scheduling or multi-user permissions during the foundation phase.
- Do not publish or deploy without an explicit request.

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

The Mini Golf Scorecard pilot at `/studio/sites/mini-golf-scorecard` is a local
page-content and layout draft only. Its repository uses a separate storage key
and the same write-ownership coordinator; it must not use the legacy Studio's
media, publications or backup stores. Site navigation uses full-page links to
reset editing state. Preview may run the shared Mini Golf game locally with isolated, owner-gated
session storage. Page authoring and game sessions remain separate. Writes to the
Mini Golf project or live site are not part of the page-draft pilot.

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
