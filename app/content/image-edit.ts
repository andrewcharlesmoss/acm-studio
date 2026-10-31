export type ImageCropEdit = {
  crop: { x: number; y: number; width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  zoom: number;
  /** Quarter-turn rotation; kept separate from the fine straighten angle. */
  rotation: number;
  straighten: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
};

export function validImageCropEdit(value: unknown): value is ImageCropEdit {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const edit = value as Record<string, unknown>;
  const crop = edit.crop;
  if (!crop || typeof crop !== "object" || Array.isArray(crop)) return false;
  const rect = crop as Record<string, unknown>;
  const [x, y, width, height] = [rect.x, rect.y, rect.width, rect.height];
  return [x, y, width, height].every(item => typeof item === "number" && Number.isFinite(item))
    && (x as number) >= 0 && (y as number) >= 0 && (width as number) > 0 && (height as number) > 0
    && (x as number) + (width as number) <= 1 && (y as number) + (height as number) <= 1
    && Number.isSafeInteger(edit.sourceWidth) && (edit.sourceWidth as number) > 0 && (edit.sourceWidth as number) <= 50000
    && Number.isSafeInteger(edit.sourceHeight) && (edit.sourceHeight as number) > 0 && (edit.sourceHeight as number) <= 50000
    && typeof edit.zoom === "number" && Number.isFinite(edit.zoom) && edit.zoom >= 1 && edit.zoom <= 3
    && [0, 90, 180, 270].includes(edit.rotation as number)
    && typeof edit.straighten === "number" && Number.isFinite(edit.straighten) && edit.straighten >= -45 && edit.straighten <= 45
    && typeof edit.flipHorizontal === "boolean" && typeof edit.flipVertical === "boolean";
}

export function containsAuthoredImageCrop(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsAuthoredImageCrop);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type === "image" && Object.hasOwn(record, "imageEdit")) return true;
  return Object.values(record).some(containsAuthoredImageCrop);
}

export function containsAuthoredCoverCrop(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsAuthoredCoverCrop);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type === "cover" && Object.hasOwn(record, "imageEdit")) return true;
  return Object.values(record).some(containsAuthoredCoverCrop);
}

/** Pixel-space crop geometry keeps source bytes untouched and is shared by every Image renderer. */
export function imageCropSvgGeometry(edit: ImageCropEdit, naturalWidth: number, naturalHeight: number) {
  const crop = edit.crop;
  const x = crop.x * naturalWidth;
  const y = crop.y * naturalHeight;
  const width = crop.width * naturalWidth;
  const height = crop.height * naturalHeight;
  const transforms = [
    `translate(${x + width / 2} ${y + height / 2})`,
    `rotate(${edit.rotation + edit.straighten})`,
    `scale(${edit.flipHorizontal ? -1 : 1} ${edit.flipVertical ? -1 : 1})`,
    `scale(${edit.zoom})`,
    `translate(${-x - width / 2} ${-y - height / 2})`,
  ];
  return { viewBox: `${x} ${y} ${width} ${height}`, transform: transforms.join(" ") };
}

export const DEFAULT_IMAGE_CROP_EDIT: ImageCropEdit = {
  crop: { x: 0, y: 0, width: 1, height: 1 },
  sourceWidth: 1,
  sourceHeight: 1,
  zoom: 1,
  rotation: 0,
  straighten: 0,
  flipHorizontal: false,
  flipVertical: false,
};

