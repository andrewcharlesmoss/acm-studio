/* eslint-disable @next/next/no-img-element -- Native managed images retain Blob URLs, authored dimensions, and portable renderer behaviour; no Next image service is configured. */
import type { CSSProperties } from "react";
import { useId } from "react";
import type { ImageDuotone } from "../../content/image-duotone";
import { validImageDuotone } from "../../content/image-duotone";
import type { FeaturedImageOverlay } from "../../content/featured-image-overlay";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { DuotoneFilter } from "../duotone-filter";

/** Hosts own links, frame styling and editing controls; the image box is shared. */
export function FeaturedImage({ source, alt = "", style, duotone, overlay, placeholderLabel = "Featured image placeholder" }: {
  source: string | null;
  alt?: string;
  style?: CSSProperties;
  duotone?: ImageDuotone | null;
  overlay?: FeaturedImageOverlay;
  placeholderLabel?: string;
}) {
  // Managed media URLs are resolved by the owning renderer before reaching here.
  const filterId = `featured-image-duotone-${useId().replace(/:/g, "")}`;
  const authored = duotone !== undefined;
  const effect = validImageDuotone(duotone) ? duotone : null;
  const imageStyle = { ...style, ...(authored ? { filter: effect ? `url("#${filterId}")` : "none" } : {}) };
  const overlayStyle = overlay ? {
    opacity: overlay.opacity / 100,
    background: overlay.gradient ? paragraphBackgroundGradientCss(overlay.gradient) : overlay.colour ?? "#000000",
  } : undefined;
  const frameStyle = style ? Object.fromEntries(Object.entries(style).filter(([key]) => ["width", "height", "aspectRatio", "borderRadius"].includes(key))) : undefined;
  return source ? <>{effect ? <DuotoneFilter id={filterId} value={effect} /> : null}<span className="document-featured-image-frame" style={frameStyle}><img className="document-featured-image" src={source} alt={alt} style={imageStyle} data-image-duotone-authored={authored ? "true" : undefined} draggable={false} />{overlay ? <span className="document-featured-image-overlay" aria-hidden="true" style={overlayStyle} /> : null}</span></>
    : <div className="document-featured-placeholder" style={style} role="img" aria-label={alt || placeholderLabel} />;
}
