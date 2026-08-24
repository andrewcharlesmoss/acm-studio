# Andrew Charles Moss web foundation

## Purpose

This repository is the foundation for the Andrew Charles Moss website and its
future publishing system. The public site presents Andrew as the parent identity,
with projects first and writing retained as a durable archive.

## Shared standards

- Use British English in visible copy and documentation.
- Put a space either side of an em dash — like this.
- Use `Inter, sans-serif` as the default typeface.
- Prefer semantic HTML, keyboard-accessible controls and visible focus states.
- Keep layouts restrained, readable and responsive rather than ornamental.
- Treat rendered browser behaviour as the evidence for visual changes.

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

## Verification

- Run the production build and focused tests for every material change.
- Check representative public and detail routes.
- Verify the Studio's local edit, preview and export flows in a real browser
  before treating them as complete.
- Report anything not tested or intentionally deferred.
