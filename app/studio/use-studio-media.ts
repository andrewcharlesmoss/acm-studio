"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ContentBlock } from "../content/model";
import type { StudioCoverImage, StudioDocument } from "./editor-model";
import { useMediaSession } from "./media-sync";
import { getMediaAsset, type MediaAsset } from "./media-store";
import { contentMediaIds } from "../content/media-references";

import { setListItemBackgroundImage, type ListItemBackgroundTarget } from "./list-item-background";

export function useStudioMedia({
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
}: {
  documents: StudioDocument[];
  activeDocument: StudioDocument;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => boolean | void;
  updateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSelectBlock: (blockId: string) => void;
  onReturnToDocument: (target: "document" | "block") => void;
  onFeedback?: (message: string) => void;
  prepareFeaturedImage?: (asset: MediaAsset, alt: string) => Promise<StudioCoverImage>;
  sourceUrls?: Record<string, string>;
  writable?: boolean;
  saveFeaturedImage?: () => Promise<void>;
}) {
  const { revision: mediaRevision } = useMediaSession();
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  const [targetCover, setTargetCover] = useState(false);
  const [targetBackground, setTargetBackground] = useState(false);
  const [backgroundOwner, setBackgroundOwner] = useState<{ documentId: string; item?: ListItemBackgroundTarget } | null>(null);
  const [blockUrls, setBlockUrls] = useState<Record<string, string>>({});
  const [stagedSourceUrls, setStagedSourceUrls] = useState<Record<string, string>>({});
  const stagedSourceUrlsRef = useRef<Record<string, string>>({});
  const insertionContextRef = useRef({ documentId: activeDocument.id, targetCover, targetBlockId, prepareFeaturedImage, writable });
  const mountedRef = useRef(true);
  useLayoutEffect(() => { insertionContextRef.current = { documentId: activeDocument.id, targetCover, targetBlockId, prepareFeaturedImage, writable }; });
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const blockUrlsRef = useRef<Record<string, string>>({});
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
    void Promise.all(mediaIds.map(async (id) => ({ id, asset: await getMediaAsset(id) }))).then((records) => {
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
        Object.values(blockUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
        blockUrlsRef.current = urls;
        setBlockUrls(urls);
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [referencedMediaKey, mediaRevision]);

  useEffect(() => () => {
    Object.values(blockUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    blockUrlsRef.current = {};
    Object.values(stagedSourceUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    stagedSourceUrlsRef.current = {};
  }, []);

  function targetBlock(blockId: string | null = null) {
    setTargetBlockId(blockId);
    setTargetCover(false);
    setTargetBackground(false);
  }

  function targetBlockBackground(blockId: string, item?: ListItemBackgroundTarget) {
    setBackgroundOwner({ documentId: activeDocument.id, item });
    setTargetBlockId(blockId);
    setTargetCover(false);
    setTargetBackground(true);
  }

  function targetCoverImage() {
    setTargetBlockId(null);
    setTargetCover(true);
    setTargetBackground(false);
  }

  function removeCoverImage() {
    updateActiveDocument((document) => ({ ...document, coverImage: null }));
  }

  async function insertImage(asset: MediaAsset, destination?: { target?: "block" | "cover" | "background"; blockId?: string | null } | string, altText?: string, signal?: AbortSignal): Promise<boolean> {
    if (!insertionContextRef.current.writable) return false;
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
      if (updateActiveDocument((document) => ({ ...document, coverImage })) === false) return false;
      if (prepareFeaturedImage && coverImage.src) {
        const previous = stagedSourceUrlsRef.current[coverImage.src];
        if (previous) URL.revokeObjectURL(previous);
        const urls = { ...stagedSourceUrlsRef.current, [coverImage.src]: URL.createObjectURL(asset.blob) };
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
        if (block.type !== "list" && block.type !== "quote" && block.type !== "group" && block.type !== "heading" && block.type !== "code" && block.type !== "document-title") return block;
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
    const image = {
      id: destinationBlockId ?? `image-${crypto.randomUUID()}`,
      type: "image" as const,
      src: "",
      mediaId: asset.id,
      alt: altText?.trim() || asset.altText || asset.name.replace(/\.[^.]+$/, ""),
      caption: asset.caption,
    };
    if (destinationBlockId) updateBlock(destinationBlockId, () => image);
    else updateActiveDocument((document) => ({ ...document, blocks: [...document.blocks, image] }));
    setTargetBlockId(null);
    setTargetBackground(false);
    onSelectBlock(image.id);
    onReturnToDocument("block");
    return true;
  }

  async function insertImageById(mediaId: string, destination?: { target?: "block" | "cover" | "background"; blockId?: string | null }, altText?: string) {
    const asset = await getMediaAsset(mediaId);
    if (!asset || !asset.type.startsWith("image/")) return false;
    return insertImage(asset, destination, altText);
  }

  async function loadAssetById(mediaId: string) {
    return getMediaAsset(mediaId);
  }

  const coverImageUrl = activeDocument.coverImage?.mediaId
    ? blockUrls[activeDocument.coverImage.mediaId]
    : activeDocument.coverImage?.src ? stagedSourceUrls[activeDocument.coverImage.src] ?? sourceUrls[activeDocument.coverImage.src] ?? activeDocument.coverImage.src : undefined;

  return {
    targetBlockId,
    targetCover,
    targetBackground,
    blockUrls: { ...sourceUrls, ...stagedSourceUrls, ...blockUrls },
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
