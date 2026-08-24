import type { Metadata } from "next";
import { BlockRenderer } from "../../components/content";
import { PageFrame } from "../../components/site-shell";
import { articles, getArticle, getProject } from "../../content/sample-content";
import { LocalArticlePage } from "./local-article-page";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.summary,
    openGraph: { title: article.title, description: article.summary, images: [] },
    twitter: { card: "summary", title: article.title, description: article.summary, images: [] },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return <LocalArticlePage slug={slug} />;
  const relatedProject = article.projectSlug ? getProject(article.projectSlug) : undefined;

  return (
    <PageFrame>
      <main className="article-page">
        <header className="article-hero">
          <a className="back-link" href="/writing">← Writing archive</a>
          <div className="article-hero-meta">
            <span>{article.section}</span>
            <time dateTime={article.publishedAt}>{article.displayDate}</time>
            <span>{article.readingTime}</span>
          </div>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
        </header>
        <div className="article-layout">
          <aside className="article-context">
            <span>Written by</span><strong>Andrew Moss</strong>
            {relatedProject ? (
              <><span>Related project</span><a href={`/projects/${relatedProject.slug}`}>{relatedProject.name} ↗</a></>
            ) : null}
          </aside>
          <article><BlockRenderer blocks={article.blocks} /></article>
        </div>
        <nav className="article-end" aria-label="Article navigation">
          <div><span>End of article</span><strong>{article.title}</strong></div>
          <a href="/writing">Return to writing →</a>
        </nav>
      </main>
    </PageFrame>
  );
}
