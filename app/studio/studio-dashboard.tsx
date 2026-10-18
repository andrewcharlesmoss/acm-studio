import { StudioAppHeader } from "./studio-app-header";
import { studioProjects, type StudioProject } from "./project-registry";
import { ProjectLocalLink, ProjectLocalLinksProvider, ProjectLocalStatus } from "./project-local-links";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "./studio-icons";
import { ProjectEnvironmentActions } from "./project-environment-links";
import { StudioToolIcon } from "./studio-tool-icon";

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

export function StudioDashboard() {
  return (
    <div className="studio-shell dashboard-shell">
      <StudioAppHeader section="Control Centre">
        <div className="studio-state"><span className="prototype-pill">Local</span><span>Browser storage only</span></div>
        <div className="studio-actions"><a className="button-secondary" href="https://andrewmoss.me/">View Andrew Moss <StudioIcon name="external" size={16} /></a><a className="button-primary" href="/studio">Open Studio</a></div>
      </StudioAppHeader>

      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> This control centre is a foundation for managing your sites. Connections and shared publishing are not active yet.</div>

      <main className="dashboard-main">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <div><p className="eyebrow">ACM umbrella</p><h1 id="dashboard-title">Everything underneath one roof.</h1></div>
          <p className="dashboard-intro-copy">ACM Studio will become the place where Andrew Moss sites, projects, content and files can be understood and managed together.</p>
        </section>

        <section className="dashboard-section" aria-labelledby="sites-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Site registry</p><h2 id="sites-title">Your sites</h2></div><p>Your sites, in alphabetical order, with Local, Staging and Production grouped together where available.</p></div>
          <ProjectLocalLinksProvider><div className="dashboard-site-grid">
            {studioProjects.map(project => <ProjectCard project={project} key={project.id} />)}
          </div></ProjectLocalLinksProvider>
        </section>

        <section className="dashboard-section dashboard-tools" aria-labelledby="tools-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Working tools</p><h2 id="tools-title">Continue building</h2></div><p>The foundation is deliberately local while the shared architecture is being established.</p></div>
          <div className="dashboard-tool-grid">
            <a className="dashboard-tool-card" href="/studio/site-editor"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="siteEditor" /></span><span><strong>Site Editor — Preview</strong><small>Try global paragraph defaults and independent site overrides.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio?mode=templates"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="templates" /></span><span><strong>Templates</strong><small>Create consistent page and post designs with shared headers and footers.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/designs"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="designs" /></span><span><strong>Design Canvas</strong><small>Create and annotate images for your content.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/ui"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="uiLibrary" /></span><span><strong>Studio UI Library</strong><small>Explore the workspace, Ribbon, panes and shared icons.</small></span><span aria-hidden="true" style={{ transform: "rotate(-90deg)" }}><AcmIcon name="navigation.disclosure" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="content" /></span><span><strong>Content Studio</strong><small>Create and edit pages and posts with portable blocks.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="files" /></span><span><strong>Files and media</strong><small>Manage the local media library from the Studio.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioToolIcon tool="backup" /></span><span><strong>Backup and restore</strong><small>Protect local content before the persistence layer arrives.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
          </div>
        </section>

        <section className="dashboard-boundary" aria-labelledby="boundary-title">
          <div><p className="eyebrow">Next boundary</p><h2 id="boundary-title">Bring your projects together.</h2></div>
          <p>Each project keeps its own content and identity. Studio will bring their management tools together as connections are added.</p>
        </section>
      </main>
    </div>
  );
}
