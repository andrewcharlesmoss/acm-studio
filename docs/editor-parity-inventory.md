# Editor block and control inventory

## Scope and working baseline

Snapshot: 4 October 2026, local branch `codex/panel-library`, HEAD `f451d0aacb2f20dee6ee375ec38026ebc202da9f`, with authorised uncommitted parity work. This is an inventory of the current working tree, not a release or an immutable source snapshot.

Andrew’s revised priority is to finish the inventory, fix the highest-impact broken behaviours, reuse accepted evidence unless related code changes, run focused checks after each fix and the full suite once near the end, and defer lower-priority visual differences.

Reference: Gutenberg v24.1.0-rc.1 at `e3ac73cd69d472341b66c43cb77be36e838f868e`. The workspace Style Guide and project AGENTS.md are unversioned working sources read on 4 October 2026. The implementation route remains Explorer → sole Builder → independent read-only Verifier. Work remains local.

The existing [parity progress record](editor-parity-progress.md) owns dated acceptance evidence. The [compatibility record](block-inspector-compatibility.md) owns intentional differences and unsupported features. A listed control is not a passed interaction; no whole block is yet certified across every context.

## Coverage and source ownership

The current canonical catalogue has 29 entries: 25 editor entries plus Column, Footnotes, Component and template Content. Capability profiles contain 402 control records, including 9 theme-gated and 10 model-only records; List Item has another 16 records. These are metadata records, not unique widgets: composite controls and repeated IDs must retain their separate field ownership.

The tables below also include the catalogue documentation projection’s additional canvas and summary records. Hidden retained attributes and model-only capabilities are labelled separately. Conditional controls are listed even when a particular fixture does not expose them.

All block inspectors are composed by `app/studio/studio-inspectors.tsx`; item-owned styles use `app/studio/blocks/list-item-inspector.tsx`. Canvas actions are composed by `app/studio/studio-canvas.tsx`. Shared controls own their presentation; feature commands own mutation and history.

Known metadata drift must be resolved against those production owners: the documentation projection still describes Table reset as moving section rows into the body, Buttons gaps as native numeric inputs, and List/Quote inline-image availability as excluded. Existing accepted cohorts and current production code supersede those statements; the inventory does not count the stale statements as behavioural evidence.

| Entry | Production owners | Acceptance status |
| --- | --- | --- |
| Paragraph (paragraph) | ParagraphInspector; text-block-settings-inspector | Partial evidence; remaining controls/contexts unverified. |
| Heading (heading) | HeadingLevelSetting; ParagraphInspector; Canvas heading controls | Partial evidence; remaining controls/contexts unverified. |
| Quote (quote) | BlockInspector Quote settings; ParagraphInspector; Quote child/citation editors | Partial evidence; remaining controls/contexts unverified. |
| List (list) | ListField; ListSettingsInspector; list-structure; list-boundary; list-root-boundary | Partial evidence; remaining controls/contexts unverified. |
| Table (table) | TableSettingsInspector; TableField; TableControls; TableCaptionControl; table-actions | Partial evidence; remaining controls/contexts unverified. |
| Code (code) | ParagraphInspector; Canvas Code editor | Partial evidence; remaining controls/contexts unverified. |
| Image (image) | ImageInspector; Canvas Image/caption; image dimensions/media controls | Partial evidence; remaining controls/contexts unverified. |
| Embed (embed) | EmbedSettingsInspector; Canvas Embed/caption editor | Partial evidence; remaining controls/contexts unverified. |
| Separator (divider) | DividerInspector; shared appearance controls | Partial evidence; remaining controls/contexts unverified. |
| Footnotes (footnotes) | Canvas note editor; typed reference/companion operations; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Buttons (buttons) | BlockInspector Layout; LayoutSpacingSetting; Canvas Buttons | Partial evidence; remaining controls/contexts unverified. |
| Button (button) | BlockInspector Button/state; rich label editor; ButtonLinkControl | Partial evidence; remaining controls/contexts unverified. |
| Field (field) | BlockInspector Field; fieldSelectOptions; Canvas Field | Partial evidence; remaining controls/contexts unverified. |
| Spacer (spacer) | SpacerInspector; spacerOrientationForChildren | Partial evidence; remaining controls/contexts unverified. |
| Title (document-title) | BlockInspector Title; document metadata; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Document Subtitle (document-subtitle) | MetadataAlignment; document metadata; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Featured Image (cover-image) | CoverImageInspector; document media; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Reading Time (reading-time) | BlockInspector Reading Time; readingTimeDisplay; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Author (post-author) | BlockInspector Author; documentAuthor; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Date (post-date) | BlockInspector Date; document date formatting; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Social Icons (social-icons) | BlockInspector Social Icons; shared spacing; Canvas Social Icons | Partial evidence; remaining controls/contexts unverified. |
| LinkedIn (social-linkedin) | BlockInspector social child; Canvas child controls | Partial evidence; remaining controls/contexts unverified. |
| TikTok (social-tiktok) | BlockInspector social child; Canvas child controls | Partial evidence; remaining controls/contexts unverified. |
| Section (section) | LayoutInspector; BlockInspector role/source; ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |
| Group (group) | LayoutInspector; GroupDimensionsInspector; GroupPositionInspector; GroupLayoutSelection; AllowedBlocksInspector | Partial evidence; remaining controls/contexts unverified. |
| Columns (columns) | ColumnsInspector; LayoutGapsInspector; Columns layout chooser | Partial evidence; remaining controls/contexts unverified. |
| Column (column) | ColumnInspector; AllowedBlocksInspector; Column drop positioning | Partial evidence; remaining controls/contexts unverified. |
| Component (component) | ComponentInspector; registered property whitelist | Partial evidence; remaining controls/contexts unverified. |
| Content (template-content) | Template projection; BlockInspector(contentSlot); ParagraphInspector | Partial evidence; remaining controls/contexts unverified. |

