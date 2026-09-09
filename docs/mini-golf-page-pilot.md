# Mini Golf page pilot

## Environments

Staging and prod have separate entries in the Studio registry, verified against
Sites on 8 September 2026. The original route and storage key remain prod's;
staging uses `/studio/sites/mini-golf-scorecard-staging` and a separate key.
Both use the same local source project. Staging's initial page draft explicitly
uses the prod capture as a reference; it is not a capture of the private staging
deployment. Visiting either hosted environment does not publish local edits.

Staging is the primary working copy for this phase. All layout and editor
changes should be developed and verified there first. Production remains a
separate reference and draft store; synchronisation is a later, explicit
reviewed operation and is not automatic.

Display names match the provider: `Mini Golf Scorecard` and
`Mini Golf Scorecard Staging`. Sites treats these as independent projects;
the environment labels in Studio are local descriptive metadata, not a
provider-managed staging relationship.

The first site editor is intentionally limited to one local page draft. Its
`miniGolfPresentation` integration is sourced from Mini Golf revision
`0d2df8bd31f277df31522aa47ca6bf785888c460` (`app/page.tsx`,
`app/components/game-setup.tsx`, `score-table.tsx`, `leaderboard.tsx`,
`share-actions.tsx`, `app/layout.tsx` and `app/globals.css`). It reuses the
real page composition and scoped presentation while the shared Studio editor
supplies selection, insertion and block commands. Code-backed blocks carry a
closed source reference (`module`, export and revision) for the component that
owns their rendering; draft data never contains executable code. These fields
are provenance for the local integration and source navigation, not a promise
that Studio dynamically imports or executes the other repository at runtime.

`public/site-previews/mini-golf-scorecard.html` was captured on 8 September 2026
from https://mini-golf-scorecard.andrewcharlesmoss.chatgpt.site/ with its
`/_next/static/css/index.MPsFfyFy.css` stylesheet. It retains the original
markup, palette, responsive rules, logo, course background, game areas and
footer. Images and fonts use the original public URLs and require network
access. This is a captured revision, not a continuous live connection.

The page document now uses a `section` block for every visible page section.
Each section stores serialisable properties, nested ordinary blocks and a closed
`source` reference; it never stores executable code. The source-to-block mapping
for revision `0d2df8bd31f277df31522aa47ca6bf785888c460` is:

| Source element | Studio representation | Behaviour in Studio |
| --- | --- | --- |
| `Home` hero | `section[role=hero]`, image and copy section with eyebrow/title blocks | title, subtitle metadata and logo editable; source hides the eyebrow |
| `account-bar panel` | account section, copy section, eyebrow/status paragraphs and action button | label, status and action URL editable; authentication inactive |
| `GameSetup` / `setup panel` | setup section with select fields and button children | draft values editable; game actions inactive |
| `ScoreTable` / `score-panel table` | scorecard section, heading/actions sections, progress paragraph, table-size field, auto-resize button and typed table | labels, options and cells editable; game rules inactive |
| `Leaderboard` / `summary-grid` | leaderboard section with heading and nested player cards | each name, score, label and metric is a nested text block |
| `ShareActions` / `finish panel` | share section with heading and button children | labels and URLs editable; export/copy inactive |
| `site-footer` | footer section with brand, copyright and social-link blocks | mark, name, copyright, icons, accessible labels and link targets editable |

Every page-authored value is held in the typed block tree. Closed `siteRole`
metadata identifies the source role of ordinary image, paragraph, heading,
button and field blocks independently of their IDs. Focused section roles own
source containers such as the account copy, scorecard actions, player card,
metric and social link. The renderer visits children in their saved order.
List View exposes all sections and descendants, with move and delete actions
for the selected block. Source text uses the shared rich-text editor; authored
formatting is rendered in both Edit and Preview.

The repeated score table cells, player drag/move/resize affordances, hidden
score-error announcements and leaderboard rank counters are derived table/game
scaffolding. They are not separate page-authored blocks. Gameplay calculations,
authentication and publishing remain outside this prototype. The table-size field controls only presentation within its owning scorecard:
Small is 13px, Standard is 16px and Large is 19px. Unknown authored options use
Standard. This changes typography, not game state.

Standalone preview routes are `/studio/sites/mini-golf-scorecard/preview` and
`/studio/sites/mini-golf-scorecard-staging/preview`. They use the same recursive
source presentation. A trailing footer renders outside `main.shell`, matching
the source. Deliberately moving it earlier keeps the authored order inside the
main page instead. Header and footer have no hidden fallback slots: deleting
those blocks removes them. The Code view serialises the typed editing tree,
including role and block-ID metadata; it is not a byte-for-byte copy of the
rendered application HTML. Runtime scaffolding and Studio controls are not
exported as authored content.

