"use client";
import { sitesDisclosureChangedEvent } from "./sites-disclosure-contract.mjs";
import { createSitesDisclosureRepository, sitesDisclosureKey } from "./sites-disclosure-repository.mjs";
import { InspectorAccordionSection } from "./inspector-accordion";
import { SiteNavigationEntry } from "./controls/site-navigation-entry";
import { LocalProjectStatusAddress, LocalProjectStatusRow } from "./controls/local-project-status-row";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import { LibraryDragHandle } from "./library-drag-handle";
import { useSiteOrdering } from "./use-site-ordering";
import type { useLibraryReordering } from "./use-library-reordering";
import { studioContextPath, type StudioLibraryKind } from "./use-studio-screen-navigation";
import { isLocalFixtureSiteId, localFixtureSites, localFixtureHref, type LocalFixtureSiteId } from "./test-site/sites";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("available" in value) || typeof value.available !== "boolean" || !("projects" in value) || !Array.isArray(value.projects) || value.projects.length > studioProjects.length) throw new Error("Invalid local discovery response");
  const seen = new Set<string>();
  const projects = value.projects.map((project: unknown): LocalProject => {
    if (!project || typeof project !== "object" || !("id" in project) || typeof project.id !== "string" || !studioProjects.some(item => item.id === project.id) || seen.has(project.id) || !("status" in project) || typeof project.status !== "string" || !Object.hasOwn(statusLabels, project.status)) throw new Error("Invalid local project status");
    seen.add(project.id);
    let href: string | undefined;
    if ("href" in project) {
      if (typeof project.href !== "string") throw new Error("Invalid local project address");
      const url = new URL(project.href);
      if (!["http:", "https:"].includes(url.protocol) || url.hostname !== "localhost" || url.username || url.password || url.search || url.hash || !url.port || Number(url.port) < 1024) throw new Error("Invalid local project address");
      href = url.href;
    }
    if (project.status === "running" && !href) throw new Error("Missing local project address");
    return { id: project.id, status: project.status as LocalProject["status"], ...(href ? { href } : {}) };
  });
  if (!value.available && projects.length) throw new Error("Invalid unavailable local discovery response");
  return { available: value.available, projects };
}

const LocalProjectsContext = createContext<{ local: boolean | null; currentAddress: string | null; snapshot: LocalSnapshot | null; stale: boolean; refreshing: boolean; manualRefreshing: boolean; refreshStatus: () => void; readSnapshot: () => Promise<LocalSnapshot> }>({ local: null, currentAddress: null, snapshot: null, stale: false, refreshing: false, manualRefreshing: false, refreshStatus: () => {}, readSnapshot: readLocalProjects });

