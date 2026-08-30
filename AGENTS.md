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

For editor interactions and visible controls, use WordPress Gutenberg's
established behaviour and visual language as the default foundation. Adapt it
to ACM Studio's content model where necessary, but do not invent a wholly new
editor style unless there is an explicit product decision to do so.

The table-action dropdown deliberately uses Gutenberg's system UI font stack
and measured compact menu dimensions instead of the shared Inter baseline.
Its upstream SVG provenance and licence are recorded in
`docs/third-party/gutenberg.md`. Check that record before distributing these
assets; do not redraw the icons or infer CSS sizes from Retina screenshots.

Studio interface text uses Gutenberg's 13px system UI baseline through
`--studio-ui-font` and `--studio-ui-size`. Do not introduce interface text
smaller than that token: use hierarchy, weight, colour and spacing instead.
Article and block content may retain their content-specific typography.

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
