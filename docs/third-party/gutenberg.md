# Gutenberg icons and menu reference

The seven SVG paths in `app/studio/table-icons.tsx` are copied without geometry
changes from WordPress Gutenberg's `packages/icons/src/library/` directory at
revision `1addb122219043a1ac1c38f817c71255ae16d6e3`:

- `table.svg`
- `table-row-before.svg`, `table-row-after.svg`, `table-row-delete.svg`
- `table-column-before.svg`, `table-column-after.svg`, `table-column-delete.svg`

Copyright 2016–2026 the Gutenberg contributors. The package declares
GPL-2.0-or-later. The upstream licence and notices are preserved verbatim in
[gutenberg-LICENSE.md](gutenberg-LICENSE.md). The React wrapper was adapted for
ACM Studio on 30 August 2026. No Gutenberg runtime dependency is included.

[Upstream icons](https://github.com/WordPress/gutenberg/tree/1addb122219043a1ac1c38f817c71255ae16d6e3/packages/icons/src/library)
and [table editor](https://github.com/WordPress/gutenberg/blob/1addb122219043a1ac1c38f817c71255ae16d6e3/packages/block-library/src/table/edit.jsx).

## Shared Studio icons

`app/studio/studio-icons.tsx` uses unchanged SVG path geometry from the same
Gutenberg revision for Studio interaction controls, including block transforms,
formatting, link actions, navigation, media, backup and dashboard controls.
The copied sources include `link.svg`, `link-off.svg`, `globe.svg`,
`format-bold.svg`, `format-italic.svg`, `drag-handle.svg`, `paragraph.svg`,
`heading.svg`, `list.svg`, `quote.svg`, `image.svg`, `code.svg`, `button.svg`,
`separator.svg`, `add.svg`, `close-small.svg`, `undo.svg`, `redo.svg`,
`copy.svg`, `external.svg`, `more-vertical.svg`, `archive.svg`, `file.svg`,
`audio.svg`, `video.svg`, `info.svg`, `pencil.svg`, the alignment icons and
the relevant directional arrows and chevrons.

This central wrapper is the approved source for new Studio interaction icons.
The settings secret-visibility control also uses `seen.svg` from the same
`1addb122219043a1ac1c38f817c71255ae16d6e3` revision, retrieved on 8 September 2026.
Do not use Unicode glyphs or hand-drawn substitutes for those controls.

## Visual reference

The six menu icons and toolbar icon were checked against the SVG DOM in the
user's running Gutenberg editor on 30 August 2026. Its table editor composes
`ToolbarDropdownMenu` with the corresponding WordPress icons. ACM Studio retains
its own table actions and content model.

The local dropdown uses the measured CSS dimensions, not screenshot pixels:
24px icon boxes, 13px system-font text, 32px rows, a 4px icon-to-label gap,
8px menu padding, 2px corners and a 1px outline without a drop shadow or pointer.
Menu item padding is 6px 12px 6px 8px. Width follows the longest label.
The original screenshot was captured at device-pixel ratio 2.

The system-font stack is a deliberate, menu-only exception to the shared Inter
baseline. Other Studio controls retain their existing typography.

## Distribution boundary

This is a local prototype change. Before publishing or distributing a build
containing these upstream assets, review the GPL source-distribution and notice
requirements for the intended release. This record does not relicense ACM Studio
or claim that an external release has been cleared.

## Folder visual exception

The `folder` icon in `app/studio/studio-icons.tsx` is an original ACM Studio
SVG added on 9 September 2026 for Andrew’s requested Apple-style folder
silhouette. Its tab and two tonal surfaces distinguish folders from archive
documents. It does not copy an Apple asset or claim Gutenberg provenance.
Other Studio interaction icons retain the upstream geometry documented above.
