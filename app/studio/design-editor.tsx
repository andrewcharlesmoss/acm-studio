"use client";
import { isNativeEditingTarget, primaryShortcutModifier, workspaceHistoryShortcut, workspaceZoomShortcut } from "./workspace-shortcuts.mjs";
import { ZoomRangeControl } from "./controls/zoom-range-control";
import { CanvasHandle } from "./controls/canvas-handle";
import { RotationHandle } from "./controls/rotation-handle";
import { rotationFromKey, rotationFromPointer, rotationPointerAngle } from "./controls/rotation-geometry";
import { HistoryActions } from "./controls/history-actions";
import { StudioDialog } from "./overlays/dialog";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { useBlobUrls } from "./controls/use-blob-urls";
import { ColourPicker } from "./controls/colour-picker";
import { FontFamilySelect } from "./controls/font-family-setting";
import { RangeControl } from "./controls/range-control";
import { ToggleSetting } from "./controls/toggle-setting";
import { ImageChoiceGrid } from "./controls/image-choice-grid";
import { DragPlacementIndicator } from "./drag-placement-indicator";

import { useCallback, useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ClipboardEvent, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent, type Ref } from "react";
import { removeImageBackground, type BackgroundRemovalProgress } from "./background-removal";
import type { BackgroundRemovalMode } from "./background-removal-models";
import { resizeRotatedObject, rotationCursorCss } from "./design-transform";
import { renderToStaticMarkup } from "react-dom/server";
import { DesignObjectArtwork, DesignPageArtwork, DesignPageBackground } from "./design-artwork";
import { arrowPoints } from "./design-geometry";
import { useGapReordering } from "./use-gap-reordering";
import { moveDesignLayer, reorderDesignLayers } from "./design-layer-operations.mjs";
import { addMediaFiles, getMediaAsset, listMediaLibrary, replaceMediaAssetContent, type MediaAsset } from "./media-store";
import { studioWriteOwnership, ownershipMessage, type OwnershipState } from "./write-ownership";
import {
  cloneDesign, createDesign, DESIGN_ARROWHEAD_SCALE_MAX, DESIGN_ARROWHEAD_SCALE_MIN, DESIGN_MAX_DIMENSION, makeId, nextPageName,
  DESIGN_IMAGE_TYPES, migrateDesignProject, sanitiseFilename,
  type DesignArrowObject, type DesignAsset, type DesignObject, type DesignPage, type DesignProject, type DesignShapeKind, type DesignShapeObject, type DesignTextObject,
} from "./design-model";
import { loadDesigns, saveDesign } from "./design-store";
import { requestDesignBroker } from "./design-broker-host";
import { createDesignSync, type DesignSyncConflict, type DesignSyncSession, type DesignSyncStatus } from "./design-sync";
import type { DesignChange, DesignMergeConflict } from "./design-merge";
import { StudioMenuItem } from "./overlays/menu";
import { StudioIcon } from "./studio-icons";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import type { StudioIconName } from "./studio-icons";
import { Ribbon as StudioRibbon, RibbonButton as StudioRibbonButton, RibbonGroup as StudioRibbonGroup, RibbonPanel as StudioRibbonPanel, type RibbonTabDefinition } from "@acm/ribbon";
import "@acm/ribbon/styles.css";

type Tool = "select" | "image" | "arrow" | "rectangle" | "ellipse" | "text" | "step" | "highlight" | "redaction";
type StudioRibbonTab = "file" | "home" | "insert" | "arrange" | "view" | "export";
const studioRibbonTabs: readonly RibbonTabDefinition<StudioRibbonTab>[] = [
  { id: "file", label: "File" }, { id: "home", label: "Home" }, { id: "insert", label: "Insert" }, { id: "arrange", label: "Arrange" }, { id: "view", label: "View" }, { id: "export", label: "Export" },
];
type DrawTool = Exclude<Tool, "select" | "image">;
type PositionAxis = "left" | "centre" | "right" | "top" | "middle" | "bottom";
type InteractionMode = "move" | "resize" | "rotate" | "arrow-endpoint" | "arrow-bend" | "draw";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type ActiveHandle =
  | { objectId: string; kind: "resize"; handle: ResizeHandle }
  | { objectId: string; kind: "rotate" }
  | { objectId: string; kind: "endpoint"; endpoint: "start" | "end" }
  | { objectId: string; kind: "bend"; bendIndex: number }
  | { objectId: null; kind: "page-resize"; handle: ResizeHandle };
type Interaction = { mode: InteractionMode; id: string; ids?: string[]; originals?: DesignObject[]; startX: number; startY: number; original: DesignObject; base: DesignProject; handle?: ResizeHandle; keepRatio?: boolean; centred?: boolean; endpoint?: "start" | "end"; bendIndex?: number; startAngle?: number; drawTool?: DrawTool; shapeKind?: DesignShapeKind };
type PageResizeInteraction = { handle: ResizeHandle; startClientX: number; startClientY: number; scaleX: number; scaleY: number; originalWidth: number; originalHeight: number; keepRatio: boolean; base: DesignProject };
type Guide = { axis: "x" | "y"; position: number; style: "solid" | "dotted" };
type SnapTarget = { position: number; style: Guide["style"] };
type LayerMoveDirection = "front" | "back" | "forward" | "backward";
type LayerDropPosition = "before" | "after";
type RecentStyles = {
  arrow: Pick<DesignArrowObject, "stroke" | "strokeOpacity" | "strokeWidth" | "arrowhead" | "startArrowhead" | "arrowheadScale" | "lineStyle">;
  shape: Pick<DesignShapeObject, "fill" | "fillOpacity" | "stroke" | "strokeOpacity" | "strokeWidth" | "radius">;
  text: Pick<DesignTextObject, "colour" | "colourOpacity" | "fontFamily" | "fontSize" | "fontWeight" | "align" | "wordWrap">;
  step: Pick<DesignTextObject, "colour" | "colourOpacity" | "fill" | "fillOpacity" | "fontFamily" | "fontSize" | "fontWeight" | "align" | "wordWrap">;
  highlight: Pick<DesignShapeObject, "fill" | "fillOpacity" | "stroke" | "strokeOpacity" | "strokeWidth"> & { opacity: number };
};

const defaultRecentStyles: RecentStyles = {
  arrow: { stroke: "#cc1818", strokeOpacity: 1, strokeWidth: 6, arrowhead: true, startArrowhead: false, arrowheadScale: 1, lineStyle: "solid" },
  shape: { fill: "#ffffff", fillOpacity: 1, stroke: "#cc1818", strokeOpacity: 1, strokeWidth: 5, radius: 8 },
  text: { colour: "#17191c", colourOpacity: 1, fontFamily: "Inter, Arial, sans-serif", fontSize: 34, fontWeight: 600, align: "left", wordWrap: true },
  step: { colour: "#ffffff", colourOpacity: 1, fill: "#cc1818", fillOpacity: 1, fontFamily: "Inter, Arial, sans-serif", fontSize: 32, fontWeight: 700, align: "center", wordWrap: true },
  highlight: { fill: "#ffd93d", fillOpacity: 1, stroke: "none", strokeOpacity: 1, strokeWidth: 0, opacity: .55 },
};
const fontOptions = [
  { value: "Inter, Arial, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "monospace", label: "Monospace" },
];

const toolLabels: Record<Tool, string> = { select: "Select", image: "Image", arrow: "Arrow", rectangle: "Rectangle", ellipse: "Ellipse", text: "Text", step: "Numbered step", highlight: "Highlight", redaction: "Redaction" };
const annotationTools: Tool[] = ["arrow", "text", "step", "highlight", "redaction"];
const toolIcons: Record<Tool, StudioIconName | "seen"> = { select: "drag-handle", image: "image", arrow: "arrow-right", rectangle: "block", ellipse: "seen", text: "format-bold", step: "list", highlight: "button", redaction: "block" };
const shapeOptions: Array<{ value: DesignShapeKind; label: string }> = [
  { value: "rectangle", label: "Square" },
  { value: "roundedRectangle", label: "Rounded square" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
  { value: "triangleDown", label: "Inverted triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "pentagon", label: "Pentagon" },
  { value: "hexagon", label: "Hexagon" },
  { value: "octagon", label: "Octagon" },
];
const ZOOM_OPTIONS = Array.from({ length: 491 }, (_, index) => 10 + index);

function conflictValue(change: DesignChange, value: unknown) {
  if (change.kind === "move") return "Reordered items";
  if (change.kind === "insert" || change.kind === "delete") return `${change.kind === "insert" ? "Insert" : "Delete"} ${change.value.id}`;
  if (change.property === "transform" && value && typeof value === "object") {
    const transform = value as Record<string, unknown>;
    return `x ${String(transform.x)}, y ${String(transform.y)}, ${String(transform.width)} × ${String(transform.height)}, rotation ${String(transform.rotation)}°`;
  }
  if (typeof value === "string") return value || "Empty";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "Not set";
  return "Updated value";
}

function conflictTarget(change: DesignChange) {
  if (change.kind === "move") return `${change.collection} order`;
  if (change.kind === "insert" || change.kind === "delete") return `${change.collection} item ${change.value.id}`;
  return `${change.target}${change.id ? ` ${change.id}` : ""} · ${change.property}`;
}

function conflictDetails(conflict: DesignMergeConflict) {
  const yours = conflict.change.kind === "set" ? conflict.change.after : conflict.change;
  return { target: conflictTarget(conflict.change), other: conflictValue(conflict.change, conflict.current), yours: conflictValue(conflict.change, yours) };
}
const ZOOM_SHORTCUT_STEPS = [10, 25, 50, 75, 100, 125, 200, 300, 500] as const;
const SAVE_STATUS_MINIMUM_MS = 500;

function centredScrollOffset(contentCentre: number, viewportSize: number, scrollSize: number, clientSize: number) {
  const maximum = Math.max(0, scrollSize - clientSize);
  return Math.max(0, Math.min(maximum, contentCentre - viewportSize / 2));
}

type ColourControlProps = {
  label: string;
  value: string;
  opacity?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
};

function ColourControl({ label, value, opacity = 1, disabled = false, onChange, onOpacityChange }: ColourControlProps) {
  const transparency = Math.round((1 - opacity) * 100);
  const opacityLabel = label === "Text colour" ? "Text" : label === "Line colour" ? "Line" : label;
  const visibleOpacity = 100 - transparency;
  return <div className="design-colour-control"><ColourPicker label={label} value={value} disabled={disabled} allowClear={false} onChange={colour => { if (colour !== undefined) onChange(colour); }} /><label>{opacityLabel} opacity ({visibleOpacity}%)<RangeControl aria-label={`${opacityLabel} opacity`} min="0" max="100" step="1" value={visibleOpacity} tooltipText={`${visibleOpacity}%`} disabled={disabled} onChange={event => onOpacityChange(Number(event.target.value) / 100)} /></label></div>;
}

function designSaveErrorMessage(error: unknown, fallback = "The design could not be saved.") {
  if (isDesignStorageQuotaError(error)) {
    return "This design is too large for browser storage. Export an editable backup, then remove unused or very large images before saving again.";
  }
  return error instanceof Error ? error.message : fallback;
}

function isDesignStorageQuotaError(error: unknown) {
  return error instanceof Error && error.name === "QuotaExceededError";
}

function resizeCursor(handle: ResizeHandle, rotation: number) {
  const handleAngles: Record<ResizeHandle, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
  const axis = ((handleAngles[handle] + rotation) % 180 + 180) % 180;
  const direction = Math.round(axis / 45) % 4;
  return ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"][direction];
}

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

function constrainArrowBend(object: DesignArrowObject, page: DesignPage, bend: { x: number; y: number }) {
  return {
    x: Math.max(-page.width - object.x, Math.min(page.width * 2 - object.x, bend.x)),
    y: Math.max(-object.y, Math.min(page.height - object.y, bend.y)),
  };
}

function pageSvgMarkup(page: DesignPage, assets: DesignAsset[]) {
  return renderToStaticMarkup(<DesignPageArtwork page={page} assets={assets} />);
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

function makeObject(tool: Exclude<Tool, "select" | "image">, x: number, y: number, page: DesignPage, objectIndex: number, styles: RecentStyles = defaultRecentStyles, shapeKind: DesignShapeKind = "rectangle"): DesignObject {
  const base = { id: makeId("object"), x, y, width: tool === "arrow" ? 220 : tool === "text" || tool === "step" ? 240 : 180, height: tool === "text" || tool === "step" ? 54 : tool === "arrow" ? 120 : 100, rotation: 0, opacity: 1 };
  if (tool === "arrow") return { ...base, type: "arrow", ...styles.arrow };
  if (tool === "text") return { ...base, type: "text", text: "Add text", ...styles.text };
  if (tool === "step") return { ...base, type: "step", text: String(objectIndex + 1), ...styles.step, width: 64, height: 64 };
  if (tool === "highlight") return { ...base, type: "highlight", ...styles.highlight };
  if (tool === "redaction") return { ...base, type: "redaction", fill: "#000000", stroke: "none", strokeWidth: 0 };
  return { ...base, type: tool, ...styles.shape, shape: tool === "rectangle" ? shapeKind : undefined, fill: tool === "ellipse" && styles.shape.fill === "#ffffff" ? "transparent" : styles.shape.fill };
}

function drawObject(object: DesignObject, start: { x: number; y: number }, current: { x: number; y: number }, page: DesignPage) {
  const startX = Math.max(0, Math.min(page.width, start.x));
  const startY = Math.max(0, Math.min(page.height, start.y));
  const currentX = Math.max(0, Math.min(page.width, current.x));
  const currentY = Math.max(0, Math.min(page.height, current.y));
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.max(1, Math.abs(currentX - startX));
  const height = Math.max(1, Math.abs(currentY - startY));
  const next = { ...object, x, y, width, height };
  if (next.type !== "arrow") return next;
  const arrowStart = { x: startX <= currentX ? 0 : width, y: startY <= currentY ? 0 : height };
  const arrowEnd = { x: startX <= currentX ? width : 0, y: startY <= currentY ? height : 0 };
  return {
    ...next,
    start: arrowStart,
    end: arrowEnd,
    bends: [{ x: arrowStart.x + (arrowEnd.x - arrowStart.x) / 2, y: arrowStart.y + (arrowEnd.y - arrowStart.y) / 2 }],
  };
}

function resizeObject(object: DesignObject, handle: ResizeHandle, dx: number, dy: number, _page: DesignPage, keepRatio: boolean, centred: boolean) {
  return resizeRotatedObject(object, handle, dx, dy, keepRatio, centred);
}

function resizePage(page: DesignPage, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean) {
  const minimum = 120;
  const widthDelta = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0;
  const heightDelta = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0;
  let width = Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, page.width + widthDelta));
  let height = Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, page.height + heightDelta));
  if (keepRatio) {
    const ratio = page.width / page.height;
    if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
    else width = height * ratio;
    const scale = Math.min(1, DESIGN_MAX_DIMENSION / width, DESIGN_MAX_DIMENSION / height);
    width *= scale;
    height *= scale;
  }
  return { ...page, width: Math.round(Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, width))), height: Math.round(Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, height))) };
}

function shouldKeepResizeRatio(object: DesignObject, shiftKey: boolean) {
  return object.type === "image" && !shiftKey;
}

function arrowLocalPagePoint(object: DesignArrowObject, local: { x: number; y: number }) {
  const centre = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  const radians = object.rotation * Math.PI / 180;
  const point = { x: object.x + local.x, y: object.y + local.y };
  return {
    x: centre.x + (point.x - centre.x) * Math.cos(radians) - (point.y - centre.y) * Math.sin(radians),
    y: centre.y + (point.x - centre.x) * Math.sin(radians) + (point.y - centre.y) * Math.cos(radians),
  };
}

function arrowEndpointPagePoint(object: DesignArrowObject, endpoint: "start" | "end") {
  return arrowLocalPagePoint(object, object[endpoint] ?? (endpoint === "start" ? { x: 0, y: object.height } : { x: object.width, y: 0 }));
}

function mapArrowBendForEndpointMove(bend: { x: number; y: number }, oldStart: { x: number; y: number }, oldEnd: { x: number; y: number }, nextStart: { x: number; y: number }, nextEnd: { x: number; y: number }) {
  const oldVector = { x: oldEnd.x - oldStart.x, y: oldEnd.y - oldStart.y };
  const oldLengthSquared = oldVector.x ** 2 + oldVector.y ** 2;
  const nextVector = { x: nextEnd.x - nextStart.x, y: nextEnd.y - nextStart.y };
  const nextLength = Math.hypot(nextVector.x, nextVector.y) || 1;
  if (!oldLengthSquared) return { ...nextStart };
  const fromStart = { x: bend.x - oldStart.x, y: bend.y - oldStart.y };
  const along = (fromStart.x * oldVector.x + fromStart.y * oldVector.y) / oldLengthSquared;
  const perpendicular = (fromStart.x * oldVector.y - fromStart.y * oldVector.x) / Math.sqrt(oldLengthSquared);
  const normal = { x: -nextVector.y / nextLength, y: nextVector.x / nextLength };
  return {
    x: nextStart.x + nextVector.x * along + normal.x * perpendicular,
    y: nextStart.y + nextVector.y * along + normal.y * perpendicular,
  };
}

