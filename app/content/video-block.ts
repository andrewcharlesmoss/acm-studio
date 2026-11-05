import { safeImageSource } from "./rich-text";

export type VideoPreload = "none" | "metadata" | "auto";
export type VideoBlock = {
  id: string;
  type: "video";
  src: string;
  caption?: string;
  captionRuns?: import("./model").RichTextRun[];
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: VideoPreload;
  poster?: string;
  blockAlign?: import("./model").BlockAlignment;
  editorial?: import("./block-editorial").BlockEditorial;
};

/** Accept only direct HTTPS or root-relative local media paths. */
export function safeVideoSource(value: string): string | null {
  const source = value.trim();
  // eslint-disable-next-line no-control-regex -- Reject control characters in untrusted video URLs.
  if (!source || /[\\\u0000-\u0020\u007f]/.test(source)) return null;
  if (/^https:\/\//i.test(source)) {
    try {
      const url = new URL(source);
      return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password ? source : null;
    } catch { return null; }
  }
  return source.startsWith("/") && !source.startsWith("//") ? source : null;
}

export function resolveVideoSource(block: Pick<VideoBlock, "src">): string | null {
  return safeVideoSource(block.src);
}

export function validVideoBlock(value: unknown): value is VideoBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const block = value as Record<string, unknown>;
  return block.type === "video"
    && typeof block.id === "string" && block.id.length > 0
    && typeof block.src === "string" && (block.src === "" || Boolean(safeVideoSource(block.src)))
    && (block.caption === undefined || typeof block.caption === "string")
    && (block.captionRuns === undefined || Array.isArray(block.captionRuns))
    && [block.autoplay, block.controls, block.loop, block.muted, block.playsInline].every(item => item === undefined || typeof item === "boolean")
    && (block.preload === undefined || ["none", "metadata", "auto"].includes(block.preload as string))
    && (block.poster === undefined || typeof block.poster === "string" && (block.poster === "" || safeImageSource(block.poster)))
    && (block.blockAlign === undefined || ["left", "center", "right", "wide", "full"].includes(block.blockAlign as string))
    ? true
    : false;
}

export function containsVideoBlock(value: unknown): boolean {
  const seen = new Set<object>();
  function visit(current: unknown): boolean {
    if (!current || typeof current !== "object" || seen.has(current as object)) return false;
    seen.add(current as object);
    if (Array.isArray(current)) return current.some(visit);
    const record = current as Record<string, unknown>;
    return record.type === "video" || Object.values(record).some(visit);
  }
  return visit(value);
}