Draft envelope version 7 added the formerly hardcoded hero, footer and nested
content once when loading versions 1–6. Existing title/subtitle, names, metrics,
table data, unrelated notes and deleted existing sections are retained. New IDs
are collision-safe. Original player paragraph data is retained as migration
provenance. Version 7 and later loading never fills deleted blocks back in. Parsing is
read-only; only the next authorised save writes the migrated version. Invalid
payloads are never replaced.

The scoped page CSS follows Mini Golf `app/globals.css` at revision
`0d2df8bd31f277df31522aa47ca6bf785888c460`, including the hosted Inter/Inter Fallback font stack,
regular headings, 1120px shell and 120px default player columns. Authored table
column proportions and row heights remain applied. Imported page content
retains source typography, including smaller control labels; Studio's own
controls retain their 13px minimum. Source viewport breakpoints use the page
canvas width inside Studio. At narrower tablet widths, leaderboard and footer
layouts wrap to avoid the source's horizontal overflow.

The draft has a dedicated storage key and uses Studio's existing write lock.
It does not access the legacy draft/media/publication stores. The source Mini
Golf repository and public site are unchanged. Draft JSON export is available;
import/restore and live publishing are not implemented in this small pilot.

To deliberately refresh the source snapshot, run from `acm-studio`:

```sh
node scripts/import-mini-golf-page.mjs | apply_patch
```

Review the generated diff and the inherited section selectors before accepting
a refresh. Changes to the source page can require changes to the adapter.

## Files and code

Files & Code displays a separate snapshot of the local Mini Golf checkout,
including uncommitted source changes. It is intentionally labelled separately
from the published-page snapshot. Text is rendered as escaped code; bitmap
assets use data URLs, and SVG files are displayed as source text.

`scripts/import-mini-golf-files.mjs` collects Git-tracked and non-ignored files
from an explicit set of source, test, documentation and asset directories,
plus named project configuration files. It excludes environment/credential
files, private-key formats, symlinks, dependencies and generated output. It
rejects oversized files and withholds file contents when common credential
literals, secret assignments, credential-bearing URLs or JWTs are detected.
This can also hide test fixtures; it is a safeguard, not a complete secret audit.
Review source for credentials before any deliberate publication of this Studio
snapshot; this pilot has only been authorised for local use.

Refresh from the Studio root, then review the generated file:

```sh
node scripts/import-mini-golf-files.mjs ../mini-golf-scorecard | apply_patch
```

This changes only `public/site-previews/mini-golf-files.json` inside Studio.
It never writes to the Mini Golf checkout. Edits to Studio drafts are not source
code changes and do not appear in this read-only file browser.


## Hosted staging fidelity update

Version 8 assigns the New Game button an explicit `new-game` role, so its
appearance survives duplication and changed IDs. Staging's untouched legacy
account action migrates to “Continue with ACM Account” and `/api/auth/choose`;
custom labels or URLs are retained. Production remains separate. The action
is inert in Studio, and no authentication request is dispatched.

Both editor and preview use the hosted source Inter stack where installed or
loaded, keeping the source weight hierarchy. Player movement arrows are hidden
on desktop and shown below the source 650px page-width breakpoint. The source
64px hole, 120px player and 76px total column defaults remain unchanged;
authored dimensions still take precedence.

Code exports paragraph alignment and explicit table width/height metadata.
Parsing validates positive dimensions and retains existing dimensions when
block identity and the corresponding row or column count remain compatible.
Footer social-link accessible labels continue to come from their button blocks.


Version 9 repairs a missing footer-links accessible group label in older typed
drafts without replacing children or authored labels. For version 8 drafts,
this does not repeat the earlier staging account migration.

### Embedded source font

The seven unmodified Inter WOFF2 subsets in `public/fonts/mini-golf-inter/`
come from the Mini Golf source checkout's generated Inter font bundle
(`.vinext/fonts/inter-9df0d028785c`), copied on 9 September 2026. They retain
normal style, variable weights 100–900 and the source Unicode ranges.
`site-draft.css` registers them as `Mini Golf Inter` with `font-display: swap`;
this CSS alias limits their use to Mini Golf and does not change Studio's
shared font definitions. The font binaries have not been renamed or modified.
The bundled `LICENSE.txt` is the Inter project's SIL Open Font License v1.1,
with its copyright notice; upstream source is
https://github.com/rsms/inter/blob/master/LICENSE.txt.


### Local playable preview