function resizeArrowEndpoint(object: DesignArrowObject, endpoint: "start" | "end", point: { x: number; y: number }, page: DesignPage): DesignArrowObject {
  const oldStart = arrowEndpointPagePoint(object, "start");
  const oldEnd = arrowEndpointPagePoint(object, "end");
  const oldBends = arrowPoints(object).bends.map((bend) => arrowLocalPagePoint(object, bend));
  const fixedPoint = arrowEndpointPagePoint(object, endpoint === "start" ? "end" : "start");
  const movedPoint = { x: Math.max(0, Math.min(page.width, point.x)), y: Math.max(0, Math.min(page.height, point.y)) };
  const start = endpoint === "start" ? movedPoint : fixedPoint;
  const end = endpoint === "end" ? movedPoint : fixedPoint;
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));
  const x = Math.max(0, Math.min(page.width - width, Math.min(start.x, end.x)));
  const y = Math.max(0, Math.min(page.height - height, Math.min(start.y, end.y)));
  const bends = oldBends.map((bend) => mapArrowBendForEndpointMove(bend, oldStart, oldEnd, start, end)).map((bend) => ({ x: Math.max(-x, Math.min(page.width - x, bend.x - x)), y: Math.max(-y, Math.min(page.height - y, bend.y - y)) }));
  return { ...object, x, y, width, height, rotation: 0, start: { x: start.x - x, y: start.y - y }, end: { x: end.x - x, y: end.y - y }, bends };
}

