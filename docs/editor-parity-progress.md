# Editor Gutenberg parity progress

## Revised priorities — 4 October 2026

Andrew updated the active goal to finish the complete inventory, fix the
highest-impact broken behaviours first, reuse accepted checks unless related
code changes, run focused checks after each fix and the full suite once near
the end, and defer lower-priority visual differences. The current
[block, menu and pane-control inventory](editor-parity-inventory.md) records all
29 catalogue entries, additional editing contexts and control metadata, with
source owners and explicit evidence limits.

Caret Link insertion/editing and external List boundaries now have bounded
accepted results below. The remaining work is the unverified control/context
matrix and persistence evidence. Previously accepted internal List operations,
selection, Column drop and formatting cohorts remain accepted within their recorded scope.
Minor icon colours, Design neutral colours and spacing remain deferred.

Independent review of the partial behaviour-test owner migration accepted it
after the Builder restored the original unresolved Design colour expectation.
The single-file run reports 150 tests: 129 passing and 21 failing. Shared-owner
assertions and rendered Pane tab markup checks do not close the remaining
failures or certify whole-editor parity. No full-suite rerun occurred in this
revised-priority inventory pass.

## Objective and evidence boundary

This is the working coverage record for Andrew's authorised overnight brief,
begun on 4 October 2026. Completion requires every exposed menu and inspector
control to work, all existing blocks to be compared with Gutenberg, reusable
controls and icons to have a single owner, and independent rendered verification.
This record is not a declaration of whole-editor parity.

- Local checkout: codex/panel-library, starting HEAD db3b04fd3019eae60c85388292884c6acdfa4499.
- Existing dirty files belong to earlier authorised work; preserve them.
- Reference: Gutenberg v24.1.0-rc.1,
  e3ac73cd69d472341b66c43cb77be36e838f868e.
- Workspace Style Guide: unversioned, governance HEAD 8db1047d96b1a53c5567347c884b93bae71e785e;
  the complete working-copy guide was read before changes.
- Project instructions: unversioned working-copy AGENTS.md, read 4 October 2026.
- Route: read-only Explorer, main-agent sole Builder, separate read-only Verifier.
- Environment: local only. No push, publication or deployment authorised.
- Existing compatible documents and template projections must stay recoverable.
- UI Library fixtures remain memory-only; no saved user documents are test fixtures.

Fresh pinned apply-format.js and format-library .tsx implementations were fetched
on 4 October. Earlier raw .js Highlight URLs were incorrect, rather than proof
that the source did not exist. Existing docs remain comparison inputs, not fresh
rendered evidence.

## Current corrections

| Capability | Source evidence and change | Verification status |
| --- | --- | --- |
| Simple caret formatting | Owning RichTextEditor holds transient active formats; all simple toolbar marks can affect subsequent insertion. Bold/Italic shortcuts use the same typed operations. | Focused regression checks pass. Browser Bold caret insertion, selected Italic, Undo and Redo pass. Independent review pending. |
| Highlight caret | Enabled with a caret. Independent foreground/background changes affect subsequent typing; inside an existing mark, update its contiguous extent. | Browser palette opens at caret and subsequent text acquires colour. Range regression passes; existing mark and nested contexts still need rendered checks. |
| Table structural editing | One pure table-actions operation moves text, rich runs, metadata, dimensions and column alignment for both editing surfaces. | Focused table/action tests pass. Browser Insert row before returns focus to the new cell, permits immediate typing and clears transient Bold. Multi-row header/body/footer edges, final-cell deletion and missing-cell availability now pass focused and browser checks; persistence and adapted formatting interaction remain open. |
| Buttons contextual insertion | Top-level inserter offers Buttons; Button is offered inside Buttons. Both types remain documented; standalone saved Buttons are preserved. | Pure filtering regression passes; rendered insertion remains open. |
| Reusable spacing | Buttons uses LayoutSpacingSetting; Social Icons keeps independent axes without a second scalar editor overwriting them. | Source/typecheck pass; rendered/reset/history checks pending. |
| Image Advanced | Title joins the shared Advanced accordion through its children contract. | Source/typecheck pass; rendered/reload/export pending. |
| Field presentation | Edit, Preview and HTML export share safe option construction and retain a saved value absent from configured choices. | Pure regression passes; rendered/round-trip pending. |
| Menu navigation | Shared helper covers menuitem, checkbox and radio, skipping disabled actions. More formatting and block alignment consume it. | Independent review found wrong alignment close callback; corrected. Browser navigation still pending. |
| Toolbar menu placement | More formatting and Block options share a portalled, viewport-constrained menu and Controls specimen. Consumers retain commands and captured ranges. | Independent source review and four geometry/observer regressions pass. Browser repeat/Escape/Tab/outside focus, selected Inline code with Undo/Redo, phone/tablet bounds and short-viewport last-item scrolling pass. Remaining toolbar menus still need adoption and rendered checks. |
| Nested block ownership | One toolbar renderer serves Group, Column, Buttons, Quote, Social Link and nested List contexts. Read traversal includes item-owned Lists; mutations use actual sibling arrays. Clipboard and duplicate operations share ID/anchor remapping. | Independent source review and focused tests pass. Browser nested Paragraph movement, List movement boundaries, nested List caret Bold and outer List ownership through List View/marker pass. Template overrides and drag axes remain open. |
| Nested HTML and permitted children | Complete proposals enforce parent policies. Column HTML preserves implicit width; nested List HTML preserves descendant visual and Advanced settings. Portalled menu focus retains its DOM owner. | Browser unchanged Column Apply preserves equal 345.703125px widths. Parent and nested List Apply retain backgrounds, anchor and class and return trigger focus. Actual parse/renderer regression passes. Freshness and complete export/reload coverage remain open. |
| Hidden Social Link | Edit shows a recoverable placeholder; Preview removes the hidden link. | Browser Hide, Preview and Undo pass. Show and clipboard Copy round trip still need direct interaction checks. |

## Nested cohort checks on 4 October

- Focused foundations, table sections and selection: 39 tests passed.
- Actual semantic HTML parse/renderer regression for styled nested Lists: one
  test passed, covering unchanged parent and child HTML.
- Independent Verifier challenged traversal, List Item ownership, allowed-child
  proposals, portal selection, Column widths and nested HTML preservation.
  Corrections returned to the sole Builder. Final boundary re-review passed;
  the Verifier independently reran all 40 scoped tests and reviewed the screenshot.
- The final production build, typecheck, focused pure-module lint and diff
  checks passed after the boundary and HTML corrections.
- The broader four-file source-contract run reported 122 passes and 49 failures;
  the preview file reported 58 passes and six failures. These are failing
  checks, not whole-suite assurance. Several assertions describe replaced
  implementations, but a complete immutable-baseline comparison is still owed.
- Isolated `/studio/ui/selection` fixtures are memory-only and now include
  Columns, Buttons, Social Icons, a restricted Group and nested Lists. The List
  block specimen also exposes a nested List through shared selection/update.
- The original 390 × 844 formatting menu overflow (right 464px, bottom
  1118.7578125px) is corrected by shared portal placement. Its latest bounds are
  left 206px, right 382px, top 210.7578125px and bottom 510.7578125px. Tablet
  834 × 900 also fits. At 390 × 300 the long Block options menu stays between
  8px and 292px; End scrolls Delete into view between 251.9296875px and
  284.078125px. Temporary max-height expansion initially broke that focus
  scroll; the corrected watcher measures scrollHeight without expanding.
  The viewport was restored after checks.
- Standard-editor List Item selection is reviewed at source; its complete pane
  interaction, persistence, template overrides and 200% zoom remain open.
- Pointer selection through the outer List marker also resets formatting
  ownership. Browser Bold insertion stayed in that parent, and formatting the
  second nested item retained its own target without changing the first item.

## Shared menu cohort checks on 4 October

- Local commit `ca47abd` records the independently reviewed positioning module
  and four regressions. Menu consumers, specimens and earlier overlapping work
  remain uncommitted while the wider editor change is reconciled. No push or
  deployment was performed.
- Geometry, foundations, table sections and selection: 43 tests passed.
- Typecheck, focused component lint, diff check and final production build passed.
- Independent source review returned focus and scrolling corrections to the sole
  Builder and found no new blocker after re-review. The Verifier independently
  reran all 43 focused tests, inspected both final viewport screenshots and
  accepted the bounded shared-menu cohort.
- More formatting: repeat and Escape return the opener; End reaches Superscript;
  Tab reaches Duplicate. Applying Inline code to selected nested text, Undo and
  Redo retains the correct List Item target.
- Block options: repeat returns its opener; native Tab reaches the next item
  editor; outside dismissal leaves the clicked field focused and permits typing.
- Controls specimen: End skips the disabled action; Tab advances to the following
  details control; selecting an action updates only its temporary example state.
- Visual viewport offsets and event cleanup have deterministic coverage; a real
  mobile keyboard and browser 200% zoom remain unverified.

## Menu coverage

Every row requires selected/disabled state, correct target, content preservation,
repeat trigger, Escape/focus return, outside dismissal, keyboard operation,
viewport bounds, read-only handling and Undo/Redo where it changes document state.

| Actions | Outstanding work |
| --- | --- |
| Transform; drag; move up/down; Heading level; text and block alignment | Nested toolbars and sibling-aware operations are implemented. Finish template overrides, drag-axis/indicator behaviour, selection routes and shared overlay bounds, plus every action's rendered check. |
| Table column alignment; row/column edits; caption | Multi-section structural edits, no-cell/last-cell availability, nested targeting, caption cell-action exclusion and menu focus pass. Finish actual adapted scorecard formatting, persistent reload/export, every appearance control and 200% zoom. |
| Bold; Italic; Inline code; Keyboard input; Strikethrough; Subscript; Superscript | Caret implementation added. Validate selection boundaries, combined/conflicting marks, all rich targets, shortcuts and persistence. |
| Link | Validate caret insertion, existing links, child/cell/caption target, invalid URL and focus. |
| Highlight | Validate existing format extent, independent clear/custom/alpha, caret movement, empty fields, nested lists/quotes/table/captions and history. |
| Footnote | Atomic caret/selection-end insertion, paired note creation, focus, reference-order rendering, reference deletion and host protection have bounded evidence below. Legacy readers, canonical backup download/restore and partial clipboard companions pass focused consumer checks. Browser Copy/Paste/Cut and grouped Undo/Redo pass in the memory-only nested fixture. Repeated-reference identity now has bounded Preview/article/export and runtime-projection evidence below. Finish broader rich targets and persistent browser contexts. |
| Inline image | Typed single-slot objects, mounted picker, exact-object replacement, changed-only width/alt form, explicit media providers, guarded replay and history have bounded evidence below. Finish persistent reload/export, Template/Mini Golf browser contexts, remaining input modes, rich-form exclusivity and 200% zoom. |
| Language | Checked active removal, selection attributes, caret typing, guarded selection-anchored form, `bdo` rendering and saved-envelope floors have bounded evidence below. Finish persistent browser reload, all rich contexts/input modes, real 200% zoom and full integration recovery. |
| Math | Atomic caret/selection insertion, live syntax editing, source restoration, shared rendering, legacy preservation and typed native paste have bounded evidence below. Finish persistent browser reload, all rich contexts, real 200% zoom and the complete integration suite. |
| Copy; Cut; Duplicate | Shared duplication remaps IDs/anchors through all command entry points. Incoming Social Link payload wraps at document level; restricted Group paste is rejected. Actual UI Copy → Paste, denial/freshness, locks and atomic history remain open. |
| Add before/after; Group/Ungroup | Check parent constraints, nested/multiple selection, insertion focus and retained content. |
| Notes; Lock; Rename; Hide/Show; Delete | Check all root/nested consumers, locked descendants, read-only/required-content availability and history. Notes remain bottom right. |
| Copy/Paste styles | Exercise all supported fields, retain content/anchors, handle incompatible types. |
| Edit as HTML | Column and nested List unchanged round trips, nested focus and parent-policy checks are corrected. Finish freshness, invalid edits, rich objects, captions, IDs/locks and full persistence/export. Template HTML remains disabled. |
| Group layout variations; individual Button | Direct rich label and own-link toolbar have bounded evidence below. Enter/merging, width, persistence and complete context coverage remain open. |

## Block and pane coverage

Every row requires a source comparison of Settings/Styles/Advanced and exposed
control labels/order/defaults/availability/reset, followed by actual interactions
in Edit/Preview and persistence/export/history checks. All rows below have an
initial local-source inventory; none is yet certified as fully verified.

| Entry or context | Inventory / next acceptance |
| --- | --- |
| Paragraph | Shared typography/background/dimensions/border/elements/Advanced; theme-gated controls and retained values. |
| Heading | H1–H6, Fit text, shared styles/Advanced; selected-level icons, split/merge and retained image backgrounds. |
| List | Type, ordered marker/start/reverse, shared styles; nested numbering, split/outdent and formatting. |
| List Item | Item-owned styles/Advanced; preserve sibling/parent/nested-list state. |
| Quote | Style, rich inner blocks/citation, shared styles/Advanced; attribution reset and nested toolbar. |
| Code | Shared typography/background/dimensions/border/Advanced; Edit/Preview and HTML text preservation. |
| Table | Settings/Styles/Advanced, header/footer/fixed cells, styles/spacing/border; section and structure operations, caption and cell formatting. |
| Image | Source/managed media, alt/decorative/link/style/size/aspect/scale/focal/margin/border/Advanced; one Advanced and media limitations. |
| Featured Image | Document image/link/dimensions/aspect/scale/shared styles; missing media derivatives must be distinguished from implementable controls. |
| Embed | URL/title/caption/retry, margin/Advanced; supported providers, invalid URLs and no fabricated playback assurance. |
| Buttons | Justification/orientation/wrap/axis gaps/shared styles; parent layout and contextual children. |
| Button | Label/link/target/fill-outline/alignment/title/rel/width/styles/Advanced; direct rich label editing and own toolbar. |
| Columns | Count/stack/alignment/gaps/shared styles/Advanced; decreasing count retains content. |
| Column | Width/alignment/Allowed Blocks/shared styles/Advanced; parent callback, one-column width and child restrictions. |
| Group | Flow/Row/Stack/Grid, layout widths/gaps/dimensions/position/Allowed Blocks/semantic Advanced; retained legacy layouts and missing child/grid sizing. |
| Row variation | Justification/alignment/wrap/gaps; child size and horizontal Spacer behaviour. |
| Stack variation | Widths/alignment/justification/gaps; child sizing and content fitting. |
| Grid variation | Auto/manual count/minimum width/unit/gaps; distinguish explicit count from actual manual placement. |
| Section | ACM role/source/layout/styles/Advanced; semantic role stays product-owned. |
| Separator | Style/tag/background/margin/Advanced; compare available core options and preserve safe data. |
| Spacer | Axis/value/unit/margin/Advanced; unit/default/reset and layout context. |
| Social Icons | Style/justification/orientation/wrap/size/labels/target/axis gaps/shared styles; one spacing implementation. |
| LinkedIn | URL/label/rel; parent-aware child toolbar and legacy standalone compatibility. |
| TikTok | URL/label/rel; parent-aware child toolbar and legacy standalone compatibility. |
| Title | Document text, level/link/target/rel/alignment/styles; metadata binding and heading toolbar. |
| Document Subtitle | ACM metadata/alignment/styles; no exact core counterpart. |
| Author | Prefix/avatar/alignment/styles; inspect core author link/biography/avatar capabilities before classifying missing functionality. |
| Date | Format/custom/source/link/alignment/clock/styles; modified metadata, relative format and exact reference. |
| Reading Time | Mode/range/prefix/presentation/alignment/styles; ACM estimator and current core Time to Read comparison. |
| Field | Label/control/value/options; matching Edit/Preview/export choices. |
| Footnotes | Managed notes/styles/Advanced; reference objects, editing/navigation and deletion/history consistency. |
| Component | Registered whitelisted fields; catalogue fixture stays inactive, no external integration. |
| Template Content | Slot projection/layout/styles/Advanced; do not persist projection into document body. |

## Icons, reuse and release gates

- Inspect every block symbol and touched toolbar symbol against the pinned
  Gutenberg metaphor and scale. Correct original artwork in acm-icons first;
  preserve provenance and catalogue exports. No isolated Studio icons.
- Review tile, toolbar, inspector, transform, List View and Library consumers.
- Preserve the separate licensed H1–H6 marks and block Heading bookmark.
- Register genuinely new controls/icons in the Library; avoid speculative packages.
- Preserve explicit user differences: no Create Pattern, no unrequested menu
  header/top gap, notes bottom right and Focus Outline preference.
- Verify desktop/tablet/narrow layouts, 200% zoom, pointer/keyboard, focus modes,
  ownership denial, empty/populated/nested/legacy data, history, reload and export.
- Run focused regression coverage, typecheck, production build and diff checks;
  distinguish prior suite failures from new regressions.
- Independent Verifier must challenge both source and rendered evidence.
- Commit coherent local work only after ownership and contents review. Do not
  bundle unrelated pre-existing files to make the checkout clean.
- Full goal stays active until every requirement has authoritative evidence.


## Table sections cohort checks on 4 October

- Pinned Gutenberg `table/state.js`, `edit.jsx` and state tests establish that
  header/footer sections may contain multiple rows, insertion stays in its owning
  section, deletion clears cell selection, and the final column empties the table.
- Shared flat section boundaries now drive the editor, renderer, HTML parser,
  inspector, structural actions and stale-selection signatures. Parallel text,
  rich runs, metadata, dimensions and alignment grids move together.
- Workspace v21, publication v14, templates/packages v0.22.0 and Mini Golf
  page-definition v2 writers retain readers for their preceding versions. Backup
  v4 and Mini Golf draft v10 remain unchanged. This is a local contract advance,
  not a published application release.
- The Mini Golf runtime accepts only its one-header/one-footer scorecard shape;
  other authored shapes use the canonical Table editor/renderer. That fallback
  forwards cell/caption selection and links through shared Canvas handlers.
- 47 geometry/foundation/Table checks passed; two actual component/parser checks
  passed; one adapted callback regression passed. Typecheck, production build,
  focused module/component lint and `git diff --check` passed after the final
  specimen-label and documentation adjustments. Four isolated section-helper
  tests also pass independently.
- Independent Verifier accepted the bounded source/tests after repeat-trigger
  focus and Mini Golf callback hand-backs. Its browser surface was unavailable,
  so live evidence is the Builder's replay. The narrow menu screenshot was
  independently inspected and accepted.
- Actual memory-only editor replay: header/footer row insertion, complete
  Undo/Redo, final-column deletion/recovery, selected-column right alignment,
  caption exclusion from cell actions and matching Preview section counts.
  Nested insertion changes only its own Table and focuses new row column zero.
  Read-only structural actions are disabled and typing `x` leaves cell text intact.
- Menus: repeat and Escape restore the trigger, End reaches Delete column, Tab
  closes into Caption, and outside Reset dismisses the menu. At 390 × 300 the
  menu occupies left 196.6875, top 64, right 382 and bottom 292, with 13px text.
  The viewport override was reset afterwards.
- Library now has distinguishable populated, multiple-section and empty Table
  specimens. Header/Footer remove all of their own rows and preserve the body;
  Undo restores them. Reset all removes both complete sections and keeps fixed
  layout; disabling fixed layout yields `table-layout: auto` without a colgroup.
  Edit and Preview retain 2 header, 1 body and 2 footer rows after Undo.
- Evidence: `/private/tmp/acm-table-menu-narrow.jpg`,
  `/private/tmp/acm-table-actions-desktop.jpg`, and
  `/private/tmp/acm-table-sections-library.jpg`.
- Remaining assurance: actual Mini Golf formatting interactions; persisted
  workspace/template/publication/full-backup round trips; tablet/200% zoom;
  all Table Styles/Advanced controls; complete broad-harness reconciliation.
  Local commit `5900498` records only the optional Table type fields, pure
  section-boundary helper and four isolated regressions. Overlapping consumer,
  storage-version and specimen changes remain uncommitted while the wider
  authorised parity work is reviewed; no push, publication or deployment occurred.

- Broader recovery/template/Mini Golf run now completes after explicit TypeScript
  extension handling and a VM `structuredClone` repair: 104 passes, 17 failures
  across 121 tests. Version expectations still assert workspace v17/template
  v0.17.0/publication v10. Template projection also differs in title alignment
  and Content layout defaults, and two fake-DOM HTML fixtures lack `childNodes`.
  Attribution and proper repair are pending; these results do not certify broad
  compatibility. Log: `/private/tmp/acm-table-envelope-check.log`.

## Next bounded Buttons and Button investigation

The Explorer has confirmed that they are separate Gutenberg concepts, and the
Studio's parent-aware insertion already preserves standalone legacy Button data.
Outstanding failures are direct label editing/rich selection/link targeting;
initial empty label/no URL and insertion focus; Enter creating a sibling with
retained appearance and no duplicated anchor; contextual sibling insertion.
The presentation corrections below now cover Fill/Outline, inherited parent
typography and percentage widths. Compare arbitrary width units/reset and parent
background-image ownership before extending those contracts. Parent padding and
border already reach the generic appearance wrapper and must be preserved.
The shared icon catalogue currently maps both to one symbol; inspect the actual
catalogue before deciding whether a distinct original Buttons symbol is needed.


## Buttons presentation correction — 4 October 2026

- Main agent was the sole Builder after the read-only Explorer. Independent
  Verifier accepted the corrected presentation and reviewed all three captures.
- `app/content/buttons-presentation.ts` supplies one group typography and item
  sizing contract to canonical Edit and Preview. Horizontal percentages subtract
  each item's share of the configured gap; vertical percentages remain raw.
  Base/Hover/Focus/Active widths have the same item owner; the field/link fill it.
- Child explicit styling and state overrides take precedence over group values;
  group values take precedence over template/default typography. Parent text
  decoration is routed through this contract so child decoration can override it.
- Stored `secondary` still denotes the content Outline variation, now transparent
  with a 2px current-colour border by default. Studio secondary action buttons
  remain separately owned. Fill compensates for Outline's border, including the
  template's own border, so equal-line-height text has equal button heights.
  Explicit border removal survives interaction-style fallbacks.
- Library examples demonstrate halves, quarters and vertical layout, plus a
  memory-only Use Template Styles toggle using the real TemplateSurface in both
  Edit and Preview. No user documents or persistence were used as fixtures.
- Checks: 20/20 Buttons presentation and paragraph appearance tests; 2/2 actual
  renderer Button/Buttons tests; final typecheck and production build passed.
  Focused module/test lint and `git diff --check` passed. The build retains its
  existing chunk-size and Node deprecation warnings.
- Browser: desktop template Edit/Preview; two 50% and four 25% widths; vertical
  50%/100%; parent 24px inheritance; child 14px override with Undo/Redo; pointer
  hover retaining group #123456; template Fill/Outline both 69.609375px for the
  first fixture. At a 601.203125px group, Hover 25% was 132.296875px and Focus
  75% was 444.8984375px at item, field and link boundaries alike.
