"use client";

import { useRef, useState, type CSSProperties } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { RadioGroup } from "../controls/radio-group";
import { CheckboxControl } from "../controls/checkbox-control";
import { StudioButton } from "../controls/button";
import { RangeControl } from "../controls/range-control";
import { StudioIcon } from "../studio-icons";
import { ReferenceTemplatePartPreview } from "../reference-template-part-preview";
import type { TemplatePart, TemplateSet } from "../template-model";
import { studioContextPath } from "../use-studio-screen-navigation";
import type { LocalFixtureSiteId } from "../test-site/sites";
import "./pages-catalogue.css";
import { patternPage } from "./patterns-view-model.mjs";

type Entry = { set: TemplateSet; entry: TemplatePart };
export function PatternsCatalogue({ entries, scope, onDuplicate, writable = false }: { entries: Entry[]; scope: LocalFixtureSiteId | null; onDuplicate?: (item: Entry) => void; writable?: boolean }) {
  const [layout, setLayout] = useState<"grid" | "table">("grid");
  const [direction, setDirection] = useState<"reference" | "asc" | "desc">("reference");
  const [sortField, setSortField] = useState<"title" | "author">("title");
  const [sortMenu, setSortMenu] = useState<"title" | "author" | null>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const [density, setDensity] = useState("balanced");
  const [previewSize, setPreviewSize] = useState(2);
  const [pageSize, setPageSize] = useState(20);
  const [showPreview, setShowPreview] = useState(true);
  const [showAuthor, setShowAuthor] = useState(true);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<"layout" | "view" | null>(null);
  const layoutRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [actionItem, setActionItem] = useState<Entry | null>(null);
  const close = (restore = true) => { const ref = open === "layout" ? layoutRef : viewRef; setOpen(null); if (restore) requestAnimationFrame(() => ref.current?.focus()); };
  const { items: visible, currentPage, totalPages } = patternPage(entries, direction, page, pageSize, sortField);
  const href = ({ set, entry }: Entry) => studioContextPath(scope, "templates", { setId: set.id, targetId: entry.id, scope: "global" });
  const reset = () => { setLayout("grid"); setDirection("reference"); setSortField("title"); setDensity("balanced"); setPreviewSize(2); setPageSize(20); setShowPreview(true); setShowAuthor(true); setPage(1); };
  return <>
    <div className="site-pattern-tools site-pages-tools">
      <button ref={layoutRef} type="button" className="site-pages-tool-button" aria-label={`Change layout, ${layout}`} title="Change layout" aria-haspopup="menu" aria-expanded={open === "layout"} onClick={() => setOpen(open === "layout" ? null : "layout")}><AcmIcon name={layout === "grid" ? "layout.grid" : "table.cell"} size={24} scale="Regular-M" /></button>
      <button ref={viewRef} type="button" className="site-pages-tool-button" aria-label="View options" title="View options" aria-haspopup="dialog" aria-expanded={open === "view"} onClick={() => setOpen(open === "view" ? null : "view")}><AcmIcon name="action.settings" size={24} scale="Regular-M" /></button>
      {open === "layout" ? <StudioAnchoredMenu anchor={() => layoutRef.current} align="end" className="site-pages-layout-menu" aria-label="Pattern layout" onClose={close}>{(["table", "grid"] as const).map(value => <button type="button" role="menuitemradio" aria-checked={layout === value} key={value} onClick={() => { setLayout(value); close(); }}><AcmIcon name={value === "grid" ? "layout.grid" : "table.cell"} size={20} /><span>{value === "grid" ? "Grid" : "Table"}</span>{layout === value ? <AcmIcon name="state.selected" size={18} /> : null}</button>)}</StudioAnchoredMenu> : null}
      {open === "view" ? <StudioAnchoredPopover anchor={() => viewRef.current} className="site-pages-view-menu" label="Pattern view options" focusOnMount onClose={close}>
        <header className="site-pages-appearance-heading"><h3>Appearance</h3><button type="button" aria-label="Close view options" onClick={() => close()}><StudioIcon name="close" size={20} /></button><StudioButton type="button" variant="secondary" onClick={reset}>Reset view</StudioButton></header>
        <div>Sort by: {sortField === "title" ? "Title" : "Author"}</div>
        <RadioGroup label="Order" presentation="segmented" value={direction} options={[{value:"reference",label:"Default"},{value:"asc",label:"Ascending"},{value:"desc",label:"Descending"}]} onChange={value => { setDirection(value as typeof direction); setPage(1); }} />
        <RadioGroup label="Density" presentation="segmented" value={density} options={["comfortable", "balanced", "compact"].map(value => ({value,label:value[0]!.toUpperCase()+value.slice(1)}))} onChange={setDensity} />
        {layout === "grid" ? <div className="site-pattern-preview-size"><span>Preview size</span><RangeControl className="studio-range-control studio-spacing-range" aria-label="Preview size" min={0} max={5} step={1} value={previewSize} style={{ "--spacing-segments": 5 } as CSSProperties} onChange={event => setPreviewSize(Number(event.target.value))} /></div> : null}
        <RadioGroup label="Items per page" presentation="segmented" value={String(pageSize)} options={[10,20,50,100].map(value => ({value:String(value),label:String(value)}))} onChange={value => { setPageSize(Number(value)); setPage(1); }} />
        <section className="site-pages-property-section"><h4>Properties</h4><CheckboxControl label="Preview" checked={showPreview} onChange={setShowPreview} /><CheckboxControl label="Author" checked={showAuthor} onChange={setShowAuthor} /></section>
      </StudioAnchoredPopover> : null}
    </div>
    {layout === "grid" ? <div className={`site-pattern-list size-${previewSize} density-${density}`}>{visible.map(item => <div className="site-pattern-card" key={`${item.set.id}/${item.entry.id}`}>{showPreview ? <ReferenceTemplatePartPreview set={item.set} part={item.entry} /> : null}<a data-studio-departure href={href(item)}><span><strong>{item.entry.name}</strong>{showAuthor ? <small>Twenty Twenty-Five</small> : null}</span></a></div>)}</div> : <div className="site-pages-table-scroll" role="region" aria-label="Pattern table" tabIndex={0 /* eslint-disable-line jsx-a11y/no-noninteractive-tabindex -- The scrollable table region must be keyboard reachable. */}><table className={`site-pages-table site-pattern-table density-${density}`}><thead><tr><th scope="col" aria-sort={sortField === "title" && direction !== "reference" ? (direction === "asc" ? "ascending" : "descending") : undefined}><button type="button" className="site-pattern-sort-heading" aria-haspopup="menu" aria-expanded={sortMenu === "title"} onClick={event => { sortRef.current = event.currentTarget; setSortMenu(current => current === "title" ? null : "title"); }}>Title <StudioIcon name="chevron-down" /></button></th>{showAuthor ? <th scope="col" aria-sort={sortField === "author" && direction !== "reference" ? (direction === "asc" ? "ascending" : "descending") : undefined}><button type="button" className="site-pattern-sort-heading" aria-haspopup="menu" aria-expanded={sortMenu === "author"} onClick={event => { sortRef.current = event.currentTarget; setSortMenu(current => current === "author" ? null : "author"); }}>Author <StudioIcon name="chevron-down" /></button></th> : null}<th scope="col">Actions</th></tr></thead><tbody>{visible.map(item => <tr key={`${item.set.id}/${item.entry.id}`}><td><div className="site-pattern-table-title">{showPreview ? <div className={`site-pattern-card${item.entry.id === "tt5-vertical-header" ? " is-vertical" : ""}`}><ReferenceTemplatePartPreview set={item.set} part={item.entry} /><a data-studio-departure href={href(item)} aria-label={`Open ${item.entry.name}`} /></div> : null}<a data-studio-departure href={href(item)}>{item.entry.name}</a></div></td>{showAuthor ? <td>Twenty Twenty-Five</td> : null}<td><button type="button" className="site-pages-more" aria-label={`Actions for ${item.entry.name}`} aria-haspopup="menu" aria-expanded={actionItem?.entry.id === item.entry.id} onClick={event => { actionRef.current = event.currentTarget; setActionItem(current => current?.set.id === item.set.id && current.entry.id === item.entry.id ? null : item); }}><StudioIcon name="more-vertical" /></button></td></tr>)}</tbody></table>{sortMenu ? <StudioAnchoredMenu anchor={() => sortRef.current} className="site-pages-action-menu" aria-label={`Sort by ${sortMenu}`} onClose={(restore = true) => { setSortMenu(null); if (restore) requestAnimationFrame(() => sortRef.current?.focus()); }}>{(["asc", "desc"] as const).map(value => <button type="button" role="menuitemradio" aria-checked={sortField === sortMenu && direction === value} key={value} onClick={() => { setSortField(sortMenu); setDirection(value); setPage(1); setSortMenu(null); requestAnimationFrame(() => sortRef.current?.focus()); }}>Sort {value === "asc" ? "ascending" : "descending"}</button>)}</StudioAnchoredMenu> : null}{actionItem ? <StudioAnchoredMenu anchor={() => actionRef.current} align="end" className="site-pages-action-menu" aria-label={`Actions for ${actionItem.entry.name}`} onClose={(restoreFocus = true) => { setActionItem(null); if (restoreFocus) requestAnimationFrame(() => actionRef.current?.focus()); }}><a role="menuitem" data-studio-departure href={href(actionItem)}>Edit</a><button type="button" role="menuitem" disabled={!writable || !onDuplicate} onClick={() => { onDuplicate?.(actionItem); setActionItem(null); requestAnimationFrame(() => actionRef.current?.focus()); }}>Duplicate</button></StudioAnchoredMenu> : null}</div>}
    {!visible.length ? <p>No template parts in this section.</p> : null}
    {totalPages > 1 ? <nav className="site-pattern-pagination" aria-label="Pattern pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous page</button><span>Page {currentPage} of {totalPages}</span><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next page</button></nav> : null}
  </>;
}
