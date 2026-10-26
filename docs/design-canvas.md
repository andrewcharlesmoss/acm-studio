# Design canvas

The design canvas is the local ACM Studio workspace for creating annotated
screenshots, article illustrations and cover images. Open it at
`/studio/designs` or use **Design canvas** in the main Studio sidebar.

Designs are separate from Studio website pages and posts. Each design contains
one or more named pages. A page stores its pixel dimensions, background and an
ordered scene of image, shape, arrow, text, numbered-step, highlight and opaque
redaction objects. Page names are editor metadata; they do not change visible
artwork or Studio routes.

The Pages pane can be collapsed while editing. Page thumbnails expose rename,
duplicate, delete and ordering controls, and selected pages can be exported as
a batch. The canvas remembers the most recently used style for each annotation
family, and the zoom toolbar includes a selectable zoom value plus a temporary
Snap on / Snap off switch.

The editor renders each page as an SVG scene and rasterises that scene only for
export. This keeps image, text and annotation objects editable without adding a
graphics-library dependency, while preserving document dimensions independently
of browser zoom.

Text boxes preserve explicit line and paragraph breaks. Word wrap is enabled by
default and can be toggled off per text box when a long line should continue
past the box edge; the box still clips the rendered and exported text.

Arrows support independent Start arrowhead and End arrowhead controls, a shared
Arrowhead size setting and Solid or Dotted line style. Dotted styling applies
only to the shaft, while each selected arrowhead remains a solid filled shape.
The arrow geometry trims the shaft at both arrowhead bases for straight,
quadratic and cubic paths, including reversed and short arrows. Existing design
files remain compatible: the legacy `arrowhead` field continues to control the
end triangle, while omitted start, size and line-style fields use false, 100%
and Solid defaults.

Duplicate tabs for the same design can edit together when the browser supports
Web Locks and BroadcastChannel. The tab holding the Studio writer lock remains
the persistence owner, whether it displays Content, Templates or Designs. A
shared runtime serves saved design rooms on every Studio route; canvas clients
send versioned transactions to it and receive committed transactions. Each
save reads the latest design aggregate inside the owned write, preserving
changes to other designs. Compatible changes to separate objects or
properties merge automatically. Competing edits open a conflict review with
Use My Change and Use Other Change actions; document editing pauses until the
conflict is resolved, while navigation and export remain available. Studio
media, backups, restores and switching or creating designs remain primary-tab
operations. If tab synchronisation is unavailable, the existing read-only
protection remains in place.

When the owner closes or reloads, the canvas automatically retries local saving
and discovery. Returning focus or choosing **Try Editing Here** also retries.
Pending and queued edits retain their original base and local snapshot; a fresh
connection merges compatible changes, recognises an already saved operation,
or opens conflict review without replacing the local draft. An existing conflict
also survives owner replacement. **Use My Change** retains the full pending
draft; **Use Other Change** deliberately takes the latest saved design. While
saving is unavailable, editing stays paused and **Export Editable Backup**
remains available. No disconnected client writes directly to browser storage.

The annotation tools are arranged in a horizontal toolbar above the canvas,
with a Hide pages / Show pages control for giving the canvas more room during
editing. The Pages pane remains available as a named, keyboard-accessible
navigator when it is shown.

Designs are stored in this browser under the versioned
`acm-studio-designs-v1` key and are guarded by the same `studioWriteOwnership`
Web Lock as content and media. A tab without the writer lock can still edit a
connected design through its persistence owner; an unavailable or disconnected
sync channel leaves it read-only. Editable design backups are JSON files
containing the scene and image data. They retain original image material behind
editable redaction objects and should be kept private.

The first canvas release supports PNG, JPEG, WebP and GIF image input, file
selection, drag and drop, clipboard paste, Studio media selection, named page
creation, duplication, deletion, pointer and keyboard page reordering, page
resizing, object selection and marquee multi-selection, movement, eight-way
resize handles, rotation handles, arrow endpoint editing, crop controls,
layers, grouping, alignment, snapping guides, basic properties, undo/redo and
PNG, JPEG or WebP export. Visual objects keep their proportions when resized
from a corner. Side handles change one dimension by default; hold Shift to keep
the proportions. Option/Alt resizes around the centre. Text containers reflow
independently, and arrows use endpoint controls. Objects may extend
beyond the page edge; rendered exports clip them to the page.

During a page-handle drag, the canvas retains the page’s starting layout footprint
and anchors the opposite edge or corner. Resizing therefore keeps the active
handle aligned with the pointer along the permitted axis, without flex centring
moving its origin. This applies to single-page and all-pages views at any zoom.
After release, the normal canvas layout centres the resized page; Escape restores
the original dimensions. Shift permits independent width and height changes.

Exports can use 100% or 200% scale, selectable quality for lossy formats, and
the current, selected or all pages can be downloaded as a ZIP with deterministic
names. Export waits for document fonts and is rendered at the selected document
scale, without editor selection controls.

An existing image in Studio Files can be opened as a new design. A page already
linked to rendered Studio media can update that media in place after editing;
the design remains the source of truth for that linked render. Design payloads
pass through an explicit migration boundary before schema validation so future
versions can add migrations without changing storage callers.

Imported design files are limited to 8 MB, 100 pages, 100 image assets and
5,000 drawing objects. Each embedded image is limited to 4 MB and 16 megapixels,
with a 32-megapixel total across the import. The importer checks raster headers
and declared dimensions before decoding, then confirms the decoded dimensions
match. Direct image selection and background removal use the same per-image
limits. Page selection is stored with the design so reopening returns to the
last selected page.

Rendered pages can be saved into the Studio media library. The resulting media
record is linked from the source design page and offers handoff links for
inserting the image into the current Studio document or using it as its cover;
the handoff uses the active document in the Content Studio tab. Content Studio
asks for alternative text before inserting a design render, and the Files
insert action asks for it for every image insertion, prefilled from saved
metadata or the filename. Media cards retain a source-design link, which
reopens the exact design and page in the canvas.

Desktop capture, scrolling capture, video, collaboration, OCR and blur remain
future work. Background removal uses local subject-aware inference: General
mode for people, animals and objects, and People mode for portraits. A soft
matte cleanup control reduces fringes. It retains the original through save
and reload, adds a transparent PNG derivative, preserves crop and transforms,
and provides Restore Original and undo/redo. Model download progress, Cancel
and failures are visible; editing during processing cancels the pending result.
The operation is limited to images up to 16 megapixels. See
[models, licences and runtime boundaries](third-party/background-removal.md).
The desktop application can later provide capture input to this same design
format.
