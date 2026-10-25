"use client";

import { useState } from "react";
import { CheckboxControl } from "../../controls/checkbox-control";
import { createDocument, type StudioBinnedDocument, type StudioDocument } from "../../editor-model";
import { defaultPagesView, type PageStatusView, type PagesView } from "../../site-editor/pages-model.mjs";
import { PagesCatalogue, PagesSidebar } from "../../site-editor/pages-catalogue";
import { Pane } from "../../panes/pane-components";
import { TwoLeftPaneWorkspace } from "../../panes/two-left-pane-workspace";
import { StudioIcon } from "../../studio-icons";

const homepageId = "library-pages-home";
const thumbnail = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 88 72'%3E%3Crect width='88' height='72' fill='%23cdebf5'/%3E%3Cpath d='M0 50 27 22 48 48 66 28 88 55v17H0z' fill='%23759c80'/%3E%3C/svg%3E";

function fixturePage(index: number): StudioDocument {
  const title = index === 0 ? "Home" : index === 1 ? "About the project" : `Example page ${String(index).padStart(2, "0")}`;
  const document = createDocument("page", index === 0 ? homepageId : `library-pages-${index}`);
  const statuses: StudioDocument["status"][] = ["published", "published", "draft", "scheduled", "pending", "private"];
  const status = statuses[index % statuses.length]!;
  return {
    ...document,
    title,
    slug: index === 0 ? "home" : title.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    excerpt: index % 3 === 0 ? "A short example summary for page search." : "",
    author: index % 7 === 0 ? undefined : index % 2 === 0 ? "Andrew Moss" : "Example Editor",
    status,
    updatedAt: `2026-10-${String(Math.max(1, 25 - (index % 24))).padStart(2, "0")}T12:00:00.000Z`,
    ...(status === "published" ? { publishedAt: `2026-10-${String(Math.max(1, 25 - (index % 24))).padStart(2, "0")}T12:00:00.000Z` } : {}),
    ...(status === "scheduled" ? { publishAt: "2026-11-02T09:00:00.000Z" } : {}),
    ...(index % 4 === 0 ? { coverImage: { src: thumbnail, alt: "Example landscape" } } : {}),
    ...(index === 2 ? { blocks: [{ id: "library-page-search", type: "paragraph", text: "Find this page by searching its body text." }] } : {}),
    ...(index === 3 ? { template: "wide" as const } : {}),
    ...(index === 4 ? { parentPageId: homepageId } : {}),
  };
}

function initialDocuments() { return Array.from({ length: 26 }, (_, index) => fixturePage(index)); }

