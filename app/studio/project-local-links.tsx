"use client";
import { isLocalFixtureSiteId, localFixtureSites, localFixtureHref, type LocalFixtureSiteId } from "./test-site/sites";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

const LocalProjectsContext = createContext<{ local: boolean; snapshot: LocalSnapshot | null; refreshSnapshot: (snapshot: LocalSnapshot) => void }>({ local: false, snapshot: null, refreshSnapshot: () => {} });

function localStatus(snapshot: LocalSnapshot | null, project: LocalProject | undefined) {
  if (!snapshot) return "Checking local server…";
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
  const [local, setLocal] = useState(false);
  useEffect(() => {
    if (window.location.hostname !== "localhost") return;
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
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  return <LocalProjectsContext.Provider value={{ local, snapshot, refreshSnapshot: setSnapshot }}>{children}</LocalProjectsContext.Provider>;
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

export function ProjectLocalLink({ id, name, onEdit, active = false }: { id: string; name: string; onEdit?: () => void; active?: boolean }) {
  const { local, canVisit, opening, openLocal } = useLocalProjectVisit(id);
  const editHref = local && id === "acm-studio" ? "/studio" : local && isLocalFixtureSiteId(id) ? localFixtureHref(id) : undefined;
  const editName = `Edit Site — ${name} — Local${editHref ? "" : " — not available yet"}`;
  const visitName = `Visit Site — ${name} — Local${canVisit ? "" : " — local server unavailable"}`;
  return <div className="dashboard-project-environment dashboard-local-environment" data-active={active || undefined}>
    <strong>{active && <span className="studio-active-environment-dot" aria-hidden="true" />}Local{active && <span className="visually-hidden"> — Active Environment</span>}</strong>
    <div className="dashboard-project-links">
      {editHref ? <a className="dashboard-card-link is-icon-only" href={editHref} aria-current={active ? "page" : undefined} onClick={onEdit ? event => { event.preventDefault(); onEdit(); } : undefined} aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></a>
        : <button className="dashboard-card-link is-icon-only is-unavailable" type="button" disabled aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></button>}
      <button type="button" className="dashboard-card-link is-icon-only dashboard-local-open" disabled={opening || !canVisit} onClick={() => void openLocal()} aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></button>
    </div>
  </div>;
}

export function ProjectLocalSiteNavigation({ id, name, onSelectTest, active = false }: { id: string; name: string; onSelectTest?: () => void; active?: boolean }) {
  const project = studioProjects.find(item => item.id === id);
  const localActions = <ProjectLocalLink id={id} name={name} onEdit={onSelectTest} active={active} />;

  return <div className={`studio-local-site-actions${active ? " is-active" : ""}`}>
      <a className="studio-local-site" href={isLocalFixtureSiteId(id) ? localFixtureHref(id) : "/studio"} aria-current={active ? "page" : undefined} aria-label={`Edit ${name} local site`} onClick={event => { if (isLocalFixtureSiteId(id) && onSelectTest) { event.preventDefault(); onSelectTest(); } }}>
        <span className="studio-local-site-mark" aria-hidden="true">{name.slice(0, 1)}</span>
        <span className="studio-local-site-copy"><strong>{name}</strong></span>
      </a>
      <div className="studio-local-site-environments">
        {project ? <ProjectEnvironmentActions project={project} local={localActions} /> : localActions}
        <ProjectLocalStatus id={id} />
      </div>
  </div>;
}

export function ProjectLocalStatus({ id }: { id: string }) {
  const { local, snapshot } = useContext(LocalProjectsContext);
  const project = snapshot?.projects.find(project => project.id === id);
  const status = local ? localStatus(snapshot, project) : "Open Studio on localhost";
  const description = local && project?.status === "running" && project.href
    ? `${statusLabels.running} — ${status}` : status;
  const serverState = local && snapshot?.available && project
    ? project.status === "failed" || project.status === "conflict" ? "failed"
      : project.status === "running" && project.href ? "running" : "unavailable"
    : "unavailable";
  return <small className="dashboard-local-status" role="status" title={description} aria-label={description}><span className="studio-server-status-dot" data-state={serverState} aria-hidden="true" />{status}</small>;
}

export function LocalFixtureSiteNavigation({ selectedSite, onSelectSite }: { selectedSite?: LocalFixtureSiteId | null; onSelectSite?: (id: LocalFixtureSiteId) => void }) {
  return <section className="studio-local-sites" aria-label="Sites"><h2>Sites</h2>{localFixtureSites.map(site => <ProjectLocalSiteNavigation key={site.id} id={site.id} name={site.name} active={selectedSite === site.id} onSelectTest={onSelectSite ? () => onSelectSite(site.id) : undefined} />)}</section>;
}