export function PageSvg({ page, assets, selectedIds = [], selectionBox, guides = [], tool = "select", zoom = 100, isRotating = false, rotatingObjectId, rotationCursor = null, activeHandle = null, showPageResizeHandles = false, purpleSelectionBorder = false, showHoverHandles = false, editingTextId = null, editingTextValue = "", onEditingTextChange, onEditingTextCommit, onEditingTextCancel, onCanvasPointerDown, onObjectPointerDown, onTextDoubleClick, onResizePointerDown, onPageResizePointerDown, onRotatePointerDown, onArrowEndpointPointerDown, onArrowBendPointerDown, onArrowBendKeyDown, onResizeKeyDown, onPageResizeKeyDown, onRotateKeyDown, onArrowEndpointKeyDown, svgRef }: {
  page: DesignPage; assets: DesignAsset[]; selectedIds?: string[]; selectionBox?: { x: number; y: number; width: number; height: number } | null; guides?: Guide[]; zoom?: number;
  isRotating?: boolean;
  rotatingObjectId?: string;
  rotationCursor?: { x: number; y: number } | null;
  activeHandle?: ActiveHandle | null;
  showPageResizeHandles?: boolean;
  purpleSelectionBorder?: boolean;
  showHoverHandles?: boolean;
  editingTextId?: string | null;
  editingTextValue?: string;
  onEditingTextChange?: (value: string) => void;
  onEditingTextCommit?: () => void;
  onEditingTextCancel?: () => void;
  tool?: Tool;
  onCanvasPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onObjectPointerDown: (event: PointerEvent<SVGGElement>, object: DesignObject) => void;
  onTextDoubleClick?: (object: DesignTextObject) => void;
  onResizePointerDown: (event: PointerEvent<SVGElement>, object: DesignObject, handle: ResizeHandle) => void;
  onPageResizePointerDown?: (event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) => void;
  onRotatePointerDown: (event: PointerEvent<SVGCircleElement>, object: DesignObject) => void;
  onArrowEndpointPointerDown: (event: PointerEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") => void;
  onArrowBendPointerDown: (event: PointerEvent<SVGRectElement>, object: DesignArrowObject, bendIndex: number) => void;
  onArrowBendKeyDown?: (event: ReactKeyboardEvent<SVGRectElement>, object: DesignArrowObject, bendIndex: number) => void;
  onResizeKeyDown?: (event: ReactKeyboardEvent<SVGElement>, object: DesignObject, handle: ResizeHandle) => void;
  onPageResizeKeyDown?: (event: ReactKeyboardEvent<SVGCircleElement>, handle: ResizeHandle) => void;
  onRotateKeyDown?: (event: ReactKeyboardEvent<SVGCircleElement>, object: DesignObject) => void;
  onArrowEndpointKeyDown?: (event: ReactKeyboardEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") => void;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const controlScale = 100 / Math.max(1, zoom);
  const arrowBendHandleSize = 12 * controlScale;
  const resizeHandles: Array<{ handle: ResizeHandle; label: string }> = [
    { handle: "nw", label: "Resize selected object from top left" },
    { handle: "n", label: "Resize selected object from top middle" },
    { handle: "ne", label: "Resize selected object from top right" },
    { handle: "e", label: "Resize selected object from right middle" },
    { handle: "se", label: "Resize selected object from bottom right" },
    { handle: "s", label: "Resize selected object from bottom middle" },
    { handle: "sw", label: "Resize selected object from bottom left" },
    { handle: "w", label: "Resize selected object from left middle" },
  ];
  const pageResizeHandles: Array<{ handle: ResizeHandle; label: string }> = [
    { handle: "nw", label: "Resize page from top left" },
    { handle: "n", label: "Resize page from top middle" },
    { handle: "ne", label: "Resize page from top right" },
    { handle: "e", label: "Resize page from right middle" },
    { handle: "se", label: "Resize page from bottom right" },
    { handle: "s", label: "Resize page from bottom middle" },
    { handle: "sw", label: "Resize page from bottom left" },
    { handle: "w", label: "Resize page from left middle" },
  ];
  const activeRotation = page.objects.find((object) => object.id === rotatingObjectId)?.rotation ?? 0;
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const inlineTextEditorRef = useRef<HTMLTextAreaElement>(null);
  const cancelTextEditRef = useRef(false);
  useEffect(() => { queueMicrotask(() => setHoveredObjectId(null)); }, [page.id, showHoverHandles]);
  useEffect(() => { if (editingTextId) inlineTextEditorRef.current?.focus(); }, [editingTextId]);
  useEffect(() => {
    const editingObject = page.objects.find((object): object is DesignTextObject => object.id === editingTextId && object.type === "text");
    if (inlineTextEditorRef.current) inlineTextEditorRef.current.wrap = editingObject?.wordWrap === false ? "off" : "soft";
  }, [editingTextId, page.objects]);
  useEffect(() => { cancelTextEditRef.current = false; }, [editingTextId]);
  return <svg ref={svgRef} style={{ "--rotation-cursor": rotationCursorCss(activeRotation) } as CSSProperties} className={`design-page-svg${tool === "select" ? " is-select-mode" : ""}${isRotating ? " is-rotating" : ""}`} viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label={page.name} onPointerDown={onCanvasPointerDown}>
    <DesignPageBackground page={page} checkerboard interactive />
    {page.objects.map((object) => { const objectActiveHandle = activeHandle?.objectId === object.id ? activeHandle : null; const showObjectHandles = !activeHandle || Boolean(objectActiveHandle); return <g key={object.id} data-object-id={object.id} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`} opacity={object.opacity} className={`design-object${selectedIds.includes(object.id) ? " is-selected" : ""}${hoveredObjectId === object.id ? " is-hovered" : ""}${object.locked ? " is-locked" : ""}`} onPointerEnter={() => showHoverHandles && !object.locked && setHoveredObjectId(object.id)} onPointerLeave={() => showHoverHandles && setHoveredObjectId(null)} onPointerDown={(event) => onObjectPointerDown(event, object)} onDoubleClick={(event) => { if (object.type === "text") { event.preventDefault(); event.stopPropagation(); onTextDoubleClick?.(object); } }}>
      <rect width={object.width} height={object.height} fill="transparent" pointerEvents="all" onPointerDown={(event) => onObjectPointerDown(event as unknown as PointerEvent<SVGGElement>, object)} />
      {object.type === "text" && editingTextId === object.id ? <foreignObject x="0" y="0" width={object.width} height={object.height}><textarea ref={inlineTextEditorRef} className="design-inline-text-editor" aria-label="Edit text" value={editingTextValue} onChange={(event) => onEditingTextChange?.(event.target.value)} onBlur={() => { if (cancelTextEditRef.current) { cancelTextEditRef.current = false; return; } onEditingTextCommit?.(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelTextEditRef.current = true; onEditingTextCancel?.(); } }} onPointerDown={(event) => event.stopPropagation()} style={{ color: object.colour, fontFamily: object.fontFamily, fontSize: `${object.fontSize}px`, fontWeight: object.fontWeight, textAlign: object.align }} /></foreignObject> : <DesignObjectArtwork object={object} assets={assets} />}
      {purpleSelectionBorder && (selectedIds.includes(object.id) || (showHoverHandles && hoveredObjectId === object.id && !object.locked)) ? <rect className="design-selection-border" x="0" y="0" width={object.width} height={object.height} /> : null}
      {(selectedIds.includes(object.id) || (showHoverHandles && hoveredObjectId === object.id && !object.locked)) && object.type !== "arrow" && showObjectHandles ? (() => {
        return <>
        {resizeHandles.map(({ handle, label }) => {
          const cx = handle.includes("e") ? object.width : handle.includes("w") ? 0 : object.width / 2;
          const cy = handle.includes("s") ? object.height : handle.includes("n") ? 0 : object.height / 2;
          if (objectActiveHandle && (objectActiveHandle.kind !== "resize" || objectActiveHandle.handle !== handle)) return null;
          return <CanvasHandle key={handle} aria-label={label} cursor={resizeCursor(handle, object.rotation)} cx={cx} cy={cy} controlScale={controlScale} onPointerDown={(event) => onResizePointerDown(event, object, handle)} onKeyDown={(event) => onResizeKeyDown?.(event, object, handle)} />;
        })}
        <RotationHandle object={object} controlScale={controlScale} rotating={isRotating} cursor={rotationCursor} showHandle={!objectActiveHandle || objectActiveHandle.kind === "rotate"} onPointerDown={event => onRotatePointerDown(event, object)} onKeyDown={event => onRotateKeyDown?.(event, object)} />
      </>;
      })() : null}
      {(selectedIds.includes(object.id) || (showHoverHandles && hoveredObjectId === object.id && !object.locked)) && object.type === "arrow" && showObjectHandles ? (() => { const { start, end, bends } = arrowPoints(object); const showEndpoint = !objectActiveHandle || objectActiveHandle.kind === "endpoint"; const showBend = !objectActiveHandle || objectActiveHandle.kind === "bend"; return <>{showEndpoint && (objectActiveHandle?.kind !== "endpoint" || objectActiveHandle.endpoint === "start") ? <CanvasHandle aria-label="Resize arrow from start point" cursor="crosshair" cx={start.x} cy={start.y} controlScale={controlScale} onPointerDown={(event) => onArrowEndpointPointerDown(event, object, "start")} onKeyDown={(event) => onArrowEndpointKeyDown?.(event, object, "start")} /> : null}{showEndpoint && (objectActiveHandle?.kind !== "endpoint" || objectActiveHandle.endpoint === "end") ? <CanvasHandle aria-label="Resize arrow from end point" cursor="crosshair" cx={end.x} cy={end.y} controlScale={controlScale} onPointerDown={(event) => onArrowEndpointPointerDown(event, object, "end")} onKeyDown={(event) => onArrowEndpointKeyDown?.(event, object, "end")} /> : null}{showBend ? bends.map((bend, index) => { if (objectActiveHandle?.kind === "bend" && objectActiveHandle.bendIndex !== index) return null; return <rect key={`bend-${index}`} role="button" tabIndex={0} aria-label={`Adjust arrow bend ${index + 1}`} className="design-arrow-bend-handle" x={bend.x - arrowBendHandleSize / 2} y={bend.y - arrowBendHandleSize / 2} width={arrowBendHandleSize} height={arrowBendHandleSize} transform={`rotate(45 ${bend.x} ${bend.y})`} onPointerDown={(event) => onArrowBendPointerDown(event, object, index)} onKeyDown={(event) => onArrowBendKeyDown?.(event, object, index)} />; }) : null}</>; })() : null}
    </g>; })}
    <g className="design-guides-overlay" aria-hidden="true">
      {guides.map((guide) => guide.axis === "x" ? <line key={`guide-x-${guide.position}`} className={`design-guide design-guide-${guide.style}`} x1={guide.position} x2={guide.position} y1="0" y2={page.height} /> : <line key={`guide-y-${guide.position}`} className={`design-guide design-guide-${guide.style}`} x1="0" x2={page.width} y1={guide.position} y2={guide.position} />)}
    </g>
    {purpleSelectionBorder && showPageResizeHandles ? <rect className="design-selection-border" x="0" y="0" width={page.width} height={page.height} /> : null}
    {showPageResizeHandles ? pageResizeHandles.map(({ handle, label }) => activeHandle?.kind === "page-resize" && activeHandle.handle !== handle ? null : <CanvasHandle key={`page-${handle}`} aria-label={label} cursor={resizeCursor(handle, 0)} cx={handle.includes("e") ? page.width : handle.includes("w") ? 0 : page.width / 2} cy={handle.includes("s") ? page.height : handle.includes("n") ? 0 : page.height / 2} controlScale={controlScale} onPointerDown={(event) => onPageResizePointerDown?.(event, handle)} onKeyDown={(event) => onPageResizeKeyDown?.(event, handle)} />) : null}
    {selectionBox ? <rect className="design-marquee" x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} /> : null}
  </svg>;
}

function PositionControls({ writable, selectedCount, canAlign, onAlignToPage }: { writable: boolean; selectedCount: number; canAlign: boolean; onAlignToPage: (axis: PositionAxis) => void }) {
  const actions: Array<{ axis: PositionAxis; label: string }> = [
    { axis: "top", label: "Top" }, { axis: "left", label: "Left" },
    { axis: "middle", label: "Middle" }, { axis: "centre", label: "Centre" },
    { axis: "bottom", label: "Bottom" }, { axis: "right", label: "Right" },
  ];
  return <div className="design-position-tools">
    <span className="design-inspector-label">Position</span>
    <span className="design-position-heading">Align to page{selectedCount > 1 ? " (selected layers)" : ""}</span>
    <div className="design-position-grid">{actions.map(({ axis, label }) => <button key={axis} type="button" onClick={() => onAlignToPage(axis)} disabled={!writable || !canAlign} aria-label={`Align selected ${selectedCount > 1 ? "layers" : "layer"} to page ${label.toLowerCase()}`}>{label}</button>)}</div>
  </div>;
}

function LayerList({ page, selectedIds, writable, onSelect, onReorder }: { page: DesignPage; selectedIds: string[]; writable: boolean; onSelect: (id: string) => void; onReorder: (sourceId: string, targetId: string, position: LayerDropPosition) => void }) {
  const layers = [...page.objects].reverse();
  const reorder = useGapReordering({ ids: layers.map(object => object.id), version: JSON.stringify(page), writable,
    accepts: move => reorderDesignLayers(page.objects, move.id, move.targetId, move.edge) !== page.objects,
    onMove: move => { onReorder(move.id, move.targetId, move.edge); return true; },
  });
  if (!page.objects.length) return <p>No objects yet.</p>;
  return <div className="design-layer-list" aria-label="Layers, top to bottom" {...reorder.listProps}>
    {layers.map(object => {
      const label = toolLabels[object.type as Tool] ?? object.type;
      const canMove = writable && !object.locked;
      return <div key={object.id} {...reorder.rowProps(object.id)} className="design-layer-row" draggable={canMove}
        onDragStart={event => { if (!canMove) { event.preventDefault(); return; } reorder.start(event, object.id); }} onDragEnd={reorder.cancel}>
        <button {...(canMove ? reorder.handleProps(object.id) : {})} type="button" className={`design-layer-select${selectedIds.includes(object.id) ? " is-selected" : ""}`} aria-pressed={selectedIds.includes(object.id)} onClick={() => onSelect(object.id)}>
          <StudioIcon name="drag-handle" size={16} /><span>{label}</span><small>{object.locked ? "Locked" : ""}</small>
        </button>
      </div>;
    })}
    <DragPlacementIndicator line={reorder.line} />
  </div>;
}

function reorderedPages(pages: DesignPage[], sourceId: string, targetId: string, position: "before" | "after") {
  if (sourceId === targetId) return null;
  const sourceIndex = pages.findIndex((page) => page.id === sourceId);
  const targetIndex = pages.findIndex((page) => page.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return null;
  const next = [...pages];
  const [source] = next.splice(sourceIndex, 1);
  const adjustedTarget = next.findIndex((page) => page.id === targetId);
  const insertionIndex = adjustedTarget + (position === "after" ? 1 : 0);
  if (insertionIndex === sourceIndex) return null;
  next.splice(insertionIndex, 0, source);
  return next;
}

type DesignContextMenuProps = {
  x: number;
  y: number;
  selectedCount: number;
  canCopy: boolean;
  canPaste: boolean;
  canAlign: boolean;
  canLock: boolean;
  selectionLocked: boolean;
  alignOpen: boolean;
  anchor: () => HTMLElement | null;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onAlignToggle: () => void;
  onAlign: (axis: PositionAxis) => void;
  onLock: () => void;
  onLink: () => void;
};

type DesignContextMenuState = { x: number; y: number; alignOpen: boolean };

function DesignContextMenu({ x, y, anchor, selectedCount, canCopy, canPaste, canAlign, canLock, selectionLocked, alignOpen, onClose, onCopy, onPaste, onAlignToggle, onAlign, onLock, onLink }: DesignContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const alignTriggerRef = useRef<HTMLButtonElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  function openAlignMenu() {
    if (!alignOpen) onAlignToggle();
    requestAnimationFrame(() => alignMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());
  }
  function closeAlignMenu() { onAlignToggle(); alignTriggerRef.current?.focus(); }
  const itemLabel = selectedCount > 1 ? "selected layers" : "selected layer";
  return <StudioAnchoredMenu menuRef={menuRef} presentation="custom" anchor={anchor} point={{ x, y }} className="design-context-menu" aria-label="Canvas actions" onClose={onClose}>
    <StudioMenuItem onClick={() => { onCopy(); onClose(); }} disabled={!canCopy}><StudioIcon name="copy" size={20} /><span>Copy</span><kbd>⌘C / Ctrl+C</kbd></StudioMenuItem>
    <StudioMenuItem onClick={() => { onPaste(); onClose(); }} disabled={!canPaste}><StudioIcon name="copy" size={20} /><span>Paste</span><kbd>⌘V / Ctrl+V</kbd></StudioMenuItem>
    <div className="design-context-menu-separator" role="separator" />
    <StudioMenuItem ref={alignTriggerRef} aria-haspopup="menu" aria-expanded={alignOpen} onClick={() => alignOpen ? closeAlignMenu() : openAlignMenu()} onKeyDown={event => { if (event.key === "ArrowRight" && canAlign) { event.preventDefault(); event.stopPropagation(); openAlignMenu(); } }} disabled={!canAlign}><StudioIcon name="align-left" size={20} /><span>Align to page</span><StudioIcon name="chevron-right" size={18} /></StudioMenuItem>
    {alignOpen && canAlign ? <StudioAnchoredMenu menuRef={alignMenuRef} presentation="custom" anchor={() => alignTriggerRef.current} placement="submenu" className="design-context-submenu" aria-label={`Align ${itemLabel} to page`} onClose={closeAlignMenu} onOutside={target => { if (menuRef.current?.contains(target)) closeAlignMenu(); else onClose(); }} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); closeAlignMenu(); } }}>
      {(["top", "middle", "bottom", "left", "centre", "right"] as const).map((axis) => <StudioMenuItem key={axis} onClick={() => { onAlign(axis); onClose(); }}>{axis === "centre" ? "Centre" : axis[0].toUpperCase() + axis.slice(1)}</StudioMenuItem>)}
    </StudioAnchoredMenu> : null}
    <div className="design-context-menu-separator" role="separator" />
    <StudioMenuItem onClick={() => { onLock(); onClose(); }} disabled={!canLock}><StudioIcon name={selectionLocked ? "lock-open" : "lock"} size={20} /><span>{selectionLocked ? "Unlock" : "Lock"}</span></StudioMenuItem>
    <StudioMenuItem onClick={() => { onLink(); onClose(); }} disabled={!canCopy}><StudioIcon name="link" size={20} /><span>Link</span></StudioMenuItem>
  </StudioAnchoredMenu>;
}

export function DesignEditor() {
  const [designs, setDesigns] = useState<DesignProject[]>([]);
  const [design, setDesign] = useState<DesignProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ownershipAttempt, setOwnershipAttempt] = useState(0);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const initialDesignLoad = useRef(false);
  const newDesignId = useRef<string | null>(null);
  const bootstrappingDesign = useRef(false);
  const [ownershipState, setOwnershipState] = useState<OwnershipState>(studioWriteOwnership.getState());
  const [status, setStatus] = useState("Loading designs…");
  const [ribbonTab, setRibbonTab] = useState<StudioRibbonTab>("home");
  const [tool, setTool] = useState<Tool>("select");
  const [shapeKind, setShapeKind] = useState<DesignShapeKind>("rectangle");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [history, setHistory] = useState<DesignProject[]>([]);
  const [future, setFuture] = useState<DesignProject[]>([]);
  const [pageName, setPageName] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const mediaUrls = useBlobUrls(mediaAssets, showMedia);
  const [error, setError] = useState("");
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [mediaHandoff, setMediaHandoff] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState(1);
  const [exportQuality, setExportQuality] = useState(.92);
  const [zoom, setZoom] = useState(60);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const pageSelectionAnchorRef = useRef<string | null>(null);
  const pageSelectionModifiersRef = useRef({ metaKey: false, ctrlKey: false, shiftKey: false });
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [pagesPaneWidth, setPagesPaneWidth] = useState(224);
  const [inspectorPaneWidth, setInspectorPaneWidth] = useState(260);
  const [leftPaneTab, setLeftPaneTab] = useState<"pages" | "layers">("pages");
  const designNavigationTabsId = useId();
  const [allPagesVisible, setAllPagesVisible] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ActiveHandle | null>(null);
  const [rotationCursor, setRotationCursor] = useState<{ x: number; y: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [purpleSelectionBorder, setPurpleSelectionBorder] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState<BackgroundRemovalProgress | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundRemovalMode>("general");
  const [backgroundEdgeCleanup, setBackgroundEdgeCleanup] = useState(10);
  const [syncStatus, setSyncStatus] = useState<DesignSyncStatus>("disconnected");
  const [syncConflict, setSyncConflict] = useState<DesignSyncConflict | null>(null);
  const [conflictPanelOpen, setConflictPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<DesignContextMenuState | null>(null);
  const backgroundRemovalRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const pageNameInputRef = useRef<HTMLInputElement>(null);
  const mediaTriggerRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const pageResizeRef = useRef<PageResizeInteraction | null>(null);
  const contextMenuReturnRef = useRef<HTMLElement | null>(null);
  const conflictReviewButtonRef = useRef<HTMLButtonElement>(null);

  const closeContextMenu = useCallback(() => {
    const returnTarget = contextMenuReturnRef.current;
    contextMenuReturnRef.current = null;
    setContextMenu(null);
    window.setTimeout(() => returnTarget?.focus(), 0);
  }, []);

  const handleRibbonTabChange = (tab: StudioRibbonTab) => {
    if (tab === "file") {
      window.location.href = "/studio/designs/library";
      return;
    }
    setRibbonTab(tab);
  };
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const recentStylesRef = useRef<RecentStyles>(cloneDesign(defaultRecentStyles));
  const lastTextPointerRef = useRef<{ id: string; at: number } | null>(null);
  const syncRef = useRef<DesignSyncSession | null>(null);
  const saveStatusSequenceRef = useRef(0);
  const activePageIdRef = useRef<string | null>(null);
  const urlHandoffApplied = useRef(false);
  const designsRef = useRef<DesignProject[]>([]);
  const requestedDesignId = useState(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("designId"))[0];

  const primaryWritable = ownershipState === "writable";
  const peerWritable = ["waiting", "writable"].includes(ownershipState) && syncStatus === "synced";
  const writable = peerWritable && !syncConflict;
  const activePage = design?.pages.find((page) => page.id === design.activePageId) ?? design?.pages[0] ?? null;
  if (activePage && !design?.pages.some((page) => page.id === activePageIdRef.current)) activePageIdRef.current = activePage.id;
  const activePageIndex = activePage && design ? design.pages.findIndex((page) => page.id === activePage.id) : 0;
  const designEditable = writable && !activePage?.locked;
  const pageReorder = useGapReordering({ ids: design?.pages.map(page => page.id) ?? [], version: JSON.stringify(design?.pages ?? []), writable,
    accepts: move => Boolean(design && reorderedPages(design.pages, move.id, move.targetId, move.edge)),
    onMove: move => reorderPage(move.id, move.targetId, move.edge),
  });
  const selectedObject = activePage?.objects.find((object) => object.id === selectedId) ?? null;
  const selectedImageAsset = selectedObject?.type === "image" ? design?.assets.find((asset) => asset.id === selectedObject.assetId) : undefined;

  // A completed job may only apply to the exact state that started it. Layout
  // cleanup invalidates synchronously when React commits an edit/selection.
  useLayoutEffect(() => () => {
    const operation = backgroundRemovalRef.current;
    if (operation) {
      backgroundRemovalRef.current = null;
      operation.abort();
      setBackgroundProgress(null);
    }
  }, [design, selectedId, selectedIds, ownershipState]);

  useLayoutEffect(() => {
    const scroll = canvasScrollRef.current;
    if (!scroll) return;
    const frame = allPagesVisible
      ? scroll.querySelector<HTMLElement>(".design-all-page.is-active .design-canvas-frame")
      : scroll.querySelector<HTMLElement>(".design-canvas-frame");
    if (!frame) return;
    const scrollRect = scroll.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const contentCentreX = scroll.scrollLeft + frameRect.left - scrollRect.left + frameRect.width / 2;
    const contentCentreY = scroll.scrollTop + frameRect.top - scrollRect.top + frameRect.height / 2;
    scroll.scrollLeft = centredScrollOffset(contentCentreX, scroll.clientWidth, scroll.scrollWidth, scroll.clientWidth);
    scroll.scrollTop = centredScrollOffset(contentCentreY, scroll.clientHeight, scroll.scrollHeight, scroll.clientHeight);
  }, [activePage?.id, allPagesVisible, zoom]);

  useEffect(() => studioWriteOwnership.subscribe(() => {
    if (!studioWriteOwnership.canWrite()) backgroundRemovalRef.current?.abort();
  }), []);

  useEffect(() => { designsRef.current = designs; }, [designs]);

  function rememberStyle(object: DesignObject) {
    if (object.type === "arrow") recentStylesRef.current.arrow = { stroke: object.stroke, strokeOpacity: object.strokeOpacity ?? 1, strokeWidth: object.strokeWidth, arrowhead: object.arrowhead, startArrowhead: object.startArrowhead ?? false, arrowheadScale: object.arrowheadScale ?? 1, lineStyle: object.lineStyle ?? "solid" };
    else if (object.type === "text") recentStylesRef.current.text = { colour: object.colour, colourOpacity: object.colourOpacity ?? 1, fontFamily: object.fontFamily, fontSize: object.fontSize, fontWeight: object.fontWeight, align: object.align, wordWrap: object.wordWrap !== false };
    else if (object.type === "step") recentStylesRef.current.step = { colour: object.colour, colourOpacity: object.colourOpacity ?? 1, fill: object.fill ?? "#cc1818", fillOpacity: object.fillOpacity ?? 1, fontFamily: object.fontFamily, fontSize: object.fontSize, fontWeight: object.fontWeight, align: object.align, wordWrap: object.wordWrap !== false };
    else if (object.type === "highlight") recentStylesRef.current.highlight = { fill: object.fill, fillOpacity: object.fillOpacity ?? 1, stroke: object.stroke, strokeOpacity: object.strokeOpacity ?? 1, strokeWidth: object.strokeWidth, opacity: object.opacity };
    else if (object.type === "rectangle" || object.type === "ellipse") recentStylesRef.current.shape = { fill: object.fill, fillOpacity: object.fillOpacity ?? 1, stroke: object.stroke, strokeOpacity: object.strokeOpacity ?? 1, strokeWidth: object.strokeWidth, radius: object.radius };
  }

  function selectObjects(ids: string[]) {
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? null);
  }

  useEffect(() => {
    if (!design || !activePage) return;
    const handleCanvasContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".design-context-menu") || !target.closest(".design-canvas-scroll")) return;
      event.preventDefault();
      const objectId = target.closest<SVGGElement>(".design-object")?.dataset.objectId;
      if (objectId && activePage.objects.some((object) => object.id === objectId) && !selectedIds.includes(objectId)) selectObjects([objectId]);
      contextMenuReturnRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      setContextMenu({
        x: Math.min(Math.max(8, event.clientX), Math.max(8, window.innerWidth - 292)),
        y: Math.min(Math.max(8, event.clientY), Math.max(8, window.innerHeight - 390)),
        alignOpen: false,
      });
    };
    document.addEventListener("contextmenu", handleCanvasContextMenu);
    return () => document.removeEventListener("contextmenu", handleCanvasContextMenu);
  }, [activePage, design, selectedIds]);

  function restoreSelection(next: DesignProject) {
    const page = next.pages.find((item) => item.id === next.activePageId) ?? next.pages[0];
    const ids = page ? selectedIds.filter((id) => page.objects.some((object) => object.id === id)) : [];
    selectObjects(ids);
  }

  function beginTextEditing(object: DesignTextObject) {
    if (!designEditable) return;
    interactionRef.current = null;
    selectObjects([object.id]);
    setEditingTextId(object.id);
    setEditingTextValue(object.text);
  }

  function commitTextEditing() {
    if (!editingTextId) return;
    const value = editingTextValue;
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => object.id === editingTextId && object.type === "text" ? { ...object, text: value } : object) }));
    setEditingTextId(null);
  }

  function cancelTextEditing() {
    setEditingTextId(null);
  }

  const selectPageSetFromListener = useEffectEvent((pageId: string, event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; checked: boolean }) => selectPageSet(pageId, event));
  useEffect(() => {
    const panel = document.getElementById("design-pages-tabpanel");
    if (!panel) return;
    const handlePageSelectionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const checkbox = target.closest<HTMLInputElement>(".design-page-select input");
      const thumbnail = target.closest<HTMLElement>(".design-thumbnail-button");
      if (!checkbox && !thumbnail) return;
      if (checkbox) {
        pageSelectionModifiersRef.current = { metaKey: event.metaKey, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey };
        return;
      }
      const item = target.closest<HTMLElement>(".design-page-item");
      if (!item) return;
      const index = Array.from(panel.querySelectorAll(".design-page-item")).indexOf(item);
      const page = design?.pages[index];
      if (!page) return;
      const modifiers = { metaKey: event.metaKey, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, checked: true };
      if (event.metaKey || event.ctrlKey || event.shiftKey) selectPageSetFromListener(page.id, modifiers);
    };
    const handlePageSelectionChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches(".design-page-select input")) return;
      const item = target.closest<HTMLElement>(".design-page-item");
      if (!item) return;
      const index = Array.from(panel.querySelectorAll(".design-page-item")).indexOf(item);
      const page = design?.pages[index];
      if (!page) return;
      event.stopPropagation();
      const modifiers = pageSelectionModifiersRef.current;
      pageSelectionModifiersRef.current = { metaKey: false, ctrlKey: false, shiftKey: false };
      selectPageSetFromListener(page.id, { ...modifiers, checked: target.checked });
    };
    panel.addEventListener("click", handlePageSelectionClick, true);
    panel.addEventListener("change", handlePageSelectionChange, true);
    return () => { panel.removeEventListener("click", handlePageSelectionClick, true); panel.removeEventListener("change", handlePageSelectionChange, true); };
  }, [design?.pages, selectedPageIds]);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = studioWriteOwnership.subscribe(() => setOwnershipState(studioWriteOwnership.getState()));
    if (!initialDesignLoad.current) {
      try {
        const saved = loadDesigns();
        const requested = requestedDesignId ? saved.find(item => item.id === requestedDesignId) : undefined;
        const initial = requested ?? saved[0] ?? createDesign();
        if (!saved.length) newDesignId.current = initial.id;
        queueMicrotask(() => { if (mounted) { initialDesignLoad.current = true; designsRef.current = saved; setDesigns(saved); setDesign(initial); setLoaded(true); setStatus(saved.length ? "Saved locally" : "New design ready"); } });
      } catch (loadError) { queueMicrotask(() => { if (mounted) { initialDesignLoad.current = true; setError(loadError instanceof Error ? loadError.message : "Saved designs could not be read."); setDesign(createDesign()); setLoaded(true); } }); }
    }
    const release = studioWriteOwnership.canWrite() ? () => {} : studioWriteOwnership.acquire(token => {
      try {
        // Validate the latest aggregate before accepting ownership. The sync session
        // rebases local changes; acquisition must not replace the displayed draft.
        const latest = loadDesigns();
        designsRef.current = latest;
        setDesigns(latest);
        studioWriteOwnership.loaded(token, true);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Saved designs could not be read.");
        studioWriteOwnership.loaded(token, false);
      }
    });
    return () => { mounted = false; unsubscribe(); release(); };
  }, [requestedDesignId, ownershipAttempt]);

  useEffect(() => {
    const retry = () => { if (studioWriteOwnership.getState() === "waiting") setOwnershipAttempt(value => value + 1); syncRef.current?.retryConnection(); };
    const resume = () => { if (document.visibilityState === "visible") retry(); };
    const timer = setInterval(() => { if (studioWriteOwnership.getState() === "waiting") setOwnershipAttempt(value => value + 1); }, 1000);
    window.addEventListener("focus", retry);
    window.addEventListener("pageshow", retry);
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(timer); window.removeEventListener("focus", retry); window.removeEventListener("pageshow", retry); document.removeEventListener("visibilitychange", resume); };
  }, []);

  useEffect(() => {
    if (!primaryWritable || !design || bootstrappingDesign.current || newDesignId.current !== design.id) return;
    bootstrappingDesign.current = true;
    void saveDesign(design).then(() => { newDesignId.current = null; syncRef.current?.retryConnection(); }).catch(error => setError(designSaveErrorMessage(error))).finally(() => { bootstrappingDesign.current = false; });
  }, [primaryWritable, design, bootstrapAttempt]);

  useEffect(() => {
    if (!loaded || !design) return;
    const session = createDesignSync({
      designId: design.id,
      initialSnapshot: design,
      role: "peer",
      requestPrimary: () => requestDesignBroker(design.id),
      onStatus: (next) => {
        setSyncStatus(next);
        if (next === "synced") setStatus("Synced with another ACM Studio tab");
        else if (next === "conflict") setStatus("Resolve conflicting changes");
        else if (next === "disconnected") setStatus("Saving connection unavailable");
        else if (next === "connecting") setStatus("Connecting to local saving…");
      },
      onConflict: (next) => { setSyncConflict(next); setConflictPanelOpen(true); setStatus("Resolve conflicting changes"); },
      loadAuthoritative: () => loadDesigns().find((item) => item.id === design.id) ?? design,
      onSnapshot: (snapshot, source) => {
        const currentActivePageId = activePageIdRef.current;
        const localActivePageId = currentActivePageId && snapshot.pages.some((page) => page.id === currentActivePageId) ? currentActivePageId : snapshot.activePageId;
        activePageIdRef.current = localActivePageId;
        const displayedSnapshot = localActivePageId === snapshot.activePageId ? snapshot : { ...snapshot, activePageId: localActivePageId };
        setDesign(displayedSnapshot);
        setDesigns((items) => {
          const next = items.map((item) => item.id === snapshot.id ? snapshot : item);
          designsRef.current = next;
          return next;
        });
        if (source === "welcome" || source === "failover") { setHistory([]); setFuture([]); }
        setPageName(displayedSnapshot.pages.find((page) => page.id === displayedSnapshot.activePageId)?.name ?? displayedSnapshot.pages[0]?.name ?? "");
        setSelectedIds((ids) => ids.filter((id) => snapshot.pages.some((page) => page.objects.some((object) => object.id === id))));
        setSelectedId((id) => id && snapshot.pages.some((page) => page.objects.some((object) => object.id === id)) ? id : null);
      },
      persistPrimary: async () => { throw new Error("Design editor clients cannot persist directly."); },
    });
    syncRef.current = session;
    setSyncStatus(session.getStatus());
    return () => {
      session.close();
      if (syncRef.current === session) syncRef.current = null;
      setSyncStatus("disconnected");
    };
    // The client stays in its loaded design room while the shared runtime
    // serves persistence from whichever Studio route owns the lifetime lock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.id, loaded]);

  useEffect(() => {
    if (primaryWritable || designEditable) return;
    interactionRef.current = null;
    pageResizeRef.current = null;
    selectionStartRef.current = null;
    panRef.current = null;
    setSelectionBox(null); setGuides([]); setIsRotating(false); setRotationCursor(null);
  }, [designEditable, primaryWritable]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (activePage) setPageName(activePage.name); }, 0);
    return () => window.clearTimeout(timer);
  }, [activePage]);

  useEffect(() => {
    if (!loaded || urlHandoffApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const designId = params.get("designId");
    const pageId = params.get("pageId");
    const mediaId = params.get("mediaId");
    if (mediaId && design) {
      urlHandoffApplied.current = true;
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
    urlHandoffApplied.current = true;
    const opened = page.id === next.activePageId ? next : { ...next, activePageId: page.id };
    setDesign(opened); setPageName(page.name); setHistory([]); setFuture([]); selectObjects([]);
    window.history.replaceState({}, "", window.location.pathname);
  // The callback is declared below the effect; keep this URL handoff effect
  // tied to loading and the available design list to avoid a temporal dead zone.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, loaded]);

  useEffect(() => {
    if (!loaded || !design) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("designId") === design.id && params.get("pageId") === activePage?.id) return;
    params.set("designId", design.id);
    if (activePage) params.set("pageId", activePage.id);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [activePage, design, loaded]);

  const persist = useCallback(async (next: DesignProject, nextDesigns = designs) => {
    const baseDesigns = nextDesigns === designs ? designsRef.current : nextDesigns;
    const updated = baseDesigns.some((item) => item.id === next.id) ? baseDesigns.map((item) => item.id === next.id ? next : item) : [...baseDesigns, next];
    designsRef.current = updated;
    setDesigns(updated);
    const saveSequence = primaryWritable ? ++saveStatusSequenceRef.current : null;
    const saveStartedAt = primaryWritable ? Date.now() : 0;
    if (primaryWritable) setStatus("Saving…");
    else if (syncRef.current?.isConnectedPeer()) setStatus("Syncing changes");
    try {
      if (syncRef.current?.isConnectedPeer()) {
        await syncRef.current.submit(next);
        const remaining = SAVE_STATUS_MINIMUM_MS - (Date.now() - saveStartedAt);
        if (saveSequence !== null && remaining > 0) await new Promise<void>(resolve => window.setTimeout(resolve, remaining));
        if (saveSequence !== null && saveSequence !== saveStatusSequenceRef.current) return;
        setStatus(primaryWritable ? "Saved locally" : "Synced with another ACM Studio tab"); setError("");
      } else {
        setStatus(ownershipMessage(ownershipState) ?? "Read-only");
      }
    } catch (saveError) {
      if (saveSequence !== null && saveSequence !== saveStatusSequenceRef.current) return;
      setError(designSaveErrorMessage(saveError));
      setStatus(syncStatus === "conflict" ? "Resolve conflicting changes" : "Save failed — export an editable backup");
    }
  }, [designs, ownershipState, primaryWritable, syncStatus]);

  async function resolveDesignConflict(choice: "mine" | "theirs") {
    if (!syncConflict || !syncRef.current) return;
    try {
      setStatus("Syncing changes");
      await syncRef.current.resolveConflict(choice);
      setSyncConflict(null);
      setConflictPanelOpen(false);
      setError("");
      setStatus("Saved locally");
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "The conflict could not be resolved.");
      setStatus("Resolve conflicting changes");
    }
  }

  function updateDesign(next: DesignProject, record = true) {
    const normalised = { ...next, updatedAt: new Date().toISOString() };
    if (record && design) { setHistory((items) => [...items.slice(-49), cloneDesign(design)]); setFuture([]); }
    setDesign(normalised);
    void persist(normalised);
  }

  function updatePage(update: (page: DesignPage) => DesignPage, record = true) {
    if (!design || !activePage || !designEditable) return;
    updateDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? update(page) : page) }, record);
  }

  function undo() {
    if (!design || !history.length || !designEditable) return;
    const previous = history.at(-1)!;
    setHistory((items) => items.slice(0, -1)); setFuture((items) => [cloneDesign(design), ...items]); setDesign(previous); void persist(previous);
    restoreSelection(previous);
  }

  function redo() {
    if (!design || !future.length || !designEditable) return;
    const next = future[0];
    setFuture((items) => items.slice(1)); setHistory((items) => [...items.slice(-49), cloneDesign(design)]); setDesign(next); void persist(next);
    restoreSelection(next);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      if (isNativeEditingTarget(event.target) || event.isComposing) return;
      const primary = primaryShortcutModifier(event, navigator.platform);
      const zoomAction = workspaceZoomShortcut(event, true, navigator.platform);
      const historyAction = workspaceHistoryShortcut(event, navigator.platform);
      if (zoomAction) { event.preventDefault(); if (zoomAction === "reset") fitCanvasToView(); else changeZoomByKeyboard(zoomAction === "in" ? 1 : -1); }
      else if (historyAction) { event.preventDefault(); if (historyAction === "redo") redo(); else undo(); }
      else if (primary && !event.altKey && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); }
      else if (primary && !event.altKey && event.key.toLowerCase() === "c") { event.preventDefault(); copySelected(); }
      else if (primary && !event.altKey && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelected(); }
      else if (selectedId && designEditable && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); const amount = event.shiftKey ? 10 : 1; updateSelected((object) => ({ ...object, x: object.x + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0), y: object.y + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0) })); }
      else if (event.key === "Delete" || event.key === "Backspace") { if (selectedId && designEditable) { updatePage((page) => ({ ...page, objects: page.objects.filter((object) => object.id !== selectedId) })); selectObjects([]); } }
      else if (event.key === "Escape") {
        const interaction = interactionRef.current;
        const pageResize = pageResizeRef.current;
        if (interaction?.mode === "draw" || pageResize) setDesign((pageResize?.base ?? interaction?.base) ?? design);
        interactionRef.current = null; pageResizeRef.current = null; selectionStartRef.current = null; panRef.current = null; setIsRotating(false); setRotationCursor(null); setSelectionBox(null); setGuides([]); selectObjects([]); setShowMedia(false); setTool("select");
      }
    }
    window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.code === "Space" && !event.defaultPrevented && !event.isComposing && !isNativeEditingTarget(event.target) && !document.querySelector("dialog[open]")) { event.preventDefault(); setSpaceDown(true); } };
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

  function beginDraw(event: { clientX: number; clientY: number; pointerId: number; currentTarget: SVGElement }, drawTool: DrawTool) {
    if (!design || !activePage || !designEditable) return;
    const point = getPoint(event);
    const object = makeObject(drawTool, point.x, point.y, activePage, activePage.objects.filter((item) => item.type === "step").length, recentStylesRef.current, shapeKind);
    const initial = drawObject({ ...object, x: point.x, y: point.y, width: 1, height: 1 }, point, point, activePage);
    setDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? { ...page, objects: [...page.objects, initial] } : page) });
    selectObjects([initial.id]);
    interactionRef.current = { mode: "draw", id: initial.id, drawTool, shapeKind, startX: point.x, startY: point.y, original: cloneDesign(initial), base: cloneDesign(design) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!designEditable || !activePage) return;
    lastTextPointerRef.current = null;
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
    beginDraw(event, tool);
  }

  function onObjectPointerDown(event: PointerEvent<SVGGElement>, object: DesignObject) {
    event.preventDefault();
    event.stopPropagation();
    if (!activePage) return;
    const now = Date.now();
    const isTextDoubleClick = object.type === "text" && (event.detail > 1 || (lastTextPointerRef.current?.id === object.id && now - lastTextPointerRef.current.at < 500));
    if (object.type === "text") lastTextPointerRef.current = isTextDoubleClick ? null : { id: object.id, at: now };
    else lastTextPointerRef.current = null;
    if (isTextDoubleClick) {
      event.preventDefault();
      beginTextEditing(object);
      return;
    }
    if (tool !== "select" && tool !== "image") {
      beginDraw(event, tool);
      return;
    }
    const groupIds = object.groupId ? activePage.objects.filter((item) => item.groupId === object.groupId).map((item) => item.id) : [object.id];
    if (event.shiftKey) {
      const nextIds = selectedIds.includes(object.id) ? selectedIds.filter((id) => !groupIds.includes(id)) : [...new Set([...selectedIds, ...groupIds])];
      selectObjects(nextIds);
    } else if (!selectedIds.includes(object.id)) selectObjects([object.id]);
    if (!designEditable || object.locked || event.shiftKey) return;
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
    const xTargets: SnapTarget[] = [{ position: 0, style: "solid" }, { position: activePage.width / 2, style: "solid" }, { position: activePage.width, style: "solid" }, ...others.flatMap((item) => [{ position: item.x, style: "dotted" as const }, { position: item.x + item.width / 2, style: "dotted" as const }, { position: item.x + item.width, style: "dotted" as const }])];
    const yTargets: SnapTarget[] = [{ position: 0, style: "solid" }, { position: activePage.height / 2, style: "solid" }, { position: activePage.height, style: "solid" }, ...others.flatMap((item) => [{ position: item.y, style: "dotted" as const }, { position: item.y + item.height / 2, style: "dotted" as const }, { position: item.y + item.height, style: "dotted" as const }])];
    const xEdges = [object.x + dx, object.x + dx + object.width / 2, object.x + dx + object.width];
    const yEdges = [object.y + dy, object.y + dy + object.height / 2, object.y + dy + object.height];
    const nearest = (edges: number[], targets: SnapTarget[]) => edges.flatMap((edge) => targets.map((target) => ({ distance: Math.abs(target.position - edge), delta: target.position - edge, target }))).sort((a, b) => a.distance - b.distance)[0];
    const x = nearest(xEdges, xTargets); const y = nearest(yEdges, yTargets);
    return {
      dx: x && x.distance <= threshold ? dx + x.delta : dx,
      dy: y && y.distance <= threshold ? dy + y.delta : dy,
      guides: [x && x.distance <= threshold ? { axis: "x" as const, position: x.target.position, style: x.target.style } : null, y && y.distance <= threshold ? { axis: "y" as const, position: y.target.position, style: y.target.style } : null].filter((guide): guide is Guide => Boolean(guide)),
    };
  }

  function snapArrowEndpoint(object: DesignArrowObject, endpoint: "start" | "end", point: { x: number; y: number }) {
    if (!activePage || !snapEnabled) return { point, guides: [] as Guide[] };
    const threshold = 12;
    const others = activePage.objects.filter((item) => item.id !== object.id);
    const xTargets: SnapTarget[] = [{ position: 0, style: "solid" }, { position: activePage.width / 2, style: "solid" }, { position: activePage.width, style: "solid" }, ...others.flatMap((item) => [{ position: item.x, style: "dotted" as const }, { position: item.x + item.width / 2, style: "dotted" as const }, { position: item.x + item.width, style: "dotted" as const }])];
    const yTargets: SnapTarget[] = [{ position: 0, style: "solid" }, { position: activePage.height / 2, style: "solid" }, { position: activePage.height, style: "solid" }, ...others.flatMap((item) => [{ position: item.y, style: "dotted" as const }, { position: item.y + item.height / 2, style: "dotted" as const }, { position: item.y + item.height, style: "dotted" as const }])];
    const nearest = (value: number, targets: SnapTarget[]) => targets.map((target) => ({ distance: Math.abs(target.position - value), target })).sort((a, b) => a.distance - b.distance)[0];
    const x = nearest(point.x, xTargets); const y = nearest(point.y, yTargets);
    return {
      point: { x: x && x.distance <= threshold ? x.target.position : point.x, y: y && y.distance <= threshold ? y.target.position : point.y },
      guides: [x && x.distance <= threshold ? { axis: "x" as const, position: x.target.position, style: x.target.style } : null, y && y.distance <= threshold ? { axis: "y" as const, position: y.target.position, style: y.target.style } : null].filter((guide): guide is Guide => Boolean(guide)),
    };
  }

  function onResizeKeyDown(event: ReactKeyboardEvent<SVGElement>, object: DesignObject, handle: ResizeHandle) {
    if (!designEditable || object.locked || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => item.id === object.id ? resizeObject(item, handle, dx, dy, page, shouldKeepResizeRatio(item, event.shiftKey), false) : item) }));
  }

  function onRotateKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, object: DesignObject) {
    if (!designEditable || object.locked || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const rotation = rotationFromKey(object.rotation, event.key, event.shiftKey);
    if (rotation === null) return;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => item.id === object.id ? { ...item, rotation: rotationFromKey(item.rotation, event.key, event.shiftKey) ?? item.rotation } : item) }));
  }

  function onArrowEndpointKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") {
    if (!designEditable || object.locked || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => {
      if (item.id !== object.id || item.type !== "arrow") return item;
      const current = arrowEndpointPagePoint(item, endpoint);
      return resizeArrowEndpoint(item, endpoint, { x: current.x + dx, y: current.y + dy }, page);
    }) }));
  }

  function onResizePointerDown(event: PointerEvent<SVGElement>, object: DesignObject, handle: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (!designEditable || object.locked || !design) return;
    const point = getPoint(event);
    interactionRef.current = { mode: "resize", id: object.id, handle, keepRatio: shouldKeepResizeRatio(object, event.shiftKey), centred: event.altKey, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design) };
    setActiveHandle({ objectId: object.id, kind: "resize", handle });
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onPageResizeKeyDown(event: ReactKeyboardEvent<SVGCircleElement>, handle: ResizeHandle) {
    if (!designEditable || !activePage || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => resizePage(page, handle, dx, dy, !event.shiftKey));
  }

  function onPageResizePointerDown(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (!designEditable || !design || !activePage) return;
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    pageResizeRef.current = { handle, startClientX: event.clientX, startClientY: event.clientY, scaleX: rect.width / activePage.width, scaleY: rect.height / activePage.height, originalWidth: activePage.width, originalHeight: activePage.height, keepRatio: !event.shiftKey, base: cloneDesign(design) };
    setActiveHandle({ objectId: null, kind: "page-resize", handle });
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onRotatePointerDown(event: PointerEvent<SVGCircleElement>, object: DesignObject) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (!designEditable || object.locked || !design) return;
    const point = getPoint(event);
    interactionRef.current = { mode: "rotate", id: object.id, startX: point.x, startY: point.y, startAngle: rotationPointerAngle(object, point), original: cloneDesign(object), base: cloneDesign(design) };
    setActiveHandle({ objectId: object.id, kind: "rotate" });
    setIsRotating(true);
    setRotationCursor(point);
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onArrowEndpointPointerDown(event: PointerEvent<SVGCircleElement>, object: DesignArrowObject, endpoint: "start" | "end") {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (!designEditable || object.locked || !design) return;
    selectObjects([object.id]);
    const point = getPoint(event);
    interactionRef.current = { mode: "arrow-endpoint", id: object.id, endpoint, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design) };
    setActiveHandle({ objectId: object.id, kind: "endpoint", endpoint });
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onArrowBendPointerDown(event: PointerEvent<SVGRectElement>, object: DesignArrowObject, bendIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    if (!designEditable || object.locked || !design) return;
    selectObjects([object.id]);
    const point = getPoint(event);
    interactionRef.current = { mode: "arrow-bend", id: object.id, bendIndex, startX: point.x, startY: point.y, original: cloneDesign(object), base: cloneDesign(design) };
    setActiveHandle({ objectId: object.id, kind: "bend", bendIndex });
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function onArrowBendKeyDown(event: ReactKeyboardEvent<SVGRectElement>, object: DesignArrowObject, bendIndex: number) {
    if (!designEditable || object.locked || !activePage) return;
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      updatePage((page) => ({ ...page, objects: page.objects.map((item) => {
        if (item.id !== object.id || item.type !== "arrow") return item;
        const { start, end, bends } = arrowPoints(item);
        return { ...item, bends: bends.map((bend, index) => index === bendIndex ? { x: start.x + (end.x - start.x) / 2, y: start.y + (end.y - start.y) / 2 } : bend) };
      }) }));
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    updatePage((page) => ({ ...page, objects: page.objects.map((item) => {
      if (item.id !== object.id || item.type !== "arrow") return item;
      const bends = arrowPoints(item).bends.map((bend, index) => index === bendIndex ? constrainArrowBend(item, activePage, { x: bend.x + dx, y: bend.y + dy }) : bend);
      return { ...item, bends };
    }) }));
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLElement>) {
    if (!designEditable) return;
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
    const pageResize = pageResizeRef.current;
    if (pageResize && design && activePage) {
      const dx = (event.clientX - pageResize.startClientX) / pageResize.scaleX;
      const dy = (event.clientY - pageResize.startClientY) / pageResize.scaleY;
      const resized = resizePage({ ...activePage, width: pageResize.originalWidth, height: pageResize.originalHeight }, pageResize.handle, dx, dy, pageResize.keepRatio);
      setDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? resized : page) });
      return;
    }
    if (!interaction || !design || !activePage) return;
    const point = getPoint(event);
    if (interaction.mode === "rotate" || interaction.mode === "move") setRotationCursor(point);
    const dx = point.x - interaction.startX; const dy = point.y - interaction.startY;
    let nextObject: DesignObject = { ...interaction.original, x: Math.max(0, interaction.original.x + dx), y: Math.max(0, interaction.original.y + dy) };
    if (interaction.mode === "draw") {
      nextObject = drawObject(interaction.original, { x: interaction.startX, y: interaction.startY }, point, activePage);
    } else if (interaction.mode === "resize") {
      nextObject = resizeObject(interaction.original, interaction.handle ?? "se", dx, dy, activePage, Boolean(interaction.keepRatio), Boolean(interaction.centred));
    } else if (interaction.mode === "rotate") {
      nextObject = { ...interaction.original, rotation: rotationFromPointer(interaction.original, interaction.startAngle, point) };
    } else if (interaction.mode === "arrow-endpoint" && interaction.original.type === "arrow") {
      const endpointSnap = snapArrowEndpoint(interaction.original, interaction.endpoint ?? "end", point);
      setGuides(endpointSnap.guides);
      nextObject = resizeArrowEndpoint(interaction.original, interaction.endpoint ?? "end", endpointSnap.point, activePage);
    } else if (interaction.mode === "arrow-bend" && interaction.original.type === "arrow") {
      const bendSnap = snapArrowEndpoint(interaction.original, "start", point);
      setGuides(bendSnap.guides);
      const arrowOriginal = interaction.original as DesignArrowObject;
      const bends = arrowPoints(arrowOriginal).bends.map((bend, index) => index === interaction.bendIndex ? constrainArrowBend(arrowOriginal, activePage, { x: bendSnap.point.x - arrowOriginal.x, y: bendSnap.point.y - arrowOriginal.y }) : bend);
      nextObject = { ...interaction.original, bends };
    }
    const snap = interaction.mode === "move" && interaction.ids?.length === 1 && interaction.originals?.[0] ? snapMove(interaction.originals[0], dx, dy) : { dx, dy, guides: [] as Guide[] };
    if (interaction.mode === "move") setGuides(snap.guides);
    const movedObjects = interaction.mode === "move" && interaction.ids && interaction.originals
      ? new Map(interaction.originals.map((original) => [original.id, { ...original, x: Math.max(0, original.x + snap.dx), y: Math.max(0, original.y + snap.dy) }]))
      : null;
    setDesign({ ...design, pages: design.pages.map((page) => page.id === activePage.id ? { ...page, objects: page.objects.map((item) => movedObjects?.get(item.id) ?? (item.id === interaction.id ? nextObject : item)) } : page) });
  }

  function onCanvasPointerUp() {
    setActiveHandle(null);
    if (!designEditable) {
      interactionRef.current = null; pageResizeRef.current = null; selectionStartRef.current = null; panRef.current = null;
      setSelectionBox(null); setGuides([]); setIsRotating(false); setRotationCursor(null);
      return;
    }
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
    const pageResize = pageResizeRef.current;
    if (pageResize && design) {
      pageResizeRef.current = null;
      setHistory((items) => [...items.slice(-49), pageResize.base]); setFuture([]); void persist(cloneDesign(design));
      return;
    }
    if (!interaction || !design) { setIsRotating(false); setRotationCursor(null); return; }
    interactionRef.current = null;
    setIsRotating(false);
    setRotationCursor(null);
    setGuides([]);
    let current = cloneDesign(design);
    if (interaction.mode === "draw" && activePage) {
      const drawn = activePage.objects.find((object) => object.id === interaction.id);
      if (drawn && drawn.width <= 1 && drawn.height <= 1) {
        const fallback = makeObject(interaction.drawTool ?? "rectangle", Math.max(0, interaction.startX - 90), Math.max(0, interaction.startY - 50), activePage, activePage.objects.filter((item) => item.type === "step" && item.id !== drawn.id).length, recentStylesRef.current, interaction.shapeKind ?? shapeKind);
        const replacement = { ...fallback, id: drawn.id };
        current = { ...current, pages: current.pages.map((page) => page.id === activePage.id ? { ...page, objects: page.objects.map((object) => object.id === drawn.id ? replacement : object) } : page) };
        setDesign(current);
      }
      selectObjects([interaction.id]);
      setTool("select");
    }
    setHistory((items) => [...items.slice(-49), interaction.base]); setFuture([]); void persist(current);
  }

  const openMediaAsDesign = useCallback(async (asset: MediaAsset) => {
    if (!primaryWritable) { setError("Only the primary Studio tab can open Studio media as a new design."); return; }
    const dataUrl = await fileToDataUrl(asset.blob);
    const dimensions = await loadImage(dataUrl);
    const next = createDesign(asset.name.replace(/\.[^.]+$/, "") || "Image design");
    const designAsset: DesignAsset = { id: makeId("asset"), name: asset.name, type: asset.type, dataUrl, width: dimensions.width, height: dimensions.height };
    const scale = Math.min(1, 900 / dimensions.width, 700 / dimensions.height);
    const page = next.pages[0];
    const image = { id: makeId("object"), type: "image" as const, assetId: designAsset.id, x: Math.max(0, (page.width - dimensions.width * scale) / 2), y: Math.max(0, (page.height - dimensions.height * scale) / 2), width: dimensions.width * scale, height: dimensions.height * scale, rotation: 0, opacity: 1 };
    const opened = { ...next, assets: [designAsset], pages: [{ ...page, objects: [image] }] };
    const updated = [...designsRef.current, opened];
    setStatus("Saving…");
    try {
      await saveDesign(opened);
      designsRef.current = updated;
      setDesigns(updated); setDesign(opened); setPageName(page.name); setHistory([]); setFuture([]); selectObjects([]);
      setStatus("New design opened from Studio media");
    } catch (saveError) {
      setError(designSaveErrorMessage(saveError));
      setStatus("Save failed — export an editable backup");
    }
  }, [primaryWritable]);

  async function addImage(file: File | Blob, name = "Image") {
    if (!designEditable || !design || !activePage) return;
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
    if (!design || !activePage || !selectedObject || selectedObject.type !== "image" || selectedObject.locked || !designEditable || backgroundRemovalRef.current) return;
    const selectedAsset = design.assets.find((asset) => asset.id === selectedObject.assetId);
    const source = selectedAsset?.sourceAssetId ? design.assets.find((asset) => asset.id === selectedAsset.sourceAssetId) : selectedAsset;
    if (!source) return;
    const operation = new AbortController();
    backgroundRemovalRef.current = operation;
    setBackgroundProgress({ message: "Preparing image…" });
    setError("");
    try {
      const result = await removeImageBackground(source.dataUrl, operation.signal, setBackgroundProgress, backgroundMode, backgroundEdgeCleanup / 100);
      const dataUrl = await fileToDataUrl(result.blob);
      if (operation.signal.aborted || backgroundRemovalRef.current !== operation) return;
      if (!designEditable) throw new Error("The design connection was lost. Editing is paused.");
      // Clear before updateDesign: the result itself is an intentional edit.
      backgroundRemovalRef.current = null;
      setBackgroundProgress(null);
      const derived: DesignAsset = { id: makeId("asset"), name: `${source.name.replace(/\.[^.]+$/, "")}-background-removed.png`, type: "image/png", dataUrl, width: result.width, height: result.height, sourceAssetId: source.sourceAssetId ?? source.id };
      const nextObject = { ...selectedObject, assetId: derived.id };
      updateDesign({ ...design, assets: [...design.assets, derived], pages: design.pages.map((page) => page.id === activePage.id ? { ...page, objects: page.objects.map((object) => object.id === selectedObject.id ? nextObject : object) } : page) });
    } catch (backgroundError) {
      if (!operation.signal.aborted) setError(backgroundError instanceof Error ? backgroundError.message : "Background removal failed.");
    } finally {
      if (backgroundRemovalRef.current === operation) {
        backgroundRemovalRef.current = null;
        setBackgroundProgress(null);
      }
    }
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
    if (!primaryWritable) { setError("Only the primary Studio tab can use Studio files in the design editor."); return; }
    setShowMedia(true); setError("");
    try { setMediaAssets((await listMediaLibrary()).assets.filter((asset) => asset.type.startsWith("image/"))); }
    catch { setError("The Studio media library could not be read."); }
  }

  async function addMediaAsset(asset: MediaAsset) {
    if (!primaryWritable) return;
    await addImage(asset.blob, asset.name);
    setShowMedia(false);
  }

  function addPage(duplicate = false, afterPageId?: string) {
    if (!design || !activePage) return;
    const sourcePage = design.pages.find((item) => item.id === afterPageId) ?? activePage;
    const page: DesignPage = { ...cloneDesign(sourcePage), id: makeId("page"), name: duplicate ? `${sourcePage.name} copy` : nextPageName(design.pages), hidden: duplicate ? sourcePage.hidden : false, locked: duplicate ? sourcePage.locked : false, objects: duplicate ? sourcePage.objects.map((object) => ({ ...cloneDesign(object), id: makeId("object") })) : [] };
    const pages = [...design.pages];
    const insertAt = afterPageId ? pages.findIndex((item) => item.id === afterPageId) + 1 : pages.length;
    pages.splice(insertAt > 0 ? insertAt : pages.length, 0, page);
    updateDesign({ ...design, pages, activePageId: page.id }); setPageName(page.name); selectObjects([]);
  }

  function selectPage(id: string) {
    if (!design || !design.pages.some((page) => page.id === id)) return;
    activePageIdRef.current = id;
    setDesign({ ...design, activePageId: id });
    setPageName(design.pages.find((page) => page.id === id)?.name ?? "");
    selectObjects([]);
  }

  function selectPageSet(pageId: string, event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; checked: boolean }) {
    if (!design) return;
    const pageIds = design.pages.map((page) => page.id);
    const anchor = pageSelectionAnchorRef.current ?? pageId;
    let next = selectedPageIds;
    if (event.shiftKey && pageIds.includes(anchor)) {
      const start = pageIds.indexOf(anchor);
      const end = pageIds.indexOf(pageId);
      next = pageIds.slice(Math.min(start, end), Math.max(start, end) + 1);
    } else if (event.metaKey || event.ctrlKey) {
      next = selectedPageIds.includes(pageId) ? selectedPageIds.filter((id) => id !== pageId) : [...selectedPageIds, pageId];
    } else if (event.checked) {
      next = selectedPageIds.includes(pageId) ? selectedPageIds : [...selectedPageIds, pageId];
    } else if (!event.checked) {
      next = selectedPageIds.filter((id) => id !== pageId);
    }
    pageSelectionAnchorRef.current = pageId;
    setSelectedPageIds(next);
  }

  function startPageRename(id: string) {
    selectPage(id);
    window.setTimeout(() => pageNameInputRef.current?.focus(), 0);
  }

  const renamePageFromListener = useEffectEvent((pageId: string, name: string) => {
    const page = design?.pages.find(item => item.id === pageId);
    if (!design || !writable || !page || page.locked || page.name === name) return;
    updateDesign({ ...design, pages: design.pages.map(item => item.id === pageId ? { ...item, name } : item) });
  });
  useEffect(() => {
    function handlePageTitleDoubleClick(event: MouseEvent) {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".design-thumbnail-button > span") : null;
      const pageItem = target?.closest<HTMLElement>(".design-page-item");
      if (!target || !pageItem || !design || !writable) return;
      const index = Array.from(document.querySelectorAll(".design-page-item")).indexOf(pageItem);
      const page = design.pages[index];
      if (!page || page.locked || target.querySelector("input")) return;
      event.preventDefault();
      event.stopPropagation();
      const input = document.createElement("input");
      input.className = "design-page-title-input";
      input.value = page.name;
      input.disabled = !writable || Boolean(page.locked);
      input.setAttribute("aria-label", `Edit ${page.name}`);
      input.addEventListener("click", (clickEvent) => clickEvent.stopPropagation());
      let cancelled = false;
      const finish = () => {
        input.removeEventListener("blur", finish);
        const name = cancelled ? page.name : input.value.trim();
        target.textContent = `${index + 1}. ${name}`;
        if (!cancelled && name !== page.name) renamePageFromListener(page.id, name);
      };
      input.addEventListener("blur", finish);
      input.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter") { keyEvent.preventDefault(); input.blur(); }
        if (keyEvent.key === "Escape") { keyEvent.preventDefault(); cancelled = true; input.blur(); }
      });
      target.textContent = `${index + 1}. `;
      target.append(input);
      input.focus();
      input.select();
    }
    document.addEventListener("dblclick", handlePageTitleDoubleClick, true);
    return () => document.removeEventListener("dblclick", handlePageTitleDoubleClick, true);
  }, [design, writable]);

  function deletePageById(pageId: string) { if (!design || design.pages.length === 1) return; const index = design.pages.findIndex((page) => page.id === pageId); if (index < 0) return; const nextPage = design.pages[index - 1] ?? design.pages[index + 1]; updateDesign({ ...design, pages: design.pages.filter((page) => page.id !== pageId), activePageId: design.activePageId === pageId ? nextPage.id : design.activePageId }); if (design.activePageId === pageId) { setPageName(nextPage.name); selectObjects([]); } }

  function deletePage() {
    if (!design || !activePage || design.pages.length === 1) return;
    const requestedIds = selectedPageIds.length ? selectedPageIds : [activePage.id];
    const idsToDelete = new Set(requestedIds.filter((id) => design.pages.some((page) => page.id === id)));
    if (idsToDelete.size === design.pages.length) idsToDelete.delete(activePage.id);
    if (!idsToDelete.size) return;
    const firstDeletedIndex = design.pages.findIndex((page) => idsToDelete.has(page.id));
    const remainingPages = design.pages.filter((page) => !idsToDelete.has(page.id));
    const nextPage = remainingPages.find((page) => page.id === activePage.id) ?? remainingPages[Math.max(0, firstDeletedIndex - 1)] ?? remainingPages[0];
    if (!nextPage) return;
    updateDesign({ ...design, pages: remainingPages, activePageId: nextPage.id });
    setSelectedPageIds([]);
    pageSelectionAnchorRef.current = null;
    if (nextPage.id !== activePage.id) { setPageName(nextPage.name); selectObjects([]); }
  }

  function togglePageHidden(pageId: string) {
    if (!design || !writable) return;
    updateDesign({ ...design, pages: design.pages.map((page) => page.id === pageId ? { ...page, hidden: !page.hidden } : page) });
  }

  function togglePageLocked(pageId: string) {
    if (!design || !writable) return;
    const page = design.pages.find((item) => item.id === pageId);
    if (!page) return;
    updateDesign({ ...design, pages: design.pages.map((item) => item.id === pageId ? { ...item, locked: !item.locked } : item) });
    if (pageId === activePage?.id) selectObjects([]);
  }

  function setPagePreset(value: string) {
    const dimensions: Record<string, [number, number]> = { landscape: [1920, 1080], square: [1080, 1080], portrait: [1080, 1350], portraitStory: [1080, 1920] };
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
    const scroll = canvasScrollRef.current;
    const scrollStyle = window.getComputedStyle(scroll);
    const horizontalPadding = parseFloat(scrollStyle.paddingLeft) + parseFloat(scrollStyle.paddingRight);
    const verticalPadding = parseFloat(scrollStyle.paddingTop) + parseFloat(scrollStyle.paddingBottom);
    const scrollRect = scroll.getBoundingClientRect();
    const dock = document.querySelector<HTMLElement>(".design-zoom-dock");
    const dockRect = dock?.getBoundingClientRect();
    const dockOverlap = dockRect ? Math.max(0, Math.min(scrollRect.bottom, dockRect.bottom) - Math.max(scrollRect.top, dockRect.top)) : 0;
    const availableWidth = Math.max(1, scroll.clientWidth - horizontalPadding);
    const availableHeight = Math.max(1, scroll.clientHeight - verticalPadding - dockOverlap);
    const fitPercent = Math.min(availableWidth / activePage.width, availableHeight / activePage.height) * 100;
    const fittingZoom = Math.max(ZOOM_OPTIONS[0], Math.min(ZOOM_OPTIONS.at(-1) ?? 500, Math.floor(fitPercent)));
    setZoom(fittingZoom);
  }

  function changeZoom(direction: 1 | -1) {
    setZoom((value) => {
      const nextZoom = direction > 0
        ? ZOOM_SHORTCUT_STEPS.find((option) => option > value)
        : ZOOM_SHORTCUT_STEPS.findLast((option) => option < value);
      return nextZoom ?? (direction > 0 ? ZOOM_SHORTCUT_STEPS.at(-1) ?? 500 : ZOOM_SHORTCUT_STEPS[0]);
    });
  }

  function changeZoomByKeyboard(direction: 1 | -1) {
    setZoom((value) => Math.max(ZOOM_OPTIONS[0], Math.min(ZOOM_OPTIONS.at(-1) ?? 500, value + direction * 10)));
  }

  function renamePage() { const name = pageName.trim(); if (!activePage || name === activePage.name) { setPageName(activePage?.name ?? ""); return; } setError(""); updatePage((page) => ({ ...page, name })); }

  function duplicatePage(sourceId: string) {
    if (!design) return;
    const source = design.pages.find((page) => page.id === sourceId);
    if (!source) return;
    const page: DesignPage = { ...cloneDesign(source), id: makeId("page"), name: `${source.name} copy`, objects: source.objects.map((object) => ({ ...cloneDesign(object), id: makeId("object") })) };
    const pages = [...design.pages];
    const insertAt = pages.findIndex((item) => item.id === sourceId) + 1;
    pages.splice(insertAt > 0 ? insertAt : pages.length, 0, page);
    updateDesign({ ...design, pages, activePageId: page.id }); setPageName(page.name); selectObjects([]);
  }

  function movePageById(pageId: string, direction: -1 | 1) {
    if (!design) return;
    const index = design.pages.findIndex((page) => page.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= design.pages.length) return;
    const pages = [...design.pages]; [pages[index], pages[target]] = [pages[target], pages[index]];
    updateDesign({ ...design, pages });
  }

  function reorderPage(sourceId: string, targetId: string, position: "before" | "after" = "after") {
    if (!design || !writable || sourceId === targetId) return false;
    const pages = reorderedPages(design.pages, sourceId, targetId, position);
    if (!pages) return false;
    updateDesign({ ...design, pages });
    return true;
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
    if (!design || !activePage || !selectedId || !designEditable) return;
    const selected = activePage.objects.find((object) => object.id === selectedId);
    if (!selected) return;
    const copy = { ...cloneDesign(selected), id: makeId("object"), x: selected.x + 20, y: selected.y + 20 };
    updatePage((page) => ({ ...page, objects: [...page.objects, copy] }));
    selectObjects([copy.id]);
  }

  function moveLayer(objectId: string, direction: LayerMoveDirection) {
    if (!activePage || !designEditable) return;
    const objects = moveDesignLayer(activePage.objects, objectId, direction);
    if (objects === activePage.objects) return;
    updatePage((page) => ({ ...page, objects }));
  }

  function moveSelectedLayer(direction: LayerMoveDirection) {
    if (selectedId) moveLayer(selectedId, direction);
  }

  function reorderLayer(sourceId: string, targetId: string, position: LayerDropPosition) {
    if (!activePage || !designEditable || sourceId === targetId) return;
    const objects = reorderDesignLayers(activePage.objects, sourceId, targetId, position);
    if (objects === activePage.objects) return;
    updatePage((page) => ({ ...page, objects }));
    selectObjects([sourceId]);
  }

  const objectClipboardRef = useRef<DesignObject[]>([]);

  function copySelected() {
    if (!activePage || !selectedIds.length) return;
    objectClipboardRef.current = activePage.objects.filter((object) => selectedIds.includes(object.id)).map((object) => cloneDesign(object));
  }

  function pasteSelected() {
    if (!activePage || !designEditable || !objectClipboardRef.current.length) return;
    const copies = objectClipboardRef.current.map((object) => ({ ...cloneDesign(object), id: makeId("object"), x: object.x + 24, y: object.y + 24 }));
    updatePage((page) => ({ ...page, objects: [...page.objects, ...copies] }));
    selectObjects(copies.map((object) => object.id));
  }

  function toggleSelectedLock() {
    if (!activePage || !designEditable || !selectedIds.length) return;
    const selected = activePage.objects.filter((object) => selectedIds.includes(object.id));
    const lockSelection = selected.some((object) => !object.locked);
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => selectedIds.includes(object.id) ? { ...object, locked: lockSelection } : object) }));
  }

  function linkSelected() {
    setStatus("Linking design objects is not available yet");
  }

  function groupSelected() {
    if (!designEditable || selectedIds.length < 2) return;
    const groupId = makeId("group");
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => selectedIds.includes(object.id) ? { ...object, groupId } : object) }));
  }

  function ungroupSelected() {
    if (!designEditable || !selectedIds.length) return;
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => {
      if (!selectedIds.includes(object.id)) return object;
      const ungrouped = { ...object };
      delete ungrouped.groupId;
      return ungrouped;
    }) }));
  }

  function alignSelected(axis: "left" | "centre" | "right" | "top" | "middle" | "bottom") {
    if (!activePage || !designEditable || selectedIds.length < 2) return;
    const selected = activePage.objects.filter((object) => selectedIds.includes(object.id));
    const bounds = { left: Math.min(...selected.map((object) => object.x)), top: Math.min(...selected.map((object) => object.y)), right: Math.max(...selected.map((object) => object.x + object.width)), bottom: Math.max(...selected.map((object) => object.y + object.height)) };
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => {
      if (!selectedIds.includes(object.id)) return object;
      const x = axis === "left" ? bounds.left : axis === "centre" ? (bounds.left + bounds.right - object.width) / 2 : axis === "right" ? bounds.right - object.width : object.x;
      const y = axis === "top" ? bounds.top : axis === "middle" ? (bounds.top + bounds.bottom - object.height) / 2 : axis === "bottom" ? bounds.bottom - object.height : object.y;
      return { ...object, x, y };
    }) }));
  }

  function alignSelectedToPage(axis: PositionAxis) {
    if (!activePage || !designEditable || !selectedIds.length || !activePage.objects.some((object) => selectedIds.includes(object.id) && !object.locked)) return;
    updatePage((page) => ({ ...page, objects: page.objects.map((object) => {
      if (!selectedIds.includes(object.id) || object.locked) return object;
      const x = axis === "left" ? 0 : axis === "centre" ? (page.width - object.width) / 2 : axis === "right" ? page.width - object.width : object.x;
      const y = axis === "top" ? 0 : axis === "middle" ? (page.height - object.height) / 2 : axis === "bottom" ? page.height - object.height : object.y;
      return { ...object, x, y };
    }) }));
  }

  async function createNewDesign() {
    if (!primaryWritable) { setError("Only the primary Studio tab can create a new design."); return; }
    const next = createDesign();
    const updated = [...designsRef.current, next];
    setStatus("Saving…");
    try {
      await saveDesign(next);
      designsRef.current = updated;
      setDesigns(updated); setDesign(next); setHistory([]); setFuture([]); selectObjects([]); setPageName(next.pages[0].name);
      setStatus("Saved locally just now");
    } catch (saveError) {
      setError(designSaveErrorMessage(saveError));
      setStatus("Save failed — export an editable backup");
    }
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
    if (!primaryWritable) { setError("Only the primary Studio tab can write to Studio media."); return; }
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
    if (!primaryWritable) { setError("Only the primary Studio tab can write to Studio media."); return; }
    try {
      setStatus("Updating the selected Studio media…");
      const blob = await renderPage(page, design?.assets ?? [], exportFormat, exportScale, exportQuality);
      await replaceMediaAssetContent(page.renderedMediaId, blob, `image/${exportFormat}`);
      setStatus("Selected Studio media updated");
    } catch (replaceError) { setError(replaceError instanceof Error ? replaceError.message : "The selected Studio media could not be updated."); }
  }

  function exportDesignJson() { if (!design) return; downloadBlob(new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }), `${sanitiseFilename(design.name)}.acm-design.json`); }

  async function importDesign(file: File | undefined) {
    if (!file || !primaryWritable) return;
    try {
      const imported = migrateDesignProject(JSON.parse(await file.text()));
      for (const asset of imported.assets) {
        const dimensions = await loadImage(asset.dataUrl);
        if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw new Error(`The image “${asset.name}” has invalid dimensions.`);
      }
      const copy = { ...imported, id: makeId("design"), name: `${imported.name} copy`, updatedAt: new Date().toISOString() };
      const updated = [...designsRef.current, copy];
      setStatus("Saving…");
      await saveDesign(copy);
      designsRef.current = updated;
      setDesigns(updated); setDesign(copy); setStatus("Design imported");
    }
    catch (importError) {
      setError(designSaveErrorMessage(importError, "The design file could not be imported."));
      setStatus(isDesignStorageQuotaError(importError) ? "Save failed — export an editable backup" : "Import failed");
    }
    finally { if (importInputRef.current) importInputRef.current.value = ""; }
  }

  if (!loaded || !design || !activePage) return <div className="design-loading">Loading the design canvas…</div>;

  return <div className="design-shell" onPaste={handlePaste}>
      <header className="design-topbar">
        <div className="design-topbar-brand"><span className="design-topbar-mark" aria-hidden="true">A</span><a href="/studio" aria-label="ACM Studio home">ACM Studio</a><span className="design-topbar-divider" aria-hidden="true">|</span><strong>Designs</strong></div>
        <span className="design-environment" aria-label="Environment: local">Local</span>
      </header>
      <StudioRibbon
        className="design-ribbon-panel"
        tabs={studioRibbonTabs}
        activeTab={ribbonTab}
        onTabChange={handleRibbonTabChange}
        accessibleName="Design tools"
        brand={<><a href="/studio" aria-label="Back to ACM Studio">ACM Studio</a><span aria-hidden="true">/</span><input aria-label="Design name" value={design.name} disabled={!writable} onChange={(event) => updateDesign({ ...design, name: event.target.value })} /></>}
        status={<span>{status}</span>}
      >
        <StudioRibbonPanel tab="file">
          <StudioRibbonGroup label="Designs">
            <StudioRibbonButton size="large" onClick={() => { window.location.href = "/studio/designs/library"; }}><StudioIcon name="archive" size={24} /><span>All designs</span></StudioRibbonButton>
          </StudioRibbonGroup>
        </StudioRibbonPanel>
        <StudioRibbonPanel tab="home">
          <StudioRibbonGroup label="History">
            <HistoryActions presentation="ribbon" onUndo={undo} onRedo={redo} canUndo={Boolean(history.length)} canRedo={Boolean(future.length)} disabled={!writable} />
          </StudioRibbonGroup>
          <StudioRibbonGroup label="Pages">
            <StudioRibbonButton size="large" onClick={() => setPagesCollapsed((value) => !value)} aria-expanded={!pagesCollapsed} aria-controls="design-pages-panel"><StudioIcon name="archive" size={24} /><span>{pagesCollapsed ? "Show pages" : "Hide pages"}</span></StudioRibbonButton>
          </StudioRibbonGroup>
          <StudioRibbonGroup label="Studio">
            <StudioRibbonButton onClick={() => void savePageToStudioMedia(activePage)} disabled={!writable}><StudioIcon name="folder" size={22} /><span>Save to Studio media</span></StudioRibbonButton>
            {mediaHandoff ? <><a className="design-ribbon-link" href={`/studio?designMedia=${encodeURIComponent(mediaHandoff)}&designTarget=block`}>Insert into document</a><a className="design-ribbon-link" href={`/studio?designMedia=${encodeURIComponent(mediaHandoff)}&designTarget=cover`}>Use as cover</a></> : null}
          </StudioRibbonGroup>
        </StudioRibbonPanel>
        <StudioRibbonPanel tab="insert">
          <StudioRibbonGroup label="Insert">
            <StudioRibbonButton size="large" active={tool === "select"} onClick={() => setTool("select")} aria-pressed={tool === "select"}><StudioIcon name={toolIcons.select} size={24} /><span>Select</span></StudioRibbonButton>
            <StudioRibbonButton size="large" onClick={() => fileInputRef.current?.click()} disabled={!writable}><StudioIcon name={toolIcons.image} size={24} /><span>Image</span></StudioRibbonButton>
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file, file.name); if (fileInputRef.current) fileInputRef.current.value = ""; }} />
            <label className={`design-ribbon-shape-picker${tool === "rectangle" ? " is-active" : ""}`}><StudioIcon name={toolIcons.rectangle} size={24} /><span>Shapes</span><select aria-label="Shapes" value={shapeKind} disabled={!writable} onChange={(event) => { setShapeKind(event.target.value as DesignShapeKind); setTool("rectangle"); }}><option value="rectangle">Square</option>{shapeOptions.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            {annotationTools.map((item) => <StudioRibbonButton size="large" type="button" key={item} active={tool === item} onClick={() => setTool(item)} disabled={!writable} aria-pressed={tool === item}><StudioIcon name={toolIcons[item]} size={24} /><span>{toolLabels[item]}</span></StudioRibbonButton>)}
            <StudioRibbonButton size="large" ref={mediaTriggerRef} onClick={() => void openMedia()} disabled={!writable}><StudioIcon name="image" size={24} /><span>Studio files</span></StudioRibbonButton>
            <StudioRibbonButton size="large" active={purpleSelectionBorder} onClick={() => setPurpleSelectionBorder((value) => !value)} aria-pressed={purpleSelectionBorder} aria-label="Purple selection border"><StudioIcon name="block" size={24} /><span>Purple border</span></StudioRibbonButton>
          </StudioRibbonGroup>
        </StudioRibbonPanel>
        <StudioRibbonPanel tab="arrange">
          <StudioRibbonGroup label="Arrange">
            <StudioRibbonButton onClick={() => moveSelectedLayer("backward")} disabled={!selectedObject || !writable || Boolean(selectedObject.locked)}><StudioIcon name="arrow-left" size={22} /><span>Send backward</span></StudioRibbonButton>
            <StudioRibbonButton onClick={() => moveSelectedLayer("forward")} disabled={!selectedObject || !writable || Boolean(selectedObject.locked)}><StudioIcon name="arrow-right" size={22} /><span>Bring forward</span></StudioRibbonButton>
            <StudioRibbonButton onClick={() => moveSelectedLayer("back")} disabled={!selectedObject || !writable || Boolean(selectedObject.locked)}><StudioIcon name="arrow-down" size={22} /><span>Send to back</span></StudioRibbonButton>
            <StudioRibbonButton onClick={() => moveSelectedLayer("front")} disabled={!selectedObject || !writable || Boolean(selectedObject.locked)}><StudioIcon name="arrow-up" size={22} /><span>Bring to front</span></StudioRibbonButton>
            <StudioRibbonButton onClick={duplicateSelected} disabled={!selectedObject || !writable}><StudioIcon name="copy" size={22} /><span>Duplicate</span></StudioRibbonButton>
          </StudioRibbonGroup>
        </StudioRibbonPanel>
        <StudioRibbonPanel tab="view">
          <StudioRibbonGroup label="Canvas view">
            <StudioRibbonButton onClick={() => changeZoom(-1)}><StudioIcon name="zoom-out" size={24} /><span>Zoom out</span></StudioRibbonButton>
            <label className="acm-ribbon-field">Zoom<select aria-label="Zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{ZOOM_OPTIONS.map((option) => <option key={option} value={option}>{option}%</option>)}</select></label>
            <StudioRibbonButton onClick={() => changeZoom(1)}><StudioIcon name="zoom-in" size={24} /><span>Zoom in</span></StudioRibbonButton>
            <StudioRibbonButton onClick={fitCanvasToView}><StudioIcon name="fit" size={24} /><span>Fit canvas</span></StudioRibbonButton>
            <StudioRibbonButton active={allPagesVisible} onClick={() => setAllPagesVisible((value) => !value)} aria-pressed={allPagesVisible}><StudioIcon name="archive" size={24} /><span>{allPagesVisible ? "Single page" : "All pages"}</span></StudioRibbonButton>
            <StudioRibbonButton active={snapEnabled} onClick={() => { setSnapEnabled((value) => !value); setGuides([]); }} aria-pressed={snapEnabled}><StudioIcon name="align-centre" size={24} /><span>Snap {snapEnabled ? "on" : "off"}</span></StudioRibbonButton>
          </StudioRibbonGroup>
        </StudioRibbonPanel>
        <StudioRibbonPanel tab="export">
          <StudioRibbonGroup label="Export settings">
            <label className="acm-ribbon-field">Format<select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)} aria-label="Export format"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
            <label className="acm-ribbon-field">Scale<select value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))} aria-label="Export scale"><option value="1">100%</option><option value="2">200%</option></select></label>
            <label className="acm-ribbon-field">Quality<select value={exportQuality} onChange={(event) => setExportQuality(Number(event.target.value))} aria-label="Export quality"><option value=".92">High quality</option><option value=".75">Smaller file</option></select></label>
          </StudioRibbonGroup>
          <StudioRibbonGroup label="Export">
            <StudioRibbonButton onClick={() => void exportPage(activePage)}><StudioIcon name="download" size={22} /><span>Export page</span></StudioRibbonButton>
            <StudioRibbonButton onClick={() => void exportSelectedPages()} disabled={!selectedPageIds.length}><StudioIcon name="download" size={22} /><span>Export selected</span></StudioRibbonButton>
            <StudioRibbonButton onClick={() => void exportAllPages()}><StudioIcon name="download" size={22} /><span>Export all pages</span></StudioRibbonButton>
            <StudioRibbonButton onClick={exportDesignJson}><StudioIcon name="file" size={22} /><span>Editable backup</span></StudioRibbonButton>
            {activePage.renderedMediaId ? <StudioRibbonButton onClick={() => void replaceLinkedStudioMedia(activePage)} disabled={!writable}>Update linked media</StudioRibbonButton> : null}
          </StudioRibbonGroup>
        </StudioRibbonPanel>
      </StudioRibbon>
    {!peerWritable && syncStatus !== "connecting" && syncStatus !== "disconnected" && ownershipMessage(ownershipState) ? <div className="design-notice" role="status">{ownershipMessage(ownershipState)}{ownershipState === "waiting" ? " Close the other editing tab before making changes." : ""}</div> : null}
    {syncStatus === "unsupported" ? <div className="design-notice" role="status">Read-only: this browser cannot connect to safe local design saving. Export an editable backup before closing this tab.</div> : null}
    {syncStatus === "disconnected" || syncStatus === "connecting" ? <div className="design-notice" role="status">{syncStatus === "connecting" ? "Connecting to safe local saving…" : "Local saving is unavailable — your design is preserved and editing is paused."}<button type="button" onClick={() => { syncRef.current?.retryConnection(); if (studioWriteOwnership.getState() === "waiting") setOwnershipAttempt(value => value + 1); else if (studioWriteOwnership.canWrite()) setBootstrapAttempt(value => value + 1); }}>Try Editing Here</button><button type="button" onClick={exportDesignJson}>Export Editable Backup</button></div> : null}
    {syncConflict && !conflictPanelOpen ? <div className="design-notice" role="status">Conflicting changes need review. <button ref={conflictReviewButtonRef} type="button" onClick={() => setConflictPanelOpen(true)}>Review conflicts</button></div> : null}
    {error ? <div className="design-error" role="alert">{error}</div> : null}
    {syncConflict && conflictPanelOpen ? <StudioDialog title="Resolve conflicting changes" closeLabel="Close conflict review" returnFocus={conflictReviewButtonRef} className="design-conflict-panel" onClose={() => setConflictPanelOpen(false)}>

      <p>{syncConflict.reason}</p>
      <p>{syncConflict.result.conflicts.length || 1} change{syncConflict.result.conflicts.length === 1 ? "" : "s"} needs your decision. Your document remains protected until you choose a version.</p>
      {syncConflict.result.conflicts.length ? <ul className="design-conflict-list" aria-label="Conflicting values">{syncConflict.result.conflicts.map((conflict, index) => { const details = conflictDetails(conflict); return <li key={`${details.target}-${index}`}><strong>{details.target}</strong><span><b>Other:</b> {details.other}</span><span><b>Yours:</b> {details.yours}</span></li>; })}</ul> : null}
      <div className="design-conflict-actions"><button type="button" className="button-secondary" disabled={syncStatus !== "conflict"} onClick={() => void resolveDesignConflict("theirs")}>Use Other Change</button><button type="button" className="button-primary" disabled={syncStatus !== "conflict"} onClick={() => void resolveDesignConflict("mine")}>Use My Change</button></div>
    </StudioDialog> : null}
    <div className={`design-workspace${pagesCollapsed ? " pages-collapsed" : ""}${inspectorCollapsed ? " inspector-collapsed" : ""}`}
      style={{ "--design-pages-width": `${pagesCollapsed ? 0 : pagesPaneWidth}px`, "--design-inspector-width": `${inspectorCollapsed ? 0 : inspectorPaneWidth}px` } as CSSProperties}>
    <Pane trackClassName="design-pages-track" className="design-pages" flushRegions={["body"]} bodyClassName="design-pages-body" label="Design pages and layers" side="left" width={pagesPaneWidth} onWidthChange={setPagesPaneWidth} minWidth={224} maxWidth={480} collapsed={pagesCollapsed} onCollapsedChange={setPagesCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
      header={<div className="design-pages-heading"><PaneTabs id={designNavigationTabsId} label="Design navigation" className="design-pane-tabs" tabs={[{ id: "pages", label: "Pages" }, { id: "layers", label: "Layers" }]} active={leftPaneTab} onChange={(tab) => setLeftPaneTab(tab as "pages" | "layers")} /><div><button type="button" onClick={() => addPage()} disabled={!writable} aria-label="Add page">＋</button></div></div>}
      footer={<><div className="design-page-actions"><button type="button" onClick={() => addPage()} disabled={!writable}>Add page</button><button type="button" onClick={deletePage} disabled={!writable || design.pages.length === 1}>Delete page</button><button type="button" onClick={() => void createNewDesign()} disabled={!primaryWritable}>New design</button></div><label className="design-import-label">Import design<input ref={importInputRef} type="file" accept="application/json,.json" disabled={!primaryWritable} onChange={(event) => void importDesign(event.target.files?.[0])} /></label><select className="design-switcher" value={design.id} disabled={!primaryWritable} onChange={(event) => { if (!primaryWritable) return; const next = designs.find((item) => item.id === event.target.value); if (next) { setDesign(next); setPageName(next.pages.find((page) => page.id === next.activePageId)?.name ?? ""); setHistory([]); setFuture([]); selectObjects([]); } }} aria-label="Open design">{designs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></>}>
      <PaneTabPanel className="design-page-list" id={designNavigationTabsId} tab="pages" active={leftPaneTab}>
        <div className="design-page-gap-list" {...pageReorder.listProps}>
        {design.pages.map((page, index) => <div className={`design-page-item${page.id === activePage.id ? " is-active" : ""}`} key={page.id} {...pageReorder.rowProps(page.id)} draggable={writable} onDragStart={event => pageReorder.start(event, page.id)} onDragEnd={pageReorder.cancel}><div className="design-page-item-actions"><button type="button" onClick={() => startPageRename(page.id)} disabled={!writable} aria-label={`Rename ${page.name}`}>✎</button><button type="button" onClick={() => duplicatePage(page.id)} disabled={!writable} aria-label={`Duplicate ${page.name}`}>⧉</button><button type="button" onClick={() => movePageById(page.id, -1)} disabled={!writable || index === 0} aria-label={`Move ${page.name} earlier`}>↑</button><button type="button" onClick={() => movePageById(page.id, 1)} disabled={!writable || index === design.pages.length - 1} aria-label={`Move ${page.name} later`}>↓</button><button type="button" onClick={() => deletePageById(page.id)} disabled={!writable || design.pages.length === 1} aria-label={`Delete ${page.name}`}><StudioIcon name="trash" size={20} /></button></div><label className="design-page-select"><input type="checkbox" checked={selectedPageIds.includes(page.id)} onChange={(event) => setSelectedPageIds((items) => event.target.checked ? [...items, page.id] : items.filter((id) => id !== page.id))} aria-label={`Select ${page.name} for export`} /></label><button {...pageReorder.handleProps(page.id)} type="button" className="design-thumbnail-button" onClick={() => selectPage(page.id)} aria-label={`Open ${page.name}`}><div className="design-thumbnail"><DesignPageArtwork page={page} assets={design.assets} checkerboard className="design-page-svg" /></div><span>{index + 1}. {page.name}</span></button></div>)}
      <DragPlacementIndicator line={pageReorder.line} /></div></PaneTabPanel>
      <PaneTabPanel className="design-pages-layers" id={designNavigationTabsId} tab="layers" active={leftPaneTab}>
        <LayerList page={activePage} selectedIds={selectedIds} writable={designEditable} onSelect={(id) => selectObjects([id])} onReorder={reorderLayer} />
      </PaneTabPanel>
    </Pane>
      <section className="design-main" aria-label="Design Canvas">
        <div className="design-canvas-area" onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><div className="design-canvas-heading"><div><span>Page {design.pages.findIndex((page) => page.id === activePage.id) + 1}</span><input ref={pageNameInputRef} aria-label="Page name" value={pageName} disabled={!writable} onChange={(event) => setPageName(event.target.value)} onBlur={renamePage} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } if (event.key === "Escape") { setPageName(activePage.name); event.currentTarget.blur(); } }} /></div><div className="design-canvas-heading-actions" aria-label={`Page ${activePageIndex + 1} actions`}><button type="button" onClick={() => movePageById(activePage.id, -1)} disabled={!writable || activePageIndex === 0} aria-label={`Move page ${activePageIndex + 1} earlier`}><StudioIcon name="arrow-up" size={24} /></button><button type="button" onClick={() => movePageById(activePage.id, 1)} disabled={!writable || activePageIndex === design.pages.length - 1} aria-label={`Move page ${activePageIndex + 1} later`}><StudioIcon name="arrow-down" size={24} /></button><button type="button" className={activePage.hidden ? "is-active" : ""} onClick={() => togglePageHidden(activePage.id)} aria-pressed={Boolean(activePage.hidden)} aria-label={activePage.hidden ? `Show page ${activePageIndex + 1}` : `Hide page ${activePageIndex + 1}`}><StudioIcon name={activePage.hidden ? "visibility-off" : "visibility"} size={24} /></button><button type="button" className={activePage.locked ? "is-active" : ""} onClick={() => togglePageLocked(activePage.id)} aria-pressed={Boolean(activePage.locked)} aria-label={activePage.locked ? `Unlock page ${activePageIndex + 1}` : `Lock page ${activePageIndex + 1}`}><StudioIcon name={activePage.locked ? "lock" : "lock-open"} size={24} /></button><button type="button" onClick={() => duplicatePage(activePage.id)} disabled={!writable} aria-label={`Duplicate page ${activePageIndex + 1}`}><StudioIcon name="copy" size={24} /></button><button type="button" onClick={() => deletePageById(activePage.id)} disabled={!writable || design.pages.length === 1} aria-label={`Delete page ${activePageIndex + 1}`}><StudioIcon name="trash" size={24} /></button><button type="button" onClick={() => addPage(false, activePage.id)} disabled={!writable} aria-label={`Add page after page ${activePageIndex + 1}`}><StudioIcon name="add" size={24} /></button></div><div className="design-zoom"><button type="button" aria-label="Zoom out" onClick={() => changeZoom(-1)}>−</button><select aria-label="Zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{ZOOM_OPTIONS.map((option) => <option key={option} value={option}>{option}%</option>)}</select><button type="button" aria-label="Zoom in" onClick={() => changeZoom(1)}>+</button><button type="button" onClick={fitCanvasToView}>Fit</button><button type="button" onClick={() => setZoom(100)}>100%</button><button type="button" className={allPagesVisible ? "is-active" : ""} aria-pressed={allPagesVisible} aria-label={allPagesVisible ? "View single page" : "View all pages"} onClick={() => setAllPagesVisible((value) => !value)}>{allPagesVisible ? "View single page" : "View all pages"}</button><button type="button" className={snapEnabled ? "is-active" : ""} aria-pressed={snapEnabled} onClick={() => { setSnapEnabled((value) => !value); setGuides([]); }}>Snap {snapEnabled ? "on" : "off"}</button></div></div><div className={`design-canvas-scroll${allPagesVisible ? " is-all-pages" : ""}`} ref={canvasScrollRef}>
          {allPagesVisible ? <div className="design-all-pages">{design.pages.map((page, index) => {
            const isActive = page.id === activePage.id;
            const title = page.name === `Page ${index + 1}` ? "" : page.name;
            const selectInactivePage = (event: PointerEvent<SVGElement>) => { event.stopPropagation(); selectPage(page.id); };
            const pageTitleInput = <input ref={isActive ? pageNameInputRef : undefined} className={title ? "has-title" : "is-placeholder"} value={isActive ? (pageName === `Page ${index + 1}` ? "" : pageName) : title} placeholder="Add page title" readOnly={!isActive} disabled={!writable || page.locked} aria-label={title ? `Edit page title: ${title}` : "Add page title"} onFocus={() => { if (!isActive) startPageRename(page.id); }} onClick={() => { if (!isActive) startPageRename(page.id); }} onChange={(event) => { if (isActive) setPageName(event.target.value); }} onBlur={isActive ? renamePage : undefined} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setPageName(activePage.name); event.currentTarget.blur(); } }} />;
            return <article className={`design-all-page${isActive ? " is-active" : ""}${page.hidden ? " is-hidden" : ""}${page.locked ? " is-locked" : ""}`} key={page.id} aria-label={`Page ${index + 1}${title ? `: ${title}` : ""}${page.hidden ? " (hidden)" : ""}${page.locked ? " (locked)" : ""}`}>
              <div className="design-all-page-heading" style={{ width: `${page.width * zoom / 100}px` }}><div className="design-all-page-title"><strong>Page {index + 1}</strong><span aria-hidden="true">-</span>{pageTitleInput}</div><div className="design-all-page-actions" aria-label={`Page ${index + 1} actions`}><button type="button" onClick={() => movePageById(page.id, -1)} disabled={!writable || index === 0} aria-label={`Move page ${index + 1} earlier`}><StudioIcon name="arrow-up" size={24} /></button><button type="button" onClick={() => movePageById(page.id, 1)} disabled={!writable || index === design.pages.length - 1} aria-label={`Move page ${index + 1} later`}><StudioIcon name="arrow-down" size={24} /></button><button type="button" className={page.hidden ? "is-active" : ""} onClick={() => togglePageHidden(page.id)} aria-pressed={Boolean(page.hidden)} aria-label={page.hidden ? `Show page ${index + 1}` : `Hide page ${index + 1}`}><StudioIcon name={page.hidden ? "visibility-off" : "visibility"} size={24} /></button><button type="button" className={page.locked ? "is-active" : ""} onClick={() => togglePageLocked(page.id)} aria-pressed={Boolean(page.locked)} aria-label={page.locked ? `Unlock page ${index + 1}` : `Lock page ${index + 1}`}><StudioIcon name={page.locked ? "lock" : "lock-open"} size={24} /></button><button type="button" onClick={() => duplicatePage(page.id)} disabled={!writable} aria-label={`Duplicate page ${index + 1}`}><StudioIcon name="copy" size={24} /></button><button type="button" onClick={() => deletePageById(page.id)} disabled={!writable || design.pages.length === 1} aria-label={`Delete page ${index + 1}`}><StudioIcon name="trash" size={24} /></button><button type="button" onClick={() => addPage(false, page.id)} disabled={!writable} aria-label={`Add page after page ${index + 1}`}><StudioIcon name="add" size={24} /></button></div></div>
              <div className="design-canvas-frame" style={{ width: `${page.width * zoom / 100}px` }}><PageSvg activeHandle={isActive ? activeHandle : null} showHoverHandles={isActive && tool === "select"} purpleSelectionBorder={isActive && purpleSelectionBorder} editingTextId={isActive ? editingTextId : null} editingTextValue={editingTextValue} onEditingTextChange={setEditingTextValue} onEditingTextCommit={commitTextEditing} onEditingTextCancel={cancelTextEditing} onTextDoubleClick={isActive ? beginTextEditing : undefined} rotatingObjectId={interactionRef.current?.mode === "rotate" ? interactionRef.current.id : undefined} isRotating={isActive && isRotating} rotationCursor={isActive ? rotationCursor : null} showPageResizeHandles={isActive && tool === "select" && selectedIds.length === 0} tool={isActive ? tool : "select"} zoom={zoom} page={page} assets={design.assets} selectedIds={isActive ? selectedIds : []} guides={isActive ? guides : []} onCanvasPointerDown={isActive ? onCanvasPointerDown : selectInactivePage} onObjectPointerDown={isActive ? onObjectPointerDown : (event) => selectInactivePage(event)} onResizePointerDown={isActive ? onResizePointerDown : () => undefined} onPageResizePointerDown={isActive ? onPageResizePointerDown : undefined} onRotatePointerDown={isActive ? onRotatePointerDown : () => undefined} onArrowEndpointPointerDown={isActive ? onArrowEndpointPointerDown : () => undefined} onArrowBendPointerDown={isActive ? onArrowBendPointerDown : () => undefined} onArrowBendKeyDown={isActive ? onArrowBendKeyDown : undefined} onResizeKeyDown={isActive ? onResizeKeyDown : () => undefined} onPageResizeKeyDown={isActive ? onPageResizeKeyDown : undefined} onRotateKeyDown={isActive ? onRotateKeyDown : () => undefined} onArrowEndpointKeyDown={isActive ? onArrowEndpointKeyDown : () => undefined} selectionBox={isActive ? selectionBox : null} svgRef={isActive ? svgRef : undefined} /></div>
            </article>;
          })}</div> : <div className="design-canvas-frame" style={{ width: `${activePage.width * zoom / 100}px` }}><PageSvg activeHandle={activeHandle} showHoverHandles={tool === "select"} purpleSelectionBorder={purpleSelectionBorder} editingTextId={editingTextId} editingTextValue={editingTextValue} onEditingTextChange={setEditingTextValue} onEditingTextCommit={commitTextEditing} onEditingTextCancel={cancelTextEditing} onTextDoubleClick={beginTextEditing} rotatingObjectId={interactionRef.current?.mode === "rotate" || interactionRef.current?.mode === "move" ? interactionRef.current.id : undefined} isRotating={isRotating} rotationCursor={rotationCursor} showPageResizeHandles={tool === "select" && selectedIds.length === 0} tool={tool} zoom={zoom} page={activePage} assets={design.assets} selectedIds={selectedIds} guides={guides} onCanvasPointerDown={onCanvasPointerDown} onObjectPointerDown={onObjectPointerDown} onResizePointerDown={onResizePointerDown} onPageResizePointerDown={onPageResizePointerDown} onRotatePointerDown={onRotatePointerDown} onArrowEndpointPointerDown={onArrowEndpointPointerDown} onArrowBendPointerDown={onArrowBendPointerDown} onArrowBendKeyDown={onArrowBendKeyDown} onResizeKeyDown={onResizeKeyDown} onPageResizeKeyDown={onPageResizeKeyDown} onRotateKeyDown={onRotateKeyDown} onArrowEndpointKeyDown={onArrowEndpointKeyDown} selectionBox={selectionBox} svgRef={svgRef} /></div>}
        </div><div className={`design-zoom-dock${pagesCollapsed ? " is-pages-collapsed" : ""}`}><div className="design-zoom-slider" aria-label="Canvas zoom control"><label htmlFor="design-canvas-zoom">Zoom</label><ZoomRangeControl id="design-canvas-zoom" value={zoom} onChange={setZoom} /><output htmlFor="design-canvas-zoom">{zoom}%</output></div></div></div>
      {contextMenu ? <DesignContextMenu anchor={() => contextMenuReturnRef.current ?? document.querySelector<HTMLElement>(".design-workspace")}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedCount={selectedIds.length}
        canCopy={selectedIds.length > 0}
        canPaste={designEditable && objectClipboardRef.current.length > 0}
        canAlign={designEditable && activePage.objects.some((object) => selectedIds.includes(object.id) && !object.locked)}
        canLock={designEditable && selectedIds.length > 0}
        selectionLocked={selectedIds.length > 0 && activePage.objects.filter((object) => selectedIds.includes(object.id)).every((object) => object.locked)}
        alignOpen={contextMenu.alignOpen}
        onClose={closeContextMenu}
        onCopy={copySelected}
        onPaste={pasteSelected}
        onAlignToggle={() => setContextMenu((menu) => menu ? { ...menu, alignOpen: !menu.alignOpen } : menu)}
        onAlign={alignSelectedToPage}
        onLock={toggleSelectedLock}
        onLink={linkSelected}
      /> : null}
      </section>
      <Pane trackClassName="design-properties-track" className="design-inspector" bodyClassName="design-inspector-body" label="Design properties" side="right" width={inspectorPaneWidth} onWidthChange={setInspectorPaneWidth} minWidth={260} maxWidth={480} collapsed={inspectorCollapsed} onCollapsedChange={setInspectorCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2 className="design-properties-heading">Properties</h2>}>
      <div className="design-inspector-section"><span className="design-inspector-label">Page</span><label>Name<input value={pageName} disabled={!writable} onChange={(event) => setPageName(event.target.value)} onBlur={renamePage} /></label><label>Preset<select value="custom" disabled={!writable} onChange={(event) => setPagePreset(event.target.value)}><option value="custom">Custom</option><option value="landscape">1920 × 1080 landscape</option><option value="square">1080 × 1080 square</option><option value="portrait">1080 × 1350 portrait</option><option value="portraitStory">1080 × 1920 portrait</option></select></label><label>Width<input type="number" min="1" max={DESIGN_MAX_DIMENSION} value={activePage.width} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, width: Math.min(DESIGN_MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) }))} /></label><label>Height<input type="number" min="1" max={DESIGN_MAX_DIMENSION} value={activePage.height} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, height: Math.min(DESIGN_MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) }))} /></label><label>Background<select value={activePage.background.kind} disabled={!writable} onChange={(event) => updatePage((page) => ({ ...page, background: { ...page.background, kind: event.target.value as "solid" | "transparent" } }))}><option value="solid">Solid</option><option value="transparent">Transparent</option></select></label>{activePage.background.kind === "solid" ? <ColourPicker label="Colour" value={activePage.background.colour} allowClear={false} disabled={!writable} onChange={colour => { if (colour !== undefined) updatePage(page => ({ ...page, background: { ...page.background, colour } })); }} /> : null}</div>{selectedObject ? <div className="design-inspector-section"><span className="design-inspector-label">Selected {toolLabels[selectedObject.type as Tool] ?? selectedObject.type}</span><div className="design-field-grid"><label>X<input type="number" value={Math.round(selectedObject.x)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, x: Number(event.target.value) || 0 }))} /></label><label>Y<input type="number" value={Math.round(selectedObject.y)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, y: Number(event.target.value) || 0 }))} /></label><label>Width<input type="number" min="1" value={Math.round(selectedObject.width)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, width: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Height<input type="number" min="1" value={Math.round(selectedObject.height)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, height: Math.max(1, Number(event.target.value) || 1) }))} /></label></div><label>Opacity ({Math.round(selectedObject.opacity * 100)}%)<RangeControl className="studio-range-control" min="0" max="100" step="1" value={Math.round(selectedObject.opacity * 100)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, opacity: Number(event.target.value) / 100 }))} /></label><PositionControls writable={writable} selectedCount={selectedIds.length} canAlign={activePage.objects.some((object) => selectedIds.includes(object.id) && !object.locked)} onAlignToPage={alignSelectedToPage} />{selectedObject.type === "image" ? <div className="design-image-tools">
            <div className="design-background-removal">
              <span className="design-inspector-label">Background Removal</span>
              <label>Subject<select value={backgroundMode} disabled={!writable || Boolean(backgroundProgress)} onChange={(event) => setBackgroundMode(event.target.value as BackgroundRemovalMode)}><option value="general">General</option><option value="people">People</option></select></label>
              <label>Edge Cleanup ({backgroundEdgeCleanup}%)<RangeControl aria-label="Edge Cleanup" className="studio-range-control" min="0" max="40" step="1" value={backgroundEdgeCleanup} disabled={!writable || Boolean(backgroundProgress)} onChange={(event) => setBackgroundEdgeCleanup(Number(event.target.value))} /></label>
              <small>Adjust cleanup, then run again.</small>
              <button type="button" onClick={() => void removeSelectedImageBackground()} disabled={!writable || selectedObject.locked || Boolean(backgroundProgress)}>Remove Background</button>
              {backgroundProgress ? <>
                <div role="status">{backgroundProgress.message}{backgroundProgress.percent !== undefined ? ` ${backgroundProgress.percent}%` : ""}</div>
                <progress aria-label="Background removal progress" max="100" value={backgroundProgress.percent} />
                <button type="button" className="design-background-cancel" onClick={() => backgroundRemovalRef.current?.abort()}>Cancel</button>
              </> : null}
              {selectedImageAsset?.sourceAssetId ? <button type="button" disabled={!writable || selectedObject.locked || Boolean(backgroundProgress)} onClick={() => updateSelected((object) => object.type === "image" ? { ...object, assetId: selectedImageAsset.sourceAssetId! } : object)}>Restore Original</button> : null}
            </div>
            <div className="design-crop-controls"><span className="design-inspector-label">Crop (percent)</span><div className="design-field-grid">
              <label>Left<input type="number" min="0" max="100" value={Math.round((selectedObject.crop?.x ?? 0) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("x", Number(event.target.value) / 100)} /></label>
              <label>Top<input type="number" min="0" max="100" value={Math.round((selectedObject.crop?.y ?? 0) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("y", Number(event.target.value) / 100)} /></label>
              <label>Width<input type="number" min="1" max="100" value={Math.round((selectedObject.crop?.width ?? 1) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("width", Number(event.target.value) / 100)} /></label>
              <label>Height<input type="number" min="1" max="100" value={Math.round((selectedObject.crop?.height ?? 1) * 100)} disabled={!writable} onChange={(event) => updateImageCrop("height", Number(event.target.value) / 100)} /></label>
            </div></div>
          </div> : null}{selectedObject.type === "text" || selectedObject.type === "step" ? <><label>Text<textarea value={selectedObject.text} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, text: event.target.value }))} /></label><ColourControl label="Text colour" value={selectedObject.colour} opacity={selectedObject.colourOpacity ?? 1} disabled={!writable} onChange={(value) => updateSelected((object) => ({ ...object, colour: value }))} onOpacityChange={(value) => updateSelected((object) => ({ ...object, colourOpacity: value }))} /><label>Font size<input type="number" min="8" max="240" value={selectedObject.fontSize} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fontSize: Math.max(8, Number(event.target.value) || 8) }))} /></label><FontFamilySelect value={selectedObject.fontFamily} options={fontOptions} disabled={!writable} onChange={fontFamily => updateSelected(object => ({ ...object, fontFamily }))} /><label>Weight<select value={selectedObject.fontWeight} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, fontWeight: Number(event.target.value) }))}>{![400, 600, 700].includes(selectedObject.fontWeight) ? <option value={selectedObject.fontWeight}>{selectedObject.fontWeight}</option> : null}<option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option></select></label><label>Alignment<select value={selectedObject.align} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...object, align: event.target.value as "left" | "center" | "right" }))}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>{selectedObject.type === "text" ? <ToggleSetting label="Word wrap" checked={selectedObject.wordWrap !== false} disabled={!writable} onChange={wordWrap => updateSelected(object => object.type === "text" ? { ...object, wordWrap } : object)} /> : null}{selectedObject.type === "step" ? <ColourControl label="Step fill" value={selectedObject.fill ?? "#cc1818"} opacity={selectedObject.fillOpacity ?? 1} disabled={!writable} onChange={(value) => updateSelected((object) => ({ ...object, fill: value }))} onOpacityChange={(value) => updateSelected((object) => ({ ...object, fillOpacity: value }))} /> : null}</> : null}{selectedObject.type === "arrow" ? <><ColourControl label="Line colour" value={selectedObject.stroke} opacity={selectedObject.strokeOpacity ?? 1} disabled={!writable} onChange={(value) => updateSelected((object) => ({ ...(object as DesignArrowObject), stroke: value }))} onOpacityChange={(value) => updateSelected((object) => ({ ...(object as DesignArrowObject), strokeOpacity: value }))} /><label>Line width<input type="number" min="1" max="80" value={selectedObject.strokeWidth} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), strokeWidth: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Start arrowhead<select value={selectedObject.startArrowhead ? "yes" : "no"} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), startArrowhead: event.target.value === "yes" }))}><option value="yes">Shown</option><option value="no">Hidden</option></select></label><label>End arrowhead<select value={selectedObject.arrowhead ? "yes" : "no"} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), arrowhead: event.target.value === "yes" }))}><option value="yes">Shown</option><option value="no">Hidden</option></select></label><label>Arrowhead size ({Math.round((selectedObject.arrowheadScale ?? 1) * 100)}%)<RangeControl aria-label="Arrowhead size" className="studio-range-control" min={DESIGN_ARROWHEAD_SCALE_MIN * 100} max={DESIGN_ARROWHEAD_SCALE_MAX * 100} step="1" value={Math.round((selectedObject.arrowheadScale ?? 1) * 100)} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), arrowheadScale: Math.max(DESIGN_ARROWHEAD_SCALE_MIN, Math.min(DESIGN_ARROWHEAD_SCALE_MAX, Number(event.target.value) / 100)) }))} /></label><label>Line style<select value={selectedObject.lineStyle ?? "solid"} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignArrowObject), lineStyle: event.target.value as "solid" | "dotted" }))}><option value="solid">Solid</option><option value="dotted">Dotted</option></select></label></> : null}{["rectangle", "ellipse", "highlight"].includes(selectedObject.type) ? <><ColourControl label="Fill" value={(selectedObject as DesignShapeObject).fill === "transparent" ? "#ffffff" : (selectedObject as DesignShapeObject).fill} opacity={(selectedObject as DesignShapeObject).fill === "transparent" ? 0 : (selectedObject as DesignShapeObject).fillOpacity ?? 1} disabled={!writable} onChange={(value) => updateSelected((object) => ({ ...(object as DesignShapeObject), fill: value, fillOpacity: (object as DesignShapeObject).fill === "transparent" ? 1 : (object as DesignShapeObject).fillOpacity }))} onOpacityChange={(value) => updateSelected((object) => ({ ...(object as DesignShapeObject), fillOpacity: value }))} /><ColourControl label="Outline" value={(selectedObject as DesignShapeObject).stroke === "none" ? "#ffffff" : (selectedObject as DesignShapeObject).stroke} opacity={(selectedObject as DesignShapeObject).stroke === "none" ? 0 : (selectedObject as DesignShapeObject).strokeOpacity ?? 1} disabled={!writable} onChange={(value) => updateSelected((object) => ({ ...(object as DesignShapeObject), stroke: value, strokeOpacity: (object as DesignShapeObject).stroke === "none" ? 1 : (object as DesignShapeObject).strokeOpacity }))} onOpacityChange={(value) => updateSelected((object) => ({ ...(object as DesignShapeObject), strokeOpacity: value }))} /><label>Outline width<input type="number" min="0" max="80" value={(selectedObject as DesignShapeObject).strokeWidth} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), strokeWidth: Math.max(0, Number(event.target.value) || 0) }))} /></label>{selectedObject.type === "rectangle" ? <label>Corner radius<input type="number" min="0" max="200" value={(selectedObject as DesignShapeObject).radius ?? 0} disabled={!writable} onChange={(event) => updateSelected((object) => ({ ...(object as DesignShapeObject), radius: Math.max(0, Number(event.target.value) || 0) }))} /></label> : null}</> : null}{selectedIds.length > 1 ? <div className="design-object-actions"><button type="button" onClick={groupSelected} disabled={!writable}>Group</button><button type="button" onClick={ungroupSelected} disabled={!writable}>Ungroup</button><button type="button" onClick={() => alignSelected("left")} disabled={!writable}>Align left</button><button type="button" onClick={() => alignSelected("right")} disabled={!writable}>Align right</button><button type="button" onClick={() => alignSelected("top")} disabled={!writable}>Align top</button><button type="button" onClick={() => alignSelected("bottom")} disabled={!writable}>Align bottom</button><button type="button" onClick={() => alignSelected("centre")} disabled={!writable}>Centre</button><button type="button" onClick={() => alignSelected("middle")} disabled={!writable}>Middle</button></div> : null}<div className="design-object-actions">{selectedObject.type === "image" && activePage.objects.length === 1 ? <button type="button" onClick={fitPageToSelectedImage} disabled={!writable}>Fit page to image</button> : null}<button type="button" onClick={copySelected} disabled={!writable}>Copy</button><button type="button" onClick={pasteSelected} disabled={!writable}>Paste</button><button type="button" onClick={duplicateSelected} disabled={!writable}>Duplicate</button><button type="button" onClick={() => moveSelectedLayer("backward")} disabled={!writable || selectedObject.locked}>Send backward</button><button type="button" onClick={() => moveSelectedLayer("forward")} disabled={!writable || selectedObject.locked}>Bring forward</button><button type="button" onClick={() => moveSelectedLayer("back")} disabled={!writable || selectedObject.locked}>Send to back</button><button type="button" onClick={() => moveSelectedLayer("front")} disabled={!writable || selectedObject.locked}>Bring to front</button><button type="button" onClick={() => updateSelected((object) => ({ ...object, locked: !object.locked }))} disabled={!writable}>{selectedObject.locked ? "Unlock" : "Lock"}</button><button type="button" onClick={() => { updatePage((page) => ({ ...page, objects: page.objects.filter((object) => object.id !== selectedObject.id) })); selectObjects([]); }} disabled={!writable}>Delete</button></div></div> : <div className="design-inspector-empty"><p>Select an object to edit its position, size and style.</p><p>Redaction is opaque in rendered exports. Keep editable backups private because the original image remains in the design source.</p></div>}</Pane>
    </div>
    {showMedia ? <StudioDialog title="Choose from Studio files" returnFocus={mediaTriggerRef} className="design-media-panel" onClose={() => setShowMedia(false)}><ImageChoiceGrid choices={mediaAssets} urls={mediaUrls} className="design-media-list" empty="No image files are available in Studio yet." onChoose={asset => void addMediaAsset(asset)} /></StudioDialog> : null}
  </div>;
}
