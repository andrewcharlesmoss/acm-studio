# Changelog

## Unreleased

### Added

- Added Canva-style magenta snapping guides, with solid page guides and dotted object guides.
- Added corner handles for direct page resizing in the design canvas.

- Added a local design canvas at `/studio/designs` with versioned editable
  designs, named pages, page duplication and reordering, image input from files
  and Studio media, a horizontal annotation toolbar, marquee and multi-object
  selection, resize and rotation handles, crop controls, layers, grouping,
  alignment and snapping guides, undo/redo, local writer ownership,
  editable JSON backups, validated image imports, scaled PNG, JPEG or WebP
  export for the current, selected or all pages, and rendered-media handoff
  into the Content Studio document or cover image. Annotation tools use a
  horizontal canvas toolbar, and the Pages pane can be collapsed and restored.

- Design images support local edge-connected background removal with an
  adjustable colour tolerance. The original asset is retained and the
  transparent PNG derivative remains editable in the design.

- A Parent folder card keeps navigation to the containing directory visible in folder contents.
- Files and folders can be dragged into folders, with a Move to parent folder action, keyboard destination controls and protection against circular folder moves.

- Files and folders have accessible context actions for renaming and deleting; folders also have larger icons and a colour submenu with saved choices.

- The block library opens beside the desktop canvas with scrollable block groups, and as a dismissible drawer on narrow screens.
- Shared editor toolbar groups Add block, Undo, Redo and List View; List View docks beside the desktop canvas and opens as a dismissible drawer on narrow screens.

- Mini Golf table headings, hole labels and empty-total placeholders can be authored in Edit while score inputs and calculations remain live.

- Mini Golf draft exports include a versioned, lossless page definition with source identities, explicit template/default descriptors and three-way conflict detection.

- Mini Golf Preview is playable using the source gameplay, score-table interactions and CSV, HTML and PNG exporters, with separate local session state.

- Mini Golf's complete page is now an editable block tree, including the hero,
  account labels, scorecard controls, leaderboard metrics and footer links.
  List View supports nested ordering and deletion; version 7 upgrades preserve
  existing drafts and keep later deletions intact.

- Added a document code-editor “Wrap text” toggle. Wrapping is enabled by
  default for readable long markup and can be disabled to inspect horizontal
  line layout without changing the underlying HTML.

- Added syntax highlighting and a “Format code” action to the document code
  editor. Highlighting is visual only; the raw HTML remains the editable and
  validated value.

- Added a Gutenberg-style **Edit as HTML** option to every block's hover
  options menu. Supported semantic markup can be reviewed and applied back to
  the typed block without executing arbitrary HTML or component code.

- Shared `StudioEditor` module now powers both the main Studio workspace and
  the Mini Golf page editor. A source-aligned Mini Golf presentation adapter
  (revision `0d2df8bd31f277df31522aa47ca6bf785888c460`) renders the branded page
  through a validated nested section tree, with a versioned migration from
  earlier component and section drafts.

- Site Settings for both Mini Golf sites, with a signed-in local Sites
  connection and reviewed edits to names, URLs, basic sharing, domains and
  variables. Existing values remain hidden and deployment stays separate.

- Separate Mini Golf staging and production entries, with isolated local page
  drafts and direct access from the backstage sidebar.
- Local-only Mini Golf Codex task-history browser with a light, Codex-style
  task sidebar, conversation and composer. Coding submission remains disabled
  pending execution-safety verification; dark mode is not implemented yet.

- Mini Golf Scorecard site pilot in the control centre, with a separate local
  home-page draft, editable headings and tagline, section ordering, page width,
  preview and JSON export. The preview uses the source-aligned page adapter;
  game controls are inactive and page-only canvases omit post metadata.
- Mini Golf page documents now expose account, setup, scorecard, leaderboard and
  sharing sections as nested blocks, with source-revision provenance and a
  shared editable Table block for the scorecard. Legacy embedded table data is
  migrated without overwriting unreadable drafts.
- Read-only Files & Code browser for the Mini Golf source snapshot, including
  searchable folders, configuration, tests and image previews.

- Reading time now updates from body content in Edit, Preview and article views,
  using 220 words per minute, rounded up to a minimum of one minute.

