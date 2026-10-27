"use client";

import type { ContentBlock } from "../content/model";
import type { StyleSelection } from "./site-editor/styles-preview-state";
import type { StyleViewport } from "../content/responsive-styles";
import { useResponsiveStyleScope } from "./responsive-style-context";
import { effectivePreviewBlockStyle, type PreviewBlockStyle } from "./site-editor/blocks-preview-model";
import { projectWebsiteDesignBlocks, useWebsiteDesignContext } from "./site-editor/website-design-surface";

/** Presentation only: inherited colours never become authored content until edited. */
export function useImageDuotoneInheritance(block: Extract<ContentBlock, { type: "image" }>) {
  const website = useWebsiteDesignContext();
  const { viewport } = useResponsiveStyleScope();
  return inheritedImageDuotone(block, website?.design.styles, viewport);
}

export function inheritedImageDuotone(block: Extract<ContentBlock, { type: "image" }>, styles: StyleSelection | undefined, viewport: StyleViewport) {
  const projected = styles ? projectWebsiteDesignBlocks([block], styles)[0] : block;
  return effectivePreviewBlockStyle(projected.visualStyle as PreviewBlockStyle, viewport).duotone;
}
