import { FeaturedImage } from "../../components/blocks/featured-image";
import { resolveImageSource } from "../../content/image-source";
import type { StudioCoverImage } from "../editor-model";

/** The document owns image metadata; Files owns editing the asset description. */
export function FeaturedImageControl({ image, sourceUrl, onReplace, onRemove }: { image: StudioCoverImage | null | undefined; sourceUrl?: string; onReplace: () => void; onRemove?: () => void }) {
  const source = resolveImageSource(image, image?.src && sourceUrl ? { [image.src]: sourceUrl } : {}, sourceUrl);
  return <div className="page-featured-image"><span className="visually-hidden">Featured image</span>{image ? <div className="page-featured-image-preview">
    <FeaturedImage source={source} alt={image.alt} />
    <div className="page-featured-image-actions"><button type="button" onClick={onReplace} aria-label="Replace featured image">Replace</button>{onRemove ? <button type="button" onClick={onRemove} aria-label="Remove featured image">Remove</button> : null}</div>
  </div> : <button type="button" className="choose-media-button" onClick={onReplace}>Set featured image</button>}</div>;
}
