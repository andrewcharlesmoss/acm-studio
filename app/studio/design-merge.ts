import { cloneDesign, validateDesignProject, type DesignAsset, type DesignObject, type DesignPage, type DesignProject } from "./design-model";

export const DESIGN_SYNC_PROTOCOL = "acm-studio-design-sync-v2" as const;

type Collection = "pages" | "objects" | "assets";
type Target = "project" | "page" | "object" | "asset";

export type DesignChange =
  | {
    kind: "set";
    target: Target;
    id?: string;
    property: string;
    beforePresent: boolean;
    before: unknown;
    afterPresent: boolean;
    after: unknown;
  }
  | {
    kind: "insert";
    collection: Collection;
    parentId?: string;
    index: number;
    value: DesignPage | DesignObject | DesignAsset;
  }
  | {
    kind: "delete";
    collection: Collection;
    parentId?: string;
    index: number;
    value: DesignPage | DesignObject | DesignAsset;
  }
  | {
    kind: "move";
    collection: "pages" | "objects";
    parentId?: string;
    beforeOrder: string[];
    afterOrder: string[];
  };

export type DesignTransaction = {
  protocol: typeof DESIGN_SYNC_PROTOCOL;
  transactionId: string;
  clientId: string;
  designId: string;
  brokerEpoch: string;
  baseRevision: number;
  updatedAt: string;
  changes: DesignChange[];
};

export type DesignMergeConflict = {
  change: DesignChange;
  reason: "property" | "delete" | "order" | "invalid";
  current: unknown;
  currentPresent?: boolean;
};

