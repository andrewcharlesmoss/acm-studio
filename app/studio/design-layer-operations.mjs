/**
 * Pure layer-order operations shared by the design editor and its tests.
 * Objects are stored back-to-front; the layer panel displays them front-to-back.
 */

export function moveDesignLayer(objects, objectId, direction) {
  const index = objects.findIndex((object) => object.id === objectId);
  const selected = objects[index];
  if (index < 0 || selected?.locked) return objects;
  const next = [...objects];
  next.splice(index, 1);
  const target = direction === "front" ? next.length : direction === "back" ? 0 : direction === "forward" ? Math.min(next.length, index + 1) : Math.max(0, index - 1);
  if (target === index) return objects;
  next.splice(target, 0, selected);
  return next;
}

export function reorderDesignLayers(objects, sourceId, targetId, position) {
  if (sourceId === targetId) return objects;
  const layers = [...objects].reverse();
  const sourceIndex = layers.findIndex((object) => object.id === sourceId);
  const targetIndex = layers.findIndex((object) => object.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || layers[sourceIndex]?.locked || layers[targetIndex]?.locked) return objects;
  const [source] = layers.splice(sourceIndex, 1);
  const nextTargetIndex = layers.findIndex((object) => object.id === targetId);
  layers.splice(position === "before" ? nextTargetIndex : nextTargetIndex + 1, 0, source);
  return layers.reverse();
}