- Added Gutenberg-style selected-link controls, including editable link text,
  destination and an Advanced “Open in new tab” setting.
- Added Gutenberg-aligned paragraph inspector controls for typography, colour,
  dimensions, borders and advanced anchor/class attributes.
- Added Gutenberg-style status and publish-date controls to the Post and Page
  inspectors; the selected date is used when a post is published locally.

### Changed

- Rotation cursors now face the object and turn with it. Resizing follows the
  object's rotated axes and keeps the opposite corner anchored.
- The rotation button uses taller, finer curved SVG arrows to match the
  requested Canva reference.
- Rotation readouts now use signed angles, so counter-clockwise turns display
  negative values like Canva.
- The rotation cursor is slightly smaller and the live angle badge sits farther
  from it for clearer separation.
- The live angle badge now has additional clearance from the rotation pointer.
- Removed the instructional footer below the design canvas to keep the workspace
  focused on the artwork.
- Page resize handles now share the exact same size token as object resize
  handles.

- Replaced the browser resize cursor during canvas rotation with a Canva-style curved two-way SVG cursor.

- Kept the all-pages workspace background continuous while its page stack
  scrolls.

- Stabilised all-pages headings so selecting a page does not shift the page
  stack, and reduced the canvas help footer height.

- Aligned all-pages headings with their corresponding canvases in the
  scrollable view.

- Clarified the all-pages scrolling control with explicit View all pages and
  View single page labels.
- Added Pages and Layers tabs to the left design pane, with layers rendered only
  when the Layers tab is active.
- Use a four-way move cursor while pressing and dragging a selected canvas
  object.
- Matched corner and arrow endpoint resize handles to Canva’s smaller screen
  size while retaining zoom-independent rendering.

- Kept design undo and redo shortcuts active after focusing page and layer
  buttons while preserving native editing behaviour in fields.

- Made the rotation glyph white when its purple control is hovered.

- Made the rotation angle badge follow the pointer during rotation while
  keeping it read-only and using a normal cursor over the badge.

- Kept page thumbnails at their content height when selecting a page.

- Refined the rotation glyph to use two opposing curved arrows matching the
  Canva-style reference interaction.

- Rounded the angle badge and refined rotation feedback with a purple hover
  state, a two-way rotation cursor and a hidden handle while rotating.

- Removed the rotation-handle connector, enlarged its fixed-size circular
  control and replaced the glyph with a clearer two-arrow SVG.

- Moved the active page's Layers list into the left Pages pane and added an
  All pages view that stacks every page in a scrollable canvas while keeping
  the active page editable.
- Removed the purple selection outline so selected objects use their white
  resize handles, and made Shift temporarily allow images to stretch freely
  while resizing.
- Replaced the rotation handle's overlaid history icons with a dedicated
  compact SVG rotate glyph.
- Kept canvas resize, endpoint and rotation controls at a consistent screen
  size while changing zoom.
- Made selected arrows expose only their two endpoint controls, replacing the
  generic corner-resize and rotation controls.
- Made the rotation-angle badge taller, narrower and more legible.
- Made resize cursors follow the selected object's rotation angle.

- Added Command+0 on macOS and Ctrl+0 on Windows/Linux to reset the design
  canvas zoom to 100%, alongside the existing zoom controls and increment
  shortcuts.

- Improved document code formatting so inline spacing and preformatted whitespace
  remain readable and semantically intact. Code Apply now detects intervening
  block edits and asks for the editor to be reopened instead of overwriting them.

- Made Mini Golf staging the explicitly labelled primary working draft in the
  site registry and editor. Production remains a separate reference until a
  reviewed synchronisation step is introduced.

- Added published subtitle rendering and a non-functional publication-details
  preview to Edit, matching the live page's reading-time and author context.
- Reworked article detail pages around the title, reading-time badge, author row
  and cover-led layout, with a single-column reading flow closer to the existing
  Andrew Moss post presentation.
- Matched the shared Edit and Preview content column to WordPress's measured
  771px desktop editor width.
- Aligned the first block's position after a cover image between Edit and
  Preview while retaining the between-block inserter.
- Made the Studio document-type label follow the active content, showing
  “Page” for pages and “Post” for posts.
- Renamed the Studio document inspector tab to “Post” to match Gutenberg's
  editor terminology.
