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
final warning-cleanup run passes all 3,371 tests. The final production build,
type check and control-library check also pass (486 ordinary and 24 specialised
fields, with no unlinked ordinary fields). The final production-artefact
browser run passes all 59 checks, separately from the Node suite. Browser regressions cover the production components and live
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
Andrew explicitly accepted recording this limitation and completing the commit
and GitHub push on 5 November 2026. The final lint run reports this one error
and zero warnings; it is not a clean lint run. Full caption support needs its
own authoring, file, compatibility and playback verification. In-progress
caption work is excluded and preserved as an incomplete, hash-verified patch
and new-file archive under
`work/consolidation-recovery/2026-11-05/caption-work-incomplete/`. It is not
represented as verified or complete. Existing data-format versions are unchanged.

Hook dependency fixes retain blob-URL retries, media ownership, Embed editing and
site ordering. Files refreshes now follow a replacement resource adapter without
aborting an in-flight insertion, and outdated failed reads cannot overwrite the
latest successful status. A deferred-read regression fails before that guard and
passes afterwards. Native image annotations document the existing Blob URL and
portable renderer boundary; they do not disable accessibility rules.

Rendered regression checks also exercise Embed URL authoring, independent
inspector edits, cancellation, Undo/Redo and native Enter/Space submission.
Primary pointer submission avoids ancestor reselection and focus scrolling
between down and up. The shared toolbar reveals focused actions through nested
canvas scrolling, retaining one row at narrow widths; Tab traversal checks each
action’s intersection with the visible viewport. These fixes use the canonical
production controls in the content, template and Library specimens. Metadata
examples select their actual canonical block type while retaining legacy IDs,
so Author, Title, Subtitle and Time to Read no longer fall back to Title.
Broader browser assertions target the current example buttons, generic Social
Link services, editable Details summary, scoped chooser dialogs and actual
rendered dimensions; their behavioural, history and read-only checks remain.
Grid drag geometry excludes collapsed zero-width tracks when measuring its
stride; one visible track still changes the span by one, with Undo and keyboard
coverage. The regression fails with the former averaged stride.

The workspace documentation validator also ran. Studio’s repeated Unreleased
category headings were consolidated without dropping changelog entries. Its
remaining two errors concern category ordering in the sibling `acm-icons`
changelog, and its three registry warnings concern unrelated workspace folders.
Those external sources were left unchanged; the whole-workspace audit is not
reported as passing. An earlier isolated browser run received a transient
HTTP 500 before the Studio editor loaded; it did not recur in the passing
production Files replay. Its cause was not established.

Independent read-only verification found no blocking issue in the final diff
and confirmed the final build, Node and browser evidence.

## Local template recovery after consolidation

The live global template library still carried the deferred caption experiment's
library v42 and template v0.71.0 identifiers. The consolidated readers correctly
rejected them, leaving the source intact. A recursive inspection found no Video
`tracks` or `crossOrigin` fields. An independent read-only reviewer confirmed
that changing only those two identifiers to v41 and v0.70.0 passed the current
production validator without any other structural change.

The verified local Studio server was stopped gracefully. Recovery acquired the
existing exclusive process guard, retained an exact original in
`.studio/global-template-history/` under its SHA-256 filename with the suffix
`-caption-experiment-original.json`, checked the source for concurrent changes,
and atomically replaced only those two version values. Readback validation
passed. Project Ports restarted Studio on its configured port 3010; the open
browser reconnected and displayed all four global originals with saved status
and no error. This is a repair of a known local experimental artefact, not a
reader change accepting arbitrary future versions. The recovery copy remains
local and is excluded from Git.

The subsequent workspace documentation fixes also cleared the ACM Icons
category-order errors and registered the three asset/placeholder directories.
The workspace audit then passed for all 13 review projects, with no errors or
warnings.

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