### Additional editing contexts

| Context | Ownership / inventory |
| --- | --- |
| List Item | Item-owned style and Advanced controls; nested List wrappers; shared List selection and structural commands. |
| Group / Row / Stack / Grid | Variations of Group, using the same block ID, profile and layout command; conditional wrapping, widths, alignment, gaps, dimensions and position. |
| Quote children / citation | Nested Paragraph, Heading, List, Quote and Image controls; separate rich attribution owner. |
| Table cells / caption | Rich formatting target, column alignment, section-aware row/column actions, optional caption and caption formatting. |
| Image / Embed captions | Separate rich caption targets; shared formatting and field ownership. |
| Individual social children | LinkedIn/TikTok URL, label and rel; parent owns label visibility and new-tab behaviour. |
| Template and Mini Golf adapters | Shared editor controls with distinct document/projection owners and supported history/persistence boundaries. |

### Selection and command contexts

| Context | Availability and acceptance boundary |
| --- | --- |
| Caret / non-empty text range | Simple marks, Highlight and Language have caret or range paths. Link currently rejects a caret. Capture and restore the correct rich field rather than relying on whichever DOM selection remains after opening a form. |
| Existing format extent | Editing or clearing an existing Link, Highlight or Language must respect its contiguous formatted range and retain other marks. Existing-link editing at a caret remains in the priority queue. |
| Exact inline atom / wider range | Math and Inline Image objects have one logical text slot. Their edit/replace forms target the exact object; a wider range must not accidentally edit a neighbouring atom. Footnotes own referenced companions. |
| Multiple List Items | Native text ranges can span items. Supported simple formatting applies across the range; single-item forms/actions retain their explicit restriction. Clipboard and replacement must preserve nesting and companions. |
| Whole / multiple blocks | Drag-selection shading and block actions operate on canonical block IDs. Parent/descendant normalisation, locks, required content and clipboard/history rules constrain the operation. |
| Empty, nested, hidden, locked or read-only target | Empty prompts and parent policies affect availability. Hidden/locked owners remain recoverable; an ownership refusal must leave document content and history unchanged. |

## Toolbar and menu inventory

