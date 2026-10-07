"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
    return `${statusLabels.running} — ${address}`;
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

export function ProjectLocalLink({ id, name }: { id: string; name: string }) {
  const { local, snapshot, refreshSnapshot } = useContext(LocalProjectsContext);
  const [opening, setOpening] = useState(false);
  const project = snapshot?.projects.find(project => project.id === id);
  const canVisit = Boolean(local && snapshot?.available && project?.status === "running");
  const editHref = local && id === "acm-studio" ? "/studio" : undefined;
  async function openLocal() {
    setOpening(true);
    try {
      const fresh = await readLocalProjects();
      refreshSnapshot(fresh);
      const href = fresh.projects.find(project => project.id === id && project.status === "running")?.href;
      // Re-read at click time so a changed port never opens a stale address.
      const url = href ? new URL(href) : null;
      if (url && ["http:", "https:"].includes(url.protocol) && url.hostname === "localhost" && !url.username && !url.password) window.location.assign(url.href);
    } catch { refreshSnapshot({ available: false, projects: [] }); }
    finally { setOpening(false); }
  }
  const editName = `Edit Site — ${name} — Local${editHref ? "" : " — not available yet"}`;
  const visitName = `Visit Site — ${name} — Local${canVisit ? "" : " — local server unavailable"}`;
  return <div className="dashboard-project-environment dashboard-local-environment">
    <strong>Local</strong>
    <div className="dashboard-project-links">
      {editHref ? <a className="dashboard-card-link is-icon-only" href={editHref} aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></a>
        : <button className="dashboard-card-link is-icon-only is-unavailable" type="button" disabled aria-label={editName} title={editName}><StudioIcon name="pencil" size={20} /></button>}
      <button type="button" className="dashboard-card-link is-icon-only dashboard-local-open" disabled={opening || !canVisit} onClick={() => void openLocal()} aria-label={visitName} title={visitName}><StudioIcon name="external" size={20} /></button>
    </div>
  </div>;
}

export function ProjectLocalSiteNavigation({ id, name }: { id: string; name: string }) {
  const { local, snapshot, refreshSnapshot } = useContext(LocalProjectsContext);
  const [opening, setOpening] = useState(false);
  const project = snapshot?.projects.find(project => project.id === id);
  const canVisit = Boolean(local && snapshot?.available && project?.status === "running" && project.href);

  async function openLocal() {
    if (opening || !canVisit) return;
    setOpening(true);
    try {
      const fresh = await readLocalProjects();
      refreshSnapshot(fresh);
      const href = fresh.projects.find(item => item.id === id && item.status === "running")?.href;
      const url = href ? new URL(href) : null;
      if (url && ["http:", "https:"].includes(url.protocol) && url.hostname === "localhost" && !url.username && !url.password) {
        window.location.assign(url.href);
      }
    } catch {
      refreshSnapshot({ available: false, projects: [] });
    } finally {
      setOpening(false);
    }
  }

  return <section className="studio-local-sites" aria-labelledby="studio-local-sites-title">
    <h2 id="studio-local-sites-title">Sites</h2>
    <button type="button" className="studio-local-site" disabled={!canVisit || opening} onClick={() => void openLocal()} aria-label={`Open ${name} local site`}>
      <span className="studio-local-site-mark" aria-hidden="true">{name.slice(0, 1)}</span>
      <span className="studio-local-site-copy"><strong>{name}</strong><small role="status">{localStatus(snapshot, project)}</small></span>
    </button>
  </section>;
}

export function ProjectLocalStatus({ id }: { id: string }) {
  const { local, snapshot } = useContext(LocalProjectsContext);
  const project = snapshot?.projects.find(project => project.id === id);
  return <small className="dashboard-local-status" role="status">{local ? localStatus(snapshot, project) : "Open ACM Studio on localhost to access local sites."}</small>;
}
