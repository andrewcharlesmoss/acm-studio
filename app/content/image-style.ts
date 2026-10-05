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

const imageFrameProperties = ["borderStyle", "borderWidth", "borderColor", "borderRadius", "boxShadow"];

export function imageWrapperStyle(block: Pick<ImageBlock, "visualStyle">): Record<string, string> {
  const style = paragraphStyleToCss(block.visualStyle);
  // The frame belongs to the image, while spacing and Additional CSS belong
  // to its wrapper. Both renderers must use the same split.
  for (const property of imageFrameProperties) delete style[property];
  return style;
}

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
    for (const key of imageFrameProperties) {
      if (frame[key]) style[key] = frame[key];
    }
  }
  if (block.imageStyle === "rounded" && !style.borderRadius) style.borderRadius = "9999px";
  return style;
}
