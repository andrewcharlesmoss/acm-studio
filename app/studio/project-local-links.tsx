"use client";
import { sitesDisclosureChangedEvent } from "./sites-disclosure-contract.mjs";
import { createSitesDisclosureRepository, sitesDisclosureKey } from "./sites-disclosure-repository.mjs";
import { InspectorAccordionSection } from "./inspector-accordion";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import { LibraryDragHandle } from "./library-drag-handle";
import { useSiteOrdering } from "./use-site-ordering";
import type { useLibraryReordering } from "./use-library-reordering";
import { studioContextPath, type StudioLibraryKind } from "./use-studio-screen-navigation";
import { isLocalFixtureSiteId, localFixtureSites, localFixtureHref, type LocalFixtureSiteId } from "./test-site/sites";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { studioProjects } from "./project-registry";
import { ProjectEnvironmentActions } from "./project-environment-links";
import { StudioIcon } from "./studio-icons";

type LocalProject = { id: string; status: "running" | "stopped" | "multiple" | "unconfigured" | "starting" | "stopping" | "failed" | "conflict" | "review" | "unavailable"; href?: string };
type LocalSnapshot = { available: boolean; projects: LocalProject[] };
const statusLabels: Record<LocalProject["status"], string> = {
  running: "Local server running", stopped: "Local server stopped",
  unconfigured: "Local server not configured", multiple: "Multiple servers — choose in Project Ports",
  starting: "Local server starting", stopping: "Local server stopping",
  failed: "Local server failed", conflict: "Local port conflict",
  review: "Local service needs review", unavailable: "Local website address unavailable",
};

async function readLocalProjects(signal?: AbortSignal): Promise<LocalSnapshot> {
  const response = await fetch("/__studio/local-projects", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history" },
    body: "{}", signal,
  });
  if (!response.ok) throw new Error("Local discovery unavailable");
  return response.json();
}

const LocalProjectsContext = createContext<{ local: boolean | null; currentAddress: string | null; snapshot: LocalSnapshot | null; refreshSnapshot: (snapshot: LocalSnapshot) => void }>({ local: null, currentAddress: null, snapshot: null, refreshSnapshot: () => {} });