- Captures: `/private/tmp/acm-buttons-template-preview.jpg`,
  `/private/tmp/acm-buttons-tablet.jpg` (780px),
  `/private/tmp/acm-buttons-narrow.jpg` (390px). Narrow document width remains
  390px; long labels wrap inside their authored percentage width. These are
  Library responsive checks, not evidence of native 200% browser zoom.
- No persisted format change, push or deployment. Broader consumer integration
  remains in the existing authorised worktree. Local commit `8d3b491` records
  only explicit Button border removal and its isolated regression; its patch was
  independently reviewed against the committed baseline before staging.
- Still open: direct rich label editing/own link toolbar, initial empty defaults
  and focus, sibling insertion/Enter, arbitrary units/reset, group background
  images, all icon comparisons, full persistence/ownership flows and native 200%
  zoom. All other unverified matrix rows remain open; this is not whole-editor
  completion.


## Button insertion and rich-label cohort — 4 October 2026

- Contextual Buttons insertion selects an empty child with no URL. Sibling
  insertion retains appearance, creates a fresh identity and omits content,
  URL and anchor. Template insertion callbacks now read the latest projected
  nodes, enforce the current parent policy and select only an accepted insertion.
  The preceding independent review accepted the bounded callback changes; the
  optimistic return at the command layer's child limit remains open.
- Button retains its legacy plain `label` and optional matching `labelRuns`.
  The canonical RichTextEditor supplies direct label editing, caret Bold/Italic,
  selected formatting and More actions. Inline links and footnotes are excluded
  from the label; the outer Button continues to own its destination.
- Canonical renderer, Mini Golf adapter, transformations, HTML, media references
  and versioned storage share the rich label. HTML parses the outer link's child
  nodes so its URL cannot become an interactive label mark. Inspector plain-label
  edits discard stale runs. New siblings do not inherit the rich label.
- Current writers: workspace v22, publication v15, templates/packages v0.23.0,
  Mini Golf page definition v3 and draft v11. Readers retain their preceding
  supported versions. Backup v4 and storage keys stay unchanged. The latest
  legacy template migration preserves authored Title/Subtitle text; it must not
  rerun starter-template replacement on v0.22.0 data.
- Newly inserted selected labels receive one focus hand-off, including callbacks
  with separate content and selection renders. If a pasted child already owns a
  pointer caret, the hand-off is consumed without resetting its offset.
- Read-only Button renders rich text without an editable label. Shared Bold,
  Italic, inline Link and More triggers now advertise disabled state accurately.
- Evidence: ten focused validator, copy/transform, renderer/parser, actual SSR,
  Mini Golf, storage/backup and exact-source focus-effect tests pass. The broader
  foundations/Buttons/paragraph run passes 52 tests. Final typecheck and production
  build pass after corrections. Diff checks pass. Focused lint of the wider test
  files reports unnecessary escaped quotes and an unused binding on earlier
  lines; its baseline attribution and reconciliation remain open.
- The separate read-only Verifier independently reran ten checks, challenged the
  migration and copied-child caret, reviewed both final viewport captures and
  accepted the bounded changes. Its live browser was unavailable, so actual
  browser interaction evidence is the Builder's replay.
- Browser: direct typing, selected Bold/Italic, palette Highlight, Undo/Redo and
  matching Preview; empty sibling focus; caret Bold followed by typing; parent
  duplication and editing its second child at offset 6 produce `SecondX button`.
  Read-only replay retains formatting and disables those shared controls.
- Phone 390 × 844 More menu bounds: left 190px, right 366px, top 210.539px,
  bottom 510.539px. Tablet 834 × 900 remains readable. Viewport overrides were
  reset. Captures: `/private/tmp/acm-rich-button-edit.jpg`,
  `/private/tmp/acm-rich-button-menu-narrow.jpg`,
  `/private/tmp/acm-rich-button-tablet.jpg`,
  `/private/tmp/acm-rich-button-readonly.jpg`.
- Browser paste produces plain label text without nested links. The available
  paste mechanism did not retain its supplied HTML Bold, so formatted-paste
  preservation is unverified. Own-URL toolbar, Enter/splitting/merging, arbitrary
  width units/reset, persistent ownership flows and native 200% zoom remain open.
  No whole-block or whole-editor completion is claimed. Overlapping integrated
  files remain uncommitted; no push, publication or deployment occurred.

## Individual Button destination cohort — 4 October 2026

- Pinned core Button sources and tests were inspected at
  `e3ac73cd69d472341b66c43cb77be36e838f868e`: `button/edit.jsx`,
  `button/get-updated-link-attributes.js`, `button/constants.js` and the Buttons
  editor end-to-end spec. Core owns the outer URL separately from rich label
  marks. Its active Link action unlinks; its edit shortcut is Command/Ctrl+K,
  with Shift for unlinking.
- Studio now follows that destination ownership. Initial selected-link preview
  does not take focus. Editing focuses the URL; applying focuses the preview
  once. Unlink clears URL/target/rel without changing rich label, title or styles.
  Closing restores the saved label range; outside dismissal keeps the new input
  focus. Native form controls retain their own editing keys and Tab order.
- Reusable `LinkDestinationPopover` uses the non-modal `StudioAnchoredPopover`
  form shell, shared Buttons/Toggles and existing catalogue icons. The Controls
  Library has a memory-only Link destination specimen and ownership/dependency
  metadata. Inline rich-text links retain their existing implementation.
- Strict baseline checks reject stale URL/target/rel, document changes and lost
  writability. Semantic comparisons skip unchanged default/legacy attributes.
  The destination helper validates supported URLs and preserves unrelated rel
  tokens when toggling nofollow. No storage schema change is required.
- The popup anchors its toolbar trigger so an above-opening form cannot cover
  that trigger. Shared positioning now coalesces resize/scroll work into a
  cancellable animation frame: a suggestions-height change previously triggered
  a synchronous ResizeObserver loop. Server rendering defers the portal until
  client mounting. Clipboard feedback belongs to the URL actually copied.
- Intentional difference: Escape fully dismisses the overlay, following Andrew's
  existing direction; pinned core can retain its preview after returning focus.
- Focused evidence: five destination tests, four popup geometry/lifecycle tests,
  one actual Canvas Apply-callback freshness/no-op regression, and one actual
  selected-linked SSR regression pass. Typecheck, focused new-file lint and the
  production build pass; broader test/lint baseline reconciliation remains open.
- Builder browser replay: supported bare-domain normalisation, invalid scheme
  rejection, new-tab/nofollow, rich label preservation, Apply focus, Cancel and
  Escape, trigger repetition, initial-preview Remove at caret offset 6, own Bold
  control edit shortcut, native Tab, no-op Apply followed by one Undo, Redo,
  read-only draft discard and fresh writable reopening. Outside label focus
  discards edits; moving focus back through another toolbar control also dismisses
  the draft before a new shortcut session. Deliberate stale-state rejection is
  covered by the exact production callback regression rather than injected browser
  state. Actual Web Lock contention and native 200% zoom remain open.
- The Library replay selects its internal Example page, toggles target/nofollow
  while retaining sponsored, and copies `/example` to the clipboard. A fresh load
  and suggestion resizing no longer show the development error overlay.
- Desktop, 390 × 844 and 834 × 900 captures were inspected. The narrow form is
  320px wide within left 62px/right 382px, top 286.742px/bottom 571.039px. The
  tablet form lies within left 330.828px/right 650.828px, top 415.648px/bottom
  699.945px. Viewport overrides were reset. Evidence captures:
  `/private/tmp/acm-button-link-desktop.jpg`,
  `/private/tmp/acm-button-link-narrow.jpg`,
  `/private/tmp/acm-button-link-tablet.jpg`, and
  `/private/tmp/acm-link-destination-library.jpg`.
- The independent Verifier accepted the server/focus, scheduler and clipboard
  corrections, reran focused regressions and inspected the four captures. Its
  browser surface was unavailable, so live interactions and build checks remain
  Builder-supplied evidence. Overlapping integration remains uncommitted; this is
  bounded progress, not whole-Button or whole-editor completion.
- The isolated shared scheduler source and regression were committed locally as
  `2318f18`; the larger destination integration remains uncommitted. No push,
  publication or deployment occurred.

## Footnote and Math Explorer hand-off — 4 October 2026

- Pinned Footnote format, editor, core-data reconciliation and browser tests show
  one non-editable reference inserted after a selection or at a caret, an atomic
  document update, focus/back-navigation and reference-order numbering/removal.
  Studio's current text-spanning marks, optional ownership callback and split
  history updates do not meet that lifecycle. Some offered targets do nothing
  or can create orphan notes. These are confirmed open issues.
- Pinned Math source uses an atomic object, replaces a selection or inserts at
  a caret, restores an active expression for editing and renders an equation.
  Studio's selection-only mark/dialog does not meet those behaviours. Dedicated
  upstream inline-Math browser evidence was not established. Studio's MathML and
  accessible-description inputs are an explicit adaptation requiring a decision.
- First prerequisite correction: shared `replaceTextRange` now inserts a
  collapsed replacement at its actual run offset rather than appending it.
  Deterministic start/interior/mark-boundary/end/empty/no-op/out-of-range checks,
  immutability and an existing non-collapsed replacement pass. The independent
  Verifier accepted the branch after the named regression, diff check and 74
  extra in-memory edge assertions. Browser Footnote/Math proof remains open;
  their new callers must supply valid integer offsets. The existing NaN input
  behaviour outside the collapsed branch is not covered by this correction.
- Next work is a bounded Footnote object/lifecycle cohort, followed by Math.
  Preserve legacy text/notes, missing-note recovery, clipboard identities and
  publication history; version any persisted object contract deliberately.
  No atomic-object schema change has been implemented or accepted yet.

## Rich selection and List Item preservation — 4 October 2026

- Shared `rich-text-dom.ts` gives the existing parser and selection restoration
  one logical projection. Legacy footnote marker decorations count as zero;
  legacy inline images count their saved source projection once. UTF-16 text,
  line breaks, paragraph boundaries and the parser's removed final newline are
  covered. Range starts/carets skip a preceding decoration; range ends stop
  before it. This is legacy selection support, not the new object DOM contract.
- Eight focused DOM checks pass, including the actual production parser body.
  The independent Verifier additionally challenged boundary affinity. Browser
  replay kept `source` before a marker and ` after` following it as the exact
  restored selections after Bold/Italic. Captures include
  `/private/tmp/acm-legacy-rich-selection-affinity.jpg`.
- The standalone mapper and regressions were committed locally as `f451d0a`.
  The overlapping Canvas adoption remains in the worktree with other parity
  integration; this commit alone does not include that consumer change.
- Shared `listItemWithTextRuns` now retains an item's style, anchor, classes and
  children through toolbar formatting, direct typing and Enter splitting.
  The new split sibling inherits appearance but receives no duplicate anchor or
  descendants. Table toolbar and direct input preserve atom-only rich runs.
  A missing removed-helper call in the Enter path and a doubled-extension test
  loader were corrected during verification.
- Builder browser replay in the memory-only selection fixture checked Bold,
  Undo/Redo and Enter on a styled nested item. Original anchor/classes/background
  and one nested Deep item remained; the empty sibling had no anchor. Preview
  retained Bold and the same background. Desktop, 834 × 900 and 390 × 844
  captures were inspected; viewport overrides were reset. Evidence:
  `/private/tmp/acm-list-item-style-split.jpg`,
  `/private/tmp/acm-list-item-style-tablet.jpg` and
  `/private/tmp/acm-list-item-style-narrow.jpg`.
- The independent Verifier accepted this bounded correction and independently
  reran 74 focused checks. It reviewed the captures; browser history and DOM
  identities remain Builder-supplied evidence. The narrow toolbar still clips
  and overlaps its item indentation control; these captures establish style
  preservation, not complete narrow-toolbar usability. Native 200% zoom,
  persistent ownership/reload and the full block matrix remain open.

## Footnote object and rich-field migration foundation — 4 October 2026

- New pure helpers model one U+FFFC reference slot, selection-end/caret insertion
  and active-reference lookup. Shared formatting preserves objects without
  applying text marks to them. Legacy migration retains visible text and its
  other formatting; overlapping reference IDs are migrated at their own range
  ends without duplication from mark ordering. Invalid source objects are
  rejected before normalisation can discard them.
- `mapRichTextFields` and `visitRichTextFields` cover text, Quote citation,
  captions, Button label, nested List Items and table cells. Changed runs update
  their plain projections; identity callbacks preserve unchanged branches.
  The Footnote migration retains notes, orphan content, styling and sizing.
- Review found dormant Quote body references counted before child content.
  Field ownership now explicitly marks that body inactive whenever `children`
  is defined, including an empty array. Migration preserves it for recovery;
  active reference collection excludes it. Absent/empty/populated children are
  covered for both legacy and migrated records. This ownership rule does not
  settle hidden-block numbering policy.
- Fourteen run-level and six block/field checks pass. The separate Verifier
  reviewed the final contracts and independently reran the six field checks.
  Its approval is for the pure foundation only. Before reader adoption, validate
  the legacy envelope before passing imported data into this typed traversal.
- No storage reader or live command creates the new references yet. The current
  Footnote UI still needs atomic note/reference creation, focus/back-navigation,
  reconciliation, copy identity handling, rendering and HTML support. Envelope
  versions have not been advanced for this foundation; no eager migration writes
  occur. Workspace, Bin, publication, template, Mini Golf and clipboard boundaries
  remain explicit upcoming work.
- Typecheck, focused lint, the production build and diff checks pass after these
  corrections. The build retains its existing large-chunk, deprecated-register
  and route-classification warnings. Broader failing suites recorded above have
  not been reconciled. No push, publication or deployment occurred.

## Footnote live pipeline and read-only corrections — 4 October 2026

- Main-agent Explorer/sole Builder and a separate read-only Verifier continued
  the atomic-object foundation. Footnote inserts at the caret or selection end
  without replacing the selected words. One document transaction creates the
  reference and blank note, selects the notes owner and focuses its text field.
  Existing atomic references focus their note instead of creating another.
  Hidden ancestors cannot supply the visible notes host.
- Shared DOM, HTML and rendering preserve an atomic reference as one logical
  slot; visible numbers do not become editable prose. Paragraph, nested List
  Item, Table cell and caption references use the document's reference order.
  Edit and Preview sort notes through the same helper. Explicit decimal list
  markers restore numbers suppressed by the global reset. Unreferenced saved
  notes remain labelled and editable for recovery, are omitted from Preview,
  and no longer inflate reading-time counts. Hidden and dormant Quote fields
  cannot assign visible numbers. The backlink reuses the catalogue's
  `navigation.back` through the existing wrapper, replacing a Unicode symbol.
- Canvas supplies one read-only rich-field policy, including Mini Golf adapters.
  Fresh-load browser evidence shows zero editable and 26 read-only rich fields.
  More menus and Language/Math drafts disappear on ownership loss. The Verifier
  reproduced a rapid restoration race in the initial RAF cleanup; the final
  uncancelled microtask survives restoration and skips unmounted updates. Its
  regression executes the actual production callback. Inline-image callbacks
  and draft application also check current ownership.
- Image/Embed captions now expose the shared More menu. Inline Image remains
  limited to targets its existing insertion callback can actually update; full
  caption/List/Table Inline Image parity is still open.
- The activated contracts write workspace 23, publication 16, template/package
  v0.24.0, Mini Golf draft 12/page definition 4 and clipboard 2. Earlier envelopes
  remain readable for legacy marks and reject the new objects. Complete
  clipboard payloads remap owned note/reference IDs together. The pure legacy
  migration is not yet wired through every reader; full note lifecycle and
  partial-copy ownership are not complete.
- Focused results: 90 Footnote/Mini Golf checks, one actual Canvas read-only
  renderer check and three named persistence checks pass. The separate Verifier
  independently passed the 90 checks, Canvas regression and diff check, and
  accepted the bounded source corrections. Typecheck, focused pure-module lint,
  production build and diff check pass. Broader integration lint and failing
  suites reported earlier have not been reconciled; these results are not
  whole-editor assurance.
- Builder browser replay verified selected-text preservation, first-reference
  renumbering ahead of an existing legacy note, ordered Preview note text,
  menu/dialog read-only dismissal and fresh reopening. The caption More menu
  fits at 834 × 900 (left 294.36, right 470.36, top 192.98, bottom 528.98) and
  390 × 844 (left 206, right 382, top 367.97, bottom 703.97). Escape returns the
  trigger; viewport overrides were reset. Screenshots were visually inspected.
  The Verifier's browser remained unavailable, so it makes no independent live
  claim. Native 200% zoom and full persistent browser reload/export remain open.
- This turn could not re-fetch the pinned Footnotes edit source through web or
  shell networking; the earlier Explorer's pinned-source comparison remains
  recorded above. No fresh upstream certification is claimed. The work remains
  local and overlaps the larger uncommitted editor integration. No push,
  publication or deployment occurred.

## Footnote reconciliation and history — 4 October 2026

- The main agent continued as Explorer and sole Builder, with the separate
  read-only Verifier reviewing the correction. `footnote-reconciliation.ts`
  centralises reference/note deletion and host protection for block commands,
  workspace document updates, template updates and the selection specimen.
  Removing the last reference prunes its paired note in the same history
  transaction. Repeated, hidden and dormant recovery references protect their
  notes. Pre-existing orphan text stays recoverable; an empty notes owner remains.
- Removing a referenced notes host is unavailable in block options, the toolbar
  and List View. Code and block HTML application reject a stranded reference
  with a visible explanation. Removing the complete source/host selection is
  allowed. This protection adapts Gutenberg's externally managed note metadata
  to Studio's typed notes owner rather than discarding saved note text.
- The Verifier found two bugs in the initial correction: making a Quote's body
  dormant could prune its note, and a rejected workspace update could consume
  history and clear Redo. Stored recovery references are now included before
  pruning. The workspace evaluates changes before recording history and skips
  unchanged document timestamps. Regression coverage executes the actual
  workspace commit/update/Undo/Redo functions, including rejected and no-op edits.
- The selection specimen now uses the shared Studio history shortcut handler.
  Earlier Builder replay restored a legacy source/note pair and an atomic
  nested-table reference/note pair with Undo, then removed both with Redo.
  Code view separately rejected removing only the host while its nested Table
  reference remained. A fresh post-build browser attempt could edit text but
  pointer/shortcut actions did not change the page; the original temporary tab
  also timed out. This is unresolved interaction evidence, not a passing fresh
  replay or a confirmed product diagnosis. The fresh deletion state was captured
  at `/private/tmp/acm-footnote-last-reference-removed.jpg` and visually inspected.
- The separate Verifier independently reran 99 focused Footnote, rich DOM,
  List Item and Mini Golf checks, one actual Canvas read-only regression and
  `git diff --check`; all passed. Three named persistence checks, typecheck,
  focused pure-module/menu lint and the production build also pass. Existing
  broader lint/suite failures are still recorded above. The final removal-reason
  review passed 26 pipeline and two platform-history shortcut checks. Source acceptance is
  bounded; full browser history, persistent reload/export, native 200% zoom
  and the remaining block matrix are open.
- The pinned upstream fetch gap for this area is resolved. Fresh source at
  `e3ac73cd69d472341b66c43cb77be36e838f868e` was read for
  [Footnote format](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/footnotes/format.jsx),
  [Footnotes editor](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/footnotes/edit.jsx)
  and [core-data reconciliation](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/core-data/src/footnotes/index.js).
  Reconciliation filters unreferenced metadata while retaining cached removed
  note text for recovery. Legacy reader activation, partial clipboard ownership
  and repeated-reference DOM identities remain separate upcoming work.
- This correction overlaps the larger uncommitted editor integration. No push,
  publication or deployment occurred.

## Footnote readers and explicit Save — 4 October 2026

- The main agent continued as Explorer and sole Builder. Readers validate the
  complete original envelope before returning an immutable canonical projection.
  Active and binned documents, binned publication bodies, local publications,
  template/part nodes, the actual binned template entry, Mini Golf page definitions
  and drafts, clipboard payloads and backups use the same legacy Footnote
  migration. Reading alone does not save the migrated value or mutate the source.
  Invalid originals remain recoverable; older envelopes still reject atomic
  objects they cannot represent. Current versions remain workspace 23,
  publication 16, template/package v0.24.0, Mini Golf draft 12/page definition 4
  and clipboard 2.
- `validateWorkspacePublicationTemplates` is a template-owned boundary applied
  after portable workspace validation. Workspace, Mini Golf and backup consumers
  share it for ordinary Bin publication template snapshots, avoiding a dependency
  cycle in the core block validator. Template Bin validation checks the actual
  restorable entry, rather than accepting a different valid entry in its snapshot.
- Backup download serialises the canonical validator result. Restore writes that
  same canonical result only within its existing restore permit. Consumer tests
  execute the actual download and restore function bodies: malformed input is
  rejected before ownership/storage work, a late write failure restores exact
  original store bytes and media, and export leaves its source unchanged.
  The consumer harness stubs the permit/media boundary; it does not independently
  prove real browser lock draining, file download or a persistent restore.
- Save draft explicitly requests persistence even when draft status is unchanged.
  This does not change document timestamps or consume Undo/Redo. The independent
  Verifier found an async race in the first implementation: duplicate submission
  could resolve against optimistic state before storage finished. Matching
  snapshot/session/token/repository requests now await one pending completion.
  Genuine edits are queued separately, including Undo back to already saved
  content while a newer write is pending. Sync recovery cannot enqueue a
  successful no-op over a rejected write. Old sessions and lost writers cannot
  replace current save feedback.
- Deferred tests use the actual hook and actual sync implementation with
  controllable persistence, covering success, failure, repeat Save, pending
  Undo/Redo, repository/session replacement and ownership loss. Synchronous
  failed-save retry and the actual Save draft handler also pass. The observable
  writer in the last test is a boundary stub, rather than a real Web Lock.
- The final eight-file reader/history cohort passes 170/170:
  `node --test tests/workspace-recovery.test.mjs tests/template-system.test.mjs tests/footnote-pipeline.test.mjs tests/footnote-blocks.test.mjs tests/footnote-runs.test.mjs tests/rich-text-dom.test.mjs tests/list-item-text.test.mjs tests/mini-golf-page-contract.test.mjs`.
  The separate read-only Verifier independently passed its five-file 156-test
  cohort, the added ownership-loss regression and diff check. It also challenged
  rapid edit/Undo/Redo ordering with deferred actual-sync probes and accepted
  the bounded source correction. `npm run typecheck`, focused changed-module/test
  lint, the production build and `git diff --check` pass after the recovery fix.
  Broader workspace/template assertions now distinguish legacy input envelopes
  from canonical current output and retain source immutability checks.
- The initial broader sync/ownership run reported 55 passes and 27 failures;
  the isolated actual `studio-sync` suite passed 26/26. The earlier command
  also named a nonexistent `studio-pending-save` file, so that name was not
  evidence of a separate executed suite. The ownership harness now supplies
  `useEffect`, resolves the shared `.tsx` dialog and tests an unsupported future
  publication version rather than rejecting readable version 4. Assertions
  remain in place, including valid versions 1, 4 and 16. The independent
  Verifier passed ownership/sync/sync-hooks 95/95 and workspace recovery 45/45.
  The valid version 16 case depends on the reader integration in this cohort.
  Integration lint still has the previously
  recorded Prototype declaration-order and effect set-state failures.
