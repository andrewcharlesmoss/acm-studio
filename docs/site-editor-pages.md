# Site Editor Pages

The Pages section at `/studio/site-editor` manages Test and Test2 pages using
the existing site document sessions, command owner, history, publications,
template assignments and Bin. It does not add a document store, gateway writer
or publication path. Global Defaults has no page collection.

The left pane provides Back to Design and All Pages, Published, Scheduled,
Drafts, Pending, Private and Bin views. The Pages pane provides search, author,
date and status filters, List, Table and Grid layouts, view options, pagination
and page actions. Pagination appears only when results span multiple pages.
Search covers title, slug, excerpt and readable block text;
filters combine with the selected status view. All Pages excludes binned pages.
The list shows Title, Homepage, Featured Image, Author, Status, Date, Slug,
Parent and Template where available. Discussion and Notes are not supported.
The List view groups page details within each row so it remains readable in a
narrow resizable pane; Table scrolls horizontally when needed and Grid adapts to
the available width.

View preferences are stored per site through the shared preference owner and
refreshed in other tabs after acknowledgement. Defaults are List, Balanced
density, 20 items, Title ascending and all properties visible. Layout, sorting,
density, page size and property visibility/order are remembered. Search, filters,
selection and current page remain temporary. Reset view restores the defaults.
The Appearance menu groups sorting, density, page size and property visibility
in one compact panel shared by the Site Editor and Library specimen.
The Pages preference record is validated and limited to Test and Test2.

Add Page creates an empty draft through the existing document command, waits for
the owner save acknowledgement and opens the page in the embedded editor. Rename
and Order use the same document owner. View opens the local publication when
available; an unpublished page is identified as a draft preview beside the save status
in the application header, outside the website preview. Neither action
publishes content. Before changing page, site or editor mode, the existing flush
handshake must complete; an unresolved save or conflict keeps the current editor
and draft in place.

Page order is an optional signed 32-bit `pageOrder` field. Missing values read
as zero. Equal numeric order values sort by case-insensitive title and stable ID.
This affects the Pages view only; it does not reorder authored Navigation links
or rewrite the editor's manually ordered document list. Order changes participate
in Undo/Redo, while content revision restoration retains the current order.
Workspace v29 and fixture v11 read their earlier versions and only upgrade
through the existing owned save. Backups and Bin recovery preserve the field.

Bulk Bin and Restore revalidate every selected record and commit one history
transaction. The home page remains protected from Bin. Permanent deletion stays
individually confirmed in the existing Bin and is not available as a bulk action.
Bin operations preserve publications, media and template assignments subject to
the existing dependency checks.

Controls → Pages catalogue at `/studio/ui/controls#site-pages-catalogue` uses
the production `PagesSidebar` and `PagesCatalogue` presentation. It has its
own temporary pages, preferences, selection and handlers. Reset Example
recreates that state; the Library never reaches production stores or gateways.

Verification covers query composition, deterministic sorting, pagination,
preference validation and owner updates, schema compatibility, page order,
Bin recovery, homepage protection, frame message targeting and local editing.
The Playwright browser check is `tests/browser/site-editor-pages.spec.ts` and
uses only the memory-only Library fixture.
