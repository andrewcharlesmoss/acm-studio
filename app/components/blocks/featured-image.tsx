import type { CSSProperties } from "react";

/** Hosts own links, frame styling and editing controls; the image box is shared. */
export function FeaturedImage({ source, alt = "", style, placeholderLabel = "Featured image placeholder" }: {
  source: string | null;
  alt?: string;
  style?: CSSProperties;
  placeholderLabel?: string;
}) {
  // Managed media URLs are resolved by the owning renderer before reaching here.
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <img className="document-featured-image" src={source} alt={alt} style={style} draggable={false} />
    : <div className="document-featured-placeholder" style={style} role="img" aria-label={alt || placeholderLabel} />;
}
