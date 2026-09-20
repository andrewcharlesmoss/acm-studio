import type { ReactNode } from "react";
import type { Article } from "../content/model";
import { ArticleMetaIcon } from "./article-meta-icon";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Andrew Charles Moss — home">
        <span className="brand-mark" aria-hidden="true">AM</span>
        <span className="brand-copy">
          <strong>Andrew Charles Moss</strong>
          <span>Projects and writing</span>
        </span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/projects">Projects</a>
        <a href="/writing">Writing</a>
        <a className="studio-link" href="/studio">Studio <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Andrew Charles Moss</p>
      <p>A home for focused products, experiments and useful writing.</p>
      <a href="#top">Back to top ↑</a>
    </footer>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell" id="top">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function ArticleByline({ article }: { article: Pick<Article, "publishedAt" | "displayDate"> }) {
  return (
    <div className="article-byline">
      <span className="article-author-avatar" aria-hidden="true">AM</span>
      <span>By <strong>Andrew Moss</strong></span>
      <span className="article-byline-detail">
        <ArticleMetaIcon name="clock" />
        {article.publishedAt ? <time dateTime={article.publishedAt}>{article.displayDate}</time> : <span>{article.displayDate}</span>}
      </span>
    </div>
  );
}
