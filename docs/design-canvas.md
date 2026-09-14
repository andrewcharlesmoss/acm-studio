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

The annotation tools are arranged in a horizontal toolbar above the canvas,
with a Hide pages / Show pages control for giving the canvas more room during
editing. The Pages pane remains available as a named, keyboard-accessible
navigator when it is shown.

Designs are stored in this browser under the versioned
`acm-studio-designs-v1` key and are guarded by the same `studioWriteOwnership`
Web Lock as content and media. A read-only tab can inspect and export designs,
but cannot change them. Editable design backups are JSON files containing the
scene and image data. They retain original image material behind editable
redaction objects and should be kept private.

The first canvas release supports PNG, JPEG, WebP and GIF image input, file
selection, drag and drop, clipboard paste, Studio media selection, named page
creation, duplication, deletion, pointer and keyboard page reordering, page
resizing, object selection and marquee multi-selection, movement, resize and
rotation handles, arrow endpoint editing, crop controls, layers, grouping,
alignment, snapping guides, basic properties, undo/redo and PNG, JPEG or WebP
export.
Exports can use 100% or 200% scale, selectable quality for lossy formats, and
the current, selected or all pages can be downloaded as a ZIP with deterministic
names. Export waits for document fonts and is rendered at the selected document
scale, without editor selection controls.

An existing image in Studio Files can be opened as a new design. A page already
linked to rendered Studio media can update that media in place after editing;
the design remains the source of truth for that linked render. Design payloads
pass through an explicit migration boundary before schema validation so future
versions can add migrations without changing storage callers.

Imported design files are checked against the versioned schema, an image MIME
allow-list and actual browser image decoding before they are added to local
storage. Page selection is stored with the design so reopening returns to the
last selected page.

Rendered pages can be saved into the Studio media library. The resulting media
record is linked from the source design page and offers handoff links for
inserting the image into the current Studio document or using it as its cover;
the handoff uses the active document in the Content Studio tab. Content Studio
asks for alternative text before inserting a design render, and the Files
insert action asks for it for every image insertion, prefilled from saved
metadata or the filename. Media cards retain a source-design link, which
reopens the exact design and page in the canvas.

Desktop capture, scrolling capture, video, collaboration, OCR, blur and
AI-assisted editing remain future work. Background removal currently uses a
local edge-connected colour-key operation with an adjustable tolerance; it
keeps the original asset and adds a transparent PNG derivative. To keep browser
memory use bounded, the operation is limited to images up to 16 megapixels.
The desktop application can later provide capture input to this same design
format.
