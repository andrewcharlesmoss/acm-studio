import type { Metadata } from "next";
import { ProjectCard } from "../components/content";
import { PageFrame } from "../components/site-shell";
import { projects } from "../content/sample-content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Products, utilities and experiments created by Andrew Charles Moss.",
};

export default function ProjectsPage() {
  return (
    <PageFrame>
      <main>
        <header className="page-intro">
          <p className="eyebrow">The work</p>
          <h1>Independent ideas, given enough room to become useful.</h1>
          <p className="page-intro-copy">
            Some are active products, others are focused utilities or research
            experiments. Each starts with a problem worth understanding.
          </p>
        </header>
        <section className="project-index-grid" aria-label="All projects">
          {projects.map((project, index) => (
            <ProjectCard project={project} index={index} key={project.slug} />
          ))}
        </section>
        <aside className="archive-callout">
          <span className="archive-number">04</span>
          <div>
            <p className="eyebrow">A living catalogue</p>
            <h2>Projects can change status without disappearing.</h2>
          </div>
          <p>
            Active, exploring, available and archived work can all retain their
            own history, writing and public identity within the same system.
          </p>
        </aside>
      </main>
    </PageFrame>
  );
}