export type DesignMergeResult = {
  snapshot: DesignProject;
  conflicts: DesignMergeConflict[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function copy<T>(value: T): T {
  return cloneDesign(value);
}

function changeSet(target: Target, id: string | undefined, property: string, beforeSource: Record<string, unknown>, afterSource: Record<string, unknown>): DesignChange | null {
  const beforePresent = Object.prototype.hasOwnProperty.call(beforeSource, property);
  const afterPresent = Object.prototype.hasOwnProperty.call(afterSource, property);
  const before = beforePresent ? beforeSource[property] : null;
  const after = afterPresent ? afterSource[property] : null;
  if (beforePresent === afterPresent && equal(before, after)) return null;
  return { kind: "set", target, id, property, beforePresent, before: copy(before), afterPresent, after: copy(after) };
}

function diffProperties(target: Target, id: string | undefined, beforeSource: Record<string, unknown>, afterSource: Record<string, unknown>, excluded: Set<string>) {
  const properties = new Set([...Object.keys(beforeSource), ...Object.keys(afterSource)]);
  return [...properties].filter((property) => !excluded.has(property)).map((property) => changeSet(target, id, property, beforeSource, afterSource)).filter((change): change is DesignChange => Boolean(change));
}

function objectChanges(before: DesignObject, after: DesignObject): DesignChange[] {
  const excluded = new Set(["id", "type", "x", "y", "width", "height", "rotation"]);
  const changes = diffProperties("object", after.id, before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, excluded);
  const beforeTransform = { x: before.x, y: before.y, width: before.width, height: before.height, rotation: before.rotation };
  const afterTransform = { x: after.x, y: after.y, width: after.width, height: after.height, rotation: after.rotation };
  if (!equal(beforeTransform, afterTransform)) changes.push({ kind: "set", target: "object", id: after.id, property: "transform", beforePresent: true, before: beforeTransform, afterPresent: true, after: afterTransform });
  return changes;
}

function collectionChanges(collection: Collection, before: DesignProject, after: DesignProject, parentId?: string): DesignChange[] {
  const beforeItems = collection === "pages" ? before.pages : collection === "assets" ? before.assets : before.pages.find((page) => page.id === parentId)?.objects ?? [];
  const afterItems = collection === "pages" ? after.pages : collection === "assets" ? after.assets : after.pages.find((page) => page.id === parentId)?.objects ?? [];
  const beforeMap = new Map(beforeItems.map((item) => [item.id, item] as const));
  const afterMap = new Map(afterItems.map((item) => [item.id, item] as const));
  const changes: DesignChange[] = [];
  beforeItems.forEach((item, index) => {
    if (!afterMap.has(item.id)) changes.push({ kind: "delete", collection, parentId, index, value: copy(item) as DesignPage | DesignObject | DesignAsset });
  });
  afterItems.forEach((item, index) => {
    if (!beforeMap.has(item.id)) changes.push({ kind: "insert", collection, parentId, index, value: copy(item) as DesignPage | DesignObject | DesignAsset });
  });
  const beforeOrder = beforeItems.map((item) => item.id);
  const afterOrder = afterItems.map((item) => item.id);
  if (!equal(beforeOrder, afterOrder) && collection !== "assets") changes.push({ kind: "move", collection, parentId, beforeOrder, afterOrder });
  if (collection === "pages") {
    for (const item of afterItems) {
      const previous = beforeMap.get(item.id);
      if (!previous) continue;
      changes.push(...diffProperties("page", item.id, previous as unknown as Record<string, unknown>, item as unknown as Record<string, unknown>, new Set(["id", "objects"])));
    }
  } else if (collection === "assets") {
    for (const item of afterItems) {
      const previous = beforeMap.get(item.id);
      if (!previous) continue;
      changes.push(...diffProperties("asset", item.id, previous as unknown as Record<string, unknown>, item as unknown as Record<string, unknown>, new Set(["id"])));
    }
  } else {
    for (const item of afterItems) {
      const previous = beforeMap.get(item.id);
      if (!previous) continue;
      changes.push(...objectChanges(previous as DesignObject, item as DesignObject));
    }
  }
  return changes;
}

export function createDesignTransaction(before: DesignProject, after: DesignProject, details: Pick<DesignTransaction, "transactionId" | "clientId" | "brokerEpoch" | "baseRevision">): DesignTransaction {
  const changes: DesignChange[] = [];
  changes.push(...diffProperties("project", undefined, before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, new Set(["format", "version", "id", "createdAt", "updatedAt", "activePageId", "pages", "assets"])));
  changes.push(...collectionChanges("pages", before, after));
  changes.push(...collectionChanges("assets", before, after));
  const pageIds = new Set([...before.pages.map((page) => page.id), ...after.pages.map((page) => page.id)]);
  pageIds.forEach((pageId) => changes.push(...collectionChanges("objects", before, after, pageId)));
  return {
    protocol: DESIGN_SYNC_PROTOCOL,
    ...details,
    designId: after.id,
    updatedAt: after.updatedAt,
    changes,
  };
}

export function validateDesignTransaction(value: unknown, expectedDesignId?: string): DesignTransaction {
  if (!isRecord(value) || value.protocol !== DESIGN_SYNC_PROTOCOL || typeof value.transactionId !== "string" || !value.transactionId || typeof value.clientId !== "string" || !value.clientId || typeof value.designId !== "string" || (expectedDesignId && value.designId !== expectedDesignId) || typeof value.brokerEpoch !== "string" || !value.brokerEpoch || typeof value.baseRevision !== "number" || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0 || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)) || !Array.isArray(value.changes) || value.changes.length > 5000) throw new Error("The design transaction is invalid.");
  for (const change of value.changes) {
    if (!isRecord(change) || typeof change.kind !== "string") throw new Error("The design transaction contains an invalid change.");
    if (change.kind === "set") {
      if (!["project", "page", "object", "asset"].includes(change.target as string) || typeof change.property !== "string" || typeof change.beforePresent !== "boolean" || typeof change.afterPresent !== "boolean") throw new Error("The design transaction contains an invalid property change.");
    } else if (change.kind === "insert" || change.kind === "delete") {
      if (!["pages", "objects", "assets"].includes(change.collection as string) || typeof change.index !== "number" || !Number.isSafeInteger(change.index) || change.index < 0 || !isRecord(change.value) || typeof change.value.id !== "string" || !change.value.id) throw new Error("The design transaction contains an invalid collection change.");
    } else if (change.kind === "move") {
      if (!["pages", "objects"].includes(change.collection as string) || !Array.isArray(change.beforeOrder) || !Array.isArray(change.afterOrder) || change.beforeOrder.some((id) => typeof id !== "string") || change.afterOrder.some((id) => typeof id !== "string")) throw new Error("The design transaction contains an invalid ordering change.");
    } else throw new Error("The design transaction contains an unknown change.");
  }
  return value as DesignTransaction;
}

