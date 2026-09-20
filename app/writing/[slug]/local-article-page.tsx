"use client";

import { useEffect, useRef, useState } from "react";
import { BlockRenderer } from "../../components/content";
import { ArticleByline, PageFrame } from "../../components/site-shell";
import { readingTimeLabel } from "../../content/reading-time";
import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY, parseLocallyPublishedArticles, restoreLegacyPublicationCover, type LocallyPublishedArticle } from "../../content/local-publishing";
import { getMediaAsset } from "../../studio/media-store";
import { safeImageSource } from "../../content/rich-text";
import { TemplateDocument } from "../../studio/template-renderer";
import type { StudioDocument } from "../../studio/editor-model";

export function LocalArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<LocallyPublishedArticle | null | undefined>(undefined);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const localArticle = parseLocallyPublishedArticles(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY)).find((item) => item.slug === slug) ?? null;
    const restoredArticle = localArticle
      ? restoreLegacyPublicationCover(localArticle, window.localStorage.getItem(LOCAL_WORKSPACE_KEY))
      : null;
    queueMicrotask(() => { if (!cancelled) setArticle(restoredArticle); });
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

  // Older local publications predate cover metadata. Treat their missing
  // value as the same generated cover that Studio shows for posts.
  const coverImage = article?.coverImage === undefined
    ? { src: "", alt: "Mock cover image" }
    : article?.coverImage;
  const coverImageUrl = coverImage?.mediaId
    ? mediaUrls[coverImage.mediaId] || coverImage.src
    : coverImage?.src;
  const safeCoverImageUrl = coverImage?.mediaId
    ? safeImageSource(coverImageUrl ?? "", { allowBlob: true })
    : safeImageSource(coverImageUrl ?? "");

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

  if (article.templateSnapshot) {
    const document: StudioDocument = { id: article.localDocumentId, kind: "post", title: article.title, subtitle: article.subtitle, slug: article.slug, excerpt: article.summary, status: "published", author: article.author, metadataBlocksVersion: article.metadataBlocksVersion, publishedAt: article.publishedAt, updatedAt: article.publishedAt, blocks: article.blocks, tags: [], category: article.section, coverImage: article.coverImage, seoTitle: article.title, seoDescription: article.summary };
    return <main><div className="local-publication-banner" role="note"><strong>Locally published preview</strong><span>This post is visible only in this browser.</span><a href="/studio">Edit in Studio</a></div><TemplateDocument snapshot={article.templateSnapshot} document={document} mediaUrls={mediaUrls} /></main>;
  }
  const legacyMetadata = article.metadataBlocksVersion !== 2;
  return (
    <PageFrame>
      <main className="article-page">
        <div className="local-publication-banner" role="note"><strong>Locally published preview</strong><span>This post is visible only in this browser.</span><a href="/studio">Edit in Studio →</a></div>
        <header className="article-hero">
          <a className="back-link" href="/writing">← Writing archive</a>
          <h1>{article.title}</h1>
          {article.subtitle?.trim() ? <p className="article-subtitle">{article.subtitle}</p> : null}
          {legacyMetadata ? <><p className="article-reading-time">Reading Time: {readingTimeLabel(article.blocks)}</p><ArticleByline article={article} /></> : null}
          {coverImage ? <figure className="article-cover-image">
            {safeCoverImageUrl ? (
              // Local browser-managed media cannot be known to Next's image optimiser.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeCoverImageUrl} alt={coverImage.alt} />
            ) : <div role="img" aria-label={coverImage.alt} />}
          </figure> : null}
        </header>
        <div className="article-layout">
          <article><BlockRenderer blocks={article.blocks} mediaUrls={mediaUrls} variant="studio" hideDividers document={{ kind: "post", author: article.author, publishedAt: article.publishedAt }} /></article>
        </div>
        <nav className="article-end" aria-label="Article navigation"><div><span>End of article</span><strong>{article.title}</strong></div><a href="/writing">Return to writing →</a></nav>
      </main>
    </PageFrame>
  );
}
