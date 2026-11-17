import { createElement, useId } from "react";
import { socialBrandAsset } from "./social-brand.js";
import { statusColourRole, statusForeground } from "./status-colours.js";
import { mediaColourRole } from "./media-colours.js";
import { illustrationArtwork } from "./illustration-colours.js";
import { securityArtwork } from "./security-colours.js";
import { featureArtwork } from "./feature-colours.js";
import { annotationArtwork } from "./annotation-colours.js";
import { iconGeometry } from "../dist/index.js";
import { filledIconArtwork } from "./filled.js";

/** Geometry comes only from the validated, generated registry. */
export function AcmIcon({ name, scale = "Regular-M", size = 24, className, label, variant = "default", appearance = "outline", statusColour, mediaColour, annotationColours, featureColour, securityColours, illustrationColours }) {
  const gradientId = useId();
  const glyph = iconGeometry[name]?.[scale];
  if (!glyph) throw new Error("Unknown ACM icon or scale");
  const accessibleLabel = label?.trim();
  if (appearance !== "outline" && appearance !== "filled") throw new Error("Unknown icon appearance");
  if (appearance === "filled") {
    if (variant !== "default") throw new Error("Filled artwork does not support colour variants");
    const { paths, faces, cutouts, solidCutouts, solidStrokedCutouts, retainedSolids, strokes, strokeWidth } = filledIconArtwork(name, scale);
    const maskId = `${gradientId}-cutouts`;
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true },
      cutouts.length ? createElement("defs", null, createElement("mask", { id: maskId, maskUnits: "userSpaceOnUse" },
        createElement("rect", { width: 24, height: 24, fill: "white" }),
        cutouts.map(index => createElement("path", { d: paths[index].d, fill: solidCutouts.includes(index) || solidStrokedCutouts.includes(index) ? "black" : "none", stroke: solidCutouts.includes(index) ? "none" : "black", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", key: index })))) : null,
      createElement("g", { fill: "currentColor", mask: cutouts.length ? `url(#${maskId})` : undefined }, faces.map(index => createElement("path", { d: paths[index].d, key: index }))),
      createElement("g", { fill: "currentColor" }, retainedSolids.map(index => createElement("path", { d: paths[index].d, key: index }))),
      createElement("g", { stroke: "currentColor", strokeWidth }, strokes.map(index => createElement("path", { d: paths[index].d, key: index }))));
  }
  if (variant === "illustration") {
    const paths = illustrationArtwork(name, scale, illustrationColours);
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true }, paths.map((path, index) => createElement("path", { ...path, key: index })));
  }
  if (variant === "security") {
    const paths = securityArtwork(name, scale, securityColours);
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true }, paths.map((path, index) => createElement("path", { ...path, key: index })));
  }
  if (variant === "feature") {
    const paths = featureArtwork(name, scale, featureColour);
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true }, paths.map((path, index) => createElement("path", { ...path, key: index })));
  }
  if (variant === "annotation") {
    const paths = annotationArtwork(name, scale, annotationColours);
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true }, paths.map((path, index) => createElement("path", { ...path, key: index })));
  }
  if (variant === "brand") {
    const asset = socialBrandAsset(name, scale);
    const paint = value => value === "gradient" ? `url(#${gradientId})` : value;
    return createElement("svg", { viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", role: accessibleLabel ? "img" : undefined, "aria-label": accessibleLabel || undefined, "aria-hidden": accessibleLabel ? undefined : true },
      asset.gradient ? createElement("defs", null, createElement("linearGradient", { id: gradientId, x1: asset.gradient.x1, y1: asset.gradient.y1, x2: asset.gradient.x2, y2: asset.gradient.y2 }, asset.gradient.stops.map(([offset, stopColor]) => createElement("stop", { offset, stopColor, key: offset })))) : null,
      asset.background ? createElement("rect", { x: 1, y: 1, width: 22, height: 22, rx: asset.background.rx, fill: paint(asset.background.fill) }) : null,
      asset.paths.map((path, index) => createElement("path", { ...path, fill: paint(path.fill), stroke: paint(path.stroke), key: index })));
  }
  if (variant !== "default" && variant !== "status" && variant !== "media") throw new Error("Unknown icon variant");
  const statusRole = variant === "status" ? statusColourRole(name) : undefined;
  if (variant === "status" && !statusRole) throw new Error("No status colour for this icon");
  const mediaRole = variant === "media" ? mediaColourRole(name) : undefined;
  if (variant === "media" && !mediaRole) throw new Error("No media colour for this icon");
  const foreground = statusRole ? statusForeground(statusColour) : undefined;
  if (mediaRole && (typeof mediaColour !== "string" || !/^#[0-9a-f]{6}$/i.test(mediaColour))) throw new Error("Invalid media colour");
  const iconColour = mediaRole ? mediaColour : foreground;
  return createElement("svg", {
    viewBox: "0 0 24 24", width: size, height: size, className,
    fill: "none", stroke: iconColour ?? "currentColor", strokeWidth: glyph.strokeWidth,
    strokeLinecap: "round", strokeLinejoin: "round", focusable: "false",
    role: accessibleLabel ? "img" : undefined,
    "aria-label": accessibleLabel || undefined,
    "aria-hidden": accessibleLabel ? undefined : true,
  }, glyph.paths.map((path, index) => createElement("path", { ...path, ...(statusRole && index === 0 ? { fill: statusColour } : statusRole && path.fill === "currentColor" ? { fill: foreground } : mediaRole && path.fill === "currentColor" ? { fill: mediaColour } : {}), key: index })));
}
