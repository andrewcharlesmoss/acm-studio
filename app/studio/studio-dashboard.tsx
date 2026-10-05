import { studioProjects, type StudioProject, type StudioProjectLink } from "./project-registry";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "./studio-icons";

function ProjectLinks({ links, context }: { links: StudioProjectLink[]; context: string }) {
  return <div className="dashboard-project-links">{links.map(link => {
    const external = link.href.startsWith("https://");
    return <a className="dashboard-card-link" key={link.href} href={link.href} aria-label={`${link.label} — ${context}`} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {link.label}<StudioIcon name={external ? "external" : link.label === "Edit Site" ? "pencil" : "arrow-right"} size={16} />
    </a>;
  })}</div>;
}

function ProjectCard({ project }: { project: StudioProject }) {
  return <article className="dashboard-site-card" data-project-id={project.id}>
    <div className="dashboard-card-topline"><span className="dashboard-site-mark" aria-hidden="true">{project.name.slice(0, 1)}</span><span className="dashboard-status dashboard-status-pending">{project.kind}</span></div>
    <h3>{project.name}</h3><p>{project.description}</p>
    <div className="dashboard-project-actions">
      {project.environments ? <div className={`dashboard-project-environments${project.environments.length > 1 ? " has-staging" : ""}`}>
        {project.environments.map(environment => <div className="dashboard-project-environment" key={environment.id}>
          <strong>{environment.name}</strong><ProjectLinks links={environment.links} context={`${project.name} — ${environment.name}`} />
        </div>)}
      </div> : project.links.length ? <ProjectLinks links={project.links} context={project.name} /> : <span className="dashboard-card-link is-muted">Connection pending</span>}
    </div>
  </article>;
}

export function StudioDashboard() {
  return (
    <div className="studio-shell dashboard-shell">
      <header className="studio-header">
        <a className="studio-brand" href="/" aria-label="ACM Studio home"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs" aria-label="Breadcrumb"><strong>Control centre</strong></div>
        <div className="studio-state"><span className="prototype-pill">LOCAL</span><span>Browser storage only</span></div>
        <div className="studio-actions"><a className="button-secondary" href="https://andrewmoss.me/">View Andrew Moss <StudioIcon name="external" size={16} /></a><a className="button-primary" href="/studio">Open Studio</a></div>
      </header>

      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> This control centre is a foundation for managing your sites. Connections and shared publishing are not active yet.</div>

      <main className="dashboard-main">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <div><p className="eyebrow">ACM umbrella</p><h1 id="dashboard-title">Everything underneath one roof.</h1></div>
          <p className="dashboard-intro-copy">ACM Studio will become the place where Andrew Moss sites, projects, content and files can be understood and managed together.</p>
        </section>

        <section className="dashboard-section" aria-labelledby="sites-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Site registry</p><h2 id="sites-title">Your sites</h2></div><p>Your sites, in alphabetical order. Production and identified staging sites are grouped together.</p></div>
          <div className="dashboard-site-grid">
            {studioProjects.map(project => <ProjectCard project={project} key={project.id} />)}
          </div>
        </section>

        <section className="dashboard-section dashboard-tools" aria-labelledby="tools-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Working tools</p><h2 id="tools-title">Continue building</h2></div><p>The foundation is deliberately local while the shared architecture is being established.</p></div>
          <div className="dashboard-tool-grid">
            <a className="dashboard-tool-card" href="/studio/templates"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="block" /></span><span><strong>Templates</strong><small>Create consistent page and post designs with shared headers and footers.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/designs"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="image" /></span><span><strong>Design Canvas</strong><small>Create and annotate images for your content.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/ui"><span className="dashboard-tool-icon" aria-hidden="true"><AcmIcon name="layout.columns" /></span><span><strong>Studio UI Library</strong><small>Explore the workspace, Ribbon, panes and shared icons.</small></span><span aria-hidden="true" style={{ transform: "rotate(-90deg)" }}><AcmIcon name="navigation.disclosure" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="pencil" /></span><span><strong>Content Studio</strong><small>Create and edit pages and posts with portable blocks.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="image" /></span><span><strong>Files and media</strong><small>Manage the local media library from the Studio.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="archive" /></span><span><strong>Backup and restore</strong><small>Protect local content before the persistence layer arrives.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
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