function collectionItems(snapshot: DesignProject, collection: Collection, parentId?: string): Array<DesignPage | DesignObject | DesignAsset> {
  if (collection === "pages") return snapshot.pages;
  if (collection === "assets") return snapshot.assets;
  return snapshot.pages.find((page) => page.id === parentId)?.objects ?? [];
}

function replaceCollection(snapshot: DesignProject, collection: Collection, items: Array<DesignPage | DesignObject | DesignAsset>, parentId?: string) {
  if (collection === "pages") snapshot.pages = items as DesignPage[];
  else if (collection === "assets") snapshot.assets = items as DesignAsset[];
  else snapshot.pages = snapshot.pages.map((page) => page.id === parentId ? { ...page, objects: items as DesignObject[] } : page);
}

function findTarget(snapshot: DesignProject, target: Target, id?: string): Record<string, unknown> | null {
  if (target === "project") return snapshot as unknown as Record<string, unknown>;
  if (!id) return null;
  if (target === "page") return (snapshot.pages.find((page) => page.id === id) ?? null) as Record<string, unknown> | null;
  if (target === "asset") return (snapshot.assets.find((asset) => asset.id === id) ?? null) as Record<string, unknown> | null;
  for (const page of snapshot.pages) {
    const object = page.objects.find((item) => item.id === id);
    if (object) return object as Record<string, unknown>;
  }
  return null;
}

function reorderKnown(current: string[], before: string[], after: string[]) {
  const known = new Set(before);
  const currentKnown = current.filter((id) => known.has(id));
  if (!equal(currentKnown, before)) return null;
  let index = 0;
  return current.map((id) => known.has(id) ? after[index++] : id);
}

function applySet(snapshot: DesignProject, change: Extract<DesignChange, { kind: "set" }>, conflicts: DesignMergeConflict[]) {
  const target = findTarget(snapshot, change.target, change.id);
  if (!target) {
    conflicts.push({ change, reason: "invalid", current: null });
    return;
  }
  const currentPresent = Object.prototype.hasOwnProperty.call(target, change.property);
  const current = currentPresent ? target[change.property] : null;
  if (change.property === "transform") {
    const currentTransform = { x: target.x, y: target.y, width: target.width, height: target.height, rotation: target.rotation };
    if (!equal(currentTransform, change.before) && !equal(currentTransform, change.after)) {
      conflicts.push({ change, reason: "property", current: currentTransform });
      return;
    }
    if (equal(currentTransform, change.after)) return;
    Object.assign(target, change.after);
    return;
  }
  if (!((currentPresent === change.beforePresent && equal(current, change.before)) || (currentPresent === change.afterPresent && equal(current, change.after)))) {
    conflicts.push({ change, reason: "property", current, currentPresent });
    return;
  }
  if (currentPresent === change.afterPresent && equal(current, change.after)) return;
  if (change.afterPresent) target[change.property] = copy(change.after);
  else delete target[change.property];
}

function applyCollectionChange(snapshot: DesignProject, change: Extract<DesignChange, { kind: "insert" | "delete" }>, conflicts: DesignMergeConflict[]) {
  const items = collectionItems(snapshot, change.collection, change.parentId);
  const id = change.value.id;
  const currentIndex = items.findIndex((item) => item.id === id);
  if (change.kind === "insert") {
    if (currentIndex >= 0) {
      if (!equal(items[currentIndex], change.value)) conflicts.push({ change, reason: "property", current: items[currentIndex] });
      return;
    }
    const next = [...items];
    next.splice(Math.max(0, Math.min(change.index, next.length)), 0, copy(change.value));
    replaceCollection(snapshot, change.collection, next, change.parentId);
    return;
  }
  if (currentIndex < 0) return;
  if (!equal(items[currentIndex], change.value)) {
    conflicts.push({ change, reason: "delete", current: items[currentIndex] });
    return;
  }
  replaceCollection(snapshot, change.collection, items.filter((item) => item.id !== id), change.parentId);
}