| Surface | Actions / controls | Owning source |
| --- | --- | --- |
| Common block toolbar | Transform; drag; Move up/down; block alignment and widths; text alignment; Duplicate; Remove; Options. | Canvas; BlockTransformControl; sibling and placement operations. |
| Heading | H1–H6 level selection. | Canvas Heading menu; HeadingLevelSetting. |
| Table | Column alignment; Insert row before/after; Delete row; Insert column before/after; Delete column; Caption toggle. | TableControls; table-actions; TableCaptionControl; Canvas alignment menu. |
| Rich text | Bold; Italic; Link; Footnote; Highlight; Inline code; Inline image / Replace image; Keyboard input; Language; Math; Strikethrough; Subscript; Superscript. | Canvas dispatcher; typed run operations; focused formatting forms. |
| Block options | Copy; Cut; Duplicate; Add before; Add after; Add/Edit note; Copy/Paste styles; Group/Ungroup; Lock; Rename; Hide/Show; Edit as HTML; Delete. | BlockOptionsMenu; Canvas action dispatch; canonical commands and clipboard contracts. |
| Inspector tools | Optional visibility; individual Reset; Reset all; Table Settings/Styles; Button state preview; Group variation; Advanced; Allowed Blocks. | InspectorToolsSection; shared accordion, pane tabs and inspector components. |
| Workspace panes | Page/Post; Studio; Block; Styles; resize/collapse; List View; Block Library. | Pane; PaneTabs; PaneTabPanel; navigation pane; Canvas. |

Each applicable action retains these acceptance requirements: correct target and disabled/selected state, preserved text selection/content, repeat-trigger dismissal, Escape/focus return, outside dismissal, pointer/keyboard reachability, viewport bounds, ownership refusal and Undo/Redo for mutations.

### Formatting and block-action forms

| Form / subordinate control | Exposed controls and owner |
| --- | --- |
| Link | Text; URL/search; internal suggestions; Advanced → Open in new tab; Apply; Cancel; existing-link preview/Edit/Remove. Canvas Link editor and LinkPreviewPopover. |
| Button destination | Own destination link/unlink control and destination editing. ButtonLinkControl; separate from inline links within ordinary rich text. |
| Highlight | Text/Background tabs; selected/mixed/no-colour preview; palette swatches; custom colour picker; independent Clear; Close. HighlightPopover composes shared ColourSwatches and GradientStopColour. Custom colours include the picker’s colour channels and alpha. |
| Language | Language code; Text direction (left/right); validation/conflict feedback; Apply; Cancel; active-format removal. LanguagePopover and Canvas format dispatch. |
| Math | LaTeX/MathML input format; corresponding syntax editor; accessible description; Close; captured-object update and empty-expression cleanup. MathPopover and typed Math operations update the expression displayed in the canvas as edits are accepted. |
| Inline Image insert/replace | Available local-image choices/loading state; external Image URL; Alternative text; Insert/Replace; Cancel. InlineImagePicker, with explicit media-provider availability. |
| Inline Image edit | Width or Auto; Alternative text; changed/valid/conflict state; Apply; Replace image; Close. InlineImagePopover. |
| Footnote | Reference insertion; companion note text editor; reference/note navigation; guarded reference/owner removal. Canvas note editors and typed Footnote operations. |
| Block name / note / lock | Block name; Note text; Disable movement; Prevent removal; Save; Cancel. BlockEditorialDialog. |
| Edit as HTML | Supported-markup source; validation/freshness feedback; Apply; Cancel. Canvas HTML editor and shared typed parser. Template HTML remains unavailable. |

## Behavioural priority queue

| Priority | Confirmed local defect | Next bounded acceptance |
| --- | --- | --- |
| 1 | Link opening/application rejects a collapsed caret; existing-link lookup only runs for a non-empty range. `studio-canvas.tsx`, openLinkEditor/applyLink. | Establish pinned caret insertion/existing-link semantics; preserve selected-text behaviour, typed objects, guarded target freshness, read-only refusal and history. |
| 2 | Final List forward Delete is prevented when the internal helper has no following line; it cannot merge an external Paragraph/List. ListField and list-boundary. | Add a distinct sibling-boundary command after the pinned reference comparison; retain accepted internal merges and wrapper metadata. |
| 3 | First-root backward handling does not inspect the preceding editable sibling for joining. list-root-boundary and exitList. | Confirm the exact pinned adjacent-block rule before changing accepted root extraction; preserve content, markers, locks, anchors, history and focus. |

