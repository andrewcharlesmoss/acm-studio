"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MediaManagerView, type MediaManagerResources } from "../../media-manager";
import type { MediaAsset } from "../../media-store";
import type { StudioDocument } from "../../editor-model";
import { useStudioMediaOwner } from "../../use-studio-media";
import { StudioDialog } from "../../overlays/dialog";
import { useBlobUrls } from "../../controls/use-blob-urls";
import { commitTemplateImageReplacement, templateImageTarget, type TemplateImageTarget } from "../../template-image-replacement";
import { emptyTemplateStore, type TemplateSet } from "../../template-model";
import { generateImageRenditions } from "../../image-rendition-generation";
import type { ImageRenditions } from "../../../content/image-resolution";
import type { ImageResolutionChoices } from "../../controls/image-resolution-setting";
import { findContentBlock } from "../../../content/block-tree";

type ExampleAsset = MediaAsset & { imageRenditions?: ImageRenditions };

/** Resource and history adapters only: Files and image insertion remain production components. */
export function useMemoryImageFiles({ document, writable, updateDocument, onSelectBlock, template, enableSizes = false }: {
  document: StudioDocument;
  writable: boolean;
  updateDocument: (update: (document: StudioDocument) => StudioDocument) => boolean;
  onSelectBlock: (id: string) => void;
  template?: { set: TemplateSet; targetId: string; change: (set: TemplateSet) => boolean };
  enableSizes?: boolean;
}) {
  const [assets, setAssets] = useState<ExampleAsset[]>([]);
  const assetsRef = useRef(assets);
  const [open, setOpen] = useState(false);
  const [authorProfileOwner, setAuthorProfileOwner] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusReturn = useRef(false);
  const templateOwner = useRef<TemplateImageTarget | null>(null);
  const current = useRef({ document, writable, template });
  useLayoutEffect(() => { current.current = { document, writable, template }; assetsRef.current = assets; });
  useEffect(() => {
    let cancelled = false;
    const samples = [
      { id: "example-landscape", name: "Landscape.png", src: "/specimens/landscape.png", type: "image/png", altText: "A landscape illustration", caption: "" },
      { id: "example-mountain", name: "Mont Blanc.jpg", src: "/specimens/mont-blanc.jpg", type: "image/jpeg", altText: "Snow-covered mountains", caption: "A mountain sample" },
      ...(enableSizes ? [{ id: "library-local-image", name: "Landscape.png", src: "/specimens/landscape.png", type: "image/png", altText: "Illustrated green hill with a blue sky", caption: "A local PNG fixture" }] : []),
    ];
    void Promise.all(samples.map(async sample => {
      const response = await fetch(sample.src);
      if (!response.ok) throw new Error("The example files could not be loaded.");
      const blob = new Blob([await response.arrayBuffer()], { type: sample.type });
      return { ...sample, blob, size: blob.size, folderId: null, createdAt: "2026-10-27T00:00:00.000Z", updatedAt: "2026-10-27T00:00:00.000Z" };
    })).then(async loaded => {
      const next: ExampleAsset[] = [];
      for (const asset of loaded) {
        if (cancelled) return;
        let imageRenditions: ImageRenditions | undefined;
        if (enableSizes) {
          try { const bundle = await generateImageRenditions(asset.blob); if (bundle) imageRenditions = { version: 1, bundles: [bundle] }; }
          catch { /* The original remains usable when a size cannot be prepared. */ }
        }
        next.push({ ...asset, ...(imageRenditions ? { imageRenditions } : {}) });
      }
      if (!cancelled) { assetsRef.current = next; setAssets(next); }
    }).catch(error => { if (!cancelled) setFeedback(error instanceof Error ? error.message : "The example files could not be loaded."); });
    return () => { cancelled = true; };
  }, [enableSizes]);
  const resources = useMemo<MediaManagerResources>(() => ({
    listMediaLibrary: async () => ({ assets: assetsRef.current.filter(asset => asset.id !== "library-local-image"), folders: [] }),
    getMediaAsset: async id => assetsRef.current.find(asset => asset.id === id),
    designLinks: () => ({}),
  }), []);
  const urls = useBlobUrls(assets);
  const resolutionChoices = useMemo<ImageResolutionChoices>(() => enableSizes ? Object.fromEntries(assets.map(asset => {
    const bundle = asset.imageRenditions?.bundles[0];
    return [asset.id, (bundle?.variants ?? []).map(variant => ({ label: variant.key === "thumbnail" ? "Thumbnail" : variant.key === "medium" ? "Medium" : "Large", resolution: { key: variant.key, sourceDigest: bundle!.sourceDigest, renditionDigest: variant.digest } }))];
  })) : {}, [assets, enableSizes]);
  const close = () => { focusReturn.current = true; setOpen(false); templateOwner.current = null; setAuthorProfileOwner(null); };
  useEffect(() => {
    if (open || !focusReturn.current) return;
    focusReturn.current = false;
    // Nested native dialogs close during the same commit; restore the Files
    // opener after both focus cleanups and the updated canvas have settled.
    const frame = requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus(); });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const media = useStudioMediaOwner({
    documents: [document], activeDocument: document, writable, updateActiveDocument: updateDocument,
    updateBlock: (id, update) => updateDocument(doc => ({ ...doc, blocks: doc.blocks.map(block => block.id === id ? update(block) : block) })),
    onSelectBlock, onReturnToDocument: close, onFeedback: setFeedback,
  }, { getMediaAsset: resources.getMediaAsset, revision: assets.length });
  const targetBlock = media.targetBlockId ? findContentBlock(document.blocks, media.targetBlockId) : null;
  function choose(blockId: string, trigger?: HTMLElement) {
    if (!current.current.writable) return;
    setAuthorProfileOwner(null);
    opener.current = trigger ?? (globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null);
    if (current.current.template) {
      const { set, targetId } = current.current.template;
      const target = [...set.templates, ...set.parts].find(entry => entry.id === targetId);
      const image = target && templateImageTarget(target.nodes, blockId);
      if (!image) { setFeedback("The image target is no longer available."); return; }
      templateOwner.current = { setId: set.id, targetId, image };
    } else media.targetBlock(blockId);
    setGeneration(value => value + 1); setOpen(true);
  }
  function chooseAuthorProfile(blockId: string, trigger?: HTMLElement) {
    if (!current.current.writable || !current.current.document.blocks.some(block => block.id === blockId && block.type === "author-name")) return;
    opener.current = trigger ?? (globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null);
    setAuthorProfileOwner(blockId);
    templateOwner.current = null;
    setGeneration(value => value + 1); setOpen(true);
  }
  const picker = open ? <StudioDialog title="Files" closeLabel="Close Files" className="memory-image-files-dialog" returnFocus={opener} onClose={close}>
    <p className="setting-note">Example files are read-only. Image changes remain in this example.</p>
    <MediaManagerView key={generation} writable={writable} targetLabel={authorProfileOwner ? "Author profile image" : targetBlock?.type === "cover" ? "Cover background" : "Image"} targetOwnerId={`${document.id}/${template?.targetId ?? authorProfileOwner ?? media.targetBlockId ?? "image"}/${generation}`} resources={resources} session={{ ready: true, revision: assets.length }} onInsertImage={(asset, _url, alt, signal) => {
      const active = current.current;
      if (!active.writable || signal?.aborted) return false;
      const authorBlockId = authorProfileOwner;
      if (authorBlockId) {
        let changed = false;
        const saved = updateDocument(doc => {
          if (!current.current.writable) return doc;
          const blocks = doc.blocks.map(block => {
            if (block.id !== authorBlockId || block.type !== "author-name") return block;
            changed = true;
            return { ...block, avatar: true, profileImage: { src: "", mediaId: asset.id, alt: alt ?? asset.altText ?? "" } };
          });
          return changed ? { ...doc, blocks } : doc;
        });
        if (saved && changed) { setAuthorProfileOwner(null); close(); return true; }
        return false;
      }
      if (!active.template) return media.insertImage(asset, undefined, alt, signal);
      const owner = templateOwner.current;
      if (!owner || active.template.set.id !== owner.setId || active.template.targetId !== owner.targetId) return false;
      const accepted = commitTemplateImageReplacement(update => {
        const latest = current.current.template;
        if (!current.current.writable || !latest || latest.set.id !== owner.setId || latest.targetId !== owner.targetId || signal?.aborted) return false;
        const store = { ...emptyTemplateStore(), sets: [latest.set] };
        const next = update(store);
        return next === store || latest.change(next.sets[0]);
      }, owner, asset, alt, signal);
      if (accepted) close();
      return accepted;
    }} />
  </StudioDialog> : null;
  return { choose, chooseAuthorProfile, cancel: close, picker, urls: { ...media.blockUrls, ...urls }, renditionUrls: media.renditionUrls, resolutionChoices, feedback };
}
