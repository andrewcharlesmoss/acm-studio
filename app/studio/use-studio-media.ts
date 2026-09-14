"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentBlock } from "../content/model";
import type { StudioCoverImage, StudioDocument } from "./editor-model";
import { getMediaAsset, type MediaAsset } from "./media-store";

export function useStudioMedia({
  documents,
  activeDocument,
  updateActiveDocument,
  updateBlock,
  onSelectBlock,
  onReturnToDocument,
}: {
  documents: StudioDocument[];
  activeDocument: StudioDocument;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => void;
  updateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSelectBlock: (blockId: string) => void;
  onReturnToDocument: (target: "document" | "block") => void;
}) {
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  const [targetCover, setTargetCover] = useState(false);
  const [blockUrls, setBlockUrls] = useState<Record<string, string>>({});
  const blockUrlsRef = useRef<Record<string, string>>({});
  const referencedMediaKey = useMemo(() => documents
    .flatMap((document) => [
      document.coverImage?.mediaId,
      ...document.blocks
        .filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image" && Boolean(block.mediaId))
        .map((block) => block.mediaId),
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
  }, [referencedMediaKey]);

  useEffect(() => () => {
    Object.values(blockUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    blockUrlsRef.current = {};
  }, []);

  function targetBlock(blockId: string | null = null) {
    setTargetBlockId(blockId);
    setTargetCover(false);
  }

  function targetCoverImage() {
    setTargetBlockId(null);
    setTargetCover(true);
  }

  function removeCoverImage() {
    updateActiveDocument((document) => ({ ...document, coverImage: null }));
  }

  function insertImage(asset: MediaAsset, destination?: { target?: "block" | "cover"; blockId?: string | null } | string, altText?: string) {
    const options = typeof destination === "string" ? undefined : destination;
    const insertAsCover = options?.target === "cover" || (options?.target === undefined && targetCover);
    const destinationBlockId = options?.target === "block" ? options.blockId ?? null : targetBlockId;
    if (insertAsCover) {
      const coverImage: StudioCoverImage = {
        src: "",
        mediaId: asset.id,
        alt: altText?.trim() || asset.altText || asset.name.replace(/\.[^.]+$/, ""),
      };
      updateActiveDocument((document) => ({ ...document, coverImage }));
      setTargetCover(false);
      onReturnToDocument("document");
      return;
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
    onSelectBlock(image.id);
    onReturnToDocument("block");
  }

  async function insertImageById(mediaId: string, destination?: { target?: "block" | "cover"; blockId?: string | null }, altText?: string) {
    const asset = await getMediaAsset(mediaId);
    if (!asset || !asset.type.startsWith("image/")) return false;
    insertImage(asset, destination, altText);
    return true;
  }

  async function loadAssetById(mediaId: string) {
    return getMediaAsset(mediaId);
  }

  const coverImageUrl = activeDocument.coverImage?.mediaId
    ? blockUrls[activeDocument.coverImage.mediaId]
    : activeDocument.coverImage?.src;

  return {
    targetBlockId,
    targetCover,
    blockUrls,
    coverImageUrl,
    targetBlock,
    targetCoverImage,
    removeCoverImage,
    insertImage,
    insertImageById,
    loadAssetById,
  };
}
