# Changelog

## Unreleased

### Added
- Add Site identity to the UI Library using the production controls, inheritance, Hide, Reset, image choices and isolated Undo/Redo.
- Extend temporary Site Editor identity inheritance, Hide and Reset to Logo and Site Icon.
- Inherit unset Site Editor titles and taglines from Global Defaults, with explicit Hide and Reset to restore inheritance.
- Correct all twelve Site Editor block Styles panes to the current WordPress configuration, with separate editor and Styles compositions, variation defaults, theme typography, filters, shadows, Advanced CSS and a working Library specimen.
- Add Default, Tablet, and Mobile States to Site Editor block styles, with device inheritance, scoped Reset, and matching preview widths.
- Add temporary Site Editor Blocks styling for existing Style Book families, using shared controls and canonical rendering with scoped inheritance, Reset, and Undo/Redo.
- Add temporary Site Editor Shadows presets with multi-layer editing and a dedicated specimen, plus Layout width, padding, and block-spacing previews with inherited scope history and reset.
- Add temporary Site Editor Background image, colour, and gradient controls with scoped inheritance, reset, Undo/Redo, and live website and Style Book previews.
- Demonstrate the shared Custom palette editor in the UI Library with temporary colours, working actions and Reset.
- Add the inline gradient editor alongside the popup example in the Studio UI Library, sharing temporary values and Reset.
- Add temporary Site Editor Colours with editable theme and custom palettes, custom gradients, element foreground/background and link hover colours, inherited scope history, and live webpage/Style Book updates.
- Add temporary Additional CSS with scoped live sample previews, site inheritance, reset, and Styles history.
- Add reference Pullquote and Search specimens to the Site Editor Style Book, with centred pill buttons and a matching separator.
- Add the reference two-column paragraph sample to Site Editor Typography and its Style Book overview, inheriting Text styles and stacking in narrow previews.
- Reorder Studio Navigation tools with dedicated drag handles or Alt+Up/Down, retaining the preferred order across content and template workspaces.
- Add a Preview frame specimen to Controls, sharing the reusable animated handle, resizing behaviour and rounded frame with Site Editor and Style Book.
- Add a matching Home comparison sample to the Site Editor webpage preview, covering heading levels, rich text, lists, quotation, image, buttons, table, separator, and code.
- Resize the Site Editor webpage and Style Book previews from a centred edge handle, with keyboard controls and live content reflow.
- Add temporary Site Editor Typography with shared Typesets, bundled font management, element and heading-level controls, editable fluid font-size presets, and scoped Undo/Redo.
- Add a temporary Browse Styles preview with Twenty Twenty-Five variations, colour palettes, typography pairings, global/site inheritance, and Undo/Redo.
- Make Reset Styles available from the actions menu, with current-scope reset and undoable history.
- Add a live, preview-only Style Book with palette, typography, image, and block specimens, navigation into existing Styles controls, and scoped history.
- Preview the Site Editor Styles menu with Browse Styles, Typography, Colours, Background, Shadows, Layout, and Blocks; settings remain unavailable in this first step.
- Give Global Defaults an independent generic Identity preview with logo/icon placeholders, without site inheritance or saved-site changes.
- Share the two-left-pane workspace layout, responsive behaviour, and gap-free collapse/reopen placement between Site Editor and a new Pane Library example (Pane contract v1.5.0).
- Add a separate, preview-only Site Editor with global Paragraph font size, independent Test and Test 2 overrides, reset to inheritance, and temporary Undo/Redo. Existing editing tools and saved sites remain unchanged.
- Replace Website Styles sample cards with a temporary production block editor preview, remove the sample profile selector, and show width and gutter changes in Edit and Preview without changing existing sites.
- Add an optional Hover Inspection toggle in Styles, off by default, to keep the written guide steady while browsing. Click and keyboard inspection remain available.

- Added a preview-only Website Styles → Layout area with shared profile and template inheritance, width and responsive gutter controls, live samples, and local Undo/Redo. Existing sites remain unchanged.


- Define an isolated shared website layout contract with explicit inheritance,
  value origins, responsive gutters, and legacy layout capture. Existing sites
  and saved-data formats retain their current appearance and behaviour.

- Expose 49 original shared website icons and directional variants in the Studio
  library, with three optical sizes, SVG/PNG downloads, and searchable existing
  equivalents for Share, arrows, and compact chevrons.

- Offer Rectangle, Ellipse, Triangle, and Hexagon choices in the temporary object
  manipulation and resize examples, with Undo/Redo for shape changes.

- Offer optional Fit to Part canvases for Header and Footer editing, remembering
  each choice separately and keeping Edit and Preview sizing consistent.

- Publish browser-local Pages with immutable snapshots, separate draft edits,
  local page addresses, and shared publication recovery, media, and previews.

### Changed
- Add the compact blue hover outline from WordPress to shared number-unit value type controls.
- Make the Styles actions menu labels turn blue on hover and keyboard focus without a row background fill.
- Demonstrate the Site Editor pointer-cursor slider alongside the standard grab-cursor slider in the Controls Library.
- Match the Site Editor comparison table to the reference with a white surface, black grid, centred bold headers, and roomier text.
- Match Site Editor Layout’s reference Dimensions grouping, width icons, and scalar spacing controls; keep back arrows black until hover.
- Match the shared colour editor format selector and prefixed Hex field to the reference, including UI Library colour and gradient controls.
- Match custom palette editing to the reference with compact swatches, named detail rows, Done, and individual or undoable bulk removal.
- Match Theme colour details to the reference list, with full-row colour buttons and Done returning to the compact palette.
- Unify transparency checks across colour and gradient previews, swatches, stops, and alpha tracks, including the UI Library.
- Align end drop indicators with item boundaries throughout Studio, including Sites, libraries, Navigation, Design and block editors.
- Match the Site Editor Fonts family names to the 18px font-variant text while keeping active counts secondary.
- Close the Site Editor Fonts window when clicking its shaded backdrop, discarding uncommitted changes.
- Keep Fonts open after Update and show a dismissible success message, with checkbox state following Undo/Redo.
- Limit Manage Fonts to the current Typography families, with WordPress-style Theme rows and active variant counts.
- Match the Site Editor Fonts window to the WordPress layout, with a Library tab, bordered variant specimens, and a fixed Update footer. Variable fonts show one real variant.
- Remove the Close row from shared Font and Appearance dropdowns; keep keyboard and outside-click dismissal.
- Extend the Controls Library Font specimen with live family and weight preview menus.
- Preview each font family in the Site Editor Font dropdown using the shared typography-choice menu.
- Add individual Reset actions for modified Site Editor Typography options.
- Match the Site Editor Typography options menu to WordPress's 240px width.
- Match the Site Editor Typography options menu to WordPress, with eight visibility toggles and no extra Decoration or Close controls.
- Preview each available font weight in the Site Editor Appearance menu using the selected font family.
- Offer px, %, em, rem, vw, and vh units for Site Editor Letter Spacing, matching the WordPress selector.
- Match Site Editor element typography controls to the WordPress reference, with centred Aa previews, colour selection, shared unitless steppers, and keyboard-accessible case/alignment choices; demonstrate the shared variants in the Controls Library.
- Set Styles pane horizontal insets to 28px through the shared Pane spacing contract, preserving its existing vertical rhythm.
- Reveal style variation names on hover and keyboard focus, with reduced-motion support.
- Use shared Gutenberg-inspired icon designs for Site Editor navigation and Styles, with unframed navigation symbols.
- Match the Site Editor Identity pane's field and image selection layout more closely to WordPress.
- Tighten the Site Editor sample title-to-tagline spacing.
- Centre the Site Editor sample tagline vertically beside the logo when the site title is blank.
- Reduce the Site Editor sample header gap between its logo and identity text.
- Keep the Site Editor sample header, browser tab and logo aligned when Site Title is cleared.
- Clear the sample browser tab title when Site Title is blank, matching the website header.
- Arrange Site Editor Identity fields like the WordPress reference, with uppercase labels, full-width text fields, help text and image previews using existing shared controls.
- Tighten grouped pane controls to a 10px visible gap with separate coarse-pointer touch targets.
- Group two-left-pane collapse and reopen controls at the remaining boundary, vertically centred with the open pane first; Site Editor and Pane Library share the behaviour (Pane contract v1.6.0).
- Replace the temporary Site Editor Paragraph styles experiment with per-site identity previews for title, tagline, logo, and icon, using existing controls and read-only Files selection.
- Arrange the Site Editor preview with two shared left-hand panes, a global/site scope dropdown, and clearly unavailable future design sections.

- Give navigation and submenu link insertion buttons the shared plus-to-close
  animation and click-again dismissal while their link editor is open.

- Share the plus-to-close animation across toolbar, on-page, between-block,
  featured-image, nested-layout, and Social Icons inserter buttons while their
  respective inserters are open, respecting reduced motion.

- Collapse Header navigation when its links no longer fit the available width,
  preserving inline links on wider layouts in Edit, Preview and local output.
- Allow the active site's links to be added, edited and reordered directly in
  the Header Navigation pane, with site-owned saving and Undo/Redo. Unscoped
  previews remain read-only and Header styling remains shared.

- Expose drag handles and Move Up/Move Down controls beside navigation menu items,
  preserving submenu nesting and the existing Undo/Redo history.

- Show Preview Content for headers and footers only when their content depends
  on a document, while retaining it for Page and Post templates.

- Keep template previews within the selected site and its documents. Offer
  Preview Site only when no site is selected, with Neutral examples by default.

- Use one shared block-selection frame and a separate Block selection colour
  setting in Styles → Interactions.

- Use the sidebar’s selected site for Edit navigation and remove the independent
  Navigation target selector; template preview choices remain separate.

- Place site navigation inside the shared Header and retire the separate
  Navigation template, preserving each site's links, template assignments and
  Existing Presentation navigation with recoverable library migration.

### Fixed

- Correct Paragraph Styles control layout, Orientation choices, Background rows, Line indent, Columns, and initial Advanced state in the Site Editor and shared UI Library specimens.
- Match WordPress Reset hover treatments in the Site Editor and Inspector Tools Library: a tinted full-row Reset all and a compact tinted per-option Reset.
- Keep hidden Site Title and Tagline fields editable and dimmed while preserving Hide in the Site Editor and UI Library.

- Keep Replace available for hidden site logos and icons; selecting a replacement preserves Hide in the Site Editor and UI Library.

- Removing a site logo or icon now clears its override while preserving Hide, consistently in the Site Editor and UI Library.
- Preserve authored identity text and image choices while Hide is enabled, restoring them when it is switched off.
- Match Style Book resizing to the WordPress reference with a bounded specimen column, responsive gutters and swatches, and aligned text specimens.
- Keep the comparison table at the main content width and selected body text size.
- Wrap Theme colour swatches and stack palette choices in narrow Site Editor panes.
- Give shadow confirmation and rename dialogs the shared padded, rounded surface, and demonstrate the complete shadow preset flow in the UI Library.
- Match Custom Shadows creation, numbered names, rename and deletion confirmations, and scoped Remove all with Undo/Redo.
- Centre the preview resize bar between adjacent pane buttons and the frame at maximum width, including the shared Two Left Panes Library example.
- Match the Style Book eye to the open-eyelid, filled-pupil reference using shared catalogue artwork.
- Match Site Editor Background row spacing and empty-image swatch to the reference, and keep shared inspector options triggers transparent on hover and while expanded.
- Open Edit palette directly from Style Book Theme Colours and keep its swatches visible while hovering.