function localStatus(snapshot: LocalSnapshot | null, project: LocalProject | undefined) {
  if (!snapshot) return "Checking…";
  if (!snapshot.available) return "Project Ports unavailable";
  if (!project) return statusLabels.unconfigured;
  if (project.status !== "running" || !project.href) return statusLabels[project.status];
  try {
    const url = new URL(project.href);
    const address = `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
    return address;
  } catch { return statusLabels[project.status]; }
}

export function ProjectLocalLinksProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LocalSnapshot | null>(null);
  const [local, setLocal] = useState<boolean | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  useEffect(() => {
    const isLocal = window.location.hostname === "localhost";
    let active = true;
    queueMicrotask(() => { if (active) { setLocal(isLocal); setCurrentAddress(isLocal ? window.location.host : null); } });
    if (!isLocal) return () => { active = false; };
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void readLocalProjects(controller.signal).then(value => { if (!controller.signal.aborted) { setLocal(true); setSnapshot(value); } }).catch(() => {
        if (!controller.signal.aborted) { setLocal(true); setSnapshot({ available: false, projects: [] }); }
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  return <LocalProjectsContext.Provider value={{ local, currentAddress, snapshot, refreshSnapshot: setSnapshot }}>{children}</LocalProjectsContext.Provider>;
}

function useLocalProjectVisit(id: string, destination?: string) {
  const { local, snapshot, refreshSnapshot } = useContext(LocalProjectsContext);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = snapshot?.projects.find(project => project.id === id);
  const canVisit = Boolean(local && snapshot?.available && project?.status === "running");
  async function openLocal() {
    // Open synchronously during the click so the browser does not block the tab
    // while local discovery checks the current Project Ports address.
    const tab = window.open("about:blank", "_blank");
    if (!tab) return;
    tab.opener = null;
    setOpening(true);
    setError(null);
    try {
      const fresh = await readLocalProjects();
      refreshSnapshot(fresh);
      const href = fresh.projects.find(project => project.id === id && project.status === "running")?.href;
      // Re-read at click time so a changed port never opens a stale address.
      const url = href ? new URL(href) : null;
      const target = url && destination ? new URL(destination, url) : url;
      if (fresh.available && url && target && ["http:", "https:"].includes(url.protocol) && url.hostname === "localhost" && !url.username && !url.password && target.origin === url.origin && !target.username && !target.password) tab.location.replace(target.href);
      else { tab.close(); setError("The local website is unavailable. Check Project Ports and try again."); }
    } catch { tab.close(); refreshSnapshot({ available: false, projects: [] }); setError("The local website is unavailable. Check Project Ports and try again."); }
    finally { setOpening(false); }
  }
  return { local, canVisit, opening, error, openLocal };
}

/** Uses the same fresh address check as the Sites pane, without guessing a port. */
export function ProjectLocalDocumentLink({ siteId, destination }: { siteId: LocalFixtureSiteId; destination: string }) {
  const { canVisit, opening, error, openLocal } = useLocalProjectVisit(siteId, destination);
  return <><button type="button" className="page-link-view" disabled={opening || !canVisit} title={canVisit ? "View page on the local website in a new tab" : "Local website unavailable"} onClick={() => void openLocal()}>View <StudioIcon name="external" size={16} /></button>{error ? <p role="alert">{error}</p> : null}</>;
}

export function ProjectLocalLink({ id, name, onEdit, active = false, showStatus = false, studioHref }: { id: string; name: string; onEdit?: () => void; active?: boolean; showStatus?: boolean; studioHref?: string }) {
  const { local, canVisit, opening, openLocal } = useLocalProjectVisit(id);
  const selfVisit = local && id === "acm-studio";
  const editHref = local && isLocalFixtureSiteId(id) ? studioHref ?? localFixtureHref(id) : undefined;
  const editName = `Edit Site — ${name} — Local${editHref ? "" : " — not available yet"}`;
  const visitName = `Visit Site — ${name} — Local${selfVisit || canVisit ? "" : " — local server unavailable"}`;
  return <div className="dashboard-project-environment dashboard-local-environment" data-active={active || undefined}>
    <strong>Local{active && <span className="visually-hidden"> — Active Environment</span>}</strong>
    <div className="dashboard-project-links">
      {editHref ? <a className="dashboard-card-link is-icon-only" href={editHref} aria-current={active ? "page" : undefined} onClick={onEdit ? event => { event.preventDefault(); onEdit(); } : undefined} aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></a>
        : <button className="dashboard-card-link is-icon-only is-unavailable" type="button" disabled aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></button>}
      {selfVisit ? <a className="dashboard-card-link is-icon-only dashboard-local-open" href="/" target="_blank" rel="noopener noreferrer" aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></a>
        : <button type="button" className="dashboard-card-link is-icon-only dashboard-local-open" disabled={opening || !canVisit} onClick={() => void openLocal()} aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></button>}
    </div>
    {showStatus ? <ProjectLocalStatus id={id} /> : null}
  </div>;
}

export function ProjectLocalSiteNavigation({ id, name, onSelectTest, active = false, studioHref, reordering }: { reordering?: ReturnType<typeof useLibraryReordering>; id: string; name: string; onSelectTest?: () => void; active?: boolean; studioHref?: string }) {
  const project = studioProjects.find(item => item.id === id);
  const localActions = <ProjectLocalLink id={id} name={name} onEdit={onSelectTest} active={active} showStatus studioHref={studioHref} />;
  const siteTitle = <><span className="studio-local-site-mark" aria-hidden="true">{name.slice(0, 1)}</span><span className="studio-local-site-copy"><strong>{name}</strong></span></>;

  const dragProps = reordering?.rowProps(id);
  return <div className={`studio-local-site-actions${active ? " is-active" : ""}`} data-library-entry-id={dragProps?.["data-library-entry-id"]} data-library-reorder-owner={dragProps?.["data-library-reorder-owner"]} data-gap-row={dragProps?.["data-gap-row"]} data-gap-owner={dragProps?.["data-gap-owner"]} data-library-drop-row={true} style={dragProps?.style} data-drop-edge={dragProps?.["data-drop-edge"]} onDragOver={dragProps?.onDragOver} onDragLeave={dragProps?.onDragLeave} onDrop={dragProps?.onDrop}>
    <div className="studio-local-site-heading">
      {isLocalFixtureSiteId(id) ? <a className="studio-local-site" href={studioHref ?? localFixtureHref(id)} aria-current={active ? "page" : undefined} aria-label={`Edit ${name} local site`} onClick={event => { if (onSelectTest) { event.preventDefault(); onSelectTest(); } }}>{siteTitle}</a>
        : <div className="studio-local-site is-uneditable">{siteTitle}</div>}
      {reordering ? <button {...dragProps} data-gap-row={undefined} data-gap-owner={undefined} data-library-drop-row={undefined} data-drop-edge={undefined} style={undefined} className="studio-site-drag-button" type="button" aria-disabled={!reordering.canReorder} aria-label={`Reorder ${name}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={reordering.canReorder} /></button> : null}
    </div>
      <div className="studio-local-site-environments">
        {project ? <ProjectEnvironmentActions project={project} local={localActions} /> : localActions}
      </div>
  </div>;
}

