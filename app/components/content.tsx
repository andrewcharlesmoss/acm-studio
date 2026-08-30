import { Fragment, type ReactNode } from "react";
import { safeTextLink, textToRuns } from "../content/rich-text";
import type { Article, ContentBlock, HeadingLevel, Project, RichTextRun, TextMark } from "../content/model";

export function StatusPill({ status }: { status: Project["status"] }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>;
}

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article className="project-card" style={{ "--project-accent": project.accent } as React.CSSProperties}>
      <div className="project-card-topline">
        <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
        <StatusPill status={project.status} />
      </div>
      <div>
        <p className="eyebrow">{project.eyebrow}</p>
        <h3><a href={`/projects/${project.slug}`}>{project.name}</a></h3>
        <p>{project.summary}</p>
      </div>
      <a className="card-link" href={`/projects/${project.slug}`} aria-label={`View ${project.name}`}>
        View project <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

export function ArticleRow({ article }: { article: Article }) {
  return (
    <article className="article-row">
      <div className="article-meta">
        <span>{article.section}</span>
        <time dateTime={article.publishedAt}>{article.displayDate}</time>
      </div>
      <div className="article-summary">
        <h3><a href={`/writing/${article.slug}`}>{article.title}</a></h3>
        <p>{article.summary}</p>
      </div>
      <span className="article-arrow" aria-hidden="true">↗</span>
    </article>
  );
}

export function BlockRenderer({ blocks, mediaUrls = {} }: { blocks: ContentBlock[]; mediaUrls?: Record<string, string> }) {
  return (
    <div className="prose">
      {blocks.map((block) => {
        if (block.type === "paragraph") return <p className={`align-${block.align ?? "left"}`} key={block.id}>{renderText(block.text, block.runs)}</p>;
        if (block.type === "heading") {
          return renderHeading(block.level, `align-${block.align ?? "left"}`, block.id, renderText(block.text, block.runs));
        }
        if (block.type === "quote") {
          return (
            <figure className={`pull-quote align-${block.align ?? "left"}`} key={block.id}>
              <blockquote>{renderText(block.text, block.runs)}</blockquote>
              {block.attribution ? <figcaption>— {block.attribution}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "list") {
          const items = block.items.map((item) => <li key={item}>{item}</li>);
          return block.style === "ordered"
            ? <ol key={block.id}>{items}</ol>
            : <ul key={block.id}>{items}</ul>;
        }
        if (block.type === "code") {
          return <pre key={block.id}><code>{block.code}</code></pre>;
        }
        if (block.type === "image") {
          const imageSource = block.mediaId ? mediaUrls[block.mediaId] : block.src;
          return (
            <figure key={block.id} className={`article-image${block.wide ? " is-wide" : ""}`}>
              {imageSource ? (
                // Sample and local editor content use externally supplied image URLs only.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSource} alt={block.alt} />
              ) : <div className="image-placeholder" role="img" aria-label={block.alt || "Image placeholder"}>Image</div>}
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "embed") return (
          <aside className="embed-card" key={block.id}>
            <span>External resource</span>
            <a href={block.url}>{block.title} ↗</a>
          </aside>
        );
        if (block.type === "button") return (
          <p className="button-block" key={block.id}>
            <a className={`content-button is-${block.style}`} href={block.url}>{block.label}</a>
          </p>
        );
        return <hr className="content-divider" key={block.id} />;
      })}
    </div>
  );
}

function renderHeading(level: HeadingLevel, className: string, key: string, content: ReactNode) {
  if (level === 1) return <h1 className={className} key={key}>{content}</h1>;
  if (level === 2) return <h2 className={className} key={key}>{content}</h2>;
  if (level === 3) return <h3 className={className} key={key}>{content}</h3>;
  if (level === 4) return <h4 className={className} key={key}>{content}</h4>;
  if (level === 5) return <h5 className={className} key={key}>{content}</h5>;
  return <h6 className={className} key={key}>{content}</h6>;
}

function renderText(text: string, runs?: RichTextRun[]) {
  return (runs?.length ? runs : textToRuns(text)).map((run, index) => {
    let content: ReactNode = run.text;
    for (const mark of run.marks ?? []) content = renderMark(content, mark);
    return <Fragment key={`${index}-${run.text}`}>{content}</Fragment>;
  });
}

function renderMark(content: ReactNode, mark: TextMark): ReactNode {
  if (mark === "bold") return <strong>{content}</strong>;
  if (mark === "italic") return <em>{content}</em>;
  const href = safeTextLink(mark.url);
  return href ? <a href={href}>{content}</a> : content;
}
