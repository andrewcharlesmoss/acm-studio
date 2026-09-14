"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent, type Ref } from "react";
import { addMediaFiles, getMediaAsset, listMediaLibrary, replaceMediaAssetContent, type MediaAsset } from "./media-store";
import { studioWriteOwnership, ownershipMessage, type OwnershipState } from "./write-ownership";
import {
  cloneDesign, createDesign, DESIGN_MAX_DIMENSION, makeId, nextPageName,
  DESIGN_IMAGE_TYPES, migrateDesignProject, sanitiseFilename,
  type DesignArrowObject, type DesignAsset, type DesignObject, type DesignPage, type DesignProject, type DesignShapeObject, type DesignTextObject,
} from "./design-model";
import { loadDesigns, saveDesigns } from "./design-store";
import { StudioIcon } from "./studio-icons";
import type { StudioIconName } from "./studio-icons";

type Tool = "select" | "image" | "arrow" | "rectangle" | "ellipse" | "text" | "step" | "highlight" | "redaction";
type InteractionMode = "move" | "resize" | "rotate" | "arrow-endpoint";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Interaction = { mode: InteractionMode; id: string; ids?: string[]; originals?: DesignObject[]; startX: number; startY: number; original: DesignObject; base: DesignProject; handle?: ResizeHandle; keepRatio?: boolean; centred?: boolean; endpoint?: "start" | "end"; startAngle?: number };
type Guide = { axis: "x" | "y"; position: number };
type RecentStyles = {
  arrow: Pick<DesignArrowObject, "stroke" | "strokeWidth" | "arrowhead">;
  shape: Pick<DesignShapeObject, "fill" | "stroke" | "strokeWidth" | "radius">;
  text: Pick<DesignTextObject, "colour" | "fontFamily" | "fontSize" | "fontWeight" | "align">;
  step: Pick<DesignTextObject, "colour" | "fill" | "fontFamily" | "fontSize" | "fontWeight" | "align">;
  highlight: Pick<DesignShapeObject, "fill" | "stroke" | "strokeWidth"> & { opacity: number };
};

const defaultRecentStyles: RecentStyles = {
  arrow: { stroke: "#cc1818", strokeWidth: 6, arrowhead: true },
  shape: { fill: "#ffffff", stroke: "#cc1818", strokeWidth: 5, radius: 8 },
  text: { colour: "#17191c", fontFamily: "Inter, Arial, sans-serif", fontSize: 34, fontWeight: 600, align: "left" },
  step: { colour: "#ffffff", fill: "#cc1818", fontFamily: "Inter, Arial, sans-serif", fontSize: 32, fontWeight: 700, align: "center" },
  highlight: { fill: "#ffd93d", stroke: "none", strokeWidth: 0, opacity: .55 },
};

const toolLabels: Record<Tool, string> = { select: "Select", image: "Image", arrow: "Arrow", rectangle: "Rectangle", ellipse: "Ellipse", text: "Text", step: "Numbered step", highlight: "Highlight", redaction: "Redaction" };
const annotationTools: Tool[] = ["arrow", "rectangle", "ellipse", "text", "step", "highlight", "redaction"];
const toolIcons: Record<Tool, StudioIconName | "seen"> = { select: "drag-handle", image: "image", arrow: "arrow-right", rectangle: "block", ellipse: "seen", text: "format-bold", step: "list", highlight: "button", redaction: "block" };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  files.forEach(({ name, data }) => {
    const filename = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + filename.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0, true); localView.setUint16(8, 0, true); localView.setUint32(14, crc, true); localView.setUint32(18, data.length, true); localView.setUint32(22, data.length, true); localView.setUint16(26, filename.length, true); local.set(filename, 30);
    parts.push(local, data);
    const entry = new Uint8Array(46 + filename.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true); entryView.setUint16(4, 20, true); entryView.setUint16(6, 20, true); entryView.setUint16(8, 0, true); entryView.setUint16(10, 0, true); entryView.setUint32(16, crc, true); entryView.setUint32(20, data.length, true); entryView.setUint32(24, data.length, true); entryView.setUint16(28, filename.length, true); entryView.setUint32(42, offset, true); entry.set(filename, 46);
    central.push(entry); offset += local.length + data.length;
  });
  const centralSize = central.reduce((total, item) => total + item.length, 0);
  const end = new Uint8Array(22); const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  const archive = new Uint8Array(parts.concat(central, end).reduce((total, item) => total + item.length, 0));
  let cursor = 0;
  for (const part of parts.concat(central, end)) { archive.set(part, cursor); cursor += part.length; }
  return new Blob([archive.buffer], { type: "application/zip" });
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected file is not a readable image."));
    image.src = dataUrl;
  });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character] ?? character));
}

function objectSvg(object: DesignObject, assets: DesignAsset[]) {
  const transform = `translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`;
  const opacity = object.opacity;
  if (object.type === "image") {
    const asset = assets.find((item) => item.id === object.assetId);
    if (!asset) return "";
    const crop = object.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    const clipId = `crop-${object.id}`;
    return `<g transform="${transform}" opacity="${opacity}"><defs><clipPath id="${clipId}"><rect width="${object.width}" height="${object.height}" /></clipPath></defs><image href="${escapeXml(asset.dataUrl)}" x="${-crop.x / crop.width * object.width}" y="${-crop.y / crop.height * object.height}" width="${object.width / crop.width}" height="${object.height / crop.height}" preserveAspectRatio="none" clip-path="url(#${clipId})" /></g>`;
  }
  if (object.type === "arrow") {
    const marker = object.arrowhead ? `<defs><marker id="arrowhead-${object.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${object.stroke}" /></marker></defs>` : "";
    const start = object.start ?? { x: 0, y: object.height }; const end = object.end ?? { x: object.width, y: 0 };
    return `<g transform="${transform}" opacity="${opacity}">${marker}<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${object.stroke}" stroke-width="${object.strokeWidth}" stroke-linecap="round" ${object.arrowhead ? `marker-end="url(#arrowhead-${object.id})"` : ""} /></g>`;
  }
  if (object.type === "text" || object.type === "step") {
    const anchor = object.align === "center" ? "middle" : object.align === "right" ? "end" : "start";
    const x = object.align === "center" ? object.width / 2 : object.align === "right" ? object.width : 0;
    const stepBackground = object.type === "step" ? `<circle cx="${object.width / 2}" cy="${object.height / 2}" r="${Math.min(object.width, object.height) / 2}" fill="${object.fill ?? "#cc1818"}" />` : "";
    return `<g transform="${transform}" opacity="${opacity}">${stepBackground}<text x="${x}" y="${object.fontSize}" fill="${object.colour}" font-family="${escapeXml(object.fontFamily)}" font-size="${object.fontSize}" font-weight="${object.fontWeight}" text-anchor="${anchor}">${escapeXml(object.text)}</text></g>`;
  }
  const shape = object as DesignShapeObject;
  const fill = shape.type === "redaction" ? "#000000" : shape.fill;
  return `<g transform="${transform}" opacity="${opacity}">${shape.type === "ellipse" ? `<ellipse cx="${shape.width / 2}" cy="${shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />` : `<rect width="${shape.width}" height="${shape.height}" rx="${shape.radius ?? 0}" fill="${fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`}</g>`;
}

function pageSvgMarkup(page: DesignPage, assets: DesignAsset[]) {
  const background = page.background.kind === "transparent" ? "" : `<rect width="${page.width}" height="${page.height}" fill="${page.background.colour}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">${background}${page.objects.map((object) => objectSvg(object, assets)).join("")}</svg>`;
}

async function renderPage(page: DesignPage, assets: DesignAsset[], format: "png" | "jpeg" | "webp", scale = 1, quality = .92) {
  const svg = pageSvgMarkup(page, assets);
  const canvas = document.createElement("canvas");
  canvas.width = page.width * scale;
  canvas.height = page.height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not create an export canvas.");
  if (format !== "png" || page.background.kind !== "transparent") {
    context.fillStyle = page.background.colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const raster = new Image();
  const imageReady = new Promise<void>((resolve, reject) => { raster.onload = () => resolve(); raster.onerror = () => reject(new Error("The page could not be rendered.")); });
  raster.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (document.fonts?.ready) await Promise.all([document.fonts.ready, imageReady]);
  else await imageReady;
  context.scale(scale, scale);
  context.drawImage(raster, 0, 0);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The page could not be exported.")), `image/${format}`, format === "png" ? undefined : quality));
}

function makeObject(tool: Exclude<Tool, "select" | "image">, x: number, y: number, page: DesignPage, objectIndex: number, styles: RecentStyles = defaultRecentStyles): DesignObject {
  const base = { id: makeId("object"), x, y, width: tool === "arrow" ? 220 : tool === "text" || tool === "step" ? 240 : 180, height: tool === "text" || tool === "step" ? 54 : tool === "arrow" ? 120 : 100, rotation: 0, opacity: 1 };
  if (tool === "arrow") return { ...base, type: "arrow", ...styles.arrow };
  if (tool === "text") return { ...base, type: "text", text: "Add text", ...styles.text };
  if (tool === "step") return { ...base, type: "step", text: String(objectIndex + 1), ...styles.step, width: 64, height: 64 };
  if (tool === "highlight") return { ...base, type: "highlight", ...styles.highlight };
  if (tool === "redaction") return { ...base, type: "redaction", fill: "#000000", stroke: "none", strokeWidth: 0 };
  return { ...base, type: tool, ...styles.shape, fill: tool === "ellipse" && styles.shape.fill === "#ffffff" ? "transparent" : styles.shape.fill };
}

function resizeObject(object: DesignObject, handle: ResizeHandle, dx: number, dy: number, page: DesignPage, keepRatio: boolean, centred: boolean) {
  const minimum = 10;
  function axisBounds(start: number, end: number, delta: number, negative: boolean, positive: boolean, limit: number) {
    const originalSize = end - start;
    const centre = (start + end) / 2;
    let requested = originalSize;
    if (negative) requested -= delta;
    if (positive) requested += delta;
    if (centred && (negative || positive)) requested = originalSize + (positive ? 2 * delta : -2 * delta);
    const maximum = centred ? 2 * Math.min(centre, limit - centre) : end - start > 0 ? (negative && !positive ? end : limit - start) : limit;
    const size = Math.max(minimum, Math.min(maximum, requested));
    if (centred && (negative || positive)) return { start: centre - size / 2, end: centre + size / 2, size, maximum };
    if (negative && !positive) return { start: end - size, end, size, maximum };
    if (positive && !negative) return { start, end: start + size, size, maximum };
    return { start, end: start + size, size, maximum };
  }

  const horizontal = axisBounds(object.x, object.x + object.width, dx, handle.includes("w"), handle.includes("e"), page.width);
  const vertical = axisBounds(object.y, object.y + object.height, dy, handle.includes("n"), handle.includes("s"), page.height);
  let width = horizontal.size;
  let height = vertical.size;
  if (keepRatio) {
    const ratio = object.width / object.height;
    const horizontalHandle = handle.includes("w") || handle.includes("e");
    const verticalHandle = handle.includes("n") || handle.includes("s");
    if (horizontalHandle && (!verticalHandle || Math.abs(dx) >= Math.abs(dy))) height = width / ratio;
    else if (verticalHandle) { width = height * ratio; }
    const scale = Math.min(1, horizontal.maximum / width, vertical.maximum / height);
    width *= scale;
    height *= scale;
  }
  const x = centred ? (object.x + object.width / 2) - width / 2 : handle.includes("w") ? object.x + object.width - width : object.x;
  const y = centred ? (object.y + object.height / 2) - height / 2 : handle.includes("n") ? object.y + object.height - height : object.y;
  return { ...object, x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)), width: Math.round(Math.max(minimum, Math.min(page.width, width))), height: Math.round(Math.max(minimum, Math.min(page.height, height))) };
}