- Preserve transparent Site Editor tabs on hover instead of applying the generic button fill.

- Show the Custom palette Add icon in black at rest and blue on hover.

- Keep Custom palette header hover actions unframed in Site Editor and the UI Library.
- Arrange Site Editor palette choices as compact two-column, four-colour strips with accessible names.
- Keep Site Editor theme colours on one horizontal row and show translucent colour indicators over compact palette checks.

- Use the vertical three-dot catalogue icon for Elements and shared vertical options buttons; Elements hover changes only the dots to blue.
- Match compact translucent palette swatches to the reference with dense checks inside each circle, including the UI Library.

- Align transparency checks to the top-left with a complete white first square.
- Match the shared colour preview's transparent canvas to the reference's large white and light-grey checks.

- Show gradient stops, type, and angle directly in Site Editor element colour popups.
- Keep colour popup tabs, preview cards, and swatches within the popup width without horizontal scrolling.
- Clear a Site Editor element colour when its selected swatch is clicked again, retaining the unset state through inheritance and history.
- Keep preview resize handles close to pane collapse and reopen buttons with a 4px target gap, accounting for existing padding and coarse-pointer touch targets.
- Include Templates in the Studio navigation tool list, using the existing context-preserving template action.
- Align the Site Editor preview handle with the pane button group's vertical centre by filling the desktop workspace row.
- Keep the preview's last displayed size when browser pointer capture ends before release, avoiding a snap back to the drag's starting size.
- Keep grouped pane toggles in left-to-right pane order, with the first pane above the second when either is hidden.
- Keep the Site Editor preview's rounded corners visible while resizing.
- Remove the sample page's duplicate square border, which crossed the preview's rounded corners.
- Prevent resize gestures from accidentally fitting the preview, and keep its height continuous when narrowing a tall workspace.
- Keep the Site Editor preview scroll position steady while resizing and reflowing the sample page or Style Book.
- Use the selected website palette and transparency in Site Editor element colours, add Links decoration controls, and preserve normal/italic Appearance choices across previews, reset, and history.
- Remove deactivated families from the Site Editor Font dropdown while retaining reactivation in Manage Fonts.
- Allow disabling and re-enabling typeset fonts through Select all and variant checkboxes, with preview fallback and scoped Undo/Redo.
- Align the full-size Site Editor preview with the settings pane.
- Remove extra preview headings and visible history buttons while retaining Undo/Redo shortcuts.
- Shorten and vertically centre the preview frame as it narrows, matching Gutenberg's adaptive aspect ratio.
- Prevent Style Book text specimens from clipping font descenders.
- List each Typography Typeset's own fonts alphabetically, retaining enabled extras and fonts used by element overrides.
- Keep Typography element thumbnails in sync with the selected Typeset and each element's font overrides.
- Match Gutenberg's style specimens by pairing heading-font A with body-font a at regular weight in both variation grids.
- Give Site Editor and UI Library image chooser dialogs consistent padding and a bounded width.
- Hide the website header title when its Site Editor preview field is empty while retaining the sample browser tab fallback.
- Remove empty space from collapsed Site Editor panes while retaining separate, accessible shared reopen controls.

- Website Styles layout preview now holds canonical shared profile values, with
  inheritance only on sample templates and no changes to existing sites.

- Capitalise generated List View names for template elements, shared parts,
  site roles, and components, while preserving custom block names.

- Hide template editing toolbars while a navigation overlay is open, including
  in Full Canvas, restoring them when the menu closes.

- Keep mobile Header identity and its collapsed navigation button on one row,
  with matching Edit and Preview presentation, contained overlays in Fit to Part,
  and separate Edit Navigation.

- Start the object manipulation and resize examples with a regular hexagon,
  retaining proportional resizing by default and Shift stretching.

- Keep floating block toolbars fully visible above fitted Header and Footer
  canvases, with zoom-aware clearance outside the part's exact boundary.

- Show the exact Header and Footer region in Fit to Part, removing surrounding
  editor and page-surface space from the visible canvas while preserving authored
  spacing, content widths, and matching Edit/Preview sizing.

- Hide the trailing appender and remove its reserved space in Header and Footer
  Fit to Part views, keeping Edit and Preview sizing consistent.

- Remember Header and Footer canvas choices when another Studio tab owns saving,
  using acknowledged preference commands through the existing writer.

- Match Page and Post body positions and block gaps between Edit and Preview,
  with overlay controls and body drag slots reserved only during dragging.

- Align the shared Header between assigned templates and Existing Presentation,
  and keep Edit Header beside its owning part in both Page and Post editors.
- Keep Footer, Header, Page, and Post template content in the same position in
  Edit and Preview by reserving root drag slots within the existing canvas gutters.
- Keep shared Header content aligned with Page/Post previews while editing,
  using the existing canvas gutter for horizontal drag end slots.
- Use one selection outline for root template blocks, removing mismatched corners.
- Use shared checkboxes throughout Studio settings, selections, confirmations,
  and library examples, preserving native input state and feature actions.
- Give background-image width and compound Ribbon sliders the shared thumb,
  value feedback, keyboard behaviour, and interaction styling.

- Use shared Ribbon demonstration menus and popovers for anchored placement,
  dismissal, and keyboard navigation, including Columns with one visible column.
- Correct the UI Library navigation specimen’s listed consumers.

- Remember Sites expansion across site switches when another Studio tab owns
  saving, confirming the preference before navigating.

- Centre end-slot drag indicators in their actual reserved gaps across shared
  placement consumers, preserving compact sibling spacing and authored padding.
- Reduce shared Posts, Pages, and Templates row padding while retaining readable
  labels, icons, and a 44px minimum target height.

- Preserve the Sites section’s expanded or collapsed state when switching
  between Posts, Pages, and Templates, refreshing, and switching sites.

- Keep enlarged shapes, images, and their handles accessible in the Resize handles
  example with a canvas that expands and scrolls at the selected zoom.

- Keep the current size when Shift is pressed or released during page, shape,
  or image resizing; continue proportionally from the stretched dimensions.

- Use the shared white surface colour for the Design zoom slider container.

- Keep page resize handles aligned with the pointer during a drag in single-page
  and all-pages canvas views, with the opposite edge anchored.

- Keep the active canvas resize cursor in place for the full drag.

- Use grab and grabbing cursors for shared slider thumbs, including Design zoom.

- Preserve shapes, images, highlights, redactions, and numbered markers’ aspect
  ratios during handle resizing; hold Shift to stretch, including during a drag.

- Centre Design zoom at 100% while retaining 10–500%, with the shared slider
  value label above the track so it stays visible at the bottom of the workspace.

- Give catalogue section headings slightly larger semibold text and a consistent
  background across the full section row, without entry hover feedback.
- Keep complete control specimens available in catalogue previews, including the
  rotation handle, with scaled content sizing and scrolling for longer examples.
- Position Studio UI Library preview popovers beside the hovered Preview
  control using their measured height, so lower rows remain beside their
  previews with viewport clamping.
- Keep the Studio UI Library catalogue’s Name column pinned during horizontal
  scrolling so entry names and Preview icons remain visible.
- Keep grouped catalogue headings in the pinned Name column, aligned with entry
  names across horizontal scroll positions.

### Added

- Add a Mobile navigation Library example using production menu rendering,
  opening, closing, submenu, and keyboard behaviour in an isolated page frame.

- Add shared Text input, Text area, Select dropdown, Search field, Number field,
  Number with units, Button, Tooltip, and Field label, help and error specimens
  with temporary states and keyboard interaction. Connect ordinary Studio fields
  to the production primitives and their canonical Library entries, with a
  coverage check that records specialised editor exceptions.

- Add shared Checkbox and Radio group Library entries with mixed, disabled,
  independent selection, and native keyboard examples, also used by existing
  template defaults and keyboard collection controls.

- Add a Workspace Object manipulation playground combining shared move, resize,
  and rotation controls with temporary shape/image history.

- Add a Block editor playground in the Library’s Workspace section using the
  production Template editor, with temporary Header, Navigation, and empty
  templates for trying blocks and checking appender positioning.

- Add page resizing to the Resize handles Library example with shared Design
  page handles, sizing, anchored layout, keyboard input, and temporary history.

- Add a Zoom slider specimen using the shared Design zoom control, with the
  100% midpoint, 10–500% limits, percentage feedback, and grab cursor.

- Add a Resize handles specimen using shared Design controls and geometry, with
  shapes, images, Shift stretching, zoom, rotation, cancellation, and Undo/Redo.

- Share circular canvas handle presentation, sizing, focus, and input forwarding
  across Design object resizing, page resizing, and arrow endpoints.

- Add a searchable Studio UI Library catalogue with cross-section filters,
  ownership and dependency details, and keyboard-accessible previews from shared
  component and specimen definitions. Make it the Library landing view.

- Add a History actions example showing shared compact, labelled and Ribbon
  controls with temporary Undo/Redo, read-only mode and keyboard shortcuts.

- Add a temporary Rotation handle example to the UI Library using Design’s
  shared handle, artwork and rotation calculations, with zoom, keyboard steps,
  read-only mode, cancellation and Undo/Redo.

- Make Sites in Studio Navigation collapsible to free space for content lists,
  with native keyboard disclosure and drag cancellation on collapse.

- Add a shared drag-to-position Controls specimen with vertical, horizontal,
  and wrapped layouts, read-only mode, keyboard moves, and temporary Undo/Redo.

- Add six-dot site handles for pointer and keyboard reordering in Studio Navigation,
  retaining each site’s environments and saving the order as an owned preference.

- Manage template dependencies across Studio Drafts, Test and Test2 with bulk
  replacement or detachment, per-owner save results, and a global template Bin
  supporting Undo and Restore for unused originals.

- Edit navigation from any Templates context with a separate Studio Drafts, Test,
  or Test2 target selector and saves through each target’s existing owner.

- Add Responsive styles to the View menu for posts, pages, and templates, with
  independent Tablet and Mobile block styles, Desktop inheritance, and saved
  local preview and publication rendering.

- Share the post-only Sticky checkbox across Studio Drafts, Test and Test2,
  retaining separate draft saves and publication captures.

- Share Draft, Pending, Private, Scheduled, Published and password preview controls
  across Test and Test2 posts and pages, including the home page; retain local
  ownership and saving, with explicit unavailable-home previews and UTC timing.

- Open a compact block chooser from canvas Add Block controls, with contextual
  search and an explicit Browse All action for the Block Library pane.

- Add shared HTML anchor, CSS classes, and Additional CSS controls to Buttons,
  LinkedIn, TikTok, Reading Time, Navigation, and Page link, retaining safe
  presentation in Edit, Preview, and local output.

