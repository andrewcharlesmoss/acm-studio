"use client";
import { useEffect, useState } from "react";
import { dashboardOrderKeys, dashboardSiteIds, dashboardToolIds } from "./dashboard-order-contract.mjs";
import { useNavigationOrdering } from "./use-site-ordering";
import { LibraryDragHandle } from "./library-drag-handle";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import { DashboardApplicationHeader } from "./application-section-headers";
import { studioProjects, type StudioProject } from "./project-registry";
import { ProjectLocalLink, ProjectLocalLinksProvider, ProjectLocalStatus } from "./project-local-links";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "./studio-icons";
import { ProjectEnvironmentActions } from "./project-environment-links";
import { StudioToolIcon } from "./studio-tool-icon";
import { LocalWebsiteNotice } from "./controls/local-website-notice";
import { useLocalWebsiteNotice } from "./controls/use-local-website-notice";

function ProjectCard({ project }: { project: StudioProject }) {
  return <article className="dashboard-site-card" data-project-id={project.id}>
    <div className="dashboard-card-topline"><span className="dashboard-site-mark" aria-hidden="true">{project.name.slice(0, 1)}</span><span className="dashboard-status dashboard-status-pending">{project.kind}</span></div>
    <h3>{project.name}</h3><p>{project.description}</p>
    <div className="dashboard-project-actions">
      <ProjectEnvironmentActions project={project} local={<ProjectLocalLink id={project.id} name={project.name} />} />
      <ProjectLocalStatus id={project.id} />
    </div>
  </article>;
}

const identityOrder = (order: string[]) => order;
export function StudioDashboard() {
  const [dismissedLocalNotice, dismissLocalNotice, localNoticeError] = useLocalWebsiteNotice();
  const [ready, setReady] = useState(false);
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  const sites = useNavigationOrdering(dashboardSiteIds, dashboardOrderKeys.sites, "Site card order", "dashboard-sites", "boundary", identityOrder, "x");
  const tools = useNavigationOrdering(dashboardToolIds, dashboardOrderKeys.tools, "Tool card order", "dashboard-tools", "boundary", identityOrder, "x");
  return (
    <div className="studio-shell dashboard-shell" data-dashboard-ready={ready}>
      <DashboardApplicationHeader />

      {localNoticeError ? <div className="studio-notice" role="alert">{localNoticeError}</div> : null}
      {!dismissedLocalNotice ? <LocalWebsiteNotice onDismiss={dismissLocalNotice}><strong>Local-only Studio.</strong> This control centre is a foundation for managing your sites. Connections and shared publishing are not active yet.</LocalWebsiteNotice> : null}

      <main className="dashboard-main">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <div><p className="eyebrow">ACM umbrella</p><h1 id="dashboard-title">Everything underneath one roof.</h1></div>
          <p className="dashboard-intro-copy">ACM Studio will become the place where Andrew Moss sites, projects, content and files can be understood and managed together.</p>
        </section>

        <section className="dashboard-section" aria-labelledby="sites-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Site registry</p><h2 id="sites-title">Your sites</h2></div><p>Your sites, with Local, Staging and Production grouped together where available.</p></div>
          <ProjectLocalLinksProvider><div className="dashboard-site-grid" {...sites.reordering.listProps}>
            <DragPlacementIndicator line={sites.reordering.line} />
            {sites.order.map((id: string) => { const project = studioProjects.find(item => item.id === id)!; return <div className="dashboard-card-reorder" key={id} {...sites.reordering.targetProps(id)} onKeyDown={undefined}><ProjectCard project={project} /><button {...sites.reordering.handleProps(id)} className="dashboard-card-drag studio-site-drag-button" type="button" aria-disabled={!sites.reordering.canReorder} aria-label={`Reorder ${project.name}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={sites.reordering.canReorder} /></button></div>; })}
          </div>{sites.status ? <p role="status">{sites.status}</p> : null}<span className="visually-hidden" role="status">{sites.reordering.message}</span></ProjectLocalLinksProvider>
        </section>

        <section className="dashboard-section dashboard-tools" aria-labelledby="tools-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Working tools</p><h2 id="tools-title">Continue building</h2></div><p>The foundation is deliberately local while the shared architecture is being established.</p></div>
          <div className="dashboard-tool-grid" {...tools.reordering.listProps}>
            <DragPlacementIndicator line={tools.reordering.line} />
            {(() => { const items = [
              { id: 'site-editor', name: 'Site Editor', element: (<a className="dashboard-tool-card" href="/studio/site-editor"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="siteEditor" /></span><span><strong>Site Editor</strong><small>Try site titles, taglines, logos, and icons without saving.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) },
              { id: 'templates', name: 'Templates', element: (<a className="dashboard-tool-card" href="/studio?mode=templates"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="templates" /></span><span><strong>Templates</strong><small>Create consistent page and post designs with shared headers and footers.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) },
              { id: 'designs', name: 'Design Canvas', element: (<a className="dashboard-tool-card" href="/studio/designs"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="designs" /></span><span><strong>Design Canvas</strong><small>Create and annotate images for your content.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) },
              { id: 'ui-library', name: 'Studio UI Library', element: (<a className="dashboard-tool-card" href="/studio/ui"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="uiLibrary" /></span><span><strong>Studio UI Library</strong><small>Explore the workspace, Ribbon, panes and shared icons.</small></span><span aria-hidden="true" style={{ transform: "rotate(-90deg)" }}><AcmIcon name="navigation.disclosure" /></span></a>) },
              { id: 'content', name: 'Content Studio', element: (<a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="content" /></span><span><strong>Content Studio</strong><small>Create and edit pages and posts with portable blocks.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) },
              { id: 'files', name: 'Files and media', element: (<a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="files" /></span><span><strong>Files and media</strong><small>Manage the local media library from the Studio.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) },
              { id: 'backup', name: 'Backup and restore', element: (<a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="backup" /></span><span><strong>Backup and restore</strong><small>Protect local content before the persistence layer arrives.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>) }
            ]; return tools.order.map((id: string) => { const item = items.find(candidate => candidate.id === id)!; return <div key={id} className="dashboard-card-reorder" {...tools.reordering.targetProps(id)} onKeyDown={undefined}>{item.element}<button {...tools.reordering.handleProps(id)} className="dashboard-card-drag studio-site-drag-button" type="button" aria-disabled={!tools.reordering.canReorder} aria-label={`Reorder ${item.name}`} title="Drag to reorder, or press Alt and the Up or Down arrow."><LibraryDragHandle enabled={tools.reordering.canReorder} /></button></div>; }); })()}
          </div>
          {tools.status ? <p role="status">{tools.status}</p> : null}<span className="visually-hidden" role="status">{tools.reordering.message}</span>
        </section>

        <section className="dashboard-boundary" aria-labelledby="boundary-title">
          <div><p className="eyebrow">Next boundary</p><h2 id="boundary-title">Bring your projects together.</h2></div>
          <p>Each project keeps its own content and identity. Studio will bring their management tools together as connections are added.</p>
        </section>
      </main>
    </div>
  );
}
