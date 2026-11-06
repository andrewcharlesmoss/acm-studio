import type { ReactNode } from "react";
import type { ContentBlock, GroupLayoutOptions, ParagraphStyle } from "../content/model";
import { childContentBlocks } from "../content/block-tree";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import { paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../content/paragraph-styles";
import { BlockRenderer } from "../components/content";

const contentSlotExample: ContentBlock[] = [
  { id: "content-example-introduction", type: "paragraph", text: "This is the Content block, it will display all the blocks in any single post or page." },
  { id: "content-example-arrangement", type: "paragraph", text: "That might be a simple arrangement like consecutive paragraphs in a blog post, or a more elaborate composition that includes image galleries, videos, tables, columns, and any other block types." },
  { id: "content-example-types", type: "paragraph", text: "If there are any Custom Post Types registered at your site, the Content block can display the contents of those entries as well." },
];

/** Content uses the same layout in root and nested editor projections and previews. */
export function TemplateContentLayout({ layout, visualStyle, align, tagName = "div", mediaUrls = {}, editorFocusable = false, children }: {
  layout: GroupLayoutOptions;
  visualStyle?: ParagraphStyle;
  align?: "left" | "centre" | "right";
  tagName?: "div" | "main" | "section" | "article";
  mediaUrls?: Record<string, string>;
  editorFocusable?: boolean;
  children: ReactNode;
}) {
  const options = { ...layout, layout: "flow" as const, inheritLayout: layout.inheritLayout ?? true };
  const Element = tagName;
  const className = paragraphStyleClassName(visualStyle);
  return <Element className={`template-content-layout template-group layout-flow${hasLayoutOptions(options) ? " has-layout-options" : ""} site-block-style-content${className ? ` ${className}` : ""}`}
    role={editorFocusable ? "group" : undefined} aria-label={editorFocusable ? "Content layout" : undefined} tabIndex={editorFocusable ? 0 : undefined}
    id={paragraphStyleAnchor(visualStyle)}
    style={{ ...layoutStyleProperties(options), ...paragraphStyleToCss(visualStyle, visualStyle?.backgroundImageMediaId ? mediaUrls[visualStyle.backgroundImageMediaId] : undefined), ...(align ? { textAlign: align === "centre" ? "center" : align } : {}) }}
    {...layoutDataAttributes(options)}>{children}</Element>;
}

/** Shared placeholder for root and nested template Content projections. */
export function TemplateContentSlot() {
  return <div className="template-content-slot" role="note" aria-label="Content slot"><BlockRenderer blocks={contentSlotExample} variant="studio" /></div>;
}

/** Find the projected body beneath a Content slot, even when a template wrapper surrounds it. */
export function templateContentProjectionBlocks(blocks: ContentBlock[]): ContentBlock[] | null {
  for (const block of blocks) {
    if (block.type === "group" && block.data?.templateElement === "content") return block.children ?? [];
    const projection = templateContentProjectionBlocks(childContentBlocks(block));
    if (projection) return projection;
  }
  return null;
}
