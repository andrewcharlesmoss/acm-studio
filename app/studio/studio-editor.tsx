"use client";

import type { ContentBlock } from "../content/model";
import { StudioCanvas, type StudioCanvasProps } from "./studio-canvas";
import { StudioInspector, type StudioInspectorProps } from "./studio-inspectors";
import type { StudioDocument } from "./editor-model";
export type { StudioPresentation, StudioPresentationContext } from "./studio-presentation";

/**
 * The shared Gutenberg-style editing surface used by Studio and Site pages.
 *
 * Data, persistence and site-specific chrome stay outside this component. A
 * caller supplies the active document and narrow command callbacks while the
 * canvas and inspector remain one implementation for every workspace.
 */
export type StudioEditorProps = {
  writable?: boolean;
  canvas: Omit<StudioCanvasProps, "activeDocument" | "writable"> & { activeDocument?: StudioDocument };
  inspector: Omit<StudioInspectorProps, "activeDocument"> & { activeDocument?: StudioDocument };
};

export function StudioEditor({ writable = true, canvas, inspector }: StudioEditorProps) {
  const activeDocument = canvas.activeDocument ?? inspector.activeDocument;
  if (!activeDocument) return null;
  return <>
    <StudioCanvas key={activeDocument.id} {...canvas} writable={writable} activeDocument={activeDocument} />
    <StudioInspector {...inspector} activeDocument={activeDocument} />
  </>;
}

export function documentText(block: ContentBlock): string {
  if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return block.text;
  if (block.type === "list") return block.items.join(" ");
  if (block.type === "code") return block.code;
  if (block.type === "button") return block.label;
  if (block.type === "field") return `${block.label} ${block.value}`;
  if (block.type === "embed") return block.title;
  if (block.type === "image") return block.caption ?? "";
  if (block.type === "table") return block.rows.flat().join(" ");
  if (block.type === "section" || block.type === "group") return block.children.map(documentText).join(" ");
  if (block.type === "component") return Object.values(block.data ?? {}).flatMap((item) => Array.isArray(item) ? item : [item]).join(" ");
  return "";
}

export function documentWordCount(document: StudioDocument) {
  return document.blocks.flatMap(documentText).join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function documentCharacterCount(document: StudioDocument) {
  return document.blocks.flatMap(documentText).join(" ").length;
}