Preview and standalone preview use the sibling Mini Golf checkout's domain,
validation, score table, column sizing/reordering hooks and export generators
through the source-owned `app/studio-integration.ts` entrypoint. The exact consumed source hashes are recorded
in `mini-golf-runtime-source.json`; the local working tree is the baseline, not
an assertion of hosted parity. Building Studio now requires that sibling checkout.
The integration entrypoint is the only Mini Golf file added by this change;
canonical gameplay and export implementations remain unchanged.

Edit retains block selection and authoring while gameplay controls operate the
shared session. Preview uses the same gameplay handlers without editor controls.
One separate game session per site/page survives mode switches. The v10 migration assigns explicit runtime roles to setup fields, actions and
metrics without changing authored content. Duplication preserves those roles;
legacy IDs remain a compatibility fallback. Renaming labels never disconnects
actions. Pristine sessions track current authored defaults and table text size
until the first gameplay or table-layout interaction. Only dirty sessions save. The first retained
leaderboard card is the editable repeated-entry template; later legacy cards
remain stored for compatibility and are suppressed only in Preview. Edit keeps
all authored cards and child identities available for selection and authoring,
binding each card to its corresponding runtime ranking. Cards without a runtime
player retain their authored values. Its metric roles
bind average, deviation and holes played. Deleting every card removes the repeated
leaderboard. Arbitrary React or two-way source-page synchronisation is not provided.

Runtime widths are canonical pixel measurements keyed by player ID. Authored
proportional widths convert against the source natural width (140px plus 120px
per authored player); row heights remain pixels. Runtime resizing starts from
those converted widths and never saves measurements into page blocks. The source table owns its runtime internals; the authored score heading
and actions remain outside it. Preview uses source score controls and calculations with authored labels. Authored names and setup defaults seed a fresh
session; subsequent play does not alter those defaults.

The isolated `acm-studio-mini-golf-session-v1:<site>:<page>:scorecard` game key is
validated by the source parser. Writes require Studio's existing lifetime owner
and its write coordinator; unreadable data is retained, and non-owning standalone
previews play in memory. Ownership changes reload the current stored snapshot
before saving. Account actions remain inert. CSV, designed PNG and HTML clipboard
exports call the source generators and browser handlers. Browser download and
clipboard permission verification is required separately from unit checks.

The source table remains the gameplay renderer. A narrow text-cell adapter maps
existing `table.rows` onto its Hole/Total headings, hole labels and total-row
label. In Edit these text-only cells contain labelled, keyboard-accessible plaintext
controls; the original header/data-cell semantics remain intact.
Focus selects the corresponding typed table cell; input uses the ordinary Studio
block-update, ownership and history path. Preview applies the same text without
editable attributes. Source score/name inputs and spinner handlers are untouched.

For calculated cells, the corresponding row value is explicitly the empty-state
label. Any authored string (including an empty string) is shown while the source
total is zero. A nonzero source total replaces that label and remains read-only;
resetting scores restores the saved label. Editing a placeholder never changes
game scores or exporters. Existing row serialisation, validation and the page
contract preserve these strings without a schema migration. Runtime-only extra
holes/players without authored cells retain source labels/placeholders. Header and
footer visibility remain source structure rather than runtime template switches.


### Page-definition interchange contract v1

`app/studio/mini-golf-page-contract.ts` defines `MiniGolfPageDefinition` and the
`blocksToMiniGolfPageDefinition` / `miniGolfPageDefinitionToBlocks` mappings.
Export Draft includes this serialisable definition alongside the existing
workspace export. The definition retains the full typed block tree, stable page
and scorecard-instance IDs, source revision and file hashes. Nesting, ordering,
labels, rich text, styles, layouts, dimensions, bindings and deletions round-trip
without rebuilding content from HTML. Derived descriptors identify the authored
setup defaults and each leaderboard's first retained entry template; imports
reject disagreement between those descriptors and their canonical blocks.

The format rejects unsupported versions, block shapes, duplicate IDs, non-JSON
values and unknown top-level fields explicitly. Supported generic block types
remain intact; the contract does not interpret arbitrary React components.
Deterministic equality sorts object keys while preserving array order. The
three-way `compareMiniGolfPageChanges` helper takes the editing baseline, current
source definition and current draft. It identifies unchanged, source-only,
blocks-only and converged changes. Divergent concurrent changes return a conflict
containing all three complete definitions; callers must resolve that conflict
before any write. It is deliberately conservative and does not merge independent
field changes automatically.

This is an implemented local interchange and conflict-detection boundary, not a
connected synchronisation service. The sibling Mini Golf application does not yet
consume the definition, and Studio has no source-writing or source-watch path.
Import helpers return validated blocks; applying them requires the existing draft
ownership gate. Gameplay scores never enter the page-definition export.
