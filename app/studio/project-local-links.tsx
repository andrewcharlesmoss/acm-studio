"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { StudioIcon } from "./studio-icons";

type LocalProject = { id: string; status: "running" | "stopped" | "multiple" | "unconfigured" | "starting" | "stopping" | "failed" | "conflict" | "review" | "unavailable"; href?: string };
type LocalSnapshot = { available: boolean; projects: LocalProject[] };

async function readLocalProjects(signal?: AbortSignal): Promise<LocalSnapshot> {
  const response = await fetch("/__studio/local-projects", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history" },
    body: "{}", signal,
  });
  if (!response.ok) throw new Error("Local discovery unavailable");
  return response.json();
}

const LocalProjectsContext = createContext<{ local: boolean; snapshot: LocalSnapshot | null; refreshSnapshot: (snapshot: LocalSnapshot) => void }>({ local: false, snapshot: null, refreshSnapshot: () => {} });

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
  const statusLabels: Record<LocalProject["status"], string> = {
    running: "Local server running", stopped: "Local server stopped",
    unconfigured: "Local server not configured", multiple: "Multiple servers — choose in Project Ports",
    starting: "Local server starting", stopping: "Local server stopping",
    failed: "Local server failed", conflict: "Local port conflict",
    review: "Local service needs review", unavailable: "Local website address unavailable",
  };
  let runningAddress = "";
  if (project?.status === "running" && project.href) {
    try {
      const url = new URL(project.href);
      runningAddress = `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
    } catch { /* Keep the existing status if an address is unavailable. */ }
  }
  const status = !snapshot ? "Checking local server…" : !snapshot.available ? "Project Ports unavailable"
    : project ? `${statusLabels[project.status]}${runningAddress ? ` — ${runningAddress}` : ""}` : statusLabels.unconfigured;
  if (id === "acm-studio") return <div className="dashboard-local-project">
    <a className="dashboard-card-link" href="/studio">Open Studio</a>
    {local ? <small role="status">{status}</small> : null}
  </div>;
  if (!local) return null;
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
  return <div className="dashboard-local-project">
    <button type="button" className="dashboard-card-link dashboard-local-open" disabled={opening || project?.status !== "running" || !snapshot?.available} onClick={() => void openLocal()} aria-label={`Open local site — ${name}`} title={`Open local site — ${name}`}><StudioIcon name="external" size={20} /><span>{opening ? "Opening…" : "Open local"}</span></button>
    <small role="status">{status}</small>
  </div>;
}
