import type { DesignObject } from "../../design-model.ts";

/** Layout only: production object dimensions and resize geometry stay unchanged. */
export function resizeSpecimenLayout(object: DesignObject, zoom: number, viewportScale: number, viewportWidth = 420) {
  const scale = zoom / 100;
  const radians = object.rotation * Math.PI / 180;
  const halfWidth = (Math.abs(Math.cos(radians)) * object.width + Math.abs(Math.sin(radians)) * object.height) * scale / 2;
  const halfHeight = (Math.abs(Math.sin(radians)) * object.width + Math.abs(Math.cos(radians)) * object.height) * scale / 2;
  const centreX = 210 + (object.x + object.width / 2) * scale;
  const centreY = 210 + (object.y + object.height / 2) * scale;
  const padding = 24 / viewportScale;
  const left = Math.min(0, centreX - halfWidth - padding);
  const top = Math.min(0, centreY - halfHeight - padding);
  const right = Math.max(420, viewportWidth / viewportScale, centreX + halfWidth + padding);
  const bottom = Math.max(420, centreY + halfHeight + padding);
  return { left, top, width: right - left, height: bottom - top };
}
