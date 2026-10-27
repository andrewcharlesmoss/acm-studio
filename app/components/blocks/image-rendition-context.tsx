"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ImageRenditionUrls } from "../../content/image-resolution";

export const EMPTY_IMAGE_RENDITION_URLS: ImageRenditionUrls = Object.freeze({});
const ImageRenditionContext = createContext<ImageRenditionUrls>(EMPTY_IMAGE_RENDITION_URLS);
export function ImageRenditionProvider({ urls, children }: { urls: ImageRenditionUrls; children: ReactNode }) {
  return <ImageRenditionContext.Provider value={urls}>{children}</ImageRenditionContext.Provider>;
}
export function useImageRenditionUrls() { return useContext(ImageRenditionContext); }
