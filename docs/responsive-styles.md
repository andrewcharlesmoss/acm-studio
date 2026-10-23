# Responsive block styles

View → Responsive styles is available in the content and template editors. The
checkbox is a session editing preference, initially off; switching it or the
preview viewport does not save or publish content. Desktop, Tablet (768px), and
Mobile (390px) reuse the existing canvas previews.

With the checkbox off, inspector styles edit the Desktop baseline at any preview
width. With it on, Desktop still edits that baseline, while Tablet and Mobile
edit independent explicit overrides. Unset values inherit Desktop. Reset deletes
only the current device's fields. Turning the checkbox off retains every stored
override. Content editing, selection, and Undo/Redo retain their usual commands.

The [Gutenberg responsive styles reference](https://wordpress.org/documentation/article/responsive-styles/)
defines Mobile as ≤480px and Tablet as >480px and ≤782px. Mobile inherits
Desktop rather than Tablet. The editor uses its canvas container width; local
publication uses the browser viewport. Application panes retain their documented
three-pane desktop arrangement at narrow window widths.

## Supported controls

The common ParagraphInspector exposes each block's existing supported typography,
text and link colours, solid and gradient backgrounds, padding and margin,
minimum dimensions, borders, radii, and shadows. Device scopes filter native
layout and content settings, image assets and image sizing, Advanced fields,
Button interaction-state editing, and shared template styles. These remain
available on Desktop. Fit-text blocks retain shared fitted sizing; device font
size and text columns are unavailable while Fit text is enabled. Block toolbar
controls continue to edit shared properties, following the reference.

Each device inspector edits explicit values, so an unset input means inheritance.
It reports its device scope. Existing Button hover/focus/active styles remain
shared and take precedence over the responsive default state. Image frames and
Table spacing retain their canonical inner and outer rendering surfaces.
Additional CSS remains shared and takes precedence when it sets the same mapped
property. Responsive asset references are rejected rather than creating a second
media ownership contract.

## Storage and rendering

`ParagraphStyle.responsive` contains only optional `tablet` and `mobile` maps.
Overrides use the bounded common CSS style fields; recursive maps, unknown
viewports, assets, Additional CSS, and empty or invalid overrides are rejected.
The canonical mapper resolves each device independently and emits only differing
CSS values as React-escaped inline custom properties. Static property selectors
apply those values through media or named container queries. Authored selectors
or CSS rules are never injected. No duplicate content DOM or IDs are introduced.

Current writers use workspace v26 (reads v2–v25), publication v19 (reads v1–v18),
clipboard v5 (reads v1–v4), templates and template packages v0.32.0 (read
v0.1.0–v0.31.0), local fixture source v8 (reads v1–v7), Mini Golf draft v14
(reads v1–v13), and Mini Golf page definition v6 (reads v1–v5). Earlier envelope
versions reject responsive fields instead of silently losing them. Reading an
old source upgrades only its in-memory projection; normal owned saves persist
current envelopes. Mini Golf inherits the readers and rendering contract but
currently has no View menu exposing responsive authoring.

Browser revisions, publications, Bin recovery, backups, typed clipboard payloads,
template projections, and HTML inspection metadata preserve responsive maps.
Test and Test2 Save Draft changes authored styles; Publish/Update captures them
into the selected immutable local publication. Template originals retain their
existing shared/live behaviour. Existing ownership, leases, revision checks,
peer merging, and reconnect reconciliation remain authoritative.

## Acceptance checks

Run from the repository root:

```sh
node --experimental-strip-types --test tests/responsive-styles.test.mjs tests/paragraph-appearance.test.mjs tests/template-system.test.mjs tests/workspace-recovery.test.mjs tests/site-publication-controls.test.mjs
npm run typecheck
npm run build
```

Publication gateway tests need loopback binding for their temporary writer guard.
In a real browser, use a temporary draft, set different Desktop/Tablet/Mobile
font sizes, reset one device, toggle responsive editing off at a narrow preview,
and confirm base changes retain the other overrides. Check Edit and Preview,
Save Draft and reload, template authoring, and local publication at all three
widths. Inspect a nested parent/child with different padding overrides to confirm
non-inherited styles stay on their own element. Use keyboard navigation and
Escape to close View and return focus to its trigger.


Website Paragraph defaults additionally support device Line indent through the
existing website `previewResponsive` map. This is separate from individual
content ParagraphStyle overrides: the content inspector still keeps Line indent
on Desktop. Website rendering retains consecutive-paragraph semantics and
explicit authored indentation. See `site-editor-styles.md`.
