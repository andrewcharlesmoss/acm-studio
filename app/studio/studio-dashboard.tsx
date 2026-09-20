import { miniGolfSites } from "./site-registry";
import { AcmIcon } from "@acm/icons/react";

const sites = [
  { name: "Andrew Moss", description: "Personal site, writing, videos and work history.", status: "Separate project", statusClass: "dashboard-status-ready", href: "https://andrewmoss.me/" },
  { name: "Loquafy", description: "Social connection product and conversation platform.", status: "Connection pending", statusClass: "dashboard-status-pending", href: null },
  { name: "Loquage", description: "Browser-based facial AI experiments and research.", status: "Connection pending", statusClass: "dashboard-status-pending", href: null },
  { name: "Mission Control", description: "The wider operating system for projects and work.", status: "Connection pending", statusClass: "dashboard-status-pending", href: null },
];

export function StudioDashboard() {
  return (
    <div className="studio-shell dashboard-shell">
      <header className="studio-header">
        <a className="studio-brand" href="/" aria-label="ACM Studio home"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs" aria-label="Breadcrumb"><strong>Control centre</strong></div>
        <div className="studio-state"><span className="prototype-pill">Local prototype</span><span>Browser storage only</span></div>
        <div className="studio-actions"><a className="button-secondary" href="https://andrewmoss.me/">View Andrew Moss <StudioIcon name="external" size={16} /></a><a className="button-primary" href="/studio">Open Studio</a></div>
      </header>

      <div className="studio-notice" role="note"><strong>Local-only Studio.</strong> This control centre is a foundation for managing your sites. Connections and shared publishing are not active yet.</div>

      <main className="dashboard-main">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <div><p className="eyebrow">ACM umbrella</p><h1 id="dashboard-title">Everything underneath one roof.</h1></div>
          <p className="dashboard-intro-copy">ACM Studio will become the place where Andrew Moss sites, projects, content and files can be understood and managed together.</p>
        </section>

        <section className="dashboard-section" aria-labelledby="sites-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Site registry</p><h2 id="sites-title">Your sites</h2></div><p>Start with the staging working copy; production remains a separate reference until the two are deliberately synchronised.</p></div>
          {miniGolfSites.map((miniGolfSite) => <article className="dashboard-site-pilot" key={miniGolfSite.id}>
            <div><span className={`dashboard-status dashboard-status-ready${miniGolfSite.environment === "staging" ? " dashboard-status-primary" : ""}`}>{miniGolfSite.environment === "staging" ? "Primary working draft" : "Production reference"}</span><h3>{miniGolfSite.name}</h3><p>{miniGolfSite.description}</p></div>
            <div className="dashboard-pilot-actions"><a className="button-secondary" href={miniGolfSite.publicHref} target="_blank" rel="noopener noreferrer">Visit Live Site <StudioIcon name="external" size={16} /></a><a className="button-primary" href={miniGolfSite.editorHref}>Edit Site <StudioIcon name="pencil" size={16} /></a></div>
          </article>)}
          <div className="dashboard-site-grid">
            {sites.map((site) => (
              <article className="dashboard-site-card" key={site.name}>
                <div className="dashboard-card-topline"><span className="dashboard-site-mark" aria-hidden="true">{site.name.slice(0, 1)}</span><span className={`dashboard-status ${site.statusClass}`}>{site.status}</span></div>
                <h3>{site.name}</h3><p>{site.description}</p>
                {site.href ? <a className="dashboard-card-link" href={site.href}>Visit site <StudioIcon name="external" size={16} /></a> : <span className="dashboard-card-link is-muted">Integration boundary to define</span>}
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-section dashboard-tools" aria-labelledby="tools-title">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Working tools</p><h2 id="tools-title">Continue building</h2></div><p>The foundation is deliberately local while the shared architecture is being established.</p></div>
          <div className="dashboard-tool-grid">
            <a className="dashboard-tool-card" href="/studio/templates"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="block" /></span><span><strong>Templates</strong><small>Create consistent page and post designs with shared headers and footers.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/designs"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="image" /></span><span><strong>Design canvas</strong><small>Create and annotate images for your content.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio/ribbon"><span className="dashboard-tool-icon" aria-hidden="true"><AcmIcon name="layout.columns" /></span><span><strong>Ribbon Library</strong><small>Inspect Ribbon components and original ACM SVG symbols.</small></span><span aria-hidden="true" style={{ transform: "rotate(-90deg)" }}><AcmIcon name="navigation.disclosure" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="pencil" /></span><span><strong>Content Studio</strong><small>Create and edit pages and posts with portable blocks.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="image" /></span><span><strong>Files and media</strong><small>Manage the local media library from the Studio.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
            <a className="dashboard-tool-card" href="/studio"><span className="dashboard-tool-icon" aria-hidden="true"><StudioIcon name="archive" /></span><span><strong>Backup and restore</strong><small>Protect local content before the persistence layer arrives.</small></span><span aria-hidden="true"><StudioIcon name="arrow-right" /></span></a>
          </div>
        </section>

        <section className="dashboard-boundary" aria-labelledby="boundary-title">
          <div><p className="eyebrow">Next boundary</p><h2 id="boundary-title">Connect the sites when the contract is ready.</h2></div>
          <p>The personal site remains independent. ACM Studio owns the shared management layer, and each product keeps its own content and identity.</p>
        </section>
      </main>
    </div>
  );
}
import { StudioIcon } from "./studio-icons";
