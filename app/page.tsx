import { ArticleRow, ProjectCard } from "./components/content";
import { PageFrame } from "./components/site-shell";
import { articles, projects } from "./content/sample-content";

export default function Home() {
  return (
    <PageFrame>
      <main>
        <section className="hero">
          <div className="hero-kicker">
            <span className="signal-dot" aria-hidden="true" />
            Independent products and experiments
          </div>
          <h1>I make focused products and document the thinking behind them.</h1>
          <div className="hero-bottom">
            <p>
              This is the home of my active projects, smaller experiments and a
              writing archive built over many years.
            </p>
            <a className="text-link" href="/projects">Explore the projects <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="section-block" aria-labelledby="featured-projects">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selected work</p>
              <h2 id="featured-projects">Projects with a purpose</h2>
            </div>
            <p>Products, utilities and research experiments — each built around a clear question.</p>
          </div>
          <div className="project-grid">
            {projects.slice(0, 3).map((project, index) => (
              <ProjectCard project={project} index={index} key={project.slug} />
            ))}
          </div>
          <a className="section-more" href="/projects">See every project <span aria-hidden="true">↗</span></a>
        </section>

        <section className="section-block writing-block" aria-labelledby="latest-writing">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Writing archive</p>
              <h2 id="latest-writing">Notes from the work</h2>
            </div>
            <p>The articles remain here — quieter than before, but still useful and connected to the projects.</p>
          </div>
          <div className="article-list">
            {articles.map((article) => <ArticleRow article={article} key={article.slug} />)}
          </div>
        </section>

        <section className="foundation-note">
          <p className="eyebrow">A connected body of work</p>
          <p className="foundation-statement">
            One identity at the top. Independent projects underneath. Writing
            connecting the ideas between them.
          </p>
          <a className="text-link" href="/studio">See the publishing foundation <span aria-hidden="true">→</span></a>
        </section>
      </main>
    </PageFrame>
  );
}
