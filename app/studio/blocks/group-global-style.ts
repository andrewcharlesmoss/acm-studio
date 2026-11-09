import type { ParagraphStyle } from "../../content/model";
import type { WebsiteDesign } from "../site-editor/website-design";

/** The global settings owner stores element surfaces separately from authored blocks. */
export function groupGlobalInspectorStyle(design: WebsiteDesign | undefined): ParagraphStyle | undefined {
  const style = design?.styles.blockStyles?.group;
  if (!style) return undefined;
  return {
    ...style,
    ...(style.headingBackground ? { headingBackgroundColor: style.headingBackground.background, headingBackgroundGradient: style.headingBackground.gradient } : {}),
    ...(style.headingBackgrounds ? { headingBackgrounds: Object.fromEntries(Object.entries(style.headingBackgrounds).map(([level, surface]) => [level, {
      ...(surface.background !== undefined ? { backgroundColor: surface.background } : {}),
      ...(surface.gradient !== undefined ? { backgroundGradient: surface.gradient } : {}),
    }])) } : {}),
  } as ParagraphStyle;
}