export function PagesCatalogueSpecimen() {
  const [documents, setDocuments] = useState<StudioDocument[]>(initialDocuments);
  const [binned, setBinned] = useState<StudioBinnedDocument[]>([{ id: "library-pages-bin-1", deletedAt: "2026-10-20T12:00:00.000Z", document: { ...fixturePage(26), title: "Binned example" } }]);
  const [view, setView] = useState<PagesView>(() => ({ ...defaultPagesView, properties: [...defaultPagesView.properties] }));
  const [status, setStatus] = useState<PageStatusView>("all");
  const [selectedId, setSelectedId] = useState(homepageId);
  const [readOnly, setReadOnly] = useState(false);
  const [failPreferences, setFailPreferences] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [catalogueWidth, setCatalogueWidth] = useState(380);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [catalogueCollapsed, setCatalogueCollapsed] = useState(false);
  const selectedPage = documents.find(document => document.id === selectedId);

  function updateView(next: PagesView) {
    setView({ ...next, properties: [...next.properties] });
    setPreferenceError(failPreferences ? "View options could not be saved. This choice is kept for this example." : "");
  }
  function requireWrite() { if (readOnly) throw new Error("This example is read-only. Turn off Read-only example to make temporary changes."); }
  async function addPage(title: string) {
    requireWrite();
    const document = { ...fixturePage(27), id: `library-pages-${crypto.randomUUID()}`, title, slug: title.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "new-page", status: "draft" as const, updatedAt: new Date().toISOString(), blocks: [] };
    setDocuments(current => [...current, document]);
    setSelectedId(document.id);
    setFeedback("Temporary page added to the example.");
    return document;
  }
  function renamePage(document: StudioDocument, title: string) {
    requireWrite();
    setDocuments(current => current.map(item => item.id === document.id ? { ...item, title, slug: title.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : item));
  }
  function updateOrder(document: StudioDocument, pageOrder: number) {
    requireWrite();
    setDocuments(current => current.map(item => item.id === document.id ? { ...item, pageOrder } : item));
  }
  function binPages(ids: string[]) {
    requireWrite();
    if (ids.includes(homepageId)) throw new Error("The homepage is protected in this example.");
    const selected = ids.map(id => documents.find(document => document.id === id));
    if (selected.some(document => !document)) throw new Error("A selected page is no longer available. The example was not changed.");
    const moved = selected as StudioDocument[];
    const nextBin = moved.map(document => ({ id: `library-bin-${crypto.randomUUID()}`, deletedAt: new Date().toISOString(), document }));
    setBinned(current => [...current, ...nextBin]);
    setDocuments(current => current.filter(document => !ids.includes(document.id)));
    if (ids.includes(selectedId)) setSelectedId(homepageId);
  }
  function restorePages(ids: string[]) {
    requireWrite();
    const selected = ids.map(id => binned.find(item => item.id === id));
    if (selected.some(item => !item)) throw new Error("A selected binned page is no longer available. The example was not changed.");
    setDocuments(current => [...current, ...(selected as StudioBinnedDocument[]).map(item => item.document)]);
    setBinned(current => current.filter(item => !ids.includes(item.id)));
  }

  return <div className="ui-pages-catalogue-specimen">
    <div className="ui-pages-catalogue-specimen-controls">
      <CheckboxControl label="Read-only example" checked={readOnly} onChange={setReadOnly} />
      <CheckboxControl label="Preference save failure" checked={failPreferences} onChange={setFailPreferences} />
    </div>
    <p className="ui-pages-catalogue-specimen-note">All page changes and preferences stay in this example. The fixture includes missing metadata, a protected homepage, several statuses, and enough records to paginate.</p>
    {feedback ? <p className="site-pages-feedback" role="status">{feedback}</p> : null}
    <TwoLeftPaneWorkspace className="ui-pages-catalogue-specimen-layout" label="Pages catalogue example workspace" primary={
      <Pane label="Pages navigation example" side="left" width={navigationWidth} minWidth={180} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} flushRegions={["body"]}>
        <PagesSidebar value={status} onChange={setStatus} onBack={() => setFeedback("Back to the example overview.")} />
      </Pane>
    } secondary={
      <Pane label="Pages catalogue example" side="left" width={catalogueWidth} minWidth={300} maxWidth={680} onWidthChange={setCatalogueWidth} collapsed={catalogueCollapsed} onCollapsedChange={setCatalogueCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} flushRegions={["body"]}>
        <PagesCatalogue
      siteName="Example site"
      documents={documents}
      binned={binned}
      homeDocumentId={homepageId}
      selectedId={selectedId}
      status={status}
      onStatusChange={setStatus}
      view={view}
      writable={!readOnly}
      preferenceError={preferenceError}
      onViewChange={updateView}
      onAddPage={addPage}
      onSelect={document => setSelectedId(document.id)}
      onEdit={document => { setSelectedId(document.id); setFeedback(`Edit example: ${document.title}. No production editor or site data is opened.`); }}
      onViewPage={document => { setSelectedId(document.id); setFeedback(`${document.status === "published" ? "Published" : "Draft"} preview selected: ${document.title}.`); }}
      onRename={renamePage}
      onOrder={updateOrder}
      onBin={binPages}
      onRestore={restorePages}
      resolveFeaturedImage={document => document.coverImage?.src}
      templateNameFor={document => document.template === "wide" ? "Wide" : document.template === "landing" ? "Landing" : "Default"}
        />
      </Pane>
    }>
      <section className="ui-pages-catalogue-specimen-preview" aria-label="Selected page preview">
        <article>
          <p>PAGE PREVIEW</p>
          <h2>{selectedPage?.title || "Select a page"}</h2>
          <p>{selectedPage?.excerpt || "The selected page preview appears here."}</p>
        </article>
      </section>
    </TwoLeftPaneWorkspace>
  </div>;
}