export function ProjectLocalLinksProvider({ children }: { children: ReactNode }) {
  const [discovery, setDiscovery] = useState<{ snapshot: LocalSnapshot | null; stale: boolean }>({ snapshot: null, stale: false });
  const [refreshing, setRefreshing] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const pending = useRef(0);
  const [local, setLocal] = useState<boolean | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const active = useRef(false);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  async function readSnapshot() {
    const attempt = ++request.current;
    pending.current++;
    queueMicrotask(() => { if (active.current) setRefreshing(pending.current > 0); });
    const signal = controller.current?.signal;
    try {
      const value = await readLocalProjects(signal);
      if (!active.current || signal?.aborted || attempt !== request.current) throw new Error("Local discovery was superseded");
      setDiscovery(previous => value.available
        ? { snapshot: value, stale: false }
        : { snapshot: previous.snapshot?.available ? previous.snapshot : value, stale: Boolean(previous.snapshot?.available) });
      return value;
    } catch (error) {
      if (active.current && !signal?.aborted && attempt === request.current) setDiscovery(previous => ({ snapshot: previous.snapshot ?? { available: false, projects: [] }, stale: Boolean(previous.snapshot?.available) }));
      throw error;
    } finally {
      pending.current--;
      if (active.current) setRefreshing(pending.current > 0);
    }
  }
  function refreshStatus() {
    if (!active.current || pending.current > 0) return;
    setManualRefreshing(true);
    void readSnapshot().catch(() => { /* Shared status reports a failed check without losing the last snapshot. */ }).finally(() => { if (active.current) setManualRefreshing(false); });
  }
  useLayoutEffect(() => {
    const isLocal = window.location.hostname === "localhost";
    active.current = true;
    queueMicrotask(() => { if (active.current) { setLocal(isLocal); setCurrentAddress(isLocal ? window.location.host : null); } });
    if (!isLocal) return () => { active.current = false; };
    const lifetimeController = new AbortController();
    const generation = request;
    controller.current = lifetimeController;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void readSnapshot().catch(() => { /* The latest failure is reported without replacing confirmed status. */ });
    };
    refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { active.current = false; generation.current++; lifetimeController.abort(); window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  return <>
    <span className="visually-hidden studio-local-refresh-announcement" role="status">{manualRefreshing ? "Refreshing local server status" : ""}</span>
    <LocalProjectsContext.Provider value={{ local, currentAddress, ...discovery, refreshing, manualRefreshing, refreshStatus, readSnapshot }}>{children}</LocalProjectsContext.Provider>
  </>;
}

export function useProjectLocalVisit(id: string, destination?: string) {
  const { local, snapshot, readSnapshot } = useContext(LocalProjectsContext);
  const active = useRef(false);
  const currentTarget = useRef({ id, destination });
  useLayoutEffect(() => { currentTarget.current = { id, destination }; }, [id, destination]);
  useLayoutEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = snapshot?.projects.find(project => project.id === id);
  const canVisit = Boolean(local && snapshot?.available && project?.status === "running");
  async function openLocal(destinationOverride?: string) {
    if (!canVisit || opening) return;
    // Open synchronously during the click so the browser does not block the tab
    // while local discovery checks the current Project Ports address.
    const tab = window.open("about:blank", "_blank");
    if (!tab) return;
    tab.opener = null;
    setOpening(true);
    setError(null);
    try {
      const fresh = await readSnapshot();
      if (!active.current || currentTarget.current.id !== id || currentTarget.current.destination !== destination) { tab.close(); return; }
      const href = fresh.projects.find(project => project.id === id && project.status === "running")?.href;
      // Re-read at click time so a changed port never opens a stale address.
      const url = href ? new URL(href) : null;
      const resolvedDestination = destinationOverride ?? destination;
      const target = url && resolvedDestination ? new URL(resolvedDestination, url) : url;
      if (fresh.available && url && target && ["http:", "https:"].includes(url.protocol) && url.hostname === "localhost" && !url.username && !url.password && target.origin === url.origin && !target.username && !target.password) tab.location.replace(target.href);
      else { tab.close(); if (active.current) setError("The local website is unavailable. Check Project Ports and try again."); }
    } catch { tab.close(); if (active.current && currentTarget.current.id === id && currentTarget.current.destination === destination) setError("The current local website address could not be checked. Check Project Ports and try again."); }
    finally { if (active.current) setOpening(false); }
  }
  return { local, canVisit, opening, error, openLocal };
}

export type ProjectLocalVisit = ReturnType<typeof useProjectLocalVisit>;

export function ProjectLocalDocumentButton({ visit, label = "View", className = "page-link-view", iconOnly = false }: { visit: ProjectLocalVisit; label?: string; className?: string; iconOnly?: boolean }) {
  const { canVisit, opening, error, openLocal } = visit;
  return <>{error ? <p role="alert">{error}</p> : null}<button type="button" className={`${className}${iconOnly ? " is-icon-only" : ""}`} aria-label={iconOnly ? label : undefined} disabled={opening || !canVisit} title={canVisit ? "View page on the local website in a new tab" : "Local website unavailable"} onClick={() => void openLocal()}>{iconOnly ? <StudioIcon name="external" size={20} /> : <>{label} <StudioIcon name="external" size={16} /></>}</button></>;
}

/** Uses the same fresh address check as the Sites pane, without guessing a port. */
export function ProjectLocalDocumentLink({ siteId, destination, label = "View", className = "page-link-view", iconOnly = false }: { siteId: LocalFixtureSiteId; destination: string; label?: string; className?: string; iconOnly?: boolean }) {
  const visit = useProjectLocalVisit(siteId, destination);
  return <ProjectLocalDocumentButton visit={visit} label={label} className={className} iconOnly={iconOnly} />;
}

export function ProjectLocalLink({ id, name, onEdit, active = false, showStatus = false, studioHref }: { id: string; name: string; onEdit?: () => void; active?: boolean; showStatus?: boolean; studioHref?: string }) {
  const { local, canVisit, opening, error, openLocal } = useProjectLocalVisit(id);
  const selfVisit = local && id === "acm-studio";
  const editHref = local && isLocalFixtureSiteId(id) ? studioHref ?? localFixtureHref(id) : undefined;
  const editName = `Edit Site — ${name} — Local${editHref ? "" : " — not available yet"}`;
  const visitName = `Visit Site — ${name} — Local${selfVisit || canVisit ? "" : " — local server unavailable"}`;
  return <div className="dashboard-project-environment dashboard-local-environment" data-active={active || undefined}>
    <strong>Local{active && <span className="visually-hidden"> — Active Environment</span>}</strong>
    <div className="dashboard-project-links">
      {editHref ? <a className="dashboard-card-link is-icon-only" href={editHref} aria-current={active ? "page" : undefined} onClick={onEdit ? event => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return; event.preventDefault(); onEdit(); } : undefined} aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></a>
        : <button className="dashboard-card-link is-icon-only is-unavailable" type="button" disabled aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></button>}
      {selfVisit ? <a className="dashboard-card-link is-icon-only dashboard-local-open" href="/" target="_blank" rel="noopener noreferrer" aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></a>
        : <button type="button" className="dashboard-card-link is-icon-only dashboard-local-open" disabled={opening || !canVisit} onClick={() => void openLocal()} aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></button>}
    </div>
    {showStatus ? <ProjectLocalStatus id={id} /> : null}
    {error ? <p className="visually-hidden" role="alert">{error}</p> : null}
  </div>;
}

export function ProjectLocalSiteNavigation({ id, name, onSelectTest, active = false, studioHref, reordering }: { reordering?: ReturnType<typeof useLibraryReordering>; id: string; name: string; onSelectTest?: () => void; active?: boolean; studioHref?: string }) {
  const project = studioProjects.find(item => item.id === id);
  const localActions = <ProjectLocalLink id={id} name={name} onEdit={onSelectTest} active={active} showStatus studioHref={studioHref} />;
  const dragProps = reordering?.rowProps(id);
  const headingAction = reordering ? <button {...dragProps} data-gap-row={undefined} data-gap-owner={undefined} data-library-drop-row={undefined} data-drop-edge={undefined} style={undefined} className="studio-site-drag-button" type="button" aria-disabled={!reordering.canReorder} aria-label={`Reorder ${name}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={reordering.canReorder} /></button> : undefined;
  return <SiteNavigationEntry name={name} active={active} headingAction={headingAction} rowProps={{
    "data-library-entry-id": dragProps?.["data-library-entry-id"], "data-library-reorder-owner": dragProps?.["data-library-reorder-owner"],
    "data-gap-row": dragProps?.["data-gap-row"], "data-gap-owner": dragProps?.["data-gap-owner"], "data-library-drop-row": true,
    style: dragProps?.style, "data-drop-edge": dragProps?.["data-drop-edge"],
    onDragOver: dragProps?.onDragOver, onDragLeave: dragProps?.onDragLeave, onDrop: dragProps?.onDrop,
  }}>
    {project ? <ProjectEnvironmentActions project={project} local={localActions} /> : localActions}
  </SiteNavigationEntry>;
}

export function ProjectLocalStatus({ id }: { id: string }) {
  const { local, currentAddress, snapshot, stale, refreshing, manualRefreshing, refreshStatus } = useContext(LocalProjectsContext);
  if (id === "acm-studio" && local && currentAddress) return <small className="dashboard-local-status" role="status" aria-label={`Local server running — ${currentAddress}`}><span className="studio-server-status-dot" data-state="running" aria-hidden="true" /><LocalProjectStatusAddress address={currentAddress} /></small>;
  const project = snapshot?.projects.find(project => project.id === id);
  const address = local && snapshot?.available && project?.status === "running" && project.href
    ? (() => { const url = new URL(project.href); return `${url.host}${url.pathname === "/" ? "" : url.pathname}`; })()
    : undefined;
  const statusLabel = stale ? "Local status refresh failed; showing last confirmed status"
    : local === false ? "Open Studio on localhost to access local sites"
      : !snapshot ? "Checking local server status"
        : !snapshot.available ? "Local website address unavailable"
          : !project ? statusLabels.unconfigured : statusLabels[project.status];
  const serverState = stale ? "stale" : local && snapshot?.available && project
    ? project.status === "failed" || project.status === "conflict" ? "failed"
      : project.status === "running" && project.href ? "running" : "unavailable"
    : "unavailable";
  const projectName = studioProjects.find(project => project.id === id)?.name ?? id;
  const refreshLabel = `${manualRefreshing ? "Refreshing" : refreshing ? "Checking" : "Refresh"} local status for ${projectName}`;
  return local ? <LocalProjectStatusRow address={address} statusLabel={statusLabel} serverState={serverState} refreshLabel={refreshLabel} refreshing={refreshing} onRefresh={refreshStatus} />
    : <small className="dashboard-local-status" role="status" aria-label={statusLabel}><span className="studio-server-status-dot" data-state={serverState} aria-hidden="true" /></small>;
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

export function LocalFixtureSiteNavigation({ selectedSite, onSelectSite }: { selectedSite?: LocalFixtureSiteId | null; onSelectSite?: (id: LocalFixtureSiteId) => void; libraryKind?: StudioLibraryKind }) {
  const disclosure = useContext(SitesDisclosureContext);
  const studio = studioProjects.find(project => project.id === "acm-studio");
  const sites = [...(studio ? [{ id: studio.id, name: studio.name }] : []), ...localFixtureSites];
  const { order, reordering, status } = useSiteOrdering(sites.map(site => site.id));
  const cancelReordering = reordering.cancel;
  useEffect(() => { if (disclosure?.open === false) cancelReordering(); }, [disclosure?.open, cancelReordering]);
  return <><InspectorAccordionSection className="studio-local-sites" title="Sites" label="Sites" open={disclosure?.open} onOpenChange={open => { disclosure?.setOpen(open); if (!open) reordering.cancel(); }}><div {...reordering.listProps}><DragPlacementIndicator line={reordering.line} />{order.map(id => { const site = sites.find(site => site.id === id)!; return <ProjectLocalSiteNavigation key={id} reordering={reordering} id={id} name={site.name} active={selectedSite === id} studioHref={isLocalFixtureSiteId(id) ? studioContextPath(id, "page") : undefined} onSelectTest={isLocalFixtureSiteId(id) && onSelectSite ? () => onSelectSite(id) : undefined} />; })}</div><span className="visually-hidden" role="status">{reordering.message}</span>{status ? <p className="studio-site-order-status" role="status">{status}</p> : null}</InspectorAccordionSection>{disclosure?.status ? <p className="studio-site-order-status" role="status">{disclosure.status}</p> : null}</>;
}