Source absence is confirmed for the three cases above; fresh upstream retrieval for the external joining rules remains unavailable in this inventory pass. Unverified cases elsewhere remain unverified rather than being labelled defects.

### Accepted evidence to retain

Reuse the progress record’s accepted bounded cohorts for shared menu placement/dismissal, nested ownership, Table sections/actions, Button label/destination, typed Footnote/Image/Math, Language, List selection, Column drop, Focus Outline context identity, list outdent/empty Return/internal merging/root extraction, and specimen history. Reopen only affected checks when related code changes.

### Deferred work and checks

Defer lower-priority icon colours, snapping colours, Design neutral colour policy and minor spacing/silhouette differences. Unsupported product capabilities remain explicit in the compatibility record. Saved reload/export, mounted Template/Mini Golf, actual ownership refusal, IME and 200% zoom evidence remain open where the progress record lists them.

The partially migrated behaviour test file follows current shared owners. Independent review accepted the bounded migration after restoring the unresolved Design colour expectation: 150 single-file tests, 129 passing and 21 failing. Failures remain visible; no full suite was run during this revised-priority inventory pass.

## Per-block control records

This section is a source inventory generated from the current capability profile and documentation projection. The Production owners table and explicit metadata-drift note take precedence when checking actual placement or behaviour. `theme-gated`, `model-only` and `hidden retained` records do not imply exposed controls.

### Paragraph (paragraph)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Line indent (line-indent) | gutenberg; inspector | textIndent |  |
| Columns (columns) | gutenberg; inspector | textColumns |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Drop cap (drop-cap) | gutenberg; inspector | dropCap | Disabled for centre/right alignment; saved value is retained. |
| Fit text (fit-text) | gutenberg; inspector | fitText |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Gutenberg theme typography settings provide font families; not enabled in Andrew's current reference. |
| Orientation (orientation) | gutenberg; theme-gated | orientation | Gutenberg writing mode is enabled in editor settings; not enabled in Andrew's current reference. |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Minimum height (min-height) | studio; hidden retained | minHeight |  |
| Minimum width (min-width) | studio; hidden retained | minWidth |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | studio; hidden retained | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor (advanced) | gutenberg; inspector | anchor |  |
| Additional CSS class(es) (class-name) | gutenberg; inspector | className |  |
| Additional CSS declarations (additional-css) | gutenberg; inspector | additionalCss |  |
| Text alignment (text-alignment) | gutenberg; canvas | align |  |
| None/Wide/Full block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |

### Heading (heading)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Level (level) | gutenberg; summary | level |  |
| Text alignment (text-alignment) | gutenberg; canvas | align |  |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Requires typography configuration absent from the captured Gutenberg theme. |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Orientation (orientation) | gutenberg; theme-gated | orientation | Requires typography configuration absent from the captured Gutenberg theme. |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Text shadow (text-shadow) | gutenberg; theme-gated | textShadow | Requires typography configuration absent from the captured Gutenberg theme. |
| Fit text (fit-text) | gutenberg; inspector | fitText |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY | Image detail controls appear for a saved managed image; a new Heading has no image picker. |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Quote (quote)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Style (style) | gutenberg; inspector | quoteStyle |  |
| Attribution text (attribution) | gutenberg; inspector | attribution |  |
| Text alignment (text-alignment) | gutenberg; canvas | align |  |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Requires typography configuration absent from the captured Gutenberg theme. |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Minimum height (min-height) | gutenberg; inspector | minHeight |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |
| Rich citation (citation) | gutenberg; canvas | attribution, attributionRuns |  |

