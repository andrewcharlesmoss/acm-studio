# Ribbon command inventory

Generated from the same typed definitions used by the tree, inspector and preview.
Run node scripts/generate-ribbon-inventory.mjs from ACM Studio after an approved
inventory change; use --check to verify without writing.

Product snapshots, hashes and verification are documented in [Ribbon Library](ribbon-library.md).
The component specimens are included to keep every demonstrated control discoverable.

| Product | Stable command | Label | Kind | Icon and state alternatives | Conditions / states |
| --- | --- | --- | --- | --- | --- |
| skeleton | specimen.compact | Compact | button | action.undo |  |
| skeleton | specimen.standard | Standard | button | insert.image |  |
| skeleton | specimen.large | Large | button | insert.text |  |
| skeleton | specimen.icon | Icon Only | button | view.zoom-in |  |
| skeleton | specimen.toggle | Toggle | toggle | security.unlock |  |
| skeleton | specimen.active | Selected | button | state.selected |  |
| skeleton | specimen.disabled | Disabled | button | action.delete | always |
| skeleton | specimen.text | Text | text | Text only: Native text input. |  |
| skeleton | specimen.number | Number | number | Text only: Native numeric input. |  |
| skeleton | specimen.select | Select | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| skeleton | specimen.range | Range | range | Text only: Native range inside RibbonField; no dedicated package slider. |  |
| studio | studio.home | Back to ACM Studio | button | navigation.back |  |
| studio | studio.name | Design Name | text | Text only: Editable name in the brand slot. | unlocked |
| studio | studio.library | All Designs | button | library.designs |  |
| studio | studio.undo | Undo | button | action.undo | undo |
| studio | studio.redo | Redo | button | action.redo | redo |
| studio | studio.pages.toggle | Hide Pages | toggle | view.pages, view.hide | Show Pages; Hide Pages |
| studio | studio.save-media | Save to Studio Media | button | media.save | unlocked |
| studio | studio.handoff.block | Insert into Document | button | document.insert | handoff |
| studio | studio.handoff.cover | Use as Cover | button | document.cover | handoff |
| studio | studio.select | Select | toggle | tool.select |  |
| studio | studio.image | Image | button | insert.image | unlocked |
| studio | studio.shapes | Shapes | select | insert.shapes | unlocked |
| studio | studio.arrow | Arrow | toggle | insert.arrow | unlocked |
| studio | studio.text | Text | toggle | insert.text | unlocked |
| studio | studio.step | Numbered Step | toggle | insert.step | unlocked |
| studio | studio.highlight | Highlight | toggle | insert.highlight | unlocked |
| studio | studio.redaction | Redaction | toggle | insert.redaction | unlocked |
| studio | studio.files | Studio Files | button | library.files | unlocked |
| studio | studio.border | Purple Border | toggle | view.selection | Off; On |
| studio | studio.backward | Send Backward | button | arrange.backward | editable |
| studio | studio.forward | Bring Forward | button | arrange.forward | editable |
| studio | studio.back | Send to Back | button | arrange.back | editable |
| studio | studio.front | Bring to Front | button | arrange.front | editable |
| studio | studio.duplicate | Duplicate | button | action.duplicate | selection |
| studio | studio.zoom-out | Zoom Out | button | view.zoom-out |  |
| studio | studio.zoom | Zoom | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| studio | studio.zoom-in | Zoom In | button | view.zoom-in |  |
| studio | studio.fit | Fit Canvas | button | view.fit |  |
| studio | studio.all-pages | All Pages | toggle | view.pages, view.single | All Pages; Single Page |
| studio | studio.snap | Snap On | toggle | view.snap, view.snap-off | Snap Off; Snap On |
| studio | studio.format | Format | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| studio | studio.scale | Scale | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| studio | studio.quality | Quality | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| studio | studio.export.page | Export Page | button | output.page |  |
| studio | studio.export.selected | Export Selected | button | output.selected | pages |
| studio | studio.export.all | Export All Pages | button | output.all |  |
| studio | studio.backup | Editable Backup | button | output.backup |  |
| studio | studio.update-media | Update Linked Media | button | media.update | linked; unlocked |
| account | account.cell | Cell Selection | toggle | table.cell |  |
| account | account.highlight | Rows | split | table.rows, table.columns, table.both | Off; Rows; Columns; Rows & Columns |
| account | account.highlight.menu | Choose Highlight Mode | button | navigation.disclosure |  |
| account | account.highlight.row | Rows | button | table.rows |  |
| account | account.highlight.column | Columns | button | table.columns |  |
| account | account.highlight.both | Rows & Columns | button | table.both |  |
| account | account.highlight.close | Close Highlight Menu | button | action.close |  |
| account | account.edit | Edit Cell | button | action.edit | editable |
| account | account.delete | Delete Row | button | action.delete | editable |
| account | account.lock | Unlock Fields | toggle | security.lock, security.unlock | Lock Fields; Unlock Fields |
| account | account.columns | Columns | button | layout.columns |  |
| account | account.columns.close | Close Columns | button | action.close |  |
| account | account.record | Account Record | toggle | account.record |  |
| account | account.row-height | Row Height | compound-range | layout.row-height |  |
| account | account.row-height.scope | Row Height Scope | toggle | scope.all, scope.selected | All; Selected |
| account | account.row-height.reset | Reset Row Height | button | action.reset |  |
| account | account.column-width | Column Width | compound-range | layout.column-width |  |
| account | account.column-width.scope | Column Width Scope | toggle | scope.all, scope.selected | All; Selected |
| account | account.column-width.reset | Reset Column Width | button | action.reset |  |
| account | account.search-input | Search Name, Username or Email | text | Text only: Text entry retains its explicit accessible label. |  |
| account | account.status | Account Status | select | Text only: A labelled native selector communicates its value without a decorative icon. |  |
| account | account.search | Search | button | action.search |  |
| account | account.clear | Clear Search and Filters | button | action.clear |  |
| account | account.refresh | Refresh | button | action.refresh | loading; Refresh; Refreshing… |
