import type { ReactNode } from "react";
import type { Article } from "../content/model";

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
      <span className="article-byline-detail"><ArticleMetaIcon name="comments" />0 Comments</span>
    </div>
  );
}

function ArticleMetaIcon({ name }: { name: "clock" | "comments" }) {
  if (name === "clock") {
    return <svg aria-hidden="true" className="article-meta-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7.5v5l3.5 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>;
  }
  return <svg aria-hidden="true" className="article-meta-icon" viewBox="0 0 24 24"><path d="M5.25 6.5h13.5A2.25 2.25 0 0 1 21 8.75v6A2.25 2.25 0 0 1 18.75 17H11l-4.25 3v-3H5.25A2.25 2.25 0 0 1 3 14.75v-6A2.25 2.25 0 0 1 5.25 6.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /><path d="M8 11.75h.01M12 11.75h.01M16 11.75h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" /></svg>;
}
