import type { ReactNode } from "react";
import type { GroupLayoutOptions, ParagraphStyle } from "../content/model";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import { paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../content/paragraph-styles";

/** Content uses the same layout in root and nested editor projections and previews. */
export function TemplateContentLayout({ layout, visualStyle, align, mediaUrls = {}, editorFocusable = false, children }: {
  layout: GroupLayoutOptions;
  visualStyle?: ParagraphStyle;
  align?: "left" | "centre" | "right";
  mediaUrls?: Record<string, string>;
  editorFocusable?: boolean;
  children: ReactNode;
}) {
  const options = { ...layout, layout: "flow" as const, inheritLayout: layout.inheritLayout ?? true };
  const className = paragraphStyleClassName(visualStyle);
  return <div className={`template-content-layout template-group layout-flow${hasLayoutOptions(options) ? " has-layout-options" : ""}${className ? ` ${className}` : ""}`}
    role={editorFocusable ? "group" : undefined} aria-label={editorFocusable ? "Content layout" : undefined} tabIndex={editorFocusable ? 0 : undefined}
    id={paragraphStyleAnchor(visualStyle)}
    style={{ ...layoutStyleProperties(options), ...paragraphStyleToCss(visualStyle, visualStyle?.backgroundImageMediaId ? mediaUrls[visualStyle.backgroundImageMediaId] : undefined), ...(align ? { textAlign: align === "centre" ? "center" : align } : {}) }}
    {...layoutDataAttributes(options)}>{children}</div>;
}

/** Shared placeholder for root and nested template Content projections. */
export function TemplateContentSlot() {
  return <div className="template-content-slot" role="note" aria-label="Content slot"><strong>Content</strong><span>Supplied by each document</span></div>;
}