- Include ACM Studio in Sites, with homepage Visit actions and unavailable Edit
  actions until its homepage is connected to the editor.

- Reorder Posts, Pages, and Templates by dragging their Navigation entries, or
  using Alt+Up/Down, with saved order, Undo/Redo, and shared-tab conflict checks.

- Fit resizable panes to their primary labels and controls by double-clicking
  the resize edge or pressing Enter while it is focused, within existing limits.

- Add Workspace Background to Styles → Colours, updating the surrounding workspace across Studio Drafts, local sites, Templates, and the UI Library.

- Show blue date markers for days with existing published or scheduled posts in
  the publish calendar, with post counts in each marked day's accessible name.

### Changed

- Strengthen shared Controls, Blocks, and Panes navigation headings so groups
  stand out above their entries.

- Make Design workspaces, their library, and loading screens inherit the block
  editor’s shared workspace background colour.

- Use the shared white surface for the Design Ribbon and UI Library Ribbon examples.

- Reuse shared number-and-unit fields, link fields and preview actions,
  Undo/Redo controls, and Bin rows across Studio, retaining each feature's
  validation, history, saving and recovery rules.

- Share dynamic document-field presentation across editing, block previews, and
  templates, retaining each host's visibility and editing rules.
- Reuse Design artwork across canvas, thumbnails, library, and raster exports;
  inherit shared property controls and workspace shortcut recognition.

- Reuse shared popover, context-menu, submenu, and native dialog behaviour across
  document/template settings, View, canvas controls, Files, Design, and Site Settings.
- Share image choice presentation and Blob URL cleanup across Design, inline
  images, Files, and document/template media; demonstrate nested overlays and
  temporary image choices in the UI Library.

- Centralise pane region spacing across Navigation, Block Library, document and
  template inspectors, Design pages/layers and properties, and navigation details.
  Shared inset/flush regions replace local padding and preserve clean pane edges.

- Unify accordion heading dimensions and content spacing across Studio; standalone
  pane controls use shared pane spacing, including Studio Drafts.

- Make Sites inherit the shared UI Library accordion, including disclosure,
  chevrons, hover, and focus, while retaining its pane density and drag cancellation.

- Show six-dot drag handles on Posts, Pages, and Templates library entries,
  with a pointer cursor on rows and a grab cursor on enabled handles.

- Capitalise “Centre” in the Studio dashboard’s Control Centre label.

- Use a white surface for the shared canvas block chooser in every editor.

- Share compact property rows across Post, Page and Template settings, with
  Categories and Tags as their only collapsible groups and regular-case
  inspector labels. Setting values open editors beside the pane.

- Container authoring shows every structurally supported block. Manage allowed blocks is removed; saved legacy restrictions remain recoverable.

- Separate each editor breadcrumb with a chevron and make ancestors clickable,
  revealing the selected library or returning safely to Sites.

- Mark selected Posts, Pages and Templates rows with the shared selection-colour
  tint, border and side marker.

- Present Studio Drafts as a full-width catalogue-icon button with a pressed
  selected state and an explanatory tooltip above Sites.

- Reuse the shared View dropdown in Templates, with Focus Outline and preview
  viewport choices when a template canvas is open.

- Use catalogue icons and quick tooltips for Edit Navigation and Export Saved
  Global Library in the template scope notice.

- Show creation-button tooltips after 200 ms on first hover, immediately when
  moving within a group, and immediately on keyboard focus.

- Share compact template creation icons between the navigation pane and main
  template list, including an Import icon, with catalogue artwork and tooltips.

- Align Edit and Preview block typography, metadata, captions, and container spacing across Studio and the UI Library, including shared-template styles.

- Use one shared template library for Studio Drafts, Test and Test2, with consistent counts, preserved browser recovery originals and shared-template snapshots in browser backups.

- Make the New post, New page, and New from template actions icon-only, with accessible names and tooltips using the shared ACM catalogue icons.

- Order the content tabs Posts, Pages, and Templates in Studio Navigation and the template workspace.

- Keep the Sites section above the Posts, Pages, and Templates tabs in the template workspace.

- Remove the redundant publish status summary above the status control.

### Fixed

- Place the catalogue Preview eye icon beside each name so it stays accessible
  without scrolling to the end of the table.

- Keep catalogue rows clear while reading: previews open from a deliberate hover
  over Preview or explicit activation, and clicked previews stay pinned.

- Restore the two-arrow Design rotation icon with rounder shared catalogue
  artwork, centred inside its handle without a stray icon at the object’s corner.

- Make the Sites disclosure heading span its pane with a taller, square-edged
  row, retaining inset site cards and a contained keyboard focus outline.

- Fix the script error when collapsing Sites by exposing shared drag cancellation
  through the library adapter, with production-contract regression coverage.

- Reserve shared space before the first and after the last draggable item, with
  the end placement line centred inside it throughout Studio authoring.

- Use one measured, centred insertion line for blocks, nested containers,
  Navigation links, Design pages, and layers, with shared pointer/native
  placement rules, no-op protection, and cancellable edge scrolling. All ordered
  placement consumers inherit one controller, geometry module, and line renderer.

- Keep one centred drag indicator for each library gap, including site cards,
  when crossing between either neighbouring row or the empty gap.

- Show placement lines only for genuine order changes across site, post, page,
  and template dragging; clear no-op targets and prevent empty move submissions.

- Apply Focus Outline Off to decorative borders, shadows, composite controls,
  sliders, and Design handles across Studio, including portalled menus and
  popups; retain selection marks and add a stylesheet regression check.

- Respect Focus Outline Off when applying the shared focused-control border,
  including keyboard navigation in the View menu.

- Use ticks alone for selected View menu options, preserving the separate
  keyboard focus indicator.

- Automatically recover abandoned local-site and global-template writer locks
  when their process is confirmed gone, retaining protection against competing
  servers, uncertain ownership, and changed source files.

- Keep the UI Library's selected control stable after clicking a jump link,
  and prevent hover and selection from shifting the menu entries.

- Use the same compact shared sizing for header Save and Publish buttons.

- Show featured images in local-site Existing Presentation across Edit, Preview
  and publication output, and preview the selected image in the document pane.
  Apply featured-image selections directly using their existing alternative text.

- Restore template editing across normal Studio tabs, retain safe local Undo
  after saving, hide unavailable insertion lines, centre template image actions,
  and provide an explicit Restore action for hidden template images.

- Update Studio regression checks for shared pane navigation, featured-image
  wording, and brokered Files saving; cover supported local-site date edits and
  allow real file transactions to settle under a concurrently running suite.

- Align Files regression checks with saving across tabs, retained unsaved details,
  conflict review, and the current image-insertion permissions.

- Keep local-site saving available across Studio tabs, including a Design Canvas
  owner. Reconnect retains unsaved drafts, recognises accepted saves and asks
  which version to keep when a previous saving session's outcome is uncertain.

- Restored shared publication status and UTC date controls for local Test and Test2
  posts and pages, including backdating and saved Draft/Pending withdrawal.

- Apply featured images to Test and Test2 through their owning save transaction,
  with immutable local image copies and image-inclusive backups. Keep rejected
  selections open and use “Featured image” throughout the interface.

- Share cover-image and placeholder presentation between Edit and Preview across
  templates, documents and the UI Library, preserving authored dimensions and
  spacing, hidden images and single border ownership.

- Show one insertion line across invisible template fields instead of successive
  lines around an empty block frame; retain hidden fields in List View.

- Respect hidden template cover images in document Edit as well as Preview,
  without discarding stored images or removing inspector access.

- Restore the shared Publishing section for Test and Test2 posts and pages,
  showing saved publication status, UTC publication time, and the supported
  local Publish or Update action.

- Resume the safe saving handover when Studio tabs return to the foreground,
  retaining pending drafts while restarting the existing peer handshake. Revoke
  saving authority on page-hide and release its lock after pending operations
  finish, so idle cached pages don't prevent another tab taking over.

- Keep the selected Posts, Pages, or Templates tab when switching between sites
  and Studio Drafts, including reloads and site links opened in another tab.

- Align template content positions and spacing in Edit and Preview, including
  shared-part editors and selected-block controls.

- Use the shared neutral hover background for file and folder cards, keeping
  the blue selection outline distinct from hover.

- Allow Files actions from connected Studio tabs, synchronise open libraries,
  and preserve unfinished edits with explicit conflict review.

- Keep Design Canvas saving connected when Content or Templates owns the Studio
  writer, and reconnect safely while preserving pending edits and conflicts.

- Share the Studio Navigation structure across Posts, Pages, and Templates, keeping toolbar heights, tool icons, and separators consistent.

- Keep selected calendar dates' text and post markers white, and shade today
  grey when it is not selected.

- Keep toolbar menus on regular Studio UI typography instead of inheriting
  template or block text styling.

- Add individual resets to global defaults for template body typography and shared layout overrides.

- Match the editor toolbar background to the white pane surface.

- Give Studio panes consistent white backgrounds through a shared interface token.

- Use the shared resizable, collapsible Pane for site navigation link details.

- Site navigation Save now confirms completion visibly, including when autosave has already saved the menu, and preserves rejected field errors.

- Allow each template palette colour to reset to its current global default and
  use the Studio colour picker for drag-based custom colour selection that
  commits on release without closing during the save. Keep swatches and labels
  in consistent full-width rows, with an inline Reset action for modified colours.

### Added

- Separate Save Draft and Publish/Update actions for local Test and Test2, with saved publication snapshots that keep unpublished edits out of the generated site preview.

- Shared Revision slider in the UI Library, used by Page and Post revision comparisons with a compact neutral timeline and author/date tooltip.

- Page and Post Revisions controls with saved-version previews and undoable
  content restoration, preserving current publication state and assignments.

- Add Reset all styles to restore template colours, body typography and shared layout together.

- Site-specific navigation editing for Test and Test2, with menu link actions and site history while retaining global template presentation.

- Default global templates to neutral preview content, with a temporary Test or
  Test2 preview choice independent of the editing site.

- Add one shared Control accent colour in Styles for toggles and standard sliders,
  with derived hover and pressed colours and simplified Controls examples.
- Keep Styles history and the selected settings panel when saving source values
  by excluding gateway-owned data from development-server config restarts.

- Add one shared interface selection colour in Styles → Interactions, independent
  of specimen Accent, with live previews and source-backed refresh across tabs.

- One central Neutral hover background setting shared across disclosure headings,
  neutral controls, menus and list items, with four preview examples.

- Central Styles hover backgrounds for neutral controls, menu items and list
  items, alongside the disclosure heading setting.

- Global template originals for Test and Test2, with revision-checked shared
  saving and local preview propagation. Template layouts and styles are edited
  globally; site identity and links remain local. Former site designs remain
  recoverable without affecting the global design.

- Added Navigation overlay icon controls and reusable overlay templates, with
  creation, selection and editing through the existing template workspace.

- Page link children in Navigation, with a contextual Block Library entry, individual Content/Settings/Styles controls, sibling drag and movement, and saved per-link typography.

