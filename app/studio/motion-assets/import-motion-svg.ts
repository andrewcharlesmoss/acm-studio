import { motionPreset, readMotionAsset } from "./motion-asset.ts";

const svgNamespace = "http://www.w3.org/2000/svg";
const svgHelp = "Choose an SVG with a viewBox and one untransformed path.";

export function importMotionSvg(source: string, name: string) {
  // Extract numbers and path commands only. The imported XML never enters the page or renderer.
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = document.documentElement;
  const path = svg.firstElementChild;
  if (document.doctype || svg.namespaceURI !== svgNamespace || svg.localName !== "svg"
    || svg.children.length !== 1 || !path || path.namespaceURI !== svgNamespace
    || path.localName !== "path" || path.children.length || path.hasAttribute("transform")
    || svg.hasAttribute("transform") || /transform/i.test(path.getAttribute("style") ?? "")
    || /transform/i.test(svg.getAttribute("style") ?? "")) {
    throw new Error(svgHelp);
  }
  const box = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (box?.length !== 4) throw new Error(svgHelp);
  const preset = motionPreset("wave");
  const colour = path.getAttribute("stroke");
  const thickness = Number(path.getAttribute("stroke-width"));
  return readMotionAsset({
    ...preset, name, path: path.getAttribute("d"), viewBox: box,
    colour: colour && /^#[a-f0-9]{6}$/i.test(colour) ? colour : preset.colour,
    thickness: Number.isInteger(thickness) && thickness >= 1 && thickness <= 64 ? thickness : preset.thickness,
  });
}