### List (list)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Bullets or numbers (list-style) | gutenberg; inspector | style |  |
| Ordered numbering style (ordered-style) | gutenberg; inspector | marker | When the list is ordered. |
| Start value and reverse order (start-reverse) | gutenberg; inspector | start, reversed | When the list is ordered. |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Requires typography configuration absent from the captured Gutenberg theme. |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Table (table)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Table alignment (table-alignment) | gutenberg; canvas | blockAlign |  |
| Per-column content alignment (column-alignment) | gutenberg; canvas | columnAlignments |  |
| Fixed or adaptive cell width (fixed-width) | gutenberg; inspector | fixedWidth |  |
| Header and footer rows (header-footer) | gutenberg; inspector | hasHeader, hasFooter, headerRowCount, footerRowCount | Available only for a non-empty table. |
| Default or Stripes (table-style) | gutenberg; inspector | tableStyle |  |
| Caption (caption) | gutenberg; canvas | caption, captionRuns |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Requires typography configuration absent from the captured Gutenberg theme. |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Code (code)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| None or Wide alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Font family (family) | gutenberg; theme-gated | fontFamily | Requires typography configuration absent from the captured Gutenberg theme. |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Language and syntax highlighting (language) | studio; model-only | language | Stored or supported internally; no inspector control is implemented. |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Image (image)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Image source (source) | gutenberg; inspector | src, mediaId | File selection requires canOpenFiles; external URL entry is available only without mediaId. |
| Alternative text or decorative state (alternative-text) | gutenberg; inspector | alt, decorative | Alt editing is disabled for Decorative; linked images cannot be Decorative. |
| Caption (caption) | gutenberg; canvas | caption, captionRuns |  |
| Link destination (link-destination) | gutenberg; inspector | linkDestination, linkUrl, opensInNewTab | Custom URL input appears only for Custom; new-tab applies to custom/media links. |
| Default or Rounded (image-style) | gutenberg; inspector | imageStyle |  |
| Display width and height (display-dimensions) | gutenberg; inspector | displayWidth, displayHeight |  |
| Aspect ratio (aspect-ratio) | gutenberg; inspector | aspectRatio |  |
| Cover or contain (scale) | gutenberg; inspector | scale | When a non-original aspect ratio is selected. |
| Focal position (focal-position) | gutenberg; inspector | focalX, focalY | When an image source is set, a non-original aspect ratio is selected and Scale is Cover. |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | title, visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Embed (embed)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Resource URL (url) | gutenberg; canvas | url |  |
| Rich-text caption (caption) | gutenberg; canvas | caption, captionRuns |  |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Accessible player title (card-title) | studio; canvas | title |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Separator (divider)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Default, wide or dots style (divider-style) | gutenberg; inspector | style |  |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |
| HTML element (hr or div) (element) | gutenberg; inspector | tagName |  |

### Footnotes (footnotes)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |
| Editable note text (footnote-notes) | gutenberg; canvas | notes[].id, notes[].text |  |

### Buttons (buttons)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Justification (justification) | gutenberg; inspector | justification |  |
| Orientation (orientation) | gutenberg; inspector | orientation |  |
| Allow wrapping (wrapping) | gutenberg; inspector | allowWrap |  |
| Button spacing (gap) | gutenberg; inspector | horizontalGap, verticalGap |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| None/Left/Centre/Right/Wide/Full alignment (outer-alignment) | gutenberg; canvas | blockAlign |  |

### Button (button)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Button label (label) | gutenberg; inspector | label |  |
| Link destination (url) | gutenberg; inspector | url |  |
| Open in a new tab (new-tab) | gutenberg; inspector | opensInNewTab |  |
| Fill or Outline appearance (appearance) | gutenberg; inspector | style |  |
| Text alignment (text-alignment) | gutenberg; inspector | align |  |
| Title and rel attributes (title-rel) | gutenberg; inspector | title, rel |  |
| Button width (width) | gutenberg; inspector | width |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Letter case (letter-case) | gutenberg; inspector | textTransform |  |
| Letter spacing (letter-spacing) | gutenberg; inspector | letterSpacing |  |
| Decoration (decoration) | gutenberg; inspector | textDecoration |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |
| Default/Hover/Focus/Active style state (interaction-state) | studio; summary | interactionStyles | Show state on canvas is a temporary preview option. |

### Field (field)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Field label (label) | studio; inspector | label |  |
| Text or select control (control) | studio; inspector | control |  |
| Example value (value) | studio; inspector | value |  |
| Select options (options) | studio; inspector | options | When the control type is Select. |