- Navigation in the template editor's Theme block category and the UI Library, with an editable specimen using the production Menu, Settings and Styles controls.

- Gutenberg-style Navigation authoring with Menu, Settings and Styles tabs, inline link editing, nested submenus, shared layout and colour controls, and responsive overlays in previews and local output.

- Editable shared Navigation blocks for Test and Test2, with saved menu labels, destinations, order and link controls across editor and website views.

- Website View and Full Preview for local Test and Test2 drafts, with isolated browser viewports, device sizes and Fit / 100% scale controls.

- Test2’s Production visit link alongside its Local controls in the Sites pane and homepage.
- Local Visit Site controls open the freshly discovered address in a new tab.

- Added the independent local Test2 fixture and safe switching between Test and Test2, with separate content, templates, saving sessions and previews.

- Sites navigation shares the homepage’s Local, Staging and Production action
  groups, with unavailable editing marked clearly and absent staging omitted.
  Test is now included in the homepage directory.
- Site-aware Test content: Pages, Posts and Templates use its canonical source,
  including the existing test drafts, preserved template assignments and a
  recoverable Bin. Studio Drafts retains the original browser recovery copies.
- Test collection backups and stable document links in its local preview.

- Styles now supports explicit local saving to the shared preset, synchronised
  guide token tables and source bundle, with live draft source updates, revision
  checks, write ownership and recoverable file transactions.

- List toolbars distinguish items from their parent List, with ordered/unordered
  controls, item move/duplicate/remove actions and Gutenberg-style indentation.
  Empty items retain their inspector; Lists and items now support background
  images and shadows. Sibling-range indentation preserves reading order, and
  delayed focus yields to subsequent input.


- Local Test can be edited in multiple Studio tabs, with shared updates,
  independent-change merging, overlap choices and automatic save handover.

- Group floating toolbars now follow the chosen layout: block alignment for Group and Grid, and both layout alignment axes for Row and Stack.
- Empty Group layouts now use Gutenberg-style insertion areas: a full-width Group button, horizontal Row and vertical Stack placeholders, and responsive Grid track guides with a compact insertion button. Empty unselected Groups show a dashed boundary; these guides remain editor-only.

- Group, Row, Stack and Grid are separate block choices with mutual transforms,
  consistent labels and icons, and shared Gutenberg-style layout controls.

- Edit the local Test website inside Studio using its standard block library
  and inspector, with revision checks, history and standalone preview.


- Added Test to the editor's Sites area, with a live local-service status and an open action when Project Ports reports it running.

- Shared inspector sliders show a value label beneath the thumb on hover, focus and adjustment, using spacing preset names or the current numeric value.

- Shared Text action buttons keep Clear and inspector Reset All consistently linked to the shared semantic Accent token, with readable text colour, central hover, pressed, focus and disabled states and a working Controls specimen.

- Paragraph Typography now offers Font for individual block overrides, with Default restoring inheritance. The reusable Font selector and its working Controls specimen share font choices with the content renderer.

- The editor List View button now uses a new shared `@acm/icons` List View mark with the three-line stepped outline shown in Gutenberg.

- Homepage local-site actions resolve current running ports through Project Ports, with shared discovery, clear unavailable states and a fresh lookup before opening. Hosted links remain separate.

- Insert and replace inline images without leaving the editor, with reusable image controls, changed-only width and alternative-text editing, caret restoration and Undo/Redo. Managed images render in rich captions and table cells.

- Drag existing blocks or Block Library items into individual Columns, with a red insertion indicator and one-step Undo/Redo; blocks can also move between columns or back to the document.
- Extend a List text gesture into a separate List to select both whole blocks, while retaining text selection within one List. The UI Library includes isolated document and Template column-drop examples.

- Button labels support direct rich-text editing with matching preview, HTML and local storage; inline links and footnotes remain excluded from the already linked label.
- Button toolbars edit and remove their own destination through a reusable Link destination control, with safe URLs, internal suggestions, new-tab/nofollow settings, clipboard preview and preserved rich labels. The Controls library demonstrates the same component in isolated state.

- Undo and Redo in the Styles sandbox, with platform shortcuts and temporary history for colour, typography, button, layout and reset actions.

- Reusable Studio dialog shells, popover headings and dismissal, and menu keyboard navigation; editor and dialog actions now share the Base/Secondary button styles.

- Block notes now appear in a bottom-right canvas card, with Edit note, Back to block and dismiss/reopen controls.

- Gutenberg-style block options with clipboard actions, insertion, style transfer, grouping, private notes, naming, visibility and movement/removal locks.

- Completed Group width inheritance, Row wrapping and Grid arrangement controls; added Columns gap axes, Column allowed-block restrictions, shared List Item styling, dynamic presentation options and a styled template Content-slot inspector.

- Quote inner blocks and rich citations, a Buttons container with shared layout, and actual YouTube, Vimeo and TikTok embeds with a safe original-link fallback.


- Added six shared H1–H6 catalogue symbols for the Heading pane and canvas toolbar, with reusable Controls specimens and three-scale icon exports.
- Focus Outline offers On, Off and Keyboard Only throughout ACM Studio, including the editor and its empty appender. The Library header and editor View menu share an ownership-guarded preference that survives navigation and reloads; keyboard navigation and selected-item markings remain available.
- Select ranges or separate blocks across mixed block types and nested layouts, then delete the selection in one undoable action. The UI Library selection specimen keeps its example document and history in memory.
- Table cells now retain Gutenberg `th`/`td` tags and `scope` values through preview, structural edits and HTML editing. Workspace schema v17, local publication snapshots v10 and template schema v0.17.0 preserve readers for previous versions.
- Every Block Library tile now uses a shared `@acm/icons` symbol; the block-symbol inspector links to the symbol record and the symbol record links back to each consuming block. Existing repeated inspector actions now resolve through the shared icon adapter.
- Shared icon catalogue entries now link to block movement, duplication, deletion, inline rich-text formatting, link-preview and canvas zoom examples; Studio editor zoom and link-preview globe artwork use their shared catalogue symbols.
- Group blocks now use Gutenberg's Group, Row, Stack and Grid variations, show a layout chooser when empty, let nested insertion be restricted by allowed block type, support Row and Stack Space between justification, and place layout and background-image options within the shared Dimensions and Background controls. Workspace schema v16, publication snapshots v9 and template schema v0.16.0 retain readers for their previous versions.
- Added Additional CSS classes and safe Additional CSS declarations to the List Item Advanced settings.
- Added catalogue-linked indent and outdent toolbar actions for the selected List Item; keyboard indentation remains available.
- Added a standalone Slider foundation to the Controls library, with shared accent, derived hover and pressed colours, independent temporary overrides and a visible consumer list.
- Added dependency and consumer details to each Controls section's ownership and compatibility disclosure.
- Added sorting by the first-added date and time for shared interface icons, with the selected symbol's timestamp shown in UK local time.
- Expanded the Blocks library from the Paragraph pilot to all 27 typed block types plus the template Content slot, with profile-driven pane inventories, isolated production-editor specimens, history, reset, nested selection and compatibility notes. Expanded Controls to one grouped page with 13 working control specimens plus its standalone Slider foundation, compatible direct-route anchors, and shared border, background, typography, image-dimensions, focal-position and preset-number controls between the inspector and catalogue.

### Changed

- Publish dates use UTC+0 consistently in the calendar, time fields and displayed date.

- Publish calendar uses the shared interface selection colour for the selected day and Text action styling for Now and month arrows.

- Published fixture pages/posts and browser posts show one blue Save action, which updates their local publication; drafts retain Save Draft and Publish. The save shortcut follows the same status rule.

- Draft pages and posts have a blue Save Draft action in the editor header, using the existing local save flow.

- Studio Drafts has consistent side padding.

- Pane edge controls are smaller circles, with resizing available along the full pane edge.

- Remove Close rows from compact toolbar dropdowns; retain Escape, outside-click
  and trigger-toggle dismissal as a documented interface exception.

- Move the Page/Post Bin action above organisation settings as a visible red
  outlined button, outside the Document actions accordion.

- Revisions now opens a full comparison screen from the Page/Post revision count,
  with a timeline slider, Previous/Next and highlighted Removed/Added columns.

- Move disclosure heading hover colour into Styles → Interactions as a shared
  preset token for inspector accordions and navigation overlay headings; remove
  the Controls accordion browser preference.

- Templates use one list of individual layouts and shared parts. Named-set
  management and the Save as Template destination selector are removed;
  existing designs, assignments and recovery data remain compatible.

- Navigation panes more closely follow Gutenberg’s spacing, menu hierarchy, section options and compact Settings and Styles controls, in both the editor and Block Library.

- Template Edit and Preview use a white canvas without a shadow and the content editor's pale off-page background, while preserving authored template colours.

- The Sites pane outlines the active site and marks its active local environment with a green dot.

- Padding and margin sliders use unit-specific custom ranges: 300px, 10em/rem and 100 for percentage, viewport and ch units. Numeric entry and unit switches preserve measurements outside the slider range.

- Padding and margin custom fields now fit five digits plus their unit instead of stretching across the pane.

- Dimensions now use vertical/horizontal spacing rows, inline custom measurements and shared catalogue side indicators. Padding and margin resets live in the Dimensions options menu instead of separate row buttons.

- Radius settings now show a value and unit field beside the slider in both linked and individual corner modes, matching the Gutenberg layout.

- Removed the duplicate Heading level dropdown from the canvas toolbar; H1–H6 changes remain available in the “Transform to” menu.

- The shared Border width slider now reaches 100, while retaining a larger range when an existing width exceeds 100.

- Paragraph Border options no longer include the ACM-only block Shadow control; shadow values remain available on blocks that support them.

- Border width number fields no longer show native spinners, matching Gutenberg while retaining numeric entry.

- Border width fields use a compact, consistent width when editing sides separately.

- Newly inserted Heading blocks start empty and show the grey “Heading” editing placeholder; the prompt is not saved as block text.

- Shared Border controls now use compact joined inputs, a linked width slider and a box diagram for separate sides. Linking preserves mixed widths; colour and style remain shared across all sides.

- Templates now use one integrated Content Studio workspace, including template set management. Old template-editor links redirect while retaining the selected set and template.

- The homepage lists actual sites in one alphabetical card grid with equal prominence. ACM Account, Habit Tracker, Loquafy and Mini Golf show their identified Production and Staging sites together. Shared libraries and projects without a hosted site remain in their existing tools.

- Written Style Guide hover and pinned selections now visibly mark their matching live preview specimen, completing the two-way source/preview inspection link.
- Active Reset all actions in every block inspector now use the shared `@acm/styles` accent colour.
- The shared Elements tools menu now labels the link-colour option as Link.

- Styles specimens use only the shared Focus Outline indicator, without an additional selection outline or marker; mapped guide lines use the shared focus colours.

- Simplified Table to use a two-count creation form and Settings/Styles inspector tabs with simple Default/Stripes buttons. Removed drag resizing and double-click fitting while preserving existing saved sizing, cell content, caption and all Advanced fields.

