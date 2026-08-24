import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleRow, StatusPill } from "../../components/content";
import { PageFrame } from "../../components/site-shell";
import { getArticlesForProject, getProject, projects } from "../../content/sample-content";

type ProjectPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.name,
    description: project.summary,
    openGraph: { title: project.name, description: project.summary, images: [] },
    twitter: { card: "summary", title: project.name, description: project.summary, images: [] },
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const relatedArticles = getArticlesForProject(project.slug);

  return (
    <PageFrame>
      <main>
        <header className="detail-hero" style={{ "--project-accent": project.accent } as React.CSSProperties}>
          <div className="detail-topline">
            <a className="back-link" href="/projects">← All projects</a>
            <StatusPill status={project.status} />
          </div>
          <p className="eyebrow">{project.eyebrow}</p>
          <h1>{project.name}</h1>
          <p className="detail-summary">{project.summary}</p>
          <div className="project-facts">
            <div><span>Period</span><strong>{project.year}</strong></div>
            <div><span>Status</span><strong>{project.status}</strong></div>
            <div><span>Focus</span><strong>{project.tags.slice(0, 2).join(" · ")}</strong></div>
          </div>
        </header>

        <section className="project-story">
          <div>
            <p className="eyebrow">The idea</p>
            <p className="project-description">{project.description}</p>
            {project.url ? <a className="primary-action" href={project.url}>Visit {project.name} ↗</a> : null}
          </div>
          <div className="highlight-panel">
            <p className="eyebrow">What it explores</p>
            <ol>
              {project.highlights.map((highlight, index) => (
                <li key={highlight}><span>{String(index + 1).padStart(2, "0")}</span>{highlight}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section-block related-writing" aria-labelledby="related-writing">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">Connected thinking</p><h2 id="related-writing">Writing around the project</h2></div>
            <p>Articles can belong to a project without being trapped inside it.</p>
          </div>
          {relatedArticles.length ? (
            <div className="article-list">
              {relatedArticles.map((article) => <ArticleRow article={article} key={article.slug} />)}
            </div>
          ) : (
            <p className="empty-state">No connected articles yet. The project can still stand on its own.</p>
          )}
        </section>
      </main>
    </PageFrame>
  );
}
