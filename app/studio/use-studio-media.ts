"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ContentBlock } from "../content/model";
import type { StudioCoverImage, StudioDocument } from "./editor-model";
import { useMediaSession } from "./media-sync";
import { getMediaAsset, type MediaAsset } from "./media-store";
import { createManagedImageUrl, isSafeManagedImageType } from "../content/image-source";
import { useBlobUrls } from "./controls/use-blob-urls";
import { contentMediaIds } from "../content/media-references";
import { findContentBlock } from "../content/block-tree";
import { updateBlockById } from "./studio-command-operations.mjs";
import { imageReplacementTarget, replaceImageMedia, type ImageReplacementTarget } from "./image-replacement";
import { imageRenditionSelections, referencedImageRenditions } from "./image-rendition-resources";

import { setListItemBackgroundImage, type ListItemBackgroundTarget } from "./list-item-background";

export type StudioMediaOptions = {
  documents: StudioDocument[];
  activeDocument: StudioDocument;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => boolean;
  updateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSelectBlock: (blockId: string) => void;
  onReturnToDocument: (target: "document" | "block") => void;
  onFeedback?: (message: string) => void;
  prepareFeaturedImage?: (asset: MediaAsset, alt: string) => Promise<StudioCoverImage>;
  sourceUrls?: Record<string, string>;
  writable?: boolean;
  saveFeaturedImage?: () => Promise<void>;
};
export type StudioMediaResources = { getMediaAsset: typeof getMediaAsset; revision: number };

export function useStudioMedia(options: StudioMediaOptions) {
  const { revision } = useMediaSession();
  return useStudioMediaOwner(options, { getMediaAsset, revision });
}

