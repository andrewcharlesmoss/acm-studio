import type { ComponentPropsWithRef, ReactNode } from "react";
import type { ContentBlock, HeadingLevel } from "../../content/model";
import { authorInitials } from "../../content/document-metadata";
import { readingTimeDisplay } from "../../content/reading-time";
import { safeTextLink } from "../../content/rich-text";
import { ArticleMetaIcon } from "../article-meta-icon";

/** Hosts retain visibility, editing, selection and missing-field policies. */
export function DocumentTitleContent({ level = 2, ...props }: ComponentPropsWithRef<"h1"> & { level?: HeadingLevel | 0 }) {
  const Element = level === 0 ? "p" : `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return <Element {...props} />;
}

export function DocumentSubtitleContent(props: ComponentPropsWithRef<"p">) {
  return <p {...props} />;
}

export function DocumentAuthorContent({ author, avatar = true, prefix = "By" }: { author?: string | null; avatar?: boolean; prefix?: string }) {
  return author ? <>{avatar ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{prefix} <strong>{author}</strong></span></>
    : <span className="metadata-missing">Add an author in Document settings.</span>;
}

export function PublicationDateContent({ label, dateTime, showIcon = true, modified = false }: { label?: string | null; dateTime?: string; showIcon?: boolean; modified?: boolean }) {
  return label ? <>{showIcon ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={dateTime}>{label}</time></>
    : <span className="metadata-missing">{modified ? "No confirmed modification date is available." : "Add a publication date in Document settings."}</span>;
}

export function ReadingTimeContent({ blocks, block, wrapPlain = false }: { blocks: ContentBlock[]; block: Extract<ContentBlock, { type: "reading-time" }>; wrapPlain?: boolean }) {
  const label = `${block.prefix ?? "Reading Time:"} ${readingTimeDisplay(blocks, block)}`;
  return block.presentation !== "plain" ? <span className="reading-time-badge">{label}</span> : wrapPlain ? <span>{label}</span> : label;
}

export function DocumentFieldLink({ href, enabled, target, rel, editing = false, children }: { href?: string | null; enabled?: boolean; target?: "_blank"; rel?: string; editing?: boolean; children: ReactNode }) {
  const safeHref = href ? safeTextLink(href) : null;
  return enabled && safeHref ? <a href={safeHref} target={target} rel={[rel, target === "_blank" ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined} onClick={editing ? event => event.preventDefault() : undefined}>{children}</a> : children;
}
