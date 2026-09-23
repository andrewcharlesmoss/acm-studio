"use client";

import { useEffect, useState } from "react";
import { ArticleRow } from "../components/content";
import { LOCAL_PUBLICATIONS_KEY, parseLocallyPublishedArticles, type LocallyPublishedArticle } from "../content/local-publishing";
import type { Article } from "../content/model";

export function WritingArchiveList({ articles }: { articles: Article[] }) {
  const [localArticles, setLocalArticles] = useState<LocallyPublishedArticle[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const readLocalArticles = () => {
      const next = parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY));
      if (!cancelled) setLocalArticles(next);
    };
    queueMicrotask(readLocalArticles);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_PUBLICATIONS_KEY) readLocalArticles();
    };
    window.addEventListener("storage", handleStorage);
    const scheduleTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(scheduleTimer);
    };
  }, []);

  const visibleLocalArticles = localArticles.filter((article) => !article.scheduledAt || Date.parse(article.scheduledAt) <= now);

  return (
    <section className="writing-index" aria-label="Articles">
      <div className="writing-index-labels"><span>{articles.length + visibleLocalArticles.length} selected articles</span><span>Newest first</span></div>
      {visibleLocalArticles.length ? (
        <div className="local-writing-group">
          <div className="local-writing-label"><span>Published from ACM Studio</span><small>Visible on this browser only</small></div>
          <div className="article-list">
            {visibleLocalArticles.map((article) => <ArticleRow article={article} passwordProtected={Boolean(article.passwordProtection)} key={article.localDocumentId} />)}
          </div>
        </div>
      ) : null}
      <div className="article-list">
        {articles.map((article) => <ArticleRow article={article} key={article.slug} />)}
      </div>
    </section>
  );
}