- Refined the shared H1–H6 marks to use Inter-derived outlines for clearer, consistent letterforms in the catalogue, pane and toolbar.
- Theme blocks now use Gutenberg's labels: Title, Featured Image, Author and Date.
- Studio-only blocks now appear together in the final Other section of the Block Library.
- Block icons now follow Gutenberg recognition conventions through original shared
  ACM artwork. Every supported block, including non-insertable system blocks,
  appears in the icon catalogue and uses the same symbol throughout the editor.

- Block Library tiles use three columns and Gutenberg ordering for the supported blocks, with separate Theme and Embeds categories and ACM-specific blocks placed after their equivalents.
- Group block headings and layout choosers now share the Group symbol; Group, Row, Stack and Grid use the shared catalogue's Gutenberg-aligned layout metaphors.
- Quote text alignment now has one control in the block toolbar instead of a duplicate in the inspector; its value remains on the same typed block.
- Embed settings now follow Gutenberg’s Dimensions and Advanced pane, with linked axis or separate-side margins; URL, caption and safe card-title editing live on the canvas.
- Embed blocks with no valid URL now show a Gutenberg-style URL entry form on the canvas; submitting a valid link reveals Studio's existing safe resource card.
- Hovering a mapped row in the Styles guide tables now shows its matching source details, completing the two-way preview and guide interaction.
- The Styles guide and editor now identify normal and hover button text colours explicitly; each colour can be changed per button variant and updates its temporary live preview.
- Colour and gradient Clear actions and the gradient angle dial marker now follow Gutenberg's accent-blue treatment by default, with their hover and focus feedback retained.
- Separator background colour and gradient now use the shared Gutenberg-style Background control and render on the separator rule in the editor, preview and public renderer.
- Top-level Studio UI Library sections now switch in place without changing the URL; direct section and specimen routes remain entry points.
- Colour palettes now use a Gutenberg-style preview card, six-column theme swatches with selected checkmarks, Clear and a custom Hex/RGB/HSL colour popup shared with the gradient controls.
- Gradient control points now use Gutenberg-style bar insertion, draggable handles and separate colour popups with saturation, hue, alpha and Hex/RGB/HSL controls; removed the standalone Add stop button.
- Background Colour and Gradient use stacked rows and a shared gradient popover with editable stops, opacity, Linear/Radial type, angle controls and Gutenberg’s twelve default presets. Workspace schema v14, publication snapshots v7 and template schema v0.14.0 retain their previous readers and legacy gradient appearances.
- The shared colour picker now matches Gutenberg’s 28px swatches, stronger selected borders, spacing and preview-card proportions while retaining ACM’s semantic theme colours.
- Renamed the Gutenberg `core/separator` block from Divider to Separator in the editor and library labels while retaining the existing `divider` data type.
- Removed the nested Studio tab from block inspectors and consolidated block settings into one panel. Gutenberg controls previously classified under Studio now appear with the other block settings; nonessential ACM-only inspector options are hidden, while essential custom-block content fields and existing saved values remain intact.
- Paragraph Additional CSS is now available in the Gutenberg-owned Advanced settings, with Gutenberg's help text and the existing safe, selector-free declaration handling.
- Button width now lives in Dimensions. Hover, Focus and Active can set their own width and margin with independent reset and canvas preview; mapped core blocks use the shared Advanced inspector for safe Additional CSS declarations. Image visual styles and Spacer CSS declarations now reach their rendered targets.
- Paragraph inspector now uses Gutenberg's Colour label, reserves blue Studio badges for Paragraph-only options, follows Gutenberg's adjacent-paragraph line indent behaviour, lists Border and Dimensions options in Gutenberg order, disables Drop cap for Gutenberg-incompatible text alignment, and preserves legacy drop-cap preferences when alignment changes. Link colour has separate Default and Hover values. Typography Reset all is available for explicit supported values, including default Colour and Size, or revealed optional controls. Paragraph Advanced includes Gutenberg-style descriptions, uppercase field captions and blank empty fields, plus Additional CSS class(es) and safe, block-scoped Additional CSS declarations with HTML-source round-tripping.
- Quote and Group blocks accept managed background images with Gutenberg-style size, repeat and focal-position controls. Template packages remap and preserve these image references. Workspace schema v13 reads versions 2–12, local publication snapshots use v6 and read versions 1–5, and template schema v0.13.0 reads v0.1.0–v0.12.0.
- New Page/Post templates start with dynamic Document Title and Document Subtitle fields. Dynamic field styles apply directly to the rendered heading, input or paragraph. The shared Footer part in new template sets uses `© 2026 Andrew Moss. All Rights Reserved.` Active-store and package migration converts the exact root `Title`/`Subtitle` pair at the canonical starter position in each computed-default template, including legacy defaults with no `isDefault` flag; ambiguous nested copy stays authored text. It folds legacy active subtitle paragraph styles into `visualStyle` and leaves Bin entries and published snapshots unchanged. Small Social Icons keep compact glyphs with expanded transparent hit targets. Template schema v0.12.0 reads v0.1.0–v0.11.0.
- Added Gutenberg's Huge Social Icons size and matched the Small, Normal, Large and Huge artwork scales to Gutenberg. Workspace schema v12 reads versions 2–11; template schema v0.11.0 reads v0.1.0–v0.10.0.
- Added root-level sticky positioning for Group blocks in documents and templates, including typed persistence, previews and HTML source round-tripping. Workspace schema v11 reads versions 2–10, local publication snapshots use v5, and template schema v0.10.0 reads v0.1.0–v0.9.0.
- Added Gutenberg's responsive Grid arrangement to Group and Section blocks, with maximum columns and a minimum column width. Workspace schema v10 reads versions 2–9; template schema v0.9.0 reads v0.1.0–v0.8.0.
- Added independent horizontal and vertical layout gaps for Group, Columns and Column blocks while retaining legacy scalar gap values as fallbacks. Workspace schema v9 and template schema v0.8.0 retain readers for earlier supported data.
- Added Gutenberg-style Social Icons variants, block alignment, separate horizontal and vertical spacing, and link `rel` settings; Separator blocks can now use an `hr` or `div` element.
- Added a searchable, keyboard-dismissible Social Icons picker for adding LinkedIn and TikTok child blocks inside the group in documents and templates.
- Added Gutenberg-compatible Table column-content alignment, Post Title level
  and link settings, Post Date linking, Featured Image sizing/link controls and
  Group semantic element and ARIA label settings, all with typed validation,
  rendering and HTML round-tripping.
- Updated the shared block-width catalogue symbols so their central width bars
  use the filled Gutenberg treatment while retaining original ACM artwork.
- Matched Gutenberg's custom font-size control with an integrated compact unit
  menu, theme-coloured range slider and px/em/rem/vw/vh units.
- Dragged Block Library items now insert at the canvas drop position while keeping the library open for further additions.
- Added Gutenberg-ordered block alignment menus to every analogous core block that declares alignment support, including Left/Centre/Right floating layouts, Wide/Full widths, typed validation, HTML round-tripping and migration from the Image block's legacy Wide display setting.
- Added Image block height, Default/Rounded styles and custom, image-file and lightbox link destinations across editing, previews and HTML round-trip.
- Added Gutenberg-compatible Button width, text alignment, title and link-relation controls, with Fill and Outline labels in the block pane.
- Added Gutenberg-supported border and shadow settings to the Cover Image block, rendered with the shared image style.
- Added Gutenberg-style axis and side controls for block padding and margins, plus linked or separate border widths and corner radii, using Studio's neutral control colours.
- Added custom font sizes and Gutenberg's full weight and italic Appearance choices to shared block Typography settings.
- Moved inspector option menus beside the settings pane and kept Reset all visible beneath scrollable options.
- Added Gutenberg-style text orientation to Paragraph and Heading block settings, with vertical text in Edit and Preview.
- Added List item text formatting and link editing through the shared canvas toolbar.
- Added Gutenberg's ordered-list numbering styles for numbers, letters and Roman numerals, preserving the choice in previews and HTML.
- Preserved inline formatting and links in List items across editing, previews and HTML export while retaining existing plain-text drafts.
- Added Heading Fit text using the existing measured typography control.
- Added captions to Embed blocks across Edit, Preview and HTML editing.
- Added Paragraph Fit text, measured in Edit, Preview and published rendering.
- Added Gutenberg-style optional appearance menus and per-section resets to
  shared block settings, with paragraph line indent, text columns and drop cap.
- Added Quote text alignment and a Plain style to the block inspector.
- Added Spacer width and unit controls, plus spacing and advanced settings for
  Spacer and Embed blocks.
- Expanded block inspectors with shared appearance controls, list numbering,
  table styles, divider variants, image display and accessibility settings,
  and new-tab links. See `docs/block-inspector-compatibility.md` for supported
  WordPress comparisons and remaining gaps.
- Added a dedicated Gutenberg-style Columns block with selectable nested Column
  blocks, responsive widths, WordPress-ordered layout presets and template/HTML
  support. Workspace schema v8 and template schema v0.7.0 read their supported
  earlier versions.
- Added the Panels section at /studio/ui/panels, backed by the shared @acm/panel card component.
- Added the Block Library icon collection, aligned tiles with shared ACM symbols,
  added Studio symbols where the catalogue lacked suitable matches, and included
  template Content with shared icons at their optical scales. Heading tiles use
  a generic marker instead of showing the default H2 level.
- Added keyboard artwork provenance and available licence notices to the
  selected-key inspector.
- Refined the UK keyboard collection to 154 key identities across 144 active
  keyboard symbols, with Inter-metric lettering, Mac-specific UK legends, keycap
  and symbol artwork, and optional Copilot and Mac function-row keys.
- Added a Default keyboard appearance and Reset to Default control, preserving
  the selected key, platform, artwork mode and export size.
- Added custom keyboard symbol, border and fill colours, transparent fills and
  Default, Outline and Dark presets shared by previews and SVG/PNG downloads.
- Added a separate UK Keyboard collection with Mac/Windows filters, keycap and
  symbol views, and SVG/PNG downloads with selectable colour and size.
- Added 13 shared file, media and table-action icons to the Icons catalogue,
  with SVG and PNG downloads at all three optical sizes. The catalogue now
  uses the private ACM Icons v0.6.0 contract with 119 symbols.
- Added a Studio UI Library Styles section at `/studio/ui/styles` with a
  live, responsive preview sandbox for the versioned `@acm/styles` preset.
  New template sets use independent preset defaults; existing sets and
  published snapshots retain their previous appearance.
- Added the full written workspace Style Guide beside the Styles specimens,
  with searchable, line-numbered source, preset-property mappings and a
  revision record. Hovering, focusing or selecting a specimen reveals its
  source passage and compares the sandbox value with the universal baseline.

- Added a Studio UI Library with Workspace, Ribbon, Panes and shared Icons
  sections. Workspace shows the Ribbon and both resizable panes around one
  centre canvas; former Ribbon and Pane URLs redirect to their new sections.

- Added Gutenberg-style paragraph rich-text options for strikethrough,
  subscript, superscript, inline code and keyboard input, including HTML
  round-tripping.
