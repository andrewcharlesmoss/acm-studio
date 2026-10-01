import type { ParagraphStyle } from "./model";
import { paragraphBackgroundGradientCss } from "./paragraph-styles";

type DividerAppearance = "default" | "wide" | "dots";

/** Applies Gutenberg-style background colour and gradients to the separator rule. */
export function dividerRuleStyle(style: ParagraphStyle | undefined, appearance: DividerAppearance = "default"): Record<string, string> {
  const css: Record<string, string> = {};
  const colour = style?.backgroundColor ?? style?.textColor;
  if (colour) {
    css.color = colour;
    css.borderTopColor = colour;
  }

  if (style?.backgroundGradient) {
    const gradient = paragraphBackgroundGradientCss(style.backgroundGradient);
    if (gradient) {
      css.backgroundImage = gradient;
      css.border = "0";
      css.height = appearance === "wide" ? "3px" : appearance === "dots" ? "6px" : "1px";
      if (appearance === "dots") {
        css.maskImage = "radial-gradient(circle, #000 2px, transparent 2.5px)";
        css.maskPosition = "left center";
        css.maskRepeat = "repeat-x";
        css.maskSize = "12px 6px";
      }
    }
  }

  return css;
}
