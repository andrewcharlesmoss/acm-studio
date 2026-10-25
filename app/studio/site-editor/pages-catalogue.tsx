"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import type { StudioDocument, StudioBinnedDocument } from "../editor-model";
import { NumberInput, SearchInput, SelectControl, TextInput } from "../controls/native-fields";
import { CheckboxControl } from "../controls/checkbox-control";
import { RadioGroup } from "../controls/radio-group";
import { StudioButton } from "../controls/button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioIcon } from "../studio-icons";
import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";
import { BackAction } from "../controls/back-action";
import { queryPages, defaultPagesView, pageDensities, pageLayouts, pageProperties, pageSizes, pageStatusViews, normalizePagesView, type PageDensity, type PageLayout, type PageProperty, type PageSort, type PageStatusView, type PagesView } from "./pages-model.mjs";
import "./pages-catalogue.css";

const statusNames: Record<PageStatusView, string> = {
  all: "All Pages", published: "Published", scheduled: "Scheduled", draft: "Drafts", pending: "Pending", private: "Private", bin: "Bin",
};
const propertyNames: Record<PageProperty, string> = {
  title: "Title", featuredImage: "Featured Image", author: "Author", status: "Status", date: "Date", slug: "Slug", parent: "Parent", template: "Template",
};
const sortNames: Record<PageSort, string> = { title: "Title", author: "Author", status: "Status", date: "Date", slug: "Slug", parent: "Parent", order: "Order" };
const dateNames: Record<string, string> = { month: "Past month", year: "Past year", future: "Future" };
type PageListItem = StudioDocument & { binId?: string; deletedAt?: string };
type PageDialog = { kind: "add"; title: string } | { kind: "rename"; document: StudioDocument; title: string } | { kind: "order"; document: StudioDocument; order: string };

const displayDate = (document: StudioDocument) => {
  const raw = document.status === "published" ? document.publishedAt ?? document.updatedAt : document.publishAt ?? document.updatedAt;
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
};
const statusName = (status: StudioDocument["status"]) => ({ published: "Published", scheduled: "Scheduled", draft: "Draft", pending: "Pending", private: "Private" })[status];

export type PagesCatalogueProps = {
  siteName: string;
  documents: StudioDocument[];
  binned: StudioBinnedDocument[];
  homeDocumentId: string;
  selectedId?: string | null;
  status: PageStatusView;
  onStatusChange: (status: PageStatusView) => void;
  view: PagesView;
  writable: boolean;
  preferenceError?: string;
  onViewChange: (next: PagesView) => void;
  onAddPage: (title: string) => Promise<StudioDocument | void> | StudioDocument | void;
  onSelect: (document: StudioDocument) => void | Promise<void>;
  onEdit: (document: StudioDocument) => void | Promise<void>;
  onViewPage: (document: StudioDocument) => void | Promise<void>;
  onRename: (document: StudioDocument, title: string) => Promise<void> | void;
  onOrder: (document: StudioDocument, order: number) => Promise<void> | void;
  onBin: (ids: string[]) => Promise<void> | void;
  onRestore: (binIds: string[]) => Promise<void> | void;
  resolveFeaturedImage?: (document: StudioDocument) => string | undefined;
  templateNameFor?: (document: StudioDocument) => string | undefined;
};

const statusIcons: Record<PageStatusView, IconName> = {
  all: "view.pages", published: "state.published", scheduled: "time.clock", draft: "document.new-page",
  pending: "state.caution", private: "security.lock", bin: "action.archive",
};

export function PagesSidebar({ value, onChange, onBack, disabled = false }: { value: PageStatusView; onChange: (value: PageStatusView) => void; onBack: () => void; disabled?: boolean }) {
  return <div className="site-pages-sidebar">
    <header className="pane-header site-pages-sidebar-heading"><BackAction label="Back to Design" onClick={onBack} /><h2>Pages</h2></header>
    <nav className="site-pages-navigation" aria-label="Page status">
      {pageStatusViews.map(status => <button type="button" key={status} aria-current={value === status ? "page" : undefined} className={value === status ? "is-active" : ""} disabled={disabled && status !== "all"} onClick={() => onChange(status)}><AcmIcon name={statusIcons[status]} size={24} scale="Regular-M" aria-hidden="true" /><span>{statusNames[status]}</span></button>)}
    </nav>
  </div>;
}