### Spacer (spacer)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Height or width according to parent orientation (size) | gutenberg; inspector | height, heightUnit, width, widthUnit |  |
| Margin (margin) | gutenberg; inspector | visualStyle.margin |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Title (document-title)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Text alignment (text-alignment) | gutenberg; inspector | align |  |
| Heading or Paragraph level (level) | gutenberg; inspector | level |  |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Post link, new tab and rel (link) | gutenberg; inspector | isLink, linkTarget, rel | New-tab and rel appear only when Post link is enabled; the document destination determines whether the link renders. |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Document Subtitle (document-subtitle)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Colour (colour) | studio; inspector | textColor |  |
| Size (size) | studio; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | studio; inspector | appearance |  |
| Line height (line-height) | studio; inspector | lineHeight |  |
| Background colour or gradient (background) | studio; inspector | backgroundColor, backgroundGradient |  |
| Margin (margin) | studio; inspector | margin |  |
| Text alignment (text-alignment) | studio; inspector | align |  |

### Featured Image (cover-image)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |
| Post link, new tab and rel (link) | gutenberg; inspector | isLink, linkTarget, rel | New-tab and rel appear only when Post link is enabled. |
| Display width and height (display-dimensions) | gutenberg; inspector | displayWidth, displayHeight |  |
| Aspect ratio (aspect-ratio) | gutenberg; inspector | aspectRatio |  |
| Cover, Contain or Fill (scale) | gutenberg; inspector | scale | When a non-original aspect ratio is selected. |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Alignment (text-alignment) | studio; hidden retained | align |  |
| Studio focal position (focal-position) | studio; hidden retained | focalX, focalY | Studio-only when a non-original aspect ratio is selected and Scale is Cover. |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Reading Time (reading-time)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Reading time or word count (mode) | gutenberg; inspector | mode |  |
| Show time range (range) | gutenberg; inspector | showRange | Available in reading-time mode; hidden in Words mode. |
| Alignment (alignment) | gutenberg; inspector | align |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Prefix (prefix) | studio; inspector | prefix |  |
| Badge or plain text (presentation) | studio; inspector | presentation |  |

### Author (post-author)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Alignment (alignment) | gutenberg; inspector | align |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| Prefix (prefix) | studio; inspector | prefix |  |
| Initials avatar (avatar) | studio; inspector | avatar |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Date (post-date)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Date format (format) | gutenberg; inspector | format, customFormat | Custom format input appears only when Custom is selected. |
| Published or modified date (date-source) | gutenberg; inspector | dateSource |  |
| Post link (link) | gutenberg; inspector | isLink |  |
| Alignment (alignment) | gutenberg; inspector | align |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| Clock icon (show-icon) | studio; inspector | showIcon |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Social Icons (social-icons)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| LinkedIn and TikTok children (children) | gutenberg; canvas | children |  |
| Default, Logos Only or Pill Shape (style) | gutenberg; inspector | socialStyle |  |
| Justification (justification) | gutenberg; inspector | justification |  |
| Orientation (orientation) | gutenberg; inspector | orientation |  |
| Allow wrapping (wrap) | gutenberg; inspector | allowWrap |  |
| Small, Normal, Large or Huge (icon-size) | gutenberg; inspector | iconSize |  |
| Text labels (labels) | gutenberg; inspector | showLabels |  |
| Open links in a new tab (new-tab) | gutenberg; inspector | openInNewTab |  |
| Separate horizontal and vertical gaps (axis-gaps) | gutenberg; inspector | horizontalGap, verticalGap |  |
| Colour (colour) | gutenberg; inspector | textColor | Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected. |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient | Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected. Icon background is omitted in Logos Only mode. |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |
| None/Left/Centre/Right alignment (outer-alignment) | gutenberg; canvas | blockAlign |  |
| Spacing → Gap (both axes) (scalar-gap) | gutenberg; inspector | horizontalGap, verticalGap | Mixed when the axes differ; clear removes both overrides. |

