/* eslint-disable @next/next/no-img-element -- Native managed images retain Blob URLs, authored dimensions, and portable renderer behaviour; no Next image service is configured. */
import type { ComponentPropsWithRef, ReactNode } from "react";
import type { ContentBlock, HeadingLevel } from "../../content/model";
import { authorInitials } from "../../content/document-metadata";
import { readingTimeDisplay } from "../../content/reading-time";
import { safeTextLink } from "../../content/rich-text";
import { validAuthorProfileUrl } from "../../content/author-profile-presentation";
import { ArticleMetaIcon } from "../article-meta-icon";
import { DuotoneFilter } from "../../studio/controls/duotone-filter";
import type { ImageDuotone } from "../../content/image-duotone";

/** Hosts retain visibility, editing, selection and missing-field policies. */
export function DocumentTitleContent({ level = 2, ...props }: ComponentPropsWithRef<"h1"> & { level?: HeadingLevel | 0 }) {
  const Element = level === 0 ? "p" : `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return <Element {...props} />;
}

export function DocumentSubtitleContent(props: ComponentPropsWithRef<"p">) {
  return <p {...props} />;
}

export function DocumentAuthorContent({ author, avatar = true, avatarSize = 96, imageUrl, imageAlt, biography, profileUrl, openInNewTab = false, prefix = "By", editing = false, duotone, duotoneId }: { author?: string | null; avatar?: boolean; avatarSize?: number; imageUrl?: string; imageAlt?: string; biography?: string; profileUrl?: string; openInNewTab?: boolean; prefix?: string; editing?: boolean; duotone?: ImageDuotone | null; duotoneId?: string }) {
  if (!author) return <span className="metadata-missing">Add an author in Document settings.</span>;
  const href = profileUrl && validAuthorProfileUrl(profileUrl) ? safeTextLink(profileUrl) : null;
  const target = openInNewTab ? "_blank" as const : undefined;
  const image = imageUrl ? <>{duotone && duotoneId ? <DuotoneFilter id={duotoneId} value={duotone}/> : null}<img className="article-author-avatar" src={imageUrl} alt={imageAlt ?? ""} width={avatarSize} height={avatarSize} data-author-duotone-authored={duotone !== undefined ? "true" : undefined} style={{ width: avatarSize, height: avatarSize, objectFit: "cover", filter: duotone ? `url("#${duotoneId}")` : duotone === null ? "none" : undefined }} /></> : <span className="article-author-avatar" aria-hidden="true" style={{ width: avatarSize, height: avatarSize }}>{authorInitials(author)}</span>;
  const linkedImage = <DocumentFieldLink href={href} enabled={Boolean(href)} target={target} editing={editing}>{image}</DocumentFieldLink>;
  const linkedName = <DocumentFieldLink href={href} enabled={Boolean(href)} target={target} editing={editing}>{author}</DocumentFieldLink>;
  return <>{avatar ? linkedImage : null}<span>{prefix} <strong>{linkedName}</strong></span>{biography?.trim() ? <p className="article-author-biography">{biography}</p> : null}</>;
}

export function PublicationDateContent({ label, dateTime, showIcon = true, modified = false }: { label?: string | null; dateTime?: string; showIcon?: boolean; modified?: boolean }) {
  return label ? <>{showIcon ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={dateTime}>{label}</time></>
    : <span className="metadata-missing">{modified ? "No confirmed modification date is available." : "Add a publication date in Document settings."}</span>;
}

export function ReadingTimeContent({ blocks, block, wrapPlain = false }: { blocks: ContentBlock[]; block: Extract<ContentBlock, { type: "time-to-read" }>; wrapPlain?: boolean }) {
  const label = `${block.prefix ?? "Reading Time:"} ${readingTimeDisplay(blocks, block)}`;
  return block.presentation !== "plain" ? <span className="reading-time-badge">{label}</span> : wrapPlain ? <span>{label}</span> : label;
}

export function DocumentFieldLink({ href, enabled, target, rel, editing = false, children }: { href?: string | null; enabled?: boolean; target?: "_blank"; rel?: string; editing?: boolean; children: ReactNode }) {
  const safeHref = href ? safeTextLink(href) : null;
  return enabled && safeHref ? <a href={safeHref} target={target} rel={[rel, target === "_blank" ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined} onClick={editing ? event => event.preventDefault() : undefined}>{children}</a> : children;
}
