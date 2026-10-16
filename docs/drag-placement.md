# Drag placement in Studio

Studio follows the shared Workspace Style Guide's one centred line per logical
insertion gap rule. The guide is unversioned; this implementation applies its
baseline at governance commit `7500251` (14 October 2026). The canonical source
is `workspace-governance/STYLE_GUIDE.md`, under Interface clarity and Verification.

## Owned insertion gaps

| Action | Production path | Placement contract |
| --- | --- | --- |
| Sites, posts, pages, and templates in Studio Navigation | `use-library-reordering.ts` | Shared controller and renderer, centred between full neighbouring rows, with unchanged order snapshots rejected. |
| Root blocks and Block Library insertion | `studio-canvas.tsx`, `block-drop-position.ts` | One canvas overlay at the measured boundary; feedback and commit use the same insertion index. |
| Nested block siblings, including Groups, Rows, Stacks, Buttons, Social Icons, Quotes, and nested List content | `block-drop-position.ts`, `block-sibling-operations.ts` | Actual model siblings determine the common rendered container. Template wrappers and repeated toolbar anchors do not create extra rows or destinations. |
| Blocks moving into or within Columns | `column-drop-position.ts`, `block-placement.ts` | One measured line between immediate children; moves preserve identities and apply container and lock rules atomically. |
| Navigation links and submenus | `template-navigation-editor.tsx`, `use-gap-reordering.ts` | Explicit before/after sibling boundaries, horizontal root menus and vertical submenus, with no implicit reparenting. |
| Design pages and layers | `design-editor.tsx`, `use-gap-reordering.ts` | One list-owned overlay, validated against the current source and permissions on preview and release. Layers also respect page and object locks. |

The content editor, template editor, Mini Golf editor, and UI Library specimens
share the block canvas implementation. These changes do not introduce separate
editor or persistence paths.

## Single implementation owner

Every insertion-gap consumer inherits `use-drag-placement.ts`. It owns native
and captured mouse input, source freshness, cancellation, destination refresh,
and the `drag-auto-scroll.ts` lifecycle. `use-gap-reordering.ts` adapts sibling
ordering; `use-library-reordering.ts` adds keyboard moves and announcements.
Block adapters describe legal destinations and commits, including reparenting.
New consumers must reuse these owners rather than fork their interaction code.
`drag-placement-space.ts` measures the same logical sibling rows supplied by
its adapters, excluding wrappers, nested owners, toolbars and appenders. UI
reordering sequences retain their compact authored gaps; end slots follow the
same sibling spacing. Content block sequences also retain their authored spacing. A single-item sequence uses its declared axis gap, or a 24px fallback
when neither rows nor a gap can be measured. Distributed flex layouts
(`space-between`, `space-around`, and `space-evenly`) use their declared main-axis
gap, or the same fallback, instead of turning distributed free space into end
padding. Every reserved slot has at least
2px for the indicator. Existing padding is retained with a maximum, rather than
adding a second reservation. All three DOM adapters read the resulting before/
after padding and centre the end indicator in that actual space. They do not
use the full owner height, which can contain unrelated scrollable blank space.
Actual document body roots and their nested sequences reserve their slots only
while a drag is active. The reservation stays inside the body, preserving idle
and selected content positions without borrowing from adjacent Header or Footer
parts. Ending, cancelling, or losing ownership of the drag restores the authored
spacing through the same controller cleanup. Template authoring retains its
continuous gutter reservation.
Root-width horizontal block rows and the template editor's vertical root sequence
can instead use the existing document surface gutters. The shared reservation
adds transparent, out-of-flow end slots there,
without changing the row's authored padding, background, width, or child
positions. Hit testing and feedback include those same slots on either axis. Borrowing is
bounded by the surface and ancestor clipping; insufficient space retains the
ordinary padding reservation. Slots are authoring-only and disappear in Preview.
Viewport and owner/parent width changes refresh responsive geometry without
accumulating reservations. Sites reserves its inner list, not its heading.
Preview and publication receive no reservations; unmount or disabling the
authoring reservation restores the original styles.
`DragPlacementIndicator` is the only line renderer and `.studio-gap-line` is its
shared appearance. Native insertion uses copy feedback; reordering uses move.

`drop-gap-geometry.ts` measures full item boundaries and converts viewport
coordinates into the owning container's CSS coordinates. Wrapped horizontal
lists use complete visual-row envelopes, including unequal item heights. A
logical gap has the same position from either neighbouring edge or its empty
space. Empty authoring Columns retain a compact 24px insertion surface; that
placeholder size is not saved as a content dimension or added to publication.

## Validity and cancellation

- Show feedback only for a valid, effective placement change. Equivalent
  adjacent no-op slots create no write, history entry, or move announcement.
- Capture the owning source snapshot when dragging starts. Changed content,
  order, permissions, invalid destinations, and foreign owners prevent commits.
- Recalculate the destination on release using the same geometry and policy
  that produced the line. A cached previous destination cannot authorise a drop
  outside the owning list or canvas.
- Escape, pointer cancellation, lost capture, drag end, and ownership loss clear
  feedback. Captured dragging stops its edge-scrolling loop when cancelled,
  unmounted, or invalidated by a source or permission change.
- Mouse capture and native drag paths share placement rules. Touch retains its
  ordinary scrolling behaviour. Existing keyboard move controls remain available.
- Edge scrolling refreshes the measured placement while scrolling; it does not
  change saved data until a valid release.

Files and folders use containment destinations rather than insertion gaps.
Canvas object movement uses spatial alignment guides. Pane resizing, ranges,
and gradient controls manipulate dimensions or values. Their feedback remains
appropriate to those operations; they do not draw ordered insertion-gap lines.

## Verification

From the ACM Studio root, run `npm test`. Its normal regression command includes
`tests/drop-gap-reordering.test.mjs`, `tests/block-placement.test.mjs`, and the
existing library ordering checks. These exercise production geometry, pointer
and native handlers, wrapped and scaled layouts, template wrappers, no-op
identity, locked destinations, stale sources, cancellation, and edge scrolling.
Existing List selection and toolbar checks retain their production event owners.

For rendered checks, use the memory-only `/studio/ui/selection/template` specimen
for root blocks, Columns, wrapped Row children, Navigation, and submenus. Drag
across both sides and the empty gap; inspect the line before releasing. Repeat at
200% canvas zoom and supported viewport widths. Use Reset Example or Undo to
restore the fixture. The main editors retain their documented minimum-width
workspace and horizontal scrolling at narrow viewport sizes.

In Design, check a populated unlocked page, an adjacent no-op, a genuine layer
move, a page move, and Undo. Preserve the original page and layer orders. Check
that locked pages and objects do not expose a valid layer placement.

The October 2026 implementation checks used browser gestures for Navigation,
submenus, root blocks, an empty Column, wrapped Row children, Design layers, and
Design pages, restoring their orders afterwards. Navigation dragging was also
checked at 200% zoom. Automated production tests cover the exact midpoint and
its stability across hover coordinates; the browser tool performs complete
gestures and cannot pause a drag for a mid-gesture screenshot.
