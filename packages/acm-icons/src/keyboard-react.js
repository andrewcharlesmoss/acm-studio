import { createElement } from "react";
import { keyboardAsset } from "./keyboard.js";

export function AcmKeycap({ name, mode = "keycap", scale = "Regular-M", height = 64, className, label, colour, borderColour, fillColour }) {
  const asset = keyboardAsset(name, { mode, scale, colour, borderColour, fillColour });
  const accessibleLabel = label?.trim();
  return createElement("svg", {
    viewBox: `0 0 ${asset.width} ${asset.height}`, width: height * asset.width / asset.height, height, className,
    fill: "none", stroke: asset.colour, strokeLinecap: "round", strokeLinejoin: "round", focusable: "false",
    role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true,
  }, asset.frame ? createElement("path", { d: asset.frame, strokeWidth: 1.5, stroke: asset.borderColour, fill: asset.fillColour }) : null,
  createElement("g", { transform: asset.transform, strokeWidth: asset.glyph.strokeWidth }, asset.glyph.paths.map((path, index) => createElement("path", { ...path, ...(path.fill ? { fill: asset.colour } : {}), key: index }))),
  asset.captionPath ? createElement("path", { d: asset.captionPath, fill: asset.colour, stroke: "none" }) : null);
}