function applyMove(snapshot: DesignProject, change: Extract<DesignChange, { kind: "move" }>, conflicts: DesignMergeConflict[]) {
  const collection = change.collection === "pages" ? "pages" : "objects";
  const items = collectionItems(snapshot, collection, change.parentId);
  const currentOrder = items.map((item) => item.id);
  if (equal(currentOrder, change.afterOrder)) return;
  const nextOrder = reorderKnown(currentOrder, change.beforeOrder, change.afterOrder);
  if (!nextOrder) {
    conflicts.push({ change, reason: "order", current: currentOrder });
    return;
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  replaceCollection(snapshot, collection, nextOrder.map((id) => byId.get(id)!).filter(Boolean), change.parentId);
}

export function applyDesignTransaction(current: DesignProject, transaction: DesignTransaction): DesignMergeResult {
  const snapshot = copy(current);
  const conflicts: DesignMergeConflict[] = [];
  for (const change of transaction.changes) {
    if (change.kind === "set") applySet(snapshot, change, conflicts);
    else if (change.kind === "move") {
      const deleteConflict = conflicts.some((conflict) => conflict.reason === "delete" && conflict.change.kind === "delete" && conflict.change.collection === change.collection && conflict.change.parentId === change.parentId);
      if (!deleteConflict) applyMove(snapshot, change, conflicts);
    }
    else applyCollectionChange(snapshot, change, conflicts);
  }
  if (!conflicts.length) {
    snapshot.updatedAt = transaction.updatedAt;
    try { validateDesignProject(snapshot); } catch (error) { conflicts.push({ change: transaction.changes[0] ?? { kind: "set", target: "project", property: "", beforePresent: true, before: null, afterPresent: true, after: null }, reason: "invalid", current: error instanceof Error ? error.message : "The merged design is invalid." }); }
  }
  return { snapshot, conflicts };
}

export function resolveDesignConflicts(current: DesignProject, transaction: DesignTransaction, result: DesignMergeResult, choice: "mine" | "theirs") {
  const snapshot = copy(result.snapshot);
  if (choice === "theirs") return snapshot;
  for (const conflict of result.conflicts) {
    const change = conflict.change;
    if (change.kind === "set") applySet(snapshot, { ...change, before: conflict.current, beforePresent: conflict.currentPresent ?? true, after: change.after, afterPresent: change.afterPresent }, []);
    else if (change.kind === "insert") {
      const items = collectionItems(snapshot, change.collection, change.parentId);
      const existingIndex = items.findIndex((item) => item.id === change.value.id);
      const next = [...items];
      if (existingIndex >= 0) next.splice(existingIndex, 1, copy(change.value));
      else next.splice(Math.max(0, Math.min(change.index, next.length)), 0, copy(change.value));
      replaceCollection(snapshot, change.collection, next, change.parentId);
    }
    else if (change.kind === "delete") {
      const items = collectionItems(snapshot, change.collection, change.parentId);
      replaceCollection(snapshot, change.collection, items.filter((item) => item.id !== change.value.id), change.parentId);
    } else if (change.kind === "move") {
      const items = collectionItems(snapshot, change.collection, change.parentId);
      const byId = new Map(items.map((item) => [item.id, item]));
      replaceCollection(snapshot, change.collection, change.afterOrder.map((id) => byId.get(id)).filter(Boolean) as Array<DesignPage | DesignObject | DesignAsset>, change.parentId);
    }
  }
  snapshot.updatedAt = transaction.updatedAt;
  validateDesignProject(snapshot);
  return snapshot;
}