function PageActions({ document, binId, home, writable, busy, onEdit, onView, onRename, onOrder, onBin, onRestore }: {
  document: StudioDocument; binId?: string; home: boolean; writable: boolean; busy: boolean;
  onEdit: () => void; onView: () => void; onRename: () => void; onOrder: () => void; onBin: () => void; onRestore: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = (restoreFocus = true) => { setOpen(false); if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus()); };
  const action = (label: string, run: () => void, disabled = false, destructive = false) => <button type="button" role="menuitem" className={destructive ? "is-destructive" : undefined} disabled={disabled} onClick={() => { close(false); run(); }}>{label}</button>;
  return <div className="site-pages-row-actions">
    <button ref={trigger} type="button" className="site-pages-more" aria-label={`Actions for ${document.title || "Untitled page"}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><StudioIcon name="more-vertical" size={20} /></button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} align="end" className="site-pages-action-menu" aria-label={`Actions for ${document.title || "Untitled page"}`} onClose={close}>
      {!binId ? <>{action("Edit", onEdit, !writable || busy)}{action("View", onView)}{action("Rename", onRename, !writable || busy)}{action("Order", onOrder, !writable || busy)}{action("Move to Bin", onBin, !writable || busy || home, true)}</> : action("Restore", onRestore, !writable || busy)}
    </StudioAnchoredMenu> : null}
  </div>;
}

export function PagesCatalogue({ siteName, documents, binned, homeDocumentId, selectedId, status, onStatusChange, view, writable, preferenceError, onViewChange, onAddPage, onSelect, onEdit, onViewPage, onRename, onOrder, onBin, onRestore, resolveFeaturedImage, templateNameFor }: PagesCatalogueProps) {
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<PageDialog | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const filtersTrigger = useRef<HTMLButtonElement>(null);
  const layoutTrigger = useRef<HTMLButtonElement>(null);
  const viewTrigger = useRef<HTMLButtonElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const normalView = normalizePagesView(view);
  const result = useMemo(() => queryPages({ documents, binned, homeDocumentId, status, query, author, date, statusFilter, view: normalView, page }), [documents, binned, homeDocumentId, status, query, author, date, statusFilter, normalView, page]);
  const selectableIds = result.items.filter(item => status === "bin" || item.id !== homeDocumentId).map(item => status === "bin" ? item.binId! : item.id);
  const selectedVisible = selectableIds.filter(id => selected.has(id));
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
  const activeFilterCount = Number(Boolean(author)) + Number(Boolean(date)) + Number(Boolean(statusFilter));
  const hasCustomView = JSON.stringify(normalView) !== JSON.stringify(defaultPagesView);
  const visibleProperties = normalView.properties;
  const isBin = status === "bin";
  const activeDocuments = result.items;

  function changeView(patch: Partial<PagesView>) { onViewChange(normalizePagesView({ ...normalView, ...patch })); }
  function toggleSelection(id: string, checked: boolean) { setSelected(current => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; }); }
  async function run(action: () => Promise<unknown> | unknown, message: string) {
    if (!writable || busy) return false;
    setBusy(true); setFeedback("");
    try { await action(); setFeedback(message); return true; }
    catch (error) { setFeedback(error instanceof Error ? error.message : "The action could not be completed. Your changes were kept."); return false; }
    finally { setBusy(false); }
  }
  async function runPageAction(action: () => void | Promise<void>) {
    setFeedback("");
    try { await action(); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "The action could not be completed. Your changes were kept."); }
  }
  function selectPage(document: StudioDocument, edit = false) {
    void runPageAction(() => edit ? onEdit(document) : onSelect(document));
  }
  function viewPage(document: StudioDocument) { void runPageAction(() => onViewPage(document)); }
  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const target = dialog;
    const succeeded = await run(async () => {
      if (target.kind === "add") {
        const created = await onAddPage(target.title.trim());
        if (!created) throw new Error("The page could not be created. Your current view was kept.");
        onStatusChange("draft");
        setQuery(""); setAuthor(""); setDate(""); setStatusFilter(""); setPage(1);
        setSelected(new Set([created.id]));
        await onEdit(created);
      } else if (target.kind === "rename") await onRename(target.document, target.title.trim());
      else {
        const order = Number(target.order);
        if (!Number.isInteger(order) || order < -2147483648 || order > 2147483647) throw new Error("Order must be a whole number from −2147483648 to 2147483647.");
        await onOrder(target.document, order);
      }
    }, target.kind === "add" ? "Page created." : target.kind === "rename" ? "Page renamed." : "Page order saved.");
    if (succeeded) setDialog(null);
  }
  const imageCell = (document: StudioDocument) => {
    const src = resolveFeaturedImage?.(document);
    return src ? <img className="site-pages-thumbnail" src={src} alt="" /> : <span className="site-pages-thumbnail is-empty" role="img" aria-label="No featured image" />;
  };
  const pageLabel = (document: StudioDocument) => <span className="site-pages-title-label"><strong>{document.title || "Untitled"}</strong>{document.id === homeDocumentId ? <span className="site-pages-home-badge">Homepage</span> : null}</span>;
  const propertyValue = (document: StudioDocument, property: PageProperty) => {
    if (property === "title") return pageLabel(document);
    if (property === "featuredImage") return imageCell(document);
    if (property === "author") return document.author || "—";
    if (property === "status") return statusName(document.status);
    if (property === "date") return displayDate(document);
    if (property === "slug") return document.slug || "—";
    if (property === "parent") return documents.find(item => item.id === document.parentPageId)?.title ?? "—";
    if (property === "template") return templateNameFor?.(document) || document.template || "Default";
    return "—";
  };
  const actionsFor = (document: StudioDocument, binId?: string) => <PageActions document={document} binId={binId} home={document.id === homeDocumentId} writable={writable} busy={busy}
    onEdit={() => selectPage(document, true)} onView={() => viewPage(document)} onRename={() => setDialog({ kind: "rename", document, title: document.title })}
    onOrder={() => setDialog({ kind: "order", document, order: String(document.pageOrder ?? 0) })}
    onBin={() => void run(() => onBin([document.id]), "Page moved to Bin.")} onRestore={() => void run(() => onRestore([binId!]), "Page restored.")} />;
  const selectionControl = (document: StudioDocument, id: string, binId?: string) => <CheckboxControl className="site-pages-selection" label={`Select ${document.title || "Untitled page"}`} checked={selected.has(id)} disabled={document.id === homeDocumentId && !binId} onChange={checked => toggleSelection(id, checked)} />;
  const row = (document: PageListItem) => <article className={`site-pages-row${selectedId === document.id ? " is-current" : ""}`} key={document.binId ?? document.id}>
    {selectionControl(document, document.binId ?? document.id, document.binId)}
    <div className="site-pages-row-content">
      {visibleProperties.includes("featuredImage") ? imageCell(document) : null}
      <div className="site-pages-row-details">
        <button type="button" className="site-pages-row-main" onClick={() => selectPage(document)}>{pageLabel(document)}</button>
        <div className="site-pages-meta">{visibleProperties.filter(property => property !== "title" && property !== "featuredImage").map(property => <span className={`site-pages-meta-item is-${property}`} key={property}><strong>{propertyNames[property]}</strong> {propertyValue(document, property)}</span>)}</div>
      </div>
    </div>
    {actionsFor(document, document.binId)}
  </article>;
  const tableRows = <div className="site-pages-table-scroll"><table className="site-pages-table"><thead><tr>
    <th scope="col"><CheckboxControl label="Select all visible pages" checked={allVisibleSelected} disabled={!selectableIds.length} onChange={checked => setSelected(current => { const next = new Set(current); for (const id of selectableIds) { if (checked) next.add(id); else next.delete(id); } return next; })} /></th>
    {visibleProperties.map(property => <th key={property} scope="col">{propertyNames[property]}</th>)}<th scope="col"><span className="visually-hidden">Actions</span></th>
  </tr></thead><tbody>{activeDocuments.map(document => <tr key={document.binId ?? document.id} className={selectedId === document.id ? "is-current" : ""}>
    <td>{selectionControl(document, document.binId ?? document.id, document.binId)}</td>
    {visibleProperties.map(property => <td key={property}>{property === "title" ? <button type="button" className="site-pages-row-main" onClick={() => selectPage(document)}>{propertyValue(document, property)}</button> : propertyValue(document, property)}</td>)}<td>{actionsFor(document, document.binId)}</td>
  </tr>)}</tbody></table></div>;

  return <section className={`site-pages-catalogue density-${normalView.density}`} aria-label={`${siteName} pages`}>
    <header className="site-pages-heading"><h2>Pages</h2><StudioButton type="button" disabled={!writable || busy || isBin} onClick={() => { setFeedback(""); setDialog({ kind: "add", title: "" }); }}>Add Page</StudioButton></header>
    <div className="site-pages-tools">
      <label className="site-pages-search"><span className="visually-hidden">Search pages</span><SearchInput value={query} placeholder="Search" onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <button ref={filtersTrigger} type="button" className={`site-pages-tool-button${activeFilterCount ? " has-active-options" : ""}`} aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"} title="Filters" aria-haspopup="menu" aria-expanded={filtersOpen} onClick={() => { setFiltersOpen(value => !value); setLayoutOpen(false); setViewOpen(false); }}><AcmIcon name="action.filter" size={24} scale="Regular-M" aria-hidden="true" />{activeFilterCount ? <span className="site-pages-tool-count" aria-hidden="true" /> : null}</button>
      <button ref={layoutTrigger} type="button" className="site-pages-tool-button" aria-label={`Change layout, ${normalView.layout}`} title="Change layout" aria-haspopup="menu" aria-expanded={layoutOpen} onClick={() => { setLayoutOpen(value => !value); setFiltersOpen(false); setViewOpen(false); }}><AcmIcon name={normalView.layout === "list" ? "view.list" : normalView.layout === "table" ? "table.cell" : "layout.grid"} size={24} scale="Regular-M" aria-hidden="true" /></button>
      <button ref={viewTrigger} type="button" className={`site-pages-tool-button${hasCustomView ? " has-active-options" : ""}`} aria-label="View options" title="View options" aria-haspopup="menu" aria-expanded={viewOpen} onClick={() => { setViewOpen(value => !value); setFiltersOpen(false); setLayoutOpen(false); }}><AcmIcon name="action.settings" size={24} scale="Regular-M" aria-hidden="true" />{hasCustomView ? <span className="site-pages-tool-count" aria-hidden="true" /> : null}</button>
      {filtersOpen ? <StudioAnchoredMenu anchor={() => filtersTrigger.current} align="end" className="site-pages-filter-menu" presentation="custom" aria-label="Filter pages" onClose={(restore = true) => { setFiltersOpen(false); if (restore) requestAnimationFrame(() => filtersTrigger.current?.focus()); }}>
        <label>Author<SelectControl value={author} onChange={event => { setAuthor(event.target.value); setPage(1); }}><option value="">All authors</option>{result.authors.map(name => <option key={name}>{name}</option>)}</SelectControl></label>
        <label>Date<SelectControl value={date} onChange={event => { setDate(event.target.value); setPage(1); }}><option value="">Any date</option>{Object.entries(dateNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</SelectControl></label>
        <label>Status<SelectControl value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="">Any status</option>{pageStatusViews.filter(item => !["all", "bin"].includes(item)).map(item => <option key={item} value={item}>{statusNames[item]}</option>)}</SelectControl></label>
        {activeFilterCount ? <StudioButton type="button" variant="secondary" onClick={() => { setAuthor(""); setDate(""); setStatusFilter(""); setPage(1); }}>Clear filters</StudioButton> : null}
      </StudioAnchoredMenu> : null}
      {layoutOpen ? <StudioAnchoredMenu anchor={() => layoutTrigger.current} align="end" className="site-pages-layout-menu" aria-label="Page layout" onClose={(restore = true) => { setLayoutOpen(false); if (restore) requestAnimationFrame(() => layoutTrigger.current?.focus()); }}>
        {pageLayouts.map(layout => <button key={layout} type="button" role="menuitemradio" aria-checked={normalView.layout === layout} onClick={() => { changeView({ layout: layout as PageLayout }); setLayoutOpen(false); requestAnimationFrame(() => layoutTrigger.current?.focus()); }}><AcmIcon name={layout === "list" ? "view.list" : layout === "table" ? "table.cell" : "layout.grid"} size={20} scale="Regular-M" aria-hidden="true" /><span>{layout[0]!.toUpperCase() + layout.slice(1)}</span>{normalView.layout === layout ? <AcmIcon name="state.selected" size={18} scale="Regular-M" aria-hidden="true" /> : null}</button>)}
      </StudioAnchoredMenu> : null}
      {viewOpen ? <StudioAnchoredMenu anchor={() => viewTrigger.current} align="end" className="site-pages-view-menu" presentation="custom" aria-label="Pages view options" onClose={(restore = true) => { setViewOpen(false); if (restore) requestAnimationFrame(() => viewTrigger.current?.focus()); }}>
        <header className="site-pages-appearance-heading"><h3>Appearance</h3><StudioButton className="site-pages-reset-view" type="button" variant="secondary" onClick={() => { changeView(defaultPagesView); setPage(1); }}>Reset view</StudioButton></header>
        <div className="site-pages-appearance-sort">
          <label className="site-pages-appearance-sort-by">Sort by<SelectControl value={normalView.sortBy} onChange={event => changeView({ sortBy: event.target.value as PageSort })}>{Object.entries(sortNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</SelectControl></label>
          <RadioGroup label="Order" presentation="segmented" value={normalView.direction} options={[
            { value: "asc", label: <StudioIcon name="arrow-up" size={24} />, accessibleName: "Ascending", title: "Ascending" },
            { value: "desc", label: <StudioIcon name="arrow-down" size={24} />, accessibleName: "Descending", title: "Descending" },
          ]} onChange={value => changeView({ direction: value as PagesView["direction"] })} />
        </div>
        <RadioGroup label="Density" presentation="segmented" value={normalView.density} options={pageDensities.map(value => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }))} onChange={value => changeView({ density: value as PageDensity })} />
        <RadioGroup label="Items per page" presentation="segmented" value={String(normalView.pageSize)} options={pageSizes.map(size => ({ value: String(size), label: String(size) }))} onChange={value => { changeView({ pageSize: Number(value) as PagesView["pageSize"] }); setPage(1); }} />
        <section className="site-pages-property-section" aria-labelledby="site-pages-properties-heading">
          <h4 id="site-pages-properties-heading">Properties</h4>
          <fieldset className="site-pages-properties" aria-labelledby="site-pages-properties-heading">{normalView.properties.map((property, index) => <div className="site-pages-property-option" key={property}>
          <CheckboxControl className="site-pages-property-toggle" label={<><span className="site-pages-property-check" aria-hidden="true"><AcmIcon name="state.selected" size={20} scale="Regular-M" /></span><span>{propertyNames[property]}</span></>} checked disabled={property === "title"} onChange={checked => { if (!checked && property !== "title") changeView({ properties: normalView.properties.filter(item => item !== property) }); }} />
          <span className="site-pages-property-actions"><button type="button" aria-label={`Move ${propertyNames[property]} up`} disabled={index <= 1} onClick={() => { const next = [...normalView.properties]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; changeView({ properties: next }); }}><StudioIcon name="arrow-up" size={16} /></button><button type="button" aria-label={`Move ${propertyNames[property]} down`} disabled={property === "title" || index === normalView.properties.length - 1} onClick={() => { const next = [...normalView.properties]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; changeView({ properties: next }); }}><StudioIcon name="arrow-down" size={16} /></button></span>
        </div>)}{pageProperties.filter(property => !normalView.properties.includes(property)).map(property => <div className="site-pages-property-option" key={property}>
          <CheckboxControl className="site-pages-property-toggle" label={<><span className="site-pages-property-check" aria-hidden="true" /><span>{propertyNames[property]}</span></>} checked={false} onChange={() => changeView({ properties: [...normalView.properties, property] })} />
        </div>)}</fieldset>
        </section>
      </StudioAnchoredMenu> : null}
    </div>
    {preferenceError ? <p className="site-pages-feedback" role="alert">{preferenceError}</p> : null}
    {feedback ? <p className="site-pages-feedback" role="status">{feedback}</p> : null}
    {selectedVisible.length ? <div className="site-pages-bulk-actions"><span>{selectedVisible.length} selected</span>{isBin ? <StudioButton type="button" variant="secondary" disabled={!writable || busy} onClick={() => void run(async () => { await onRestore(selectedVisible); setSelected(new Set()); }, "Pages restored.")}>Restore</StudioButton> : <StudioButton type="button" variant="secondary" disabled={!writable || busy || selectedVisible.some(id => result.items.some(item => item.id === id && item.id === homeDocumentId))} onClick={() => void run(async () => { await onBin(selectedVisible); setSelected(new Set()); }, "Pages moved to Bin.")}>Move to Bin</StudioButton>}<button type="button" onClick={() => setSelected(new Set())}>Clear selection</button></div> : null}
    {normalView.layout === "table" ? tableRows : normalView.layout === "grid" ? <div className="site-pages-grid">{activeDocuments.map(document => <article className={selectedId === document.id ? "is-current" : ""} key={document.binId ?? document.id}>{selectionControl(document, document.binId ?? document.id, document.binId)}<button className="site-pages-grid-preview" type="button" onClick={() => selectPage(document)}>{visibleProperties.includes("featuredImage") ? imageCell(document) : null}{pageLabel(document)}</button>{visibleProperties.filter(property => property !== "title" && property !== "featuredImage").map(property => <span key={property}>{propertyNames[property]}: {propertyValue(document, property)}</span>)}{actionsFor(document, document.binId)}</article>)}</div> : <div className="site-pages-list">{activeDocuments.map(row)}</div>}
    {!result.total ? <p className="site-pages-empty">{isBin ? "The Bin is empty." : "No pages match these filters."}</p> : null}
    {result.pageCount > 1 ? <footer className="site-pages-pagination"><span>{`${(result.page - 1) * normalView.pageSize + 1}–${Math.min(result.page * normalView.pageSize, result.total)} of ${result.total}`}</span><button type="button" disabled={result.page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {result.page} of {result.pageCount}</span><button type="button" disabled={result.page >= result.pageCount} onClick={() => setPage(value => value + 1)}>Next</button></footer> : null}
    {dialog ? <StudioDialog title={dialog.kind === "add" ? "Add Page" : dialog.kind === "rename" ? "Rename page" : "Order page"} className="site-pages-dialog" onClose={() => setDialog(null)} selectInitialText={dialog.kind === "rename"}>
      <form onSubmit={submitDialog}>{dialog.kind === "order" ? <><p>Pages with the same order appear alphabetically by title.</p><label><span>Order</span><NumberInput required step={1} min={-2147483648} max={2147483647} value={dialog.order} onChange={event => setDialog({ ...dialog, order: event.target.value })} /></label></> : <label><span>Page title</span><TextInput required maxLength={160} value={dialog.title} onChange={event => setDialog({ ...dialog, title: event.target.value })} /></label>}{feedback ? <p role="alert">{feedback}</p> : null}<StudioDialogActions><StudioButton variant="secondary" type="button" onClick={() => setDialog(null)}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable || busy}>{busy ? "Saving…" : dialog.kind === "add" ? "Add Page" : dialog.kind === "rename" ? "Rename" : "Save"}</StudioButton></StudioDialogActions></form>
    </StudioDialog> : null}
  </section>;
}
