import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { codeFramePresentation } from "./code-presentation";
import { CodePresentationContext } from "./code-presentation-context";
import type { ContentBlock } from "../../content/model";
import { paragraphStyleAnchor, paragraphStyleToCss, visualStyleClassName, buttonWrapperCss, headingElementOwnStyle } from "../../content/paragraph-styles";
import { imageWrapperStyle } from "../../content/image-style";
import { tablePresentation } from "../../content/table-presentation";

/** One visual wrapper for editable fields, previews, and generated content. */
export function BlockVisualFrame({ block, mediaUrls = {}, children }: {
  block: ContentBlock;
  mediaUrls?: Record<string, string>;
  children: ReactNode;
}) {
  if (!block.visualStyle) return children;
  const style = block.visualStyle;
  const backgroundImageUrl = ["quote", "group", "heading", "code", "list", "document-title"].includes(block.type) && style.backgroundImageMediaId ? mediaUrls[style.backgroundImageMediaId] : undefined;
  const css = block.type === "table" ? tablePresentation(style).wrapper : block.type === "image" ? imageWrapperStyle(block) : block.type === "button" ? buttonWrapperCss(style) : paragraphStyleToCss(style, backgroundImageUrl);
  if (block.type === "heading") Object.assign(css, headingElementOwnStyle(style));
  if (block.type === "buttons") delete css.textDecoration;
  if (block.type === "social-icons" || block.type === "divider") {
    for (const property of ["backgroundColor", "backgroundImage", "--studio-rs-tablet-background-color", "--studio-rs-mobile-background-color", "--studio-rs-tablet-background-image", "--studio-rs-mobile-background-image"]) delete css[property];
  }
  if (block.type === "cover-image" && style.borderRadius) css.overflow = "hidden";
  const coverFrameClass = block.type === "cover-image"
    ? ` cover-image-visual-style-frame${style.borderRadius || style.borderStyle !== undefined ? " has-cover-image-frame-override" : ""}`
    : "";
  if (block.type === "quote" && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ visualFrame?: { id: string | undefined; className: string; style: CSSProperties } }>, {
      visualFrame: {
        id: paragraphStyleAnchor(style),
        className: `${visualStyleClassName(style)}${coverFrameClass}`,
        style: css as CSSProperties,
      },
    });
  }
  if (block.type === "code") {
    const presentation = codeFramePresentation(css);
    return <div id={paragraphStyleAnchor(style)} className={`${visualStyleClassName(style)} code-visual-style-frame`} data-block-align={block.blockAlign} style={presentation.frame}><CodePresentationContext.Provider value={presentation.surface}>{children}</CodePresentationContext.Provider></div>;
  }
  return <div id={paragraphStyleAnchor(style)} className={`${visualStyleClassName(style)}${coverFrameClass}`} data-block-align={"blockAlign" in block ? block.blockAlign : undefined} style={css}>{children}</div>;
}