- Fresh browser pointer replay remains unresolved. Keyboard Space and Enter
  can focus the fixture's Undo control but do not change its accessibility tree;
  captured error/warning logs are empty. This is neither a passing history check
  nor a confirmed cause of failure. Persistent reload/export/restore, native
  200% zoom, partial clipboard ownership, repeated-reference DOM identities,
  Math and the full block/pane matrix remain open.
- This source cohort remains interwoven with the wider uncommitted editor
  integration. No user-store fixture, remote write, push, publication or
  deployment was performed.

## Partial block clipboard preservation — 4 October 2026

- Studio clipboard envelope version 3 carries only referenced note companions
  outside the copied selection. Versions 1 and 2 remain readable after original
  validation. Both HTML and plain-only transports include the portable envelope
  and fallback HTML; this is a Studio typed-content adaptation, not a claim
  that WordPress uses the same transport format.
- Selected block IDs and companion note/reference IDs are cloned together.
  Unowned references from older partial payloads receive fresh IDs rather than
  binding to an unrelated destination note. Same-document duplication retains
  its existing unselected note owner. Hidden and dormant rich fields retain
  their referenced recovery notes in the copy.
- Paste attaches companions to a visible document notes owner, or creates one
  at the root, outside restricted child lists. The complete proposal uses the
  existing validation, parent policy and history boundary once.
- Independent review found and corrected two preservation defects. Async Cut
  now checks selected-block and companion freshness after clipboard completion;
  writer/document loss and rejected writes keep the source. The writer checks
  its own reader contract, including the 2 MiB length limit, before dispatch.
  A valid but oversized copy therefore cannot remove source content through Cut.
- The production Canvas AST tests execute the actual async Cut and Paste
  handlers with injected clipboard/callback boundaries. The three-file
  pipeline/foundations/Footnote-block cohort passes 87/87. The independent
  read-only Verifier passed pipeline/foundations 79/79 and accepted both fixes.
  Typecheck, production build, contract/test lint and diff check pass.
  Canvas-wide lint reports seven errors and two warnings in the surrounding
  integration: effect state changes, noninteractive event/tabindex targets,
  autofocus and image-rule warnings. These remain open and are not waived by
  the focused clipboard result.
- The Library selection specimen now uses Canvas's existing feedback component
  rather than discarding command results. After a fresh load, browser Copy
  produced both HTML and plain envelopes with the referenced note. Native
  Command+V pasted the paragraph into a paragraph-only nested Group and added
  its companion as Footnote 2 to the document notes owner. Visible Undo/Redo
  removed/restored both together. Nested Cut removed the pasted paragraph and
  its note; Undo restored both. With editing disabled, native paste left the
  accessibility tree unchanged and Undo/Redo controls were disabled. These
  operations used memory-only fixture state, not persisted user data. Screenshot
  evidence: `/private/tmp/acm-clipboard-paste-proof.jpg` (temporary local file).
- Earlier pointer history attempts remain inconclusive historical evidence;
  the fresh-load sequence above supplies bounded positive evidence. Persistent
  cross-document/cross-tab reload, all rich-text contexts, clipboard failure UI,
  responsive clipboard flows and repeated-reference DOM identities remain open.
  This result does not complete the whole block/pane matrix. No remote changes
  or deployment were made.


## Repeated Footnote navigation — 4 October 2026

- Reference DOM identities now include the owning rich field and occurrence,
  rather than only the shared note ID. Atomic and legacy references retain one
  note number while distinct occurrences receive distinct anchors. Backlinks
  resolve to the first visible occurrence in document reading order. Shared
  fields cover paragraph/heading text, Quote content/citation, nested List Items,
  Table cells/caption and supported captions. These are ephemeral identities;
  saved note IDs and storage versions are unchanged.
- Preview/article renderers and complete recursive HTML export use the same
  field identity helper. Standalone orphan-note HTML has no dead backlink.
  Hidden recovery descendants, Component recovery children and empty Table
  captions do not own visible backlinks or consume visible note numbers.
  Unscoped rich-text consumers retain unique React-generated fallback IDs.
  This does not establish Canvas Edit/Preview DOM-anchor equivalence: Edit's
  reference-to-note focus command is a separate interaction.
- Independent review caught two Mini Golf consumers: its custom text rendering
  omitted field identity, and its runtime repeated leaderboard cards with the
  same source IDs. The custom fields now declare their scope. Runtime Preview
  uses an ephemeral document projection with collision-safe IDs for subsequent
  player instances, one visible owner per shared note, and the actual calculated
  fields. The first instance retains source IDs; unused card templates and
  replaced player/progress text cannot supply invisible backlink targets.
  Edit and Preview reuse the player-text binding. A temporary source-ID map
  preserves legacy action bindings when a repeated card receives new IDs.
  Projected legacy Reset buttons and Holes/Players Fields dispatch the original
  actions in both player instances in the regression. Saved authored blocks, IDs,
  game sessions and content history are not written by this projection.
- The five-file pipeline, Footnote-blocks, parity-foundations, rich-text-DOM and
  Mini Golf presentation cohort passes 141/141. Separate read-only review passes
  pipeline/blocks/DOM 68/68 and Mini Golf 39/39, and independently reproduces the
  runtime case with two unique references and a resolving backlink. Typecheck,
  production build and diff check pass. Touched-source/test lint has zero errors
  and the two existing content-renderer image warnings.
- The Mini Golf VM test loader now targets ES2022, matching the supported Node
  runtime. It reads a source before registering the cycle-cache placeholder,
  preventing a failed extension lookup from poisoning later imports. Original
  behavioural assertions remain; the obsolete source assertion forbidding any
  Preview branch now requires the temporary projection while retaining Edit's
  runtime and Table callbacks.
- A broader 160-test run including block-preview passed 153 and failed seven.
  Those failures cover nested List validation, styled orphan notes, Embed
  presentation/caption/fallback, explicit Table row markup and Quote citation
  expectations. Their reconciliation remains open; the focused navigation
  result does not certify this wider suite. Canvas-wide lint and the full
  block/pane matrix also remain open.
- Builder browser replay in the memory-only selection specimen follows the
  second Footnote 2 occurrence to its shared note. Its backlink then focuses
  the first occurrence; native fragment state, DOM target and three distinct
  reference IDs were inspected. The replacement screenshots are
  `/private/tmp/acm-footnote-note-navigation-current.jpg` and
  `/private/tmp/acm-footnote-repeat-navigation-current.jpg`. The Verifier
  inspected their readable note/reference views. Still images do not prove
  targeting or focus. The earlier `acm-footnote-repeat-navigation.jpg` capture
  was unusable and is superseded. No persisted user data was changed.
- Fresh retrieval of the pinned Gutenberg Footnote/Math sources failed through
  the available network path. This records a navigation correction, not a new
  claim of exact upstream behaviour. Mini Golf live runtime, responsive/200%
  navigation, persistent reload and all rich-field contexts remain unverified.
  Math, Inline image, Language and the remaining matrix require further work.
  Changes remain within the existing local integration; no push or deployment
  was performed.

## Inline Math and native paste — 4 October 2026

- Reference: Gutenberg v24.1.0-rc.1, immutable revision
  `e3ac73cd69d472341b66c43cb77be36e838f868e`, format-library Math source and
  e2e tests. New Math occupies one noneditable inline object, seeds the selected
  text immediately or inserts at a caret, and opens a live anchored syntax
  editor. Toggling the active format restores its selected source. Unchanged
  source retains the original formatting. Invalid LaTeX shows parse feedback
  and blocks outside dismissal until corrected; Escape and the close control
  remain available. MathML and descriptions remain intentional ACM additions.
- A shared rich-run validator, Math structural-edit helpers and presentation
  module serve Canvas, Preview/article rendering and HTML. Generated KaTeX
  children are never authored content. Legacy marks render as one equation
  across formatting boundaries; edits preserve their original prose in place,
  and removing the format reveals that exact prose and its marks.
- Workspace 24, publication 17, template/package v0.25.0, Mini Golf draft 13/page
  definition 5 and clipboard 4 carry Math objects. Their predecessors remain
  readable, accepting their earlier Footnote contracts while rejecting
  under-versioned Math. The outer backup envelope remains 4. The Library's
  selection specimen demonstrates new and legacy Math using memory-only state.
- Ownership/document/field and full-block freshness guards protect syntax
  commits, deferred focus and blank-object cleanup. Ownership loss irrevocably
  discards the transient editor without a late write. Native paste decodes only
  detached validated descriptors, preserving source, descriptions and marks.
  Invalid Math keeps current text with feedback; mixed Math/Footnote paste
  requires block Copy to retain note companions. Independent review caught a
  false-positive raw-attribute check: ordinary escaped code and comments now
  retain native paste behaviour.
- Builder browser replay confirms caret insertion, selected source, Tab and
  Shift+Tab, active-format removal, valid/invalid live edits, outside-dismissal
  blocking, Escape focus return, Undo/Redo, editing before/after the atom, native
  copy/paste and its history, Table cells and centred captions. Safe MathML
  exposes the supplied description in the accessibility tree; unsafe MathML
  remains transient and closing retains the earlier safe source. Disabling
  editing closes an open Math editor, and re-enabling does not resurrect it.
  A legacy expression edit followed by removal restores bold `original` and
  italic ` prose` between unchanged neighbours. Preview contains no visible
  U+FFFC and no syntax editor.
- The shared anchored-popover shell now owns its background, border, radius and
  shadow; Math uses the same opaque shell as the Link destination control.
  Builder inspected desktop 1366×900, tablet 768×1024 and narrow 390×844 views.
  The 320px popup fits within the narrow viewport with an 8px right margin.
  Temporary screenshots: `/private/tmp/acm-math-desktop.jpg`,
  `/private/tmp/acm-math-tablet.jpg`, `/private/tmp/acm-math-narrow.jpg`.
  The older transparent Table-caption capture is superseded.
- Final Math/Footnote/DOM/pipeline/ownership cohort passes 152/152; typecheck and
  production build pass. Touched helper, popup, fixture and test lint has no
  errors. Canvas-wide lint still reports six errors and two warnings in the
  surrounding Highlight lifecycle, HTML/appender interaction and render-ref
  paths; these remain integration work. The independent read-only Verifier
  accepted the source correction, reran Math/DOM 27/27 and checked desktop
  presentation. It also inspected the tablet and narrow screenshots: both
  popups are opaque, readable and within their viewports. It returned one
  adjacent Footnote reader-migration documentation correction to the Builder.
- These browser checks used the Builder's disposable memory-only fixture.
  Independent live replay was unavailable; source checks and screenshot review
  are separate evidence. Persistent browser reload, every rich context, real
  200% browser zoom, all focus modes and the wider integration suite remain
  unverified. The in-app browser's zoom shortcut did not change its viewport or
  scale, so no 200% claim is made. Wider block-preview failures and the complete
  matrix remain open. No push, publication or deployment occurred.

## Integration test reconciliation — 4 October 2026

- The complete direct Node test run initially passed 814/917 and failed 103.
  These were actual failing checks, not a claim of pre-existing failures.
  Explorer reviewed all seven block-preview failures against their owning
  implementations and replayed corrections in memory before Builder changes.
  A fresh pinned Gutenberg Quote `save.jsx` confirms literal rich citation
  output, without an automatically prepended dash.
- Updated Preview fixtures/assertions retain exact behaviour checks: authorised
  List Item text colour plus malformed/unsupported-style rejection; referenced
  styled notes plus orphan omission and recoverable source; semantic Embed
  captions, secure fallback links and unsafe-URL rejection; explicit Table row
  height class; plain, authored-punctuation and rich Quote citations. Portable
  Embed caption markup remains separately checked. No renderer code changed in
  this reconciliation.
- One focused production-module loader replaces duplicate TypeScript loaders
  in Preview, Math and rich-DOM tests. Selection tests now inject the actual
  shared offset mapper rather than calling an extracted wrapper without its
  dependency. The Site Draft VM resolves relative imports from their importing
  module, keeps ownership/storage test boundaries and clears failed cache
  entries. Current save/reload fixtures first use the canonical reader; genuine
  historical migration fixtures remain intact. Unsupported future-version
  assertions follow workspace 24, publication 17, template v0.25.0, Mini Golf
  draft 13/page definition 5. Earlier input-version assertions remain.
- Refreshed the Styles source bundle using its supported generator. Only the
  committed governance revision changes to
  `8db1047d96b1a53c5567347c884b93bae71e785e`; the document, digest and mappings
  are unchanged. No governance or other project files were edited.
- Builder focused runs pass 133/133 and 162/162. Independent read-only Verifier
  passes 325/325 across Preview, selection, Math, DOM, safe Site Draft cases,
  Styles, recovery, templates, Mini Golf presentation and ownership. It excludes
  the temporary-file/importer test from its read-only run; Builder's Site Draft
  run includes that case. Touched test lint and diff check pass. The Verifier
  returned one naming correction: the current deletion-recovery fixture no
  longer claims to be a version 7 input. Separate genuine version 7 staging
  migration coverage remains.
- A complete rerun now passes 855/917 and fails 62, recorded at
  `/private/tmp/acm-parity-suite-reconciled.log`. Those residual failures need
  individual classification; their assertions are not waived. This cohort
  proves test/source consistency only, and adds no new browser or whole-editor
  assurance. The interdependent editor integration remains uncommitted pending
  a coherent verified boundary. No remote operation occurred.

## Language Explorer hand-off — 4 October 2026

- Fresh pinned Language source, styling and rich-text apply/remove/active-format
  implementations were read at the reference revision. No dedicated Language
  spec exists in the inspected pinned format-library e2e directory.
- Current Studio still has a selection-only residual generic dialog with
  hard-coded `en`/LTR defaults and unused Math fields. It has no checked menu
  state or active removal. It emits `span` rather than the reference's `bdo`
  direction override, and lacks captured-document/field freshness guards.
- Next Builder cohort should use a Language-specific selection-anchored popover,
  empty-language/LTR defaults, checked active removal, caret pending formatting
  and contiguous extent removal. Reuse the shared anchored shell, heading,
  button, catalogue Language icon and rich-field identity contracts. Preserve
  legacy span imports and add direction-only `bdo` parsing.
- Empty/broader language values alter validator acceptance. Establish their
  version floors and historical rejection explicitly before emitting them.
  Do not call a simplified tag regex complete BCP 47 validation. Confirm exact
  format-boundary behaviour before changing shared caret rules. Guard commits
  and deferred focus against ownership, document, target and source changes.
  Independent source and rendered verification are still required.
- Follow-up pinned active-format evidence confirms the shared caret policy:
  explicit pending formats win; otherwise fewer formats wins and equal counts
  choose the right side. Attribute intersection applies only to a non-collapsed
  selection. Keep `marksAtCaret` unchanged. Test adjacent `fr`/`en`, Language/
  plain and Language/Bold boundaries, explicit empty pending formats and equal
  Language attributes across other formatting splits.
- Explorer recommends retaining the existing unfinished, unpublished generation
  (workspace 24/publication 17/template v0.25.0/Mini Golf draft 13/page 5/
  clipboard 4). Add an extended-Language discriminator before old-envelope
  migration, including nested rich fields and Math recovery runs; reject empty
  or broader tags only below that floor, while ordinary historical Language
  values remain readable. If publication or an immutable external declaration
  is discovered, advance the generation instead. No such publication evidence
  was found in this local investigation.


## Language implementation and independent review — 4 October 2026

- Main remained sole Builder after the recorded Explorer hand-off. Language now
  has an accurate checked toggle, equal-attribute selected state, caret pending
  formats and contiguous equal-format removal across other mark splits. The
  shared caret boundary policy is unchanged. Inactive invocation opens a fresh
  empty-language/LTR form; active invocation removes the format.
- Reused the catalogue Language icon, shared popover/heading/button/dismissal
  controls and production rich-field resolver, now named for both Math and
  Language. The anchored shell accepts an optional live text-selection rectangle
  while observing the owning editor for resize/scroll and retaining its fallback.
  The residual generic form and obsolete Math fields were removed. The Library
  demonstrates adjacent Language values in memory-only state.
- Edit, Preview and HTML use directional `bdo`; both actual parsers retain legacy
  `span lang` and direction-only `bdo`. Empty/expanded tags use the current
  unfinished generation described in `docs/templates.md`; every old-envelope
  gate is covered. Historical accepted tags remain readable without truncation.
  Expanded syntax is bounded, not a complete BCP 47 registry check.
- The Builder's native browser replay found pending formats being cleared during
  focus return. The shared deferred focus helper now restores pending marks
  after native focus and selection placement. The Verifier found a separate
  stale-field focus gap; it now checks block/item/list/cell identity and expected
  resulting runs. The updater independently checks ownership/document/field and
  full-block freshness. Rapid loss/restoration of ownership discards the draft.
- Builder browser evidence: selected French Apply/removal and Undo/Redo; empty
  language/RTL caret typing and active extent removal; plain subsequent typing
  and Undo restoration; invalid syntax disabled Apply; native Tab and Escape
  focus return; ownership-loss discard; isolated Table cell and caption changes;
  shared Preview `bdo` output. No persisted product data was changed.
- Responsive evidence is `/private/tmp/acm-language-desktop.jpg` (1366×900),
  `/private/tmp/acm-language-tablet.jpg` (768×1024), and
  `/private/tmp/acm-language-narrow-recapture.jpg` (390×844). The original narrow
  capture was stale/scaled and is superseded. Main and independent Verifier
  inspected all final images; popup controls fit and remain readable. Native
  200% zoom and the complete persistent/context/focus-mode matrix remain open.
- Independent Verifier accepts the bounded source/visual cohort, rerunning
  100/100 including geometry. Its live browser and fresh upstream re-fetch were
  unavailable; interaction evidence is Builder-supplied and reference comparison
  uses the recorded pinned Explorer evidence. Builder integration passes
  276/276 at `/private/tmp/acm-language-integration-final.log`; typecheck, focused
  lint and production build pass (`/private/tmp/acm-language-build-final.log`).
  Canvas lint now has four errors/two warnings; its old Language form's two
  accessibility errors are removed, other failures remain open. Full goal and
  the prior 62 integration failures are not waived. Everything remains local.

- Latest full suite after Language: 931 tests, 869 pass and 62 fail at
  `/private/tmp/acm-parity-suite-after-language.log`. The 14 added regressions pass;
  the remaining failing test names match the preceding run. This is a current
  integration result, not a claim that those failures predate the authorised
  changes. The focused final log has been superseded with a green 100/100 run.
- Initial failure classification identifies stale exact-source/count assertions
  and incomplete AST/module harnesses among the 62 (e.g. missing React `useId`,
  insertion ownership/refs and the Controls range-colour import). Style/pane,
  modularity and behaviour assertions still require individual evidence before
  any update. No remaining test is waived. Inline image is the next Explorer
  cohort; the full block/pane acceptance matrix remains incomplete.

## Text selection across List Items — 4 October 2026

- Main remained sole Builder after Explorer investigation. The shared
  `list-text-selection.ts` capability represents a directed, freshness-checked
  range across visible item fields in one root List. Drag, Shift-click and
  Shift-arrow extension retain text endpoints; simple marks apply to the whole
  range. Sibling replacement, typing, paste, Cut and Delete use one root update
  and one history transaction. The Library contains memory-only basic,
  empty/wrapped and nested specimens. No storage contract changed.
- In this initial cohort, a gesture started in List Item text remained owned by that List. Crossing
  Group chrome, another block or a toolbar retains the last valid item endpoint
  and could not promote the gesture into whole-block selection. The separate-List correction below supersedes that restriction for independent List roots. Builder replay
  initially exposed Group loss; the corrected nested replay retains every item
  after cross-level Italic and a refused nested Delete. The actual production
  pointer-move/up handlers have a regression for ancestor/external excursions.
- Builder browser checks passed forward/reverse drag, Shift-click, cross-item
  keyboard selection through empty/wrapped fields, Bold/Italic, selected-text
  Copy, sibling typing/Delete/paste, single-step Undo/Redo and read-only Copy
  with edits refused. The actual user editor visibly selects both First item
  and Second item without content changes; proof is
  `/private/tmp/acm-list-multiple-selection.png`. Mutation checks used only the
  memory-only Library specimen.
- Nested subtrees support selection, Copy and simple formatting; destructive
  replacement and cross-item Enter/Tab are refused with feedback. Footnote
  ranges require block Copy/Cut to preserve note companions. Link, Highlight,
  Language and Math still require a selection within one item. Unsupported or
  non-cancellable input retains canonical text. Composition stages input and
  commits once on completion; actual operating-system IME input remains
  unverified. These limits are bounded support, not complete Gutenberg parity.
- Focused checks pass 39/39 at `/private/tmp/acm-list-focused.log`; typecheck
  and the fresh production build pass at `/private/tmp/acm-list-typecheck.log`
  and `/private/tmp/acm-list-final-build.log`. Independent read-only Verifier
  reran List/item/multiple-block checks 26/26, inspected the saved selection
  screenshot and accepts the bounded cohort after reviewing the gesture fix.
  Full-suite failures and the broad block/pane matrix remain open.

## Inline image media ownership prerequisite — 4 October 2026

- Explorer refreshed the current implementation and successfully retrieved the
  pinned image `index.tsx`, `style.scss`, active-object rule and insertion tests.
  The earlier unavailable-source limitation is superseded for those exact
  sources. Gutenberg inserts a single object, collapses the caret after it,
  uses Replace image for an exactly selected object and offers a changed-only
  width/alternative-text editor. Studio's selected-text mark and unguarded Files
  hand-off still need that implementation; this prerequisite does not complete
  Inline image parity.
- Main remained the sole Builder. `contentMediaIds` now uses the canonical
  rich-field and child walkers, covering every Table cell, all captions,
  Button labels, nested Lists and containers, retained dormant Quote content
  and List Item backgrounds. Template Columns/Column style backgrounds now
  join the existing block/image/logo/fixed-cover references. Traversal is
  read-only, preserves plain records and retains duplicate array semantics.
  Consumers use membership or deduplicated sets; ordering is not semantic.
- Independent review exposed reader/deletion gaps. Saved template publications
  can have the incomplete index legitimately written by their historical
  collector. Reading now enforces the references indexed by that format, then
  derives the complete list in the returned projection without writing or
  changing the immutable content/design snapshot. The committed v0.14.0 rule
  indexed Image/logo/fixed-cover and Group/Quote backgrounds; subsequent
  formats used the narrower rich-field walk preceding this correction.
  Previously enforced missing Image/logo/caption references still reject.
- Live publication and Bin deletion guards now consume the repaired projection.
  References owned only by a published copy remain protected after current
  drafts remove them. Tests also cover duplicate old IDs balancing an added
  reference, repeat validation, frozen source snapshots and backup propagation.
  Template/Bin backup validation still rejects missing asset bytes. The existing
  standalone, untemplated publication backup path does not enforce every asset
  byte and retains renderer fallbacks; this correction repairs IDs, not files.
