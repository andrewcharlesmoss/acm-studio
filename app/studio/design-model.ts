export type DesignBackground = {
  kind: "solid" | "transparent";
  colour: string;
};

export type DesignAsset = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  width: number;
  height: number;
  /** Original image retained by a derived asset, including across save/reload. */
  sourceAssetId?: string;
};

type DesignObjectBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  groupId?: string;
};

export type DesignImageObject = DesignObjectBase & {
  type: "image";
  assetId: string;
  crop?: { x: number; y: number; width: number; height: number };
};

export type DesignShapeKind = "rectangle" | "roundedRectangle" | "circle" | "triangle" | "triangleDown" | "diamond" | "pentagon" | "hexagon" | "octagon";

export type DesignShapeObject = DesignObjectBase & {
  type: "rectangle" | "ellipse" | "highlight" | "redaction";
  shape?: DesignShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius?: number;
};

export type DesignArrowObject = DesignObjectBase & {
  type: "arrow";
  stroke: string;
  strokeWidth: number;
  arrowhead: boolean;
  startArrowhead?: boolean;
  arrowheadScale?: number;
  lineStyle?: "solid" | "dotted";
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  bends?: Array<{ x: number; y: number }>;
};

export type DesignTextObject = DesignObjectBase & {
  type: "text" | "step";
  text: string;
  colour: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
  wordWrap?: boolean;
  fill?: string;
};

export type DesignObject = DesignImageObject | DesignShapeObject | DesignArrowObject | DesignTextObject;

export type DesignPage = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: DesignBackground;
  objects: DesignObject[];
  renderedMediaId?: string;
};

export type DesignProject = {
  format: "acm-studio-design";
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activePageId: string;
  pages: DesignPage[];
  assets: DesignAsset[];
};