### LinkedIn (social-linkedin)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Profile URL (profile-url) | gutenberg; inspector | url |  |
| Text label (label) | gutenberg; inspector | label |  |
| Link rel (rel) | gutenberg; inspector | rel |  |
| Studio HTML anchor and classes (advanced) | studio; model-only | visualStyle.anchor, visualStyle.className | Stored or supported internally; no inspector control is implemented. |

### TikTok (social-tiktok)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Profile URL (profile-url) | gutenberg; inspector | url |  |
| Text label (label) | gutenberg; inspector | label |  |
| Link rel (rel) | gutenberg; inspector | rel |  |
| Studio HTML anchor and classes (advanced) | studio; model-only | visualStyle.anchor, visualStyle.className | Stored or supported internally; no inspector control is implemented. |

### Section (section)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Arrangement (layout) | gutenberg; inspector | layout |  |
| Horizontal and vertical alignment (alignment) | gutenberg; inspector | horizontalAlign, verticalAlign |  |
| Horizontal and vertical gaps (gaps) | gutenberg; inspector | gap, columnGap, rowGap |  |
| Horizontal and vertical padding (padding) | gutenberg; inspector | paddingX, paddingY |  |
| Content width (content-width) | gutenberg; inspector | contentWidth |  |
| Column count (columns) | gutenberg; inspector | columns | When the layout is Columns. |
| Grid columns and minimum width (grid) | gutenberg; inspector | columns, minColumnWidth | When the layout is Grid. |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Minimum height (min-height) | gutenberg; inspector | minHeight |  |
| Minimum width (min-width) | studio; model-only | minWidth | Stored or supported internally; no inspector control is implemented. |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Site role (editable) and source provenance (read-only) (role) | studio; inspector | role, source |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### Group (group)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Group, Row, Stack or Grid layout (layout) | gutenberg; summary | layout |  |
| Justification and alignment (alignment) | gutenberg; inspector | horizontalAlign, verticalAlign | When the Group uses the Row or Stack layout. |
| Allow wrapping (wrapping) | gutenberg; inspector | allowWrap | When the layout is Row. |
| Inherited or custom content and wide widths (content-width) | gutenberg; inspector | inheritLayout, contentSize, wideSize | When the layout is Group or Stack. |
| Grid columns and minimum width (grid) | gutenberg; inspector | columns, gridMode, minColumnWidth, minColumnWidthUnit | When the layout is Grid. |
| Block spacing (gaps) | gutenberg; inspector | gap, columnGap, rowGap | Available for Group, Row, Stack and Grid layouts. |
| Padding (padding) | gutenberg; inspector | paddingX, paddingY |  |
| Sticky positioning (sticky) | gutenberg; inspector | position | When Position is enabled for a root Group. |
| Allowed blocks (allowed-blocks) | gutenberg; inspector | allowedBlocks |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Columns (columns) | gutenberg; model-only | textColumns | Stored or supported internally; no inspector control is implemented. |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Minimum height (min-height) | gutenberg; inspector | minHeight |  |
| Minimum width (min-width) | gutenberg; inspector | minWidth |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| Responsive stacking breakpoint (responsive-stack) | studio; model-only | stackAt | Stored or supported internally; no inspector control is implemented. |
| Legacy Columns layout (columns) | studio; model-only | columns | Stored or supported internally; no inspector control is implemented. |
| Managed background image (background-image) | studio; inspector | visualStyle.backgroundImageMediaId, visualStyle.backgroundPositionX, visualStyle.backgroundPositionY, visualStyle.backgroundSize, visualStyle.backgroundRepeat | When the Studio background-image picker is available. |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss, tagName, ariaLabel |  |
| HTML element and ARIA label (semantic-element) | gutenberg; inspector | tagName, ariaLabel |  |
| None/Wide/Full block alignment (block-alignment) | gutenberg; canvas | blockAlign |  |

