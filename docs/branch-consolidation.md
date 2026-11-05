# Local branch consolidation — 5 November 2026

This consolidation preserves the current implementation on local `main`, brings
in the useful recovery work and resolves obsolete tests against the current
production contracts. It is not a release or a Sites publication.

## Recovery and integration decisions

The starting local revision is `f93e82d576b71d686e840e4951921cb27e07fd12`.
The fetched GitHub `main` is `f0c37fe2799807231a136a6f58a52868988049f9`;
the starting local revision is 169 commits ahead with no remote-only commits.
Existing branches, detached worktrees and both Git stashes remain available.
All 17 numbered copies were compared with their canonical counterparts and
matched the original recovery archive by SHA-256. Their useful behaviour is
represented in the current implementations and tests; older contract decisions
are superseded as described below. They are preserved under the ignored
`work/consolidation-recovery/2026-11-05/` directory as individual files and
`numbered-copies.tar.gz`, with original paths and hashes in `manifest.json`.
Archive and moved-file hashes were verified before treating recovery as complete.
These recovery artefacts are excluded from the source commit.

- `codex/status-icon-colours` is patch-equivalent to the integrated colour work
  at `f087378f`.
- `codex/pullquote-block` supplies an older implementation. The current distinct
  Pullquote and its compatibility coverage supersede that implementation. Its
  useful raw-CSS loader behaviour is already present; its shared-style import is
  adopted through the supported `@acm/styles` package export. Its alternate
  governance-path fallbacks are deliberately excluded because shared references
  must resolve to the canonical governance directory.
- Detached recovery work that appends a restored page to the end of the list is
  superseded by the current contract retaining its saved order. Optional Colour
  row visibility remains independent for each scope, superseding an older shared
  visibility implementation. Notice-flash and Theme palette geometry regressions
  from those worktrees are retained with the canonical browser tests.
- Stashes `1b5575c95bebe782c578baf7bfeafbf83e6e49ec` and
  `081a658d71b684b707ce87a1fbfe948e4b9f61af` remain intact. Recovered labels and
  icon dates use the current Universal → Global → Local labels and artwork
  modification timestamps.

Backup v38 explicitly retains foreign media revision metadata from pre-v7
backups. It stores that data in an inert versioned recovery envelope and assigns
a fresh active revision. Old fields colliding with the recovery field are nested
without loss; current revisions remain strict. Actual IndexedDB restore,
re-export, reimport, metadata edits and byte replacement have regression coverage.

## Verification and limitations

`npm test` runs the production build followed by the complete Node suite. The
final post-fix run passes all 3,366 tests. Type checking and focused browser checks are
separate evidence. Browser regressions cover the production components and live
storage adapters; disposable HTTP fixtures isolate gateway checks from user data.
The Library header grid and inset fixes have rendered responsive regression
coverage, including the production header specimen. Real gateway fixtures
cover palette geometry and the Site Editor header interactions. The disposable
HTTP fixture drains its stores and releases retained proxy responses on shutdown.
Chrome is used for automated browser checks because the configured Playwright
Chromium installation is unavailable on this workstation.

Video caption-track authoring remains unsupported, as recorded in the Video
capability profile. `jsx-a11y/media-has-caption` continues to report that limitation;
the rule has not been disabled and no placeholder caption track has been added.
This consolidation must not be described as having a clean lint run while that
error remains. Full caption support needs its own authoring, file, compatibility
and playback verification.

## Remote target

The requested push target is GitHub `origin/main` in
`andrewcharlesmoss/acm-studio`. On inspection, GitHub reported no repository
webhooks, Actions workflows or deployment records, and `main` was unprotected.
The local repository has no active Git push hooks. Local verification and the
owner's review are the available checks; no server-enforced review is implied.
The separate `sites` remote and `.openai/hosting.json` are not push targets for
this operation. Sites publication remains a separate explicitly authorised step.

## Review basis

The governing sources are the unversioned workspace and ACM Studio `AGENTS.md`
instructions supplied for this task on 5 November 2026, and the canonical shared
`STYLE_GUIDE.md` read on that date. The last committed shared guide/instructions
baseline inspected is workspace-governance `003f2eb01227767997d401ec861d2d9cc22f662a`;
the starting Studio instructions are tracked from `26c3e436` with existing local
updates preserved. Behavioural changes follow Explorer → Builder → independent
read-only Verifier review. Tests, rendered behaviour, Git integration and hosted
publication remain distinct evidence.