export const DESIGN_STORAGE_KEY = "acm-studio-designs-v1";
export const DESIGN_MAX_DIMENSION = 4096;
export const DESIGN_ARROWHEAD_SCALE_MIN = 0.5;
export const DESIGN_ARROWHEAD_SCALE_MAX = 2;
export const DESIGN_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function cloneDesign<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDesign(name = "Untitled design", width = 1920, height = 1080): DesignProject {
  const now = new Date().toISOString();
  const page: DesignPage = {
    id: makeId("page"), name: "Page 1", width, height,
    background: { kind: "solid", colour: "#ffffff" }, objects: [],
  };
  return { format: "acm-studio-design", version: 1, id: makeId("design"), name, createdAt: now, updatedAt: now, activePageId: page.id, pages: [page], assets: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function validDate(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

function validImageDataUrl(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  return Boolean(match && match[2].replace(/\s/g, "").length > 0 && match[2].replace(/\s/g, "").length % 4 === 0);
}

export function validateDesignProject(value: unknown): DesignProject {
  if (!isRecord(value) || value.format !== "acm-studio-design" || value.version !== 1 || typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !validDate(value.createdAt) || !validDate(value.updatedAt) || !Array.isArray(value.pages) || !Array.isArray(value.assets) || typeof value.activePageId !== "string") {
    throw new Error("This is not a supported ACM Studio design.");
  }
  const assetIds = new Set<string>();
  for (const asset of value.assets) {
    const record = asset;
    if (!isRecord(record) || typeof record.id !== "string" || !record.id || assetIds.has(record.id) || typeof record.name !== "string" || typeof record.type !== "string" || !DESIGN_IMAGE_TYPES.includes(record.type as typeof DESIGN_IMAGE_TYPES[number]) || typeof record.dataUrl !== "string" || !validImageDataUrl(record.dataUrl) || typeof record.width !== "number" || !Number.isSafeInteger(record.width) || typeof record.height !== "number" || !Number.isSafeInteger(record.height) || record.width <= 0 || record.height <= 0) throw new Error("One or more design images are invalid.");
    assetIds.add(record.id);
  }
  for (const asset of value.assets) {
    if (asset.sourceAssetId === undefined) continue;
    if (typeof asset.sourceAssetId !== "string" || !assetIds.has(asset.sourceAssetId) || asset.sourceAssetId === asset.id) throw new Error("A derived image refers to an invalid original asset.");
    // Derivatives point straight to an original, never to another derivative.
    if (value.assets.find((source) => source.id === asset.sourceAssetId)?.sourceAssetId !== undefined) throw new Error("A derived image must refer directly to its original asset.");
  }
  const pageIds = new Set<string>();
  for (const page of value.pages) {
    const record = page;
    if (!isRecord(record) || typeof record.id !== "string" || !record.id || pageIds.has(record.id) || typeof record.name !== "string" || !record.name.trim() || typeof record.width !== "number" || !Number.isSafeInteger(record.width) || typeof record.height !== "number" || !Number.isSafeInteger(record.height) || record.width < 1 || record.height < 1 || record.width > DESIGN_MAX_DIMENSION || record.height > DESIGN_MAX_DIMENSION || !isRecord(record.background) || !["solid", "transparent"].includes(record.background.kind as string) || typeof record.background.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(record.background.colour) || !Array.isArray(record.objects) || (record.renderedMediaId !== undefined && (typeof record.renderedMediaId !== "string" || !record.renderedMediaId))) throw new Error("One or more design pages are invalid.");
    pageIds.add(record.id);
    const objectIds = new Set<string>();
    for (const object of record.objects) {
      const item = object;
      if (!isRecord(item) || typeof item.id !== "string" || !item.id || objectIds.has(item.id) || !["image", "rectangle", "ellipse", "highlight", "redaction", "arrow", "text", "step"].includes(item.type as string) || ![item.x, item.y, item.width, item.height, item.rotation, item.opacity].every((entry) => typeof entry === "number" && Number.isFinite(entry)) || (typeof item.width === "number" && item.width < 0) || (typeof item.height === "number" && item.height < 0) || (typeof item.opacity === "number" && (item.opacity < 0 || item.opacity > 1)) || (item.locked !== undefined && typeof item.locked !== "boolean") || (item.groupId !== undefined && (typeof item.groupId !== "string" || !item.groupId))) throw new Error("One or more design objects are invalid.");
      if (["rectangle", "ellipse", "highlight", "redaction"].includes(item.type as string) && (typeof item.fill !== "string" || typeof item.stroke !== "string" || typeof item.strokeWidth !== "number" || !Number.isFinite(item.strokeWidth) || item.strokeWidth < 0 || (item.radius !== undefined && (typeof item.radius !== "number" || !Number.isFinite(item.radius) || item.radius < 0)))) throw new Error("One or more design shapes are invalid.");
      if (item.type === "arrow" && (typeof item.stroke !== "string" || typeof item.strokeWidth !== "number" || !Number.isFinite(item.strokeWidth) || item.strokeWidth <= 0 || typeof item.arrowhead !== "boolean" || (item.startArrowhead !== undefined && typeof item.startArrowhead !== "boolean") || (item.arrowheadScale !== undefined && (typeof item.arrowheadScale !== "number" || !Number.isFinite(item.arrowheadScale) || item.arrowheadScale < DESIGN_ARROWHEAD_SCALE_MIN || item.arrowheadScale > DESIGN_ARROWHEAD_SCALE_MAX)) || (item.lineStyle !== undefined && !["solid", "dotted"].includes(item.lineStyle as string)) || (item.start !== undefined && (!isRecord(item.start) || typeof item.start.x !== "number" || !Number.isFinite(item.start.x) || typeof item.start.y !== "number" || !Number.isFinite(item.start.y))) || (item.end !== undefined && (!isRecord(item.end) || typeof item.end.x !== "number" || !Number.isFinite(item.end.x) || typeof item.end.y !== "number" || !Number.isFinite(item.end.y))) || (item.bends !== undefined && (!Array.isArray(item.bends) || (item.bends.length !== 1 && item.bends.length !== 2) || item.bends.some((bend) => !isRecord(bend) || typeof bend.x !== "number" || !Number.isFinite(bend.x) || typeof bend.y !== "number" || !Number.isFinite(bend.y)))))) throw new Error("One or more design arrows are invalid.");
      if ((item.type === "text" || item.type === "step") && (typeof item.text !== "string" || typeof item.colour !== "string" || typeof item.fontFamily !== "string" || !item.fontFamily || typeof item.fontSize !== "number" || !Number.isFinite(item.fontSize) || item.fontSize <= 0 || typeof item.fontWeight !== "number" || !Number.isFinite(item.fontWeight) || typeof item.align !== "string" || !["left", "center", "right"].includes(item.align) || (item.wordWrap !== undefined && typeof item.wordWrap !== "boolean") || (item.type === "step" && (typeof item.fill !== "string" || !item.fill)))) throw new Error("One or more design text objects are invalid.");
      if (item.type === "image" && (typeof item.assetId !== "string" || !assetIds.has(item.assetId))) throw new Error("A design image refers to a missing asset.");
      if (item.type === "image" && item.crop !== undefined) {
        const crop = item.crop;
        const values = isRecord(crop) ? [crop.x, crop.y, crop.width, crop.height] : [];
        if (!isRecord(crop) || !values.every((entry) => typeof entry === "number" && Number.isFinite(entry)) || (values[0] as number) < 0 || (values[1] as number) < 0 || (values[2] as number) <= 0 || (values[3] as number) <= 0 || (values[0] as number) + (values[2] as number) > 1 || (values[1] as number) + (values[3] as number) > 1) throw new Error("One or more image crops are invalid.");
      }
      objectIds.add(item.id);
    }
  }
  if (!pageIds.has(value.activePageId)) throw new Error("The design does not have a valid active page.");
  return value as DesignProject;
}

/**
 * Upgrade a design payload before validation. Keeping this boundary separate
 * means future schema versions can be migrated without changing the canvas
 * or storage callers.
 */
export function migrateDesignProject(value: unknown): DesignProject {
  if (isRecord(value) && value.format === "acm-studio-design" && value.version === 1) {
    return validateDesignProject(value);
  }
  throw new Error("This design version is not supported. Export a current editable backup first.");
}

export function sanitiseFilename(value: string) {
  const safe = value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return safe || "page";
}

export function nextPageName(pages: DesignPage[]) {
  let index = pages.length + 1;
  while (pages.some((page) => page.name === `Page ${index}`)) index += 1;
  return `Page ${index}`;
}

export function compactDesignAssets(design: DesignProject): DesignProject {
  const referenced = new Set(design.pages.flatMap((page) => page.objects.filter((object) => object.type === "image").map((object) => object.assetId)));
  for (const asset of design.assets) if (referenced.has(asset.id) && asset.sourceAssetId) referenced.add(asset.sourceAssetId);
  return { ...design, assets: design.assets.filter((asset) => referenced.has(asset.id)) };
}
