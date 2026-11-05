type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Inert recovery data, never an active media revision or rendition instruction. */
export type MediaBackupRecovery = {
  version: 1;
  sourceRevision?: JsonValue;
  previousValue?: JsonValue;
};

function captureJson(value: unknown): JsonValue {
  let nodes = 0;
  const ancestors = new Set<object>();
  function capture(item: unknown, depth: number): JsonValue {
    if (++nodes > 10000 || depth > 32) throw new Error("Media recovery metadata exceeds the supported limits. Retain the original backup.");
    if (item === null || typeof item === "boolean" || typeof item === "string") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || ancestors.has(item)) throw new Error("Media recovery metadata must contain JSON values. Retain the original backup.");
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error("Media recovery metadata must contain JSON values. Retain the original backup.");
    ancestors.add(item);
    try {
      return Array.isArray(item) ? Array.from(item, entry => capture(entry, depth + 1)) : Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, capture(entry, depth + 1)]));
    } finally { ancestors.delete(item); }
  }
  return capture(value, 0);
}

export function captureMediaBackupRecovery(value: unknown): MediaBackupRecovery {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid media backup recovery metadata.");
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some(key => !["version", "sourceRevision", "previousValue"].includes(key))
    || !Object.hasOwn(record, "sourceRevision") && !Object.hasOwn(record, "previousValue")) throw new Error("Invalid media backup recovery metadata.");
  return { version: 1,
    ...(Object.hasOwn(record, "sourceRevision") ? { sourceRevision: captureJson(record.sourceRevision) } : {}),
    ...(Object.hasOwn(record, "previousValue") ? { previousValue: captureJson(record.previousValue) } : {}),
  };
}

export function isMediaSourceRevision(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 180;
}

/** Old formats did not own this field; preserve collisions rather than interpreting them. */
export function captureLegacyMediaRecovery(asset: { sourceRevision?: unknown; backupRecovery?: unknown }, version: number): MediaBackupRecovery | undefined {
  if (version >= 38) return asset.backupRecovery === undefined ? undefined : captureMediaBackupRecovery(asset.backupRecovery);
  const foreignRevision = version < 7 && asset.sourceRevision !== undefined && !isMediaSourceRevision(asset.sourceRevision);
  if (!foreignRevision && asset.backupRecovery === undefined) return undefined;
  return { version: 1,
    ...(foreignRevision ? { sourceRevision: captureJson(asset.sourceRevision) } : {}),
    ...(asset.backupRecovery !== undefined ? { previousValue: captureJson(asset.backupRecovery) } : {}),
  };
}

/** Existing browser records may predate ownership of the recovery field. */
export function captureStoredMediaRecovery(value: unknown): MediaBackupRecovery | undefined {
  if (value === undefined) return undefined;
  try { return captureMediaBackupRecovery(value); }
  catch { return { version: 1, previousValue: captureJson(value) }; }
}
