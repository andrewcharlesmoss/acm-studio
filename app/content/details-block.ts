/** Details presentation is an authored Group semantic and must never be silently
 * discarded by an older envelope reader. */
export function containsDetailsPresentation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsDetailsPresentation);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type === "group" && (record.tagName === "details" || record.detailsSummary !== undefined || record.openByDefault !== undefined)) return true;
  return Object.values(record).some(containsDetailsPresentation);
}

export function validDetailsPresentation(value: Record<string, unknown>): boolean {
  const hasDetailsField = value.detailsSummary !== undefined || value.openByDefault !== undefined;
  return value.tagName === "details"
    ? (value.detailsSummary === undefined || typeof value.detailsSummary === "string" && value.detailsSummary.length <= 2000)
      && (value.openByDefault === undefined || typeof value.openByDefault === "boolean")
    : !hasDetailsField;
}