- Canonical child ownership now follows block discriminants. Reader-valid extra
  `children` metadata cannot shadow item-owned Lists or create owned descendants
  on non-container blocks; frozen-record regressions cover both cases. The rich
  field walker shares this ownership rule with media and block lookup.
- Expanded media/foundation/template/List/Footnote/Math/Language checks pass
  217/217 at
  `/private/tmp/acm-media-reference-final-check.log`; typecheck, focused lint and
  the fresh production build pass at the corresponding
  `/private/tmp/acm-media-reference-final-{typecheck,lint,build}.log` paths.
  `git diff --check` passes. Independent read-only review accepts the bounded
  source prerequisite. Its first expanded run exposed a Canvas paste test
  selector that instead captured the new List handler; the corrected fixture
  selects the actual Canvas handler and supplies its non-List context.
  At this prerequisite stage, no new UI control or image atom had been emitted,
  and no persisted product data was changed. Image atom/render/parser/reader
  foundations and guarded menu/picker/object editing remain next.

## Image object foundation and selection corrections — 4 October 2026

- Inline image objects now have a typed, mark-free single-character representation,
  shared rendering and parsing, protected DOM selection boundaries and reader
  validation. Existing marked-text images remain readable. Current envelope
  versions accept image objects; predecessor envelopes reject them. Managed
  media references survive immutable remapping and clipboard decoding. Missing
  files retain alternative text. Boundary tests cover escaped descriptor limits
  and inherited media-map property names. The menu, picker and object-editing
  workflow is still pending; this foundation does not complete Inline image.
- A List text gesture can now enter an independent List root and select the
  whole block range. Returning to its original List restores text selection.
  Group chrome, toolbars, ancestors and stale or replaced roots cannot expand
  ownership. This is whole-block selection across separate Lists, not partial
  text replacement spanning separate roots. The existing block clipboard,
  deletion, history and read-only guards remain authoritative.
- Builder browser checks in the memory-only Library pass drag and Shift-click
  selection of two separate Lists, Delete followed by one Undo, and read-only
  refusal. Actual-handler tests cover reverse and return-to-origin gestures,
  foreign endpoints and stale-origin cancellation. Those reverse/return gestures
  have not been replayed in the browser in this correction.

## Column drop placement — 4 October 2026

- Explorer compared the pinned Gutenberg `use-block-drop-zone` and
  `use-on-block-drop` implementations. A shared parent-and-index insertion
  contract now supports root-to-Column, cross-Column, within-Column and
  Column-to-root moves, plus Block Library insertion at a Column boundary.
  Immediate child geometry determines the deepest Column destination and
  compensates for canvas scaling. The red Column indicator uses the shared
  alert colour, following Andrew's explicit presentation direction.
- Placement preserves block identities, rich content and metadata in one
  history proposal. It rejects self/descendant moves, restricted fragments,
  disallowed children, locked proposals and invalid complete trees. Canonical
  sibling and lock traversal ignores non-owning `children` metadata rather
  than crashing on a reader-valid record. Existing Column sibling reordering
  remains separate from placing content inside a Column.
- Drag sessions cancel on document/content changes, read-only mode, Preview,
  Code mode, Escape, blur or drag completion. Content-equivalent Template
  projections remain valid even when a render creates a fresh array. Drop
  handlers recalculate the destination rather than trusting a stale indicator.
  Studio, Template, Mini Golf and Library adapters consume the same contract.
- Builder browser checks pass existing and library block insertion, populated
  and empty Columns, cross-Column moves, moving out to root, one-step Undo/Redo,
  read-only refusal and matching Edit/Preview content at desktop and 768px
  viewport widths. A further native drop into an empty Column at the default
  390px viewport passes, with matching two-column desktop Preview captured at
  `/private/tmp/acm-columns-drag-preview.jpg`. The actual Template editor also passes root-to-Column
  dragging, Undo/Redo and Edit/Preview. At 200% Template workspace zoom, a native
  drag into a populated Column and one Undo preserve the exact source identity
  and order. Evidence: `/private/tmp/acm-columns-drag-placement.jpg` and
  `/private/tmp/acm-template-columns-drag.jpg`. Fixtures remain memory-only.
- The held-drag red indicator was not captured in a screenshot: the native
  browser drag API performs start and release together. Its source and scaled
  geometry are checked, but that intermediate visual state remains a rendered
  verification limit. Mini Golf dragging and persistent reload/export have
  not been replayed for this cohort; 200% workspace zoom is not browser zoom.
- Final focused checks pass 146/146 at
  `/private/tmp/acm-column-drop-final-check.log`; final production build and
  typecheck pass at `/private/tmp/acm-column-drop-final-build.log` and
  `/private/tmp/acm-column-drop-typecheck.log`. Independent read-only review
  passes 58/58 placement, List, multi-block, Image and DOM checks, plus 69/69
  Template/DOM checks, and accepts the bounded corrections. Focused placement
  lint, including the new Template specimen, passes at
  `/private/tmp/acm-column-final-lint.log`; the wider Canvas lint snapshot remains red. The earlier full
  suite had 62 failures and has not been rerun here. Those failures and the
  complete block/pane/menu matrix remain open.

## Inline image picker and editor — 4 October 2026

- Explorer inspected the pinned Gutenberg v24.1.0-rc.1 Image format at
  `packages/format-library/src/image/index.tsx`, commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`. Exactly one selected image slot
  offers Replace image; adjacent carets insert a new object. Insertion or
  replacement collapses the caret after that slot. Initial width is the
  smaller of natural width and 150px; blank alternative text is valid, and
  blank Width removes its explicit size. The anchored form is 260px wide,
  retains editor focus on opening and enables Apply only for valid changes.
  Studio deliberately bounds explicit widths to 1–2400px.
- Canvas now owns the mounted picker and captures the actual rich field,
  document, toolbar owner and immutable content baseline. It cancels decoding
  on dismissal, ownership/target/document loss, unmount or mode switch. An
  already chosen operation separately rechecks the supplied updater block and
  current ownership/content; it may survive UI dismissal but cannot replay into
  changed source. Invalidated targets cannot revive after a deferred clear.
  Provider replacement resets the pending session, and load failure retains
  original content. Image atoms are not native draggable elements.
- Studio and actual Template Workspace explicitly provide the existing managed
  media reader. Mini Golf uses the same mounted URL picker without reading the
  main Studio media store. There is no inline upload service: managing new local
  files remains in Files. Library providers and examples are memory-only. These
  are deliberate local-provider adaptations of Gutenberg's media integration.
- Media maps now reach Table cells and Image, Table and Embed captions, including
  unselected Embed rendering. Rich fields preserve browser-normalised image
  nodes between pointer-up and click, correcting first-click activation loss.
  Exact Image/Math Tab entry precedes List indentation; ordinary text and
  Shift+Tab still use List semantics. Selection leaving an image dismisses its
  form, while focus inside its form or picker retains its captured target.
- The Controls Library includes the actual reusable picker/popover at
  `/studio/ui/controls#inline-image`. It shares dialog chrome, close controls,
  overlay dismissal, Base/Secondary actions and existing catalogue image
  artwork. Math, Language and Image form fields now use one CSS presentation
  rule. No new isolated icon or browser-persistence store was introduced.
- Builder browser checks pass caret insertion, one-step Undo/Redo, exact-object
  editing, decorative blank alternative text, automatic width, changed-only
  Apply, ArrowRight dismissal, missing-image editing and first-click selection
  after a fresh load. Actual Table cell/caption, Image caption, nested Button
  label, List Item, Quote citation and Embed caption insertion render managed
  images. Table cell/caption content matches Edit/Preview. Tab in a selected
  List image focuses Width and retains all three List Items.
- Library checks pass changed-only Apply, relative-URL replacement with natural
  width 32px, load-error recovery preserving the chosen source, close/Escape/
  Cancel and contained overlays at 1280×960, 768×1024 and 390×844. Screenshot:
  `/private/tmp/acm-inline-image-library.jpg`. The browser viewport override was
  reset after checking. These checks do not establish real-device behaviour,
  browser 200% zoom, persistent reload/export, actual Template/Mini Golf image
  interactions, every rich-context input mode or exclusive transitions between
  different rich-object forms; those remain in the broader acceptance matrix.
- Focused Image UI/foundation/DOM/List/Math/Language checks pass 78/78 at
  `/private/tmp/acm-image-ui-focused-final.log`, including 12 actual Image UI
  handler/render regressions. Final build, typecheck and focused component lint
  results are recorded at `/private/tmp/acm-image-ui-{build,typecheck,lint}-final.log`.
  Wider Canvas lint still reports three existing errors (Highlight cleanup,
  Social picker cleanup and Social Link tabIndex) and two existing image
  warnings at `/private/tmp/acm-image-ui-canvas-lint.log`. The earlier complete
  suite's 62 failures and the complete block/pane/menu matrix remain open.

## Focus Outline context identity — 4 October 2026

- Fresh-load checks exposed different development URLs for the provider and
  setting client boundaries. Each boundary created its own React context, so
  the client setting disappeared while the server still rendered it.
- The context now lives in one ordinary dependency module. Provider state,
  policy lifecycle, ownership-guarded storage and the single Studio layout
  provider are unchanged. The regression loads two distinct component
  boundaries and renders their provider and setting together.
- Eight focused context, policy and repository checks pass within the final
  38-check selection/focus run at
  `/private/tmp/acm-selection-focus-final-tests.log`. Final production build,
  typecheck and scoped lint pass. Independent read-only review finds no blocker
  and confirms both boundary URLs import the same context dependency.
- Builder fresh-load checks pass Selection, Controls and the main editor View
  menu: each contains one setting and restores the saved Off mode after
  hydration. Controls also passes a full reload. No new hydration error appears;
  retained development logs predate the correction. Direct context-module HMR
  edits and native operating-system focus behaviour are outside this cohort.

## Upward List block selection — 4 October 2026

- Moving from a lower List into an upper block's left gutter now selects the
  complete block range. Rendered geometry resolves the deepest independent
  owner, with current typed-tree validation and ancestor/descendant exclusions.
  Selection within the same List, including nested items, remains native text.
- Release resolves the final visible endpoint after a real pointer movement,
  including coalesced moves. Stationary clicks do not select another block.
  Pending gestures survive internal leave events but cancel on a real exit.
- Repeated native replays exposed a browser text-drag transition followed by
  pointer cancellation. Canvas now prevents native dragging only during an
  active selection gesture originating in that List's item editors. Ordinary
  inactive text dragging and explicit block handles retain their own behaviour.
  Temporary event instrumentation was removed after diagnosis.
- A shared DOM contract marks one canonical host per selected root, avoiding
  duplicate Table/Quote shading. Whole selected blocks and their shared gap use
  the alert colour at 30% opacity. Individual toolbars and List indentation
  controls are hidden during multi-selection; Focus Outline Off no longer adds
  a competing blue selected-block outline. Forced-colours outlines remain.
- Builder native checks pass upward and downward selection, two consecutive
  final-item upward drags on desktop, and a final-item upward drag at 390px.
  Earlier 768px tablet selection also passes. Desktop Delete followed by one
  Undo restores both Lists; read-only mode permits selection but disables
  deletion. A mixed Table range paints only its outer canonical host.
  Screenshots: `/private/tmp/acm-list-upward-red-selection-final.jpg` and
  `/private/tmp/acm-list-upward-red-selection-narrow.jpg`.
- The focused selection/focus run passes 43/43 at
  `/private/tmp/acm-list-release-focus-final-tests.log`. Independent review
  caught and verified the corrected nested-List release regression. Final build,
  typecheck and scoped lint are recorded at
  `/private/tmp/acm-list-release-{build,typecheck,lint}-final.log`.
- Actual browser 200% zoom remains unchecked. Same-List screenshots show native
  text selection across items, but the selected-string readback was inconclusive.
  These checks do not close the broader block/pane/menu matrix, the earlier full
  suite failures, wider Canvas lint or the separate rich-form restoration race.

## Deferred rich-form restoration on 4 October

- A shared selection generation cancels queued Math, Image, Language and
  Highlight restoration after a later form transition, dismissal, pointer/key
  input, typing, window blur or editor-context change. Native selection changes
  remain available for legitimate cleanup rebasing.
- Intentional dismissal still restores its captured field. Restoration checks
  document, owner, field identity, connected editor, write permission and expected
  runs, and rechecks the generation after synchronous focus handlers. Blank Math
  dismissal requires the actual cleaned content before restoring its caret.
- Production-handler tests execute queued frames rather than discarding them.
  The bounded run passes 54/54, independent expanded review passes 80/80, and final
  build, typecheck and diff check pass. Evidence:
  `/private/tmp/acm-rich-restore-tests.log`,
  `/private/tmp/acm-rich-restore-build-final.log` and
  `/private/tmp/acm-rich-restore-typecheck-final.log`.
- Browser checks in the isolated selection specimen confirm blank Math to Image
  cleanup, Image dismissal returning to its owning field, a width change from
  24 to 32, and Language removal retaining the selected word and Bold. Screenshot:
  `/private/tmp/acm-rich-form-restoration-final.jpg`.
- Canvas lint still reports four errors and two warnings. The full parity matrix,
  persistence/export, additional contexts and responsive/zoom cases remain open;
  this bounded result does not establish whole-editor completion.

## Group and Buttons default controls — 4 October 2026

- The pinned Group declaration defaults Padding and Block spacing on; Margin is
  optional. The pinned Buttons declaration defaults Size, Border and Radius on;
  Padding and Margin are optional. Studio profiles now follow those defaults.
  Existing saved values, including explicit zero margins, still reveal their
  controls. Layout gaps remain in their existing owning controls.
- Reference: Gutenberg v24.1.0-rc.1, immutable commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`,
  `packages/block-library/src/group/block.json` and `buttons/block.json`.
  Explorer retrieved the pinned source through an approved read-only request;
  the independent Verifier's own fetch was unavailable and its review used the
  retained Explorer excerpts. This limitation is not a second upstream capture.
- Actual inspector-handler tests cover default visibility, saved values,
  field/section resets, legacy padding and child-content preservation: 56/56
  pass. Final build, typecheck and scoped lint pass in
  `/private/tmp/acm-layout-defaults-{build,typecheck,lint}.log`.
- Browser Buttons checks confirm Size remains after Typography Reset all, Margin
  is optional, entering 8 and Undo/Redo restores that value, and authored child
  styles remain rendered. Full Group interaction, Edit/Preview, reload/export
  and all viewport combinations remain open for this cohort.
- Independent review accepted the bounded defaults. Separate Sticky insertion
  tests now execute the production command adapter and expect its Buttons
  wrapper/selected child; Library assertions follow supported-field reset and
  shared control contracts. These 16 checks pass with independent acceptance.
  Static Library checks do not prove rendered control interactions.

## Caret-format observations — 4 October 2026

- Rich fields publish transient typing formats through the existing editing
  context. Canvas toolbar and caret Highlight rendering resolve observations
  against document, field, caret, text and stored-run baseline. Rendering those
  states no longer dispatches caret-format commands or queries native selection.
  Commands retain their event-based editor boundary.
- Explicit empty formatting overrides inherited formats. Typing advances the
  observation; genuine caret/range movement, paste, read-only transitions and
  changed text or runs invalidate it. Moving focus into a toolbar or formatting
  form retains the captured typing formats. These observations are not stored,
  exported or included in document history.
- Unmount cleanup uses field DOM identity even after model removal, including
  Quote citations. Table structure and caption/active-cell changes clear their
  affected observations. Highlight capture availability is event-published and
  cleared when its table capture is invalidated.
- Actual producer, keyboard, input, publisher, table-invalidation and render
  resolver handlers are exercised alongside the existing rich-form, Language,
  List, Table, selection and Math checks: 94/94 pass in
  `/private/tmp/acm-caret-state-expanded-final-tests.log`. A Math paste fixture
  now loads the actual publisher and checks null publication only on successful
  paste. Independent review found a citation cleanup gap; the sole Builder fixed
  it and the Verifier independently confirmed that correction.
- Browser checks confirm collapsed Bold followed by marked typing and Undo
  resetting pressed state; Highlight Text clearing preserves Background and
  pending Italic; table cells and caption retain separate formats; nested Button
  and List typing use their own field. At 768px nested List typing produces
  Italic; at 390px Bold remains usable. Read-only disables the action. Menu End
  reaches Superscript and Escape returns More text formatting. Focus Outline Off
  remains applied. Screenshots:
  `/private/tmp/acm-caret-observation-final.png` and
  `/private/tmp/acm-caret-observation-tablet.png`.
- This is a bounded formatting-state correction. It does not establish whole
  Canvas render purity: the wider Canvas lint still reports four errors and two
  warnings. Browser 200% zoom, remaining matrix rows and complete saved-document
  reload/export evidence remain open. Fresh whole-suite results are recorded
  separately below; no push or deployment is authorised.
- Final independent review accepted this cohort after running 43/43 focused
  checks and inspecting both screenshots, final handlers and documentation.
  The expanded 94/94 run is Builder evidence; the two runs have different scopes.

### Whole-suite checkpoint after caret-format correction

- `npm test` rebuilt the current source, checked the bundled Style Guide and ran
  1,037 tests: 983 pass, 54 fail. Build and source-bundle check pass; the command
  exits unsuccessfully because tests remain failing. Evidence:
  `/private/tmp/acm-parity-suite-caret-final.log`.
- Final typecheck and the touched observation/context/test-module lint pass:
  `/private/tmp/acm-caret-state-typecheck-final.log` and
  `/private/tmp/acm-caret-state-module-lint-final.log`.
- Read-only in-memory ESLint isolation traces the remaining Canvas refs warning
  to the unknown `presentation.renderBlock` call receiving selection/link event
  callbacks. Current Mini Golf adapters forward those callbacks into event
  handlers; Template supplies no-ops. This is a conservative callback-contract
  diagnostic, not a remaining direct ref read in `textMarkState`. It is retained
  as a failed check, with a presentation component boundary still to investigate.
- Failure classification confirms missing Group/Columns dependency declarations
  and remaining stale source assertions; it also confirms thin-coordinator and
  stylesheet ownership debt. None is waived by the focused green results.

## Conditional control metadata — 4 October 2026

- Group wrapping and content width now name Layout as their dependency. Columns
  preset availability names the pending layout choice, matching the canvas's
  pending-block-ID gate. A new Columns block already contains Column children;
  describing it as empty did not express the actual condition.
- The profile type documents that a control dependency describes its controlling
  field or editor context, rather than evaluating visibility. Reusable catalogue
  dependencies remain a separate contract.
- Regression coverage checks every conditional control, including nested
  profiles, and the three exact declarations. Builder and independent Verifier
  each ran 3/3 passing checks. Typecheck, scoped lint and production build pass:
  `/private/tmp/acm-capability-dependencies-{typecheck,lint,build}.log`.
- Independent source review accepted the bounded correction against the actual
  Canvas gate and catalogue consumer. Rendered catalogue verification remains
  open. The earlier 54-failure whole-suite checkpoint has not been rerun for
  this metadata-only cohort; these focused results do not replace that baseline.

## Library contracts and List Footnote evidence — 4 October 2026

- The icon catalogue now describes its shared optical scales without hard-coding
  an obsolete specification version. Per-icon provenance and master paths remain
  visible. Browser inspection confirmed the source panel, and the shared Panels
  tab loaded its specimen and permitted closing and reopening its example card.
  Screenshot: `/private/tmp/acm-library-icon-provenance.png`.
- List and List Item capability descriptions now reflect existing single-item
  Footnote and inline-image insertion. Insertion across multiple List Items
  remains unavailable. This cohort corrects metadata and documentation; it does
  not introduce a new insertion command.
- Library checks follow the actual tab callback, shared stylesheet ownership,
  29-entry block catalogue, inspector profile fields and defaults. Focus checks
  preserve semantic multi-block shading independently of the preference and
  retain forced-colours protection. The separate Verifier accepted these bounded
  contracts after independently running 41 focused checks.
- Seven new checks execute the production Canvas Footnote handler with actual
  list, notes, rich-text and history modules. They cover root and nested List
  Items, preserved styles and children, document-level note ownership, existing
  references, Undo/Redo, read-only, cross-item ranges, missing selection and a
  rejected transaction. They pass in `/private/tmp/acm-list-footnote-command.log`.
- Browser insertion in a nested Numbered List Item produced reference 2 and its
  note while preserving the existing reference 1. Preview rendered reference 2
  and `Nested list note`. Undo first reverted the note edit, then removed the
  inserted reference and note together; Redo restored both operations. Preview
  note output is shown in `/private/tmp/acm-list-footnote-preview.png`; the live
  accessibility state separately confirmed reference 2. Restored Edit reference:
  `/private/tmp/acm-list-footnote-edit.png`. The earlier root-item insertion
  passed history checks, but a development refresh reset its fixture before
  Preview; the nested insertion was repeated against a fresh fixture.
- The browser fixture is memory-only. These observations do not establish saved
  reload/export, every viewport, 200% zoom or complete inline-image coverage.
  The independent Verifier accepted the bounded source and evidence, running
  86/86 Footnote checks. The new command harness stubs native selection, focus
  and the apply boundary; it does not replace browser evidence for those paths.

### Fresh whole-suite checkpoint

- `npm test` rebuilt the source and checked the Style Guide bundle, then ran
  1,047 tests: 1,002 pass and 45 fail. The build and bundle check pass; the overall
  command fails. Evidence: `/private/tmp/acm-parity-suite-library-final.log`.
  This replaces the preceding 54-failure checkpoint as the current suite result.
- Typecheck and scoped lint of the touched catalogue/profile and test modules
  pass in `/private/tmp/acm-library-profile-{typecheck,lint}.log`.
  `git diff --check` passes. Whole-Canvas lint limitations remain as recorded
  above; this scoped lint does not supersede them.
- The remaining failures include older source/CSS assertions and the retained
  thin-coordinator and stylesheet ownership requirements. None is waived.
  Whole-matrix completion, coherent local commits and the remaining interaction
  evidence are still open. No push or deployment has been performed.

## Stylesheet ownership and publication time zone — 4 October 2026

- Moved the three existing Studio body-background and focus rules from
  `app/globals.css` to their sole owner, `app/studio/studio.css`. Selectors and
  declarations remain unchanged. Public body and focus rules remain separate.
  Builder checks passed 3/3; independent ownership and focus checks passed 8/8.
  Screenshot: `/private/tmp/acm-style-boundary-studio.png`. Browser inspection
  confirmed the unchanged Studio background and Off preference, and the public
  Writing route retained its own background and keyboard focus. On, Keyboard
  Only and all viewport states were not reverified in this cohort.
- The Publish picker previously edited local calendar fields while labelling
  every date `UTC+0`. The extracted `publication-date.ts` now supplies calendar
  helpers and a selected-date offset label; local Date construction and saved
  UTC ISO timestamps retain their existing contract. Studio's device-local
  policy deliberately differs from Gutenberg's configured site time zone.
  Reference: pinned Gutenberg v24.1.0-rc.1, commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`,
  `packages/components/src/date-time/time-picker/index.tsx` and `timezone.tsx`.
