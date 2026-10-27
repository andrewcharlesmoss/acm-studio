import type { CSSProperties } from "react";
import { useId } from "react";
import type { ImageDuotone } from "../../content/image-duotone";
import { validImageDuotone } from "../../content/image-duotone";
import { DuotoneFilter } from "../duotone-filter";

/** Hosts own links, frame styling and editing controls; the image box is shared. */
export function FeaturedImage({ source, alt = "", style, duotone, placeholderLabel = "Featured image placeholder" }: {
  source: string | null;
  alt?: string;
  style?: CSSProperties;
  duotone?: ImageDuotone | null;
  placeholderLabel?: string;
}) {
  // Managed media URLs are resolved by the owning renderer before reaching here.
  const filterId = `featured-image-duotone-${useId().replace(/:/g, "")}`;
  const authored = duotone !== undefined;
  const effect = validImageDuotone(duotone) ? duotone : null;
  const imageStyle = { ...style, ...(authored ? { filter: effect ? `url("#${filterId}")` : "none" } : {}) };
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <>{effect ? <DuotoneFilter id={filterId} value={effect} /> : null}<img className="document-featured-image" src={source} alt={alt} style={imageStyle} data-image-duotone-authored={authored ? "true" : undefined} draggable={false} /></>
    : <div className="document-featured-placeholder" style={style} role="img" aria-label={alt || placeholderLabel} />;
}
