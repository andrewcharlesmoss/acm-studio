import type { ContentBlock } from "./model";
import { paragraphStyleToCss } from "./paragraph-styles";

type ImageBlock = Extract<ContentBlock, { type: "image" }>;
type ImagePresentation = Pick<ImageBlock, "aspectRatio" | "displayWidth" | "displayHeight" | "focalX" | "focalY"> & { scale?: "cover" | "contain" | "fill" } & Partial<Pick<ImageBlock, "visualStyle" | "imageStyle">>;

const ratios: Record<NonNullable<ImageBlock["aspectRatio"]>, string | undefined> = {
  original: undefined,
  square: "1 / 1",
  portrait: "3 / 4",
  landscape: "4 / 3",
  wide: "16 / 9",
};

export function imageDisplayStyle(block: ImagePresentation, options: { includeFrame?: boolean } = {}): Record<string, string> {
  const style: Record<string, string> = {};
  if (block.displayWidth) style.width = `${block.displayWidth}px`;
  if (block.displayHeight) style.height = `${block.displayHeight}px`;
  const ratio = block.aspectRatio ? ratios[block.aspectRatio] : undefined;
  if (ratio) {
    style.aspectRatio = ratio;
  }
  if (ratio || block.displayHeight) {
    style.objectFit = block.scale ?? "cover";
    style.objectPosition = `${block.focalX ?? 50}% ${block.focalY ?? 50}%`;
  }
  if (options.includeFrame !== false) {
    const frame = paragraphStyleToCss(block.visualStyle);
    for (const key of ["borderStyle", "borderWidth", "borderColor", "borderRadius", "boxShadow"]) {
      if (frame[key]) style[key] = frame[key];
    }
  }
  if (block.imageStyle === "rounded" && !style.borderRadius) style.borderRadius = "9999px";
  return style;
}
