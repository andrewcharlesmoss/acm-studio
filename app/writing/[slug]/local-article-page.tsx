"use client";

import { useEffect, useRef, useState } from "react";
import { BlockRenderer } from "../../components/content";
import { PageFrame } from "../../components/site-shell";
import { LOCAL_PUBLICATIONS_KEY, parseLocallyPublishedArticles, type LocallyPublishedArticle } from "../../content/local-publishing";
import { getMediaAsset } from "../../studio/media-store";

export function LocalArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<LocallyPublishedArticle | null | undefined>(undefined);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const localArticle = parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY)).find((item) => item.slug === slug) ?? null;
    queueMicrotask(() => { if (!cancelled) setArticle(localArticle); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    void Promise.all(article.mediaIds.map(async (id) => ({ id, asset: await getMediaAsset(id) }))).then((records) => {
      if (cancelled) return;
      const urls: Record<string, string> = {};
      for (const record of records) {
        if (record.asset) urls[record.id] = URL.createObjectURL(record.asset.blob);
      }
      queueMicrotask(() => {
        if (cancelled) {
          Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        Object.values(mediaUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
        mediaUrlsRef.current = urls;
        setMediaUrls(urls);
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [article]);

  useEffect(() => () => {
    Object.values(mediaUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    mediaUrlsRef.current = {};
  }, []);

  useEffect(() => {
    if (!article) return;
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = `${article.title} — Andrew Charles Moss`;
    if (description) description.content = article.summary;
    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, [article]);

  if (article === undefined) {
    return <PageFrame><main className="local-article-state"><p className="eyebrow">Browser-local publication</p><h1>Loading locally published post…</h1></main></PageFrame>;
  }

  if (article === null) {
    return <PageFrame><main className="local-article-state"><p className="eyebrow">Post not found</p><h1>This post is not published in this browser.</h1><p>It may still be a draft, have been unpublished, or belong to another browser.</p><a className="primary-action" href="/writing">Return to writing</a></main></PageFrame>;
  }

  return (
    <PageFrame>
      <main className="article-page">
        <div className="local-publication-banner" role="note"><strong>Locally published preview</strong><span>This post is visible only in this browser.</span><a href="/studio">Edit in Studio →</a></div>
        <header className="article-hero">
          <a className="back-link" href="/writing">← Writing archive</a>
          <div className="article-hero-meta"><span>{article.section}</span><time dateTime={article.publishedAt}>{article.displayDate}</time><span>{article.readingTime}</span></div>
          <h1>{article.title}</h1>
          {article.subtitle ? <p className="article-subtitle">{article.subtitle}</p> : null}
          <p>{article.summary}</p>
        </header>
        <div className="article-layout">
          <aside className="article-context"><span>Written by</span><strong>Andrew Moss</strong><span>Publication</span><strong>Browser-local</strong></aside>
          <article><BlockRenderer blocks={article.blocks} mediaUrls={mediaUrls} /></article>
        </div>
        <nav className="article-end" aria-label="Article navigation"><div><span>End of article</span><strong>{article.title}</strong></div><a href="/writing">Return to writing →</a></nav>
      </main>
    </PageFrame>
  );
}