### Columns (columns)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Add or remove columns (column-count) | gutenberg; inspector | children |  |
| Stack on mobile (stack-on-mobile) | gutenberg; inspector | stackAt |  |
| Vertical alignment (vertical-alignment) | gutenberg; inspector | verticalAlign |  |
| Horizontal and vertical gaps (gaps) | gutenberg; inspector | gap, columnGap, rowGap |  |
| Outer alignment (outer-alignment) | gutenberg; canvas | blockAlign |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| Column layout presets (preset) | studio; canvas | children | When this newly inserted Columns block has a pending layout choice. |
| Inner content width (content-width) | studio; model-only | contentWidth | Stored or supported internally; no inspector control is implemented. |
| Responsive stacking breakpoint (responsive-stack) | studio; model-only | stackAt | Stored or supported internally; no inspector control is implemented. |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | style.anchor, style.className, style.additionalCss |  |

### Column (column)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Column width (width) | gutenberg; inspector | width | Live editing requires at least two Columns children and a parent-change callback; disabled in this specimen. |
| Vertical alignment (vertical-alignment) | gutenberg; inspector | verticalAlign |  |
| Block gap (gap) | gutenberg; inspector | rowGap, gap |  |
| Allowed blocks (allowed-blocks) | gutenberg; inspector | allowedBlocks |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | style.anchor, style.className, style.additionalCss |  |

### Component (component)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Registered component (component) | studio; model-only | component | Stored or supported internally; no inspector control is implemented. |
| Component data (data) | studio; inspector | data | Only whitelisted string properties for the registered component. |

### Content (template-content)

| Control | Source / placement / availability | Owned fields | Condition |
| --- | --- | --- | --- |
| Inherited or custom content and wide widths (content-width) | gutenberg; inspector | inheritLayout, contentSize, wideSize |  |
| Block spacing (gaps) | gutenberg; inspector | gap, columnGap, rowGap |  |
| Colour (colour) | gutenberg; inspector | textColor |  |
| Size (size) | gutenberg; inspector | fontSize, fontSizeCustom |  |
| Appearance (appearance) | gutenberg; inspector | appearance |  |
| Line height (line-height) | gutenberg; inspector | lineHeight |  |
| Background colour or gradient (background) | gutenberg; inspector | backgroundColor, backgroundGradient, backgroundImageMediaId, backgroundSize, backgroundRepeat, backgroundFixedSize, backgroundPositionX, backgroundPositionY |  |
| Padding (padding) | gutenberg; inspector | padding |  |
| Margin (margin) | gutenberg; inspector | margin |  |
| Minimum height (min-height) | gutenberg; inspector | minHeight |  |
| Border (border) | gutenberg; inspector | borderColor, borderStyle, borderWidth |  |
| Radius (radius) | gutenberg; inspector | borderRadius |  |
| Shadow (shadow) | gutenberg; inspector | shadow |  |
| Link colour (link-colour) | gutenberg; inspector | linkColor, linkHoverColor |  |
| HTML anchor, CSS classes and Additional CSS (advanced) | gutenberg; inspector | visualStyle.anchor, visualStyle.className, visualStyle.additionalCss |  |

### List Item (nested context)

| Control | Source | Owned fields |
| --- | --- | --- |
| Background (background) | gutenberg | backgroundColor, backgroundGradient |
| Colour (colour) | studio | textColor |
| Size (size) | gutenberg | fontSize, fontSizeCustom |
| Font family (family) | gutenberg | fontFamily |
| Appearance (appearance) | gutenberg | appearance |
| Line height (line-height) | gutenberg | lineHeight |
| Letter spacing (letter-spacing) | gutenberg | letterSpacing |
| Decoration (decoration) | gutenberg | textDecoration |
| Letter case (letter-case) | gutenberg | textTransform |
| Padding (padding) | gutenberg | padding |
| Margin (margin) | gutenberg | margin |
| Border (border) | gutenberg | borderColor, borderStyle, borderWidth |
| Radius (radius) | gutenberg | borderRadius |
| Link colour (link-colour) | gutenberg | linkColor, linkHoverColor |
| HTML anchor (advanced) | gutenberg | anchor |
| Additional CSS classes and declarations (advanced-css) | studio | className, additionalCss |

Reset ownership, attribute defaults, detailed supported/unsupported capabilities and dependencies remain in the canonical capability profile; this snapshot does not create a second executable contract.
