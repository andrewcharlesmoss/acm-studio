import { historicalLanguageCode } from "./language-runs.ts";
/** Detect inline run metadata before accepting an older storage envelope. */
export function containsRichTextInlineObjects(value: unknown, kind?: "footnote" | "math" | "image"): boolean {
  const visited = new WeakSet<object>();
  function visit(candidate: unknown): boolean {
    if (!candidate || typeof candidate !== "object" || visited.has(candidate)) return false;
    visited.add(candidate);
    if (!Array.isArray(candidate)) {
      const record = candidate as Record<string, unknown>;
      if (typeof record.text === "string" && record.inline !== undefined && (!kind || (record.inline as Record<string, unknown> | null)?.type === kind)) return true;
    }
    return Object.values(candidate).some(visit);
  }
  return visit(value);
}

/** Extended Language values must not be accepted inside older envelopes. */
export function containsExtendedLanguage(value: unknown): boolean {
  const visited = new WeakSet<object>();
  function visit(candidate: unknown): boolean {
    if (!candidate || typeof candidate !== "object" || visited.has(candidate)) return false;
    visited.add(candidate);
    const record = candidate as Record<string, unknown>;
    if (record.type === "language" && typeof record.language === "string" && !historicalLanguageCode(record.language)) return true;
    return Object.values(candidate).some(visit);
  }
  return visit(value);
}