function PageSvg({ page, assets, selectedIds = [], selectionBox, guides = [], tool = "select", onCanvasPointerDown, onObjectPointerDown, onResizePointerDown, onRotatePointerDown, onArrowEndpointPointerDown, onResizeKeyDown, onRotateKeyDown, onArrowEndpointKeyDown, svgRef }: {
  page: DesignPage; assets: DesignAsset[]; selectedIds?: string[]; selectionBox?: { x: number; y: number; width: number; height: number } | null; guides?: Guide[];
  tool?: Tool;
  onCanvasPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onObjectPointerDown: (event: PointerEvent<SVGGElement>, object: DesignObject) => void;
  onResizePointerDown: (event: PointerEvent<SVGRectElement>, object: DesignObject, handle: ResizeHandle) => void;
  onRotatePointerDown: (event: PointerEvent<SVGCircleElement>, object: DesignObject) => void;
  onArrowEndpointPointerDown: (event: PointerEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") => void;
  onResizeKeyDown?: (event: ReactKeyboardEvent<SVGRectElement>, object: DesignObject, handle: ResizeHandle) => void;
  onRotateKeyDown?: (event: ReactKeyboardEvent<SVGCircleElement>, object: DesignObject) => void;
  onArrowEndpointKeyDown?: (event: ReactKeyboardEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") => void;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const resizeHandles: Array<{ handle: ResizeHandle; label: string }> = [
    { handle: "nw", label: "Resize selected object from top left" },
    { handle: "n", label: "Resize selected object from top" },
    { handle: "ne", label: "Resize selected object from top right" },
    { handle: "e", label: "Resize selected object from right" },
    { handle: "se", label: "Resize selected object from bottom right" },
    { handle: "s", label: "Resize selected object from bottom" },
    { handle: "sw", label: "Resize selected object from bottom left" },
    { handle: "w", label: "Resize selected object from left" },
  ];
  return <svg ref={svgRef} className={`design-page-svg${tool === "select" ? " is-select-mode" : ""}`} viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label={page.name} onPointerDown={onCanvasPointerDown}>
    <defs><pattern id={`checker-${page.id}`} width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#f7f6f2" /><rect width="10" height="10" fill="#e9e7df" /><rect x="10" y="10" width="10" height="10" fill="#e9e7df" /></pattern></defs>
    <rect data-canvas-background="true" width={page.width} height={page.height} fill={page.background.kind === "transparent" ? `url(#checker-${page.id})` : page.background.colour} />
    {guides.map((guide) => guide.axis === "x" ? <line key={`guide-x-${guide.position}`} className="design-guide" x1={guide.position} x2={guide.position} y1="0" y2={page.height} /> : <line key={`guide-y-${guide.position}`} className="design-guide" x1="0" x2={page.width} y1={guide.position} y2={guide.position} />)}
    {page.objects.map((object) => <g key={object.id} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`} opacity={object.opacity} className={`design-object${selectedIds.includes(object.id) ? " is-selected" : ""}${object.locked ? " is-locked" : ""}`} onPointerDown={(event) => onObjectPointerDown(event, object)}>
      <rect width={object.width} height={object.height} fill="transparent" pointerEvents="all" onPointerDown={(event) => onObjectPointerDown(event as unknown as PointerEvent<SVGGElement>, object)} />
      {object.type === "image" ? (() => { const asset = assets.find((item) => item.id === object.assetId); if (!asset) return null; const crop = object.crop ?? { x: 0, y: 0, width: 1, height: 1 }; const clipId = `crop-${object.id}`; return <><defs><clipPath id={clipId}><rect width={object.width} height={object.height} /></clipPath></defs><image href={asset.dataUrl} x={-crop.x / crop.width * object.width} y={-crop.y / crop.height * object.height} width={object.width / crop.width} height={object.height / crop.height} preserveAspectRatio="none" clipPath={`url(#${clipId})`} /></>; })() : null}
      {object.type === "arrow" ? <><line x1={object.start?.x ?? 0} y1={object.start?.y ?? object.height} x2={object.end?.x ?? object.width} y2={object.end?.y ?? 0} stroke={object.stroke} strokeWidth={object.strokeWidth} strokeLinecap="round" markerEnd={object.arrowhead ? `url(#arrow-${object.id})` : undefined} /><defs><marker id={`arrow-${object.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={object.stroke} /></marker></defs></> : null}
      {(object.type === "rectangle" || object.type === "highlight" || object.type === "redaction") ? <rect width={object.width} height={object.height} rx={object.radius ?? 0} fill={object.type === "redaction" ? "#000000" : object.fill} stroke={object.stroke} strokeWidth={object.strokeWidth} /> : null}
      {object.type === "ellipse" ? <ellipse cx={object.width / 2} cy={object.height / 2} rx={object.width / 2} ry={object.height / 2} fill={object.fill} stroke={object.stroke} strokeWidth={object.strokeWidth} /> : null}
      {(object.type === "text" || object.type === "step") ? <>{object.type === "step" ? <circle cx={object.width / 2} cy={object.height / 2} r={Math.min(object.width, object.height) / 2} fill={object.fill ?? "#cc1818"} /> : null}<text x={object.align === "center" ? object.width / 2 : object.align === "right" ? object.width : 0} y={object.fontSize} fill={object.colour} fontFamily={object.fontFamily} fontSize={object.fontSize} fontWeight={object.fontWeight} textAnchor={object.align === "center" ? "middle" : object.align === "right" ? "end" : "start"}>{object.text}</text></> : null}
      {selectedIds.includes(object.id) ? <><rect className="design-selection-box" width={object.width} height={object.height} />{resizeHandles.map(({ handle, label }) => <rect key={handle} role="button" tabIndex={0} aria-label={label} className={`design-resize-handle handle-${handle}`} x={handle.includes("e") ? object.width - 5 : handle.includes("w") ? -5 : object.width / 2 - 5} y={handle.includes("s") ? object.height - 5 : handle.includes("n") ? -5 : object.height / 2 - 5} width={10} height={10} onPointerDown={(event) => onResizePointerDown(event, object, handle)} onKeyDown={(event) => onResizeKeyDown?.(event, object, handle)} />)}<circle role="button" tabIndex={0} aria-label="Rotate selected object" className="design-rotate-handle" cx={object.width / 2} cy={-22} r={6} onPointerDown={(event) => onRotatePointerDown(event, object)} onKeyDown={(event) => onRotateKeyDown?.(event, object)} /></> : null}
      {selectedIds.includes(object.id) && object.type === "arrow" ? <><circle role="button" tabIndex={0} aria-label="Move arrow start point" className="design-endpoint-handle" cx={object.start?.x ?? 0} cy={object.start?.y ?? object.height} r="7" onPointerDown={(event) => onArrowEndpointPointerDown(event, object, "start")} onKeyDown={(event) => onArrowEndpointKeyDown?.(event, object, "start")} /><circle role="button" tabIndex={0} aria-label="Move arrow end point" className="design-endpoint-handle" cx={object.end?.x ?? object.width} cy={object.end?.y ?? 0} r="7" onPointerDown={(event) => onArrowEndpointPointerDown(event, object, "end")} onKeyDown={(event) => onArrowEndpointKeyDown?.(event, object, "end")} /></> : null}
    </g>)}
    {selectionBox ? <rect className="design-marquee" x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} /> : null}
  </svg>;
}

export function DesignEditor() {
  const [designs, setDesigns] = useState<DesignProject[]>([]);
  const [design, setDesign] = useState<DesignProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ownershipState, setOwnershipState] = useState<OwnershipState>(studioWriteOwnership.getState());
  const [status, setStatus] = useState("Loading designs…");
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [history, setHistory] = useState<DesignProject[]>([]);
  const [future, setFuture] = useState<DesignProject[]>([]);
  const [pageName, setPageName] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [mediaHandoff, setMediaHandoff] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState(1);
  const [exportQuality, setExportQuality] = useState(.92);
  const [zoom, setZoom] = useState(60);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [backgroundTolerance, setBackgroundTolerance] = useState(28);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const pageNameInputRef = useRef<HTMLInputElement>(null);
  const mediaTriggerRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const recentStylesRef = useRef<RecentStyles>(cloneDesign(defaultRecentStyles));

  const writable = ownershipState === "writable";
  const activePage = design?.pages.find((page) => page.id === design.activePageId) ?? design?.pages[0] ?? null;
  const selectedObject = activePage?.objects.find((object) => object.id === selectedId) ?? null;

  function rememberStyle(object: DesignObject) {
    if (object.type === "arrow") recentStylesRef.current.arrow = { stroke: object.stroke, strokeWidth: object.strokeWidth, arrowhead: object.arrowhead };
    else if (object.type === "text") recentStylesRef.current.text = { colour: object.colour, fontFamily: object.fontFamily, fontSize: object.fontSize, fontWeight: object.fontWeight, align: object.align };
    else if (object.type === "step") recentStylesRef.current.step = { colour: object.colour, fill: object.fill ?? "#cc1818", fontFamily: object.fontFamily, fontSize: object.fontSize, fontWeight: object.fontWeight, align: object.align };
    else if (object.type === "highlight") recentStylesRef.current.highlight = { fill: object.fill, stroke: object.stroke, strokeWidth: object.strokeWidth, opacity: object.opacity };
    else if (object.type === "rectangle" || object.type === "ellipse") recentStylesRef.current.shape = { fill: object.fill, stroke: object.stroke, strokeWidth: object.strokeWidth, radius: object.radius };
  }

  function selectObjects(ids: string[]) {
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? null);
  }

  useEffect(() => {
    let mounted = true;
    const unsubscribe = studioWriteOwnership.subscribe(() => setOwnershipState(studioWriteOwnership.getState()));
    try {
      const saved = loadDesigns();
      queueMicrotask(() => { if (mounted) { setDesigns(saved); setDesign(saved[0] ?? createDesign()); setLoaded(true); setStatus(saved.length ? "Saved locally" : "New design ready"); } });
    } catch (loadError) { queueMicrotask(() => { if (mounted) { setError(loadError instanceof Error ? loadError.message : "Saved designs could not be read."); setDesign(createDesign()); setLoaded(true); } }); }
    const release = studioWriteOwnership.acquire((token) => {
      try {
        const latest = loadDesigns();
        if (latest.length) {
          setDesigns(latest);
          setDesign((current) => latest.find((item) => item.id === current?.id) ?? latest[0]);
        } else {
          // An empty persisted snapshot is authoritative after a restore or a
          // newly cleared workspace; never re-enable the old in-memory design.
          setDesigns([]);
          setDesign(createDesign());
          setStatus("New design ready");
        }
        studioWriteOwnership.loaded(token, true);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Saved designs could not be read.");
        studioWriteOwnership.loaded(token, false);
      }
    });
    return () => { mounted = false; unsubscribe(); release(); };
  }, []);

  useEffect(() => {
    if (!showMedia) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setShowMedia(false);
      requestAnimationFrame(() => (previous?.isConnected ? previous : mediaTriggerRef.current)?.focus());
    };
    document.addEventListener("keydown", handleEscape);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".design-media-panel button")?.focus());
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showMedia]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (activePage) setPageName(activePage.name); }, 0);
    return () => window.clearTimeout(timer);
  }, [activePage]);

  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const designId = params.get("designId");
    const pageId = params.get("pageId");
    const mediaId = params.get("mediaId");
    if (mediaId && design) {
      window.history.replaceState({}, "", window.location.pathname);
      void getMediaAsset(mediaId).then((asset) => {
        if (!asset) { setError("The selected Studio image could not be found."); return; }
        return openMediaAsDesign(asset);
      }).catch((openError) => setError(openError instanceof Error ? openError.message : "The Studio image could not be opened."));
      return;
    }
    if (!designs.length) return;
    if (!designId) return;
    const next = designs.find((item) => item.id === designId);
    if (!next) return;
    const page = next.pages.find((item) => item.id === pageId) ?? next.pages.find((item) => item.id === next.activePageId) ?? next.pages[0];
    if (!page) return;
    const opened = page.id === next.activePageId ? next : { ...next, activePageId: page.id };
    setDesign(opened); setPageName(page.name); setHistory([]); setFuture([]); selectObjects([]);
    window.history.replaceState({}, "", window.location.pathname);
  // The callback is declared below the effect; keep this URL handoff effect
  // tied to loading and the available design list to avoid a temporal dead zone.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, loaded]);

  const persist = useCallback(async (next: DesignProject, nextDesigns = designs) => {
    const updated = nextDesigns.some((item) => item.id === next.id) ? nextDesigns.map((item) => item.id === next.id ? next : item) : [...nextDesigns, next];
    setDesigns(updated);
    if (!writable) { setStatus(ownershipMessage(ownershipState) ?? "Read-only"); return; }
    try { await saveDesigns(updated); setStatus("Saved locally just now"); setError(""); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The design could not be saved."); setStatus("Save failed — export an editable backup"); }
  }, [designs, ownershipState, writable]);

  useEffect(() => {
    if (loaded && writable && design && designs.length === 0) void persist(design);
  }, [design, designs.length, loaded, persist, writable]);

  function updateDesign(next: DesignProject, record = true) {
    const normalised = { ...next, updatedAt: new Date().toISOString() };
    if (record && design) { setHistory((items) => [...items.slice(-49), cloneDesign(design)]); setFuture([]); }
    setDesign(normalised);
    void persist(normalised);
  }

  function updatePage(update: (page: DesignPage) => DesignPage, record = true) {
    if (!design || !activePage) return;
    updateDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? update(page) : page) }, record);
  }

  function undo() {
    if (!design || !history.length || !writable) return;
    const previous = history.at(-1)!;
    setHistory((items) => items.slice(0, -1)); setFuture((items) => [cloneDesign(design), ...items]); setDesign(previous); void persist(previous);
    selectObjects([]);
  }

  function redo() {
    if (!design || !future.length || !writable) return;
    const next = future[0];
    setFuture((items) => items.slice(1)); setHistory((items) => [...items.slice(-49), cloneDesign(design)]); setDesign(next); void persist(next);
    selectObjects([]);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement).isContentEditable) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.ctrlKey && event.key.toLowerCase() === "y")) { event.preventDefault(); redo(); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") { event.preventDefault(); copySelected(); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelected(); }
      else if (selectedId && writable && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); const amount = event.shiftKey ? 10 : 1; updateSelected((object) => ({ ...object, x: object.x + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0), y: object.y + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0) })); }
      else if (event.key === "Delete" || event.key === "Backspace") { if (selectedId && writable) { updatePage((page) => ({ ...page, objects: page.objects.filter((object) => object.id !== selectedId) })); selectObjects([]); } }
      else if (event.key === "Escape") { interactionRef.current = null; selectionStartRef.current = null; panRef.current = null; setSelectionBox(null); setGuides([]); selectObjects([]); setShowMedia(false); setTool("select"); }
    }
    window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.code === "Space" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); setSpaceDown(true); } };
    const up = (event: KeyboardEvent) => { if (event.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const getPoint = (event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg || !activePage) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * activePage.width, y: (event.clientY - rect.top) / rect.height * activePage.height };
  };

  function onCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!writable || !activePage) return;
    if (spaceDown && canvasScrollRef.current) {
      panRef.current = { x: event.clientX, y: event.clientY, left: canvasScrollRef.current.scrollLeft, top: canvasScrollRef.current.scrollTop };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === "select") {
      const target = event.target as Element;
      if (event.target !== event.currentTarget && !target.hasAttribute("data-canvas-background")) return;
      const point = getPoint(event);
      selectionStartRef.current = point;
      setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === "image") return;
    const point = getPoint(event);
    const object = makeObject(tool, Math.max(0, point.x - 90), Math.max(0, point.y - 50), activePage, activePage.objects.filter((item) => item.type === "step").length, recentStylesRef.current);
    updatePage((page) => ({ ...page, objects: [...page.objects, object] }));
    selectObjects([object.id]); setTool("select");
  }

  function onObjectPointerDown(event: PointerEvent<SVGGElement>, object: DesignObject) {
    event.stopPropagation();
    if (!activePage) return;
    const groupIds = object.groupId ? activePage.objects.filter((item) => item.groupId === object.groupId).map((item) => item.id) : [object.id];
    if (event.shiftKey) {
      const nextIds = selectedIds.includes(object.id) ? selectedIds.filter((id) => !groupIds.includes(id)) : [...new Set([...selectedIds, ...groupIds])];
      selectObjects(nextIds);
    } else if (!selectedIds.includes(object.id)) selectObjects([object.id]);
    if (!writable || object.locked || event.shiftKey) return;
    const point = getPoint(event);
    const ids = selectedIds.includes(object.id) ? [...new Set([...selectedIds, ...groupIds])] : groupIds;
    if (groupIds.length > 1) selectObjects(ids);
    const originals = activePage.objects.filter((item) => ids.includes(item.id)).map((item) => cloneDesign(item));
    interactionRef.current = { mode: "move", id: object.id, ids, originals, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design!) };
    (event.currentTarget.ownerSVGElement ?? event.currentTarget).setPointerCapture(event.pointerId);
  }

  function snapMove(object: DesignObject, dx: number, dy: number) {
    if (!activePage || !snapEnabled) return { dx, dy, guides: [] as Guide[] };
    const threshold = 12;
    const others = activePage.objects.filter((item) => item.id !== object.id);
    const xTargets = [0, activePage.width / 2, activePage.width, ...others.flatMap((item) => [item.x, item.x + item.width / 2, item.x + item.width])];
    const yTargets = [0, activePage.height / 2, activePage.height, ...others.flatMap((item) => [item.y, item.y + item.height / 2, item.y + item.height])];
    const xEdges = [object.x + dx, object.x + dx + object.width / 2, object.x + dx + object.width];
    const yEdges = [object.y + dy, object.y + dy + object.height / 2, object.y + dy + object.height];
    const nearest = (edges: number[], targets: number[]) => edges.flatMap((edge) => targets.map((target) => ({ distance: Math.abs(target - edge), delta: target - edge, target }))).sort((a, b) => a.distance - b.distance)[0];
    const x = nearest(xEdges, xTargets); const y = nearest(yEdges, yTargets);
    return {
      dx: x && x.distance <= threshold ? dx + x.delta : dx,
      dy: y && y.distance <= threshold ? dy + y.delta : dy,
      guides: [x && x.distance <= threshold ? { axis: "x" as const, position: x.target } : null, y && y.distance <= threshold ? { axis: "y" as const, position: y.target } : null].filter((guide): guide is Guide => Boolean(guide)),
    };
  }

  function onResizeKeyDown(event: ReactKeyboardEvent<SVGRectElement>, object: DesignObject, handle: ResizeHandle) {
    if (!writable || object.locked || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => item.id === object.id ? resizeObject(item, handle, dx, dy, page, item.type === "image" || event.shiftKey, false) : item) }));
  }

  function onRotateKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, object: DesignObject) {
    if (!writable || object.locked || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 15 : 5;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => item.id === object.id ? { ...item, rotation: (item.rotation + (event.key === "ArrowLeft" ? -amount : amount) + 360) % 360 } : item) }));
  }

  function onArrowEndpointKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") {
    if (!writable || object.locked || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => {
      if (item.id !== object.id || item.type !== "arrow") return item;
      const current = item[endpoint] ?? (endpoint === "start" ? { x: 0, y: item.height } : { x: item.width, y: 0 });
      return { ...item, [endpoint]: { x: Math.max(0, Math.min(item.width, current.x + dx)), y: Math.max(0, Math.min(item.height, current.y + dy)) } };
    }) }));
  }

  function onResizePointerDown(event: PointerEvent<SVGRectElement>, object: DesignObject, handle: ResizeHandle) {
    event.stopPropagation();
    if (!writable || object.locked || !design) return;
    const point = getPoint(event);
    interactionRef.current = { mode: "resize", id: object.id, handle, keepRatio: object.type === "image" || event.shiftKey, centred: event.altKey, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design) };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onRotatePointerDown(event: PointerEvent<SVGCircleElement>, object: DesignObject) {
    event.stopPropagation();
    if (!writable || object.locked || !design) return;
    const point = getPoint(event); const centreX = object.x + object.width / 2; const centreY = object.y + object.height / 2;
    interactionRef.current = { mode: "rotate", id: object.id, startX: point.x, startY: point.y, startAngle: Math.atan2(point.y - centreY, point.x - centreX), original: cloneDesign(object), base: cloneDesign(design) };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onArrowEndpointPointerDown(event: PointerEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") {
    event.stopPropagation();
    if (!writable || object.locked || !design) return;
    const point = getPoint(event);
    interactionRef.current = { mode: "arrow-endpoint", id: object.id, endpoint, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design) };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLElement>) {
    if (panRef.current && canvasScrollRef.current) {
      canvasScrollRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
      canvasScrollRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
      return;
    }
    const selectionStart = selectionStartRef.current;
    if (selectionStart && activePage) {
      const point = getPoint(event);
      setSelectionBox({ x: Math.min(selectionStart.x, point.x), y: Math.min(selectionStart.y, point.y), width: Math.abs(point.x - selectionStart.x), height: Math.abs(point.y - selectionStart.y) });
      return;
    }
    const interaction = interactionRef.current;
    if (!interaction || !design || !activePage) return;
    const point = getPoint(event);
    const dx = point.x - interaction.startX; const dy = point.y - interaction.startY;
    let nextObject: DesignObject = { ...interaction.original, x: Math.max(0, interaction.original.x + dx), y: Math.max(0, interaction.original.y + dy) };
    if (interaction.mode === "resize") {
      nextObject = resizeObject(interaction.original, interaction.handle ?? "se", dx, dy, activePage, Boolean(interaction.keepRatio), Boolean(interaction.centred));
    } else if (interaction.mode === "rotate") {
      const original = interaction.original; const centreX = original.x + original.width / 2; const centreY = original.y + original.height / 2;
      const angle = Math.atan2(point.y - centreY, point.x - centreX);
      nextObject = { ...original, rotation: (original.rotation + (angle - (interaction.startAngle ?? angle)) * 180 / Math.PI + 360) % 360 };
    } else if (interaction.mode === "arrow-endpoint" && interaction.original.type === "arrow") {
      const original = interaction.original; const local = { x: Math.max(0, Math.min(original.width, point.x - original.x)), y: Math.max(0, Math.min(original.height, point.y - original.y)) };
      nextObject = { ...original, [interaction.endpoint === "start" ? "start" : "end"]: local };
    }
    const snap = interaction.mode === "move" && interaction.ids?.length === 1 && interaction.originals?.[0] ? snapMove(interaction.originals[0], dx, dy) : { dx, dy, guides: [] as Guide[] };
    if (interaction.mode === "move") setGuides(snap.guides);
    const movedObjects = interaction.mode === "move" && interaction.ids && interaction.originals
      ? new Map(interaction.originals.map((original) => [original.id, { ...original, x: Math.max(0, original.x + snap.dx), y: Math.max(0, original.y + snap.dy) }]))
      : null;
    setDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? { ...page, objects: page.objects.map((item) => movedObjects?.get(item.id) ?? (item.id === interaction.id ? nextObject : item)) } : page) });
  }

  function onCanvasPointerUp() {
    if (panRef.current) { panRef.current = null; return; }
    const selectionStart = selectionStartRef.current;
    if (selectionStart && activePage) {
      const box = selectionBox;
      if (box && (box.width > 3 || box.height > 3)) {
        const ids = activePage.objects.filter((object) => object.x < box.x + box.width && object.x + object.width > box.x && object.y < box.y + box.height && object.y + object.height > box.y).map((object) => object.id);
        selectObjects(ids);
      } else selectObjects([]);
      selectionStartRef.current = null; setSelectionBox(null); return;
    }
    const interaction = interactionRef.current;
    if (!interaction || !design) return;
    interactionRef.current = null;
    setGuides([]);
    const current = cloneDesign(design);
    setHistory((items) => [...items.slice(-49), interaction.base]); setFuture([]); void persist(current);
  }

  const openMediaAsDesign = useCallback(async (asset: MediaAsset) => {
    if (!writable) { setError("Close the other Studio editing tab before opening media in a new design."); return; }
    const dataUrl = await fileToDataUrl(asset.blob);
    const dimensions = await loadImage(dataUrl);
    const next = createDesign(asset.name.replace(/\.[^.]+$/, "") || "Image design");
    const designAsset: DesignAsset = { id: makeId("asset"), name: asset.name, type: asset.type, dataUrl, width: dimensions.width, height: dimensions.height };
    const scale = Math.min(1, 900 / dimensions.width, 700 / dimensions.height);
    const page = next.pages[0];
    const image = { id: makeId("object"), type: "image" as const, assetId: designAsset.id, x: Math.max(0, (page.width - dimensions.width * scale) / 2), y: Math.max(0, (page.height - dimensions.height * scale) / 2), width: dimensions.width * scale, height: dimensions.height * scale, rotation: 0, opacity: 1 };
    const opened = { ...next, assets: [designAsset], pages: [{ ...page, objects: [image] }] };
    const updated = [...designs, opened];
    setDesigns(updated); setDesign(opened); setPageName(page.name); setHistory([]); setFuture([]); selectObjects([]);
    await saveDesigns(updated);
    setStatus("New design opened from Studio media");
  }, [designs, writable]);

  async function addImage(file: File | Blob, name = "Image") {
    if (!writable || !design || !activePage) return;
    setError("");
    try {
      if (file.type && !DESIGN_IMAGE_TYPES.includes(file.type as typeof DESIGN_IMAGE_TYPES[number])) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
      const dataUrl = await fileToDataUrl(file); const dimensions = await loadImage(dataUrl);
      if (dimensions.width > DESIGN_MAX_DIMENSION * 2 || dimensions.height > DESIGN_MAX_DIMENSION * 2) throw new Error("This image is too large for the browser editor.");
      const asset: DesignAsset = { id: makeId("asset"), name, type: file.type || "image/png", dataUrl, ...dimensions };
      const fitNative = activePage.objects.length === 0 && window.confirm(`Fit this page to the image's native dimensions (${dimensions.width} × ${dimensions.height})?`);
      const scale = fitNative ? 1 : Math.min(1, 900 / dimensions.width, 700 / dimensions.height);
      const pageWidth = fitNative ? Math.min(DESIGN_MAX_DIMENSION, dimensions.width) : activePage.width;
      const pageHeight = fitNative ? Math.min(DESIGN_MAX_DIMENSION, dimensions.height) : activePage.height;
      const object = { id: makeId("object"), type: "image" as const, assetId: asset.id, x: Math.max(0, (pageWidth - dimensions.width * scale) / 2), y: Math.max(0, (pageHeight - dimensions.height * scale) / 2), width: dimensions.width * scale, height: dimensions.height * scale, rotation: 0, opacity: 1 };
      updateDesign({ ...design, assets: [...design.assets, asset], pages: design.pages.map((page) => page.id === activePage.id ? { ...page, width: pageWidth, height: pageHeight, objects: [...page.objects, object] } : page) });
      selectObjects([object.id]); setTool("select");
    } catch (imageError) { setError(imageError instanceof Error ? imageError.message : "The image could not be added."); }
  }

  async function removeSelectedImageBackground() {
    if (!design || !activePage || !selectedObject || selectedObject.type !== "image" || !writable) return;
    const source = design.assets.find((asset) => asset.id === selectedObject.assetId);
    if (!source) return;
    setError("");
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The image could not be decoded for background removal.")); image.src = source.dataUrl; });
      const pixelCount = image.naturalWidth * image.naturalHeight;
      if (pixelCount > 16_000_000) throw new Error("Background removal is limited to images up to 16 megapixels.");
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("The browser could not prepare the image for background removal.");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = pixels;
      const visited = new Uint8Array(canvas.width * canvas.height);
      const queue = new Int32Array(canvas.width * canvas.height);
      const threshold = backgroundTolerance * backgroundTolerance * 3;
      const seeds = [0, canvas.width - 1, (canvas.height - 1) * canvas.width, canvas.height * canvas.width - 1];
      for (const seed of seeds) {
        if (seed < 0 || seed >= visited.length || visited[seed]) continue;
        const seedOffset = seed * 4; const red = data[seedOffset]; const green = data[seedOffset + 1]; const blue = data[seedOffset + 2];
        let head = 0; let tail = 0; queue[tail++] = seed; visited[seed] = 1;
        while (head < tail) {
          const index = queue[head++]; const offset = index * 4;
          const distance = (data[offset] - red) ** 2 + (data[offset + 1] - green) ** 2 + (data[offset + 2] - blue) ** 2;
          if (distance > threshold) continue;
          data[offset + 3] = 0;
          const x = index % canvas.width; const y = Math.floor(index / canvas.width);
          const neighbours = [x > 0 ? index - 1 : -1, x < canvas.width - 1 ? index + 1 : -1, y > 0 ? index - canvas.width : -1, y < canvas.height - 1 ? index + canvas.width : -1];
          for (const neighbour of neighbours) if (neighbour >= 0 && !visited[neighbour]) { visited[neighbour] = 1; queue[tail++] = neighbour; }
        }
      }
      context.putImageData(pixels, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const derived: DesignAsset = { id: makeId("asset"), name: `${source.name.replace(/\.[^.]+$/, "")}-background-removed.png`, type: "image/png", dataUrl, width: source.width, height: source.height };
      const nextObject = { ...selectedObject, assetId: derived.id, crop: undefined };
      updateDesign({ ...design, assets: [...design.assets, derived], pages: design.pages.map((page) => page.id === activePage.id ? { ...page, objects: page.objects.map((object) => object.id === selectedObject.id ? nextObject : object) } : page) });
      setStatus("Background removed locally; the original image remains available in the design");
    } catch (backgroundError) { setError(backgroundError instanceof Error ? backgroundError.message : "Background removal failed."); }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    void addImage(file, file.name || "Pasted image");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) void addImage(file, file.name);
  }

  async function openMedia() {
    setShowMedia(true); setError("");
    try { setMediaAssets((await listMediaLibrary()).assets.filter((asset) => asset.type.startsWith("image/"))); }
    catch { setError("The Studio media library could not be read."); }
  }

  async function addMediaAsset(asset: MediaAsset) { await addImage(asset.blob, asset.name); setShowMedia(false); }

  function addPage(duplicate = false) {
    if (!design || !activePage) return;
    const page: DesignPage = { ...cloneDesign(activePage), id: makeId("page"), name: duplicate ? `${activePage.name} copy` : nextPageName(design.pages), objects: duplicate ? activePage.objects.map((object) => ({ ...cloneDesign(object), id: makeId("object") })) : [] };
    updateDesign({ ...design, pages: [...design.pages, page], activePageId: page.id }); setPageName(page.name); selectObjects([]);
  }

  function selectPage(id: string) { if (!design) return; const nextPage = design.pages.find((page) => page.id === id); updateDesign({ ...design, activePageId: id }, false); setPageName(nextPage?.name ?? ""); selectObjects([]); }

  function startPageRename(id: string) {
    selectPage(id);
    window.setTimeout(() => pageNameInputRef.current?.focus(), 0);
  }

  function deletePage() { if (!design || design.pages.length === 1 || !activePage) return; const index = design.pages.findIndex((page) => page.id === activePage.id); const nextPage = design.pages[index - 1] ?? design.pages[index + 1]; updateDesign({ ...design, pages: design.pages.filter((page) => page.id !== activePage.id), activePageId: nextPage.id }); selectObjects([]); }

  function setPagePreset(value: string) {
    const dimensions: Record<string, [number, number]> = { landscape: [1920, 1080], square: [1080, 1080], portrait: [1080, 1350] };
    const next = dimensions[value];
    if (next) updatePage((page) => ({ ...page, width: next[0], height: next[1] }));
  }

  function fitPageToSelectedImage() {
    if (!activePage || !selectedObject || selectedObject.type !== "image") return;
    const asset = design?.assets.find((item) => item.id === selectedObject.assetId);
    if (asset && activePage.objects.length === 1) updatePage((page) => ({ ...page, width: Math.min(DESIGN_MAX_DIMENSION, asset.width), height: Math.min(DESIGN_MAX_DIMENSION, asset.height) }));
  }

  function fitCanvasToView() {
    if (!activePage || !canvasScrollRef.current) { setZoom(60); return; }
    const availableWidth = Math.max(1, canvasScrollRef.current.clientWidth - 50);
    const availableHeight = Math.max(1, canvasScrollRef.current.clientHeight - 50);
    const fitPercent = Math.min(100, availableHeight / (availableWidth * activePage.height / activePage.width) * 100);
    setZoom(Math.max(20, Math.min(100, Math.round(fitPercent))));
  }

  function renamePage() { const name = pageName.trim(); if (!activePage || name === activePage.name) { setPageName(activePage?.name ?? ""); return; } if (!name) { setError("Page names cannot be empty."); setPageName(activePage.name); return; } updatePage((page) => ({ ...page, name })); }

  function duplicatePage(sourceId: string) {
    if (!design) return;
    const source = design.pages.find((page) => page.id === sourceId);
    if (!source) return;
    const page: DesignPage = { ...cloneDesign(source), id: makeId("page"), name: `${source.name} copy`, objects: source.objects.map((object) => ({ ...cloneDesign(object), id: makeId("object") })) };
    updateDesign({ ...design, pages: [...design.pages, page], activePageId: page.id }); setPageName(page.name); selectObjects([]);
  }

  function movePageById(pageId: string, direction: -1 | 1) {
    if (!design) return;
    const index = design.pages.findIndex((page) => page.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= design.pages.length) return;
    const pages = [...design.pages]; [pages[index], pages[target]] = [pages[target], pages[index]];
    updateDesign({ ...design, pages });
  }

  function reorderPage(sourceId: string, targetId: string) {
    if (!design || sourceId === targetId) return;
    const sourceIndex = design.pages.findIndex((page) => page.id === sourceId);
    const targetIndex = design.pages.findIndex((page) => page.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const pages = [...design.pages]; const [source] = pages.splice(sourceIndex, 1); pages.splice(targetIndex, 0, source);
    updateDesign({ ...design, pages });
  }

  function updateSelected(update: (object: DesignObject) => DesignObject) { if (!selectedId) return; updatePage((page) => ({ ...page, objects: page.objects.map((object) => { if (object.id !== selectedId) return object; const next = update(object); rememberStyle(next); return next; }) })); }

  function updateImageCrop(part: "x" | "y" | "width" | "height", value: number) {
    if (!selectedObject || selectedObject.type !== "image") return;
    const current = selectedObject.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    const next = { ...current, [part]: Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) };
    next.width = Math.min(next.width, 1 - next.x);
    next.height = Math.min(next.height, 1 - next.y);
    next.x = Math.min(next.x, 1 - next.width);
    next.y = Math.min(next.y, 1 - next.height);
    updateSelected((object) => object.type === "image" ? { ...object, crop: next } : object);
  }

  function duplicateSelected() {
    if (!design || !activePage || !selectedId || !writable) return;
    const selected = activePage.objects.find((object) => object.id === selectedId);
    if (!selected) return;
    const copy = { ...cloneDesign(selected), id: makeId("object"), x: selected.x + 20, y: selected.y + 20 };
    updatePage((page) => ({ ...page, objects: [...page.objects, copy] }));
    selectObjects([copy.id]);
  }

  function moveSelectedLayer(direction: "front" | "back" | "forward" | "backward") {
    if (!activePage || !selectedId || !writable) return;
    const index = activePage.objects.findIndex((object) => object.id === selectedId);
    if (index < 0) return;
    const objects = [...activePage.objects];
    const [selected] = objects.splice(index, 1);
    const target = direction === "front" ? objects.length : direction === "back" ? 0 : direction === "forward" ? Math.min(objects.length, index + 1) : Math.max(0, index - 1);
    objects.splice(target, 0, selected);
    updatePage((page) => ({ ...page, objects }));
  }

  const objectClipboardRef = useRef<DesignObject[]>([]);

  function copySelected() {
    if (!activePage || !selectedIds.length) return;
    objectClipboardRef.current = activePage.objects.filter((object) => selectedIds.includes(object.id)).map((object) => cloneDesign(object));
  }

  function pasteSelected() {
    if (!activePage || !writable || !objectClipboardRef.current.length) return;
    const copies = objectClipboardRef.current.map((object) => ({ ...cloneDesign(object), id: makeId("object"), x: object.x + 24, y: object.y + 24 }));
    updatePage((page) => ({ ...page, objects: [...page.objects, ...copies] }));
    selectObjects(copies.map((object) => object.id));
  }

  function groupSelected() {
    if (!writable || selectedIds.length < 2) return;
    const groupId = makeId("group");
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => selectedIds.includes(object.id) ? { ...object, groupId } : object) }));
  }

  function ungroupSelected() {
    if (!writable || !selectedIds.length) return;
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => {
      if (!selectedIds.includes(object.id)) return object;
      const ungrouped = { ...object };
      delete ungrouped.groupId;
      return ungrouped;
    }) }));
  }

  function alignSelected(axis: "left" | "centre" | "right" | "top" | "middle" | "bottom") {
    if (!activePage || !writable || selectedIds.length < 2) return;
    const selected = activePage.objects.filter((object) => selectedIds.includes(object.id));
    const bounds = { left: Math.min(...selected.map((object) => object.x)), top: Math.min(...selected.map((object) => object.y)), right: Math.max(...selected.map((object) => object.x + object.width)), bottom: Math.max(...selected.map((object) => object.y + object.height)) };
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => {
      if (!selectedIds.includes(object.id)) return object;
      const x = axis === "left" ? bounds.left : axis === "centre" ? (bounds.left + bounds.right - object.width) / 2 : axis === "right" ? bounds.right - object.width : object.x;
      const y = axis === "top" ? bounds.top : axis === "middle" ? (bounds.top + bounds.bottom - object.height) / 2 : axis === "bottom" ? bounds.bottom - object.height : object.y;
      return { ...object, x, y };
    }) }));
  }

  function createNewDesign() {
    if (!writable) return;
    const next = createDesign();
    setDesign(next); setDesigns((items) => [...items, next]); setHistory([]); setFuture([]); selectObjects([]); setPageName(next.pages[0].name);
    void saveDesigns([...designs, next]).then(() => setStatus("Saved locally just now")).catch(() => setStatus("Save failed — export an editable backup"));
  }

  async function exportPage(page: DesignPage) {
    try { setStatus(`Exporting ${page.name}…`); const blob = await renderPage(page, design?.assets ?? [], exportFormat, exportScale, exportQuality); downloadBlob(blob, `${sanitiseFilename(page.name)}.${exportFormat}`); setStatus("Export complete"); }
    catch (exportError) { setError(exportError instanceof Error ? exportError.message : "The page could not be exported."); }
  }

  async function exportAllPages() {
    if (!design) return;
    try {
      setStatus("Exporting all pages…");
      const used = new Map<string, number>();
      const files: Array<{ name: string; data: Uint8Array }> = [];
      for (const page of design.pages) {
        const base = sanitiseFilename(page.name); const count = (used.get(base) ?? 0) + 1; used.set(base, count);
        const blob = await renderPage(page, design.assets, exportFormat, exportScale, exportQuality); files.push({ name: `${base}${count > 1 ? `-${count}` : ""}.${exportFormat}`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      downloadBlob(zipFiles(files), `${sanitiseFilename(design.name)}-pages.zip`); setStatus("Export complete");
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "The pages could not be exported."); }
  }

  async function exportSelectedPages() {
    if (!design) return;
    const pages = design.pages.filter((page) => selectedPageIds.includes(page.id));
    if (!pages.length) return;
    try {
      setStatus("Exporting selected pages…");
      const used = new Map<string, number>();
      const files: Array<{ name: string; data: Uint8Array }> = [];
      for (const page of pages) {
        const base = sanitiseFilename(page.name); const count = (used.get(base) ?? 0) + 1; used.set(base, count);
        const blob = await renderPage(page, design.assets, exportFormat, exportScale, exportQuality);
        files.push({ name: `${base}${count > 1 ? `-${count}` : ""}.${exportFormat}`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      downloadBlob(zipFiles(files), `${sanitiseFilename(design.name)}-selected-pages.zip`); setStatus("Export complete");
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "The selected pages could not be exported."); }
  }

  async function savePageToStudioMedia(page: DesignPage) {
    try {
      setStatus("Saving rendered page to Studio media…");
      const blob = await renderPage(page, design?.assets ?? [], exportFormat, exportScale, exportQuality);
      const type = `image/${exportFormat}`;
      const [asset] = await addMediaFiles([new File([blob], `${sanitiseFilename(page.name)}.${exportFormat}`, { type })], null);
      const linked = { ...design!, pages: design!.pages.map((item) => item.id === page.id ? { ...item, renderedMediaId: asset.id } : item), updatedAt: new Date().toISOString() };
      await persist(linked); setDesign(linked); setMediaHandoff(asset.id); setStatus("Saved to Studio media");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The rendered page could not be saved to Studio media."); }
  }

  async function replaceLinkedStudioMedia(page: DesignPage) {
    if (!page.renderedMediaId) return;
    try {
      setStatus("Updating the selected Studio media…");
      const blob = await renderPage(page, design?.assets ?? [], exportFormat, exportScale, exportQuality);
      await replaceMediaAssetContent(page.renderedMediaId, blob, `image/${exportFormat}`);
      setStatus("Selected Studio media updated");
    } catch (replaceError) { setError(replaceError instanceof Error ? replaceError.message : "The selected Studio media could not be updated."); }
  }

  function exportDesignJson() { if (!design) return; downloadBlob(new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }), `${sanitiseFilename(design.name)}.acm-design.json`); }

  async function importDesign(file: File | undefined) {
    if (!file || !writable) return;
    try {
      const imported = migrateDesignProject(JSON.parse(await file.text()));
      for (const asset of imported.assets) {
        const dimensions = await loadImage(asset.dataUrl);
        if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw new Error(`The image “${asset.name}” has invalid dimensions.`);
      }
      const copy = { ...imported, id: makeId("design"), name: `${imported.name} copy`, updatedAt: new Date().toISOString() };
      setDesigns((items) => [...items, copy]); setDesign(copy); await saveDesigns([...designs, copy]); setStatus("Design imported");
    }
    catch (importError) { setError(importError instanceof Error ? importError.message : "The design file could not be imported."); }
    finally { if (importInputRef.current) importInputRef.current.value = ""; }
  }

  if (!loaded || !design || !activePage) return <div className="design-loading">Loading the design canvas…</div>;

  return <div className="design-shell" onPaste={handlePaste}>
      <header className="design-toolbar">
        <div className="design-toolbar-brand"><a href="/studio" aria-label="Back to ACM Studio">ACM Studio</a><span aria-hidden="true">/</span><input aria-label="Design name" value={design.name} disabled={!writable} onChange={(event) => updateDesign({ ...design, name: event.target.value })} /></div>
      <div className="design-toolbar-actions"><button className="design-pages-toggle" type="button" onClick={() => setPagesCollapsed((value) => !value)} aria-expanded={!pagesCollapsed} aria-controls="design-pages-panel">{pagesCollapsed ? "Show pages" : "Hide pages"}</button><span className="design-save-status" aria-live="polite">{status}</span><button type="button" onClick={undo} disabled={!history.length || !writable} aria-label="Undo">Undo</button><button type="button" onClick={redo} disabled={!future.length || !writable} aria-label="Redo">Redo</button><select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)} aria-label="Export format"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select><select value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))} aria-label="Export scale"><option value="1">100%</option><option value="2">200%</option></select><select value={exportQuality} onChange={(event) => setExportQuality(Number(event.target.value))} aria-label="Export quality"><option value=".92">High quality</option><option value=".75">Smaller file</option></select><button type="button" onClick={() => void exportPage(activePage)}>Export page</button><button type="button" onClick={() => void exportSelectedPages()} disabled={!selectedPageIds.length}>Export selected</button><button type="button" onClick={() => void exportAllPages()}>Export all pages</button>{activePage.renderedMediaId ? <button type="button" onClick={() => void replaceLinkedStudioMedia(activePage)} disabled={!writable}>Update linked media</button> : null}<button type="button" onClick={() => void savePageToStudioMedia(activePage)} disabled={!writable}>Save to Studio media</button><button type="button" onClick={exportDesignJson}>Editable backup</button>{mediaHandoff ? <><a className="design-content-link" href={`/studio?designMedia=${encodeURIComponent(mediaHandoff)}&designTarget=block`}>Insert into current document</a><a className="design-content-link" href={`/studio?designMedia=${encodeURIComponent(mediaHandoff)}&designTarget=cover`}>Use as cover image</a></> : null}</div>
    </header>
    {ownershipMessage(ownershipState) ? <div className="design-notice" role="status">{ownershipMessage(ownershipState)}{ownershipState === "waiting" ? " Close the other editing tab before making changes." : ""}</div> : null}
    {error ? <div className="design-error" role="alert">{error}</div> : null}
    <div className={`design-workspace${pagesCollapsed ? " pages-collapsed" : ""}`}>
      <aside className="design-pages" id="design-pages-panel" aria-label="Design pages"><div className="design-pages-heading"><strong>Pages</strong><div><button type="button" onClick={() => setPagesCollapsed(true)} aria-label="Hide pages">−</button><button type="button" onClick={() => addPage()} disabled={!writable} aria-label="Add page">＋</button></div></div><div className="design-page-list">{design.pages.map((page, index) => <div className={`design-page-item${page.id === activePage.id ? " is-active" : ""}`} key={page.id} draggable={writable} onDragStart={() => setDraggedPageId(page.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedPageId) reorderPage(draggedPageId, page.id); setDraggedPageId(null); }}><label className="design-page-select"><input type="checkbox" checked={selectedPageIds.includes(page.id)} onChange={(event) => setSelectedPageIds((items) => event.target.checked ? [...items, page.id] : items.filter((id) => id !== page.id))} aria-label={`Select ${page.name} for export`} /></label><button type="button" className="design-thumbnail-button" onClick={() => selectPage(page.id)} aria-label={`Open ${page.name}`}><div className="design-thumbnail"><PageSvg page={page} assets={design.assets} selectedIds={[]} guides={[]} onCanvasPointerDown={() => undefined} onObjectPointerDown={() => undefined} onResizePointerDown={() => undefined} onRotatePointerDown={() => undefined} onArrowEndpointPointerDown={() => undefined} onResizeKeyDown={() => undefined} onRotateKeyDown={() => undefined} onArrowEndpointKeyDown={() => undefined} /></div><span>{index + 1}. {page.name}</span></button><div className="design-page-item-actions"><button type="button" onClick={() => startPageRename(page.id)} disabled={!writable} aria-label={`Rename ${page.name}`}>✎</button><button type="button" onClick={() => duplicatePage(page.id)} disabled={!writable} aria-label={`Duplicate ${page.name}`}>⧉</button><button type="button" onClick={() => movePageById(page.id, -1)} disabled={!writable || index === 0} aria-label={`Move ${page.name} earlier`}>↑</button><button type="button" onClick={() => movePageById(page.id, 1)} disabled={!writable || index === design.pages.length - 1} aria-label={`Move ${page.name} later`}>↓</button></div></div>)}</div><div className="design-page-actions"><button type="button" onClick={() => addPage()} disabled={!writable}>Add page</button><button type="button" onClick={deletePage} disabled={!writable || design.pages.length === 1}>Delete page</button><button type="button" onClick={createNewDesign} disabled={!writable}>New design</button></div><label className="design-import-label">Import design<input ref={importInputRef} type="file" accept="application/json,.json" onChange={(event) => void importDesign(event.target.files?.[0])} /></label><select className="design-switcher" value={design.id} onChange={(event) => { const next = designs.find((item) => item.id === event.target.value); if (next) { setDesign(next); setPageName(next.pages.find((page) => page.id === next.activePageId)?.name ?? next.pages[0]?.name ?? ""); setHistory([]); setFuture([]); selectObjects([]); } }} aria-label="Open design">{designs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></aside>
      <section className="design-main" aria-label="Design canvas">
        <div className="design-tool-rail"><button type="button" className={tool === "select" ? "is-active" : ""} onClick={() => setTool("select")} aria-pressed={tool === "select"}><StudioIcon name={toolIcons.select} size={20} /><span>Select</span></button><button type="button" onClick={() => fileInputRef.current?.click()} disabled={!writable}><StudioIcon name={toolIcons.image} size={20} /><span>Image</span></button><input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file, file.name); if (fileInputRef.current) fileInputRef.current.value = ""; }} />{annotationTools.map((item) => <button type="button" key={item} className={tool === item ? "is-active" : ""} onClick={() => setTool(item)} disabled={!writable} aria-pressed={tool === item}><StudioIcon name={toolIcons[item]} size={20} /><span>{toolLabels[item]}</span></button>)}<button ref={mediaTriggerRef} type="button" onClick={() => void openMedia()} disabled={!writable}><StudioIcon name="image" size={20} /><span>Studio files</span></button></div>
        <div className="design-canvas-area" onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><div className="design-canvas-heading"><div><span>Page {design.pages.findIndex((page) => page.id === activePage.id) + 1}</span><input ref={pageNameInputRef} aria-label="Page name" value={pageName} disabled={!writable} onChange={(event) => setPageName(event.target.value)} onBlur={renamePage} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } if (event.key === "Escape") { setPageName(activePage.name); event.currentTarget.blur(); } }} /></div><div className="design-zoom"><button type="button" onClick={() => setZoom((value) => Math.max(20, value - 10))}>−</button><select aria-label="Zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value="25">25%</option><option value="50">50%</option><option value="60">60%</option><option value="75">75%</option><option value="100">100%</option><option value="120">120%</option></select><button type="button" onClick={() => setZoom((value) => Math.min(120, value + 10))}>+</button><button type="button" onClick={fitCanvasToView}>Fit</button><button type="button" onClick={() => setZoom(100)}>100%</button><button type="button" className={snapEnabled ? "is-active" : ""} aria-pressed={snapEnabled} onClick={() => { setSnapEnabled((value) => !value); setGuides([]); }}>Snap {snapEnabled ? "on" : "off"}</button></div></div><div className="design-canvas-scroll" ref={canvasScrollRef}><div className="design-canvas-frame" style={{ width: `${zoom}%` }}><PageSvg tool={tool} page={activePage} assets={design.assets} selectedIds={selectedIds} guides={guides} onCanvasPointerDown={onCanvasPointerDown} onObjectPointerDown={onObjectPointerDown} onResizePointerDown={onResizePointerDown} onRotatePointerDown={onRotatePointerDown} onArrowEndpointPointerDown={onArrowEndpointPointerDown} onResizeKeyDown={onResizeKeyDown} onRotateKeyDown={onRotateKeyDown} onArrowEndpointKeyDown={onArrowEndpointKeyDown} selectionBox={selectionBox} svgRef={svgRef} /></div></div><p className="design-canvas-help">Drag any handle to resize. Shift keeps proportions; Option/Alt resizes from the centre. Arrow keys resize focused handles.</p></div>
      </section>
      <aside className="design-inspector" aria-label="Design properties"><div className="design-inspector-section"><span className="design-inspector-label">Page</span><label>Name<input value={pageName} disabled={!writable} onChange={(event) => setPageName(event.target.value)} onBlur={renamePage} /></label><label>Preset<select value="custom" disabled={!writable} onChange={(event) => setPagePreset(event.target.value)}><option value="custom">Custom</option><option value="landscape">1920 × 1080 landscape</option><option value="square">1080 × 1080 square</option><option value="portrait">1080 × 1350 portrait</option></select></label><label>Width<input type="number" min="1" max={DESIGN_MAX_DIMENSION} value={activePage.width} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, width: Math.min(DESIGN_MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) }))} /></label><label>Height<input type="number" min="1" max={DESIGN_MAX_DIMENSION} value={activePage.height} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, height: Math.min(DESIGN_MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) }))} /></label><label>Background<select value={activePage.background.kind} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, background: { ...page.background, kind: event.target.value as "solid" | "transparent" } }))}><option value="solid">Solid</option><option value="transparent">Transparent</option></select></label>{activePage.background.kind === "solid" ? <label>Colour<input type="color" value={activePage.background.colour} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, background: { ...page.background, colour: event.target.value } }))} /></label> : null}</div>{selectedObject ? <div className="design-inspector-section"><span className="design-inspector-label">Selected {toolLabels[selectedObject.type as Tool] ?? selectedObject.type}</span><div className="design-field-grid"><label>X<input type="number" value={Math.round(selectedObject.x)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, x: Number(event.target.value) || 0 }))} /></label><label>Y<input type="number" value={Math.round(selectedObject.y)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, y: Number(event.target.value) || 0 }))} /></label><label>Width<input type="number" min="1" value={Math.round(selectedObject.width)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, width: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Height<input type="number" min="1" value={Math.round(selectedObject.height)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, height: Math.max(1, Number(event.target.value) || 1) }))} /></label></div><label>Opacity<input type="range" min="0" max="1" step=".05" value={selectedObject.opacity} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, opacity: Number(event.target.value) }))} /></label>{selectedObject.type === "image" ? <div className="design-image-tools">
            <div className="design-background-removal"><span className="design-inspector-label">Background removal</span><label>Tolerance<input type="range" min="4" max="80" value={backgroundTolerance} disabled={!writable} onChange={(event) => setBackgroundTolerance(Number(event.target.value))} /></label><button type="button" onClick={() => void removeSelectedImageBackground()} disabled={!writable}>Remove background</button><small>Removes edge-connected colours locally and keeps the original asset.</small></div>
            <div className="design-crop-controls"><span className="design-inspector-label">Crop (percent)</span><div className="design-field-grid">
              <label>Left<input type="number" min="0" max="100" value={Math.round((selectedObject.crop?.x ?? 0) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("x", Number(event.target.value) / 100)} /></label>
              <label>Top<input type="number" min="0" max="100" value={Math.round((selectedObject.crop?.y ?? 0) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("y", Number(event.target.value) / 100)} /></label>
              <label>Width<input type="number" min="1" max="100" value={Math.round((selectedObject.crop?.width ?? 1) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("width", Number(event.target.value) / 100)} /></label>
              <label>Height<input type="number" min="1" max="100" value={Math.round((selectedObject.crop?.height ?? 1) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("height", Number(event.target.value) / 100)} /></label>
            </div></div>
          </div> : null}{selectedObject.type === "text" || selectedObject.type === "step" ? <><label>Text<textarea value={selectedObject.text} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, text: event.target.value }))} /></label><label>Text colour<input type="color" value={selectedObject.colour} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, colour: event.target.value }))} /></label><label>Font size<input type="number" min="8" max="240" value={selectedObject.fontSize} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fontSize: Math.max(8, Number(event.target.value) || 8) }))} /></label><label>Font family<select value={selectedObject.fontFamily} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fontFamily: event.target.value }))}><option>Inter, Arial, sans-serif</option><option>Arial, sans-serif</option><option>Georgia, serif</option><option>monospace</option></select></label><label>Weight<select value={selectedObject.fontWeight} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fontWeight: Number(event.target.value) }))}><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option></select></label><label>Alignment<select value={selectedObject.align} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, align: event.target.value as "left" | "center" | "right" }))}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>{selectedObject.type === "step" ? <label>Step fill<input type="color" value={selectedObject.fill ?? "#cc1818"} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fill: event.target.value }))} /></label> : null}</> : null}{selectedObject.type === "arrow" ? <><label>Line colour<input type="color" value={selectedObject.stroke} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), stroke: event.target.value }))} /></label><label>Line width<input type="number" min="1" max="80" value={selectedObject.strokeWidth} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), strokeWidth: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Arrowhead<select value={selectedObject.arrowhead ? "yes" : "no"} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), arrowhead: event.target.value === "yes" }))}><option value="yes">Shown</option><option value="no">Hidden</option></select></label></> : null}{["rectangle", "ellipse", "highlight"].includes(selectedObject.type) ? <><label>Fill<input type="color" value={(selectedObject as DesignShapeObject).fill === "transparent" ? "#ffffff" : (selectedObject as DesignShapeObject).fill} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), fill: event.target.value }))} /></label><label>Outline<input type="color" value={(selectedObject as DesignShapeObject).stroke === "none" ? "#ffffff" : (selectedObject as DesignShapeObject).stroke} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), stroke: event.target.value }))} /></label><label>Outline width<input type="number" min="0" max="80" value={(selectedObject as DesignShapeObject).strokeWidth} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), strokeWidth: Math.max(0, Number(event.target.value) || 0) }))} /></label>{selectedObject.type === "rectangle" ? <label>Corner radius<input type="number" min="0" max="200" value={(selectedObject as DesignShapeObject).radius ?? 0} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), radius: Math.max(0, Number(event.target.value) || 0) }))} /></label> : null}</> : null}{selectedIds.length > 1 ? <div className="design-object-actions"><button type="button" onClick={groupSelected} disabled={!writable}>Group</button><button type="button" onClick={ungroupSelected} disabled={!writable}>Ungroup</button><button type="button" onClick={() => alignSelected("left")} disabled={!writable}>Align left</button><button type="button" onClick={() => alignSelected("right")} disabled={!writable}>Align right</button><button type="button" onClick={() => alignSelected("top")} disabled={!writable}>Align top</button><button type="button" onClick={() => alignSelected("bottom")} disabled={!writable}>Align bottom</button><button type="button" onClick={() => alignSelected("centre")} disabled={!writable}>Centre</button><button type="button" onClick={() => alignSelected("middle")} disabled={!writable}>Middle</button></div> : null}<div className="design-object-actions">{selectedObject.type === "image" && activePage.objects.length === 1 ? <button type="button" onClick={fitPageToSelectedImage} disabled={!writable}>Fit page to image</button> : null}<button type="button" onClick={copySelected} disabled={!writable}>Copy</button><button type="button" onClick={pasteSelected} disabled={!writable}>Paste</button><button type="button" onClick={duplicateSelected} disabled={!writable}>Duplicate</button><button type="button" onClick={() => moveSelectedLayer("backward")} disabled={!writable}>Send backward</button><button type="button" onClick={() => moveSelectedLayer("forward")} disabled={!writable}>Bring forward</button><button type="button" onClick={() => moveSelectedLayer("back")} disabled={!writable}>Send to back</button><button type="button" onClick={() => moveSelectedLayer("front")} disabled={!writable}>Bring to front</button><button type="button" onClick={() => updateSelected((object) => ({ ...object, locked: !object.locked }))} disabled={!writable}>{selectedObject.locked ? "Unlock" : "Lock"}</button><button type="button" onClick={() => { updatePage((page) => ({ ...page, objects: page.objects.filter((object) => object.id !== selectedObject.id) })); selectObjects([]); }} disabled={!writable}>Delete</button></div></div> : <div className="design-inspector-empty"><p>Select an object to edit its position, size and style.</p><p>Redaction is opaque in rendered exports. Keep editable backups private because the original image remains in the design source.</p></div>}<div className="design-inspector-section design-layers"><span className="design-inspector-label">Layers</span>{activePage.objects.length ? <div className="design-layer-list">{[...activePage.objects].reverse().map((object) => <button key={object.id} type="button" className={selectedIds.includes(object.id) ? "is-selected" : ""} aria-pressed={selectedIds.includes(object.id)} onClick={() => selectObjects([object.id])}><span>{toolLabels[object.type as Tool] ?? object.type}</span><small>{object.locked ? "Locked" : ""}</small></button>)}</div> : <p>No objects yet.</p>}</div></aside>
    </div>
    {showMedia ? <div className="design-media-dialog" role="dialog" aria-modal="true" aria-labelledby="design-media-title"><div className="design-media-panel"><header><h2 id="design-media-title">Choose from Studio files</h2><button type="button" onClick={() => setShowMedia(false)} aria-label="Close">×</button></header>{mediaAssets.length ? <div className="design-media-list">{mediaAssets.map((asset) => <button type="button" key={asset.id} onClick={() => void addMediaAsset(asset)}><img src={URL.createObjectURL(asset.blob)} alt="" /><span>{asset.name}</span></button>)}</div> : <p>No image files are available in Studio yet.</p>}</div></div> : null}
  </div>;
}
