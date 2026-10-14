import type { ContentBlock } from "../../content/model";
import { documentFieldVisible } from "../../content/document-metadata";
import { resolveImageSource } from "../../content/image-source";
import { BlockRenderer } from "../../components/blocks/block-renderer";
import { FeaturedImage } from "../../components/blocks/featured-image";
import type { StudioDocument } from "../editor-model";
import type { StudioPresentation } from "../studio-presentation";
import { StudioIcon } from "../studio-icons";
import { testDocumentHref } from "./contract";

function hasFeaturedImageBlock(blocks: ContentBlock[]): boolean {
  return blocks.some(block => block.type === "cover-image"
    || "children" in block && Array.isArray(block.children) && hasFeaturedImageBlock(block.children));
}

/** Metadata stays outside the saved body; an authored dynamic block owns its placement. */
export function existingFeaturedImage(document: StudioDocument, mediaUrls: Record<string, string> = {}, actions?: { change: () => void; remove: () => void }) {
  if (!document.coverImage || !documentFieldVisible(document, "coverImage") || hasFeaturedImageBlock(document.blocks)) return null;
  return <figure className={`document-cover-shell document-dynamic-cover${actions ? " canvas-cover-wrap" : ""}`}>
    <FeaturedImage source={resolveImageSource(document.coverImage, mediaUrls)} alt={document.coverImage.alt} />
    {actions ? <div className="canvas-cover-actions">
      <button className="cover-action-button" type="button" onClick={actions.change} aria-label="Change featured image" title="Change featured image"><StudioIcon name="image" /></button>
      <button className="cover-action-button is-destructive" type="button" onClick={actions.remove} aria-label="Remove featured image" title="Remove featured image"><StudioIcon name="trash" /></button>
    </div> : null}
  </figure>;
}

export function existingImageMainId(document: StudioDocument) {
  return document.blocks.find(block => block.type === "group" && block.tagName === "main" && !block.editorial?.hidden)?.id;
}

export function existingSitePresentation(document: StudioDocument, mediaUrls: Record<string, string>, writable: boolean, change: () => void, remove: () => void): StudioPresentation {
  const mainId = existingImageMainId(document);
  return {
    renderHeader: context => mainId ? <></> : existingFeaturedImage(document, mediaUrls, context.mode === "edit" && writable ? { change, remove } : undefined),
    renderFooter: () => <></>,
    renderDocument: (context, content) => <div className="test-site-page" data-test-mode={context.mode}>{content}</div>,
    renderBlock: context => {
      if (!mainId || context.block?.id !== mainId) return null;
      const image = existingFeaturedImage(document, mediaUrls, context.mode === "edit" && writable ? { change, remove } : undefined);
      return context.mode === "edit"
        ? context.renderEditableBlock?.(context.block, { leadingContent: image }) ?? null
        : <BlockRenderer blocks={[context.block]} document={document} documentHref={testDocumentHref(document.id)} mediaUrls={mediaUrls} variant="studio" groupLeadingContent={{ blockId: mainId, content: image }} />;
    },
    showPublicationDetails: false, allowCoverImage: false, hideDividers: false,
  };
}

export function ExistingSiteBody({ document }: { document: StudioDocument }) {
  const mainId = existingImageMainId(document);
  const image = existingFeaturedImage(document);
  return <>{!mainId ? image : null}<BlockRenderer blocks={document.blocks} document={document} documentHref={testDocumentHref(document.id)} variant="studio" groupLeadingContent={mainId ? { blockId: mainId, content: image } : undefined} /></>;
}
