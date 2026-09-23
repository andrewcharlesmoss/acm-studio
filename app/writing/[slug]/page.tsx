import type { Metadata } from "next";
import { BlockRenderer } from "../../components/content";
import { readingTimeLabel } from "../../content/reading-time";
import { ArticleByline, PageFrame } from "../../components/site-shell";
import { articles, getArticle } from "../../content/sample-content";
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
  if (!article) return <LocalArticlePage key={slug} slug={slug} />;

  return (
    <PageFrame>
      <main className="article-page">
        <header className="article-hero">
          <a className="back-link" href="/writing">← Writing archive</a>
          <h1>{article.title}</h1>
          {article.subtitle?.trim() ? <p className="article-subtitle">{article.subtitle}</p> : null}
          <p className="article-reading-time">Reading Time: {readingTimeLabel(article.blocks)}</p>
          <ArticleByline article={article} />
        </header>
        <div className="article-layout">
          <article><BlockRenderer blocks={article.blocks} variant="studio" hideDividers /></article>
        </div>
        <nav className="article-end" aria-label="Article navigation">
          <div><span>End of article</span><strong>{article.title}</strong></div>
          <a href="/writing">Return to writing →</a>
        </nav>
      </main>
    </PageFrame>
  );
}