- Added paragraph highlight, language, inline image, footnote and inline math
  options, with safe MathML handling, LaTeX rendering and HTML round-tripping.
  These More-menu icons are original ACM artwork in a reusable Studio module.
- Added WordPress-style post tag chips with Enter or comma entry, removal
  controls and frequently used tag suggestions.
- Made all Page, Post, Studio, Block, Styles and Template inspector sections
  collapsible, with expanded-by-default controls and keyboard-accessible
  disclosure buttons.
- Added Scheduled status for pages and posts, with local post scheduling tied
  to the selected publish date and time. Added a post-only Sticky option that
  pins locally published posts to the top of the Writing archive.
- Added a recoverable Bin for deleted pages, posts, templates and template
  sets. Restore preserves document assignments and local publication snapshots;
  items stay in the Bin until individually and explicitly deleted permanently.
  Bin contents are included in full backups and protect referenced media. A
  template set can remain empty while its layouts are in the Bin.
- Added Bin storage to workspace v6 and template schema v0.5.0, with migration
  support for earlier workspace and template data.
- Added 12 shared ACM interface action and feedback symbols with three optical
  variants each. The catalogue now contains 97 symbols; product controls retain
  their existing icons.
- Added 16 shared ACM text editing and formatting symbols to the icon catalogue,
  with three optical variants each. Product controls retain their existing icons.
- Added a separate Pane Library with working left/right skeletons, persistent
  edge collapse controls, optional regions, structure/token inspection and five
  isolated Studio examples.
- Added pane resizing through the shared edge button in Pane Library examples,
  Studio navigation, the Editor Inspector and both Design Canvas side panes,
  with drag and keyboard controls.
- Fixed cover images can now be stored in reusable templates. The template
  image controls choose or remove the managed fixed image without changing a
  document's own cover image. Template format v0.5.0 reads v0.1.0 through
  v0.4.0 data.
- Template sync conflicts now identify the affected changes and explain the
  difference between the saved version and this tab's version. Template mode
  also keeps its own save status instead of displaying an unrelated Content
  workspace error.
- Moved the Pages, Posts and Templates tabs below the shared Studio tool menu
  in the left navigation.
- Added Design Canvas to the home dashboard's Working Tools alongside the
  other Studio authoring tools.
- Unified the Document/Block/Styles inspector for pages, posts and templates.
  Added inspectable Template Default/Document Override states for Author,
  Category and Tags, display-usage reporting, New from Template and Save as
  Template. Both document kinds now expose the same ordered field controls,
  including template-aware Use Template/Show/Hide display settings and dynamic title, subtitle and cover
  blocks. Workspace v5, template format v0.3.0, publication v4 and backup v4
  readers retain older data and preserve explicit document values.
- Reading Time, Post Author and Post Date as ordinary blocks in the **Other**
  inserter group. Existing posts migrate once to starter metadata blocks;
  author and publication date remain editable document fields, and the former
  fixed `0 Comments` placeholder is no longer rendered.
- Integrated Templates into the Content Studio workspace beside Pages and
  Posts, with an entry count badge, in-place library/editor switching and
  one shared ownership and synchronisation session. The standalone template
  route remains available as a deep link.
- Page/Post/Header/Footer template entries now appear as separate first-class
  items in the shared Content Studio library pane, opening the selected
  template directly in the editor without exposing the internal set hierarchy.
  Existing template sets remain intact for storage and deep-link compatibility.
- Templates are now a sibling authoring mode beside Pages and Posts in the
  Content Studio navigation, while retaining their separate reusable data
  model and `/studio/templates` route.
- Added responsive Group and Section layout controls — Stack, Row and Columns,
  alignment, shared gap and padding presets, constrained/full width, columns
  and the shared 780px/620px stacking rules — plus a selectable Spacer Design
  block. These additive fields round-trip through templates, HTML, backups,
  portable packages and local publication snapshots.
- Added local template sets with a shared block editor, page/post assignments,
  reusable headers and footers, configurable identity/navigation/styles,
  responsive previews, media-inclusive import/export and full backup/restore.
- Locally published posts capture their template design and nested media
  references; later design changes become visible on explicit Update.
- Added the Ribbon Library: live shared-component specimens, isolated product
  demonstrations, structure and token inspection, and original ACM SVG icons.
- Added versioned local design transactions with compatible multi-tab merging,
  conflict review and explicit local or remote resolution for competing edits.
- Added a 1080 × 1920 portrait page preset.
- Arrows now support a draggable centre bend control for custom curved paths.

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

- Design images support subject-aware local background removal for people,
  animals and objects, with an optional portrait mode, soft edge cleanup,
  download progress and cancellation. Original images survive save/reload and
  can be restored; crop, transforms and undo/redo are preserved.

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
- Controls jump navigation follows the specimen at the viewport midpoint as you scroll.
- Aligned UI Library headings, content gutters and specimen spacing across its nine sections; tidied Pane toolbars, mobile Ribbon cards, Panels examples and Blocks disclosures.
- Controls specimens now use production inspector field styling and practical widths, with image previews and compact numeric rows that fit narrow screens. Styles uses readable interface text and stacks its workbench before the desktop columns overflow.
- The Controls jump menu now highlights the specimen at the current scroll position.
- Controls specimens use the library's neutral ink accent throughout their controls and labels.
- Shared inspector reset controls use the standard text colour, including in the UI Library.
- Controls ownership and compatibility disclosures now show an ACM chevron that indicates their expandable state.
- Rechecked mapped block pane ownership against Gutenberg v24.1.0-rc.1 at commit `e3ac73cd69d472341b66c43cb77be36e838f868e`. Moved canvas/toolbar adaptations into Studio, added the default-on Columns mobile toggle and Cover Image Fill scale, restored profile-declared Background controls in the shared inspector, and aligned the live inspector with the capability profiles. Social Icons colour conditions and raw Gutenberg defaults are recorded with the remaining rendered-reference gaps in the compatibility guide.
- Page-level kickers use consistent uppercase styling across all Studio UI Library sections.
- Added a Blocks-local menu on the Block Library index and detail pages. It groups documented entries by their existing block catalogue category and keeps the active page clear.
- Moved ACM-only Code language and Embed card title settings to the Studio inspector tab, keeping Gutenberg-aligned settings in Block.
- Font size controls now show the preset sizes by default, including blocks that have a saved custom size.
- Matched shared inspector default controls to their Gutenberg block declarations while keeping optional and Studio-specific controls available in their menus.
- Grouped the Social Icons block and its LinkedIn and TikTok choices under Widgets in the block library.
- Added LinkedIn and TikTok as standalone Widgets choices; inserting either creates its Social Icons parent automatically.
- The Styles font picker now offers Inter and only the fallback families in
  the shared font stack, while retaining older preset values for compatibility.
- Rebalanced stacked UK number-row and punctuation legends into measured upper
  and lower optical bands, corrected the Mac quote/apostrophe order, and added
  the missing grave and AltGr broken-bar markings to the Windows top-left key.
- Corrected the A key's cap height to match adjacent Inter-derived letter keys.
- Refined the Mac F6 Focus key's crescent and exposed key artwork provenance
  and supplied licence notices in the keyboard inspector.
- Refined keyboard punctuation and long legends with consistent Inter metrics,
  deliberate multiline layouts, larger aligned Mac modifier captions, distinct
  AltGr/Touch ID/Power symbols, a recognisable Context Menu key and clearer
  Copilot geometry. Added Mac UK number-row variants and standardised all twelve
  Mac function keys; transparent outer padding is unchanged.
- Added proportional Backspace, Spacebar and left/right Shift keycaps and
  updated the keyboard catalogue search and wide-key previews. Square, wide,
  tall and ISO frame dimensions are unchanged.
- Updated the shared icon catalogue to ACM Icons v0.5.9, giving Snapping Off
  a clearer slash and horseshoe contour at all three optical sizes.
- Updated the shared icon catalogue to ACM Icons v0.5.8, with clearer Hide,
  layer-order, Snapping, Selection Outline, Settings and Footnote symbols.
- Updated the Ribbon specimen to display the shared 16px regular tabs and 13px regular group/control labels without Studio-specific typography overrides.
- Added a Workspace catalogue control to compare Selected only and Subtle
  hover underline variants across the Ribbon and both Pane specimens; Subtle
  hover remains the shared default.
- Matched the Pane catalogue specimen surface to the Ribbon specimen surface.
- Sized shared Pane and Ribbon tab underlines to their labels at rest, then
  kept unselected hover lines at label width and widened the selected line on
  pointer hover while retaining an edge inset. Keyboard focus keeps label-width
  underlines and the visible focus outline; focused Ribbon tabs do not show a
  second button border.
- Removed the redundant full-width Ribbon divider beneath the tab strip.
- Consolidated the Pane Library structure tree to one Pane entry, with an
  Inspect Side control for comparing the left and right edge controls.
- Applied the Ribbon's neutral ink accent to native range sliders.
- Made the range slider's filled track represent zero accurately at its minimum.
- Aligned block hover and rich-text menu icons with the shared ACM icon library,
  adding the missing reorder and text-formatting symbols there.
- Replaced Gutenberg-derived Studio and table icon paths with original ACM
  artwork while preserving their names, meanings and control sizes. Removed the
  Gutenberg icon attribution and licence files after the source paths were
  removed.

- Reorganised paragraph block settings around Gutenberg's Typography,
  Background, Dimensions and Border sections. Paragraph alignment remains in
  the hover toolbar; the inspector now uses font-size presets, background
  colour or gradient choices, and range-based spacing controls.
- Made the Excerpt and Author sections collapsible and removed their repeated
  field labels.
- Made post excerpts optional; posts without one now use a short summary
  generated from their opening content, with the title as a fallback when no
  summary text can be extracted.
- Kept WordPress-familiar page and post settings together in the main inspector
  tab and moved Studio-specific display and template controls to a separate
  Studio tab.
- Selecting a content block no longer inserts layout padding, so the text and
  surrounding blocks stay in place while its toolbar appears.
- Focused title and subtitle fields now use the same neutral inset edge as
  selected content blocks in document and template editors.
- Replaced blue focus borders with neutral grey indicators across Studio and
  its editor tools while keeping keyboard focus visible.
- Reorganised the Page inspector around identity and publishing controls, with
  secondary metadata in expandable sections. Template assignment, cover image,
  field display and override settings, SEO and page actions remain available.
- Removed the extra top offset from template-rendered body content while
  preserving the normal gap between template elements and body blocks.
- Backspace at the start of a paragraph joins it to the preceding paragraph,
  preserving rich-text formatting and placing the caret at the join.
- Backspace and Arrow Up in the empty block appender return focus to the last paragraph.
- Arrow Down at the bottom of the final paragraph moves focus into the appender.
- Removed explanatory notes from the Publishing and Template sections of the
  Page inspector while retaining their settings and values.
- The Bin now fills the Studio's main workspace pane. Moving a page, post or
  template to the Bin is immediate; the confirmation dialog remains for
  permanent deletion from the Bin.
- Studio tabs now install the persistence owner's latest Content and Template
  snapshot before enabling peer edits, avoid echoing that snapshot as a stale
  local change, preserve in-flight Content and Template edits when ownership
  changes, and report healthy synchronisation instead of a misleading read-only
  warning.