- Sixteen new publication-date checks pass, including both London DST
  transitions, positive and negative fractional offsets, calendar boundaries
  and the actual date-edit handlers. Evidence:
  `/private/tmp/acm-publication-date-tests.log`. Browser inspection confirmed
  `UTC+1` for the October date and the device-local explanation; Escape closed
  the picker and returned focus to its trigger. Screenshot:
  `/private/tmp/acm-publication-offset.png`. The live editor was paused with
  Connection lost; no persisted date changes were attempted. Browser date
  edits, saving, history, reload, export and wider viewports remain unverified.
- Reconciled six older source assertions with current shared owners: parent
  insertion policy, Advanced controls, HTML dispatch, template cover classes,
  toolbar sizing and Publish positioning. Their original behavioural
  invariants remain covered. All six pass in
  `/private/tmp/acm-six-editor-contracts.log`. A separate Verifier accepted the
  bounded change after 127/127 independent focused checks and diff review.
- Typecheck and scoped module/test lint pass. Whole-Inspector lint still
  reports its three existing accessibility errors; earlier whole-Canvas lint
  limitations also remain open. Scoped green results do not waive those errors.
- The fresh `npm test` rebuild and Style Guide bundle check pass; the suite
  reports 1,065 tests, with 1,027 pass and 38 fail, so the overall command fails.
  Evidence: `/private/tmp/acm-parity-suite-publication-final.log`. This replaces
  the preceding 45-failure checkpoint. No remaining failure is waived.
- Explorer confirmed that the 761-line Studio coordinator genuinely fails its
  existing less-than-350-line composition requirement. Proposed cohesive owners
  cover navigation, document commands, template actions, dialogs and Design
  media handoff while retaining the sole sessions and history router. Existing
  hard-delete and recoverable Bin paths must be consolidated deliberately;
  assignment/publication rollback, stale handoffs and failed template saves
  require focused acceptance evidence. This investigation has not implemented
  the extraction. Whole-matrix coverage and coherent local commits remain open.

## Coordinator, screen navigation and Table replay — 4 October 2026

This checkpoint supersedes the earlier proposed coordinator extraction. The
whole-editor comparison remains active and incomplete. The immutable repository
baseline is `f451d0aacb2f20dee6ee375ec38026ebc202da9f` on
`codex/panel-library`; the changes below remain in the preserved working tree.
The route remains Explorer → main-agent sole Builder → separate read-only
Verifier. The shared Style Guide and project instructions are unversioned at
this checkpoint; the reference Gutenberg revision remains the pinned revision
recorded above. No push, publication or deployment has occurred.

### Corrected owners and behaviour

- The main coordinator is now 341 lines, down from the 761-line pre-extraction
  snapshot. Navigation, header, document commands and dialogs, categories,
  canvas command adapters, Design media handoff and JSON downloads have focused
  owners. Workspace, Template and Media sessions retain their existing owners;
  the coordinator still routes the one active content or Template history.
- Document Duplicate and Rename act on explicit document IDs. Removal uses the
  recoverable Bin contract rather than the older hard-delete path. Rejected
  document/template creation keeps its reviewable form, and failed assignment,
  publication or workspace operations follow the bounded compensation paths.
  A returned command success means local acceptance, not completed durable save.
- Design media handoff rejects stale document/writability contexts and duplicate
  submissions. Failed insertion keeps the draft; accepted insertion selects its
  image. JSON downloads share one owner, including immediate or delayed object
  URL cleanup and cleanup after a click failure.
- The screen shortcut owner respects an already claimed key, composing input and
  an open native dialog. Closing a menu with Escape no longer also clears the
  selection underneath; Save does not act through a native dialog.
- Content, Templates and Bin URLs have one navigation owner. Explicit Template
  set/target links survive reload and Back/Forward. Content restores its actual
  Page/Post tab. Deterministic initial state removes the confirmed hydration
  mismatch caused by reading browser query parameters during initial rendering.
- Browser history asks before discarding dirty HTML. The parent captures the
  event before child Template listeners. Refusal leaves draft state mounted and
  traverses back to the accepted indexed entry; the compensating event does not
  prompt again or project a different screen. Backup also uses this owner.
  Legacy unindexed destinations have no reliable traversal direction: refusal
  restores the accepted URL with a new entry, which can truncate Forward history.
  No document schema, storage writer or publication contract changed.

### Checks and independent review

- The new command, dialog-controller, handoff, download, navigation and screen
  command regressions all pass in the complete suite. Tests execute production
  modules and extracted production commands; hook/component fixtures simulate
  React subscriptions and lifecycle boundaries and do not prove mounted focus.
- Nine older assertions now read their actual shared owners and check the main
  composition wiring. Their insertion, navigation, export and history invariants
  remain asserted; tests were not skipped or removed to make this cohort green.
- A separate Verifier accepted the extraction and returned the dirty-code
  Back/Forward and raw Backup URL gaps to the same Builder. Both were corrected.
  Final independent checks passed 38/38, including an additional in-memory
  Templates → Backup → Content → refused Back/Forward replay. Diff check passed.
- Fresh production build and Style Guide bundle validation pass. Typecheck
  passes; scoped lint exits successfully with two retained TemplateWorkspace
  effect-dependency warnings. Evidence: `/private/tmp/acm-coordinator-final-suite.log`,
  `/private/tmp/acm-coordinator-typecheck-final.log` and
  `/private/tmp/acm-coordinator-lint-final.log`.
- The fresh complete suite has 1,132 tests: 1,097 pass and 35 fail. `npm test`
  therefore exits unsuccessfully. This replaces the intermediate 1,110-test,
  44-failure checkpoint and the preceding publication-time-zone checkpoint.
  No remaining failure is waived as stale.

### Actual browser evidence and limits

- Native Table specimen actions enable the footer, disable the header and use
  Undo to restore its original header labels. Fixed-width off computes
  `table-layout: auto` and unequal content-driven column widths; Preview retains
  header/body/footer sections, layout and centred captions. Command+Z and
  Command+Shift+Z restore fixed/auto layout in the specimen.
- Table Preview fits 834 × 900 and 390 × 844 viewports without document horizontal
  overflow. The desktop override was restored. Evidence:
  `/private/tmp/acm-table-sections-autosize.png`,
  `/private/tmp/acm-table-preview-tablet.png` and
  `/private/tmp/acm-table-preview-narrow.png`. The attempted browser zoom shortcut
  did not change the measured scale; these checks do not establish 200% zoom.
- Native Templates navigation selects Header, reload restores it, Footer opens,
  Back restores Header and Forward restores Footer. Content returns to `/studio`.
  A fresh reload after the deterministic-state correction produced no new
  hydration mismatch; the previously recorded console error remains historical.
- Native Back from a dirty HTML draft raises the discard confirmation. Declining
  preserves the draft comment and restores `/studio` after the compensating
  traversal. The later Cancel confirmation stalled browser automation and its
  cleanup could not be verified; no Apply was submitted. Mounted dialog/menu
  dismissal, native refused Forward and persisted save/export remain open.
- During setup, the Code editor Title field was mistakenly treated as a draft;
  it actually edits document metadata directly. That edit was returned to the
  original `Untitled post` value through the visible title control before the
  HTML-only check. That restoration does not establish an identical saved
  record: accepted metadata edits update `updatedAt`, and the temporary changes
  remain in local Undo history.
  Use the HTML draft field or isolated specimens for subsequent checks.

### Remaining work, in priority order

1. Reconcile Separator's `hr`/`div` extension with its declared ACM ownership;
   preserve stored rendering and normal Gutenberg Separator styles.
2. Investigate the three unresolved visual policies: Design neutral surfaces,
   snapping guide colours and Block Library icon colour. Current source
   assertions fail; a different neutral colour is not proof of the intended UI.
3. Complete actual List Return/Backspace/indent/outdent, nested movement and
   insertion-gap checks before reconciling their source contracts.
4. Reconcile the remaining pane/layout, control ownership, toolbar count,
   Template Content and inserter animation contracts against production owners;
   preserve behaviour and replace obsolete owner checks only with evidence.
5. Complete each block/control matrix row's Edit/Preview, history, saved reload,
   export, read-only, pointer/keyboard, viewport and 200% zoom evidence. The Table
   replay and bounded coordinator review do not close those matrix rows.
6. Review a coherent local commit boundary, including required untracked modules,
   before committing. Preserve unrelated copies and generated files. Green
   focused checks do not make the whole dirty tree a reviewable release.

## Separator Advanced placement — 4 October 2026

Fresh Explorer retrieval of the exact pinned Gutenberg `separator/block.json`,
`edit.jsx` and `save.jsx` corrected the previous extension diagnosis. The core
`tagName` attribute supports `hr`/`div`, defaults to `hr`, and its editor control
belongs to Advanced. References:
[editor](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/separator/edit.jsx),
[attributes](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/separator/block.json),
[saved element](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/separator/save.jsx).

- Builder moved the existing selector from Styles into the shared Advanced
  component's children. Styles, Background, Margin and the three existing
  Advanced fields remain. Profile and catalogue now agree on Gutenberg ownership
  and Advanced placement. No renderer, export, model or envelope changed.
- Five new production JSX/handler and inventory regressions pass, including
  default `hr`, both changes and preservation of presentation/Advanced data.
  Existing capability checks pass, and four unchanged renderer/HTML regressions
  pass. A separate Verifier independently passed 21/21 focused checks and accepted
  the bounded diff. Typecheck, scoped profile/test lint and diff check pass.
- The isolated live specimen renders one HTML element selector within Advanced.
  Selecting `div` renders a DIV with the retained separator role, and selecting
  `hr` restores HR. Screenshot: `/private/tmp/acm-separator-full-page.png`.
  Attempts to use the specimen's Undo control did not change the visible element;
  that interaction remains unresolved. The concurrent main-editor browser
  confirmation stall limits input evidence. Do not claim keyboard history,
  accordion dismissal, Preview, responsive or persisted reload coverage here.
- Studio's DIV retains `role="separator"`; Gutenberg's DIV is non-semantic.
  This separate accessibility difference is recorded in the Library and
  compatibility document. No help text promises Gutenberg's DIV semantics.
- Fresh `npm test` production build and Style Guide validation pass, with 1,137
  tests: 1,102 pass and 35 fail. The command remains unsuccessful. Evidence:
  `/private/tmp/acm-separator-final-suite.log`. This is the latest suite checkpoint.
  Whole-matrix coverage and the coherent local commit boundary remain open.

## List outdent reading order — 4 October 2026

This continuation is a bounded behavioural correction, using main as Explorer
and sole Builder with a separate read-only Verifier. The complete Gutenberg
matrix remains active and incomplete.

