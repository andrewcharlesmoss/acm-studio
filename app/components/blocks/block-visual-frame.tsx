import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { codeFramePresentation } from "./code-presentation";
import { CodePresentationContext } from "./code-presentation-context";
import type { ContentBlock } from "../../content/model";
import { paragraphStyleAnchor, paragraphStyleToCss, visualStyleClassName, buttonWrapperCss, headingElementOwnStyle } from "../../content/paragraph-styles";
import { imageWrapperStyle } from "../../content/image-style";
import { tablePresentation } from "../../content/table-presentation";
import { blockLayoutItemStyle, flexItemSizingStyle, groupChildFlexItemStyle } from "../../content/layout";
import { gridItemSizingStyle, groupGridItemStyle, groupGridItemClassName } from "../../content/grid-child-sizing";

/** One visual wrapper for editable fields, previews, and generated content. */
export function BlockVisualFrame({ block, mediaUrls = {}, layoutParent, children }: {
  block: ContentBlock;
  mediaUrls?: Record<string, string>;
  layoutParent?: Extract<ContentBlock, { type: "group" }>;
  children: ReactNode;
}) {
  const layoutItemStyle = blockLayoutItemStyle(block);
  const gridClass = layoutParent ? groupGridItemClassName(layoutParent, layoutItemStyle) : "";
  if (!block.visualStyle && !layoutItemStyle?.flexItemSizing && !layoutItemStyle?.gridItemSizing) return children;
  const style = block.visualStyle ?? {};
  const backgroundImageUrl = ["quote", "pullquote", "group", "heading", "code", "list", "buttons", "title"].includes(block.type) && style.backgroundImageMediaId ? mediaUrls[style.backgroundImageMediaId] : undefined;
  // Legacy sizing lived in visualStyle and was applied by every renderer. Keep
  // that published appearance stable; newly authored child sizing uses the
  // parent-scoped fields below.
  const legacyItemLayoutStyle = {
    ...(style.flexItemSizingActive === undefined ? flexItemSizingStyle(style.flexItemSizing) : {}),
    ...gridItemSizingStyle(style.gridItemSizing),
  };
  const itemLayoutStyle = { ...legacyItemLayoutStyle, ...(layoutParent ? { ...groupChildFlexItemStyle(layoutParent, layoutItemStyle), ...groupGridItemStyle(layoutParent, layoutItemStyle) } : {}) };
  const css = { ...(block.type === "table" ? tablePresentation(style).wrapper : block.type === "image" || block.type === "cover" ? imageWrapperStyle(block) : block.type === "button" ? buttonWrapperCss(style) : paragraphStyleToCss(style, backgroundImageUrl)), ...itemLayoutStyle } as CSSProperties & Record<string, string | number | undefined>;
  if (block.type === "cover") {
    // Cover's background colour and gradient belong to its image overlay, not
    // the outer frame. Padding and child spacing belong to the content layer.
    delete css.backgroundColor;
    delete css.backgroundImage;
    delete css.padding;
    delete css["--studio-quote-block-gap"];
    if (style.padding) css["--studio-cover-padding"] = style.padding;
    if (style.blockGap !== undefined) css["--studio-cover-block-gap"] = style.blockGap;
  }
  if (block.type === "heading") Object.assign(css, headingElementOwnStyle(style));
  if (block.type === "buttons") delete css.textDecoration;
  if (block.type === "social-icons" || block.type === "separator") {
    for (const property of ["backgroundColor", "backgroundImage", "--studio-rs-tablet-background-color", "--studio-rs-mobile-background-color", "--studio-rs-tablet-background-image", "--studio-rs-mobile-background-image"]) delete css[property];
  }
  if (block.type === "cover-image" && style.borderRadius) css.overflow = "hidden";
  const coverFrameClass = block.type === "cover-image"
    ? ` cover-image-visual-style-frame${style.borderRadius || style.borderStyle !== undefined ? " has-cover-image-frame-override" : ""}`
    : block.type === "cover" ? " cover-visual-style-frame" : "";
  if ((block.type === "quote" || block.type === "pullquote") && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ visualFrame?: { id: string | undefined; className: string; style: CSSProperties } }>, {
      visualFrame: {
        id: paragraphStyleAnchor(style),
        className: `${visualStyleClassName(style)}${coverFrameClass} ${gridClass}`,
        style: css as CSSProperties,
      },
    });
  }
  if (block.type === "code") {
    const presentation = codeFramePresentation(css as Record<string, string>);
    return <div id={paragraphStyleAnchor(style)} className={`${visualStyleClassName(style)} code-visual-style-frame ${gridClass}`} data-block-align={block.blockAlign} style={presentation.frame}><CodePresentationContext.Provider value={presentation.surface}>{children}</CodePresentationContext.Provider></div>;
  }
  return <div id={paragraphStyleAnchor(style)} className={`${visualStyleClassName(style)}${coverFrameClass} ${gridClass}`} data-block-align={"blockAlign" in block ? block.blockAlign : undefined} style={css}>{children}</div>;
}