export function ProjectLocalStatus({ id }: { id: string }) {
  const { local, currentAddress, snapshot } = useContext(LocalProjectsContext);
  if (id === "acm-studio" && local && currentAddress) return <small className="dashboard-local-status" role="status" title={`Local server running — ${currentAddress}`} aria-label={`Local server running — ${currentAddress}`}><span className="studio-server-status-dot" data-state="running" aria-hidden="true" />{currentAddress}</small>;
  const project = snapshot?.projects.find(project => project.id === id);
  const status = local === false ? "Local only" : localStatus(snapshot, project);
  const description = local === false ? "Open Studio on localhost to access local sites"
    : !snapshot ? "Checking local server…"
      : local && project?.status === "running" && project.href ? `${statusLabels.running} — ${status}` : status;
  const serverState = local && snapshot?.available && project
    ? project.status === "failed" || project.status === "conflict" ? "failed"
      : project.status === "running" && project.href ? "running" : "unavailable"
    : "unavailable";
  return <small className="dashboard-local-status" role="status" title={description} aria-label={description}><span className="studio-server-status-dot" data-state={serverState} aria-hidden="true" />{status}</small>;
}

// One browser preference follows the shared Sites pane across local site contexts.
const SitesDisclosureContext = createContext<{ open: boolean; setOpen: (open: boolean) => void; status: string } | null>(null);
export function SitesDisclosureProvider({ children }: { children: ReactNode }) {
  const [open, updateOpen] = useState(true);
  const [status, setStatus] = useState("");
  const repository = useRef<ReturnType<typeof createSitesDisclosureRepository> | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const counter = generation;
    try {
      const current = createSitesDisclosureRepository({ storage: window.localStorage });
      repository.current = current;
      const initial = current.read();
      queueMicrotask(() => { if (active) updateOpen(initial === "expanded"); });
    } catch { queueMicrotask(() => { if (active) setStatus("Sites state applies to this page; saving is unavailable."); }); }
    const refresh = (event: StorageEvent) => {
      if ((event.key !== sitesDisclosureKey && event.key !== null) || pending.current) return;
      try { if (repository.current) { updateOpen(repository.current.read() === "expanded"); setStatus(""); } }
      catch { setStatus("Sites state could not be refreshed."); }
    };
    const ownerRefresh = () => refresh({ key: sitesDisclosureKey } as StorageEvent);
    window.addEventListener("storage", refresh);
    window.addEventListener(sitesDisclosureChangedEvent, ownerRefresh);
    return () => { active = false; counter.current++; repository.current = null; window.removeEventListener("storage", refresh); window.removeEventListener(sitesDisclosureChangedEvent, ownerRefresh); };
  }, []);
  function setOpen(next: boolean) {
    updateOpen(next); setStatus("");
    const attempt = ++generation.current;
    const current = repository.current;
    if (!current) { setStatus("Sites state applies to this page; saving is unavailable."); return; }
    pending.current = true;
    void current.save(next ? "expanded" : "collapsed").then(result => {
      if (attempt !== generation.current) return;
      pending.current = false;
      if (result.saved) {
        try { updateOpen(current.read() === "expanded"); }
        catch { setStatus("Sites state could not be refreshed."); }
      }
      if (!result.saved) setStatus(result.reason === "owner-unavailable" ? "Sites state save could not be confirmed by the owning Studio tab. Try changing it again before switching sites." : result.reason === "blocked" ? "Sites state applies to this page; another Studio tab prevents saving." : "Sites state applies to this page; saving is unavailable.");
    });
  }
  return <SitesDisclosureContext.Provider value={{ open, setOpen, status }}>{children}</SitesDisclosureContext.Provider>;
}

export function LocalFixtureSiteNavigation({ selectedSite, onSelectSite, libraryKind }: { selectedSite?: LocalFixtureSiteId | null; onSelectSite?: (id: LocalFixtureSiteId) => void; libraryKind?: StudioLibraryKind }) {
  const disclosure = useContext(SitesDisclosureContext);
  const studio = studioProjects.find(project => project.id === "acm-studio");
  const sites = [...(studio ? [{ id: studio.id, name: studio.name }] : []), ...localFixtureSites];
  const { order, reordering, status } = useSiteOrdering(sites.map(site => site.id));
  const cancelReordering = reordering.cancel;
  useEffect(() => { if (disclosure?.open === false) cancelReordering(); }, [disclosure?.open, cancelReordering]);
  return <><InspectorAccordionSection className="studio-local-sites" title="Sites" label="Sites" open={disclosure?.open} onOpenChange={open => { disclosure?.setOpen(open); if (!open) reordering.cancel(); }}><div {...reordering.listProps}><DragPlacementIndicator line={reordering.line} />{order.map(id => { const site = sites.find(site => site.id === id)!; return <ProjectLocalSiteNavigation key={id} reordering={reordering} id={id} name={site.name} active={selectedSite === id} studioHref={isLocalFixtureSiteId(id) && libraryKind ? studioContextPath(id, libraryKind) : undefined} onSelectTest={isLocalFixtureSiteId(id) && onSelectSite ? () => onSelectSite(id) : undefined} />; })}</div><span className="visually-hidden" role="status">{reordering.message}</span>{status ? <p className="studio-site-order-status" role="status">{status}</p> : null}</InspectorAccordionSection>{disclosure?.status ? <p className="studio-site-order-status" role="status">{disclosure.status}</p> : null}</>;
}