- Empty Author and Publication Date blocks now remain visible in the Studio editor with clear metadata prompts, while previews and publications continue to omit unset values.
- Made template-rendered cover images use the same hover/focus overlay controls
  as direct cover blocks, removing stray text buttons below the image.
- Positioned Edit Header and Edit Footer controls outside the selected part
  boundary so the red selection outline encloses only the part content.
- Centred between-block insertion lines and controls within the shared block gap
  so they sit evenly between the surrounding blocks.
- Made content-fitting block sizing an explicit Studio rule and tightened
  shared Edit/Preview defaults so ordinary blocks do not reserve accidental
  height or spacing. Intentional dimensions remain scoped to block contracts.
- Shared Header and Footer edit controls now sit in a compact side column beside
  their content instead of creating a separate full-width row above it.
- Text controls now present individual font names instead of full CSS font-family stacks.
- Objects and pages now show resize handles at each side centre as well as their corners.
- Page resizing now follows image resizing: Shift switches from proportional to absolute sizing.
- Object resize, rotate and arrow controls now appear while hovering an unselected canvas object and remain visible while dragging arrow endpoints or bend beads.
- Arrow bend beads can now travel beyond the arrow endpoints horizontally while remaining bounded by a generous canvas range.
- Added a Shapes dropdown with squares, rounded squares, circles, triangles, diamonds, pentagons, hexagons and octagons.
- Text objects can be edited directly on the canvas by double-clicking them.
- Undo and Redo now preserve the selected object's inspector when that object still exists in the restored design state.
- Arrow endpoint dragging now shows the same snapping guides as object movement.
- Standardised canvas and arrow handles with grey outlines, purple hover fill and outline, and no blue focus selector.

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
- Canvas frames now use true page-pixel zoom sizing, keeping resize handles
  consistent across page dimensions and leaving objects at the same visual
  scale when the page boundary changes.
- Resize handles no longer show a blue focus selector.
- Page thumbnails now share a consistent preview frame, and dragging a page
  shows the exact insertion position in the page order.

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

- Selected colour previews use a single thin accent border without an extra
  selection ring.
- Their matching settings rows use the same thin blue treatment and a subtle
  background tint.

- Button and interaction previews retain source navigation without additional
  blue source-selection outlines.

- Styles interaction colours use compact groups with readable descriptions and
  aligned colour, hex and reset controls at narrow settings widths.

- Navigation justification now follows its block setting in template editing,
  previews and local output, without a conflicting header wrapper alignment.

- Recovery exports retain unsaved edits' original base revision after a local
  fixture reconnect. Late commits refresh the save status after a saving tab
  resumes from suspension.

- Test and Test2 recover from explicitly rejected editing leases without
  discarding pending drafts, and check server ownership when returning to a tab.

- Local Test and Test2 document navigation now appears in Editing View and its
  Preview, including assigned templates, with links that select the document.

- Local fixture shutdown and restart clean up their own writer locks, preventing stale guards from blocking Test and Test2 site switching.

- Moving a document to the Bin keeps its Pages or Posts tab selected and opens another document of the same kind when available.

- Test reconnects after an expired editing lease or session without discarding
  pending edits. Returning to the tab refreshes its connection; saved-source
  reconciliation and explicit overlap choices remain in place.

- Hovering or focusing a preview colour now highlights its matching Settings
  row and opens Colours, while preserving the pinned source selection.

- The parent List pane separates Content, Settings and Styles. Content selects
  List Items and adds empty items; numbering and Advanced stay in Settings.

- The far-left List Item toolbar button directly selects its parent List and shows that List’s Ordered/Unordered controls, matching Gutenberg; type controls remain hidden on the item toolbar.

- Dashboard and editor navigation now share catalogue-backed tool icons, with
  distinct symbols for Files, Design Canvas, Backup and Bin.

- Between-block insertion controls no longer intercept pointer input over block
  content in compact site layouts.

- Route primary editor actions, featured-image selection, post publishing and
  block insertion, Files, Backup and Design Library controls through the shared
  button colours and hover states.

- Delayed workspace autosaves no longer revert newer typing and create false
  text/runs conflicts. Unsaved owner input also survives incoming peer updates
  before React renders, while genuine overlapping edits remain reviewable.

- Studio now recovers local saving after delayed background heartbeats or
  replies. Try Editing Here reconnects the saving channel, and status messages
  no longer assume another visible tab. Overlapping mounts retain the existing
  writer's safe ownership state.
- Keystrokes typed during reconnection remain in the draft, including before
  the automatic save starts. An unchanged reconnect preserves Undo and Redo.

- Reconnecting Studio tabs recognise their own saved keystrokes before merging
  newer typing, avoiding false text conflicts. Delayed acknowledgements no
  longer cause subsequent edits to be rejected as a future revision.

- Row and Stack inspectors show Justification and Orientation, with optional Alignment and Wrapping. Group block spacing is optional and remains visible when saved values exist.

- Font Size and Border share consistent number/unit fields without spinners and Gutenberg-sized slider thumbs; custom font sliders use a 100px scale.

- Link in Elements displays overlapping Default and Hover colour indicators, following Gutenberg's arrangement.
- Studio Navigation and Editor Inspector remain available through horizontal scrolling at mobile viewport widths.
- New category entry receives focus when opened without automatic page-load focus. Design and template listeners use current editor state, and delayed page renames preserve other edits and respect editing availability.
- Restore clean test and lint checks after block modularisation, including sibling source paths, current inspector contracts and Style Guide provenance tied to guide changes rather than unrelated governance commits.

- Custom padding and margin values retain a continuous slider beside the compact value field.

- Padding and margin sliders retain their view while dragging, use eight preset positions, and preserve side values when switching between axis and individual controls.

- Running site cards identify their current local server address and port from Project Ports.

- ACM Studio’s homepage card now displays its local server status from Project Ports beneath Open Studio, matching the other site cards.

- Local website discovery no longer labels an unconfigured service as stopped merely because its definition has a URL template.

- Footnotes in the Blocks Library now share the editor’s document numbering context, so references and editable notes show matching numbers in Edit and Preview.

- Image Additional CSS now uses the same wrapper target in Edit and Preview, with border and shadow retained on the image itself.

- Quote citations now follow authored block typography in Edit and Preview, retain compact defaults after reset and preserve inner-block overrides.

- List and List Item typography now reaches their bullets/numbers and nested text consistently in Edit and Preview, while preserving item overrides and reset/history.

- Code blocks show authored backgrounds in Edit and Preview and resize after typography changes, reset and Undo/Redo.

- Selected top-level and nested editor blocks now use the semantic alert red outline, including when Focus Outline is Off; hover outlines and multi-block selection shading remain distinct.

- Preserve Template Group semantic elements, ARIA labels and width alignment, Columns alignment and Section visual styles through editing, saving, packages and rendering.

- Highlight retains fresh formatting targets across successive caret colour changes; untouched HTML and Code Apply close without adding Undo history.

- Template caption links now open the shared Link preview, and read-only editor appenders correctly disable input. Block Library entry animations respect reduced motion after adopting the shared Pane.

- Group, Section and Column appenders and open Block Library tiles disable insertion when editing is unavailable; Library search and closing remain usable, and insertion resumes when editing is restored.

- Mini Golf's generic blocks reuse the complete Studio editing contract, preserving nested List and Table formatting targets, caption links, child insertion and each nested block's toolbar.

- Mini Golf's shared block fallback now receives document metadata and managed-media context in Edit, matching Preview for inserted metadata blocks and managed images.

- Social Icons applies border, radius and spacing once in Preview. Default and authored icon colours remain readable when the block has shared styling.

- Featured Image now resolves managed media in Preview and uses consistent image dimensions and scaling in Edit, Preview and templates.

- Top alignment now works for shared layouts. Column-count changes preserve content and honour destination restrictions and block locks across editor contexts and the Library specimen.

- Column width changes update the owning Columns block in Studio and Mini Golf, preserve sibling content, and reserve valid widths for every column. The Library specimen demonstrates the same command and history.

- Local publications retain document-field visibility inherited from the selected
  template or overridden in the document. Hidden fields remain hidden in both
  publication renderers; existing publications keep their previous defaults.

- First-root List Backspace extracts populated items and preserves nested List
  owners when promoting empty items. The Blocks Library now reattaches its
  Undo/Redo shortcuts after Reset Example.

- Corrected nested List Backspace and Delete merging, preserving child List
  ownership, inline references and the caret. Stale structural updates are
  refused, and Library merges have a separate Undo entry.

- Rich-text soft line breaks survive subsequent typing and refocusing, including repeated breaks; the Blocks Library now restores its typed rich-text changes with standard Undo/Redo shortcuts.

- Empty List Return preserves nested content, numbering and metadata; selected nonempty text splits normally. Refused or stale exits leave focus in place.

- List Item outdent preserves reading order by carrying following items beneath the moved item, retains ordered numbering and avoids duplicate block IDs, anchors and notes.

- Separator's HTML element choice now appears in shared Advanced settings,
  following Gutenberg; the Library records its core ownership accurately.

- Content and Templates now retain their mode and selected target through reload
  and browser history. Cancelling navigation preserves an unsaved HTML draft.
  Menus and dialogs keep ownership of Escape and Save shortcuts.

- Publish date controls now show the UTC offset for the selected date in this
  device's local time zone, including daylight-saving changes and fractional
  offsets; saved publication timestamps retain their UTC ISO format.

- Keep caret-format toolbar states in sync with typing, Highlight changes and
  Undo; discard stale observations when fields, table structure or content change.
- Match Group and Buttons default inspector controls while retaining customised
  optional spacing and child styles.

- Cancel stale formatting-form callbacks after another interaction, preserving intentional selection restoration and guarded empty Math cleanup.

- Upward List selection reaches whole blocks through the left gutter and keeps
  continuous red shading across the selected range. Active cross-item selection
  no longer turns into a browser text drag; nested List text selection remains
  available.
- Focus Outline controls retain their shared context when development loads
  separate provider and setting module instances.

- Language formatting now has a checked toggle, caret typing, contiguous active removal, a selection-anchored form and matching direction overrides in Edit, Preview and HTML; stale fields and lost editing ownership cannot receive an old draft.

- Math inserts an inline equation at a caret or selected source, with live syntax editing, parse feedback and source restoration. Edit, Preview and export share its renderer; existing marked equations retain their original prose and formatting.

- Repeated Footnote references have distinct Preview/export anchors and return
  links to the first visible occurrence; Mini Golf runtime Preview retains
  unique presentation identities without changing saved content.
- Partial block Copy/Paste preserves referenced note text and keeps companion
  notes outside restricted parents. Cut retains its source when notes change
  during copying or the clipboard payload cannot be read back.
- Legacy Footnote text remains readable across drafts, Bin entries, templates,
  publications and backups; backup export and restore retain canonical references
  without changing the source during reads.
- Save draft can retry a failed unchanged draft without consuming Undo/Redo.
  Repeated Save waits for pending persistence, and Undo during a write queues
  the restored content; failed and superseded saves retain accurate feedback.