/** Same target/commit owner with explicit readers; no persistence is owned here. */
export function useStudioMediaOwner({
  documents,
  activeDocument,
  updateActiveDocument,
  updateBlock,
  onSelectBlock,
  onReturnToDocument,
  onFeedback,
  prepareFeaturedImage,
  sourceUrls = {},
  writable = true,
  saveFeaturedImage,
}: StudioMediaOptions, resources: StudioMediaResources) {
  const mediaRevision = resources.revision;
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  const [imageOwner, setImageOwner] = useState<{ documentId: string; target: ImageReplacementTarget | null; generation: number } | null>(null);
  const imageTargetGeneration = useRef(0);
  const [targetCover, setTargetCover] = useState(false);
  const [targetBackground, setTargetBackground] = useState(false);
  const [backgroundOwner, setBackgroundOwner] = useState<{ documentId: string; item?: ListItemBackgroundTarget } | null>(null);
  const [blockAssets, setBlockAssets] = useState<MediaAsset[]>([]);
  const blockUrls = useBlobUrls(blockAssets);
  const renditionKey = JSON.stringify(imageRenditionSelections(activeDocument.blocks));
  const renditionResources = useMemo(() => referencedImageRenditions(JSON.parse(renditionKey), blockAssets), [renditionKey, blockAssets]);
  const renditionUrls = useBlobUrls(renditionResources);
  const [stagedSourceUrls, setStagedSourceUrls] = useState<Record<string, string>>({});
  const stagedSourceUrlsRef = useRef<Record<string, string>>({});
  const insertionContextRef = useRef({ documentId: activeDocument.id, document: activeDocument, targetCover, targetBlockId, prepareFeaturedImage, writable });
  const mountedRef = useRef(true);
  useLayoutEffect(() => { insertionContextRef.current = { documentId: activeDocument.id, document: activeDocument, targetCover, targetBlockId, prepareFeaturedImage, writable }; });
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const referencedMediaKey = useMemo(() => documents
    .flatMap((document) => [
      document.coverImage?.mediaId,
      ...contentMediaIds(document.blocks),
    ])
    .filter((id): id is string => Boolean(id))
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .sort()
    .join("|"), [documents]);

  useEffect(() => {
    let cancelled = false;
    const mediaIds = referencedMediaKey ? referencedMediaKey.split("|") : [];
    void Promise.all(mediaIds.map(async (id) => ({ id, asset: await resources.getMediaAsset(id) }))).then((records) => {
      if (cancelled) return;
      setBlockAssets(records.flatMap(record => record.asset ? [record.asset] : []));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [referencedMediaKey, mediaRevision, resources.getMediaAsset]);

  useEffect(() => () => {
    Object.values(stagedSourceUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    stagedSourceUrlsRef.current = {};
  }, []);

  function targetBlock(blockId: string | null = null) {
    const generation = ++imageTargetGeneration.current;
    setImageOwner({ documentId: activeDocument.id, target: blockId ? imageReplacementTarget(findContentBlock(activeDocument.blocks, blockId)) : null, generation });
    setTargetBlockId(blockId);
    setTargetCover(false);
    setTargetBackground(false);
  }

  function targetBlockBackground(blockId: string, item?: ListItemBackgroundTarget) {
    imageTargetGeneration.current++;
    setImageOwner(null);
    setBackgroundOwner({ documentId: activeDocument.id, item });
    setTargetBlockId(blockId);
    setTargetCover(false);
    setTargetBackground(true);
  }

  function targetCoverImage() {
    imageTargetGeneration.current++;
    setImageOwner(null);
    setTargetBlockId(null);
    setTargetCover(true);
    setTargetBackground(false);
  }

  function removeCoverImage() {
    updateActiveDocument((document) => ({ ...document, coverImage: null }));
  }

  async function insertImage(asset: MediaAsset, destination?: { target?: "block" | "cover" | "background"; blockId?: string | null } | string, altText?: string, signal?: AbortSignal): Promise<boolean> {
    if (!insertionContextRef.current.writable || signal?.aborted) return false;
    if (!isSafeManagedImageType(asset.type) || !isSafeManagedImageType(asset.blob.type)) return false;
    const options = typeof destination === "string" ? undefined : destination;
    const insertAsCover = options?.target === "cover" || (options?.target === undefined && targetCover);
    const insertAsBackground = options?.target === "background" || (options?.target === undefined && targetBackground);
    const destinationBlockId = options?.target === "block" ? options.blockId ?? null : targetBlockId;
    if (insertAsCover) {
      const context = insertionContextRef.current;
      const alt = altText?.trim() || asset.altText || asset.name.replace(/\.[^.]+$/, "");
      const coverImage: StudioCoverImage = prepareFeaturedImage ? await prepareFeaturedImage(asset, alt) : {
        src: "",
        mediaId: asset.id,
        alt,
      };
      if (signal?.aborted) return false;
      const current = insertionContextRef.current;
      if (!mountedRef.current || !current.writable || current.documentId !== context.documentId || current.targetCover !== context.targetCover || current.targetBlockId !== context.targetBlockId || current.prepareFeaturedImage !== context.prepareFeaturedImage) throw new Error("The featured image destination changed. Select the document and try again.");
      const stagedImageUrl = prepareFeaturedImage && coverImage.src ? createManagedImageUrl(asset.blob) : null;
      if (prepareFeaturedImage && coverImage.src && !stagedImageUrl) return false;
      if (updateActiveDocument((document) => ({ ...document, coverImage })) === false) {
        if (stagedImageUrl) URL.revokeObjectURL(stagedImageUrl);
        return false;
      }
      if (stagedImageUrl && coverImage.src) {
        const previous = stagedSourceUrlsRef.current[coverImage.src];
        if (previous) URL.revokeObjectURL(previous);
        const urls = { ...stagedSourceUrlsRef.current, [coverImage.src]: stagedImageUrl };
        stagedSourceUrlsRef.current = urls;
        setStagedSourceUrls(urls);
      }
      if (saveFeaturedImage) {
        await saveFeaturedImage();
        const urls = { ...stagedSourceUrlsRef.current };
        if (urls[coverImage.src]) URL.revokeObjectURL(urls[coverImage.src]);
        delete urls[coverImage.src];
        stagedSourceUrlsRef.current = urls;
        if (mountedRef.current) setStagedSourceUrls(urls);
      }
      if (!mountedRef.current || !insertionContextRef.current.writable || insertionContextRef.current.documentId !== context.documentId || insertionContextRef.current.targetCover !== context.targetCover) throw new Error("The featured image destination changed. The accepted draft was kept.");
      setTargetCover(false);
      setTargetBackground(false);
      onReturnToDocument("document");
      return true;
    }
    if (insertAsBackground) {
      if (!destinationBlockId) return false;
      if (backgroundOwner?.documentId !== activeDocument.id) { onFeedback?.("The background image target changed. Select it and try again."); return false; }
      let staleItem = false;
      updateBlock(destinationBlockId, block => {
        if (backgroundOwner.item) {
          const next = block.type === "list" ? setListItemBackgroundImage(block, backgroundOwner.item, asset.id) : null;
          if (!next) staleItem = true;
          return next ?? block;
        }
        if (block.type !== "list" && block.type !== "quote" && block.type !== "group" && block.type !== "heading" && block.type !== "code" && block.type !== "document-title" && block.type !== "buttons") return block;
        return { ...block, visualStyle: { ...block.visualStyle, backgroundImageMediaId: asset.id } };
      });
      if (staleItem) { onFeedback?.("The List Items changed while choosing an image. Select the item and try again."); return false; }
      setTargetBlockId(null);
      setTargetBackground(false);
      setBackgroundOwner(null);
      onSelectBlock(destinationBlockId);
      onReturnToDocument("block");
      return true;
    }
    if (destinationBlockId) {
      const context = insertionContextRef.current;
      const owner = imageOwner;
      if (!owner?.target || owner.generation !== imageTargetGeneration.current || owner.documentId !== context.documentId || owner.target.id !== destinationBlockId || context.targetBlockId !== destinationBlockId) {
        onFeedback?.("The image target changed. Select it and try again.");
        return false;
      }
      const before = findContentBlock(context.document.blocks, destinationBlockId);
      const preview = replaceImageMedia(before, owner.target, asset, altText);
      if (!preview) { onFeedback?.("The image target changed. Select it and try again."); return false; }
      let checked = false;
      const accepted = updateActiveDocument(document => {
        if (signal?.aborted || owner.generation !== imageTargetGeneration.current || !insertionContextRef.current.writable || insertionContextRef.current.documentId !== owner.documentId || insertionContextRef.current.targetBlockId !== destinationBlockId || document.id !== owner.documentId) return document;
        const current = findContentBlock(document.blocks, destinationBlockId);
        const replacement = replaceImageMedia(current, owner.target!, asset, altText);
        if (!replacement) return document;
        if (replacement === current) { checked = true; return document; }
        const next = updateBlockById(document, destinationBlockId, () => replacement);
        checked = next !== document;
        return next;
      });
      if (!accepted || !checked) { onFeedback?.("The image could not be replaced. Your selection was kept."); return false; }
    } else {
      const context = insertionContextRef.current;
      if (!imageOwner || imageOwner.generation !== imageTargetGeneration.current || imageOwner.documentId !== context.documentId || context.targetBlockId !== null) return false;
      const image = { id: `image-${crypto.randomUUID()}`, type: "image" as const, src: "", mediaId: asset.id,
        alt: altText === undefined ? asset.altText || asset.name.replace(/\.[^.]+$/, "") : altText.trim(), caption: asset.caption };
      let inserted = false;
      const accepted = updateActiveDocument(document => {
        if (signal?.aborted || imageOwner.generation !== imageTargetGeneration.current || !insertionContextRef.current.writable || insertionContextRef.current.documentId !== context.documentId || insertionContextRef.current.targetBlockId !== null || document.id !== context.documentId) return document;
        inserted = true;
        return { ...document, blocks: [...document.blocks, image] };
      });
      if (!accepted || !inserted) return false;
      onSelectBlock(image.id);
    }
    imageTargetGeneration.current++;
    setTargetBlockId(null);
    setTargetBackground(false);
    setImageOwner(null);
    if (destinationBlockId) onSelectBlock(destinationBlockId);
    onReturnToDocument("block");
    return true;
  }

  async function insertImageById(mediaId: string, destination?: { target?: "block" | "cover" | "background"; blockId?: string | null }, altText?: string) {
    const asset = await resources.getMediaAsset(mediaId);
    if (!asset || !isSafeManagedImageType(asset.type) || !isSafeManagedImageType(asset.blob.type)) return false;
    return insertImage(asset, destination, altText);
  }

  async function loadAssetById(mediaId: string) {
    return resources.getMediaAsset(mediaId);
  }

  const coverImageUrl = activeDocument.coverImage?.mediaId
    ? blockUrls[activeDocument.coverImage.mediaId]
    : activeDocument.coverImage?.src ? stagedSourceUrls[activeDocument.coverImage.src] ?? sourceUrls[activeDocument.coverImage.src] ?? activeDocument.coverImage.src : undefined;

  return {
    targetBlockId,
    targetCover,
    targetBackground,
    blockUrls: { ...sourceUrls, ...stagedSourceUrls, ...blockUrls },
    renditionUrls,
    coverImageUrl,
    targetBlock,
    targetBlockBackground,
    targetCoverImage,
    removeCoverImage,
    insertImage,
    insertImageById,
    loadAssetById,
  };
}