- Explorer compared the pinned Gutenberg
  [List Item utilities](https://github.com/WordPress/gutenberg/blob/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src/list-item/utils.js).
  Native reproduction showed that outdenting the first nested item left its
  following sibling above it, changing reading order.
- The shared `outdentListItem` now carries the source tail beneath the moved
  item. Earlier Lists/source prefix remain with the parent; existing moved-item
  children precede the tail; later parent child Lists follow it. Distinct child
  wrappers retain ACM metadata and marker semantics rather than being merged
  indiscriminately. This is an explicit adaptation for ACM's multiple child
  Lists. It is shared by toolbar Outdent, Shift+Tab and existing empty-item paths.
- Source prefix retains its ID, anchor and authoring metadata. Relocated tails
  reuse their wrapper ID when possible; split tails allocate against all blocks
  in the document without duplicating anchor or note ownership. Allocation is
  pure, including toolbar availability during render. Ordered prefixes and
  tails retain forward/reversed numbering, including implicit reversed starts.
- Independent Verifier found two first-pass defects: IDs collided with blocks
  outside the List, and derived ordered starts could exceed reader bounds. The
  same Builder corrected both. All five production callers now pass canonical
  document blocks, and the existing start-range validator is shared with the
  operation. Unrepresentable moves return null before mutation.
- Focused tests pass 43/43: structure, marked item preservation and selection.
  Added coverage includes first/middle/last, third-level nesting, multiple child
  Lists, source metadata, ID collisions and both numeric bounds. JSON reader and
  HTML serialisation assertions support portability, not real saved reload or
  HTML parsing. Evidence: `/private/tmp/acm-list-outdent-focused.log`.
- Separate Verifier passed 52/52 focused checks, reran the original duplicate-ID
  reproduction through the actual command and both numeric refusals, and found
  no remaining blocker for this bounded source change. Protected source locks
  survive and protected wrapper removal/later List movement are rejected by the
  existing command contract. Browser read-only/locked cases remain unverified.
- Native isolated Library evidence: fresh `/studio/ui/blocks/list`, Shift+Tab and
  toolbar Outdent retain reading order and focus the moved item. Visible Undo
  restores the original hierarchy; focused Redo with Command+Shift+Z restores
  the transaction. Preview retains the hierarchy. Screenshot:
  `/private/tmp/acm-list-outdent-preview.png`. No saved user document was used.
- The previous Separator specimen history uncertainty is resolved: fresh native
  Undo changes HR to DIV and Redo restores HR. Temporary main-editor tab 11 is
  absent from the browser inventory. This does not add persisted reload evidence.
- Typecheck and production build/Style Guide checks pass. Full suite now has
  1,150 tests: 1,115 pass and 35 fail; `npm test` remains unsuccessful. Evidence:
  `/private/tmp/acm-list-outdent-final-suite.log`. The remaining failures have not
  been waived or blanket-reclassified as obsolete.
- Remaining List gaps: Backspace into the parent/trailing descendant, forward
  Delete through child/ancestor boundaries, and empty Enter with child Lists.
  Those need their own handler, history and real-interaction correction. Full
  saved reload/export, read-only and 200% evidence remains open; the bounded
  nested layout checks below do not close the whole List row.
- A coherent local commit boundary remains owed. The current working tree
  contains substantial prior authorised cohorts and required untracked modules,
  as well as unrelated copies/generated files. This bounded review does not
  approve the whole tree for a blanket commit, push or deployment.

### Nested Preview column correction

The final rendered check exposed a second concrete defect: nested Lists were
third grid children of their parent item, causing the child to occupy the marker
column and enlarge it. Studio Preview now reuses the editor's existing
`list-field-item-content` wrapper around text and nested Lists. No CSS override
was introduced and the public/article rendering branch is unchanged.

- Actual production React rendering regression passes. The retained nested List
  semantic HTML render/parse regression now expects the shared wrapper while
  retaining all metadata and public-render assertions. Its targeted check passes.
- Native DOM measurements after outdent: desktop parent text x306.4/child x336.4;
  tablet 834px has the same 30px nesting increment and no page overflow; narrow
  390px Preview parent x64/child x94, Edit parent x63/child x93, with no overflow.
  The one-pixel mode edge differs because of the editor frame; nesting is shared.
  Temporary viewport overrides were reset. Final screenshot was refreshed at
  `/private/tmp/acm-list-outdent-preview.png`.
- Typecheck and scoped lint exit successfully. The renderer retains two existing
  framework img warnings; this is not a clean whole-project lint result.
- Separate Verifier accepted the renderer hand-back with 56/56 focused checks,
  including real React rendering and nested semantic HTML round trips. The
  Verifier reviewed the geometry evidence but did not repeat browser actions.

## Empty List Return — 4 October 2026

This continuation made progress. Main followed Explorer → sole Builder →
independent read-only Verifier for a bounded Return correction. The goal is
active; this does not close the whole List or Gutenberg matrix.

- Pinned Gutenberg `use-enter.js` checks original stored content. Native
  reproduction confirmed that ACM instead exited a nonempty item when all its
  text was selected. The actual split handler now distinguishes these cases;
  an empty nested item outdents once with its children, and a virtual empty
  List is handled too. Composition and already prevented key events bypass
  structural key handling.
- Root exit uses shared `exitEmptyListItem`: prefix → Paragraph → intact child
  List wrappers → suffix. Keeping ACM's multiple child wrappers is an explicit
  adaptation from Gutenberg's single-child flattening, preserving wrapper
  IDs, markers, formatting and authoring metadata. Ordered starts are frozen
  and checked against the existing reader bounds before mutation.
- The original wrapper ID/metadata remains on prefix, else suffix, else the
  source-ID Paragraph. Newly split tails do not duplicate anchors/notes; the
  sole Paragraph retains supported alignment and site role. Conflicting
  sole-owner anchors refuse exit. Allocated IDs account for the whole document
  and other new owners.
- Independent review found and corrected three data gaps: promoted children
  bypassed a narrowed parent policy, sole conversion dropped alignment, and
  empty-looking legacy Footnote/Image/Math runs were misclassified. Reader,
  full tree placement, lock and reference guards now preflight the projection.
  Actual command regressions retain legacy companion notes and refuse protected
  child movement or denied placement without history.
- The additive internal focus contract tracks actual updater acceptance.
  Logical snapshot comparison supports cloned owners and Template projections;
  stale updates refuse mutation. Shared deferred focus resolves within the
  original document owner, cancels later input/document changes, cleans up
  temporary listeners and finds IDs through dataset equality. Existing string
  split targets remain supported. Library reset changes its owner identity.
- New checks pass 37/37. Separate Verifier passed 71/71 combined checks, accepted
  the final bounded source and found no remaining blocker. Typecheck, scoped
  helper/command/test lint and diff checks pass. Verifier did not repeat browser
  actions; native evidence below is main-agent evidence.
- Fresh isolated Library replay confirms selected-text split, empty nested
  outdent, empty root exit with intact children and focus in the new Paragraph.
  Visible Undo restores the complete hierarchy. Browser keyboard `Meta+z` and
  `Meta+Shift+z`, with a history control focused, restore the same transaction;
  earlier native-wrapper combo attempts produced no change and are not counted
  as shortcut success. Screenshot: `/private/tmp/acm-list-empty-return.png`.
- A further real gap remains: browser `Shift+Enter` creates a BR within the
  same item, but subsequent typing removes the line break. Record this as an
  open List rich-text gap; do not claim line-break parity from item counts.
- Latest `npm test`: production build and Style Guide checks pass; 1,187 tests,
  1,152 pass and 35 fail. Command exit is 1. Evidence:
  `/private/tmp/acm-list-empty-return-completed-suite.log`. The remaining failures
  have not been waived. Full Canvas/project lint is not certified.
- Remaining: boundary Backspace/Delete, the line-break typing gap, mobile
  `beforeinput`/OS IME, persisted reload/export, read-only browser replay,
  representative responsive/200% interaction and broader block/control rows.
  The Library remains memory-only; no saved user document was used this turn.
- Coherent local commit preparation remains open because affected files include
  prior authorised cohorts and required untracked dependencies. Unrelated
  copies/generated files remain preserved. No blanket commit, push or deployment
  is implied by this bounded review.

## Shared soft line breaks — 4 October 2026

The goal remains active. The prior turn's concrete List typing defect was traced
through the shared editor rather than treating it as another List storage issue:
`editorToRuns` stripped a final authored newline, the renderer omitted terminal
filler, and logical caret offsets stripped the same newline. Rerender therefore
restored the caret before the authored break and subsequent typing lost it.

### Reference and change

- Pinned Gutenberg `e3ac73cd69d472341b66c43cb77be36e838f868e`:
  `packages/block-editor/src/components/rich-text/event-listeners/enter.js`
  owns native `beforeinput: insertLineBreak`; `packages/rich-text/src/to-tree.js`
  distinguishes authored breaks from terminal padding; `create.js` excludes
  padding from content. ACM retains its own typed runs and uses a zero-length
  filler BR instead of Gutenberg's reserved text padding.
- `rich-text-line-break.ts` owns the authored/filler markup and typed insertion.
  Renderer, parser and logical offsets now preserve authored terminal/repeated
  newlines and ignore explicit filler. Detached clipboard BRs are preserved;
  an editable browser's unmarked terminal BR retains its filler interpretation.
- Native line-break insertion replaces exactly the current range, preserves
  pending formats and inline-object slots, and restores the following caret.
  Composition, another input owner and read-only state are guarded.
- Modern Paragraph/Heading runs are excluded from legacy blank-line splitting
  on refocus. Legacy plain-text projection remains available.
- The Library specimen previously left typed rich-text changes to browser
  history, despite programmatic operations. A native caret-focused Undo failed.
  Its explicit history owner now uses the existing shared platform shortcut
  handler for rich text. Form fields, independent overlays and unowned rich
  text retain native history. This was a Verifier hand-back to the same Builder.

### Evidence and limits

- Source regressions exercise expected newline content, not only agreement
  between parser and mapper; actual renderer/handler extraction, pending Bold,
  Highlight/Language, inline atoms, read-only/composition and shortcut ownership
  are covered. Independent read-only Verifier accepted the bounded source and
  history correction: 60/60 focused checks, including retained history checks.
- Native IAB `/studio/ui/blocks/list`, temporary state only: Shift+Enter then
  typing retains the visible line; repeated breaks survive typing, blur/refocus
  and switching Edit/Preview. Paragraph repeated breaks remain one Paragraph.
- With the Paragraph caret still focused, trusted Meta+Z removed the final
  authored break and enabled Redo; Meta+Shift+Z restored identical terminal
  authored/filler markup and disabled Redo. Earlier no-op native Undo was
  corrected rather than recorded as a pass.
- Rendered screenshot `/private/tmp/acm-soft-line-breaks.png` was saved and
  visually inspected. No persisted user document was used as this fixture.
- Native terminal-BR paste, OS IME/virtual keyboard, persisted reload/export,
  Table/caption/Heading browser contexts, read-only browser interaction,
  responsive/200% evidence and the wider parity matrix remain open.
- No push, promotion or deployment. Commit isolation remains owed: the edited
  Canvas depends on earlier uncommitted goal modules, so a blanket commit would
  include unrelated work and a tiny commit would omit its dependency closure.
- Latest completed `npm test`: production build and Style Guide source check
  pass; 1,219 tests, 1,184 passing and the same 35 failing
  `studio-behaviour.test.mjs` cases. Log:
  `/private/tmp/acm-line-break-final-suite.log`. The intermediate extra Inline
  Image failure was a missing production dependency in its extracted-parser
  harness; binding the actual helper restored its original reader assertions.
  No remaining failure is waived as stale.
- Typecheck passes. Focused DOM/line-break/Inline Image checks pass 56/56.
  Shared helper/history/specimen lint passes; the touched Inline Image test
  retains three prior style errors. Canvas baseline and final lint both report
  the same four errors and two warnings. Full project lint is not certified.
  `git diff --check` passes.

## List internal boundary merging — 4 October 2026

### Scope and reference

- Pinned Gutenberg v24.1.0-rc.1, commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`,
  `packages/block-library/src/list-item/hooks/use-merge.js` and List e2e tests:
  Backspace merges with the previous line in reading order; forward Delete
  chooses the first child before a following sibling, then climbs ancestors.
- Shared `list-boundary.ts` performs the typed operation. ACM retains multiple
  child wrappers intact rather than flattening Gutenberg's single child wrapper,
  preserving IDs, numbering, appearance, notes and anchors. Locked/hidden edges,
  protected empty-wrapper removal and conflicting item anchors refuse mutation.
- The same Builder corrected independent review findings: zero-text legacy
  Footnote/Image/Math marks conservatively refuse lossy normalisation; delayed
  updates require the captured source at the actual owner. This requirement
  propagates through Columns/Column, Group/Section and Quote to the Canvas owner.
  The Library validates against its current temporary snapshot; Template uses
  authored projection context; Mini Golf forwards the guard to its owner.
  Ordinary typing retains its existing update route. Library structural merges
  start a separate history entry. Focus waits for acceptance and exact List item.

### Evidence and remaining work

- Focused boundary, empty-Return and structure checks pass 105/105, including
  actual handlers, delayed Canvas/Columns/Template/Mini Golf owners, Library
  callback, typed Footnote companion and legacy-object refusal regressions.
  Independent read-only Verifier accepted the corrected bounded source with
  128/128 expanded checks and 2,560 additional in-memory ordering/direction
  cases. Adapter tests exercise source callbacks, not mounted Template/Mini
  Golf behaviour.
- Final typecheck and scoped helper/focus/specimen/adapter/test lint pass;
  Canvas lint retains four errors and two warnings, matching the earlier
  baseline. Diff check passes. Final `npm test` builds successfully and validates
  the canonical Style Guide source, then reports 1,264 tests: 1,229 passing and
  the same 35 unresolved behaviour-suite failures. Log:
  `/private/tmp/acm-list-boundary-final-suite.log`. An intermediate extra failure
  depended on Mini Golf JSX prop order; retaining the existing selected/hovered
  prop order restored the unchanged assertion. No remaining failure is waived.
- Native disposable `/studio/ui/blocks/list` fixture: first nested Backspace
  merges into the parent at the old parent caret boundary; parent-end Delete
  consumes that first child; ancestor-sibling Backspace merges into the deepest
  preceding descendant at its old text boundary. Remaining items retain their
  indentation. Edit and Preview show the same resulting tree.
- Fresh reload and hydration: caret-focused Meta+Z restores the entire merge;
  Meta+Shift+Z reapplies it with accurate visible history availability. An initial
  shortcut no-op in the retained development page was not counted as a pass.
  Reloading cleared that state. Screenshot `/private/tmp/acm-list-boundary.png`
  was saved and inspected. No persisted user document was used.
- Root/document first-item extraction, adjacent external blocks, saved reload,
  export, real read-only ownership, OS IME, responsive/200%, Template/Mini Golf
  browser contexts and the remaining block/control matrix are incomplete.
  Full project lint is not certified.
- This cohort remains local. No push, promotion or deployment. Coherent commit
  isolation and closure of earlier uncommitted dependencies remain owed.

## List first-root Backspace and specimen history — 4 October 2026

- Pinned Gutenberg v24.1.0-rc.1, commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`,
  `packages/block-library/src/list-item/hooks/use-merge.js` was inspected in
  GitHub's source view. First-root Backspace differs from empty Return: populated
  items extract into Paragraphs, and empty parents promote their child items.
- The shared `list-root-boundary.ts` implements the bounded typed operation.
  Annotated ACM child Lists promote intact rather than losing their appearance,
  anchors or notes. Parent capabilities, locks, reader validity, note companions
  and captured document freshness remain enforced by the canonical command.
  Template and Mini Golf adapters forward the operation; the Mini Golf custom
  presentation fallback now receives the same callback.
- Independent review corrected focus targets that referred to hidden blocks,
  containers or owners without a rich editor. Deferred focus finds a visible
  rich line and retains acceptance and interruption guards. Independent Verifier
  accepted this bounded correction with 151/151 focused tests and diff checks.
- Native disposable Library fixture, fresh reload then Reset Example:
  Home/Backspace extracts the first item and focuses its Paragraph; Command+Z
  restores the complete nested List, and Command+Shift+Z reapplies the operation.
  Visible Undo/Redo availability changes accurately. Preview retains the nested
  wrapper appearance and ordered tail numbering. Empty-parent promotion was
  also observed in Edit and Preview. Screenshot
  `/private/tmp/acm-list-root-history.png` was saved and visually inspected.
- Reset Example had remounted the specimen section without reattaching its
  history listener. The effect now depends on the reset revision. This is a real
  source defect behind the repeated post-reset shortcut failures, rather than
  evidence that every earlier no-op was merely development-page state. Refused
  Library commands also avoid creating an empty history entry.
- Adjacent List joining, external final forward Delete, saved reload/export,
  mounted Template/Mini Golf, ownership refusal, OS IME and responsive/200%
  evidence remain open. Full List parity and the wider inventory are incomplete.
  Coherent commit isolation of earlier dependencies remains owed; no push,
  promotion or deployment has occurred.

## Link caret insertion, editing and shared form — 4 October 2026

- Canvas now inserts linked text at an unlinked caret and edits the contiguous
  existing link at a linked caret. The typed `text-link.ts` operations preserve
  unchanged ordinary marks and inline objects, refuse unsafe replacement of
  objects and avoid a history entry for an unchanged link. Positive-length
  legacy Footnote, Math and Inline Image runs are preserved; zero-length legacy
  runs remain refused until a dedicated migration can retain their metadata.
- Link edit and preview use the existing shared anchored popover. The form
  captures its actual rich field, owner, document, runs and block snapshot;
  stale updates and deferred focus restoration remain guarded. Escape, repeat
  trigger dismissal and Cancel restore the captured caret. Switching from a
  blank Math form uses the existing cleanup and selection-rebase contract.
  Draft Text input retains focus while typing. The independent blue input
  border has been removed so the shared Focus Outline preference applies.
- Published primary reference: WordPress format-library v5.39.0,
  https://app.unpkg.com/@wordpress/format-library@5.39.0/files/build-module/link/inline.mjs.
  This corroborates caret insertion, existing-link extent and new-tab behaviour;
  it is not proof of exact offsets in the pinned Gutenberg v24.1.0-rc.1 commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`, whose Link source retrieval remained
  unavailable during this bounded pass.
- Main focused checks: 48/48 passing across text-link, rich-text-form-selection,
  Language and Inline Image UI. Independent read-only Verifier accepted the
  bounded fix and independently ran 37/37 Link, form-selection and caret
  observation checks. Typecheck, production build and scoped helper/test lint
  pass. Logs: `/private/tmp/acm-rich-link-focused.log`,
  `/private/tmp/acm-rich-link-typecheck.log`,
  `/private/tmp/acm-rich-link-build.log` and
  `/private/tmp/acm-rich-link-lint.log`.
- Native memory-only `/studio/ui/selection` fixture: paragraph caret insertion,
  existing-link URL editing, new-tab attributes, Command+Z/Command+Shift+Z,
  Escape and repeat-trigger dismissal passed. Table-cell and Quote-citation
  insertion preserved the surrounding fields and restored focus to the actual
  edited field. The popup remained within 768 × 1024 and 390 × 844 viewports;
  the intentional horizontally scrolling editor layout was retained. Focus
  Outline Off showed no visible input ring or independent blue border.
  Screenshot `/private/tmp/acm-rich-link-popup.png` was saved and inspected.
  No persisted user document was edited.
- Mounted Template/Mini Golf, saved reload/export, actual ownership refusal,
  OS IME, 200% zoom and the exact pinned boundary comparison remain unverified.
  The full suite was not rerun; its previously recorded failures remain open,
  with the next full run reserved for the end of the broader goal. External
  List joining remains the next behavioural priority.
- This fix remains local and uncommitted with earlier dependency cohorts.
  Coherent source commit isolation remains owed; the inventory baseline is
  committed separately as `8550f3f`. No push, promotion or deployment occurred.

## List final Delete into neighbouring blocks — 4 October 2026

- Retrieved the pinned Gutenberg `use-merge.js` and List `transforms.js` through
  the browser at commit `e3ac73cd69d472341b66c43cb77be36e838f868e`.
  Source captures: `/private/tmp/acm-pinned-list-use-merge.js` and
  `/private/tmp/acm-pinned-list-transforms.js`. Final Delete walks out of nested
  items and appends following List items or transformed Paragraph/Heading lines
  into the outer List. The first press does not concatenate boundary text.
  The previous priority narrative suggesting first-root Backspace should join
  a preceding Paragraph was not established; accepted extraction is retained.
- `list-sibling-boundary.ts` supplies the typed proposal through the existing
  canonical `exitList` command. It targets the exact deepest terminal line,
  edits the outer List's actual siblings and retains the original inner caret.
  Virtual empty roots materialise their existing editable line before appending.
  Following text retains rich marks and typed objects; per-item style retains
  its anchor once. List marker settings adopt the surviving outer owner.
- Notes, names, site roles, hidden/locked removal targets, conflicting removed
  wrapper appearance and unsupported text alignment are refused where their
  ownership cannot be represented. Zero-length legacy objects remain protected.
  Reader validity, Footnote reconciliation, parent capabilities, descendant
  locks and exact document freshness still gate the complete history mutation.
- Existing Canvas/Template/Mini Golf adapters forward the targeted List ID.
  Independent review caught the Mini Golf presentation fallback dropping that
  argument and the virtual-root edge; both were corrected by the same Builder
  and independently accepted. The memory-only selection specimen now forwards
  the canonical List command and includes an external nested-List target.
- Main focused checks: 117/117 passing across sibling, internal and root List
  boundaries. Independent read-only review: 72/72 passing across sibling/root
  checks. Final typecheck, scoped helper/test lint, production build and diff
  check pass. An overlapping output-cleanup attempt failed with `ENOTEMPTY`;
  after the preceding build handle completed, the final build succeeded.
  Logs: `/private/tmp/acm-list-sibling-focused.log`,
  `/private/tmp/acm-list-sibling-typecheck.log`,
  `/private/tmp/acm-list-sibling-lint.log` and
  `/private/tmp/acm-list-sibling-build.log`.
- Native disposable `/studio/ui/selection` fixture: root List append, external
  Paragraph append, deepest nested append to the outer List and original caret
  restoration passed. Command+Z restores the separate Lists; Command+Shift+Z
  restores the join. Edit and Preview retain the resulting nested tree and show
  the appended Paragraph once. At 390 × 844, deepest nested append also passed
  and the deliberate horizontally scrolling editor was retained. Screenshot
  `/private/tmp/acm-list-sibling-browser.png` was saved and inspected; Preview
  screenshot is `/private/tmp/acm-list-sibling-preview.png`.
- Saved reload/export, mounted Template/Mini Golf, actual ownership refusal,
  OS IME, tablet/200% and remaining control rows are still open. No full suite
  was rerun in this cohort; earlier failures remain open for classification.
  Source commit isolation remains owed with earlier uncommitted dependencies.
  No push, promotion or deployment occurred.


## Template Content insertion and nested presentation — 4 October 2026

- The remaining-failure Explorer identified one confirmed behavioural defect:
  Page/Post catalogues advertised Content, but both inserter filters excluded it.
  An explicit Template-only capability now routes root and supported Group,
  Section and Column insertions through the canonical template-node proposal.
  Ordinary documents, Mini Golf and Header/Footer parts retain their exclusions.
- Proposals validate the target, sibling boundary, parent capabilities, locks,
  duplicate IDs and at-most-one Content rule before acceptance. A rejected save
  does not select the proposal or add history. Current nodes reject repeated
  stale callbacks. Removal remains optional and recoverable; duplicating a
  slot or an ancestor containing it is refused.
- Root and nested slots reuse TemplateContentSlot and TemplateContentLayout.
  Layout classes, constrained-width attributes, appearance, background media
  and alignment follow the existing Template renderer. Nested controls use the
  canonical Canvas toolbar. An editor-only named focusable Content layout keeps
  pointer focus from selecting its ancestor. Columns retain TemplateNodes in
  read-only and Preview modes, so nested Content remains visible.
- Main and independent focused checks: 40/40 passing, zero cancellations. Two
  affected behaviour checks pass. Typecheck, focused helper/specimen/test lint,
  production build and diff check pass. Full TemplateEditor SSR initially hit
  an existing inspector import cycle in the data-URL test loader; those cases
  were replaced by execution of the actual presentation callback for both modes
  and writable states, plus production BlockField/TemplateNodes rendering.
  These tests do not establish whole mounted-editor coverage.
- Native memory-only Template specimen: root/Column insertion, removal and
  Command+Z/Command+Shift+Z recovery passed; nested Group insertion and selected
  toolbar visibility passed. Read-only and Preview retain one nested Content
  slot. The disposable fixture adds Page/Post/part targets and isolated history;
  persisted user documents were not edited. Screenshot:
  /private/tmp/acm-template-content-browser.png.
- Logs: /private/tmp/acm-template-content-focused.log,
  /private/tmp/acm-template-content-affected.log,
  /private/tmp/acm-template-content-typecheck.log,
  /private/tmp/acm-template-content-lint.log and
  /private/tmp/acm-template-content-build.log.
- Actual Content library drag, saved reload/export, real ownership denial and
  this cohort's responsive/200% matrix remain unverified. The neutral Template
  Preview policy conflict and lower-priority visual differences remain open.
  No full suite was rerun; source commit isolation remains owed with earlier
  uncommitted dependency cohorts. No push, promotion or deployment occurred.


## Broken control repairs — 5 October 2026

This is a bounded behavioural repair batch within the active parity goal.
The baseline remains Gutenberg v24.1.0-rc.1 at
`e3ac73cd69d472341b66c43cb77be36e838f868e`. The workspace Style Guide
and project instructions are unversioned sources, read on 4 October 2026.
The remaining-failure Explorer identified these defects; the main agent was
sole Builder and template_content_verifier independently reviewed each cohort.
No whole-block parity or goal completion is claimed.

### Embed fallback conversion

- Convert to link now preserves ID, name, note, locks and site role. Rich caption
  runs, formatting, inline objects and note references remain intact. Appearance
  moves to the canonical Paragraph-owned style through the existing transform.
  Wide/full alignment remains; float alignments unsupported by Paragraph are
  intentionally removed. Unsafe URLs, restricted parents and stale sources are
  refused before mutation; acceptance requests the existing source-match guard.
- Main and independent focused execution: 21/21. The affected inspector source
  assertion passes. Native disposable specimen conversion, Undo, Redo and
  Edit/Preview retain title link, caption, HTML anchor and margin. Screenshot:
  /private/tmp/acm-embed-link-browser.png.
- HTML serialization is checked in Node. Browser-only HTML parsing, persistence
  reload, nested conversion and mounted Template/Mini Golf conversion are not
  established by those checks. The exact pinned upstream Embed source was not
  retrievable, so this is an ACM preservation-contract repair.

### Social Icons Logos Only

- Both service colours now consume the shared colour variable before their
  existing brand fallback. The redundant CSS override hiding labels is removed;
  the existing SocialIconView and showLabels flag own visibility in all styles.
  Logos Only keeps its transparent background.
- Main and independent focused execution: 4/4. Native Edit/Preview confirms both
  selected colours and visible labels; disabling labels removes them, Undo
  restores them and Redo removes them again. Clear restores the LinkedIn/TikTok
  brand colours. Screenshot: /private/tmp/acm-social-controls-browser.png.
- Current upstream primary references support variation-independent labels and
  custom icon colours: Gutenberg social-links/style.scss and WordPress
  social-link.php. These moving sources do not establish exact pinned parity.
  Requested tablet/mobile overrides did not change the actual browser viewport
  (innerWidth stayed 1280); responsive and 200% acceptance remain unverified.

### Metadata visibility, typography and unsupported control

- Author, Date and Reading Time in Edit now use the same documentFieldVisible
  policy as Preview without deleting authored blocks. Custom line height uses
  the established shared metadata inheritance selectors, including the badge.
- Author's unsupported Block link-colour control and default are removed.
  Saved values remain recoverable through retained legacy styling; Date's
  working link-colour control remains. The inventory now has 401 profile records.
- Main targeted execution: 3/3. Independent metadata-name execution: 7/7,
  including those three cases and four existing metadata cases. Native shared
  Line height controls for all three blocks compute 40px at 16px text with a 2.5
  setting in Edit and Preview. Visibility states have actual production SSR
  coverage; browser visibility changes, history, reset and reload remain open.

### Code and Field read-only affordances

- Code and text Field use native read-only attributes; select Field is disabled.
  Each actual change callback also guards writable. Code keeps selection, copy
  and scroll. The persistence/write-ownership contract is unchanged.
- Main and independent focused execution: 8/8. Mounted native input interaction
  and actual ownership-loss transitions remain unverified.

### Batch checks and remaining work

- Final production build, typecheck, focused lint and diff check pass. Logs:
  /private/tmp/acm-current-controls-build.log,
  /private/tmp/acm-current-controls-typecheck.log,
  /private/tmp/acm-current-controls-lint.log,
  /private/tmp/acm-embed-link-focused.log,
  /private/tmp/acm-embed-link-behaviour.log,
  /private/tmp/acm-social-controls-focused.log,
  /private/tmp/acm-metadata-controls-focused.log and
  /private/tmp/acm-readonly-fields-focused.log.
- This batch used focused checks only. Accepted List/Table/formatting/icon cohorts
  were not re-audited. The full suite remains reserved for the final integration
  pass. Lower-priority visual differences, remaining inventory contexts and the
  Template Preview policy question stay open.
- Source commit isolation remains owed across the earlier uncommitted dependency
  cohorts and unrelated dirty files; this batch is not represented as a verified
  standalone source commit. No push, promotion or deployment occurred.

## Publication visibility preservation — 5 October 2026

- Route: read-only Explorer, main-agent sole Builder, separate read-only
  Verifier. Governing sources remain the unversioned workspace/project
  instructions and Style Guide recorded above; this is a local ACM content
  persistence repair, not an additional upstream parity claim.
- Explorer confirmed that publishing dropped document-field visibility, so
  hidden Author, Date and Reading Time reappeared after the publication reader
  and both page render paths. The repair freezes all six existing display fields
  from the exact selected template snapshot plus explicit document overrides.
  It preserves authored blocks and values, while retaining intentional removal
  of private editorial metadata from published blocks.
- Publication writers now use envelope 18 and retain readers for 1–17. Existing
  snapshots without visibility keep Show defaults without consulting a live
  draft or template. Inline-object version floors remain unchanged. A shared
  validator owns the existing workspace, template and publication visibility
  contract. Both page paths consume one publication-document projection.
- Main focused regression execution: 16/16. Actual owned publish, saved JSON,
  actual publication reader and production page presentation branches cover
  all six hidden/shown fields with and without a template, exact selected
  template inheritance, document overrides, Update, older envelopes 1–17,
  malformed policy rejection without overwrites, Unpublish and Bin restore.
  The page harness withholds hooks/effects: it is not a mounted browser reload.
- Independent review accepted the source and ran 13/13 initial focused cases.
  Three further invalid-draft fixtures were then added without changing the
  implementation. Related publication, backup, template and ownership checks
  passed 46/47 initially; the unsupported-version fixture still used newly
  supported 18. Changing only that boundary fixture to unsupported 19 gives
  1/1 on its targeted rerun. Existing output-version assertions now expect 18;
  old input-version fixtures remain intact.
- Final production build, typecheck and diff check pass. Scoped lint passes.
  Logs: /private/tmp/acm-publication-display-tests.log,
  /private/tmp/acm-publication-display-contracts.log,
  /private/tmp/acm-publication-display-ownership.log,
  /private/tmp/acm-publication-display-build.log,
  /private/tmp/acm-publication-display-typecheck.log and
  /private/tmp/acm-publication-display-lint.log.
- Mounted fresh article loading, native visibility/history/reset interaction,
  browser storage reload and responsive acceptance remain open. No full-suite
  run, push or deployment occurred. Source commit isolation remains owed across
  the earlier uncommitted dependency cohorts; this repair does not certify the
  wider inventory or complete the goal.

## Column width owner repair — 5 October 2026

- Route: read-only Explorer, main-agent sole Builder, independent read-only
  Verifier. Governing unversioned instruction and Style Guide sources remain
  the recorded baseline. This is a local content-owner repair; it does not
  claim additional Gutenberg coverage.
- Explorer confirmed that Main and Mini Golf replaced the selected Column with
  its parent Columns after a Width edit, duplicating identities and invalidating
  the content graph. An explicit parent-width command now replaces the actual
  parent, rejects a changed or missing parent and switched document, validates
  the full graph and retains insertion restrictions and existing lock checks.
- Parent lookup is shared by Main, Template and Library. Width redistribution
  reserves the existing reader minimum of 5% for every sibling; the control's
  maximum uses the same column-count rule. Missing/single-child parent width
  editing remains unavailable. The Library now uses the real command with
  temporary history and its documentation no longer describes Width as disabled.
- Focused regression execution: 11/11. Actual Main/Mini Golf configuration
  callbacks, the inspector's parent callback, nested/restricted content, finite
  limits, stale graphs, unchanged-history cases, whole-parent Undo/Redo, workspace
  reader and Mini Golf portable-page JSON round trips, and the actual read-only
  workspace commit guard are covered. Existing proportional Columns HTML
  rendering and identity round trip: 1/1 on a targeted execution.
- Native Library input changes 62%/38% to 25%/75%, retaining both paragraph
  texts. Visible Undo/Redo and Command+Z/Command+Shift+Z with specimen focus
  restore both states. Edit and Preview compute the same 1:3 ratio. Screenshot:
  /private/tmp/acm-column-width-edit.png. Library state is memory-only; this is
  not proof of Main/Mini Golf browser persistence reload.
- Independent review initially passed 10/10 and returned the single-column
  Library availability and trailing-whitespace corrections to the same Builder.
  Independent correction review accepted both changes and ran the new Library
  regression 1/1, giving 11 independently executed cases without rerunning
  accepted cases. Final production build, typecheck and scoped lint pass;
  the touched inspector still has three existing accessibility lint findings,
  confirmed against the pre-change snapshot. No new inspector lint finding.
  Diff check passes. Logs: /private/tmp/acm-column-width-tests.log,
  /private/tmp/acm-column-width-html.log, /private/tmp/acm-column-width-build.log,
  /private/tmp/acm-column-width-typecheck.log, /private/tmp/acm-column-width-lint.log
  and /private/tmp/acm-column-width-lint-baseline.log.
- The subsequent Columns layout/count cohort below repairs the invalid Top CSS
  mapping and unrestricted count reduction. Main/Mini Golf native ownership/reload,
  responsive/200% acceptance, remaining matrix contexts and source commit
  isolation remain open. No full-suite run, push, publication or deployment.

## Columns alignment and guarded count — 5 October 2026

- Route: Explorer, main-agent sole Builder, independent read-only Verifier.
  The shared layout mapper translates stored Top to CSS `start`; Columns,
  Group and Section retain their saved values and reuse that mapper.
- Count changes now use the canonical parent command in Main, Mini Golf,
  Template and the memory-only Library. Reductions preserve content order and
  metadata, and refuse moves into a restricted destination or removal/movement
  of locked blocks. The pane explains a refused reduction. Stale parents,
  switched documents and invalid resulting graphs are rejected. Additions
  allocate identities once. Template Width also uses the canonical guard.
- New focused checks: 11/11, independently repeated 11/11. Related Column
  Width regressions: 11/11. The production build completed; scoped lint produced
  no diagnostics. The typecheck log contains no diagnostics; its process exit
  result was lost during output truncation and is not recorded as confirmed.
  Final diff check passes. No full-suite run for this cohort.
- Native Columns measurements confirm Top, Centre, Bottom and Stretch in Edit
  and Preview with unequal-height contents. A restricted reduction is disabled
  with an explanation; an allowed reduction preserves both paragraphs, and
  Undo/Redo restores the column count. Evidence:
  `/private/tmp/acm-columns-layout-alignments.json`,
  `/private/tmp/acm-columns-top-edit.png` and
  `/private/tmp/acm-columns-restricted-count.png`.
- Independent review accepted the source and supplied browser evidence. HTML
  checks cover serialisation only. Mounted Main/Mini Golf/Template reload and
  ownership transitions, Group/Section native rendering, responsive/200% checks,
  remaining inventory contexts and source commit isolation remain open. This
  bounded acceptance does not certify the wider inventory or complete the goal.

## Featured Image source and dimensions — 5 October 2026

- Explorer → main-agent sole Builder → independent read-only Verifier accepted
  the shared safe source resolver and image presentation. Managed images now
  appear in ordinary Preview; resolved Edit images own their dimensions instead
  of inheriting the empty placeholder's fixed ratio. Template images reuse both
  contracts. Missing sources and hidden document fields retain their policy.
- New focused checks: 15/15, independently repeated. Related frame checks: 4/4.
  Typecheck and production build pass. Scoped lint retains the same seven
  pre-existing Canvas errors, with no new error. Diff check passes. No full suite.
- Native memory-only Library evidence covers all five aspect ratios with Auto
  height, explicit dimensions, Cover/Contain/Fill, link safety and Undo/Redo.
  At 768px and 390px the image and inspector controls remain contained. Auto
  width follows the available box; the specimen's existing Preview selection
  border accounts for its 2px width difference. Evidence:
  `/private/tmp/acm-featured-image-browser.json`,
  `/private/tmp/acm-featured-image-preview.png` and
  `/private/tmp/acm-featured-image-tests.log`.
- Mounted Main/Mini Golf/Template ownership, saved reload/export and actual
  200% zoom remain unverified. Normal Image's native dimension, decorative,
  custom-link and lightbox checks are recorded separately in
  `/private/tmp/acm-image-pane-evidence.json`. No publication or deployment.

## Social Icons frame and foreground ownership — 5 October 2026

- Explorer identified duplicate Preview border/radius/margin on both the shared
  wrapper and inner navigation. The sole Builder retained the outer owner and
  reused a three-variable icon-colour projection in Edit and Preview. Child
  frames, palette/gradient values, layout, labels and safe links are unchanged.
- Rendered checking exposed a related contrast failure: generic block-link
  rules replaced the default white social foreground with off-black. Ordinary
  link normal/hover selectors now exclude social links in Studio and public
  prose, preserving their dedicated foreground and decoration rules.
- New regression checks: 7/7 plus the new CSS case 1/1, independently verified.
  Related Social Icons checks: 4/4. Typecheck and the final CSS production build
  pass; the build is recorded in `/private/tmp/acm-social-frame-build-final.log`.
  Scoped lint retains the same seven pre-existing Canvas errors. Diff check
  passes. No full suite was run.
- Native memory-only Library evidence covers all three variations, one outer
  2px border/11px margin/9px radius, actual 2px → 5px Undo/Redo, default white
  foreground, authored palette colour in Edit/Preview and Logos Only, and colour
  Undo. Reset Example restores the fixture and deliberately clears history.
  At 768px and 390px there is no horizontal document overflow and visible pane
  controls remain contained. Evidence: `/private/tmp/acm-social-frame-browser.json`
  and `/private/tmp/acm-social-frame-preview.png`.
- Additional native control coverage records both orientations and all four
  justifications in Edit/Preview, 12px/20px gap axes, wrapping off, labels off,
  same-tab links and all four icon sizes. Both children's URL/label/rel changes
  update their intended links; subsequent parent changes preserve those values
  and add the new-tab safety tokens. Evidence:
  `/private/tmp/acm-social-controls-browser.json` and
  `/private/tmp/acm-social-children-browser.json`.
- Mounted owner reload/export, real public/template presentation, native hover
  and 200% zoom remain unverified; renderer SSR and selector checks do not claim
  those runtime contexts. The wider matrix and coherent source commit remain
  open. Work remains local.

## Mini Golf shared block context — 5 October 2026

- Explorer found that the generic Edit fallback omitted the document and
  managed-media context passed by Preview. The sole Builder added those props
  to the existing shared BlockField, including the selected managed Image URL,
  and forwarded the media lookup to the canonical score-table fallback.
- Actual component SSR verifies populated Title, Subtitle, Author and both Date
  sources, visibility overrides, nested metadata and managed images, safe/missing
  image handling, absent metadata and whole-document reading time. The canonical
  score-table Preview resolves managed images in its cell and caption. Its Edit
  prop check establishes document/root-block/media identity; rich-text contents
  initialise through browser effects and are not certified by that SSR check.
- Final focused checks: 9/9 actual-component cases and 1/1 Edit prop-contract
  case, independently accepted. Typecheck, production build and scoped lint
  pass. Diff check passes. The full suite was not rerun. Evidence is recorded in
  `/private/tmp/acm-mini-golf-context-tests.log`,
  `/private/tmp/acm-mini-golf-context-props-tests.log`,
  `/private/tmp/acm-mini-golf-context-typecheck.log` and
  `/private/tmp/acm-mini-golf-context-build.log`.
- Mounted Main editing remains paused with the visible Connection lost state.
  View → Preview in new tab renders the saved document through the explicit
  read-only route. No authoring mutation, takeover or existing-draft replacement
  was performed. Main/Template owner persistence and Mini Golf mounted authoring
  checks remain open; Mini Golf has no supported disposable-copy command.
- This is a local context-propagation fix, not complete Mini Golf or editor
  parity. The wider inventory and coherent source commit remain open.

## Mini Golf canonical editing delegate — 5 October 2026

- Explorer identified missing generic adapter callbacks for List targeting,
  links, nested insertion and shared controls. The sole Builder extracted the
  existing complete Canvas BlockField contract into one local renderer and
  offered it to presentation adapters. Generic Mini Golf blocks and rich
  score-table fallbacks use it; specialised runtime presentation stays scoped.
- Native checks exposed outer Group selection overriding a focused nested List.
  Wrappers now resolve the deepest document-owned block. Independent review
  identified missing nested Table toolbars in specialised Sections; nested
  delegates now receive one shared toolbar while roots retain Canvas ownership.
- Focused checks pass 59/59 across delegate, Mini Golf presentation and actual
  block-context tests. The broader related run caught a synthetic selection
  event without a target; null-safe target resolution retains the parent fallback.
  Typecheck and final production build pass. Scoped lint retains seven existing
  Canvas errors and two warnings; it is not a clean lint result. Diff check passes.
  Logs: `/private/tmp/acm-adapted-editor-final-tests.log`,
  `/private/tmp/acm-adapted-editor-final-typecheck.log`,
  `/private/tmp/acm-adapted-editor-final-build.log` and
  `/private/tmp/acm-adapted-editor-lint.json`.
- The memory-only selection Library can use the real Mini Golf adapter. Native
  evidence confirms second root List Bold with Undo/Redo, nested List Italic,
  intended non-first score cell Bold with the other three cells unchanged,
  caption-only hyperlink, specialised Section second List item Italic, and
  insertion into the second nested Column with Undo/Redo of the same child ID.
  Read-only fields have contenteditable=false. Evidence:
  `/private/tmp/acm-adapted-editor-browser.json` and
  `/private/tmp/acm-adapted-editor-nested-table.png`.
- The independent Verifier accepted the bounded delegate, owner and toolbar
  correction from source, focused regressions and saved native evidence.
  Group/Column appenders and an already-open Library remain apparently enabled
  in read-only mode despite guarded mutation; their availability is not accepted.
- The exact historical 150-test/21-failure artefact could not be located. Older
  available logs contain stale source-owner assertions and deferred colour
  differences; all 21 failures have not been individually closed. Mounted owner
  persistence/reload/export, real Mini Golf authoring and 200% zoom remain open.
  The full suite and coherent source commit remain owed; work remains local.

## Read-only nested insertion availability — 5 October 2026

- Explorer confirmed that existing write guards refuse mutations, while nested
  appenders and an open Block Library still advertised insertion. The sole
  Builder reused one Group/Section/Column appender, disabled unavailable tiles
  and dragging, and guarded opening, dispatch and drag entry against the current
  writable reference. Existing drag cancellation and drop guards remain intact.
- Focused checks pass 28/28; Main and Mini Golf repeated docked insertion checks
  pass 2/2. The block-placement harness now supplies the actual shared insertion
  helper used by the production drop handler. A separate Template sticky-library
  harness still lacks the current insertContent command and remains unresolved.
  Typecheck and production build pass. Scoped lint reports seven existing Canvas
  errors, two warnings and the existing hook-rule error in block-placement's
  synthetic loop; the new regression file has no lint findings. Diff check passes.
- Memory-only native evidence confirms disabled nested appenders and Library
  tiles after editing becomes unavailable, draggable=false, usable search and
  Close, and a new Paragraph in the intended empty Column after restoring editing.
  Both canonical and Mini Golf presentations were checked. Evidence:
  /private/tmp/acm-readonly-insertion-browser.json and
  /private/tmp/acm-readonly-insertion-browser.png; focused/build/typecheck logs
  use the same acm-readonly-insertion prefix.
- Independent read-only review accepts this bounded fix. Between-block insertion
  controls still appear enabled and are a separate remaining issue. Saved-draft
  ownership, persistence/export and wider insertion parity are not certified.
  The complete outcome matrix, full suite and coherent commit remain open.

## Individual control outcomes and complete source inventory — 5 October 2026

- The previous status-only goal turn made no implementation progress. This pass
  returned to the first priority: explicit individual inventory outcomes before
  opening further implementation cohorts. The main agent was Explorer and sole
  documentation Builder; a separate read-only Verifier reviewed the matrix.
- All 426 existing block/property identities and their order are preserved. Each
  row now records an outcome, evidence boundary and remaining acceptance. Totals:
  360 Unverified, 33 Bounded accepted, 9 Partial, 9 Configuration exclusion,
  10 No exposed control and 5 Intentionally hidden. Compound field ownership is
  retained; one accepted subfield does not certify the entire composite control.
- Atomic source records add 207 menu/action/form entries and 344 pane/subordinate
  entries, including Document, Studio, View, Template, Navigation and supporting
  Files/template-library controls: 977 total records. Dynamic palette colours,
  allowed block types, library tiles and optional property choices remain
  parameterised operations with explicit conditions and canonical source owners.
  Main Document Styles intentionally has no separate document-level overrides.
  Backup/Bin/Design/Sites are navigation destinations, not new application audits.
- Independent review confirmed preservation of the property rows and unique
  atomic IDs. Its hand-back removed two invented Allowed Blocks controls and
  narrowed Table alignment evidence to the recorded Right choice. Left/Centre
  remain unverified; the composite alignment row is Partial. The final amended
  inventory passed independent read-only review, including the 977-record recount
  and sampled supporting Files/Template owners.
- Structural counting and identity checks passed; scoped git diff --check passed.
  No implementation code or persisted product content changed for this inventory pass, and
  no behaviour tests, build or full suite were rerun. A source-only outcome is
  not native interaction evidence or whole-editor parity.
- Current Template canonical-delegate formatting, cover/between/end read-only
  appender availability and sticky-library harness repairs are implemented but
  await final accepted evidence. The live Template caption-anchor activation
  failure remains an open bounded diagnostic; it is not closed by successful
  toolbar Link creation. Their focused logs are separate from this inventory.
- The wider goal remains active. Remaining accepted-context gaps, highest-impact
  defects, final full-suite classification and a coherent implementation commit
  remain outstanding. Work stays local; no push, publication or deployment.


## Template delegate and caption acceptance — 5 October 2026

- The previous status turn made no implementation progress. This continuation
  closed the pending Template cohort before investigating the current suite.
  TemplateSurface cancelled every link during capture, before RichTextEditor
  could select the anchor. Its unchanged navigation guard now runs on bubbling:
  rich fields activate their Link preview first; static Edit links remain
  non-navigating and Preview links retain normal behaviour.
- Template generic fields use the canonical Canvas delegate with authored roots,
  current owner callbacks and unchanged-source refusal. Sample documents remain
  presentation context. Root/nested List and Table formatting, captions and Row
  Spacer orientation use the same contract. The read-only end appender is now
  disabled and its focus/change/key handlers refuse unavailable ownership.
- Actual native evidence confirms root second List Bold with Undo/Redo, nested
  second List Italic, fourth root/nested Table cell Bold, caption-only links,
  direct caption-anchor activation after a cell focus, Escape focus return,
  static Preview retention, disabled read-only insertion and static read-only
  fields. Caption popups fit the recorded 768px viewport and 390px viewport at
  200% Template zoom; viewport and zoom were restored. Evidence:
  `/private/tmp/acm-template-delegate-browser.json`,
  `/private/tmp/acm-template-delegate-caption.png` and
  `/private/tmp/acm-template-delegate-mobile-200.png`.
- Final related tests pass 191/191 after four old label expectations, an omitted
  real Embed helper and an obsolete Template-local callback assertion were
  corrected. The replacement Template test integrates the actual TemplateEditor,
  StudioCanvas delegate and list-boundary operation, proving stale refusal and
  sample immutability. Mini Golf coverage remains present. Log:
  `/private/tmp/acm-parity-test-harness-focused.log`. The end-appender focused
  regression passes 23/23; current typecheck and scoped Template lint pass.
- Independent read-only review accepted the bounded source changes, four test
  migrations and saved native evidence with no blocking finding. This closes the
  caption diagnostic and delegated formatting acceptance in these contexts.
  Mounted writer persistence/reload/export and wider control contexts remain
  unverified; no claim of complete editor parity or deployment is made.

## Current suite classification and reduced motion — 5 October 2026

- The current full `npm test` run completed: production build and style-source
  index passed; 1534 tests comprised 1507 passing and 27 failing. Authoritative
  log: `/private/tmp/acm-editor-parity-current-full-suite.log`. This is the
  complete run before the following harness and CSS corrections; it has not
  been relabelled as a current all-pass result or rerun repeatedly.
- Six failures were stale caption/delegate harnesses closed above. A read-only
  Explorer classified the remaining 21 individually: 17 stale owner/API/selector
  assertions, one real reduced-motion defect, and three visual-policy differences.
  Stale checks now follow the shared Pane, catalogue icon adapter, List boundary
  operations, focus preference and current insertion handlers. Document counts
  execute the actual appender calculations for blank, whitespace and typed text.
- The genuine defect was CSS specificity: `.block-inserter.pane` overrode the
  lower-specificity reduced-motion selector. The reduced-motion rule now matches
  the actual Pane selector. Four regression cases check production Pane classes,
  cascade specificity, immediate reduced-motion dismissal and exclusion of
  descendant/entry/cancelled exit events. Existing normal entry/exit is retained.
- Focused current owner-contract checks pass 194/194. The migrated behaviour and
  motion run passes 151/154 with only these deliberately unresolved visual
  differences still failing: Design accent/focus tokens, Design guide colour,
  and Library icon grey versus ink. Their assertions were preserved; they are
  deferred under the goal's lower-priority visual direction, not waived.
  Logs: `/private/tmp/acm-parity-current-owner-contracts.log` and
  `/private/tmp/acm-parity-owner-migration-focused.log`.
- Current production build passes:
  `/private/tmp/acm-block-library-motion-build.log`. Scoped migration lint is
  clean excluding inline-image-ui's five existing harness findings; the combined
  lint log records those findings. These are not a clean whole-repository lint
  result. Diff check passes. Independent read-only review accepts the bounded
  motion fix and 17 migrations with no blocking finding. Its two test-hardening
  suggestions now assert CSS source order and require both navigation-order
  targets to exist; their focused acceptance is recorded separately.
- The real browser rendered `pane block-inserter`, normal entry animation,
  corrected reduced-motion CSSOM rule and successful repeat-trigger dismissal.
  Its reduced-motion media query was false; the available API cannot emulate
  that preference, so native reduced-motion/OS validation remains unverified.
  Screenshot: `/private/tmp/acm-block-library-motion-browser.jpg`.
- The complete inventory remains 977 records. Existing accepted controls were
  not reopened for unrelated visual work. Broader property/input/persistence
  acceptance and the coherent implementation commit remain open. Work is local;
  no push, publication or deployment occurred.

## Main caption persistence — 5 October 2026

- The mounted Main editor reported Local workspace ready after hydration. The
  earlier Connection lost state is not a current approval blocker. A full reload
  briefly renders the initial unavailable state before loading the owner-held
  snapshot; the saved workspace and named copy remained available afterwards.
- Actual Duplicate created a separate draft, renamed through the editor to
  “Parity verification — local test” (slug `untitled-post-copy`). Only that copy
  received a Table cell marker and caption link. The three original Untitled
  posts remain present. The original first post was restored as the active
  document, with no caption and four blank Table cells. The named copy remains
  available for bounded continuation; nothing was published or permanently deleted.
- Shared Link Apply created only the caption anchor. Direct activation opened
  Link options, Escape dismissed it, and Preview retained the exact caption
  and destination. Full reload followed by selecting the named copy retained
  the saved caption, destination and direct Link options behaviour. The Code
  editor retained a caption anchor with the exact text and destination. This
  verifies Code serialisation, not a downloaded export. The Code editor was exited without applying an HTML mutation.
- Browser evidence: `/private/tmp/acm-caption-persistence-browser.json` and
  `/private/tmp/acm-caption-persistence-browser.jpg`. Independent read-only
  review accepted the bounded result and inspected the screenshot; the reload,
  Preview and Code sequence relies on the Builder's recorded native replay,
  rather than an independent replay. Template mounted persistence, downloaded
  export and the wider control/context matrix remain open. Inventory outcomes
  stay Partial; this is not whole-editor acceptance.
- The two motion/navigation test-hardening changes separately pass 5/5 in
  `/private/tmp/acm-parity-motion-hardening-focused.log` and were independently
  accepted. No full-suite rerun was added for this browser check.

## Selected-block menu actions — 5 October 2026

- Fixed Duplicate, Add before/after and Paste styles using the normalised block
  selection. Duplicate inserts the complete batch after its last selected
  sibling, selects the copies and remaps shared note identities once. Add
  before/after uses the outer selection edges. Paste styles applies all
  destinations through one validated document/history proposal, preserving
  content and unique anchors. Missing/stale targets, lost ownership, changed
  documents, invalid structures and protected locks refuse the proposal.
- The visible selected-block toolbar now exposes the existing shared Block
  Options menu. Copy, Cut, Duplicate, Add before/after, Copy/Paste styles and
  Delete are available there; individual-block actions keep their existing
  toolbar. Duplicate and insertion require the same actual sibling container,
  including List Item child ownership. Cross-container ranges display a refusal
  reason. Group was initially excluded from this range menu; the subsequent
  mixed-selection Group repair below supersedes that exclusion.
- Real Main-editor actions on the named test copy duplicated the selected Table
  and Heading together, selected both copies, and reversed/restored both with
  one Undo/Redo step. Forward Add before inserted before the Table; reverse Add
  after inserted after the Heading. Copying Heading Large styles and pasting
  into two separately selected paragraphs changed both from 16px to 20px;
  Undo restored both to 16px and Redo restored both to 20px. The paragraph
  content was retained. Temporary insertions, duplicates and paragraph styles
  were undone. Heading Large remains in the test copy only.
- Toolbar/menu pointer capture preserves the range. Escape closes the range
  menu and returns focus to its visible trigger without clearing the range;
  clicking that trigger again also closes it. Portalled menu anchoring was
  checked against the visible trigger. Screenshot:
  `/private/tmp/acm-block-menu-selection-browser.png`.
- Related regressions pass 120/120; the final focused file adds Escape and
  trigger-binding coverage and passes 12/12. Production build passes. New
  helper/test lint is checked separately; the Canvas preimage and current
  versions retain the same seven existing errors and two warnings. These are
  bounded results, not whole-repository lint or full parity acceptance.
- Explorer used pinned Gutenberg `store/actions.js` and `block-actions/index.jsx`;
  the sole Builder implemented the change and a separate read-only Verifier
  reviewed it, including the follow-up anchor and Escape fixes. Native actions
  are Builder replay evidence. Nested owners, note cloning, invalid insertion
  and stale writer/document refusal have focused production-function coverage;
  their complete native context matrix remains unverified. The existing broad
  implementation cohort remains uncommitted pending a coherent source review.


## Mixed-selection Group action — 5 October 2026

- Compared the pinned Gutenberg v24.1.0-rc.1 implementation at commit
  `e3ac73cd69d472341b66c43cb77be36e838f868e`, including the convert-to-group
  control and `group-blocks.js`. A mixed selection wraps its complete canonical
  sibling selection in a new Group and retains any existing Group intact.
  Studio previously could ungroup only its representative Group.
- The shared range Block Options menu now offers Group. Ungroup remains the
  single-Group action. Invalid sibling ownership, restricted containers,
  removal/movement locks and template placeholders refuse the action. The
  operation uses one validated document/history proposal and selects the new
  wrapper. Focus returns to that wrapper, including nested wrappers given a
  programmatic-only tabindex, rather than the removed menu trigger or a child.
- Native Main-editor replay in the named test copy grouped Paragraph/Table,
  then grouped that existing Group with the Heading. The new outer Group
  retained the inner Group and all original child IDs; Undo restored the inner
  Group plus Heading and Redo restored the exact outer wrapper ID. Nested
  Paragraph/Table grouping retained the caption and selected/focused its new
  nested wrapper; Undo/Redo removed/restored that exact wrapper. Temporary
  grouping was undone, and the original first post was restored as active.
  Screenshot: `/private/tmp/acm-group-menu-browser.png`.
- Final focused pointer/menu regressions pass 28/28; final related selection
  checks pass 62/62. The final production build completes. New helper/test
  lint passes; existing whole-Canvas lint limitations remain unchanged.
  Evidence: `/private/tmp/acm-group-menu-final-focused.log`,
  `/private/tmp/acm-group-menu-final-related.log` and
  `/private/tmp/acm-group-menu-final-build.log`.
- Explorer comparison, sole-Builder implementation and independent read-only
  source/screenshot review are complete. Native focus/history evidence is the
  Builder's replay. Full Template/Mini Golf, persistence/export, responsive and
  keyboard context acceptance remains open. The shared source cohort remains
  part of the wider integrated editor changes; this is bounded Group acceptance.


## Focus Outline source commit — 5 October 2026

- Recorded the independently reviewed 16-file Focus Outline source cohort as
  local commit `a618c7f023f52c5eb462b0c5b07c5df644b1f1a8`. It includes the shared
  route provider/context, policy, ownership-guarded preference repository,
  editor/Library settings, focused tests and only matching documentation/CSS.
  Unrelated integrated editor changes and duplicate files remain unstaged.
- Removed the policy test's dependency on uncommitted selection CSS; its
  selection-specific assertions remain with the selection test cohort.
  Exported exact index files into a temporary focused test fixture, with
  unchanged ownership source and existing dependencies: 13/13 checks pass.
  Immutable commit exports match that candidate and independently rerun 13/13.
  Evidence: `/private/tmp/acm-focus-outline-index-fixture.log` and
  `/private/tmp/acm-focus-outline-immutable-commit.log`. Scoped lint and cached
  diff checks pass; a separate read-only Verifier accepts the source boundary.
- Existing accepted native Focus evidence is retained above. The current dirty
  editor production build passes, but no isolated fresh-checkout application
  build is claimed for this commit. No push, promotion or deployment occurred.
  The broader integrated editor source cohort and remaining parity matrix stay
  open; the goal remains active.

## Highlight and unchanged source Apply — 5 October 2026

- Independent source review found stale Highlight owner/document/run captures and
  a valid unchanged HTML/Code draft that stayed open. Highlight now shares the
  existing rich-field freshness guard, including block and run snapshots. Own
  accepted changes refresh that capture; pending-only caret colours retain the
  authored block snapshot. Content-changing caret edits reseed their pending
  marks after the child editor updates its runs. Closing or changing owner
  cancels that guarded hand-off.
- Untouched HTML and Code drafts retain their original typed records instead of
  parsing in default properties. Apply closes successfully without a content
  transaction; changed drafts still use parser, structure, locks, notes and
  freshness validation. Lost ownership or a changed source keeps the form open.
- Native Main replay in the named local test copy confirms successive Text and
  Background colours at an existing-format caret, two Undo operations restoring
  the original mark, pending-only colours on a plain Paragraph, and both colours
  on newly typed text. That text insertion was undone. Selecting another block
  dismisses Highlight. Untouched HTML then Code Apply both close while retaining
  the existing Redo branch. The original first post was restored as active.
  Screenshot: `/private/tmp/acm-highlight-final-browser.png`.
- An open HTML form captures its document, block snapshot and initial draft.
  Apply refuses a changed same-ID block even after both document refs rerender.
  Native Main replay typed a temporary character, opened HTML, then used Undo
  while the form stayed open: Apply showed conflict feedback and retained the
  newer text. Cancel closed the form; the original first post was restored.
- A shared minimal HTML DOM fixture now serves existing block-preview and new
  production-function Apply regressions. It is bounded parser evidence; native
  browser replay establishes the history and focus boundary. Focused affected
  tests pass 152/152, scoped test lint and `git diff --check` pass, and final
  production build/typecheck complete. Logs: `/private/tmp/acm-review-handback-
  focused.log`, `/private/tmp/acm-review-handback-build.log` and
  `/private/tmp/acm-review-handback-typecheck.log`.
- The broad suite immediately before these hand-backs passed 1,553/1,556. Its
  three failures retain deferred Design neutral/guide colour and Block Library
  icon-colour expectations; no assertion was waived. That run does not cover the
  final hand-backs; the affected 152-test run and final build/typecheck do.
- Independent contract review found an inherited Template defect: Group tag,
  accessible label and outer alignment are discarded by the projection; Columns
  outer alignment is rejected. Those exposed controls require a cohesive model,
  validation, projection and Edit/Preview repair. It remains the next functional
  change. Wider matrix, owner persistence/export and responsive acceptance remain
  open; this is not whole-editor parity certification.

## Shared icon dependency source commit — 5 October 2026

- The additionally authorised `acm-icons` project now records the reviewed
  catalogue cohort in local commit `dda5977a978bd0766af64a2daa4e5a74054865dd`,
  private development v0.21.1. The 175-file commit contains 36 new symbols, the
  three requested horizontal-alignment fill refinements, their masters and
  generated optical assets, converter/provenance, metadata and focused coverage.
  All 276 existing addition timestamps remain unchanged; the 36 new entries
  match the introducing commit's author and committer instant.
- Build, deterministic distribution check, 28/28 tests and diff checks pass. A
  restored temporary fonttools v4.60.1 environment also verifies all six licensed
  Inter heading masters against their generator. Logs:
  `/private/tmp/acm-icons-final-tests.log` and
  `/private/tmp/acm-heading-generator-check.log`. Independent read-only review
  accepts the bounded source cohort. Earlier accepted rendered optical-scale
  evidence is retained: this hand-back changes counts, dates and new keywords,
  not geometry. No package publication or remote operation occurred.

## Integrated editor source checkpoint — 5 October 2026

The integrated local source checkpoint captures the task-owned editor cohort,
its typed contracts, owning adapters, shared controls/menus, Library specimens,
regressions and compatibility/inventory evidence. It depends on the committed
ACM Icons revision recorded above. Five unrelated duplicate `* 2.*` files and
`tsconfig.tsbuildinfo` are excluded and preserved.

Independent read-only reviews accept the sampled command/selection/overlay and
content/persistence/rendering contracts. The final Highlight/HTML hand-backs
pass 152 affected checks, build/typecheck, scoped test lint and diff checks. The
latest broad suite retains three deliberately deferred visual failures; whole
Canvas lint retains six errors and two warnings (unused helper, pre-existing
effect/state patterns, programmatic wrapper tabindex and image rules). The
latest narrow menu/formatting replay passes 45/45 after the final hook dependency
cleanup; logs are `/private/tmp/acm-integrated-final-format-menu.log` and
`/private/tmp/acm-integrated-canvas-lint.log`. These limits are retained,
not waived or presented as green whole-project checks.

This checkpoint is incomplete against the whole goal: the inherited Template
Group semantic/alignment and Columns alignment defect remains a functional
repair, and the explicit unverified matrix/native/persistence/export/responsive
rows still require acceptance. No whole-editor certification, push or deployment
is implied by this local source commit.

## Template layout preservation — 5 October 2026

Baseline: local integrated commit `507284e`. Explorer confirmed an inherited
loss of Group HTML element, ARIA label and outer alignment, Columns alignment
and Section visual styles. Main was the sole Builder; a separate read-only
Verifier reviewed the schema, projections and final rendering ownership.

- Template contracts now write v0.26.0 and retain readers through v0.25.0,
  including existing Math, inline Image and extended Language objects. Group
  semantics/alignment, Columns alignment and Section styles survive both
  projection directions, owned saves, packages and publication snapshots.
  Clearing fields removes overrides. Invalid tags, non-string labels, invalid
  alignment strings/types and unsafe styles are rejected without changing input.
- Validation reuses the canonical block validator while retaining Template's
  strict metadata boundary. Existing template media collection and ownership
  paths are reused; no workspace/publication version or ownership policy changes.
- Root, shared-part and Column child wrappers carry alignment. Standalone
  Template output expands Wide/Full relative to its surface padding. Canvas
  root sizing remains owned by the existing canvas contract.
- Focused affected checks pass 185/185; typecheck, production build, source/scoped
  test lint and diff checks pass. Logs: `/private/tmp/acm-template-layout-final-
  focused.log`, `acm-template-layout-final-typecheck.log`,
  `acm-template-layout-final-build.log` and `acm-template-layout-scoped-lint.log`.
  The touched inline-image test's three lint errors are also present at the
  immutable baseline; retained comparison: `acm-template-layout-baseline-inline-
  lint.log`. They are not reported as a green whole-project lint result.
- Native memory-only Template Header replay confirms `aside` and its ARIA label
  in Edit/Preview. Group root None/Wide/Full measured 992/1068.8/1145.6px in Edit
  and 992/1016/1040px within Preview's own surface. Columns Wide/Full rendered
  distinct widths; Undo/Redo changed Preview between 1016 and 1040px. A constrained
  Group's nested paragraph measured 320px (normal), 640px (Wide) in both modes
  and available width for Full (990px selected Edit frame, 992px Preview).
  Screenshot: `/private/tmp/acm-template-layout-browser.png`. The example was
  reset afterwards; existing user templates were not changed.
- Root Wide/Full is a confirmed visual discrepancy: Edit uses its 76.8px canvas
  gutter, Preview its 24px Template spacing. Normal widths match, but expanded
  widths differ as recorded above. Exact root Edit/Preview width parity remains
  deferred visual work under goal item 5; this repair accepts value preservation
  and distinct alignment choices, not identical root dimensions. Numerical
  measurements are Main's native public-DOM replay, not an independent replay.
- The latest root/shared-wrapper assertions pass 11/11 focused regressions in
  `/private/tmp/acm-template-layout-final-regressions.log`. Independent read-only
  review accepts the bounded source repair and reviews these check logs; it
  retains the width discrepancy and remaining mounted acceptance limitations.
- Section style rendering has static production-renderer acceptance. Mounted
  template owner reload, downloaded package/export re-import, Section native
  interaction and remaining responsive/input contexts are still unverified.
  This repair closes the confirmed field-loss defect; it does not certify the
  remaining block/control matrix or whole-goal Gutenberg parity.

## 5 October 2026 — Code appearance repair

- Baseline `345c53989f9b825314a77e6760fc5e0c3b18a905`, local branch
  `codex/panel-library`. Explorer identified two Code presentation defects;
  Main was sole Builder and `block_menu_verifier` independently reviewed the
  bounded diff and evidence. No publishing, model or persistence changes.
- Authored colour, gradient and image backgrounds now show through the Code
  editing shell, as they do through Preview. Default grey remains when the
  authored background is cleared. Code autosizing now runs after each render,
  so inspector and inherited typography changes can update height without a
  change to code text or width. The width observer still ignores height-only
  notifications, and cleanup cancels pending measurement frames.
- Before repair, native Code showed a grey editing shell over a red wrapper;
  line height 3 at 32px font size left a 147px input with 429px scroll height.
  After fresh reload, input height and scroll height both measured 429px at
  the same 649px width. Undo returned to 147px and Redo to 429px; shrinking
  line height to 1.5 measured 237px, matching Preview. Typography reset
  restored 16px / 25.6px and 147px height; Undo/Redo restored the custom and
  default sizes respectively. Background reset restored grey and cleared the
  gradient. Colour and Pale ocean gradient matched Edit/Preview.
- Focused production-effect, permission and preview checks pass 84/84:
  `/private/tmp/acm-code-appearance-focused.log`. Build, typecheck and new-test
  lint pass in the corresponding `acm-code-appearance-build.log`,
  `acm-code-appearance-typecheck.log` and `acm-code-appearance-lint.log` files.
  The initial new-fixture lint error was corrected and the check rerun.
  Whole-project lint and the full suite were not rerun for this bounded fix.
- Screenshot: `/private/tmp/acm-code-appearance-browser.png`. Native replay
  used the memory-only Code Library specimen, reset afterwards. Independent
  review accepted the bounded fix using source and supplied native evidence;
  it did not independently replay the browser.
- Three Code control records move to Partial: size, line height and background.
  Custom sizes, inherited/nested native contexts, managed background images
  and their sizing fields, persistence/export, responsive and other input
  modes remain unverified. This repair does not certify whole-Code or
  whole-editor parity. Inventory now records 353 Unverified and 16 Partial
  block-control rows; the accepted and excluded rows remain unchanged.

## 5 October 2026 — List appearance inheritance

- Baseline `a2b1772`, local branch `codex/panel-library`. Explorer compared the
  exact Gutenberg `e3ac73cd69d472341b66c43cb77be36e838f868e` List Item
  definition, edit/save implementations and List stylesheet. Gutenberg places
  item typography on `li`; marker inheritance follows from that structure.
  This is pinned source evidence, not a Gutenberg runtime comparison.
- Studio item rows now consume the existing `visualStyleClassName` in Edit
  and Studio Preview. Shared typography inheritance includes the actual
  List Item editor, and explicit line height reaches the marker. Unstyled
  defaults and public native `li` markup remain unchanged. No new controls,
  icons, stored fields, mutation, history or write-ownership paths were added.
- Before repair, a selected 32px red item retained a 16px ink-coloured marker;
  nested unstyled items also stayed at the default. After repair, item text
  and ordered marker both measured 32px red with 64px line height. Nested
  unstyled bullets/text inherited those values; a nested custom 20px blue
  override measured 40px line height. Unrelated root siblings remained 16px
  ink with 24.8px line height. All five rows matched in Edit and Preview.
- Item Typography Reset all removed only the parent item overrides: the nested
  20px blue override survived, while unstyled descendants returned to defaults.
  Undo restored parent inheritance and Redo restored the reset state. Parent
  List colour/preset-size/line-height settings then applied identically to all
  nested marker/text rows. Decimal, upper/lowercase letter and Roman marker
  formats retained the expected numbering from Start 3.
- Preview typography also matched at 768px and 390px viewport overrides;
  the override was cleared afterwards. Actual browser 200% zoom, public native
  marker rendering, persistent reload/export and remaining input/units are
  unverified. These are bounded appearance checks, not whole-List acceptance.
- Focused checks pass 97/97 in `/private/tmp/acm-list-appearance-focused.log`.
  Build/typecheck pass in `acm-list-appearance-build.log` and
  `acm-list-appearance-typecheck.log`. New-test/renderer lint has zero errors
  and two pre-existing image warnings in `acm-list-appearance-lint.log`.
  Canvas lint retains baseline errors; comparison logs are
  `acm-list-appearance-canvas-lint.log` and
  `acm-list-appearance-canvas-baseline-lint.log`. The full suite was not rerun.
- Native replay used the memory-only List Library fixture. Screenshot:
  `/private/tmp/acm-list-appearance-browser.png`. Reset Example restored the
  default marker typography and cleared specimen history before closing the
  temporary tab. Independent Verifier reviewed
  the diff, tests and supplied native evidence; its browser provider returned
  no available browsers, so independent native replay was unavailable.
- Six rows move to Partial: List and List Item colour, size and line height.
  The inventory now has 347 Unverified and 22 Partial block-control records.

## 5 October 2026 — Quote citation appearance and evidence reconciliation

- Baseline `098b1a8`. Main Explorer reproduced the citation defect in the
  memory-only Library fixture: XXL/red styled the quotation at 32px but its
  citation stayed 13px/muted. Edit used italic citation text while Preview did
  not. The fixed defaults in `studio.css` masked authored parent typography.
- The pinned Gutenberg Quote `style.scss` at
  `e3ac73cd69d472341b66c43cb77be36e838f868e` was read through its GitHub page.
  Its explicit citation size belongs to the legacy large variation; default
  citation styling does not fix colour/size there. This is source comparison,
  not a live Gutenberg theme replay. Other requested source fetches failed.
- Sole Builder adds a shared citation target to the existing typography rules
  and aligns Studio's default citation rule across Edit/Preview. Existing
  public citation defaults remain; authored typography can now inherit through
  the public citation target as well. No model, history, command, storage,
  icon or write-ownership changes were required.
- Native Default and Plain Quote checks show citation/body matching 32px red,
  Medium 500 normal, line height 64px and letter spacing 1px. An inner Paragraph
  set through its own Large/Accent controls stays blue 20px/40px while the
  citation stays red 32px/64px. Unrelated legacy Quote/citation defaults remain.
- Reset Colour restores muted citation colour while retaining 32px size;
  Undo restores red. Reset Size restores 13px while retaining red and the
  authored line height; Undo restores 32px. Reset all restores 13px muted italic
  citation at 19.5px line height, preserving the nested Paragraph override;
  Undo/Redo restores/reapplies the parent reset in one step. Edit/Preview reset
  defaults match. Rich bold/link citations and legacy/empty content have focused
  production-renderer coverage, not new native formatting acceptance.
- Focused regression/preview/pane checks pass 94/94 in
  `/private/tmp/acm-quote-appearance-focused.log`. Build/typecheck pass in
  `acm-quote-appearance-build.log` and `acm-quote-appearance-typecheck.log`.
  New-test/preview/renderer lint reports no errors and two existing image
  warnings in `acm-quote-appearance-lint.log`. Full suite remains deferred.
- Responsive overrides were requested at 1152px/768px/390px, but observed
  `innerWidth` remained 1280. Overrides were cleared. Responsive and actual
  200% zoom evidence therefore remain unverified, along with mounted other
  owners, persistent reload/export and public rendered typography. Screenshot:
  `/private/tmp/acm-quote-appearance-browser.png`.
- Reset Example restored both default citations and disabled specimen Undo/Redo
  before closing the temporary tabs. Product documents and preferences were
  untouched.
- Read-only Explorer reconciled existing menu/clipboard evidence against the
  inventory: Copy, Cut, Duplicate, Add before/after, Copy/Paste styles and
  Typography/Background Reset all move to Partial with exact bounded limits.
  List marker/start rows gain Partial presentation evidence only; Reverse
  interaction remains open. Their command owners are unchanged since `507284e`,
  so accepted native sequences were retained without replay. Heading Size
  retains Unverified inspector status despite cross-command styles evidence.
- New Quote and nested Paragraph appearance evidence moves eight more block
  controls to Partial. Block-control totals are 337 Unverified and 32 Partial;
  all 426 identities and the wider 977-record inventory remain intact. Atomic
  Quote individual Colour/Size resets gain Partial evidence only for this owner.
- Independent Verifier accepted the final source, tests, screenshot and bounded
  inventory outcomes. Its browser provider had no available browsers, so native
  evidence is Builder replay with independent source/screenshot review.

## 5 October 2026 — Image wrapper styling and Field controls

- Baseline `c9cda79`. Read-only Explorer identified Image Additional CSS being
  ignored in Edit. Main reproduced it in the memory-only Library: safe red
  outline, 12px padding and pale-red background appeared in Preview but not
  Edit. The saved declarations remained intact.
- Sole Builder centralises Image wrapper styling alongside `imageDisplayStyle`.
  Both renderers use the existing bounded Additional CSS parser and the same
  five-property frame exclusion. Border, radius and shadow belong to the image;
  wrapper spacing and safe CSS use the wrapper. No model, storage, history, icon
  or write-ownership changes. Preview behaviour is retained.
- Native Library Edit/Preview now match for the three declarations. The sample
  image retains its own 2px Solid border and Soft shadow, with no duplicate
  wrapper frame; caption, dimensions, anchor and class remain. Clearing the CSS
  removes only its wrapper declarations; Undo restores and Redo clears them.
  Screenshot: `/private/tmp/acm-image-wrapper-browser.png`.
- Four new focused tests cover actual production Edit and both Preview
  renderers, unchanged content, frame ownership, clearing and the existing
  rejection of unsafe CSS. Initial test assertions used incorrect fixture
  field names and assumed partial unsafe-list acceptance; they were corrected
  to the existing contract before the final pass.
- Focused Image/preview/Featured Image checks pass 92/92 in
  `/private/tmp/acm-image-wrapper-focused.log`. Build/typecheck pass in
  `acm-image-wrapper-build.log` and `acm-image-wrapper-typecheck.log`. Scoped
  lint has zero errors and two existing image warnings in
  `acm-image-wrapper-lint.log`. Canvas lint retains the baseline's six errors
  and two warnings, with matching diagnostic messages in
  `acm-image-wrapper-canvas-lint.log` and
  `acm-image-wrapper-canvas-baseline-lint.log`. Full suite remains deferred
  until near the end.
- Field requires no source correction in this pass. Actual Library label,
  options and value changes reach Edit/Preview; canvas Select and Text changes
  update the pane. Values outside options retain a synthetic option. Text/Select
  switching preserves the edited value/options. Visible Undo/Redo restores
  both canvas value paths; Preview Select is disabled and Text is read-only.
  Screenshot: `/private/tmp/acm-field-controls-browser.png`.
- Image Advanced and four Field rows gain Partial evidence only. Block-control
  totals are 332 Unverified and 37 Partial; all 426 identities and the wider
  977-record inventory remain intact. Title editing, remaining Image CSS,
  persistent reload/export, other editor owners, keyboard history, responsive
  presentation and actual 200% zoom remain unverified. No whole-block
  acceptance or completion of the broader goal is claimed.
- Reset Example restored the original Image and Field fixtures and disabled
  their Undo/Redo controls before closing both temporary tabs. Product data
  and Focus Outline preferences were untouched.
- Independent read-only Verifier accepted the source, focused checks,
  screenshots and bounded documentation with no blocker. Native evidence is
  Builder replay with independent source/screenshot review; this does not
  close the remaining owner, persistence, responsive or 200% acceptance gaps.

## 5 October 2026 — Shared Footnotes numbering and pane acceptance

- Baseline `66b231b`. Main Explorer reproduced a Library defect: the real
  reference showed a dagger and its note was labelled Unreferenced in Edit,
  while Preview correctly numbered both as 1. The standalone specimen omitted
  the main canvas's private numbering context. The read-only Explorer service
  encountered model capacity; main completed the investigation and remained
  the sole Builder, with a separate read-only Verifier.
- Extracted the existing memoised document numbering provider and its consumer
  hook into `app/studio/footnote-numbers-context.tsx`. Main Canvas keeps the
  same complete-document input. Library specimens now supply their complete
  temporary document too. Rich text, captions and notes share the same context;
  no reference migration, command, model, storage or write-ownership changes.
- Native Library Edit/Preview now show reference 1 and Footnote 1. Direct note
  editing reaches Preview; visible Undo restores original text and Redo
  restores the edit. Notes remain attached to the original ID.
- Native palette colour/XXL/Medium italic/line-height 2 give red 32px, weight
  500 italic and 64px line height in both modes. Subtle background colour and
  the Pale ocean gradient at 45 degrees reach the wrapper. Padding 12px,
  vertical margin 8px, 2px Solid Accent border, radius 10px and Soft shadow
  match across modes. Anchor, class and safe Additional CSS match too. Normal
  Link green applies to the Preview backlink; Hover blue reaches its variable,
  but actual pointer hover was not checked.
- Typography Reset all, Undo and Redo preserve edited note text and restore
  or remove the four authored typography fields. Native Space opens the border
  style disclosure and selecting Solid works. Pointer click did not open it
  through the browser tool; pointer activation remains unverified rather than
  being treated as a confirmed source defect.
- Two lower-priority visual differences are explicitly deferred: default note
  text is 16px/24px in Edit versus 14.4px/21.6px in Preview; Edit's list marker
  aligns near the textarea bottom. Screenshot:
  `/private/tmp/acm-footnote-context-browser.png`.
- Four regression tests cover the actual provider/BlockField, reading order,
  hidden references, orphan preservation, read-only markup, independent
  document scopes and caller wiring. The initial full catalogue import met a
  cycle in the focused loader; the Library caller test uses source wiring
  evidence, with mounted behaviour checked separately by the Builder in the
  browser.
- Focused Footnotes/pipeline/Library checks pass 105/105 in
  `/private/tmp/acm-footnote-context-focused.log`; build/typecheck pass in
  `acm-footnote-context-build.log` and `acm-footnote-context-typecheck.log`.
  The independent review found an unused import left by extraction; the same
  Builder removed it before final lint/review. Full suite remains deferred.
- Thirteen Footnotes rows gain Partial evidence. Block-control totals are
  319 Unverified and 50 Partial; all 426 identities and the wider 977-record
  inventory remain intact. Other values/units, individual resets, frame and
  spacing history, actual hover, persistence/export, other owners, responsive
  presentation and actual 200% zoom remain open. No whole-block acceptance is
  claimed.
- Reset Example restores the original numbered note and disables Undo/Redo;
  the temporary tab was closed. Product documents and preferences were untouched.