- Buttons now share typography and gap-aware widths across Edit and Preview; Outline content styling and template hover colours follow the same parent/child rules.

- Table row actions retain separate header, body and footer sections, support multiple section rows, and clear stale cell targets after deletion. Root and nested Tables share their action menu and selection handling; final-column deletion returns to table creation.

- More text formatting and Block options use shared viewport-aware menus,
  with keyboard navigation and reliable dismissal focus. Controls includes a
  working menu specimen.
- Nested Lists have their own toolbar and formatting target. Shared commands
  preserve List Item ownership, while Edit, Preview and HTML round trips retain
  nested appearance and Advanced settings.
- Highlight uses immediate Text and Background palettes, preserves the captured selection, and clears each colour independently in the editor and preview.
- Table hover tools have consistent spacing and larger formatting symbols;
  Caption uses an icon from the shared catalogue with state-aware accessible labels.

- Table captions appear centred below the table only after adding them; the shared caption control adds, focuses and removes captions in the editor and Library specimen. Rich-text formatting menus retain full-width clickable rows instead of inheriting compact toolbar button dimensions.

- Table Header and Footer switches now add and remove separate section rows, matching Gutenberg, with undoable changes and preserved body content. Settings resets use the same behaviour; Edit and Preview share section boundaries.

- Editor Apply and Cancel buttons now use the shared Base and Secondary presets, with readable hover colours and a consistent disabled appearance.

- Block None, Wide width and Full width alignment now renders consistently in template-backed Edit, Preview and local publication, while preserving custom content widths and nested layout boundaries.

- Show the chunky drag-to-append bar in place of the typing prompt only while the pointer is over the appender, preserving thin insertion lines between blocks.

- Close the extra selected-block toolbar gap during a block drag, with insertion feedback positioned in the ordinary gap.

- Keep drag insertion targets tied to the pointer position, clear feedback outside the canvas, and suppress block hover toolbars while dragging.

- Centre the grey add-block control between editor blocks, including template grid spacing and selection toolbars, and show a thick blue bar when dragging to the end.

- Corrected all Blocks and Controls catalogue disclosures: control availability, canvas/summary placement, nesting, document context, reusable dependencies and state behaviour now describe the current implementation. Recorded Gutenberg defaults are separate from Studio insertion defaults, and safe Additional CSS limits are explicit.

- Heading splitting and merging, and List empty-item exit and adjacent-item merging while retaining inline formatting and nested items.


- Preserve inline formatting and shared block styling when converting text blocks, retain Title and Featured Image presentation through template edits and saves, and keep nested social-link anchors, classes and styles in Preview. Template schema v0.18.0 retains readers for v0.1.0–v0.17.0.

- Matched the Heading pane to the supplied Gutenberg reference with a selected-level header, reusable H1–H6 summary buttons, toolbar alignment and rectangular font-size presets; new Headings show Colour/Gradient backgrounds while saved images remain editable.

- Selecting an empty Group's layout changes its variation without automatically opening the Block Library.

- Aligned Paragraph, Heading, List, Quote, Table, Code and List Item panes around shared Gutenberg-style controls, supported-field resets and Fit text/size behaviour; added reusable toggle/style specimens, image backgrounds and signed list starts.

- The docked Block Library remains open after choosing a block, preserving search and insertion context so successive choices appear in order.
- Block selection can now start or finish in the empty bottom appender, including a single final block, without creating a placeholder block or disturbing an appender draft.
- Inspector menus and floating settings now consistently open to the left of their owning pane in editors and catalogue specimens, including nested colour/gradient editors and font-size unit menus. Pane contract v1.1.0 adds a shared overlay ownership boundary and resize/scroll positioning.

- Group block settings now use Gutenberg-style colour and background rows, segmented spacing sliders and compact border controls. The reusable spacing slider is available in the Controls catalogue; existing custom measurements remain editable.
- Restored the Studio typecheck by correcting native event types, nullable
  selection values and isolated Mini Golf inspector inputs, and resolving
  shared React types through a dedicated check configuration.
- Enlarged and standardised the hover background for Clear actions across Studio.
- Matched the gradient insert handle's circle size to the gradient stop handles.
- Gradient stop handles now show a pointer cursor on hover.
- Kept the written Style Guide table stable while hovering typography rows by showing the row's representative size value instead of the full preset object.
- Changed the colour picker Clear action and gradient angle dial marker to the standard ink colour.
- Corrected the shared colour picker’s oversized popup, preview and swatches to use compact CSS dimensions rather than Retina screenshot dimensions.
- Controls catalogue cards keep their width when ownership and compatibility details are expanded.
- Restored the shared Controls group-anchor helper so the catalogue renders after the active-navigation extraction.
- Made all three Paragraph catalogue examples selectable and editable, moved indentation guidance outside the canvas, collapsed detailed documentation, and narrowed Controls specimens to inspector width with compact state and ownership disclosures.
- Fixed the Styles section's long written guide content from creating a large blank scroll area below the final specimen.
- Standardised Studio inspector number fields to a shared 80px width that fits six digits, including font size, paragraph length and box dimensions.
- Kept the Inspector options specimen's control and toggle positions stable while changing menu options or hiding its example field.
- Kept the narrow Editor Inspector tab underline centred beneath its label, including on hover.
- Replaced the inaccurate Copilot key drawing with a sourced, MIT-licensed
  monochrome brand mark, retaining its licence in SVG downloads.
- Enlarged small keyboard legends and Mac Forward Delete, redrew the Copilot
  mark from the supplied reference, widened numeric keypad zero, and kept the
  Spacebar legible in the catalogue. Mac filtering now hides Windows-only keys.
- The Mac Fn/Globe key now keeps a visible gap between the globe and its lettering
  in the keyboard catalogue and downloaded artwork.
- Improved the Mac F1–F12 keyboard previews and exports with larger, aligned
  action pictograms and clearer Brightness Down/Up symbols.
- Enlarged the tiny Command, Option and Control captions in Mac keycap previews
  and SVG/PNG exports while keeping standalone symbols clear of captions.
- Updated active Bold and Italic controls to use WordPress-style dark pressed styling.
- Bold and Italic toolbar buttons now reflect whether selected text is marked,
  including an accessible mixed state for selections with varied formatting.
- Resetting a document field's display setting to Use Template now reads the
  stored override state instead of the canvas's resolved template values.
- Keep the rename dialog's initial text selection from resetting while typing.
- Changed the New post and New page plus icons to black.
- Changed the Publish date popover's Now action, month arrows and selected day
  to black, with a neutral grey hover state.
- Restored the selected block toolbar above each block instead of in the left
  gutter, without changing the document layout when a block is selected.
- Selecting a post or page title and subtitle now selects the corresponding
  document field in the Block inspector, including in assigned site templates.
- Blank-line-separated text now becomes distinct paragraph blocks in the editor,
  and Up/Down navigation moves between adjacent text blocks at their edges.
- Up Arrow now recognises the first visual line more reliably and moves to the
  previous paragraph in one keypress while retaining the horizontal position.
- Right Arrow at the end of a paragraph now moves to the next paragraph or the
  empty block appender when it follows the last paragraph.
- Left Arrow at the start of a paragraph or in the empty block appender now
  moves the caret to the previous paragraph.
- Make room for the selected block toolbar in the gap between paragraphs so it
  stays clear of their text.
- Keep the floating text toolbar above its selected block so it never covers
  paragraph text as the caret moves.
- Allow deleting the last local page or post, validate and synchronise an empty
  content workspace, and show page/post creation actions instead of a phantom
  document.
- Deleting the selected page or post now saves a fallback only when the
  receiver's own selection was removed. This prevents validation errors without
  replacing a valid tab-local selection.
- Document Rename now uses a Studio dialog instead of a browser prompt and
  preserves open code edits.
- Document Duplicate stays unavailable while code edits are pending, avoiding a
  browser prompt and a stale copy.
- Deleting a shared part removes its references while preserving unrelated
  empty groups and sections.
- Gave the Ribbon Library's Studio demo canvas a clear sample layout, on-page
  duplicate placement and correctly sized scrolling at different zoom levels.
- Prevented Content and Template edits from conflicting with their own earlier
  saves, kept unsaved edits through independent tab updates and writer handover,
  and stopped new tabs from resetting existing peers. Content conflicts now
  identify the overlapping fields and explain the existing resolution choices.
- Adding an unset optional field such as Category no longer causes a false
  conflict; repeating a deletion of an already-absent field is also harmless.
- Tightened the selected dynamic Cover Image block so its red editor border
  hugs the image without exposing the cover's outer spacing as empty block area.
- Kept dynamic Subtitle blocks to the template's normal body size and removed
  their internal paragraph margins so their selected bounds fit the text.
- Command+S on macOS and Ctrl+S on Windows/Linux now perform the active
  post's Update action instead of opening the browser Save Page dialogue.
- Text alignment controls now use neutral grey selected and hover states with
  matching dark text instead of blue emphasis.
- The main Add block control now uses the black primary button treatment.
- Successful local publication feedback now dismisses automatically after a
  short period; actionable errors remain visible until dismissed.
- Template sets now keep all of their templates and shared parts expanded in
  the library pane instead of collapsing the set contents into a scroll area.
- List editing now creates and focuses the next item on Return, with ordered
  lists numbering it automatically; the permanent canvas Add item control has
  been removed while Shift+Return remains available for line breaks. Backspace
  removes an empty item and returns focus to the previous item. List items no
  longer show a focus underline or an inline remove icon.
- Standardised compact top-level block spacing at 20px across Edit and Preview,
  while keeping intentional cover and nested-layout spacing unchanged.
- "Use My Change" now applies the chosen edit against the latest saved
  workspace, preserves unrelated tab edits and updates the canvas after saving.
  Other tabs no longer mistake a broadcast rejection for their own conflict.
- Studio no longer treats a block insertion or deletion as a competing reorder.
  Choosing the local order retains unrelated blocks from the other tab;
  unsafe nested conflicts remain visible instead of losing edits silently.
  Unresolved choices survive session restarts in the same open editor. The
  cross-tab protocol is now v2 so older tabs cannot apply unanchored inserts.
- Preserved legacy publication metadata displays, avoided duplicate template
  metadata for migrated documents using the new blocks, and generated
  collision-safe IDs during workspace migration.
- Prevented older cross-tab save acknowledgements from replacing newer local
  edits or reporting queued work as saved; conflict resolution now retains
  unrelated peer fields and keeps failed choices visible for retry.
- Design saves now discard unreferenced image assets and show a clear recovery message when browser storage quota is exceeded.
- Double-clicking a canvas text box now reliably opens its inline editor.
- Page navigation now remains local to each tab and is not reset by a synchronisation acknowledgement after selecting an object.

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
- Added `{copyright}`, `{year}` and `{site-title}` placeholders to template copyright text, with a current-year default for new template sets.
- Fixed custom font-size slider dragging so the value commits on release without switching back to presets, including when the pointer is released outside the slider. Releasing without changing the value does not add an undo entry.