- Standardised Studio interaction controls on source-faithful Gutenberg SVGs
  and added a Gutenberg-style Transform menu for compatible blocks.
- Consolidated text alignment into one toolbar menu and added a Copy link action
  to selected-link controls.
- Moved Edit/Preview switching into a centred, clearly selected control in
  the counts bar, with a compact two-row layout on narrow screens.
- Made table resize guides follow the pointer, and added double-click fitting
  for column text widths and wrapped row content, with keyboard equivalents.
- Added persistent, keyboard-accessible table column and row resizing in Studio,
  with the same dimensions applied to previews and rendered content.
- Established Gutenberg's 13px system UI baseline across Studio, Files, Backup,
  inspectors and controls.
- Matched the table-action dropdown to Gutenberg's SVG icons, compact sizing,
  typography and border treatment.
- Clarified ACM Studio as the editorial management and publishing control plane.
- Separated ACM Studio ownership from the Andrew Moss public presentation layer.
- Documented the future publishing-contract boundary.

### Fixed

- Restoring Undo/Redo selections in shortened, formatted text no longer crashes the editor.

- Undo and Redo keyboard shortcuts now work across the main and Mini Golf editors, including Ctrl+Y on Windows and Linux.

- Aligned Mini Golf staging typography, account copy and responsive score-table
  controls with the hosted reference. Table-size blocks now change typography,
  New Game styling survives changed IDs, and Code roundtrips retain paragraph
  alignment and table dimensions.

- Restored missing score tables in transitional Mini Golf page drafts and matched
  the editor and standalone preview to the source page's markup, typography,
  spacing and player-column controls. Table edits retain arbitrary player
  columns, and deleted blocks remain deleted in current drafts.


- Replaced the editor byline's fixed sample date with the selected publication
  date, showing “Not yet published” for undated drafts.

- Preserved unreadable saved publications when publishing or unpublishing, with
  recovery guidance instead of replacing invalid data with an empty store.

- Prevented stale Studio tabs from overwriting newer drafts, publications or
  media by allowing one editing tab and reloading current data on takeover.
  Files resets its folder context before editing resumes; read-only file
  controls remain disabled and failed edits restore their saved metadata.
- Paused editing during backup restore, including outstanding media writes,
  and retained the pause when the original data could not be fully recovered.
- Reported media saves only after IndexedDB transactions commit, with errors
  and aborted operations releasing their database connections.

- Kept Studio Preview focused on published content by omitting the editor's
  post/page status, excerpt metadata and divider rules while retaining them in
  Edit.
- Matched public article shells and block rendering to Studio Preview's 771px
  content canvas.
- Made browser-local published posts retain and display their Studio cover
  image, including the default generated cover treatment.
- Restored selected cover media for older browser-local publications that were
  saved before cover metadata was included in publication snapshots.
- Reduced public article title sizing and refined the hero cover treatment to
  better match the existing Andrew Moss post layout.
- Preserved unreadable saved work instead of replacing it with starter content,
  and made the unsaved state explicit until a valid backup is restored.
- Validated workspace, content, publication and media records before backup
  restoration, with a 100 MB browser backup limit checked before export reads
  media. Failed recovery now attempts every original store and reports any
  incomplete rollback.
- Corrected link and block-transform types so the editor passes type-checking.

- Tightened the shared keyboard focus border so it remains within fields and
  does not overlap nearby labels or controls.
- Aligned title and subtitle positioning between Edit and Preview and removed
  the page/post status label from preview content.
- Removed the empty subtitle slot from Preview so the cover and following
  blocks move up when no subtitle is present.
- Removed the editor-only title label space from Preview so titles start
  higher and use the available document space.
- Aligned Edit and Preview block typography, spacing, code, quotes, lists,
  images and buttons through shared presentation rules, including button text
  colours and responsive text wrapping.
- Kept preview and rendered table cells at their editor dimensions, with
  scrollable overflow instead of rows expanding to fit their contents.
- Kept table selection blue only around the outside, with neutral internal
  grid lines and multiline editing fields that fill resized cells.
- Matched table corner rounding to other blocks and aligned its selection
  outline with the table's single outer border.
- Stabilised auto-height measurements so the editor no longer observes the
  element it is resizing, preventing the browser's ResizeObserver loop error.
